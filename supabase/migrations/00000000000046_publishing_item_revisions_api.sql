-- 0046_publishing_item_revisions_api.sql
--
-- T-060: publishing.item_revisions has existed since 0008 (every content
-- change already writes a row via publishing.capture_revision) with zero
-- API surface — this is the first migration to expose it.

create function api.item_revisions(p_item uuid)
returns table (
  id uuid,
  revision_no int,
  kind text,
  title text,
  created_by_name text,
  created_at timestamptz
)
language sql
stable
security invoker
set search_path = publishing, identity, pg_temp
as $$
  select r.id, r.revision_no, r.kind, r.title,
    identity.display_name(r.created_by), r.created_at
  from publishing.item_revisions r
  where r.item_id = p_item
  order by r.revision_no desc;
$$;

comment on function api.item_revisions(uuid) is
  'The revision list -- title/kind/author/date only, not the body, so '
  'the list itself stays cheap to load for items with a long history. '
  'security invoker: item_revisions_select_own/_staff (0008) already '
  'gate this exactly the same way they''d gate a direct query.';

revoke all on function api.item_revisions(uuid) from public, anon;
grant execute on function api.item_revisions(uuid) to authenticated;

create function api.get_item_revision(p_id uuid)
returns table (
  id uuid,
  item_id uuid,
  revision_no int,
  kind text,
  title text,
  body jsonb,
  body_schema_version int,
  created_by_name text,
  created_at timestamptz
)
language sql
stable
security invoker
set search_path = publishing, identity, pg_temp
as $$
  select r.id, r.item_id, r.revision_no, r.kind, r.title,
    r.body, r.body_schema_version, identity.display_name(r.created_by), r.created_at
  from publishing.item_revisions r
  where r.id = p_id;
$$;

comment on function api.get_item_revision(uuid) is
  'One full revision, body included -- for previewing a past version '
  'before restoring it. Separate from api.item_revisions (the list) so '
  'loading the list never pulls every past body along with it.';

revoke all on function api.get_item_revision(uuid) from public, anon;
grant execute on function api.get_item_revision(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- api.restore_item_revision -- "restore as new": copies a past
-- revision's content onto the item's current row via a plain UPDATE, so
-- publishing.capture_revision's own trigger snapshots it as a fresh
-- revision the normal way. No separate insert-into-item_revisions logic
-- here -- the existing trigger is the one and only writer of that table
-- (0008's own comment), and this function doesn't need to duplicate it.
-- security invoker: both the read (item_revisions RLS) and the write
-- (items_update_own_draft / items_update_staff RLS) are already exactly
-- the checks that should gate this -- restoring a revision is not a
-- different privilege than editing the item normally.
-- ---------------------------------------------------------------------
create function api.restore_item_revision(p_revision uuid)
returns void
language plpgsql
security invoker
set search_path = publishing, pg_temp
as $$
declare
  v_item_id uuid;
  v_title text;
  v_body jsonb;
  v_body_schema_version int;
begin
  select item_id, title, body, body_schema_version
  into v_item_id, v_title, v_body, v_body_schema_version
  from publishing.item_revisions
  where id = p_revision;

  if not found then
    raise exception 'Revision not found' using errcode = '42501';
  end if;

  update publishing.items
  set title = v_title, body = v_body, body_schema_version = v_body_schema_version
  where id = v_item_id;
end;
$$;

revoke all on function api.restore_item_revision(uuid) from public, anon;
grant execute on function api.restore_item_revision(uuid) to authenticated;
