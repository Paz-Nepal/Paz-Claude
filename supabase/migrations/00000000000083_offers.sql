-- 0083_offers.sql
--
-- One intake for the small offers made to the house (docs/website-additions.md
-- G), plus the parts of B5, C1, E3 and H1 that ride on it.
--
--   * crm.offers: a painter showing the house their work, a Sattal proposal,
--     a Table kept elsewhere, a thing or a book given, a word the house is
--     looking for, a request to leave. One table, one function, one Edge
--     Function (submit-offer) with a rate limit. No email goes anywhere.
--     Each kind is readable only under the permission of the part of the
--     house it belongs to.
--   * crm.voice_intake gains a kind, so the Record can be offered photographs,
--     family papers and documentation of the present as well as a voice.
--   * publishing.glossary_terms gains the kind 'sought' (a word the house has
--     met and cannot yet explain) and Nepal Bhasa columns.
--   * commons.tables_kept can hold a Table reported from elsewhere, confirmed
--     by staff and given its Chronicle line, with no keeper on the register.

-- ---------------------------------------------------------------------
-- crm.offers
-- ---------------------------------------------------------------------
create table crm.offers (
  id           uuid primary key default gen_random_uuid(),
  kind         text not null
               check (kind in ('painter', 'sattal', 'table', 'thing', 'book', 'word', 'leaving')),
  name         text not null check (btrim(name) <> ''),
  contact      text not null check (btrim(contact) <> ''),
  subject      text check (subject is null or char_length(subject) <= 300),
  note         text check (note is null or char_length(note) <= 4000),
  -- Kind-specific answers: a link, a form, a date, a place.
  ref          jsonb not null default '{}'::jsonb check (jsonb_typeof(ref) = 'object'),
  created_at   timestamptz not null default now(),
  reviewed_at  timestamptz,
  reviewed_by  uuid references identity.people (id) on delete restrict
);
create index offers_kind_idx on crm.offers (kind, created_at desc);

-- The permission that guards each kind, named once.
create function crm.offer_permission(p_kind text)
returns text
language sql
immutable
as $$
  select case p_kind
    when 'painter' then 'wall.manage'
    when 'sattal' then 'sattal.manage'
    when 'table' then 'commons.manage'
    when 'thing' then 'house.manage'
    when 'book' then 'house.manage'
    when 'word' then 'publishing.item.update'
    when 'leaving' then 'identity.person.erase'
  end;
$$;

alter table crm.offers enable row level security;
grant select on crm.offers to authenticated;
create policy offers_select_staff on crm.offers
  for select to authenticated
  using ((select authz.has_staff_permission(crm.offer_permission(kind))));

create view api.offers with (security_invoker = true) as
select id, kind, name, contact, subject, note, ref, created_at, reviewed_at
from crm.offers
order by created_at desc;
grant select on api.offers to authenticated;

-- The only way in: Edge Function submit-offer, service role.
create function api.submit_offer(
  p_kind text, p_name text, p_contact text, p_subject text, p_note text, p_ref jsonb
)
returns uuid
language plpgsql
volatile
security definer
set search_path = crm, pg_temp
as $$
declare
  v_id uuid;
  v_ref jsonb := coalesce(p_ref, '{}'::jsonb);
begin
  if p_kind not in ('painter', 'sattal', 'table', 'thing', 'book', 'word', 'leaving') then
    raise exception 'Unknown kind of offer.' using errcode = '22023';
  end if;
  if btrim(coalesce(p_name, '')) = '' or btrim(coalesce(p_contact, '')) = '' then
    raise exception 'A name and a way to reach you are required.' using errcode = '22023';
  end if;
  if jsonb_typeof(v_ref) <> 'object' or length(v_ref::text) > 2000 then
    raise exception 'That offer is not in the expected shape.' using errcode = '22023';
  end if;
  if p_kind = 'sattal' and coalesce(v_ref ->> 'form', '') not in ('study', 'review', 'account') then
    raise exception 'A Sattal proposal names its form: a Study, a Review or an Account.'
      using errcode = '22023';
  end if;
  if p_kind = 'table' and (nullif(v_ref ->> 'held_on', '') is null
                           or nullif(btrim(p_subject), '') is null) then
    raise exception 'A Table reported from elsewhere needs a date and a place.'
      using errcode = '22023';
  end if;

  insert into crm.offers (kind, name, contact, subject, note, ref)
  values (p_kind, btrim(p_name), btrim(p_contact), nullif(btrim(p_subject), ''),
          nullif(btrim(p_note), ''), v_ref)
  returning id into v_id;
  return v_id;
