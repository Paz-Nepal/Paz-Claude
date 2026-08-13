-- 0049_publishing_transition_notes.sql
--
-- T-059: review flow notes. The task's full scope ("inline comments,
-- decision panel, send-back note") is two different sizes of feature --
-- comments anchored to specific positions in a ProseMirror document is a
-- meaningfully larger, separate piece of work (see ADR-35 "Still open")
-- -- this closes the smaller, well-scoped half: a note attached to a
-- transition itself, most useful on a send-back ("needs a stronger
-- lede") but not restricted to it.

alter table publishing.item_revisions add column notes text;

comment on column publishing.item_revisions.notes is
  'Optional note attached to a transition (T-059) -- e.g. why an item '
  'was sent back to draft. Null for ordinary manual-save revisions, '
  'which have nothing to attach a decision note to.';

-- ---------------------------------------------------------------------
-- publishing.transition_item -- appending p_notes changes the argument
-- type list, so (per 0048's note on the same mistake) the old 3-arg
-- signature has to be dropped explicitly first or this creates a second
-- overload instead of replacing the existing function.
-- ---------------------------------------------------------------------
drop function if exists publishing.transition_item(uuid, publishing.item_status, timestamptz);

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
  'no human caller to attribute the change to.';

revoke all on function publishing.transition_item(uuid, publishing.item_status, timestamptz, text)
  from public, anon;
grant execute on function publishing.transition_item(uuid, publishing.item_status, timestamptz, text)
  to authenticated;

-- api.transition_item -- same drop-then-create reasoning as above: the
-- 3-arg (0048) and this 4-arg version are two different overloads unless
-- the old one is dropped first.
drop function if exists api.transition_item(uuid, publishing.item_status, timestamptz);

create function api.transition_item(
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

revoke all on function api.transition_item(uuid, publishing.item_status, timestamptz, text)
  from public, anon;
grant execute on function api.transition_item(uuid, publishing.item_status, timestamptz, text)
  to authenticated;

-- api.item_revisions -- append notes to the list shape. Confirmed live:
-- unlike a view, a RETURNS TABLE function's row type cannot be changed at
-- all via CREATE OR REPLACE, even by pure column append ("cannot change
-- return type of existing function" -- SQLSTATE 42P13) -- has to be
-- dropped and recreated.
drop function if exists api.item_revisions(uuid);

create function api.item_revisions(p_item uuid)
returns table (
  id uuid,
  revision_no int,
  kind text,
  title text,
  created_by_name text,
  created_at timestamptz,
  notes text
)
language sql
stable
security invoker
set search_path = publishing, identity, pg_temp
as $$
  select r.id, r.revision_no, r.kind, r.title,
    identity.display_name(r.created_by), r.created_at, r.notes
  from publishing.item_revisions r
  where r.item_id = p_item
  order by r.revision_no desc;
$$;

comment on function api.item_revisions(uuid) is
  'The revision list -- title/kind/author/date/note, not the body, so '
  'the list itself stays cheap to load for items with a long history. '
  'security invoker: item_revisions_select_own/_staff (0008) already '
  'gate this exactly the same way they''d gate a direct query.';

revoke all on function api.item_revisions(uuid) from public, anon;
grant execute on function api.item_revisions(uuid) to authenticated;
