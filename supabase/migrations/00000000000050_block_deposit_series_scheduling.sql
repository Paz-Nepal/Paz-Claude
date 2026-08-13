-- 0050_block_deposit_series_scheduling.sql
--
-- Closes the gap ADR-31 "Still open" and 0049's own code comment both
-- flagged: publishing.transition_item let any item type, including the
-- five deposit series (Paper/Brief/Dispatch/Pigeon Post/Annual), move to
-- 'scheduled'. That was only ever blocked in the UI
-- (transition-buttons.tsx) -- a caller using the API directly could
-- schedule a deposit-series item, and api.publish_scheduled_items()
-- would later set it straight to 'published' without ever going through
-- publishing.deposit_item(), leaving it published with no deposit_ref
-- and no Record entry. Of the two fixes the ADR named, this is the safer
-- one: block the edge outright rather than teach the automated job to
-- fabricate a deposit with no human actor. A deposit-series item still
-- reaches 'published' immediately via deposit_item() -> transition_item()
-- exactly as before; only the *scheduled* path is now closed to it.
--
-- Body is otherwise byte-identical to 0049's version -- only the
-- draft/in_review -> scheduled branch gained the new type check.

drop function if exists publishing.transition_item(uuid, publishing.item_status, timestamptz, text);

create function publishing.transition_item(
  p_item uuid,
  p_to publishing.item_status,
  p_scheduled_for timestamptz default null,
  p_notes text default null
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
  elsif v_from in ('draft', 'in_review') and p_to = 'scheduled' then
    if v_item.type in ('paper', 'brief', 'dispatch', 'pigeon_post', 'annual') then
      raise exception
        'Deposit-series items (%) publish immediately through the Record, they cannot be scheduled. Use publishing.deposit_item instead.',
        v_item.type;
    end if;
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
    (item_id, revision_no, kind, title, body, body_schema_version, created_by, notes)
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
    v_actor,
    p_notes
  );

  insert into admin.audit_log
    (actor, action, entity_schema, entity_table, entity_id, before, after, context)
  values (
    v_actor,
    'publishing.item.transition',
    'publishing', 'items', p_item,
    jsonb_build_object('status', v_from),
    jsonb_build_object('status', p_to),
    case when p_notes is not null then jsonb_build_object('notes', p_notes) else null end
  );

  return v_item;
end;
$$;
comment on function publishing.transition_item(
  uuid, publishing.item_status, timestamptz, text
) is
  'THE way item status changes. Row-locks the target, checks the permission '
  'for the specific edge, snapshots a transition revision (optionally with '
  'a note, T-059), writes audit. security definer + self-checked '
  'permissions; direct status updates are blocked by trigger. Requires a '
  'signed-in human actor -- the automated scheduled-publish job uses '
  'api.publish_scheduled_items() instead, not this function, since it has '
  'no human caller to attribute the change to. Deposit-series items '
  '(paper/brief/dispatch/pigeon_post/annual, 0050) cannot enter '
  '''scheduled'' at all -- they publish immediately through '
  'publishing.deposit_item(), the only path that assigns a deposit_ref '
  'and writes the Record entry.';

revoke all on function publishing.transition_item(uuid, publishing.item_status, timestamptz, text)
  from public, anon;
grant execute on function publishing.transition_item(uuid, publishing.item_status, timestamptz, text)
  to authenticated;

-- api.transition_item -- identical signature to 0049's, so this really is
-- an in-place replace, not a new overload (unlike the arity-changing
-- create-or-replace mistakes 0048/0049 made and fixed).
create or replace function api.transition_item(
  p_id uuid,
  p_to publishing.item_status,
  p_scheduled_for timestamptz default null,
  p_notes text default null
)
returns publishing.item_status
language sql
volatile
security invoker
set search_path = publishing, pg_temp
as $$
  select (publishing.transition_item(p_id, p_to, p_scheduled_for, p_notes)).status;
$$;
