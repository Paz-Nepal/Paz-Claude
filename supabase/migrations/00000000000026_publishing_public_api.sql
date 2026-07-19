-- 0026_publishing_public_api.sql
--
-- PAZ Website & CMS spec: public read surface for the deposit model added
-- in 0025 -- bilingual fields on the existing views/functions, the public
-- Record index, and one thin get_* function per series (§2: "each
-- publication series is its own type ... do not collapse them into a
-- single generic post type" -- carried through to the api surface so each
-- page component fetches exactly the fields its series needs, nothing
-- generic-and-overloaded).
--
-- Deliberately NOT here: the write-side (deposit_item/discard_draft api
-- wrappers, paper/brief/... details create+update, send-a-pigeon intake).
-- Read-only public surface first; CMS write surface is its own migration
-- once the per-series editors are built (spec §5).

-- ---------------------------------------------------------------------
-- api.published_items -- add bilingual + provenance columns
-- ---------------------------------------------------------------------
-- Pigeon Post's author_name is nulled here, not left to the frontend to
-- hide: Non-negotiable §3/CMS §5 say contributor identity is never stored
-- for this series, and items.author is the *staff* person who entered it,
-- not a contributor -- but nulling it in the one public view removes any
-- doubt rather than trusting every future caller to remember not to render it.
-- create or replace view can't insert columns mid-list (only append at the
-- end) -- drop and recreate instead. api.search_published (0008) returns
-- setof this view, so it goes with it and is recreated right after.
drop view api.published_items cascade;

create view api.published_items
with (security_invoker = true)
as
select
  i.id,
  i.type,
  i.slug,
  i.title,
  i.title_ne,
  i.subtitle,
  i.subtitle_ne,
  i.summary,
  i.summary_ne,
  i.deposit_ref,
  i.published_at,
  case when i.type = 'pigeon_post' then null else identity.display_name(i.author) end
    as author_name,
  m.storage_path as featured_media_path,
  m.alt as featured_media_alt
from publishing.items i
left join publishing.media m on m.id = i.featured_media
where i.status = 'published';

comment on view api.published_items is
  'The public content surface. security_invoker: publishing.items'' own '
  'published-only RLS policy is what authorizes each row. Versioned per '
  'ADR-32: breaking shape changes require api.published_items_v2.';

-- DROP ... CASCADE above does not preserve grants -- reapply.
grant select on api.published_items to anon, authenticated;

-- Also dropped by the cascade; recreated verbatim (0008).
create function api.search_published(q text)
returns setof api.published_items
language sql
stable
security invoker
set search_path = publishing, api, pg_temp
as $$
  select p.* from api.published_items p
  join publishing.items i on i.id = p.id
  where i.search_tsv @@ plainto_tsquery('english', q);
$$;

grant execute on function api.search_published to anon, authenticated;

-- ---------------------------------------------------------------------
-- api.get_published_item -- add bilingual body + deposit_ref
-- ---------------------------------------------------------------------
-- create or replace can't change a RETURNS TABLE shape either.
drop function api.get_published_item(publishing.item_type, text);

create function api.get_published_item(p_type publishing.item_type, p_slug text)
returns table (
  id uuid,
  type publishing.item_type,
  slug text,
  title text,
  title_ne text,
  subtitle text,
  subtitle_ne text,
  summary text,
  summary_ne text,
  body jsonb,
  body_ne jsonb,
  body_schema_version int,
  deposit_ref text,
  published_at timestamptz,
  author_name text,
  featured_media_path text,
  featured_media_alt text,
  tags text[]
)
language sql
stable
security invoker
set search_path = publishing, identity, pg_temp
as $$
  select
    i.id, i.type, i.slug, i.title, i.title_ne, i.subtitle, i.subtitle_ne,
    i.summary, i.summary_ne, i.body, i.body_ne, i.body_schema_version,
    i.deposit_ref, i.published_at,
    case when i.type = 'pigeon_post' then null else identity.display_name(i.author) end,
    m.storage_path, m.alt,
    coalesce(
      (select array_agg(t.name order by t.name)
       from publishing.item_tags it
       join publishing.tags t on t.id = it.tag_id
       where it.item_id = i.id),
      '{}'
    )
  from publishing.items i
  left join publishing.media m on m.id = i.featured_media
  where i.type = p_type and i.slug = p_slug and i.status = 'published';
$$;

grant execute on function api.get_published_item to anon, authenticated;

