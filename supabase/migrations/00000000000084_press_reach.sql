-- 0084_press_reach.sql
--
-- What the Press and the Encounters can now say (docs/website-additions.md D2,
-- D3, I1, I2).
--
--   * A Paper can be heard read: an audio file and the named reader.
--   * Where the Pigeon Post went: copies by country, never who received them.
--   * Places the house has tended: a hiti or chautari with before and after,
--     the date and how many came (a count, never names).
--   * The afternoons: an Encounter belongs to a named series and may carry a
--     price note. A workshop still sells a day, never formation.

-- ---------------------------------------------------------------------
-- D2. Hear a Paper read
-- ---------------------------------------------------------------------
alter table publishing.paper_details
  add column if not exists audio_media uuid references publishing.media (id) on delete restrict,
  add column if not exists audio_reader text,
  add constraint paper_audio_is_credited
    check (audio_media is null or btrim(coalesce(audio_reader, '')) <> '');

drop function api.get_paper(text);
create function api.get_paper(p_slug text)
returns table (
  id uuid, slug text, title text, title_ne text, body jsonb, body_ne jsonb,
  deposit_ref text, published_at timestamptz, tags text[], paper_no integer,
  abstract text, pdf_path text, license text, sources_note text, superseded_by_slug text,
  audio_path text, audio_reader text
)
language sql
stable
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
    d.paper_no, d.abstract, pm.storage_path, d.license, d.sources_note,
    su.slug, am.storage_path, d.audio_reader
  from publishing.items i
  join publishing.paper_details d on d.item_id = i.id
  left join publishing.media pm on pm.id = d.pdf_media
  left join publishing.media am on am.id = d.audio_media
  left join publishing.items su on su.id = i.superseded_by
  where i.type = 'paper' and i.slug = p_slug and i.status = 'published';
$$;
grant execute on function api.get_paper(text) to anon, authenticated, service_role;

drop function api.save_paper_details(uuid, text, uuid, text, text);
create function api.save_paper_details(
  p_item uuid, p_abstract text, p_pdf_media uuid, p_license text, p_sources_note text,
  p_audio_media uuid default null, p_audio_reader text default null
)
returns void
language sql
set search_path = publishing, pg_temp
as $$
  insert into publishing.paper_details
    (item_id, abstract, pdf_media, license, sources_note, audio_media, audio_reader)
  values (p_item, p_abstract, p_pdf_media, p_license, p_sources_note, p_audio_media,
          nullif(btrim(p_audio_reader), ''))
  on conflict (item_id) do update set
    abstract = excluded.abstract,
    pdf_media = excluded.pdf_media,
    license = excluded.license,
    sources_note = excluded.sources_note,
    audio_media = excluded.audio_media,
    audio_reader = excluded.audio_reader;
$$;
revoke all on function api.save_paper_details(uuid, text, uuid, text, text, uuid, text) from public, anon;
grant execute on function api.save_paper_details(uuid, text, uuid, text, text, uuid, text) to authenticated;

-- ---------------------------------------------------------------------
-- D3. Where the pigeons went
-- ---------------------------------------------------------------------
-- The table has no column for a name or an address, so none can be kept.
create table publishing.pigeon_post_distribution (
  id          uuid primary key default gen_random_uuid(),
  item_id     uuid not null references publishing.items (id) on delete restrict,
  country     text not null check (btrim(country) <> ''),
  copies      int not null check (copies > 0),
  noted_on    date not null default current_date,
  created_at  timestamptz not null default now()
);
create index pigeon_distribution_item_idx on publishing.pigeon_post_distribution (item_id);

create function publishing.check_pigeon_distribution_item()
returns trigger
language plpgsql
as $$
begin
  if not exists (select 1 from publishing.items i where i.id = new.item_id and i.type = 'pigeon_post') then
    raise exception 'Distribution is kept only for Pigeon Post editions.' using errcode = '23514';
  end if;
  return new;
end;
$$;
create trigger pigeon_distribution_item_type
  before insert or update on publishing.pigeon_post_distribution
  for each row execute function publishing.check_pigeon_distribution_item();

alter table publishing.pigeon_post_distribution enable row level security;
grant select on publishing.pigeon_post_distribution to authenticated;
create policy pigeon_distribution_staff on publishing.pigeon_post_distribution
  for select to authenticated using ((select authz.has_staff_permission('publishing.item.read')));

create view api.admin_pigeon_distribution with (security_invoker = true) as
select d.id, d.item_id, i.slug as item_slug, i.title as item_title, d.country, d.copies, d.noted_on
from publishing.pigeon_post_distribution d
join publishing.items i on i.id = d.item_id
order by d.noted_on desc, d.country;
grant select on api.admin_pigeon_distribution to authenticated;

