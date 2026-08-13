-- hospitality/01_rls.sql
--
-- Allow + deny for every RLS policy in 0030_hospitality.sql.
begin;
select plan(27);

-- Fixtures: Alice (hospitality_manager); Bob has a reservation; Carol
-- has none and no staff permission.
insert into auth.users (id, email) values
  ('d4000000-0000-0000-0000-000000000001', 'alice-hm@example.test'),
  ('d4000000-0000-0000-0000-000000000002', 'bob-diner@example.test'),
  ('d4000000-0000-0000-0000-000000000003', 'carol-bystander@example.test');

insert into authz.user_roles (person_id, role_key)
select id, 'hospitality_manager' from identity.people
where auth_user_id = 'd4000000-0000-0000-0000-000000000001';

insert into hospitality.menus (slug, name, status) values ('test-published-menu', 'Published Menu', 'published');
insert into hospitality.menus (slug, name, status) values ('test-draft-menu', 'Draft Menu', 'draft');

insert into hospitality.menu_sections (menu_id, name, position)
select id, 'Published Section', 1 from hospitality.menus where slug = 'test-published-menu';
insert into hospitality.menu_sections (menu_id, name, position)
select id, 'Draft Section', 1 from hospitality.menus where slug = 'test-draft-menu';

insert into hospitality.menu_items (section_id, name, available, position)
select id, 'Available Item', true, 1 from hospitality.menu_sections where name = 'Published Section';
insert into hospitality.menu_items (section_id, name, available, position)
select id, 'Unavailable Item', false, 2 from hospitality.menu_sections where name = 'Published Section';
insert into hospitality.menu_items (section_id, name, available, position)
select id, 'Draft Item', true, 1 from hospitality.menu_sections where name = 'Draft Section';

insert into hospitality.service_periods (weekday, opens, closes) values (5, '17:00', '22:00');

insert into hospitality.tables (name, seats) values ('Test Table', 4);

insert into hospitality.reservations (code, person_id, guest_name, party_size, starts_at)
select 'PZ-TEST', id, 'Bob Diner', 2, now() + interval '1 day'
from identity.people where auth_user_id = 'd4000000-0000-0000-0000-000000000002';

-- ---------------------------------------------------------------------
-- menus_select_published / menus_select_staff / menus_manage_staff
-- ---------------------------------------------------------------------
set local role anon;
select is(
  (select count(*)::int from hospitality.menus where slug = 'test-published-menu'),
  1,
  'menus_select_published (allow): anon sees a published menu'
);
select is(
  (select count(*)::int from hospitality.menus where slug = 'test-draft-menu'),
  0,
  'menus_select_published / menus_select_staff (deny): anon does not see a draft menu'
);
reset role;

set local role authenticated;
set local request.jwt.claims = '{"sub": "d4000000-0000-0000-0000-000000000001", "role": "authenticated", "aal": "aal2"}';
select is(
  (select count(*)::int from hospitality.menus where slug = 'test-draft-menu'),
  1,
  'menus_select_staff (allow): hospitality_manager sees a draft menu'
);
update hospitality.menus set name = 'Renamed by test' where slug = 'test-draft-menu';
select is(
  (select name from hospitality.menus where slug = 'test-draft-menu'),
  'Renamed by test',
  'menus_manage_staff (allow): hospitality_manager with aal2 can edit a menu'
);
reset role;

set local role authenticated;
set local request.jwt.claims = '{"sub": "d4000000-0000-0000-0000-000000000003", "role": "authenticated"}';
update hospitality.menus set name = 'Hacked' where slug = 'test-published-menu';
reset role;
select isnt(
  (select name from hospitality.menus where slug = 'test-published-menu'),
  'Hacked',
  'menus_manage_staff (deny): an ordinary person cannot edit a menu'
);

-- ---------------------------------------------------------------------
-- menu_sections_select_published / menu_sections_select_staff /
-- menu_sections_manage_staff
-- ---------------------------------------------------------------------
set local role anon;
select is(
  (select count(*)::int from hospitality.menu_sections where name = 'Published Section'),
  1,
  'menu_sections_select_published (allow): anon sees a section of a published menu'
);
select is(
  (select count(*)::int from hospitality.menu_sections where name = 'Draft Section'),
  0,
  'menu_sections_select_published / menu_sections_select_staff (deny): anon does not see a section of a draft menu'
);
reset role;

set local role authenticated;
set local request.jwt.claims = '{"sub": "d4000000-0000-0000-0000-000000000001", "role": "authenticated", "aal": "aal2"}';
select is(
  (select count(*)::int from hospitality.menu_sections where name = 'Draft Section'),
  1,
  'menu_sections_select_staff (allow): hospitality_manager sees a section of a draft menu'
);
update hospitality.menu_sections set name = 'Renamed Section' where name = 'Draft Section';
select is(
  (select count(*)::int from hospitality.menu_sections where name = 'Renamed Section'),
  1,
  'menu_sections_manage_staff (allow): hospitality_manager with aal2 can edit a section'
);
reset role;

set local role authenticated;
set local request.jwt.claims = '{"sub": "d4000000-0000-0000-0000-000000000003", "role": "authenticated"}';
update hospitality.menu_sections set name = 'Hacked' where name = 'Published Section';
reset role;
select isnt(
  (select name from hospitality.menu_sections where position = 1 and menu_id = (
    select id from hospitality.menus where slug = 'test-published-menu'
  )),
  'Hacked',
  'menu_sections_manage_staff (deny): an ordinary person cannot edit a section'
);

