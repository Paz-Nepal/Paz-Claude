-- membership/05_digital_card.sql
--
-- T-083: api.issue_my_card / api.verify_member_card (0042).
begin;
select plan(11);

insert into auth.users (id, email) values
  ('c5000000-0000-0000-0000-000000000001', 'grace-active-member@example.test'),
  ('c5000000-0000-0000-0000-000000000002', 'henry-lapsed-member@example.test'),
  ('c5000000-0000-0000-0000-000000000003', 'iris-mm5@example.test'),
  ('c5000000-0000-0000-0000-000000000004', 'jack-nobody5@example.test'),
  ('c5000000-0000-0000-0000-000000000005', 'kevin-mm-and-member5@example.test');

insert into authz.user_roles (person_id, role_key)
select id, 'membership_manager' from identity.people where auth_user_id = 'c5000000-0000-0000-0000-000000000003';

-- A membership_manager who is *also* a member -- the fixture that would
-- expose a leak if api.my_membership relied on members_select_staff's OR
-- rather than its own explicit person_id filter.
insert into authz.user_roles (person_id, role_key)
select id, 'membership_manager' from identity.people where auth_user_id = 'c5000000-0000-0000-0000-000000000005';

insert into membership.members (person_id, member_no, tier_key, status)
select id, 'PAZ-TEST-GRACE', 'friend', 'active' from identity.people
where auth_user_id = 'c5000000-0000-0000-0000-000000000001';

insert into membership.members (person_id, member_no, tier_key, status)
select id, 'PAZ-TEST-HENRY', 'friend', 'lapsed' from identity.people
where auth_user_id = 'c5000000-0000-0000-0000-000000000002';

insert into membership.members (person_id, member_no, tier_key, status)
select id, 'PAZ-TEST-KEVIN', 'friend', 'active' from identity.people
where auth_user_id = 'c5000000-0000-0000-0000-000000000005';

-- ---------------------------------------------------------------------
-- api.issue_my_card
-- ---------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims = '{"sub": "c5000000-0000-0000-0000-000000000004", "role": "authenticated"}';
select throws_ok(
  $$select * from api.issue_my_card()$$,
  '42501',
  'issue_my_card (deny): a person with no membership row cannot issue a card'
);
reset role;

set local role authenticated;
set local request.jwt.claims = '{"sub": "c5000000-0000-0000-0000-000000000002", "role": "authenticated"}';
select throws_ok(
  $$select * from api.issue_my_card()$$,
  '42501',
  'issue_my_card (deny): a lapsed member cannot issue a card'
);
reset role;

set local role authenticated;
set local request.jwt.claims = '{"sub": "c5000000-0000-0000-0000-000000000001", "role": "authenticated"}';
create temporary table test_card_1 as select * from api.issue_my_card();
reset role;

select is(
  (select member_no from test_card_1), 'PAZ-TEST-GRACE',
  'issue_my_card (allow): an active member gets their own member_no back'
);
select isnt(
  (select card_token_hash from membership.members where member_no = 'PAZ-TEST-GRACE'),
  null,
  'issue_my_card (allow): card_token_hash is set on the member row'
);

-- ---------------------------------------------------------------------
-- api.verify_member_card
-- ---------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims = '{"sub": "c5000000-0000-0000-0000-000000000003", "role": "authenticated", "aal": "aal2"}';
select is(
  (select valid from api.verify_member_card((select token from test_card_1))),
  true,
  'verify_member_card (allow): membership_manager with aal2 sees valid = true for an active member''s code'
);
reset role;

set local role authenticated;
set local request.jwt.claims = '{"sub": "c5000000-0000-0000-0000-000000000004", "role": "authenticated"}';
select is(
  (select count(*)::int from api.verify_member_card((select token from test_card_1))),
  0,
  'verify_member_card (deny): a non-staff caller gets no rows, not an error'
);
reset role;

-- ---------------------------------------------------------------------
-- Reissue rotates the code: the old one stops verifying.
-- ---------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims = '{"sub": "c5000000-0000-0000-0000-000000000001", "role": "authenticated"}';
create temporary table test_card_2 as select * from api.issue_my_card();
reset role;

select isnt(
  (select token from test_card_1), (select token from test_card_2),
  'issue_my_card (reissue): a second call generates a different code'
);

set local role authenticated;
set local request.jwt.claims = '{"sub": "c5000000-0000-0000-0000-000000000003", "role": "authenticated", "aal": "aal2"}';
select is(
  (select count(*)::int from api.verify_member_card((select token from test_card_1))),
  0,
  'verify_member_card (reissue): the superseded code no longer verifies'
);
reset role;

-- ---------------------------------------------------------------------
-- api.my_membership -- self-scoped even for a staff member who is also
-- a member (the leak this view's explicit person_id filter prevents).
-- ---------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims = '{"sub": "c5000000-0000-0000-0000-000000000001", "role": "authenticated"}';
select is(
  (select count(*)::int from api.my_membership),
  1,
  'my_membership (self): an ordinary member sees exactly one row'
);
reset role;

set local role authenticated;
set local request.jwt.claims = '{"sub": "c5000000-0000-0000-0000-000000000005", "role": "authenticated", "aal": "aal2"}';
select is(
  (select count(*)::int from api.my_membership),
  1,
  'my_membership (staff-who-is-also-a-member): still exactly one row, not the whole roster'
);
select is(
  (select member_no from api.my_membership),
  'PAZ-TEST-KEVIN',
  'my_membership (staff-who-is-also-a-member): the one row is their own, not another member''s'
);
reset role;

select * from finish();
rollback;