end;
$$;
revoke all on function api.submit_offer(text, text, text, text, text, jsonb) from public, anon, authenticated;
grant execute on function api.submit_offer(text, text, text, text, text, jsonb) to service_role;

-- Staff mark an offer as read, under the permission of its kind.
create function api.review_offer(p_id uuid)
returns void
language plpgsql
volatile
security definer
set search_path = crm, wall, authz, admin, pg_temp
as $$
declare
  v_kind text;
  v_actor uuid;
begin
  select kind into v_kind from crm.offers where id = p_id;
  if v_kind is null then
    raise exception 'That offer does not exist.' using errcode = 'P0002';
  end if;
  v_actor := wall.require(crm.offer_permission(v_kind));
  update crm.offers set reviewed_at = now(), reviewed_by = v_actor
  where id = p_id and reviewed_at is null;
  perform wall.audit(v_actor, 'crm.offer.review', 'crm', 'offers', p_id, null,
    jsonb_build_object('kind', v_kind));
end;
$$;
revoke all on function api.review_offer(uuid) from public, anon;
grant execute on function api.review_offer(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- C1. The Record's intake takes a kind
-- ---------------------------------------------------------------------
alter table crm.voice_intake
  add column if not exists kind text not null default 'voice'
  check (kind in ('voice', 'photographs', 'papers', 'the_present', 'other'));

create or replace view api.voice_intake with (security_invoker = true) as
select id, submitted_at, writer_name, contact, about_name, place, note, kind
from crm.voice_intake
order by submitted_at desc;

drop function api.submit_voice_intake(text, text, text, text, text);
create function api.submit_voice_intake(
  p_writer_name text, p_contact text, p_about_name text, p_place text, p_note text,
  p_kind text default 'voice'
)
returns uuid
language plpgsql
volatile
security definer
set search_path = crm, pg_temp
as $$
declare
  v_id uuid;
begin
  if btrim(coalesce(p_writer_name, '')) = '' or btrim(coalesce(p_contact, '')) = '' then
    raise exception 'A name and a way to reach you are required.';
  end if;
  if coalesce(p_kind, 'voice') not in ('voice', 'photographs', 'papers', 'the_present', 'other') then
    raise exception 'Unknown kind of offer.' using errcode = '22023';
  end if;
  insert into crm.voice_intake (writer_name, contact, about_name, place, note, kind)
  values (btrim(p_writer_name), btrim(p_contact), nullif(btrim(p_about_name), ''),
    nullif(btrim(p_place), ''), nullif(btrim(p_note), ''), coalesce(p_kind, 'voice'))
  returning id into v_id;
  return v_id;
end;
$$;
revoke all on function api.submit_voice_intake(text, text, text, text, text, text) from public, anon, authenticated;
grant execute on function api.submit_voice_intake(text, text, text, text, text, text) to service_role;

-- ---------------------------------------------------------------------
-- H1. Words the house is looking for; H3 (first step): Nepal Bhasa content
-- ---------------------------------------------------------------------
alter table publishing.glossary_terms drop constraint glossary_terms_kind_check;
alter table publishing.glossary_terms
  add constraint glossary_terms_kind_check check (kind in ('term', 'spelling', 'sought'));

-- A sought word has no definition yet; every other kind must have one.
alter table publishing.glossary_terms drop constraint glossary_terms_definition_check;
alter table publishing.glossary_terms alter column definition drop not null;
alter table publishing.glossary_terms
  add constraint glossary_terms_definition_check
  check (
    (kind = 'sought' and (definition is null or btrim(definition) <> ''))
    or (kind <> 'sought' and definition is not null and btrim(definition) <> '')
  );

alter table publishing.glossary_terms
  add column if not exists term_new text,
  add column if not exists definition_new text;

-- No word is linked to a giver or an accession: this table has no such
-- column, and must not gain one (docs/website-additions.md H1).
comment on table publishing.glossary_terms is
  'The shared lexicon. kind ''sought'' is a word the house has met and cannot '
  'yet explain. Deliberately no column linking a word to a giver or accession.';

create or replace view api.glossary_terms with (security_invoker = true) as
select id, slug, kind, term, term_ne, definition, definition_ne, term_new, definition_new
from publishing.glossary_terms
order by lower(term);

create or replace function api.save_glossary_term(p jsonb)
returns uuid
language plpgsql
volatile
security definer
set search_path = publishing, wall, authz, admin, pg_temp
as $$
declare
  v_actor uuid := wall.require('publishing.item.update');
  v_id uuid;
begin
  insert into publishing.glossary_terms
    (slug, kind, term, term_ne, term_new, definition, definition_ne, definition_new)
  values (p ->> 'slug', coalesce(nullif(p ->> 'kind', ''), 'term'), p ->> 'term',
    nullif(p ->> 'term_ne', ''), nullif(p ->> 'term_new', ''),
    nullif(p ->> 'definition', ''), nullif(p ->> 'definition_ne', ''),
    nullif(p ->> 'definition_new', ''))
  on conflict (slug) do update set
    kind = excluded.kind, term = excluded.term, term_ne = excluded.term_ne,
    term_new = excluded.term_new, definition = excluded.definition,
    definition_ne = excluded.definition_ne, definition_new = excluded.definition_new
  returning id into v_id;
  perform wall.audit(v_actor, 'glossary.term.save', 'publishing', 'glossary_terms', v_id, null, p);
  return v_id;
end;
$$;

-- ---------------------------------------------------------------------
-- E3. A Table kept elsewhere
-- ---------------------------------------------------------------------
alter table commons.tables_kept
  add column if not exists reported_by text;
alter table commons.tables_kept alter column kept_by_person_id drop not null;
alter table commons.tables_kept
  add constraint tables_kept_has_a_keeper_or_a_reporter
  check (kept_by_person_id is not null or nullif(btrim(reported_by), '') is not null);

create or replace view api.commons_tables_kept with (security_invoker = true) as
select id, held_on, place, kept_by_person_id, confirmed_on, chronicle_line_id, created_at,
       identity.display_name(kept_by_person_id) as kept_by, reported_by
from commons.tables_kept t
order by held_on desc;

drop function api.report_table_kept(uuid, date, text);
create function api.report_table_kept(
  p_person uuid, p_held_on date, p_place text, p_reported_by text default null
)
returns uuid
language plpgsql
volatile
security definer
set search_path = commons, wall, authz, admin, pg_temp
as $$
declare
  v_actor uuid := wall.require('commons.manage');
  v_id uuid;
begin
  if p_person is null and nullif(btrim(coalesce(p_reported_by, '')), '') is null then
    raise exception 'A Table needs a covenanted keeper, or the name of whoever reported it.'
      using errcode = '23514';
  end if;
  insert into commons.tables_kept (held_on, place, kept_by_person_id, reported_by)
  values (p_held_on, nullif(btrim(p_place), ''), p_person, nullif(btrim(p_reported_by), ''))
  returning id into v_id;
  perform wall.audit(v_actor, 'commons.table.report', 'commons', 'tables_kept', v_id, null,
    jsonb_build_object('held_on', p_held_on, 'elsewhere', p_person is null));
  return v_id;
end;
$$;
revoke all on function api.report_table_kept(uuid, date, text, text) from public, anon;
grant execute on function api.report_table_kept(uuid, date, text, text) to authenticated;
