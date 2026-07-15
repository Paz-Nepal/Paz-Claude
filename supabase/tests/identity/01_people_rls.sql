-- identity/01_people_rls.sql
--
-- Doctrine (Architecture Blueprint §3.4): every RLS policy has a test
-- asserting BOTH the allow case and the deny case. This is the template
-- every later domain's RLS tests copy.
begin;
select plan(6);

-- Fixtures: two auth users and their linked people rows.
insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'alice@example.test'),
  ('22222222-2222-2222-2222-222222222222', 'bob@example.test');
-- (identity.handle_new_auth_user fires and creates the people rows.)

-- Alice reading her own profile: allow.
set local role authenticated;
set local request.jwt.claims = '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}';

select is(
  (select count(*)::int from identity.people where auth_user_id = '11111111-1111-1111-1111-111111111111'),
  1,
  'Alice can read her own person row'
);

select is(
  (select count(*)::int from identity.people where auth_user_id = '22222222-2222-2222-2222-222222222222'),
  0,
  'Alice cannot read Bob''s person row (deny case: no staff permission granted)'
);

-- Alice updating her own display_name: allow.
update identity.people set display_name = 'Alice A.' where auth_user_id = '11111111-1111-1111-1111-111111111111';
select is(
  (select display_name from identity.people where auth_user_id = '11111111-1111-1111-1111-111111111111'),
  'Alice A.',
  'Alice can update her own display_name'
);

-- Alice attempting to update Bob's row: the RLS-filtered UPDATE affects
-- zero rows rather than erroring, which is the expected Postgres RLS
-- behavior -- assert no row was changed.
update identity.people set display_name = 'Hacked' where auth_user_id = '22222222-2222-2222-2222-222222222222';
reset role;
select isnt(
  (select display_name from identity.people where auth_user_id = '22222222-2222-2222-2222-222222222222'),
  'Hacked',
  'Alice cannot update Bob''s person row (deny case)'
);

-- Anonymous callers get nothing.
set local role anon;
select is(
  (select count(*)::int from identity.people),
  0,
  'Anonymous callers cannot read any person row'
);
reset role;

-- Table-level grant sanity: INSERT is not available to authenticated at all
-- (people rows are created only by the auth trigger or service-role
-- functions) -- confirmed at the privilege level, not just by RLS.
select ok(
  not has_table_privilege('authenticated', 'identity.people', 'INSERT'),
  'authenticated has no direct INSERT privilege on identity.people'
);

select * from finish();
rollback;
