-- 0069_wall.sql
--
-- PAZ Site Build Specification section 6: the Wall. People (artists and
-- authors, modelled once with roles), works, the append-only life of a
-- work, shows, attributed text about a work, and the images that make a
-- painting saleable.
--
-- Shape of the access model, same as the rest of this project:
--   * Base tables are readable (RLS-narrowed) but never directly writable.
--   * Every write goes through a security-definer api.* function that
--     checks its own permission and writes an audit row.
--   * The public reads api.* views only; PostgREST exposes no other schema.
--
-- Nothing here is ever deleted by the application. A work that sells
-- keeps its page; an artist who leaves is marked inactive, not removed
-- (6.3, 6.6). The two flags on a person, represented and formed_by_guild,
-- are separate and neither implies the other (6.7).

create schema if not exists wall;
comment on schema wall is
  'The Wall: people, works, work life events, shows, attributed text, images.';

grant usage on schema wall to anon, authenticated, service_role;

-- ---------------------------------------------------------------------
-- Permissions (also mirrored in supabase/seed/authz.sql for fresh
-- environments; a migration has to carry them for the live project).
-- ---------------------------------------------------------------------
insert into authz.permissions (key, description) values
  ('wall.manage', 'Create and edit people, works, shows, work text and images on the Wall, and record a work''s life.'),
  ('sattal.manage', 'Create and edit Sattal pieces and outside readers; publish a piece once the conflict rule is met.'),
  ('chronicle.line.create', 'Add a line to the Chronicle.'),
  ('crm.voice.read', 'Read the private intake of people who may be recorded in future.')
on conflict (key) do nothing;

insert into authz.role_permissions (role_key, permission_key) values
  ('editor', 'wall.manage'),
  ('editor', 'sattal.manage'),
  ('editor', 'chronicle.line.create'),
  ('super_admin', 'wall.manage'),
  ('super_admin', 'sattal.manage'),
  ('super_admin', 'chronicle.line.create'),
  ('super_admin', 'crm.voice.read'),
  ('administrator', 'wall.manage'),
  ('administrator', 'sattal.manage'),
  ('administrator', 'chronicle.line.create'),
  ('administrator', 'crm.voice.read')
on conflict do nothing;

-- ---------------------------------------------------------------------
-- Internal helpers
-- ---------------------------------------------------------------------
create function wall.require(p_permission text)
returns uuid
language plpgsql
stable
security definer
set search_path = authz, pg_temp
as $$
declare
  v_actor uuid := authz.current_person_id();
begin
  if v_actor is null or not authz.has_staff_permission(p_permission) then
    raise exception 'Not permitted' using errcode = '42501';
  end if;
  return v_actor;
end;
$$;
revoke all on function wall.require from public, anon;
grant execute on function wall.require to authenticated;

create function wall.audit(
  p_actor uuid, p_action text, p_schema text, p_table text, p_id uuid,
  p_before jsonb, p_after jsonb
)
returns void
language sql
security definer
set search_path = admin, pg_temp
as $$
  insert into admin.audit_log (actor, action, entity_schema, entity_table, entity_id, before, after)
  values (p_actor, p_action, p_schema, p_table, p_id, p_before, p_after);
$$;
revoke all on function wall.audit from public, anon;
grant execute on function wall.audit to authenticated;

