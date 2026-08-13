-- admin/03_settings_and_audit_log_select_rls.sql
--
-- Allow + deny for admin.settings' two policies and admin.audit_log's
-- read policy (0006_admin_settings.sql) -- the audit_log append-only
-- grant checks live separately in 01_audit_log_append_only.sql; this
-- file covers the actual RLS read policy that grants staff access at all,
-- which nothing has tested until now.
begin;
select plan(6);

insert into auth.users (id, email) values
  ('fa000000-0000-0000-0000-000000000001', 'admin-settings@example.test'),
  ('fa000000-0000-0000-0000-000000000002', 'nobody-settings@example.test');

insert into authz.user_roles (person_id, role_key)
select id, 'administrator' from identity.people where auth_user_id = 'fa000000-0000-0000-0000-000000000001';

insert into admin.settings (key, value, description) values ('test.setting', '"hello"'::jsonb, 'A test setting');

insert into admin.audit_log (action, entity_schema, entity_table, context)
values ('test.action', 'admin', 'settings', '{"note": "fixture row"}'::jsonb);

-- ---------------------------------------------------------------------
-- settings_select_all_staff / settings_manage_staff
-- ---------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims = '{"sub": "fa000000-0000-0000-0000-000000000001", "role": "authenticated", "aal": "aal2"}';
select is(
  (select count(*)::int from admin.settings where key = 'test.setting'),
  1,
  'settings_select_all_staff (allow): administrator with admin.settings.read can read settings'
);
update admin.settings set value = '"changed"'::jsonb where key = 'test.setting';
select is(
  (select value from admin.settings where key = 'test.setting'),
  '"changed"'::jsonb,
  'settings_manage_staff (allow): administrator with admin.settings.manage can edit a setting'
);
reset role;

set local role authenticated;
set local request.jwt.claims = '{"sub": "fa000000-0000-0000-0000-000000000002", "role": "authenticated", "aal": "aal2"}';
select is(
  (select count(*)::int from admin.settings),
  0,
  'settings_select_all_staff (deny): a person without admin.settings.read reads none'
);
update admin.settings set value = '"hacked"'::jsonb where key = 'test.setting';
reset role;
select isnt(
  (select value from admin.settings where key = 'test.setting'),
  '"hacked"'::jsonb,
  'settings_manage_staff (deny): a person without admin.settings.manage cannot edit a setting'
);

-- ---------------------------------------------------------------------
-- audit_log_select_staff
-- ---------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims = '{"sub": "fa000000-0000-0000-0000-000000000001", "role": "authenticated", "aal": "aal2"}';
select ok(
  (select count(*)::int from admin.audit_log where action = 'test.action') > 0,
  'audit_log_select_staff (allow): administrator with admin.audit_log.read can read the audit log'
);
reset role;

set local role authenticated;
set local request.jwt.claims = '{"sub": "fa000000-0000-0000-0000-000000000002", "role": "authenticated", "aal": "aal2"}';
select is(
  (select count(*)::int from admin.audit_log),
  0,
  'audit_log_select_staff (deny): a person without admin.audit_log.read reads none'
);
reset role;

select * from finish();
rollback;
