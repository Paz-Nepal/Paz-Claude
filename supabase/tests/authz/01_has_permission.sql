-- authz/01_has_permission.sql
begin;
select plan(6);

insert into authz.roles (key, name) values ('test_role', 'Test Role');
insert into authz.permissions (key, description) values ('test.thing.do', 'Do the test thing');
insert into authz.role_permissions (role_key, permission_key) values ('test_role', 'test.thing.do');

insert into auth.users (id, email) values ('c0000000-0000-0000-0000-000000000001', 'staffer@example.test');
-- identity.handle_new_auth_user (trigger) creates the corresponding people row.

-- has_permission() is contextual to the CALLING session's JWT (via
-- authz.current_person_id() -> auth.uid()) -- it is not parameterized by a
-- person id. To test a specific person's access, impersonate them with
-- `set local request.jwt.claims`, exactly as a real request would arrive.
set local role authenticated;
set local request.jwt.claims = '{"sub": "c0000000-0000-0000-0000-000000000001", "role": "authenticated"}';

select ok(
  not (select authz.has_permission('test.thing.do')),
  'Deny case: a person with no role grant lacks the permission'
);
reset role;

insert into authz.user_roles (person_id, role_key)
select id, 'test_role' from identity.people where auth_user_id = 'c0000000-0000-0000-0000-000000000001';

set local role authenticated;
set local request.jwt.claims = '{"sub": "c0000000-0000-0000-0000-000000000001", "role": "authenticated"}';

select ok(
  (select authz.has_permission('test.thing.do')),
  'Allow case: granting the role grants the permission'
);

select ok(
  not (select authz.has_permission('test.nonexistent.permission')),
  'Deny case: an unrecognized permission key is always false, never an error'
);
reset role;

-- Expired grants do not count.
update authz.user_roles
set expires_at = now() - interval '1 day'
where role_key = 'test_role';

set local role authenticated;
set local request.jwt.claims = '{"sub": "c0000000-0000-0000-0000-000000000001", "role": "authenticated"}';
select ok(
  not (select authz.has_permission('test.thing.do')),
  'Deny case: an expired grant no longer confers the permission'
);
reset role;

-- Restore the grant (it was expired for the previous assertion) so the
-- next two assertions isolate MFA as the only variable being tested.
update authz.user_roles set expires_at = null where role_key = 'test_role';

set local role authenticated;
set local request.jwt.claims = '{"sub": "c0000000-0000-0000-0000-000000000001", "role": "authenticated"}';

select ok(
  (select authz.session_aal()) = 'aal1',
  'session_aal() defaults to aal1 when no aal claim is present (no MFA -> staff checks fail closed)'
);

select ok(
  not (select authz.has_staff_permission('test.thing.do')),
  'has_staff_permission() denies even a granted permission when the session has not completed MFA (aal1)'
);
reset role;

select * from finish();
rollback;
