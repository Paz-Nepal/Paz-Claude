-- programs/01_rls.sql
--
-- Allow + deny for every RLS policy in 0013_programs.sql, following the
-- identity/01_people_rls.sql template. Uses the real 'program_manager'
-- role/permission keys from supabase/seed/authz.sql.
begin;
select plan(18);

-- Fixtures: Alice is the program manager; Dave registers for a session;
-- Erin is an ordinary person with no registration of her own.
insert into auth.users (id, email) values
  ('b2000000-0000-0000-0000-000000000001', 'alice-pm@example.test'),
  ('b2000000-0000-0000-0000-000000000002', 'dave-registrant@example.test'),
  ('b2000000-0000-0000-0000-000000000003', 'erin-bystander@example.test');

insert into authz.user_roles (person_id, role_key)
select id, 'program_manager' from identity.people
where auth_user_id = 'b2000000-0000-0000-0000-000000000001';

insert into programs.programs (slug, title, active)
values ('test-active-program', 'Test Active Program', true);

insert into programs.programs (slug, title, active)
values ('test-inactive-program', 'Test Inactive Program', false);

insert into programs.sessions (program_id, starts_at, ends_at, capacity)
select id, now() + interval '7 days', now() + interval '7 days 2 hours', 10
from programs.programs where slug = 'test-active-program';

insert into programs.sessions (program_id, starts_at, ends_at, capacity)
select id, now() + interval '7 days', now() + interval '7 days 2 hours', 10
from programs.programs where slug = 'test-inactive-program';

insert into programs.registrations (session_id, person_id, status)
select s.id, p.id, 'registered'
from programs.sessions s
join programs.programs pr on pr.id = s.program_id and pr.slug = 'test-active-program'
cross join (select id from identity.people where auth_user_id = 'b2000000-0000-0000-0000-000000000002') p;

-- ---------------------------------------------------------------------
-- venues_select_all / venues_manage_staff
-- ---------------------------------------------------------------------
insert into programs.venues (name, capacity) values ('Test Venue', 50);

set local role anon;
select ok(
  (select count(*)::int from programs.venues where name = 'Test Venue') = 1,
  'venues_select_all (allow): anon can read venues'
);
reset role;

set local role authenticated;
set local request.jwt.claims = '{"sub": "b2000000-0000-0000-0000-000000000001", "role": "authenticated", "aal": "aal2"}';
update programs.venues set capacity = 99 where name = 'Test Venue';
select is(
  (select capacity from programs.venues where name = 'Test Venue'),
  99,
  'venues_manage_staff (allow): program_manager with aal2 can edit a venue'
);
reset role;

set local role authenticated;
set local request.jwt.claims = '{"sub": "b2000000-0000-0000-0000-000000000003", "role": "authenticated"}';
update programs.venues set capacity = 1 where name = 'Test Venue';
reset role;
select isnt(
  (select capacity from programs.venues where name = 'Test Venue'),
  1,
  'venues_manage_staff (deny): an ordinary person cannot edit a venue'
);

-- ---------------------------------------------------------------------
-- programs_select_active / programs_select_staff
-- ---------------------------------------------------------------------
set local role anon;
select is(
  (select count(*)::int from programs.programs where slug = 'test-active-program'),
  1,
  'programs_select_active (allow): anon sees an active program'
);
select is(
  (select count(*)::int from programs.programs where slug = 'test-inactive-program'),
  0,
  'programs_select_active / programs_select_staff (deny): anon does not see an inactive program'
);
reset role;

set local role authenticated;
set local request.jwt.claims = '{"sub": "b2000000-0000-0000-0000-000000000001", "role": "authenticated", "aal": "aal2"}';
select is(
  (select count(*)::int from programs.programs where slug = 'test-inactive-program'),
  1,
  'programs_select_staff (allow): program_manager sees an inactive program'
);
reset role;

-- ---------------------------------------------------------------------
-- programs_manage_staff
-- ---------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims = '{"sub": "b2000000-0000-0000-0000-000000000001", "role": "authenticated", "aal": "aal2"}';
update programs.programs set title = 'Renamed by test' where slug = 'test-active-program';
select is(
  (select title from programs.programs where slug = 'test-active-program'),
  'Renamed by test',
  'programs_manage_staff (allow): program_manager with aal2 can edit a program'
);
reset role;

