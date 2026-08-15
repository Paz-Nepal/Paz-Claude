-- T-048/autosave coalescing. 0008's own item_revisions comment named this
-- exact gap: "Autosave coalescing (kind = 'autosave', Build Readiness
-- Review §3.5) arrives with the autosave feature itself; today every
-- save is 'manual'." ADR-35 deferred it as "not safely verifiable
-- without a live database to test against" (this migration is the first
-- change to publishing.capture_revision() since it was written) --
-- verified live against the linked project below before this was
-- committed.
--
-- The problem: api.save_item's existing write path, used unchanged by
-- the "Save" button, always inserts a fresh 'manual' revision on any
-- content change (already correct -- a manual save is a deliberate
-- checkpoint). But if the *same* write path is used for a debounced
-- autosave firing every few seconds while someone types, every tick
-- would insert its own revision, flooding the history the version
-- history panel shows with near-duplicate autosave noise between real
-- checkpoints.
--
-- The fix is two pieces:
--  1. A separate write path (publishing.autosave_item / api.autosave_item)
--     that only a debounced autosave call should ever use -- the "Save"
--     button keeps calling api.save_item exactly as before, untouched.
--  2. publishing.capture_revision() distinguishes the two via a
--     transaction-local flag (same paz.allow_transition pattern
--     block_direct_status_change already uses): an autosave write
--     updates the most recent revision in place, rather than inserting a
--     new one, as long as that revision is itself an 'autosave' from the
--     same actor within the last 10 minutes. A manual save (no flag set)
--     is completely unaffected -- same insert-a-new-revision behavior as
--     before this migration, byte for byte.

alter table publishing.item_revisions drop constraint item_revisions_kind_check;
alter table publishing.item_revisions
  add constraint item_revisions_kind_check check (kind in ('manual', 'transition', 'autosave'));

create or replace function publishing.capture_revision()
returns trigger
language plpgsql
security definer
set search_path = publishing, authz, pg_temp
as $$
declare
  v_latest publishing.item_revisions;
  v_actor uuid;
begin
  if tg_op = 'UPDATE'
     and new.title = old.title
     and new.body = old.body
     and new.body_schema_version = old.body_schema_version then
    return new; -- metadata-only change (status, slug, summary): no snapshot
  end if;

  v_actor := authz.current_person_id();

  if coalesce(current_setting('paz.autosave_write', true), '') = 'on' then
    select * into v_latest
    from publishing.item_revisions
    where item_id = new.id
    order by revision_no desc
    limit 1;

    -- Only coalesce into a revision that is itself an autosave, from the
    -- same person, recent enough to plausibly be the same editing
    -- session -- otherwise this insert a fresh one, same as a manual
    -- save would.
    if v_latest.id is not null
       and v_latest.kind = 'autosave'
       and v_latest.created_by is not distinct from v_actor
       and v_latest.created_at > now() - interval '10 minutes' then
      update publishing.item_revisions
      set title = new.title, body = new.body, body_schema_version = new.body_schema_version
      where id = v_latest.id;
      return new;
    end if;

    insert into publishing.item_revisions
      (item_id, revision_no, kind, title, body, body_schema_version, created_by)
    values (
      new.id,
      coalesce(
        (select max(revision_no) from publishing.item_revisions r where r.item_id = new.id),
        0
      ) + 1,
      'autosave',
      new.title,
      new.body,
      new.body_schema_version,
      v_actor
    );
    return new;
  end if;

  insert into publishing.item_revisions
    (item_id, revision_no, kind, title, body, body_schema_version, created_by)
  values (
    new.id,
    coalesce(
      (select max(revision_no) from publishing.item_revisions r where r.item_id = new.id),
      0
    ) + 1,
    'manual',
    new.title,
    new.body,
    new.body_schema_version,
    v_actor
  );
  return new;
end;
$$;

-- publishing.autosave_item -- security invoker, same RLS
-- (items_update_own_draft / items_update_staff, 0008) as api.save_item
-- authorizes the write; no permission logic duplicated here. Scoped to
-- title/title_ne/body/body_ne only -- the fields someone is actually
-- typing into continuously. slug/type/featured_media are structural and
-- shouldn't silently change from an autosave tick; subtitle/summary are
-- typically filled in once, not retyped, so they stay Save-button-only.
create function publishing.autosave_item(
  p_id uuid,
  p_title text,
  p_title_ne text,
  p_body jsonb,
  p_body_ne jsonb
)
returns void
language plpgsql
security invoker
set search_path = publishing, pg_temp
as $$
begin
  perform set_config('paz.autosave_write', 'on', true);
  update publishing.items
  set title = p_title, title_ne = p_title_ne, body = p_body, body_ne = p_body_ne
  where id = p_id;
  if not found then
    perform set_config('paz.autosave_write', '', true);
    raise exception 'Item not found or not editable by you' using errcode = '42501';
  end if;
  perform set_config('paz.autosave_write', '', true);
end;
$$;

revoke all on function publishing.autosave_item(uuid, text, text, jsonb, jsonb) from public, anon;
grant execute on function publishing.autosave_item(uuid, text, text, jsonb, jsonb) to authenticated;

create function api.autosave_item(
  p_id uuid,
  p_title text,
  p_title_ne text,
  p_body jsonb,
  p_body_ne jsonb
)
returns void
language sql
volatile
security invoker
set search_path = publishing, pg_temp
as $$
  select publishing.autosave_item(p_id, p_title, p_title_ne, p_body, p_body_ne);
$$;

revoke all on function api.autosave_item from public, anon;
grant execute on function api.autosave_item to authenticated;
