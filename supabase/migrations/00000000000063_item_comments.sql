-- T-059 (the half ADR-35 left open): inline comments anchored to a
-- position in the document. Full ProseMirror decoration/cursor-position
-- anchoring (tracking an exact character offset through concurrent
-- edits) is genuinely a much larger piece of work -- a real OT/CRDT
-- concern. This is the lighter, still-real version: anchored to a
-- top-level block (paragraph/heading/list item/etc, the same
-- granularity revision-diff.ts's flattenBlocks already uses for the
-- version-history structural diff), with a text snapshot recorded
-- alongside the block index so a comment survives blocks being
-- inserted/removed/reordered elsewhere in the document -- the frontend
-- re-locates it by matching text if the index has drifted, rather than
-- silently pointing at the wrong paragraph. A comment whose anchor text
-- no longer appears anywhere in the document at all is never deleted --
-- it's shown as unanchored, still visible, never silently lost.

create table publishing.item_comments (
  id           uuid primary key default gen_random_uuid(),
  item_id      uuid not null references publishing.items (id) on delete cascade,
  author       uuid not null references identity.people (id) on delete restrict,
  block_index  int not null,
  anchor_text  text not null,
  body         text not null check (length(trim(body)) > 0),
  resolved_at  timestamptz,
  resolved_by  uuid references identity.people (id) on delete restrict,
  created_at   timestamptz not null default now(),

  constraint item_comments_resolved_together
    check ((resolved_at is null) = (resolved_by is null))
);

create index item_comments_item_idx on publishing.item_comments (item_id, created_at);

comment on table publishing.item_comments is
  'T-059: review feedback anchored to a block in an item''s body, not a '
  'freestanding note. block_index/anchor_text together let the frontend '
  're-locate the right block even after other edits shift indices -- see '
  'this migration''s header for the full reasoning.';

alter table publishing.item_comments enable row level security;
grant select, insert on publishing.item_comments to authenticated;
-- No update/delete grant: resolving is its own function
-- (publishing.resolve_item_comment), not a direct UPDATE -- a comment's
-- own text is never edited or deleted once posted, matching how
-- item_revisions is append-only for the same reason (a real record of
-- what was actually said during review).

create policy item_comments_select_own on publishing.item_comments
  for select
  to authenticated
  using (
    exists (
      select 1 from publishing.items i
      where i.id = item_id
        and i.author = (select authz.current_person_id())
    )
    and (select authz.has_staff_permission('publishing.item.create'))
  );

create policy item_comments_select_staff on publishing.item_comments
  for select
  to authenticated
  using ((select authz.has_staff_permission('publishing.item.read')));

-- Posting a comment requires the same access as *reading* the item for
-- review (item.update, the permission that gates sending an item back /
-- managing the review) OR being the item's own author responding to
-- feedback on their own draft.
create policy item_comments_insert on publishing.item_comments
  for insert
  to authenticated
  with check (
    author = (select authz.current_person_id())
    and (
      (select authz.has_staff_permission('publishing.item.update'))
      or exists (
        select 1 from publishing.items i
        where i.id = item_id
          and i.author = (select authz.current_person_id())
          and (select authz.has_staff_permission('publishing.item.create'))
      )
    )
  );

create trigger item_comments_audit
  after insert on publishing.item_comments
  for each row execute function public.audit_row_change('publishing.item_comment.created');

-- ---------------------------------------------------------------------
-- publishing.add_item_comment / resolve_item_comment
-- ---------------------------------------------------------------------
create function publishing.add_item_comment(
  p_item uuid,
  p_block_index int,
  p_anchor_text text,
  p_body text
)
returns publishing.item_comments
language sql
volatile
security invoker
set search_path = publishing, authz, pg_temp
as $$
  insert into publishing.item_comments (item_id, author, block_index, anchor_text, body)
  values (p_item, (select authz.current_person_id()), p_block_index, p_anchor_text, p_body)
  returning *;
$$;

revoke all on function publishing.add_item_comment(uuid, int, text, text) from public, anon;
grant execute on function publishing.add_item_comment(uuid, int, text, text) to authenticated;

-- security definer: resolving is a status flip an editor/reviewer or the
-- comment's own author should be able to do without needing a direct
-- UPDATE grant on the table (kept append-only-by-default above).
create function publishing.resolve_item_comment(p_comment uuid)
returns publishing.item_comments
language plpgsql
security definer
set search_path = publishing, authz, pg_temp
as $$
declare
  v_comment publishing.item_comments;
  v_actor uuid := authz.current_person_id();
begin
  if v_actor is null then
    raise exception 'Not signed in';
  end if;

  select c.* into v_comment
  from publishing.item_comments c
  join publishing.items i on i.id = c.item_id
  where c.id = p_comment
    and (
      c.author = v_actor
      or authz.has_staff_permission('publishing.item.update')
    )
  for update of c;

  if not found then
    raise exception 'Comment % does not exist or you cannot resolve it', p_comment;
  end if;

  update publishing.item_comments
  set resolved_at = now(), resolved_by = v_actor
  where id = p_comment
  returning * into v_comment;

  return v_comment;
end;
$$;

revoke all on function publishing.resolve_item_comment(uuid) from public, anon;
grant execute on function publishing.resolve_item_comment(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- api surface
-- ---------------------------------------------------------------------
create function api.item_comments(p_item uuid)
returns setof publishing.item_comments
language sql
stable
security invoker
set search_path = publishing, pg_temp
as $$
  select * from publishing.item_comments where item_id = p_item order by created_at;
$$;

revoke all on function api.item_comments from public, anon;
grant execute on function api.item_comments to authenticated;

create function api.add_item_comment(
  p_item uuid,
  p_block_index int,
  p_anchor_text text,
  p_body text
)
returns publishing.item_comments
language sql
volatile
security invoker
set search_path = publishing, pg_temp
as $$
  select publishing.add_item_comment(p_item, p_block_index, p_anchor_text, p_body);
$$;

revoke all on function api.add_item_comment from public, anon;
grant execute on function api.add_item_comment to authenticated;

create function api.resolve_item_comment(p_comment uuid)
returns publishing.item_comments
language sql
volatile
security invoker
set search_path = publishing, pg_temp
as $$
  select publishing.resolve_item_comment(p_comment);
$$;

revoke all on function api.resolve_item_comment from public, anon;
grant execute on function api.resolve_item_comment to authenticated;
