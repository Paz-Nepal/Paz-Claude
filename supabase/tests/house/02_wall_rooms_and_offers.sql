-- house/02_wall_rooms_and_offers.sql
--
-- 0082 (rooms, tiers, verify) and 0083 (offers): a work hangs in a room only
-- while the room is published, an early painter's work shows the house price,
-- a certificate check never shows a buyer, one intake for offers that only the
-- service role can write and only the right staff can read, sought words, and
-- a Table kept elsewhere.
begin;
select plan(15);

insert into auth.users (id, email) values
  ('fe000000-0000-0000-0000-000000000001', 'sa-offers@example.test'),
  ('fe000000-0000-0000-0000-000000000002', 'ed-offers@example.test');
insert into authz.user_roles (person_id, role_key)
select id, 'super_admin' from identity.people where auth_user_id = 'fe000000-0000-0000-0000-000000000001';
insert into authz.user_roles (person_id, role_key)
select id, 'editor' from identity.people where auth_user_id = 'fe000000-0000-0000-0000-000000000002';

insert into wall.people (id, slug, name, roles, published, tier, formed_by_guild)
values ('fe300000-0000-0000-0000-000000000001', 'offers-early', 'Offers Early', '{artist}', true, 'early', true);
insert into guild.makers (person_id, stage, mark_description, year_letter, registered_on, published)
values ('fe300000-0000-0000-0000-000000000001', 'apprentice', 'Offersmark', 'Q', current_date, true);
insert into wall.works (id, slug, person_id, title, published, hallmarked)
values ('fe400000-0000-0000-0000-000000000001', 'offers-work', 'fe300000-0000-0000-0000-000000000001', 'Offers Work', true, true);
insert into house.rooms (id, slug, name, published) values
  ('fe500000-0000-0000-0000-000000000001', 'offers-room', 'Offers room', true),
  ('fe500000-0000-0000-0000-000000000002', 'offers-hidden', 'Offers hidden', false);
-- Seeded empty by 0087; the house fills it in.
update admin.settings set value = '700000'::jsonb where key = 'wall.early_price_minor';
insert into wall.work_events (work_id, occurred_on, kind, note) values
  ('fe400000-0000-0000-0000-000000000001', current_date, 'sold', 'Buyer Name Here'),
  ('fe400000-0000-0000-0000-000000000001', current_date, 'shown', 'In the hall');

-- The public sees the house price for an early painter's work.
set local role anon;
select is(
  (select price_minor from api.wall_works where slug = 'offers-work'), 700000::bigint,
  'an early painter''s work shows the house price'
);
select is(
  (select count(*)::int from api.verify_work((select work_number from wall.works where slug = 'offers-work'))), 1,
  'a certificate check finds a published work'
);
select is(
  (select (events -> 0 ->> 'note') from api.verify_work((select work_number from wall.works where slug = 'offers-work'))),
  null,
  'a sale appears as a date with no note: never the buyer'
);
select is(
  (select count(*)::int from api.verify_hallmark('offersmark')), 1,
  'a hallmark check finds a published maker'
);
reset role;

-- A room is shown only while it is published.
update wall.works set room_id = 'fe500000-0000-0000-0000-000000000002' where slug = 'offers-work';
set local role anon;
select is(
  (select room_id from api.wall_works where slug = 'offers-work'), null,
  'a work hanging in an unpublished room shows no room'
);
reset role;
update wall.works set room_id = 'fe500000-0000-0000-0000-000000000001' where slug = 'offers-work';
set local role anon;
select is(
  (select room_id from api.wall_works where slug = 'offers-work'), 'fe500000-0000-0000-0000-000000000001'::uuid,
  'and shows it once the room is published'
);
reset role;

-- One intake for offers: the service role writes.
set local role service_role;
select lives_ok(
  $$ select api.submit_offer('painter', 'Some Painter', 'p@example.test', null, 'hello', '{"link":"https://x.test"}'::jsonb) $$,
  'submit_offer (allow): the service role can record an offer'
);
select throws_ok(
  $$ select api.submit_offer('sattal', 'A', 'a@example.test', null, null, '{}'::jsonb) $$,
  '22023', null, 'a Sattal proposal must name its form'
);
select throws_ok(
  $$ select api.submit_offer('table', 'A', 'a@example.test', null, null, '{"held_on":"2026-01-01"}'::jsonb) $$,
  '22023', null, 'a Table reported from elsewhere needs a place'
);
reset role;

set local role authenticated;
set local request.jwt.claims = '{"sub": "fe000000-0000-0000-0000-000000000002", "role": "authenticated", "aal": "aal2"}';
select throws_ok(
  $$ select api.submit_offer('word', 'x', 'y', null, null, '{}'::jsonb) $$,
  '42501', null, 'submit_offer (deny): a signed-in person cannot write directly'
);
select is(
  (select count(*)::int from api.offers), 1,
  'an editor sees the offers that belong to what they keep'
);

-- Sought words, and a Table kept elsewhere.
select lives_ok(
  $$ select api.save_glossary_term('{"slug":"offers-sought","kind":"sought","term":"Zkha"}'::jsonb) $$,
  'a sought word needs no definition'
);
select throws_ok(
  $$ select api.save_glossary_term('{"slug":"offers-term","kind":"term","term":"Bad"}'::jsonb) $$,
  '23514', null, 'a term still needs its definition'
);
set local request.jwt.claims = '{"sub": "fe000000-0000-0000-0000-000000000001", "role": "authenticated", "aal": "aal2"}';
select lives_ok(
  $$ select api.report_table_kept(null, current_date - 30, 'Toronto', 'Far Away') $$,
  'a Table reported from elsewhere is recorded with no keeper on the register'
);
select throws_ok(
  $$ select api.report_table_kept(null, current_date, 'x', null) $$,
  '23514', null, 'a Table needs a keeper or a reporter'
);

select finish();
rollback;
