-- 0063's api.item_comments returned the raw publishing.item_comments
-- composite (author as a bare uuid) -- api.item_revisions (0046) already
-- established the pattern of joining identity.display_name for exactly
-- this reason (a comment list showing a uuid isn't useful UI). Matches
-- that shape. RETURNS TABLE can't change shape via CREATE OR REPLACE
-- (unlike a view), so this drops and recreates rather than replacing in
-- place -- same reasoning as 0049's item_revisions fix.

drop function api.item_comments(uuid);

create function api.item_comments(p_item uuid)
returns table (
  id uuid,
  block_index int,
  anchor_text text,
  body text,
  author_name text,
  resolved_at timestamptz,
  resolved_by_name text,
  created_at timestamptz
)
language sql
stable
security invoker
set search_path = publishing, identity, pg_temp
as $$
  select
    c.id, c.block_index, c.anchor_text, c.body,
    identity.display_name(c.author),
    c.resolved_at,
    identity.display_name(c.resolved_by),
    c.created_at
  from publishing.item_comments c
  where c.item_id = p_item
  order by c.created_at;
$$;

revoke all on function api.item_comments from public, anon;
grant execute on function api.item_comments to authenticated;