set local role authenticated;
set local request.jwt.claims = '{"sub": "b2000000-0000-0000-0000-000000000003", "role": "authenticated"}';
update programs.programs set title = 'Hacked' where slug = 'test-active-program';
reset role;
select isnt(
  (select title from programs.programs where slug = 'test-active-program'),
  'Hacked',
  'programs_manage_staff (deny): an ordinary person cannot edit a program'
);

-- ---------------------------------------------------------------------
-- sessions_select_of_visible_program / sessions_select_staff
-- ---------------------------------------------------------------------
set local role anon;
select is(
  (select count(*)::int from programs.sessions s
     join programs.programs p on p.id = s.program_id and p.slug = 'test-active-program'),
  1,
  'sessions_select_of_visible_program (allow): anon sees a session of an active program'
);
select is(
  (select count(*)::int from programs.sessions s
     join programs.programs p on p.id = s.program_id and p.slug = 'test-inactive-program'),
  0,
  'sessions_select_of_visible_program / sessions_select_staff (deny): anon does not see a session of an inactive program'
);
reset role;

set local role authenticated;
set local request.jwt.claims = '{"sub": "b2000000-0000-0000-0000-000000000001", "role": "authenticated", "aal": "aal2"}';
select is(
  (select count(*)::int from programs.sessions s
     join programs.programs p on p.id = s.program_id and p.slug = 'test-inactive-program'),
  1,
  'sessions_select_staff (allow): program_manager sees a session of an inactive program'
);
reset role;

-- ---------------------------------------------------------------------
-- sessions_manage_staff
-- ---------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims = '{"sub": "b2000000-0000-0000-0000-000000000001", "role": "authenticated", "aal": "aal2"}';
update programs.sessions set capacity = 5
where program_id = (select id from programs.programs where slug = 'test-active-program');
select is(
  (select capacity from programs.sessions
     where program_id = (select id from programs.programs where slug = 'test-active-program')),
  5,
  'sessions_manage_staff (allow): program_manager with aal2 can edit a session'
);
reset role;

set local role authenticated;
set local request.jwt.claims = '{"sub": "b2000000-0000-0000-0000-000000000003", "role": "authenticated"}';
update programs.sessions set capacity = 1
where program_id = (select id from programs.programs where slug = 'test-active-program');
reset role;
select isnt(
  (select capacity from programs.sessions
     where program_id = (select id from programs.programs where slug = 'test-active-program')),
  1,
  'sessions_manage_staff (deny): an ordinary person cannot edit a session'
);

-- ---------------------------------------------------------------------
-- registrations_select_self / registrations_select_staff
-- ---------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims = '{"sub": "b2000000-0000-0000-0000-000000000002", "role": "authenticated"}';
select is(
  (select count(*)::int from programs.registrations),
  1,
  'registrations_select_self (allow): Dave sees his own registration'
);
reset role;

set local role authenticated;
set local request.jwt.claims = '{"sub": "b2000000-0000-0000-0000-000000000003", "role": "authenticated"}';
select is(
  (select count(*)::int from programs.registrations),
  0,
  'registrations_select_self / registrations_select_staff (deny): Erin (no registration, no staff permission) sees none'
);
reset role;

set local role authenticated;
set local request.jwt.claims = '{"sub": "b2000000-0000-0000-0000-000000000001", "role": "authenticated", "aal": "aal2"}';
select is(
  (select count(*)::int from programs.registrations),
  1,
  'registrations_select_staff (allow): program_manager sees every registration'
);
reset role;

-- ---------------------------------------------------------------------
-- Table-level grant sanity: registrations have no direct write path.
-- ---------------------------------------------------------------------
select ok(
  not has_table_privilege('authenticated', 'programs.registrations', 'INSERT'),
  'authenticated has no direct INSERT privilege on programs.registrations (must go through register())'
);

select ok(
  not has_table_privilege('anon', 'programs.registrations', 'SELECT'),
  'anon cannot read programs.registrations at all (no anon grant)'
);

select * from finish();
rollback;
