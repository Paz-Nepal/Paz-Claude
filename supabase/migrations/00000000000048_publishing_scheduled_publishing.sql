-- 0048_publishing_scheduled_publishing.sql
--
-- T-061: 0008's own header deferred this -- "scheduled publishing (T-061
-- -- needs the job runner decision from T-006)." That decision has since
-- been made in practice, just not written down as resolving T-061 too:
-- send-renewal-notices (0038, ADR-25) and the two backup workflows
-- (ADR-10) all use GitHub Actions cron instead of pg_cron, and the
-- Architecture Blueprint's own publish-scheduled design "already
-- tolerates either." This migration follows the exact same shape as
-- 0038's renewal-notice job: a service-role-only api.* function the
-- Edge Function calls on a schedule, no pg_cron dependency either way.

alter table publishing.items add column scheduled_for timestamptz;

comment on column publishing.items.scheduled_for is
  'Set only while status = ''scheduled''; cleared (by transition_item or '
  'api.publish_scheduled_items) the moment the item leaves that status, '
  'whether by publishing or being sent back to draft.';

-- ---------------------------------------------------------------------
-- publishing.transition_item -- appending a parameter changes the
-- function's argument-type list, which Postgres treats as a distinct
-- overload rather than a same-identity replace (CREATE OR REPLACE only
-- collapses onto an existing function when the argument types match
-- exactly) -- confirmed live: the naive "just add a default parameter"
-- version below left both the old 2-arg and new 3-arg functions defined
-- simultaneously, which broke the very next `comment on function`
-- statement with "function name is not unique", and would have left the
-- new overload with no EXECUTE grant of its own regardless. Dropping the
-- old signature first keeps this a single evolving function, as intended,
-- and the grants below are reapplied explicitly since DROP FUNCTION does
-- not carry grants over to the function created in its place. Adds three
-- legal edges: draft/in_review -> scheduled (requires a future
-- scheduled_for), scheduled -> draft (cancel), scheduled -> published
-- (manual "publish now"; the automated job uses a separate function
-- below, not this one, since transition_item requires a signed-in human
-- actor).
-- ---------------------------------------------------------------------
drop function if exists publishing.transition_item(uuid, publishing.item_status);

create function publishing.transition_item(
  p_item uuid,
  p_to publishing.item_status,
  p_scheduled_for timestamptz default null
)
returns publishing.items
language plpgsql
security definer
set search_path = publishing, authz, admin, public, pg_temp
as $$
declare
  v_item publishing.items;
  v_actor uuid;
  v_from publishing.item_status;
begin
  v_actor := authz.current_person_id();
  if v_actor is null then
    raise exception 'Not signed in';
  end if;

  select * into v_item from publishing.items where id = p_item for update;
  if not found then
    raise exception 'Item % does not exist', p_item;
  end if;
  v_from := v_item.status;

  -- Legal edges, each with its own permission (Blueprint §4.2; pgTAP
  -- covers every legal and illegal edge in tests/publishing/07_transition_matrix.sql).
  if v_from = 'draft' and p_to = 'in_review' then
    if not (
      (v_item.author = v_actor and authz.has_staff_permission('publishing.item.create'))
      or authz.has_staff_permission('publishing.item.update')
    ) then
      raise exception 'Not permitted to submit this item for review';
    end if;
  elsif v_from = 'in_review' and p_to = 'draft' then
    if not authz.has_staff_permission('publishing.item.update') then
      raise exception 'Not permitted to send this item back to draft';
    end if;
  elsif v_from in ('draft', 'in_review') and p_to = 'published' then
    if not authz.has_staff_permission('publishing.item.publish') then
      raise exception 'Not permitted to publish';
    end if;
  -- The database doesn't distinguish deposit-series types (Paper/Brief/
  -- Dispatch/Pigeon Post/Annual) here -- that's a UI-level guard only
  -- (transition-buttons.tsx), since api.publish_scheduled_items()
  -- publishes a scheduled item without going through
  -- publishing.deposit_item()'s deposit_ref/Record-entry side effects.
  -- See ADR-31 "Still open".
  elsif v_from in ('draft', 'in_review') and p_to = 'scheduled' then
    if not authz.has_staff_permission('publishing.item.publish') then
      raise exception 'Not permitted to schedule this item';
    end if;
    if p_scheduled_for is null or p_scheduled_for <= now() then
      raise exception 'scheduled_for must be a time in the future';
    end if;
  elsif v_from = 'scheduled' and p_to = 'draft' then
    if not authz.has_staff_permission('publishing.item.update') then
      raise exception 'Not permitted to unschedule this item';
    end if;
  elsif v_from = 'scheduled' and p_to = 'published' then
    if not authz.has_staff_permission('publishing.item.publish') then
      raise exception 'Not permitted to publish';
    end if;
  elsif v_from = 'published' and p_to = 'archived' then
    if not authz.has_staff_permission('publishing.item.archive') then
      raise exception 'Not permitted to archive';
    end if;
  elsif v_from = 'archived' and p_to = 'published' then
    if not authz.has_staff_permission('publishing.item.publish') then
      raise exception 'Not permitted to restore to published';
    end if;
  else
    raise exception 'Illegal transition: % -> %', v_from, p_to;
  end if;

  perform set_config('paz.allow_transition', 'on', true);
  update publishing.items
  set
    status = p_to,
    published_at = case
      when p_to = 'published' and published_at is null then now()
      else published_at
    end,
    archived_at = case when p_to = 'archived' then now() else null end,
    scheduled_for = case when p_to = 'scheduled' then p_scheduled_for else null end
  where id = p_item
  returning * into v_item;
  perform set_config('paz.allow_transition', '', true);

  insert into publishing.item_revisions
    (item_id, revision_no, kind, title, body, body_schema_version, created_by)
  values (
    v_item.id,
    coalesce(
      (select max(revision_no) from publishing.item_revisions r where r.item_id = v_item.id),
      0
    ) + 1,
    'transition',
    v_item.title,
    v_item.body,
    v_item.body_schema_version,
    v_actor
  );

  insert into admin.audit_log
    (actor, action, entity_schema, entity_table, entity_id, before, after)
  values (
    v_actor,
    'publishing.item.transition',
    'publishing', 'items', p_item,
    jsonb_build_object('status', v_from),
    jsonb_build_object('status', p_to)
  );

  return v_item;
