-- admin/02_log_system_event.sql
--
-- api.log_system_event / admin.log_system_event are the only path Edge
-- Functions use to record an outbound-notification send to
-- admin.audit_log (migration 0036). Only service_role may call either --
-- no person, no staff role, gets execute here.
begin;
select plan(5);

select ok(
  not has_function_privilege('anon', 'api.log_system_event(text, text, text, uuid, jsonb)', 'EXECUTE'),
  'anon cannot execute api.log_system_event'
);

select ok(
  not has_function_privilege('authenticated', 'api.log_system_event(text, text, text, uuid, jsonb)', 'EXECUTE'),
  'authenticated cannot execute api.log_system_event'
);

select ok(
  has_function_privilege('service_role', 'api.log_system_event(text, text, text, uuid, jsonb)', 'EXECUTE'),
  'service_role can execute api.log_system_event'
);

select ok(
  not has_function_privilege('authenticated', 'admin.log_system_event(text, text, text, uuid, jsonb)', 'EXECUTE'),
  'authenticated cannot execute admin.log_system_event directly (must go through api wrapper)'
);

-- api.log_system_event is SECURITY INVOKER: it calls admin.log_system_event
-- as whichever role invoked the wrapper, so service_role needs EXECUTE on
-- *both* functions, not just the api one, or every call from
-- send-email.ts would fail with "permission denied for function".
select ok(
  has_function_privilege('service_role', 'admin.log_system_event(text, text, text, uuid, jsonb)', 'EXECUTE'),
  'service_role can execute admin.log_system_event (required for the SECURITY INVOKER api wrapper to work at all)'
);

select * from finish();
rollback;
