-- authz/03_custom_access_token_hook.sql
begin;
select plan(4);

insert into authz.roles (key, name) values ('test_hook_role', 'Test Hook Role');
insert into authz.permissions (key, description) values ('test.hook.thing', 'Do the hook test thing');
insert into authz.role_permissions (role_key, permission_key) values ('test_hook_role', 'test.hook.thing');

insert into auth.users (id, email) values ('e0000000-0000-0000-0000-000000000001', 'hooked@example.test');
-- identity.handle_new_auth_user (trigger) creates the corresponding people row.

insert into authz.user_roles (person_id, role_key)
select id, 'test_hook_role' from identity.people where auth_user_id = 'e0000000-0000-0000-0000-000000000001';

select ok(
  (authz.custom_access_token_hook(
    jsonb_build_object(
      'user_id', 'e0000000-0000-0000-0000-000000000001',
      'claims', jsonb_build_object('sub', 'e0000000-0000-0000-0000-000000000001')
    )
  ) -> 'claims' -> 'roles') @> to_jsonb(array['test_hook_role']),
  'Hook adds the person''s current role keys to claims.roles'
);

select ok(
  (authz.custom_access_token_hook(
    jsonb_build_object(
      'user_id', 'e0000000-0000-0000-0000-000000000001',
      'claims', jsonb_build_object('sub', 'e0000000-0000-0000-0000-000000000001')
    )
  ) -> 'claims' -> 'permissions') @> to_jsonb(array['test.hook.thing']),
  'Hook adds the permission keys granted by that role to claims.permissions'
);

select ok(
  (authz.custom_access_token_hook(
    jsonb_build_object(
      'user_id', '00000000-0000-0000-0000-000000000000',
      'claims', jsonb_build_object('sub', '00000000-0000-0000-0000-000000000000')
    )
  ) -> 'claims') = jsonb_build_object('sub', '00000000-0000-0000-0000-000000000000'),
  'Hook is a no-op (returns the event unchanged) for a user with no matching person record'
);

update authz.user_roles set expires_at = now() - interval '1 day' where role_key = 'test_hook_role';

select ok(
  (authz.custom_access_token_hook(
    jsonb_build_object(
      'user_id', 'e0000000-0000-0000-0000-000000000001',
      'claims', jsonb_build_object('sub', 'e0000000-0000-0000-0000-000000000001')
    )
  ) -> 'claims' -> 'roles') = '[]'::jsonb,
  'Expired role grants are excluded from claims.roles'
);

select * from finish();
rollback;
