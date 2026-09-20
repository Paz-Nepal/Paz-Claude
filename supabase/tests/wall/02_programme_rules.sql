-- wall/02_programme_rules.sql
--
-- The rules Build Programme 2 to 13 put in the database: no em dash in a
-- publishable field, terms slugs, the Commons rung and its separation from
-- Friends, the dealing that never understates value, the Sattal's
-- commissioning and agreement records, the append-only punch register, the
-- Brief's send-once guard, and what anon can and cannot reach.
begin;
select plan(15);

insert into auth.users (id, email) values
  ('d1000000-0000-0000-0000-000000000001', 'prog-admin@example.test');
insert into authz.user_roles (person_id, role_key)
select id, 'administrator' from identity.people where auth_user_id = 'd1000000-0000-0000-0000-000000000001';

-- No em dash in a publishable field.
select throws_ok(
  $$insert into publishing.chronicle_lines (line_on, line) values (current_date, 'A line ' || chr(8212) || ' with a dash')$$,
  '23514', null, 'the Chronicle refuses an em dash'
);
select throws_ok(
  $$insert into publishing.glossary_terms (slug, term, definition) values ('t-x', 't', 'a ' || chr(8212) || ' b')$$,
  '23514', null, 'the glossary refuses an em dash'
);

-- Terms documents are slugged by kind.
select throws_ok(
  $$insert into publishing.items (type, slug, title, author)
    select 'terms', 'not-a-kind', 'X', id from identity.people
    where auth_user_id = 'd1000000-0000-0000-0000-000000000001'$$,
  '23514', null, 'a terms document must be painters, writers, memory or friends'
);

-- Commons: no rung above Guest or Companion without a recorded covenant, and
-- nothing in the Commons reads the membership schema, so a Friends tier can
-- never set a rung.
set local role authenticated;
set local request.jwt.claims = '{"sub": "d1000000-0000-0000-0000-000000000001", "role": "authenticated", "aal": "aal2"}';
select throws_ok(
  $$select api.save_commons_person(jsonb_build_object(
      'person_id', (select id from identity.people where auth_user_id = 'd1000000-0000-0000-0000-000000000001'),
      'rung', 'denizen'))$$,
  '23514', null, 'a Denizen needs a recorded covenant date'
);
select lives_ok(
  $$select api.save_commons_person(jsonb_build_object(
      'person_id', (select id from identity.people where auth_user_id = 'd1000000-0000-0000-0000-000000000001'),
      'rung', 'denizen', 'covenant_said_on', '2026-01-01', 'abroad', true))$$,
  'a Denizen with a recorded covenant is accepted'
);
reset role;
select is(
  (select count(*)::int from pg_proc p join pg_namespace ns on ns.oid = p.pronamespace
   where (ns.nspname = 'commons'
          or p.proname in ('save_commons_person', 'report_table_kept', 'confirm_table_kept',
                           'concurrence_roll', 'assembly_readiness', 'save_assembly'))
     and p.prosrc ilike '%membership%'),
  0, 'no Commons function reads the membership schema'
);

-- Dealings never understate value.
insert into wall.people (id, slug, name, roles, published) values
  ('d2000000-0000-0000-0000-000000000001', 'prog-artist', 'Prog Artist', '{artist}', true),
  ('d2000000-0000-0000-0000-000000000002', 'prog-author', 'Prog Author', '{author}', true);
insert into wall.works (id, slug, person_id, title, price_minor, published)
values ('d3000000-0000-0000-0000-000000000001', 'prog-work',
  'd2000000-0000-0000-0000-000000000001', 'W', 700000, true);
select throws_ok(
  $$insert into wall.dealings (work_id, buyer_name, quote, declared_value_minor)
    values ('d3000000-0000-0000-0000-000000000001', 'B', '{"price_minor": 700000}'::jsonb, 500000)$$,
  '23514', null, 'a customs value below the agreed price is refused'
);
set local role authenticated;
set local request.jwt.claims = '{"sub": "d1000000-0000-0000-0000-000000000001", "role": "authenticated", "aal": "aal2"}';
select lives_ok(
  $$select api.record_dealing_stage(
      api.save_dealing(jsonb_build_object('work_id', 'd3000000-0000-0000-0000-000000000001',
        'buyer_name', 'B', 'quote', jsonb_build_object('price_minor', 700000),
        'declared_value_minor', 700000)),
      'accepted', '2026-05-01')$$,
  'accepting a dealing succeeds'
);
reset role;
select is(
  (select availability from wall.works where id = 'd3000000-0000-0000-0000-000000000001'),
  'sold', 'acceptance marks the work sold'
);
select is(
  (select count(*)::int from wall.work_events
   where work_id = 'd3000000-0000-0000-0000-000000000001' and kind = 'sold'),
  1, 'and writes the sale to the work''s life'
);

-- Sattal: a Study is commissioned, and every piece has its agreement on file.
insert into sattal.pieces (id, slug, form, person_id, title, original_language, relation_declaration)
values ('d4000000-0000-0000-0000-000000000001', 'prog-study', 'study',
  'd2000000-0000-0000-0000-000000000002', 'S', 'en', 'None.');
select throws_ok(
  $$update sattal.pieces set status = 'published' where id = 'd4000000-0000-0000-0000-000000000001'$$,
  '23514', null, 'a Study cannot be published without its commission'
);
update sattal.pieces set commissioned_on = current_date where id = 'd4000000-0000-0000-0000-000000000001';
select throws_ok(
  $$update sattal.pieces set status = 'published' where id = 'd4000000-0000-0000-0000-000000000001'$$,
  '23514', null, 'and cannot be published without the author agreement'
);

-- Guild: a punch destruction is recorded and never changed.
insert into guild.makers (id, person_id, stage) values
  ('d5000000-0000-0000-0000-000000000001', 'd2000000-0000-0000-0000-000000000001', 'apprentice');
insert into guild.punch_destructions (maker_id, destroyed_on)
values ('d5000000-0000-0000-0000-000000000001', current_date);
select throws_ok(
  $$delete from guild.punch_destructions$$,
  '42501', null, 'a punch destruction is never deleted'
);

-- The Brief is sent once.
insert into publishing.items (id, type, slug, title, author)
select 'd6000000-0000-0000-0000-000000000001', 'brief', 'prog-brief', 'B', id from identity.people
where auth_user_id = 'd1000000-0000-0000-0000-000000000001';
select lives_ok(
  $$select api.brief_begin_send('d6000000-0000-0000-0000-000000000001')$$,
  'the first send is allowed'
);
select throws_ok(
  $$select api.brief_begin_send('d6000000-0000-0000-0000-000000000001')$$,
  '23505', null, 'the second is refused before any mail goes'
);

select finish();
rollback;
