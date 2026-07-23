-- 0036_publishing_redirects.sql
--
-- Work plan Part II, #7: "Published URLs are permanent" was already the
-- stated rule (Architecture Blueprint §4.2: "slug changes after publication
-- create a redirect row ... An institution's archive earns trust by never
-- 404ing") but nothing enforced it -- the router's catch-all silently sent a
-- broken permalink to the homepage, which a crawler or archive reads as a
-- soft-404 and a person following a ten-year-old citation reads as nothing
-- at all. This closes the gap at the source: an AFTER UPDATE trigger on
-- publishing.items writes the redirect automatically the moment a
-- published item's slug (or type) changes, so staff cannot forget to record
-- one by hand.

create table publishing.redirects (
  old_path text primary key,
  new_path text not null,
  created_at timestamptz not null default now()
);

comment on table publishing.redirects is
  'Permanent-URL guarantee (Architecture Blueprint §4.2). Populated only by '
  'publishing.record_item_redirect() below -- never written to directly -- '
  'so every row traces back to an actual slug/type change on a published item.';

alter table publishing.redirects enable row level security;

create policy redirects_select_all on publishing.redirects
  for select
  to anon, authenticated
  using (true);

-- No insert/update/delete policy for anyone: writes happen only through the
-- security definer trigger function below, same shape as the deposit model
-- (publishing.deposit_item) and for the same reason -- a fact this
-- institutionally-important should not depend on every future caller
-- remembering to write it correctly.

-- Maps an item's (type, slug) to the public path the frontend router
-- actually serves it at (apps/web/src/app/router.tsx). Keep in sync with
-- that file by hand -- there is no single source of truth shared between
-- Postgres and the router today (a gap worth closing later, not now).
create function publishing.item_public_path(p_type publishing.item_type, p_slug text)
returns text
language sql
immutable
as $$
  select case p_type
    when 'paper' then '/papers/' || p_slug
    when 'brief' then '/brief/' || p_slug
    when 'dispatch' then '/dispatch/' || p_slug
    when 'annual' then '/annual/' || p_slug
    when 'pigeon_post' then '/pigeon-post/' || p_slug
    when 'article' then '/journal/' || p_slug
    else '/' || p_slug -- 'page' and anything else: the generic :slug route
  end;
$$;

create function publishing.record_item_redirect()
returns trigger
language plpgsql
security definer
set search_path = publishing, pg_temp
as $$
begin
  if old.status = 'published' and (old.slug is distinct from new.slug or old.type is distinct from new.type) then
    insert into publishing.redirects (old_path, new_path)
    values (
      publishing.item_public_path(old.type, old.slug),
      publishing.item_public_path(new.type, new.slug)
    )
    on conflict (old_path) do update
      set new_path = excluded.new_path, created_at = now();
  end if;
  return new;
end;
$$;

create trigger record_item_redirect
  after update on publishing.items
  for each row
  execute function publishing.record_item_redirect();

-- ---------------------------------------------------------------------
-- Public read: the router needs this on every unmatched path before it
-- falls through to a real 404.
-- ---------------------------------------------------------------------
create function api.get_redirect(p_path text)
returns text
language sql
stable
security invoker
set search_path = publishing, pg_temp
as $$
  select new_path from publishing.redirects where old_path = p_path;
$$;

grant execute on function api.get_redirect(text) to anon, authenticated;
