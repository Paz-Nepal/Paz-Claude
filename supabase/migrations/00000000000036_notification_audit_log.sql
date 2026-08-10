-- 0036_notification_audit_log.sql
--
-- Outbound notifications (email today; the same path would carry SMS/push
-- later) run inside Edge Functions under service_role, and the
-- Architecture Blueprint requires "every send is logged to
-- admin.audit_log" (§8). Those functions have no human actor to attribute
-- the row to, and PostgREST only exposes the `api` schema (see
-- supabase/config.toml) -- so this needs the same thin api-schema-wrapper
-- convention already used everywhere else (api.request_reservation wraps
-- hospitality.request_reservation, etc.), scoped to service_role only.

create function admin.log_system_event(
  p_action text,
  p_entity_schema text,
  p_entity_table text,
  p_entity_id uuid,
  p_context jsonb
)
returns void
language sql
security definer
set search_path = admin, pg_temp
as $$
  insert into admin.audit_log (actor, action, entity_schema, entity_table, entity_id, context)
  values (null, p_action, p_entity_schema, p_entity_table, p_entity_id, p_context);
$$;
comment on function admin.log_system_event(text, text, text, uuid, jsonb) is
  'Audit entry point for system-initiated events with no human actor -- '
  'currently outbound notification sends (see '
  'supabase/functions/_shared/send-email.ts). actor is always null here; '
  'a human actor logs through the domain functions that already write '
  'admin.audit_log directly (identity.merge_people and friends).';

-- SECURITY DEFINER only changes whose privileges apply *inside* the
-- function body -- the caller still needs EXECUTE to invoke it at all.
-- api.log_system_event below is SECURITY INVOKER (matching
-- api.request_reservation's own wrapper pattern), so the role that calls
-- it -- service_role -- needs EXECUTE here too, not just on the wrapper.
revoke all on function admin.log_system_event(text, text, text, uuid, jsonb)
  from public, anon, authenticated;
grant execute on function admin.log_system_event(text, text, text, uuid, jsonb) to service_role;

create function api.log_system_event(
  p_action text,
  p_entity_schema text,
  p_entity_table text,
  p_entity_id uuid,
  p_context jsonb
)
returns void
language sql
security invoker
set search_path = admin, pg_temp
as $$
  select admin.log_system_event(p_action, p_entity_schema, p_entity_table, p_entity_id, p_context);
$$;
comment on function api.log_system_event(text, text, text, uuid, jsonb) is
  'Called by Edge Functions running as service_role after a notification '
  'send attempt, success or failure. Not for client use -- no person or '
  'staff role ever has execute here, only service_role.';

revoke all on function api.log_system_event(text, text, text, uuid, jsonb)
  from public, anon, authenticated;
grant execute on function api.log_system_event(text, text, text, uuid, jsonb) to service_role;