end;
$$;
comment on function publishing.transition_item(uuid, publishing.item_status, timestamptz) is
  'THE way item status changes. Row-locks the target, checks the permission '
  'for the specific edge, snapshots a transition revision, writes audit. '
  'security definer + self-checked permissions; direct status updates are '
  'blocked by trigger. Requires a signed-in human actor -- the automated '
  'scheduled-publish job uses api.publish_scheduled_items() instead, not '
  'this function, since it has no human caller to attribute the change to.';

revoke all on function publishing.transition_item(uuid, publishing.item_status, timestamptz)
  from public, anon;
grant execute on function publishing.transition_item(uuid, publishing.item_status, timestamptz)
  to authenticated;

-- api.transition_item (0008) is a thin security-invoker wrapper. Same
-- drop-then-create reasoning as publishing.transition_item above -- the
-- 2-arg original and this 3-arg version are two different overloads, not
-- one function, if the old one isn't dropped first.
drop function if exists api.transition_item(uuid, publishing.item_status);

create function api.transition_item(
  p_id uuid,
  p_to publishing.item_status,
  p_scheduled_for timestamptz default null
)
returns publishing.item_status
language sql
volatile
security invoker
set search_path = publishing, pg_temp
as $$
  select (publishing.transition_item(p_id, p_to, p_scheduled_for)).status;
$$;

revoke all on function api.transition_item(uuid, publishing.item_status, timestamptz)
  from public, anon;
grant execute on function api.transition_item(uuid, publishing.item_status, timestamptz)
  to authenticated;

-- ---------------------------------------------------------------------
-- api.publish_scheduled_items -- the automated job. service_role only,
-- same layering as api.terms_due_for_renewal_notice/mark_renewal_notice_sent
-- (0040): no human actor, so item_revisions.created_by and
-- admin.audit_log.actor are left null (both nullable) rather than
-- attributed to nobody in particular.
-- ---------------------------------------------------------------------
create function api.publish_scheduled_items()
returns table (item_id uuid, slug text, title text)
language plpgsql
security definer
set search_path = publishing, admin, pg_temp
as $$
declare
  v_item record;
begin
  for v_item in
    select i.id, i.slug, i.title, i.body, i.body_schema_version
    from publishing.items i
    where i.status = 'scheduled' and i.scheduled_for <= now()
    order by i.scheduled_for
    for update of i
  loop
    perform set_config('paz.allow_transition', 'on', true);
    update publishing.items
    set status = 'published',
        published_at = coalesce(published_at, now()),
        scheduled_for = null
    where id = v_item.id;
    perform set_config('paz.allow_transition', '', true);

    insert into publishing.item_revisions
      (item_id, revision_no, kind, title, body, body_schema_version, created_by)
    values (
      v_item.id,
      coalesce(
        (select max(revision_no) from publishing.item_revisions r where r.item_id = v_item.id),
        0
      ) + 1,
      'transition',
      v_item.title,
      v_item.body,
      v_item.body_schema_version,
      null
    );

    insert into admin.audit_log
      (actor, action, entity_schema, entity_table, entity_id, before, after, context)
    values (
      null,
      'publishing.item.transition',
      'publishing', 'items', v_item.id,
      jsonb_build_object('status', 'scheduled'),
      jsonb_build_object('status', 'published'),
      jsonb_build_object('source', 'publish-scheduled-job')
    );

    item_id := v_item.id;
    slug := v_item.slug;
    title := v_item.title;
    return next;
  end loop;
end;
$$;

comment on function api.publish_scheduled_items() is
  'Called by the publish-scheduled Edge Function on a GitHub Actions '
  'cron schedule (T-061). Returns the items it actually published, for '
  'the caller to log -- an empty result is the normal case most runs.';

revoke all on function api.publish_scheduled_items from public, anon, authenticated;
grant execute on function api.publish_scheduled_items to service_role;

-- api.desk_items -- append scheduled_for so the desk board can show
-- when a scheduled item will actually publish. CREATE OR REPLACE VIEW
-- only allows appending columns at the end, same restriction as
-- functions -- scheduled_for goes last, not alongside the related
-- published_at/archived_at columns above it.
create or replace view api.desk_items
with (security_invoker = true)
as
select
  i.id,
  i.type,
  i.status,
  i.slug,
  i.title,
  identity.display_name(i.author) as author_name,
  i.author,
  i.updated_at,
  i.published_at,
  i.scheduled_for
from publishing.items i;
