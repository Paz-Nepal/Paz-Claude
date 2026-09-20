-- wall/01_wall_sattal_rules.sql
--
-- The rules the Build Specification puts in the database rather than only
-- in a form: the Sattal conflict rule (7.2), the hallmark rule (6.7),
-- attributed text (6.8), the append-only life of a work (6.4), append-only
-- redirects (4.10), canonical deposit addresses, and what anon can and
-- cannot see or do.
begin;
select plan(16);

insert into auth.users (id, email) values
  ('c1000000-0000-0000-0000-000000000001', 'wall-editor@example.test'),
  ('c1000000-0000-0000-0000-000000000002', 'wall-nobody@example.test');
insert into authz.user_roles (person_id, role_key)
select id, 'editor' from identity.people where auth_user_id = 'c1000000-0000-0000-0000-000000000001';

-- Fixtures written directly (as the table owner) so the rules under test
-- are the only thing in play.
insert into wall.people (id, slug, name, roles, represented, published) values
  ('c2000000-0000-0000-0000-000000000001', 't-author', 'T Author', '{author}', false, true),
  ('c2000000-0000-0000-0000-000000000002', 't-artist', 'T Artist', '{artist}', true, true),
  ('c2000000-0000-0000-0000-000000000003', 't-unformed', 'T Unformed', '{artist}', false, true);
insert into wall.person_terms (person_id, house_split_note)
values ('c2000000-0000-0000-0000-000000000002', 'secret split');
insert into wall.works (id, slug, person_id, title, price_minor, published) values
  ('c3000000-0000-0000-0000-000000000001', 't-work', 'c2000000-0000-0000-0000-000000000002', 'T Work', 700000, true);
insert into sattal.outside_readers (id, name) values ('c4000000-0000-0000-0000-000000000001', 'R Reader');
insert into sattal.pieces (id, slug, form, person_id, title, original_language, relation_declaration,
  subject_person_id, author_connected)
values ('c5000000-0000-0000-0000-000000000001', 't-piece', 'review',
  'c2000000-0000-0000-0000-000000000001', 'T', 'en', 'No relation.',
  'c2000000-0000-0000-0000-000000000002', false);

-- Hallmark: only a maker the Guild has formed.
select throws_ok(
  $$insert into wall.works (slug, person_id, title, hallmarked)
    values ('t-hm', 'c2000000-0000-0000-0000-000000000003', 'H', true)$$,
  '23514', null, 'hallmark refused for a maker the Guild has not formed'
);

-- Relation declaration is required at the database level.
select throws_ok(
  $$insert into sattal.pieces (slug, form, person_id, title, original_language, relation_declaration)
    values ('t-empty', 'account', 'c2000000-0000-0000-0000-000000000001', 'E', 'en', '  ')$$,
  '23514', null, 'an empty relation declaration is refused'
);

-- Conflict rule: about something the house sells, no reader -> refused.
select throws_ok(
  $$update sattal.pieces set status = 'published' where id = 'c5000000-0000-0000-0000-000000000001'$$,
  '23514', null, 'conflict rule: refused without an outside reader'
);
update sattal.pieces set outside_reader_id = 'c4000000-0000-0000-0000-000000000001'
where id = 'c5000000-0000-0000-0000-000000000001';
select throws_ok(
  $$update sattal.pieces set status = 'published' where id = 'c5000000-0000-0000-0000-000000000001'$$,
  '23514', null, 'conflict rule: refused without the reader''s recorded acceptance'
);
update sattal.pieces set reader_accepted_on = current_date, author_connected = true
where id = 'c5000000-0000-0000-0000-000000000001';
select throws_ok(
  $$update sattal.pieces set status = 'published' where id = 'c5000000-0000-0000-0000-000000000001'$$,
  '23514', null, 'conflict rule: refused when the author is connected'
);
update sattal.pieces set author_connected = false where id = 'c5000000-0000-0000-0000-000000000001';

-- Publish through the staff function: canonical address, redirect, record entry.
set local role authenticated;
set local request.jwt.claims = '{"sub": "c1000000-0000-0000-0000-000000000001", "role": "authenticated", "aal": "aal2"}';
select lives_ok(
  $$select api.publish_sattal_piece('c5000000-0000-0000-0000-000000000001')$$,
  'publish succeeds once the rule is met'
);
reset role;
select is(
  (select link from publishing.record_entries where sattal_piece_id = 'c5000000-0000-0000-0000-000000000001'),
  '/record/' || (select deposit_ref from sattal.pieces where id = 'c5000000-0000-0000-0000-000000000001'),
  'the deposit number is the canonical address'
);
select is(
  (select new_path from publishing.redirects where old_path = '/sattal/t-piece'),
  '/record/' || (select deposit_ref from sattal.pieces where id = 'c5000000-0000-0000-0000-000000000001'),
  'the readable path redirects to the deposit number, never the reverse'
);
select throws_ok(
  $$update sattal.pieces set title = 'changed' where id = 'c5000000-0000-0000-0000-000000000001'$$,
  '42501', null, 'a published piece is never rewritten'
);

-- Append-only: redirects, the life of a work.
select throws_ok(
  $$update publishing.redirects set new_path = '/elsewhere' where old_path = '/sattal/t-piece'$$,
  '42501', null, 'redirects are never rewritten'
);
select throws_ok(
  $$delete from publishing.redirects where old_path = '/sattal/t-piece'$$,
  '42501', null, 'redirects are never deleted'
);
insert into wall.work_events (work_id, occurred_on, kind)
values ('c3000000-0000-0000-0000-000000000001', current_date, 'made');
select throws_ok(
  $$delete from wall.work_events where work_id = 'c3000000-0000-0000-0000-000000000001'$$,
  '42501', null, 'the life of a work is append-only'
);

-- Attributed text: only the maker's words or the house speaking.
set local role authenticated;
set local request.jwt.claims = '{"sub": "c1000000-0000-0000-0000-000000000001", "role": "authenticated", "aal": "aal2"}';
select throws_ok(
  $$select api.add_work_text('c3000000-0000-0000-0000-000000000001', 'critic', 'Wonderful.', null)$$,
  '23514', null, 'text about a work must be attributed to the maker or the house'
);
select is(
  (select count(*)::int from api.admin_wall_people where house_split_note = 'secret split'),
  1, 'staff can read the private split note'
);
reset role;

-- Anon: never sees the split note, cannot write, cannot read the voice intake.
set local role anon;
set local request.jwt.claims = '{"role": "anon"}';
select throws_ok(
  $$select api.save_person('{"slug": "x", "name": "x"}'::jsonb)$$,
  '42501', null, 'anon cannot write to the Wall'
);
select throws_ok(
  $$select count(*) from crm.voice_intake$$,
  '42501', null, 'anon cannot read the private voice intake'
);
reset role;

select finish();
rollback;