-- ---------------------------------------------------------------------
-- Per-series detail: one thin function per series, core fields (via
-- get_published_item's shape) plus that series' own detail columns.
-- ---------------------------------------------------------------------
create function api.get_paper(p_slug text)
returns table (
  id uuid, slug text, title text, title_ne text, body jsonb, body_ne jsonb,
  deposit_ref text, published_at timestamptz, tags text[],
  paper_no int, abstract text, pdf_path text, license text, sources_note text
)
language sql
stable
security invoker
set search_path = publishing, pg_temp
as $$
  select
    i.id, i.slug, i.title, i.title_ne, i.body, i.body_ne,
    i.deposit_ref, i.published_at,
    coalesce(
      (select array_agg(t.name order by t.name)
       from publishing.item_tags it join publishing.tags t on t.id = it.tag_id
       where it.item_id = i.id),
      '{}'
    ),
    d.paper_no, d.abstract, pm.storage_path, d.license, d.sources_note
  from publishing.items i
  join publishing.paper_details d on d.item_id = i.id
  left join publishing.media pm on pm.id = d.pdf_media
  where i.type = 'paper' and i.slug = p_slug and i.status = 'published';
$$;
comment on function api.get_paper(text) is
  'No byline field on purpose: the page always renders the fixed string '
  '"A Paz Paper" (spec §2), never author_name. No published_at rendering '
  'either -- Papers are not dated on the page -- but the column stays in '
  'the query for ordering the index list, same as every other series.';

create function api.get_brief(p_slug text)
returns table (
  id uuid, slug text, title text, title_ne text, body jsonb, body_ne jsonb,
  deposit_ref text, tags text[], issue_no int, issue_date date
)
language sql
stable
security invoker
set search_path = publishing, pg_temp
as $$
  select
    i.id, i.slug, i.title, i.title_ne, i.body, i.body_ne, i.deposit_ref,
    coalesce(
      (select array_agg(t.name order by t.name)
       from publishing.item_tags it join publishing.tags t on t.id = it.tag_id
       where it.item_id = i.id),
      '{}'
    ),
    d.issue_no, d.issue_date
  from publishing.items i
  join publishing.brief_details d on d.item_id = i.id
  where i.type = 'brief' and i.slug = p_slug and i.status = 'published';
$$;

create function api.get_dispatch(p_slug text)
returns table (
  id uuid, slug text, title text, title_ne text, body jsonb, body_ne jsonb,
  deposit_ref text, tags text[], issue_no int, issue_date date
)
language sql
stable
security invoker
set search_path = publishing, pg_temp
as $$
  select
    i.id, i.slug, i.title, i.title_ne, i.body, i.body_ne, i.deposit_ref,
    coalesce(
      (select array_agg(t.name order by t.name)
       from publishing.item_tags it join publishing.tags t on t.id = it.tag_id
       where it.item_id = i.id),
      '{}'
    ),
    d.issue_no, d.issue_date
  from publishing.items i
  join publishing.dispatch_details d on d.item_id = i.id
  where i.type = 'dispatch' and i.slug = p_slug and i.status = 'published';
$$;

-- No title/body rendering assumed by the frontend for Pigeon Post -- it is
-- "a quiet index" (spec §3), not a feed -- but the columns are returned
-- for the (optional) short caption editors may enter, same fields either way.
create function api.get_pigeon_post(p_slug text)
returns table (
  id uuid, slug text, title text, title_ne text, deposit_ref text,
  edition_no text, pdf_path text
)
language sql
stable
security invoker
set search_path = publishing, pg_temp
as $$
  select
    i.id, i.slug, i.title, i.title_ne, i.deposit_ref,
    d.edition_no, pm.storage_path
  from publishing.items i
  join publishing.pigeon_post_details d on d.item_id = i.id
  left join publishing.media pm on pm.id = d.pdf_media
  where i.type = 'pigeon_post' and i.slug = p_slug and i.status = 'published';
$$;
comment on function api.get_pigeon_post(text) is
  'No author/contributor field anywhere in this query -- pigeon_post_details '
  'has none to select (spec §2/§5).';

create function api.get_annual(p_slug text)
returns table (
  id uuid, slug text, title text, title_ne text, deposit_ref text,
  year int, contents text, pdf_path text
)
language sql
stable
security invoker
set search_path = publishing, pg_temp
as $$
  select
    i.id, i.slug, i.title, i.title_ne, i.deposit_ref,
    d.year, d.contents, pm.storage_path
  from publishing.items i
  join publishing.annual_details d on d.item_id = i.id
  left join publishing.media pm on pm.id = d.pdf_media
  where i.type = 'annual' and i.slug = p_slug and i.status = 'published';
$$;

create function api.get_event(p_slug text)
returns table (
  id uuid, slug text, title text, title_ne text, body jsonb, body_ne jsonb,
  event_date timestamptz, location text
)
language sql
stable
security invoker
set search_path = publishing, pg_temp
as $$
  select
    i.id, i.slug, i.title, i.title_ne, i.body, i.body_ne,
    d.event_date, d.location
  from publishing.items i
  join publishing.event_details d on d.item_id = i.id
  where i.type = 'event' and i.slug = p_slug and i.status = 'published';
$$;

grant execute on function
  api.get_paper(text), api.get_brief(text), api.get_dispatch(text),
  api.get_pigeon_post(text), api.get_annual(text), api.get_event(text)
  to anon, authenticated;

-- ---------------------------------------------------------------------
-- api.record_entries -- the public deposit index (§2 "Record")
-- ---------------------------------------------------------------------
create view api.record_entries
with (security_invoker = true)
as
select id, deposit_number, deposited_at, entry_type, title, provenance, link
from publishing.record_entries
order by deposited_at desc;

comment on view api.record_entries is
  'Read-only mirror of the append-only Record. security_invoker: '
  'publishing.record_entries'' own RLS (select to anon/authenticated, no '
  'write grant to anyone) is what authorizes this.';

grant select on api.record_entries to anon, authenticated;
