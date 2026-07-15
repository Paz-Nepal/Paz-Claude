-- 0006_admin_settings.sql
--
-- Completes the admin domain (audit_log's structure arrived early, in
-- 0002, so identity could log to it from birth -- see the sequencing note
-- there). This migration adds settings and the generic audit trigger that
-- later domains attach to their own sensitive tables.

create table admin.settings (
  key         text primary key,   -- validated against SettingsRegistry in packages/types
  value       jsonb not null,
  description text,
  updated_by  uuid references identity.people (id) on delete restrict,
  updated_at  timestamptz not null default now()
);
comment on table admin.settings is
  'Typed key/value configuration. The key set is not constrained in the '
  'database -- it is validated at the application boundary against '
  '@paz/types SettingsRegistry, so adding a new setting is a one-line type '
  'change plus a migration seeding its default, never a schema migration '
  'for a new column. No secrets: those live in Supabase Vault / env config.';

create trigger settings_set_updated_at
  before update on admin.settings
  for each row execute function public.set_updated_at();

alter table admin.settings enable row level security;

grant select on admin.settings to authenticated;

create policy settings_select_all_staff on admin.settings
  for select
  to authenticated
  using ((select authz.has_staff_permission('admin.settings.read')));

create policy settings_manage_staff on admin.settings
  for all
  to authenticated
  using ((select authz.has_staff_permission('admin.settings.manage')))
  with check ((select authz.has_staff_permission('admin.settings.manage')));

-- ---------------------------------------------------------------------
-- Audit log: now that authz exists, add the Administrator-only read
-- policy (deferred from 0002, which could not express it yet).
-- ---------------------------------------------------------------------
create policy audit_log_select_staff on admin.audit_log
  for select
  to authenticated
  using ((select authz.has_staff_permission('admin.audit_log.read')));

grant select on admin.audit_log to authenticated;
-- No insert/update/delete grant to authenticated: audit rows are written
-- only by security-definer trigger/functions running with the privileges
-- of their owner, never directly by a client role.

-- ---------------------------------------------------------------------
-- public.audit_row_change() -- generic per-table audit trigger
-- ---------------------------------------------------------------------
-- Attach to any sensitive table: `for each row execute function
-- public.audit_row_change('domain.entity.updated')`. Captures only changed
-- columns (not the full row) to keep audit rows small and avoid logging
-- unrelated bulky columns (e.g. a ProseMirror body) on every autosave --
-- see Build Readiness Review §3.5, which explicitly separates this from
-- publishing's own revision history (item_revisions is the full-content
-- history; audit_log is the who/when/what-changed record).
create function public.audit_row_change()
returns trigger
language plpgsql
security definer
set search_path = admin, pg_temp
as $$
declare
  v_actor uuid;
  v_before jsonb;
  v_after jsonb;
  v_changed_before jsonb := '{}'::jsonb;
  v_changed_after jsonb := '{}'::jsonb;
  v_key text;
begin
  v_actor := authz.current_person_id();

  if tg_op = 'UPDATE' then
    v_before := to_jsonb(old);
    v_after := to_jsonb(new);
    for v_key in select jsonb_object_keys(v_after) loop
      if v_before -> v_key is distinct from v_after -> v_key then
        v_changed_before := v_changed_before || jsonb_build_object(v_key, v_before -> v_key);
        v_changed_after := v_changed_after || jsonb_build_object(v_key, v_after -> v_key);
      end if;
    end loop;
    if v_changed_after = '{}'::jsonb then
      return new; -- no actual column changed (e.g. a no-op update); skip logging
    end if;
  elsif tg_op = 'INSERT' then
    v_changed_after := to_jsonb(new);
  elsif tg_op = 'DELETE' then
    v_changed_before := to_jsonb(old);
  end if;

  insert into admin.audit_log (actor, action, entity_schema, entity_table, entity_id, before, after)
  values (
    v_actor,
    coalesce(tg_argv[0], tg_table_schema || '.' || tg_table_name || '.' || lower(tg_op)),
    tg_table_schema,
    tg_table_name,
    coalesce((v_changed_after ->> 'id')::uuid, (v_changed_before ->> 'id')::uuid),
    nullif(v_changed_before, '{}'::jsonb),
    nullif(v_changed_after, '{}'::jsonb)
  );

  return coalesce(new, old);
end;
$$;
comment on function public.audit_row_change() is
  'Generic audit trigger: logs only changed columns. Pass an action name '
  'as the trigger argument, e.g. execute function public.audit_row_change'
  '(''membership.member.status_changed''); falls back to '
  '"<schema>.<table>.<insert|update|delete>" if no argument is given.';