-- ---------------------------------------------------------------------
-- wall.people
-- ---------------------------------------------------------------------
create table wall.people (
  id               uuid primary key default gen_random_uuid(),
  slug             text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name             text not null check (btrim(name) <> ''),
  name_ne          text,
  -- Their own words, never the house's (6.1, 6.2).
  statement        text,
  statement_ne     text,
  roles            text[] not null default '{artist}'
                   check (cardinality(roles) > 0 and roles <@ array['artist', 'author', 'maker']::text[]),
  -- Separate flags; neither implies the other (6.7).
  represented      boolean not null default false,
  formed_by_guild  boolean not null default false,
  -- false removes the person from the wall's current listings only;
  -- their page, their works and their shows remain (6.6).
  active           boolean not null default true,
  published        boolean not null default false,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create trigger people_set_updated_at
  before update on wall.people
  for each row execute function public.set_updated_at();

-- Staff-only: whether the house publishes its split with artists is
-- undecided (16). The field is carried and never shown.
create table wall.person_terms (
  person_id        uuid primary key references wall.people (id) on delete restrict,
  house_split_note text
);

-- Where a person has shown elsewhere, and what has been written about
-- them outside the house (6.2). Writing by the house's own Sattal is
-- linked automatically from sattal.pieces.
create table wall.person_exhibitions (
  id         uuid primary key default gen_random_uuid(),
  person_id  uuid not null references wall.people (id) on delete restrict,
  year       int,
  title      text not null,
  place      text,
  note       text,
  created_at timestamptz not null default now()
);
create index person_exhibitions_person_idx on wall.person_exhibitions (person_id, year desc);

create table wall.person_writings (
  id         uuid primary key default gen_random_uuid(),
  person_id  uuid not null references wall.people (id) on delete restrict,
  year       int,
  title      text not null,
  source     text not null,
  url        text,
  created_at timestamptz not null default now()
);
create index person_writings_person_idx on wall.person_writings (person_id, year desc);

-- ---------------------------------------------------------------------
-- wall.works
-- ---------------------------------------------------------------------
create sequence wall.work_no_seq start 1;

create table wall.works (
  id                   uuid primary key default gen_random_uuid(),
  slug                 text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  work_number          int not null unique default nextval('wall.work_no_seq'),
  person_id            uuid not null references wall.people (id) on delete restrict,
  title                text not null check (btrim(title) <> ''),
  title_ne             text,
  year                 int,
  medium               text,
  medium_ne            text,
  height_mm            int check (height_mm is null or height_mm > 0),
  width_mm             int check (width_mm is null or width_mm > 0),
  depth_mm             int check (depth_mm is null or depth_mm > 0),
  price_minor          bigint check (price_minor is null or price_minor >= 0),
  currency             text not null default 'NPR',
  friends_price_minor  bigint check (friends_price_minor is null or friends_price_minor >= 0),
  availability         text not null default 'available'
                       check (availability in ('available', 'sold', 'not_for_sale', 'on_loan')),
  -- Carried, never sorted, filtered or grouped on, and not exposed by any
  -- public view: whether or how to surface it is the house's decision (6.7).
  first_showing        boolean not null default false,
  hallmarked           boolean not null default false,
  provenance_note      text,
  -- Rights (6.10). The agreement's wording is not this schema's to write.
  image_licence        text,
  may_show_after_sale  boolean not null default true,
  published            boolean not null default false,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);
create index works_person_idx on wall.works (person_id);
create trigger works_set_updated_at
  before update on wall.works
  for each row execute function public.set_updated_at();

-- The house's punch attests formation, so it can only stand beside the
-- punch of a maker the Guild has formed (6.7).
create function wall.check_hallmark()
returns trigger
language plpgsql
as $$
begin
  if new.hallmarked
     and not exists (select 1 from wall.people p where p.id = new.person_id and p.formed_by_guild)
  then
    raise exception 'A hallmark can only be carried by work of a maker the Guild has formed.'
      using errcode = '23514';
  end if;
  return new;
end;
$$;
create trigger works_check_hallmark
  before insert or update on wall.works
  for each row execute function wall.check_hallmark();

-- Maker's flag cannot be withdrawn while a hallmarked work stands on it.
create function wall.check_person_hallmarks()
returns trigger
language plpgsql
as $$
begin
  if old.formed_by_guild and not new.formed_by_guild
     and exists (select 1 from wall.works w where w.person_id = new.id and w.hallmarked)
  then
    raise exception 'This maker still has hallmarked work; that work must be corrected first.'
      using errcode = '23514';
  end if;
  return new;
end;
$$;
create trigger people_check_hallmarks
  before update on wall.people
  for each row execute function wall.check_person_hallmarks();

-- ---------------------------------------------------------------------
-- wall.work_images: three frames per work (6.9)
-- ---------------------------------------------------------------------
create table wall.work_images (
  id             uuid primary key default gen_random_uuid(),
  work_id        uuid not null references wall.works (id) on delete restrict,
  frame          text not null check (frame in ('whole', 'detail', 'scale')),
  original_path  text not null,
  width          int not null check (width > 0),
  height         int not null check (height > 0),
  -- [{ "w": 480, "h": 600, "webp": "path", "jpg": "path" }, ...]
  variants       jsonb not null default '[]'::jsonb,
  alt            text not null check (btrim(alt) <> ''),
  -- Every image records who made it. The maker owns the work; the house
  -- makes the photograph (6.9, 6.10).
  photographer   text not null check (btrim(photographer) <> ''),
  created_at     timestamptz not null default now(),
  unique (work_id, frame)
);

-- ---------------------------------------------------------------------
-- wall.work_events: the life of a work. Append-only, never edited,
-- never deleted (6.4).
-- ---------------------------------------------------------------------
create table wall.work_events (
  id           uuid primary key default gen_random_uuid(),
  work_id      uuid not null references wall.works (id) on delete restrict,
  occurred_on  date not null,
  kind         text not null
               check (kind in ('made', 'shown', 'sold', 'loaned', 'returned', 'damaged', 'restored', 'rehoused')),
  note         text,
  recorded_at  timestamptz not null default now()
);
create index work_events_work_idx on wall.work_events (work_id, occurred_on, recorded_at);

create function wall.block_event_change()
returns trigger
language plpgsql
as $$
begin
  raise exception 'The life of a work is append-only: add another event instead.'
    using errcode = '42501';
end;
$$;
create trigger work_events_append_only
  before update or delete on wall.work_events
  for each row execute function wall.block_event_change();

-- ---------------------------------------------------------------------
-- wall.work_texts: text about a work. Only the maker's own words or text
-- plainly marked as the house speaking; attribution is required (6.8).
-- ---------------------------------------------------------------------
create table wall.work_texts (
  id           uuid primary key default gen_random_uuid(),
  work_id      uuid not null references wall.works (id) on delete restrict,
  attribution  text not null check (attribution in ('maker', 'house')),
  body         text not null check (btrim(body) <> ''),
  body_ne      text,
  created_at   timestamptz not null default now()
);
create index work_texts_work_idx on wall.work_texts (work_id, created_at);

-- ---------------------------------------------------------------------
-- wall.shows
-- ---------------------------------------------------------------------
create table wall.shows (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title       text not null check (btrim(title) <> ''),
  title_ne    text,
  opened_on   date not null,
  closed_on   date check (closed_on is null or closed_on >= opened_on),
  -- The house's own words about the show; rendered as the house speaking.
  text        text,
  text_ne     text,
  published   boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create trigger shows_set_updated_at
  before update on wall.shows
  for each row execute function public.set_updated_at();

create table wall.show_works (
  show_id  uuid not null references wall.shows (id) on delete restrict,
  work_id  uuid not null references wall.works (id) on delete restrict,
  primary key (show_id, work_id)
);
create index show_works_work_idx on wall.show_works (work_id);

-- ---------------------------------------------------------------------
-- RLS: public reads what is published; staff read everything; nobody
-- writes directly (all writes go through the api.* functions below).
-- ---------------------------------------------------------------------
alter table wall.people enable row level security;
alter table wall.person_terms enable row level security;
alter table wall.person_exhibitions enable row level security;
alter table wall.person_writings enable row level security;
alter table wall.works enable row level security;
alter table wall.work_images enable row level security;
alter table wall.work_events enable row level security;
alter table wall.work_texts enable row level security;
alter table wall.shows enable row level security;
alter table wall.show_works enable row level security;

grant select on wall.people, wall.person_exhibitions, wall.person_writings, wall.works,
  wall.work_images, wall.work_events, wall.work_texts, wall.shows, wall.show_works
  to anon, authenticated;
grant select on wall.person_terms to authenticated;
grant usage on all sequences in schema wall to authenticated;

create policy people_select_public on wall.people
  for select to anon, authenticated using (published);
create policy people_select_staff on wall.people
  for select to authenticated using ((select authz.has_staff_permission('wall.manage')));

create policy person_terms_select_staff on wall.person_terms
  for select to authenticated using ((select authz.has_staff_permission('wall.manage')));

create policy person_exhibitions_select_public on wall.person_exhibitions
  for select to anon, authenticated
  using (exists (select 1 from wall.people p where p.id = person_id and p.published));
create policy person_exhibitions_select_staff on wall.person_exhibitions
  for select to authenticated using ((select authz.has_staff_permission('wall.manage')));

create policy person_writings_select_public on wall.person_writings
  for select to anon, authenticated
  using (exists (select 1 from wall.people p where p.id = person_id and p.published));
create policy person_writings_select_staff on wall.person_writings
  for select to authenticated using ((select authz.has_staff_permission('wall.manage')));

create policy works_select_public on wall.works
  for select to anon, authenticated using (published);
create policy works_select_staff on wall.works
  for select to authenticated using ((select authz.has_staff_permission('wall.manage')));

create policy work_images_select_public on wall.work_images
  for select to anon, authenticated
  using (exists (
    select 1 from wall.works w
    where w.id = work_id and w.published
      and not (w.availability = 'sold' and not w.may_show_after_sale)
  ));
create policy work_images_select_staff on wall.work_images
  for select to authenticated using ((select authz.has_staff_permission('wall.manage')));

create policy work_events_select_public on wall.work_events
  for select to anon, authenticated
  using (exists (select 1 from wall.works w where w.id = work_id and w.published));
create policy work_events_select_staff on wall.work_events
  for select to authenticated using ((select authz.has_staff_permission('wall.manage')));

create policy work_texts_select_public on wall.work_texts
  for select to anon, authenticated
  using (exists (select 1 from wall.works w where w.id = work_id and w.published));
create policy work_texts_select_staff on wall.work_texts
  for select to authenticated using ((select authz.has_staff_permission('wall.manage')));

create policy shows_select_public on wall.shows
  for select to anon, authenticated using (published);
create policy shows_select_staff on wall.shows
  for select to authenticated using ((select authz.has_staff_permission('wall.manage')));

create policy show_works_select_public on wall.show_works
  for select to anon, authenticated
  using (
    exists (select 1 from wall.shows s where s.id = show_id and s.published)
    and exists (select 1 from wall.works w where w.id = work_id and w.published)
  );
create policy show_works_select_staff on wall.show_works
  for select to authenticated using ((select authz.has_staff_permission('wall.manage')));

-- ---------------------------------------------------------------------
-- Public api views. No first_showing, no image_licence, no split note.
-- Price is shown only while a work is available; a sold work states that
-- it is sold and shows no figure (no sales performance, 6.2).
-- ---------------------------------------------------------------------
create view api.wall_people with (security_invoker = true) as
select p.id, p.slug, p.name, p.name_ne, p.statement, p.statement_ne, p.roles,
  p.represented, p.formed_by_guild, p.active
from wall.people p
order by p.name;

create view api.wall_works with (security_invoker = true) as
select
  w.id, w.slug, w.work_number, w.person_id,
  p.slug as person_slug, p.name as person_name, p.name_ne as person_name_ne,
  p.formed_by_guild as person_formed_by_guild,
  p.active as person_active,
  w.title, w.title_ne, w.year, w.medium, w.medium_ne,
  w.height_mm, w.width_mm, w.depth_mm,
  case when w.availability = 'available' then w.price_minor end as price_minor,
  case when w.availability = 'available' then w.friends_price_minor end as friends_price_minor,
  w.currency, w.availability, w.hallmarked, w.provenance_note
from wall.works w
join wall.people p on p.id = w.person_id
order by w.work_number;

create view api.wall_work_images with (security_invoker = true) as
select i.id, i.work_id, i.frame, i.original_path, i.width, i.height, i.variants, i.alt, i.photographer
from wall.work_images i
order by i.work_id, case i.frame when 'whole' then 1 when 'detail' then 2 else 3 end;

create view api.wall_work_events with (security_invoker = true) as
select e.id, e.work_id, e.occurred_on, e.kind, e.note
from wall.work_events e
order by e.occurred_on, e.recorded_at;

create view api.wall_work_texts with (security_invoker = true) as
select t.id, t.work_id, t.attribution, t.body, t.body_ne
from wall.work_texts t
order by t.created_at;

create view api.wall_shows with (security_invoker = true) as
select s.id, s.slug, s.title, s.title_ne, s.opened_on, s.closed_on, s.text, s.text_ne
from wall.shows s
order by s.opened_on desc, s.title;

create view api.wall_show_works with (security_invoker = true) as
select sw.show_id, sw.work_id
from wall.show_works sw;

create view api.wall_person_exhibitions with (security_invoker = true) as
select e.id, e.person_id, e.year, e.title, e.place, e.note
from wall.person_exhibitions e
order by e.year desc nulls last, e.title;

create view api.wall_person_writings with (security_invoker = true) as
select x.id, x.person_id, x.year, x.title, x.source, x.url
from wall.person_writings x
order by x.year desc nulls last, x.title;

grant select on api.wall_people, api.wall_works, api.wall_work_images, api.wall_work_events,
  api.wall_work_texts, api.wall_shows, api.wall_show_works, api.wall_person_exhibitions,
  api.wall_person_writings to anon, authenticated;

-- ---------------------------------------------------------------------
-- Staff views (everything, drafts included). RLS narrows to wall.manage.
-- ---------------------------------------------------------------------
create view api.admin_wall_people with (security_invoker = true) as
select p.*, t.house_split_note
from wall.people p
left join wall.person_terms t on t.person_id = p.id
order by p.name;

create view api.admin_wall_works with (security_invoker = true) as
select w.*, p.name as person_name
from wall.works w
join wall.people p on p.id = w.person_id
order by w.work_number desc;

create view api.admin_wall_shows with (security_invoker = true) as
select s.*, coalesce((select array_agg(sw.work_id) from wall.show_works sw where sw.show_id = s.id), '{}') as work_ids
from wall.shows s
order by s.opened_on desc;

grant select on api.admin_wall_people, api.admin_wall_works, api.admin_wall_shows to authenticated;

-- ---------------------------------------------------------------------
-- Write functions
-- ---------------------------------------------------------------------
create function api.save_person(p jsonb)
returns uuid
language plpgsql
volatile
security definer
set search_path = wall, authz, admin, pg_temp
as $$
declare
  v_actor uuid := wall.require('wall.manage');
  v_id uuid := nullif(p ->> 'id', '')::uuid;
  v_before jsonb;
begin
  if v_id is not null then
    select to_jsonb(x) into v_before from wall.people x where x.id = v_id;
    if v_before is null then
      raise exception 'Person % does not exist', v_id;
    end if;
    update wall.people set
      slug = p ->> 'slug',
      name = p ->> 'name',
      name_ne = nullif(p ->> 'name_ne', ''),
      statement = nullif(p ->> 'statement', ''),
      statement_ne = nullif(p ->> 'statement_ne', ''),
      roles = case when p ? 'roles' then array(select jsonb_array_elements_text(p -> 'roles')) else roles end,
      represented = coalesce((p ->> 'represented')::boolean, represented),
      formed_by_guild = coalesce((p ->> 'formed_by_guild')::boolean, formed_by_guild),
      active = coalesce((p ->> 'active')::boolean, active),
      published = coalesce((p ->> 'published')::boolean, published)
    where id = v_id;
  else
    insert into wall.people (slug, name, name_ne, statement, statement_ne, roles,
      represented, formed_by_guild, active, published)
    values (
      p ->> 'slug', p ->> 'name', nullif(p ->> 'name_ne', ''),
      nullif(p ->> 'statement', ''), nullif(p ->> 'statement_ne', ''),
      case when p ? 'roles' then array(select jsonb_array_elements_text(p -> 'roles')) else '{artist}'::text[] end,
      coalesce((p ->> 'represented')::boolean, false),
      coalesce((p ->> 'formed_by_guild')::boolean, false),
      coalesce((p ->> 'active')::boolean, true),
      coalesce((p ->> 'published')::boolean, false)
    )
    returning id into v_id;
  end if;

  if p ? 'house_split_note' then
    insert into wall.person_terms (person_id, house_split_note)
    values (v_id, nullif(p ->> 'house_split_note', ''))
    on conflict (person_id) do update set house_split_note = excluded.house_split_note;
  end if;

  perform wall.audit(v_actor, 'wall.person.save', 'wall', 'people', v_id, v_before, p);
  return v_id;
end;
$$;

create function api.save_work(p jsonb)
returns uuid
language plpgsql
volatile
security definer
set search_path = wall, authz, admin, pg_temp
as $$
declare
  v_actor uuid := wall.require('wall.manage');
  v_id uuid := nullif(p ->> 'id', '')::uuid;
  v_before jsonb;
begin
  if v_id is not null then
    select to_jsonb(x) into v_before from wall.works x where x.id = v_id;
    if v_before is null then
      raise exception 'Work % does not exist', v_id;
    end if;
    update wall.works set
      slug = p ->> 'slug',
      person_id = (p ->> 'person_id')::uuid,
      title = p ->> 'title',
      title_ne = nullif(p ->> 'title_ne', ''),
      year = nullif(p ->> 'year', '')::int,
      medium = nullif(p ->> 'medium', ''),
      medium_ne = nullif(p ->> 'medium_ne', ''),
      height_mm = nullif(p ->> 'height_mm', '')::int,
      width_mm = nullif(p ->> 'width_mm', '')::int,
      depth_mm = nullif(p ->> 'depth_mm', '')::int,
      price_minor = nullif(p ->> 'price_minor', '')::bigint,
      currency = coalesce(nullif(p ->> 'currency', ''), currency),
      friends_price_minor = nullif(p ->> 'friends_price_minor', '')::bigint,
      availability = coalesce(nullif(p ->> 'availability', ''), availability),
      first_showing = coalesce((p ->> 'first_showing')::boolean, first_showing),
      hallmarked = coalesce((p ->> 'hallmarked')::boolean, hallmarked),
      provenance_note = nullif(p ->> 'provenance_note', ''),
      image_licence = nullif(p ->> 'image_licence', ''),
      may_show_after_sale = coalesce((p ->> 'may_show_after_sale')::boolean, may_show_after_sale),
      published = coalesce((p ->> 'published')::boolean, published)
    where id = v_id;
  else
    insert into wall.works (slug, person_id, title, title_ne, year, medium, medium_ne,
      height_mm, width_mm, depth_mm, price_minor, currency, friends_price_minor, availability,
      first_showing, hallmarked, provenance_note, image_licence, may_show_after_sale, published)
    values (
      p ->> 'slug', (p ->> 'person_id')::uuid, p ->> 'title', nullif(p ->> 'title_ne', ''),
      nullif(p ->> 'year', '')::int, nullif(p ->> 'medium', ''), nullif(p ->> 'medium_ne', ''),
      nullif(p ->> 'height_mm', '')::int, nullif(p ->> 'width_mm', '')::int,
      nullif(p ->> 'depth_mm', '')::int, nullif(p ->> 'price_minor', '')::bigint,
      coalesce(nullif(p ->> 'currency', ''), 'NPR'),
      nullif(p ->> 'friends_price_minor', '')::bigint,
      coalesce(nullif(p ->> 'availability', ''), 'available'),
      coalesce((p ->> 'first_showing')::boolean, false),
      coalesce((p ->> 'hallmarked')::boolean, false),
      nullif(p ->> 'provenance_note', ''), nullif(p ->> 'image_licence', ''),
      coalesce((p ->> 'may_show_after_sale')::boolean, true),
      coalesce((p ->> 'published')::boolean, false)
    )
    returning id into v_id;
  end if;

  perform wall.audit(v_actor, 'wall.work.save', 'wall', 'works', v_id, v_before, p);
  return v_id;
end;
$$;

create function api.save_work_image(p jsonb)
returns uuid
language plpgsql
volatile
security definer
set search_path = wall, authz, admin, pg_temp
as $$
declare
  v_actor uuid := wall.require('wall.manage');
  v_id uuid;
begin
  insert into wall.work_images (work_id, frame, original_path, width, height, variants, alt, photographer)
  values (
    (p ->> 'work_id')::uuid, p ->> 'frame', p ->> 'original_path',
    (p ->> 'width')::int, (p ->> 'height')::int,
    coalesce(p -> 'variants', '[]'::jsonb), p ->> 'alt', p ->> 'photographer'
  )
  on conflict (work_id, frame) do update set
    original_path = excluded.original_path, width = excluded.width, height = excluded.height,
    variants = excluded.variants, alt = excluded.alt, photographer = excluded.photographer
  returning id into v_id;
  perform wall.audit(v_actor, 'wall.work_image.save', 'wall', 'work_images', v_id, null, p);
  return v_id;
end;
$$;

create function api.add_work_event(p_work uuid, p_occurred_on date, p_kind text, p_note text)
returns uuid
language plpgsql
volatile
security definer
set search_path = wall, authz, admin, pg_temp
as $$
declare
  v_actor uuid := wall.require('wall.manage');
  v_id uuid;
begin
  insert into wall.work_events (work_id, occurred_on, kind, note)
  values (p_work, p_occurred_on, p_kind, nullif(btrim(p_note), ''))
  returning id into v_id;
  perform wall.audit(v_actor, 'wall.work_event.add', 'wall', 'work_events', v_id, null,
    jsonb_build_object('work_id', p_work, 'kind', p_kind, 'occurred_on', p_occurred_on));
  return v_id;
end;
$$;

create function api.add_work_text(p_work uuid, p_attribution text, p_body text, p_body_ne text)
returns uuid
language plpgsql
volatile
security definer
set search_path = wall, authz, admin, pg_temp
as $$
declare
  v_actor uuid := wall.require('wall.manage');
  v_id uuid;
begin
  if p_attribution is null or p_attribution not in ('maker', 'house') then
    raise exception 'Text about a work must say whose words it is: the maker''s or the house''s.'
      using errcode = '23514';
  end if;
  insert into wall.work_texts (work_id, attribution, body, body_ne)
  values (p_work, p_attribution, p_body, nullif(btrim(p_body_ne), ''))
  returning id into v_id;
  perform wall.audit(v_actor, 'wall.work_text.add', 'wall', 'work_texts', v_id, null,
    jsonb_build_object('work_id', p_work, 'attribution', p_attribution));
  return v_id;
end;
$$;

create function api.save_show(p jsonb)
returns uuid
language plpgsql
volatile
security definer
set search_path = wall, authz, admin, pg_temp
as $$
declare
  v_actor uuid := wall.require('wall.manage');
  v_id uuid := nullif(p ->> 'id', '')::uuid;
  v_before jsonb;
begin
  if v_id is not null then
    select to_jsonb(x) into v_before from wall.shows x where x.id = v_id;
    if v_before is null then
      raise exception 'Show % does not exist', v_id;
    end if;
    update wall.shows set
      slug = p ->> 'slug',
      title = p ->> 'title',
      title_ne = nullif(p ->> 'title_ne', ''),
      opened_on = (p ->> 'opened_on')::date,
      closed_on = nullif(p ->> 'closed_on', '')::date,
      text = nullif(p ->> 'text', ''),
      text_ne = nullif(p ->> 'text_ne', ''),
      published = coalesce((p ->> 'published')::boolean, published)
    where id = v_id;
  else
    insert into wall.shows (slug, title, title_ne, opened_on, closed_on, text, text_ne, published)
    values (
      p ->> 'slug', p ->> 'title', nullif(p ->> 'title_ne', ''), (p ->> 'opened_on')::date,
      nullif(p ->> 'closed_on', '')::date, nullif(p ->> 'text', ''), nullif(p ->> 'text_ne', ''),
      coalesce((p ->> 'published')::boolean, false)
    )
    returning id into v_id;
  end if;

  -- What hung is a record: works may be added to a show at any time, and
  -- are never removed by this function.
  if p ? 'work_ids' then
    insert into wall.show_works (show_id, work_id)
    select v_id, x::uuid from jsonb_array_elements_text(p -> 'work_ids') x
    on conflict do nothing;
  end if;

  perform wall.audit(v_actor, 'wall.show.save', 'wall', 'shows', v_id, v_before, p);
  return v_id;
end;
$$;

create function api.add_person_exhibition(p_person uuid, p_year int, p_title text, p_place text, p_note text)
returns uuid
language plpgsql
volatile
security definer
set search_path = wall, authz, admin, pg_temp
as $$
declare
  v_actor uuid := wall.require('wall.manage');
  v_id uuid;
begin
  insert into wall.person_exhibitions (person_id, year, title, place, note)
  values (p_person, p_year, p_title, nullif(btrim(p_place), ''), nullif(btrim(p_note), ''))
  returning id into v_id;
  perform wall.audit(v_actor, 'wall.person_exhibition.add', 'wall', 'person_exhibitions', v_id, null,
    jsonb_build_object('person_id', p_person, 'title', p_title));
  return v_id;
end;
$$;

create function api.add_person_writing(p_person uuid, p_year int, p_title text, p_source text, p_url text)
returns uuid
language plpgsql
volatile
security definer
set search_path = wall, authz, admin, pg_temp
as $$
declare
  v_actor uuid := wall.require('wall.manage');
  v_id uuid;
begin
  insert into wall.person_writings (person_id, year, title, source, url)
  values (p_person, p_year, p_title, p_source, nullif(btrim(p_url), ''))
  returning id into v_id;
  perform wall.audit(v_actor, 'wall.person_writing.add', 'wall', 'person_writings', v_id, null,
    jsonb_build_object('person_id', p_person, 'title', p_title));
  return v_id;
end;
$$;

revoke all on function api.save_person, api.save_work, api.save_work_image, api.add_work_event,
  api.add_work_text, api.save_show, api.add_person_exhibition, api.add_person_writing
  from public, anon;
grant execute on function api.save_person(jsonb), api.save_work(jsonb), api.save_work_image(jsonb),
  api.add_work_event(uuid, date, text, text), api.add_work_text(uuid, text, text, text),
  api.save_show(jsonb), api.add_person_exhibition(uuid, int, text, text, text),
  api.add_person_writing(uuid, int, text, text, text)
  to authenticated;
