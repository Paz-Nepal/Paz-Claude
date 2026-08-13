-- membership/01_rls.sql
--
-- Allow + deny for every RLS policy in 0010_membership.sql (Build
-- Readiness Review §3.4 doctrine; identity/01_people_rls.sql is the
-- template this and every later domain's RLS tests copy). Uses the real
-- 'membership_manager' role/permission keys from supabase/seed/authz.sql
-- (reference data, applied in every environment) rather than synthetic
-- ones, so a drift between the seed matrix and the policies themselves
-- would actually be caught here.
begin;
select plan(14);

-- Fixtures: three people. Alice is the membership manager; Bob and Carol
-- are ordinary members.
insert into auth.users (id, email) values
  ('a1000000-0000-0000-0000-000000000001', 'alice-mm@example.test'),
  ('a1000000-0000-0000-0000-000000000002', 'bob-member@example.test'),
  ('a1000000-0000-0000-0000-000000000003', 'carol-member@example.test');

insert into authz.user_roles (person_id, role_key)
select id, 'membership_manager' from identity.people
where auth_user_id = 'a1000000-0000-0000-0000-000000000001';

insert into membership.members (person_id, member_no, tier_key, status)
select id, 'PAZ-TEST-BOB', 'friend', 'active' from identity.people
where auth_user_id = 'a1000000-0000-0000-0000-000000000002';

insert into membership.members (person_id, member_no, tier_key, status)
select id, 'PAZ-TEST-CAROL', 'friend', 'active' from identity.people
where auth_user_id = 'a1000000-0000-0000-0000-000000000003';

insert into membership.terms (member_id, tier_key, starts_on, ends_on, amount_cents, paid_at)
select id, 'friend', current_date, (current_date + interval '1 year')::date, 200000, now()
from membership.members where member_no = 'PAZ-TEST-BOB';

insert into membership.applications (person_id, tier_key, motivation)
select id, 'friend', 'Test application' from identity.people
where auth_user_id = 'a1000000-0000-0000-0000-000000000002';

-- ---------------------------------------------------------------------
-- tiers_select_all: everyone, including anon, can read active tiers.
-- ---------------------------------------------------------------------
set local role anon;
select ok(
  (select count(*)::int from membership.tiers) > 0,
  'tiers_select_all (allow): anon can read membership tiers'
);
reset role;

-- ---------------------------------------------------------------------
-- tiers_manage_staff
-- ---------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims = '{"sub": "a1000000-0000-0000-0000-000000000001", "role": "authenticated", "aal": "aal2"}';
insert into membership.tiers (key, name, description, annual_fee_cents)
values ('test-tier', 'Test Tier', 'A tier created by a pgTAP test', 100000);
select ok(
  exists (select 1 from membership.tiers where key = 'test-tier'),
  'tiers_manage_staff (allow): membership_manager with aal2 can create a tier'
);
reset role;

set local role authenticated;
set local request.jwt.claims = '{"sub": "a1000000-0000-0000-0000-000000000002", "role": "authenticated", "aal": "aal2"}';
update membership.tiers set name = 'Hacked' where key = 'friend';
reset role;
select isnt(
  (select name from membership.tiers where key = 'friend'),
  'Hacked',
  'tiers_manage_staff (deny): an ordinary member cannot edit a tier'
);

-- ---------------------------------------------------------------------
-- applications_select_staff
-- ---------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims = '{"sub": "a1000000-0000-0000-0000-000000000001", "role": "authenticated", "aal": "aal2"}';
select ok(
  (select count(*)::int from membership.applications) > 0,
  'applications_select_staff (allow): membership_manager can read the application queue'
);
reset role;

set local role authenticated;
set local request.jwt.claims = '{"sub": "a1000000-0000-0000-0000-000000000003", "role": "authenticated"}';
select is(
  (select count(*)::int from membership.applications),
  0,
  'applications_select_staff (deny): an ordinary member cannot read the application queue (not even their own application)'
);
reset role;

-- ---------------------------------------------------------------------
-- members_select_self / members_select_staff
-- ---------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims = '{"sub": "a1000000-0000-0000-0000-000000000002", "role": "authenticated"}';
select is(
  (select member_no from membership.members where person_id = (select authz.current_person_id())),
  'PAZ-TEST-BOB',
  'members_select_self (allow): Bob can read his own member row'
);

select is(
  (select count(*)::int from membership.members where member_no = 'PAZ-TEST-CAROL'),
  0,
  'members_select_self / members_select_staff (deny): Bob cannot read Carol''s member row'
);
reset role;

set local role authenticated;
set local request.jwt.claims = '{"sub": "a1000000-0000-0000-0000-000000000001", "role": "authenticated", "aal": "aal2"}';
select is(
  (select count(*)::int from membership.members where member_no in ('PAZ-TEST-BOB', 'PAZ-TEST-CAROL')),
  2,
  'members_select_staff (allow): membership_manager can read every member row'
);
reset role;

set local role anon;
select is(
  (select count(*)::int from membership.members),
  0,
  'members: anon cannot read the member table at all'
);
reset role;

-- ---------------------------------------------------------------------
-- terms_select_self / terms_select_staff
-- ---------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims = '{"sub": "a1000000-0000-0000-0000-000000000002", "role": "authenticated"}';
select ok(
  (select count(*)::int from membership.terms) > 0,
  'terms_select_self (allow): Bob can read his own membership term'
);
reset role;

set local role authenticated;
set local request.jwt.claims = '{"sub": "a1000000-0000-0000-0000-000000000003", "role": "authenticated"}';
select is(
  (select count(*)::int from membership.terms),
  0,
  'terms_select_self / terms_select_staff (deny): Carol (no term, no staff permission) reads none'
);
reset role;

set local role authenticated;
set local request.jwt.claims = '{"sub": "a1000000-0000-0000-0000-000000000001", "role": "authenticated", "aal": "aal2"}';
select ok(
  (select count(*)::int from membership.terms) > 0,
  'terms_select_staff (allow): membership_manager can read every term via membership.member.read/term.manage'
);
reset role;

-- ---------------------------------------------------------------------
-- Table-level grant sanity: no direct write path around the
-- security-definer functions (decide_application, set_member_status,
-- record_payment all run as their own owner, not via table grants).
-- ---------------------------------------------------------------------
select ok(
  not has_table_privilege('authenticated', 'membership.members', 'INSERT'),
  'authenticated has no direct INSERT privilege on membership.members (must go through decide_application())'
);

select ok(
  not has_table_privilege('authenticated', 'membership.terms', 'INSERT'),
  'authenticated has no direct INSERT privilege on membership.terms (must go through decide_application()/record_payment())'
);

select * from finish();
rollback;
