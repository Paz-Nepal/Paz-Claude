-- admin/04_contact_messages_rls.sql
--
-- Allow + deny for admin.contact_messages' two policies (0037).
begin;
select plan(5);

insert into auth.users (id, email) values
  ('fb000000-0000-0000-0000-000000000001', 'admin-contact@example.test'),
  ('fb000000-0000-0000-0000-000000000002', 'nobody-contact@example.test');

insert into authz.user_roles (person_id, role_key)
select id, 'administrator' from identity.people where auth_user_id = 'fb000000-0000-0000-0000-000000000001';

insert into admin.contact_messages (full_name, email, message)
values ('Test Contact', 'test-contact@example.test', 'A message for testing.');

-- ---------------------------------------------------------------------
-- contact_messages_select_staff
-- ---------------------------------------------------------------------
set local role anon;
select is(
  (select count(*)::int from admin.contact_messages),
  0,
  'contact_messages_select_staff (deny): anon cannot read the inbox at all (no anon grant)'
);
reset role;

set local role authenticated;
set local request.jwt.claims = '{"sub": "fb000000-0000-0000-0000-000000000002", "role": "authenticated", "aal": "aal2"}';
select is(
  (select count(*)::int from admin.contact_messages),
  0,
  'contact_messages_select_staff (deny): a person without admin.contact_message.read reads none'
);
reset role;

set local role authenticated;
set local request.jwt.claims = '{"sub": "fb000000-0000-0000-0000-000000000001", "role": "authenticated", "aal": "aal2"}';
select ok(
  exists (select 1 from admin.contact_messages where full_name = 'Test Contact'),
  'contact_messages_select_staff (allow): administrator with admin.contact_message.read can read the inbox'
);

-- ---------------------------------------------------------------------
-- contact_messages_update_staff
-- ---------------------------------------------------------------------
update admin.contact_messages
set reviewed = true, reviewed_by = (select authz.current_person_id()), reviewed_at = now()
where full_name = 'Test Contact';
select ok(
  (select reviewed from admin.contact_messages where full_name = 'Test Contact'),
  'contact_messages_update_staff (allow): administrator with admin.contact_message.read can mark a message reviewed'
);
reset role;

set local role authenticated;
set local request.jwt.claims = '{"sub": "fb000000-0000-0000-0000-000000000002", "role": "authenticated", "aal": "aal2"}';
update admin.contact_messages set reviewed = false;
reset role;
select ok(
  (select reviewed from admin.contact_messages where full_name = 'Test Contact'),
  'contact_messages_update_staff (deny): a person without admin.contact_message.read cannot un-review a message'
);

select * from finish();
rollback;
