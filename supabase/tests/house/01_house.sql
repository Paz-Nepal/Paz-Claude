-- house/01_house.sql
--
-- The house as a place (0081_house.sql): only house.manage may write, the
-- public sees only what is published, a giver's name is withheld unless they
-- said yes, the house style holds, and the status line reaches site_info.
begin;
select plan(15);

insert into auth.users (id, email) values
  ('fc000000-0000-0000-0000-000000000001', 'editor-house@example.test'),
  ('fc000000-0000-0000-0000-000000000002', 'nobody-house@example.test');

insert into authz.user_roles (person_id, role_key)
select id, 'editor' from identity.people where auth_user_id = 'fc000000-0000-0000-0000-000000000001';
insert into authz.user_roles (person_id, role_key)
select id, 'administrator' from identity.people where auth_user_id = 'fc000000-0000-0000-0000-000000000001';

-- Allowed: the editor keeps rooms and things.
set local role authenticated;
set local request.jwt.claims = '{"sub": "fc000000-0000-0000-0000-000000000001", "role": "authenticated", "aal": "aal2"}';

select lives_ok(
  $$ select api.save_house_room(jsonb_build_object('id', 'fc100000-0000-0000-0000-000000000001',
       'slug', 'the-table-room', 'name', 'The Table room', 'published', true)) $$,
  'save_house_room (allow): a room can be saved'
);
select lives_ok(
  $$ select api.save_house_room(jsonb_build_object('id', 'fc100000-0000-0000-0000-000000000002',
       'slug', 'the-attic', 'name', 'The attic', 'published', false)) $$,
  'save_house_room (allow): an unpublished room can be saved'
);
select lives_ok(
  $$ select api.save_house_thing(jsonb_build_object('id', 'fc200000-0000-0000-0000-000000000001',
       'name', 'A green chair', 'came_from', 'A neighbour''s porch', 'given_by', 'Someone Kind',
       'given_by_shown', false, 'room_id', 'fc100000-0000-0000-0000-000000000001',
       'published', true)) $$,
  'save_house_thing (allow): a thing can be saved with its giver held back'
);
select lives_ok(
  $$ select api.save_house_thing(jsonb_build_object('id', 'fc200000-0000-0000-0000-000000000002',
       'name', 'A brass pot', 'given_by', 'Said Yes', 'given_by_shown', true, 'published', true)) $$,
  'save_house_thing (allow): a thing whose giver said yes'
);
select throws_ok(
  $$ select api.save_house_room(jsonb_build_object('slug', 'bad-dash', 'name', 'A room ' || chr(8212) || ' here',
       'published', true)) $$,
  '23514', null, 'a published room refuses an em dash'
);
select throws_ok(
  $$ select api.save_house_room(jsonb_build_object('slug', 'Not A Slug', 'name', 'X')) $$,
  '23514', null, 'a room slug must be lower case with dashes'
);
select throws_ok(
  $$ select api.save_house_thing(jsonb_build_object('name', 'A thing', 'image_path', 'x.jpg')) $$,
  '23514', null, 'a thing''s picture needs its size, description and photographer'
);
select lives_ok(
  $$ select api.set_house_status('The house is open this afternoon', null) $$,
  'set_house_status (allow): the status line can be set'
);

-- The public view.
reset role;
set local role anon;
select is(
  (select count(*)::int from api.house_rooms), 1,
  'the public sees only the published room'
);
select is(
  (select given_by from api.house_things where name = 'A green chair'), null,
  'a giver who did not say yes is not shown'
);
select is(
  (select given_by from api.house_things where name = 'A brass pot'), 'Said Yes',
  'a giver who said yes is shown'
);
select is(
  (select (api.site_info() ->> 'house.status')), 'The house is open this afternoon',
  'the status line reaches the public site info'
);
select throws_ok(
  $$ select count(*) from house.things $$,
  '42501', null, 'anon cannot read the base tables'
);

-- Denied: a person with no role.
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub": "fc000000-0000-0000-0000-000000000002", "role": "authenticated", "aal": "aal2"}';
select throws_ok(
  $$ select api.save_house_room(jsonb_build_object('slug', 'nope', 'name', 'Nope')) $$,
  '42501', null, 'save_house_room (deny): someone without house.manage is refused'
);

-- Clearing the status.
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub": "fc000000-0000-0000-0000-000000000001", "role": "authenticated", "aal": "aal2"}';
select api.set_house_status(null, null);
reset role;
select is(
  (select api.site_info() ? 'house.status'), false,
  'clearing the status removes it from the public site info'
);

select finish();
rollback;