-- ---------------------------------------------------------------------
-- menu_items_select_published / menu_items_select_staff /
-- menu_items_manage_staff
-- ---------------------------------------------------------------------
set local role anon;
select is(
  (select count(*)::int from hospitality.menu_items where name = 'Available Item'),
  1,
  'menu_items_select_published (allow): anon sees an available item in a published menu'
);
select is(
  (select count(*)::int from hospitality.menu_items where name = 'Unavailable Item'),
  0,
  'menu_items_select_published (deny): anon does not see an unavailable item, even in a published menu'
);
select is(
  (select count(*)::int from hospitality.menu_items where name = 'Draft Item'),
  0,
  'menu_items_select_published / menu_items_select_staff (deny): anon does not see an item in a draft menu'
);
reset role;

set local role authenticated;
set local request.jwt.claims = '{"sub": "d4000000-0000-0000-0000-000000000001", "role": "authenticated", "aal": "aal2"}';
select is(
  (select count(*)::int from hospitality.menu_items where name = 'Draft Item'),
  1,
  'menu_items_select_staff (allow): hospitality_manager sees an item in a draft menu'
);
update hospitality.menu_items set available = false where name = 'Draft Item';
select is(
  (select available from hospitality.menu_items where name = 'Draft Item'),
  false,
  'menu_items_manage_staff (allow): hospitality_manager with aal2 can edit an item'
);
reset role;

set local role authenticated;
set local request.jwt.claims = '{"sub": "d4000000-0000-0000-0000-000000000003", "role": "authenticated"}';
update hospitality.menu_items set name = 'Hacked' where name = 'Available Item';
reset role;
select isnt(
  (select name from hospitality.menu_items where name = 'Available Item' or name = 'Hacked' limit 1),
  'Hacked',
  'menu_items_manage_staff (deny): an ordinary person cannot edit an item'
);

-- ---------------------------------------------------------------------
-- service_periods_select_all / service_periods_manage_staff
-- ---------------------------------------------------------------------
set local role anon;
select is(
  (select count(*)::int from hospitality.service_periods),
  1,
  'service_periods_select_all (allow): anon can read service periods'
);
reset role;

set local role authenticated;
set local request.jwt.claims = '{"sub": "d4000000-0000-0000-0000-000000000001", "role": "authenticated", "aal": "aal2"}';
update hospitality.service_periods set closes = '23:00';
select is(
  (select closes::text from hospitality.service_periods limit 1),
  '23:00:00',
  'service_periods_manage_staff (allow): hospitality_manager with aal2 can edit service periods'
);
reset role;

set local role authenticated;
set local request.jwt.claims = '{"sub": "d4000000-0000-0000-0000-000000000003", "role": "authenticated"}';
update hospitality.service_periods set closes = '10:00';
reset role;
select isnt(
  (select closes::text from hospitality.service_periods limit 1),
  '10:00:00',
  'service_periods_manage_staff (deny): an ordinary person cannot edit service periods'
);

-- ---------------------------------------------------------------------
-- tables_select_staff / tables_manage_staff
-- ---------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims = '{"sub": "d4000000-0000-0000-0000-000000000001", "role": "authenticated", "aal": "aal2"}';
select is(
  (select count(*)::int from hospitality.tables where name = 'Test Table'),
  1,
  'tables_select_staff (allow): hospitality_manager can read tables'
);
update hospitality.tables set seats = 8 where name = 'Test Table';
select is(
  (select seats from hospitality.tables where name = 'Test Table'),
  8,
  'tables_manage_staff (allow): hospitality_manager with aal2 can edit a table'
);
reset role;

set local role authenticated;
set local request.jwt.claims = '{"sub": "d4000000-0000-0000-0000-000000000003", "role": "authenticated"}';
select is(
  (select count(*)::int from hospitality.tables),
  0,
  'tables_select_staff (deny): an ordinary person cannot read tables'
);
update hospitality.tables set seats = 1 where name = 'Test Table';
reset role;
select isnt(
  (select seats from hospitality.tables where name = 'Test Table'),
  1,
  'tables_manage_staff (deny): an ordinary person cannot edit a table'
);

-- ---------------------------------------------------------------------
-- reservations_select_self / reservations_select_staff
-- ---------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims = '{"sub": "d4000000-0000-0000-0000-000000000002", "role": "authenticated"}';
select is(
  (select count(*)::int from hospitality.reservations where code = 'PZ-TEST'),
  1,
  'reservations_select_self (allow): Bob can read his own reservation'
);
reset role;

set local role authenticated;
set local request.jwt.claims = '{"sub": "d4000000-0000-0000-0000-000000000003", "role": "authenticated"}';
select is(
  (select count(*)::int from hospitality.reservations),
  0,
  'reservations_select_self / reservations_select_staff (deny): Carol (no reservation, no staff permission) sees none'
);
reset role;

set local role authenticated;
set local request.jwt.claims = '{"sub": "d4000000-0000-0000-0000-000000000001", "role": "authenticated", "aal": "aal2"}';
select is(
  (select count(*)::int from hospitality.reservations where code = 'PZ-TEST'),
  1,
  'reservations_select_staff (allow): hospitality_manager can read every reservation'
);
reset role;

-- ---------------------------------------------------------------------
-- Table-level grant sanity: reservations have no direct write path.
-- ---------------------------------------------------------------------
select ok(
  not has_table_privilege('authenticated', 'hospitality.reservations', 'INSERT'),
  'authenticated has no direct INSERT privilege on hospitality.reservations (must go through request_reservation())'
);

select * from finish();
rollback;