-- Public: totals by country, and per published edition.
create view api.pigeon_post_reach with (security_invoker = false) as
select d.country, sum(d.copies)::int as copies
from publishing.pigeon_post_distribution d
join publishing.items i on i.id = d.item_id
where i.status = 'published'
group by d.country
order by sum(d.copies) desc, d.country;

create view api.pigeon_post_reach_by_item with (security_invoker = false) as
select i.slug as item_slug, d.country, sum(d.copies)::int as copies
from publishing.pigeon_post_distribution d
join publishing.items i on i.id = d.item_id
where i.status = 'published'
group by i.slug, d.country
order by i.slug, d.country;
grant select on api.pigeon_post_reach, api.pigeon_post_reach_by_item to anon, authenticated;

create function api.save_pigeon_distribution(p jsonb)
returns uuid
language plpgsql
volatile
security definer
set search_path = publishing, wall, authz, admin, pg_temp
as $$
declare
  v_actor uuid := wall.require('publishing.item.update');
  v_id uuid := coalesce(nullif(p ->> 'id', '')::uuid, gen_random_uuid());
  v_before jsonb;
begin
  select to_jsonb(d) into v_before from publishing.pigeon_post_distribution d where d.id = v_id;
  insert into publishing.pigeon_post_distribution (id, item_id, country, copies, noted_on)
  values (v_id, (p ->> 'item_id')::uuid, btrim(p ->> 'country'), (p ->> 'copies')::int,
          coalesce(nullif(p ->> 'noted_on', '')::date, current_date))
  on conflict (id) do update set
    item_id = excluded.item_id, country = excluded.country,
    copies = excluded.copies, noted_on = excluded.noted_on;
  perform wall.audit(v_actor, 'pigeon.distribution.save', 'publishing', 'pigeon_post_distribution',
    v_id, v_before, p);
  return v_id;
end;
$$;

create function api.remove_pigeon_distribution(p_id uuid)
returns void
language plpgsql
volatile
security definer
set search_path = publishing, wall, authz, admin, pg_temp
as $$
declare
  v_actor uuid := wall.require('publishing.item.update');
  v_before jsonb;
begin
  select to_jsonb(d) into v_before from publishing.pigeon_post_distribution d where d.id = p_id;
  delete from publishing.pigeon_post_distribution where id = p_id;
  if v_before is not null then
    perform wall.audit(v_actor, 'pigeon.distribution.remove', 'publishing',
      'pigeon_post_distribution', p_id, v_before, null);
  end if;
end;
$$;
revoke all on function api.save_pigeon_distribution(jsonb), api.remove_pigeon_distribution(uuid)
  from public, anon;
grant execute on function api.save_pigeon_distribution(jsonb), api.remove_pigeon_distribution(uuid)
  to authenticated;

