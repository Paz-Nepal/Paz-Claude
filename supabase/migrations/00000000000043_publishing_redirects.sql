-- 0043_publishing_redirects.sql
--
-- T-049: 0008's own header deferred this "until the prerender pipeline"
-- — but a slug-change redirect doesn't actually depend on prerendering
-- existing first; that dependency was assumed, not structural. Old
-- links (search engines, external references, printed material) should
-- keep resolving the moment an editor renames a slug, independent of
-- whether the site is also prerendered.

create table publishing.redirects (
  id          uuid primary key default gen_random_uuid(),
  item_id     uuid not null references publishing.items (id) on delete cascade,
  item_type   publishing.item_type not null,
  old_slug    text not null,
  created_at  timestamptz not null default now(),

  unique (item_type, old_slug)
);

comment on table publishing.redirects is
  'Recorded automatically by items_slug_redirect below whenever a '
  'published item''s slug changes -- never written to directly. The '
  'lookup (api.resolve_redirect) always joins back to the item''s '
  'current slug, so a chain of renames (A -> B -> C) resolves in one '
  'hop from any old value without needing to update older rows -- the '
  'only time a row is ever updated is a genuine slug collision (a '
  'different item later reusing an old, now-free slug).';

alter table publishing.redirects enable row level security;
grant select on publishing.redirects to anon, authenticated;

-- Public read: resolving a redirect has to work for an anonymous
-- visitor following an old link. The table only ever holds a slug
-- history, not anything sensitive.
create policy redirects_select_all on publishing.redirects
  for select to anon, authenticated
  using (true);

create function publishing.record_slug_redirect()
returns trigger
language plpgsql
as $$
begin
  insert into publishing.redirects (item_id, item_type, old_slug)
  values (old.id, old.type, old.slug)
  on conflict (item_type, old_slug)
    do update set item_id = excluded.item_id, created_at = now();
  return new;
end;
$$;

comment on function publishing.record_slug_redirect() is
  'on conflict: a later item reusing an old, now-free slug as its own '
  '*previous* slug should make that old value resolve to the newer '
  'item -- "most recent rename wins" for an otherwise-ambiguous slug.';

create trigger items_slug_redirect
  after update on publishing.items
  for each row
  when (old.slug is distinct from new.slug)
  execute function publishing.record_slug_redirect();

-- ---------------------------------------------------------------------
-- api.resolve_redirect -- the one lookup the frontend needs: "does this
-- old (type, slug) now live somewhere else?"
-- ---------------------------------------------------------------------
create function api.resolve_redirect(p_type publishing.item_type, p_old_slug text)
returns text
language sql
stable
security invoker
set search_path = publishing, pg_temp
as $$
  select i.slug
  from publishing.redirects r
  join publishing.items i on i.id = r.item_id
  where r.item_type = p_type and r.old_slug = p_old_slug and i.status = 'published';
$$;

comment on function api.resolve_redirect(publishing.item_type, text) is
  'Returns the item''s current slug if p_old_slug used to point at it '
  'and it''s still published, else null -- the frontend''s not-found '
  'pages call this once before actually giving up and showing "nothing '
  'at this address."';

grant execute on function api.resolve_redirect to anon, authenticated;
