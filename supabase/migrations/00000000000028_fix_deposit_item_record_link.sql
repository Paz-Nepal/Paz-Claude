-- 0028_fix_deposit_item_record_link.sql
--
-- Live bug found by clicking through the Record index in the browser
-- (Task 19): publishing.deposit_item() (0025) built the Record entry's
-- link as '/' || type || '/' || slug, using the raw publishing.item_type
-- enum value as the URL segment. That's wrong for two of the six series --
-- 'paper' routes at the plural /papers/:slug, and 'pigeon_post' routes at
-- the hyphenated /pigeon-post/:slug (spec §3) -- so their Record entries
-- linked to routes that don't exist. brief/dispatch/annual happen to match
-- their enum value already.

create or replace function publishing.deposit_item(p_item uuid)
returns publishing.items
language plpgsql
security definer
set search_path = publishing, authz, admin, pg_temp
as $$
declare
  v_item publishing.items;
  v_ref text;
  v_deposit_number text;
  v_path_segment text;
begin
  select * into v_item from publishing.items where id = p_item for update;
  if not found then
    raise exception 'Item % does not exist', p_item;
  end if;

  v_ref := publishing.next_deposit_ref();
  v_deposit_number := v_ref;

  update publishing.items set deposit_ref = v_ref where id = p_item;

  v_item := publishing.transition_item(p_item, 'published');

  v_path_segment := case v_item.type
    when 'paper' then 'papers'
    when 'pigeon_post' then 'pigeon-post'
    else v_item.type::text
  end;

  insert into publishing.record_entries
    (deposit_number, item_id, entry_type, title, provenance, link)
  values (
    v_deposit_number,
    v_item.id,
    v_item.type,
    v_item.title,
    'Kept by the house · Deposited in the Record',
    '/' || v_path_segment || '/' || v_item.slug
  );

  return v_item;
end;
$$;
comment on function publishing.deposit_item(uuid) is
  'The only way an item becomes deposited: assigns the permanent '
  'deposit_ref, publishes it via the existing state machine, and writes '
  'its Record entry, all in one transaction. publishing.transition_item '
  'already enforces the publish permission for the caller.';

revoke all on function publishing.deposit_item(uuid) from public, anon;
grant execute on function publishing.deposit_item(uuid) to authenticated;
