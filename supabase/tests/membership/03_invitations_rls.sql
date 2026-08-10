-- membership/03_invitations_rls.sql
--
-- Allow + deny for membership.invitations' RLS policy and the D-12
-- invite/accept functions (0039, 0040).
begin;
select plan(10);

insert into auth.users (id, email) values
  ('fc000000-0000-0000-0000-000000000001', 'alice-mm3@example.test'),
  ('fc000000-0000-0000-0000-000000000002', 'bob-applicant@example.test'),
  ('fc000000-0000-0000-0000-000000000003', 'carol-nobody4@example.test');

insert into authz.user_roles (person_id, role_key)
select id, 'membership_manager' from identity.people where auth_user_id = 'fc000000-0000-0000-0000-000000000001';

insert into membership.applications (person_id, tier_key, motivation)
select id, 'friend', 'Test invitation flow' from identity.people
where auth_user_id = 'fc000000-0000-0000-0000-000000000002';

-- ---------------------------------------------------------------------
-- membership.invite_applicant: deny (no permission), then allow.
-- ---------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims = '{"sub": "fc000000-0000-0000-0000-000000000003", "role": "authenticated", "aal": "aal2"}';
select throws_ok(
  $$select * from membership.invite_applicant(
    (select id from membership.applications where motivation = 'Test invitation flow'),
    (select id from identity.people where auth_user_id = 'fc000000-0000-0000-0000-000000000003')
  )$$,
  '42501',
  'invite_applicant (deny): a person without membership.application.decide cannot invite an applicant'
);
reset role;

set local role authenticated;
set local request.jwt.claims = '{"sub": "fc000000-0000-0000-0000-000000000001", "role": "authenticated", "aal": "aal2"}';
select ok(
  exists (
    select 1 from membership.invite_applicant(
      (select id from membership.applications where motivation = 'Test invitation flow'),
      (select id from identity.people where auth_user_id = 'fc000000-0000-0000-0000-000000000001')
    )
  ),
  'invite_applicant (allow): membership_manager with aal2 can invite a pending applicant'
);
reset role;

select is(
  (select status from membership.applications where motivation = 'Test invitation flow'),
  'invited',
  'invite_applicant sets the application status to invited'
);

select is(
  (select count(*)::int from membership.invitations iv
     join membership.applications a on a.id = iv.application_id
     where a.motivation = 'Test invitation flow'),
  1,
  'invite_applicant creates exactly one invitation row'
);

-- ---------------------------------------------------------------------
-- invitations_select_staff
-- ---------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims = '{"sub": "fc000000-0000-0000-0000-000000000001", "role": "authenticated", "aal": "aal2"}';
select ok(
  (select count(*)::int from membership.invitations) > 0,
  'invitations_select_staff (allow): membership_manager can read invitations'
);
reset role;

set local role authenticated;
set local request.jwt.claims = '{"sub": "fc000000-0000-0000-0000-000000000003", "role": "authenticated", "aal": "aal2"}';
select is(
  (select count(*)::int from membership.invitations),
  0,
  'invitations_select_staff (deny): a person without membership.application.decide reads none'
);
reset role;

-- ---------------------------------------------------------------------
-- membership.accept_invitation
-- ---------------------------------------------------------------------
select throws_ok(
  $$select membership.accept_invitation('not-a-real-token')$$,
  '42501',
  'accept_invitation (deny): an unrecognized token is rejected'
);

-- Re-derive the real token the same way invite_applicant did (both use
-- the same deterministic digest of the token against token_hash) --
-- pgTAP can't read back a token already consumed by RETURNS TABLE above,
-- so this issues a fresh invitation via reissue_invitation and captures
-- its token directly for the allow-path assertion below.
set local role authenticated;
set local request.jwt.claims = '{"sub": "fc000000-0000-0000-0000-000000000001", "role": "authenticated", "aal": "aal2"}';
create temporary table test_reissued_token as
select token from membership.reissue_invitation(
  (select id from membership.applications where motivation = 'Test invitation flow'),
  (select id from identity.people where auth_user_id = 'fc000000-0000-0000-0000-000000000001')
);
reset role;

-- Captured in its own statement first, not inline inside the is()
-- comparison below -- argument evaluation order across the two sides of
-- is() isn't something to rely on, and this call is the one that
-- actually creates the member row the second assertion reads back.
create temporary table test_accept_result as
select membership.accept_invitation((select token from test_reissued_token)) as member_no;

select is(
  (select member_no from test_accept_result),
  (select member_no from membership.members m join identity.people p on p.id = m.person_id
     where p.auth_user_id = 'fc000000-0000-0000-0000-000000000002'),
  'accept_invitation (allow): a valid token creates the member and returns their member_no'
);

select is(
  (select status from membership.members m join identity.people p on p.id = m.person_id
     where p.auth_user_id = 'fc000000-0000-0000-0000-000000000002'),
  'active',
  'accept_invitation creates the member as active'
);

select throws_ok(
  $$select membership.accept_invitation((select token from test_reissued_token))$$,
  'accept_invitation (deny): the same token cannot be used twice'
);

select * from finish();
rollback;
