-- 0053_service_role_schema_usage.sql
--
-- Found live testing 0051/0052's new send-a-pigeon Edge Function:
-- "permission denied for schema api" -- USAGE on the api schema was only
-- ever granted to anon/authenticated (0005), never service_role, despite
-- several functions already being service_role-only
-- (api.publish_scheduled_items, api.terms_due_for_renewal_notice,
-- admin.log_system_event, and now the three intake RPCs from 0051).
-- Function-level EXECUTE grants are necessary but not sufficient without
-- schema-level USAGE -- this was presumably always broken for
-- publish-scheduled/send-renewal-notices too, just never caught because
-- neither had run against a live database before now (same caveat
-- documented throughout docs/remaining-work.md).

grant usage on schema api to service_role;
grant usage on schema admin to service_role;
