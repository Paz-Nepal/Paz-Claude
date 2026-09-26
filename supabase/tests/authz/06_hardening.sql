-- authz/06_hardening.sql
--
-- 0089_security_hardening.sql: a person cannot rewrite their own identity
-- record beyond the fields meant for it, guest registration is reachable only
-- by the service role, and the permission catalogue is closed to anon.
begin;
select plan(6);

insert into auth.users (id, email) values ('fd900000-0000-0000-0000-000000000001', 'self-hardening@example.test');

set local role authenticated;
set local request.jwt.claims = '{"sub": "fd900000-0000-0000-0000-000000000001", "role": "authenticated", "aal": "aal1"}';

select throws_ok(
  $$ update identity.people set email = 'someone-else@example.test' where auth_user_id = 'fd900000-0000-0000-0000-000000000001' $$,
  '42501', null, 'a person cannot change their own email directly'
);
select lives_ok(
  $$ select api.update_my_profile(null, null, 'A short bio', null) $$,
  'a person can still edit their own bio'
);
select throws_ok(
  $$ select api.register_guest_for_session('00000000-0000-0000-0000-000000000000', 'A', 'a@example.test', null) $$,
  '42501', null, 'the guest path is closed to signed-in callers'
);

reset role;
set local role anon;
select throws_ok(
  $$ select api.register_for_session('00000000-0000-0000-0000-000000000000', 'A', 'a@example.test', null) $$,
  '42501', null, 'anon cannot call register_for_session directly'
);
select throws_ok(
  $$ select count(*) from authz.roles $$,
  '42501', null, 'anon cannot read the permission catalogue'
);

reset role;
set local role service_role;
select throws_ok(
  $$ select api.register_guest_for_session('00000000-0000-0000-0000-000000000000', 'A', 'not-an-email', null) $$,
  '22023', null, 'the guest path refuses an address that is not one'
);

select finish();
rollback;
