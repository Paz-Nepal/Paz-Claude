-- 0071_search_and_friends_redirect.sql
--
-- Build Specification 8 and 11.5:
--   * /friends is the address of Friends of PAZ; the old /membership/apply
--     address redirects to it, permanently (redirects are append-only).
--   * Search covers works, people, shows, Papers and the rest of the
--     published items, Sattal pieces, glossary entries and deposit
--     entries. It never reads anything from the archive wall: there is
--     nothing of the archive in any table it touches.

insert into publishing.redirects (old_path, new_path)
values ('/membership/apply', '/friends')
on conflict (old_path) do nothing;

create function api.search_everything(q text)
returns table (kind text, title text, detail text, path text)
language sql
stable
security invoker
set search_path = publishing, wall, sattal, pg_temp
as $$
  with pat as (
    select '%' || replace(replace(replace(btrim(q), '\', '\'), '%', '\%'), '_', '\_') || '%' as p
  )
  select * from (
    select 'person'::text, p.name, null::text, '/people/' || p.slug
    from wall.people p, pat
    where btrim(q) <> '' and (p.name ilike pat.p or p.name_ne ilike pat.p or p.statement ilike pat.p)

    union all
    select 'work', w.title, pe.name, '/works/' || w.slug
    from wall.works w
    join wall.people pe on pe.id = w.person_id, pat
    where btrim(q) <> '' and (w.title ilike pat.p or w.title_ne ilike pat.p or w.medium ilike pat.p)

    union all
    select 'show', s.title, null, '/shows/' || s.slug
    from wall.shows s, pat
    where btrim(q) <> '' and (s.title ilike pat.p or s.title_ne ilike pat.p or s.text ilike pat.p)

    union all
    select 'sattal', x.title, a.name, '/record/' || x.deposit_ref
    from sattal.pieces x
    join wall.people a on a.id = x.person_id, pat
    where btrim(q) <> '' and x.status = 'published'
      and (x.title ilike pat.p or x.title_ne ilike pat.p or a.name ilike pat.p
           or publishing.body_text(x.body) ilike pat.p or publishing.body_text(x.body_ne) ilike pat.p)

    union all
    select 'word', g.term, null, '/words#' || g.slug
    from publishing.glossary_terms g, pat
    where btrim(q) <> '' and (g.term ilike pat.p or g.term_ne ilike pat.p
      or g.definition ilike pat.p or g.definition_ne ilike pat.p)

    union all
    select i.type::text, i.title, null,
      case when i.deposit_ref is not null then '/record/' || i.deposit_ref
           else publishing.item_public_path(i.type, i.slug) end
    from publishing.items i
    where btrim(q) <> '' and i.status = 'published'
      and i.search_tsv @@ (plainto_tsquery('english', q) || plainto_tsquery('simple', q))

    union all
    select 'record', e.title, e.deposit_number, e.link
    from publishing.record_entries e, pat
    where btrim(q) <> '' and e.deposit_number ilike pat.p
  ) hits
  limit 100;
$$;
revoke all on function api.search_everything from public;
grant execute on function api.search_everything(text) to anon, authenticated;
