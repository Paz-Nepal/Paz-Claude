-- Devanagari-aware search (bilingual follow-up to search_tsv/api.search_published
-- in 00000000000008_publishing.sql). Postgres ships no Nepali/Devanagari text
-- search dictionary, so the English-only 'english' config left title_ne,
-- subtitle_ne, summary_ne, and body_ne entirely unindexed -- a Nepali-language
-- search term could never match a Nepali-only article. 'simple' (tokenize, no
-- stemming) is the standard script-agnostic fallback for unsupported languages.
--
-- search_tsv is a GENERATED ALWAYS column: its expression cannot be altered
-- in place (only column-append is allowed, and only on ordinary generated
-- columns -- this one already can't be touched by CREATE OR REPLACE at all),
-- so this drops and recreates it and its GIN index.

drop index if exists publishing.items_search_idx;
alter table publishing.items drop column search_tsv;

alter table publishing.items add column search_tsv tsvector
  generated always as (
    to_tsvector(
      'english',
      coalesce(title, '') || ' ' || coalesce(subtitle, '') || ' '
        || coalesce(summary, '') || ' ' || publishing.body_text(body)
    )
    ||
    to_tsvector(
      'simple',
      coalesce(title_ne, '') || ' ' || coalesce(subtitle_ne, '') || ' '
        || coalesce(summary_ne, '') || ' ' || publishing.body_text(body_ne)
    )
  ) stored;

create index items_search_idx on publishing.items using gin (search_tsv);

create or replace function api.search_published(q text)
returns setof api.published_items
language sql
stable
security invoker
set search_path = publishing, api, pg_temp
as $$
  select p.* from api.published_items p
  join publishing.items i on i.id = p.id
  where i.search_tsv @@ (plainto_tsquery('english', q) || plainto_tsquery('simple', q));
$$;