-- ---------------------------------------------------------------------
-- I2. The afternoons: a series and a price note on each Encounter
-- ---------------------------------------------------------------------
alter table encounters.events
  add column if not exists series text check (series is null or series ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  add column if not exists price_note text,
  add column if not exists price_note_ne text;

create or replace view api.encounters_calendar with (security_invoker = true) as
select id, slug, kind, title, title_ne, starts_on, ends_on, place, place_ne,
       how_to_turn_up, how_to_turn_up_ne, leads_ne, series, price_note, price_note_ne
from encounters.events
order by starts_on desc, title;

create or replace view api.admin_encounters with (security_invoker = true) as
select id, slug, kind, title, title_ne, starts_on, ends_on, place, place_ne,
       how_to_turn_up, how_to_turn_up_ne, leads_ne, published, created_at, updated_at,
       series, price_note, price_note_ne
from encounters.events
order by starts_on desc;

create or replace function api.save_encounter(p jsonb)
returns uuid
language plpgsql
volatile
security definer
set search_path = encounters, wall, authz, admin, pg_temp
as $$
declare
  v_actor uuid := wall.require('encounters.manage');
  v_id uuid := nullif(p ->> 'id', '')::uuid;
begin
  if v_id is not null then
    update encounters.events set slug = p ->> 'slug', kind = p ->> 'kind', title = p ->> 'title',
      title_ne = nullif(p ->> 'title_ne', ''), starts_on = (p ->> 'starts_on')::date,
      ends_on = nullif(p ->> 'ends_on', '')::date, place = nullif(p ->> 'place', ''),
      place_ne = nullif(p ->> 'place_ne', ''), how_to_turn_up = nullif(p ->> 'how_to_turn_up', ''),
      how_to_turn_up_ne = nullif(p ->> 'how_to_turn_up_ne', ''),
      leads_ne = coalesce((p ->> 'leads_ne')::boolean, leads_ne),
      published = coalesce((p ->> 'published')::boolean, published),
      series = case when p ? 'series' then nullif(btrim(p ->> 'series'), '') else series end,
      price_note = case when p ? 'price_note' then nullif(p ->> 'price_note', '') else price_note end,
      price_note_ne = case when p ? 'price_note_ne' then nullif(p ->> 'price_note_ne', '') else price_note_ne end
    where id = v_id;
    if not found then raise exception 'Encounter % does not exist', v_id; end if;
  else
    insert into encounters.events (slug, kind, title, title_ne, starts_on, ends_on, place, place_ne,
      how_to_turn_up, how_to_turn_up_ne, leads_ne, published, series, price_note, price_note_ne)
    values (p ->> 'slug', p ->> 'kind', p ->> 'title', nullif(p ->> 'title_ne', ''),
      (p ->> 'starts_on')::date, nullif(p ->> 'ends_on', '')::date, nullif(p ->> 'place', ''),
      nullif(p ->> 'place_ne', ''), nullif(p ->> 'how_to_turn_up', ''),
      nullif(p ->> 'how_to_turn_up_ne', ''), coalesce((p ->> 'leads_ne')::boolean, false),
      coalesce((p ->> 'published')::boolean, false), nullif(btrim(p ->> 'series'), ''),
      nullif(p ->> 'price_note', ''), nullif(p ->> 'price_note_ne', ''))
    returning id into v_id;
  end if;
  perform wall.audit(v_actor, 'encounters.event.save', 'encounters', 'events', v_id, null, p);
  return v_id;
end;
$$;

-- ---------------------------------------------------------------------
-- I1. Places the house has tended
-- ---------------------------------------------------------------------
create function encounters.image_ok(j jsonb)
returns boolean
language sql
immutable
as $$
  select j is null or (
    jsonb_typeof(j) = 'object'
    and btrim(coalesce(j ->> 'original_path', '')) <> ''
    and coalesce((j ->> 'width')::int, 0) > 0
    and coalesce((j ->> 'height')::int, 0) > 0
    and btrim(coalesce(j ->> 'alt', '')) <> ''
    and btrim(coalesce(j ->> 'photographer', '')) <> ''
  );
$$;

create table encounters.places (
  id           uuid primary key default gen_random_uuid(),
  slug         text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name         text not null check (btrim(name) <> ''),
  name_ne      text,
  kind         text not null default 'hiti' check (kind in ('hiti', 'chautari', 'other')),
  location     text,
  location_ne  text,
  note         text,
  note_ne      text,
  published    boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table encounters.place_visits (
  id            uuid primary key default gen_random_uuid(),
  place_id      uuid not null references encounters.places (id) on delete restrict,
  event_id      uuid references encounters.events (id) on delete restrict,
  done_on       date not null,
  -- { original_path, width, height, variants, alt, photographer }
  before_image  jsonb check (encounters.image_ok(before_image)),
  after_image   jsonb check (encounters.image_ok(after_image)),
  -- A count. Never names.
  people_count  int check (people_count is null or people_count >= 0),
  note          text,
  note_ne       text,
  published     boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index place_visits_place_idx on encounters.place_visits (place_id, done_on desc);

create trigger places_set_updated_at before update on encounters.places
  for each row execute function public.set_updated_at();
create trigger place_visits_set_updated_at before update on encounters.place_visits
  for each row execute function public.set_updated_at();
create trigger places_reject_em_dash before insert or update on encounters.places
  for each row when (new.published) execute function publishing.reject_em_dash();
create trigger place_visits_reject_em_dash before insert or update on encounters.place_visits
  for each row when (new.published) execute function publishing.reject_em_dash();

alter table encounters.places enable row level security;
alter table encounters.place_visits enable row level security;
grant select on encounters.places, encounters.place_visits to authenticated;
create policy places_select_staff on encounters.places
  for select to authenticated using ((select authz.has_staff_permission('encounters.manage')));
create policy place_visits_select_staff on encounters.place_visits
  for select to authenticated using ((select authz.has_staff_permission('encounters.manage')));

create view api.encounter_places with (security_invoker = false) as
select p.id, p.slug, p.name, p.name_ne, p.kind, p.location, p.location_ne, p.note, p.note_ne
from encounters.places p
where p.published
order by p.name;

create view api.encounter_place_visits with (security_invoker = false) as
select v.id, v.place_id, pl.slug as place_slug, e.slug as event_slug, v.done_on,
       v.before_image, v.after_image, v.people_count, v.note, v.note_ne
from encounters.place_visits v
join encounters.places pl on pl.id = v.place_id
left join encounters.events e on e.id = v.event_id and e.published
where v.published and pl.published
order by v.done_on desc;
grant select on api.encounter_places, api.encounter_place_visits to anon, authenticated;

create view api.admin_encounter_places with (security_invoker = true) as
select * from encounters.places order by name;
create view api.admin_encounter_place_visits with (security_invoker = true) as
select v.*, pl.name as place_name from encounters.place_visits v
join encounters.places pl on pl.id = v.place_id order by v.done_on desc;
grant select on api.admin_encounter_places, api.admin_encounter_place_visits to authenticated;

create function api.save_encounter_place(p jsonb)
returns uuid
language plpgsql
volatile
security definer
set search_path = encounters, wall, authz, admin, pg_temp
as $$
declare
  v_actor uuid := wall.require('encounters.manage');
  v_id uuid := coalesce(nullif(p ->> 'id', '')::uuid, gen_random_uuid());
  v_before jsonb;
begin
  select to_jsonb(x) into v_before from encounters.places x where x.id = v_id;
  insert into encounters.places (id, slug, name, name_ne, kind, location, location_ne, note, note_ne, published)
  values (v_id, btrim(p ->> 'slug'), btrim(p ->> 'name'), nullif(btrim(p ->> 'name_ne'), ''),
    coalesce(nullif(p ->> 'kind', ''), 'hiti'), nullif(btrim(p ->> 'location'), ''),
    nullif(btrim(p ->> 'location_ne'), ''), nullif(btrim(p ->> 'note'), ''),
    nullif(btrim(p ->> 'note_ne'), ''), coalesce((p ->> 'published')::boolean, false))
  on conflict (id) do update set
    slug = excluded.slug, name = excluded.name, name_ne = excluded.name_ne, kind = excluded.kind,
    location = excluded.location, location_ne = excluded.location_ne, note = excluded.note,
    note_ne = excluded.note_ne, published = excluded.published;
  perform wall.audit(v_actor, 'encounters.place.save', 'encounters', 'places', v_id, v_before, p);
  return v_id;
end;
$$;

create function api.save_encounter_place_visit(p jsonb)
returns uuid
language plpgsql
volatile
security definer
set search_path = encounters, wall, authz, admin, pg_temp
as $$
declare
  v_actor uuid := wall.require('encounters.manage');
  v_id uuid := coalesce(nullif(p ->> 'id', '')::uuid, gen_random_uuid());
  v_before jsonb;
begin
  select to_jsonb(x) into v_before from encounters.place_visits x where x.id = v_id;
  insert into encounters.place_visits
    (id, place_id, event_id, done_on, before_image, after_image, people_count, note, note_ne, published)
  values (v_id, (p ->> 'place_id')::uuid, nullif(p ->> 'event_id', '')::uuid,
    (p ->> 'done_on')::date,
    case when jsonb_typeof(p -> 'before_image') = 'object' then p -> 'before_image' end,
    case when jsonb_typeof(p -> 'after_image') = 'object' then p -> 'after_image' end,
    nullif(p ->> 'people_count', '')::int, nullif(btrim(p ->> 'note'), ''),
    nullif(btrim(p ->> 'note_ne'), ''), coalesce((p ->> 'published')::boolean, false))
  on conflict (id) do update set
    place_id = excluded.place_id, event_id = excluded.event_id, done_on = excluded.done_on,
    before_image = excluded.before_image, after_image = excluded.after_image,
    people_count = excluded.people_count, note = excluded.note, note_ne = excluded.note_ne,
    published = excluded.published;
  perform wall.audit(v_actor, 'encounters.place_visit.save', 'encounters', 'place_visits', v_id, v_before, p);
  return v_id;
end;
$$;
revoke all on function api.save_encounter_place(jsonb), api.save_encounter_place_visit(jsonb)
  from public, anon;
grant execute on function api.save_encounter_place(jsonb), api.save_encounter_place_visit(jsonb)
  to authenticated;

-- ---------------------------------------------------------------------
-- E2. On this day: Chronicle lines whose month and day match today in
-- Kathmandu, from an earlier year. Hidden on the site when there are none.
-- ---------------------------------------------------------------------
create view api.chronicle_on_this_day with (security_invoker = true) as
select l.id, l.line_on, l.line
from api.chronicle_lines l
where extract(month from l.line_on) = extract(month from (now() at time zone 'Asia/Kathmandu'))
  and extract(day from l.line_on) = extract(day from (now() at time zone 'Asia/Kathmandu'))
  and extract(year from l.line_on) < extract(year from (now() at time zone 'Asia/Kathmandu'))
order by l.line_on desc;
grant select on api.chronicle_on_this_day to anon, authenticated;
