-- admin/01_audit_log_append_only.sql
--
-- Append-only is enforced at the GRANT level (Architecture Blueprint §4.7),
-- not by RLS, so it holds even for a service_role connection and even for
-- Super Admin. This test checks privileges directly rather than trying to
-- perform an UPDATE/DELETE and catch a permission error, so it also fails
-- loudly if a future migration accidentally re-grants the privilege.
begin;
select plan(4);

select ok(
  not has_table_privilege('authenticated', 'admin.audit_log', 'UPDATE'),
  'authenticated cannot UPDATE admin.audit_log'
);

select ok(
  not has_table_privilege('authenticated', 'admin.audit_log', 'DELETE'),
  'authenticated cannot DELETE admin.audit_log'
);

select ok(
  not has_table_privilege('anon', 'admin.audit_log', 'SELECT'),
  'anon cannot read admin.audit_log at all'
);

select ok(
  has_table_privilege('authenticated', 'admin.audit_log', 'SELECT'),
  'authenticated has base SELECT privilege (RLS then restricts to staff with admin.audit_log.read, see 01_has_permission-style tests)'
);

select * from finish();
rollback;
