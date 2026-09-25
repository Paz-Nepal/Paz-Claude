-- 0081_house.sql
--
-- The house as a place (docs/website-additions.md, sections A, B2, E1, F1, H2).
--
-- Rooms and their photographs, the things in them and where each came from,
-- what the house would welcome, the reading room's shelves, who is making in
-- the studio, and the days the house keeps. Plus one line, changed from the
-- desk, that says whether anyone is home.
--
-- Same access model as the Wall: base tables are never directly writable and
-- never granted to anon. Staff read them through api.admin_house_* views (RLS
-- narrows to house.manage); every write is a security definer api.* function
-- that checks the permission and writes an audit row. The public reads
-- api.house_* views, which run as their owner with a WHERE clause on
-- published as the only gate (so a giver's name, held back in a column, can
-- be withheld inside the view itself).

create schema if not exists house;
comment on schema house is
  'The house as a place: rooms, things, books, studio months, the days the house keeps.';
grant usage on schema house to authenticated, service_role;

-- ---------------------------------------------------------------------
-- Permission
-- ---------------------------------------------------------------------
insert into authz.permissions (key, description) values
  ('house.manage', 'Keep the house as a place: rooms and their photographs, things and where they came from, what the house would welcome, books, studio months, the days the house keeps.')
on conflict (key) do nothing;

insert into authz.role_permissions (role_key, permission_key)
select r.key, g.permission_key
from (values
  ('super_admin', 'house.manage'),
  ('administrator', 'house.manage'),
  ('editor', 'house.manage')
) as g (role_key, permission_key)
join authz.roles r on r.key = g.role_key
join authz.permissions p on p.key = g.permission_key
on conflict do nothing;

-- ---------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------
create table house.rooms (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name        text not null check (btrim(name) <> ''),
  name_ne     text,
  floor       text,
  note        text,
  note_ne     text,
  sort        int not null default 0,
  published   boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table house.room_images (
  id             uuid primary key default gen_random_uuid(),
  room_id        uuid not null references house.rooms (id) on delete restrict,
  original_path  text not null,
  width          int not null check (width > 0),
  height         int not null check (height > 0),
  variants       jsonb not null default '[]'::jsonb,
  alt            text not null check (btrim(alt) <> ''),
  alt_ne         text,
  -- Every photograph names who made it, as on the Wall.
  photographer   text not null check (btrim(photographer) <> ''),
  sort           int not null default 0,
  created_at     timestamptz not null default now()
);
create index room_images_room_idx on house.room_images (room_id, sort);

create table house.things (
  id                uuid primary key default gen_random_uuid(),
  name              text not null check (btrim(name) <> ''),
  name_ne           text,
  came_from         text,
  came_from_ne      text,
  given_by          text,
  -- A giver's name appears only when they have said yes.
  given_by_shown    boolean not null default false,
  room_id           uuid references house.rooms (id) on delete restrict,
  for_use           boolean not null default false,
  image_path        text,
  image_width       int,
  image_height      int,
  image_variants    jsonb not null default '[]'::jsonb,
  image_alt         text,
  image_photographer text,
  published         boolean not null default false,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  constraint things_image_complete check (
    image_path is null or (
      coalesce(image_width, 0) > 0 and coalesce(image_height, 0) > 0
      and btrim(coalesce(image_alt, '')) <> ''
      and btrim(coalesce(image_photographer, '')) <> ''
    )
  )
);
create index things_room_idx on house.things (room_id);

create table house.wanted (
  id            uuid primary key default gen_random_uuid(),
  kind          text not null default 'thing' check (kind in ('thing', 'book')),
  what          text not null check (btrim(what) <> ''),
  what_ne       text,
  note          text,
  note_ne       text,
  still_wanted  boolean not null default true,
  sort          int not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table house.books (
  id          uuid primary key default gen_random_uuid(),
  title       text not null check (btrim(title) <> ''),
  author      text,
  language    text,
  note        text,
  note_ne     text,
  shelf       text,
  published   boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table house.studio_months (
  id          uuid primary key default gen_random_uuid(),
  person_id   uuid not null references wall.people (id) on delete restrict,
  from_on     date not null,
  to_on       date not null,
  note        text,
  note_ne     text,
  published   boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  check (to_on >= from_on)
);
create index studio_months_from_idx on house.studio_months (from_on desc);

create table house.days (
  id                    uuid primary key default gen_random_uuid(),
  slug                  text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name                  text not null check (btrim(name) <> ''),
  name_ne               text,
  reckoning             text not null check (reckoning in ('nepal_sambat', 'bikram_sambat', 'gregorian')),
  -- How the day is reckoned, in words ("the fourth day after the new moon").
  reckoned_as           text,
  reckoned_as_ne        text,
  what_the_house_does   text,
  what_the_house_does_ne text,
  published             boolean not null default false,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

-- Lunar days move, so each year's date is entered, never computed.
create table house.day_dates (
  id          uuid primary key default gen_random_uuid(),
  day_id      uuid not null references house.days (id) on delete restrict,
  falls_on    date not null,
  -- The Nepal Sambat date as entered text, where the house wants to show it.
  sambat_text text,
  created_at  timestamptz not null default now(),
  unique (day_id, falls_on)
);

-- ---------------------------------------------------------------------
-- updated_at and the house style (no em dash in anything published)
-- ---------------------------------------------------------------------
create trigger rooms_set_updated_at before update on house.rooms
  for each row execute function public.set_updated_at();
create trigger things_set_updated_at before update on house.things
  for each row execute function public.set_updated_at();
create trigger wanted_set_updated_at before update on house.wanted
  for each row execute function public.set_updated_at();
create trigger books_set_updated_at before update on house.books
  for each row execute function public.set_updated_at();
create trigger studio_months_set_updated_at before update on house.studio_months
  for each row execute function public.set_updated_at();
create trigger days_set_updated_at before update on house.days
  for each row execute function public.set_updated_at();

create trigger rooms_reject_em_dash before insert or update on house.rooms
  for each row when (new.published) execute function publishing.reject_em_dash();
create trigger room_images_reject_em_dash before insert or update on house.room_images
  for each row execute function publishing.reject_em_dash();
create trigger things_reject_em_dash before insert or update on house.things
  for each row when (new.published) execute function publishing.reject_em_dash();
create trigger wanted_reject_em_dash before insert or update on house.wanted
  for each row execute function publishing.reject_em_dash();
create trigger books_reject_em_dash before insert or update on house.books
  for each row when (new.published) execute function publishing.reject_em_dash();
create trigger studio_months_reject_em_dash before insert or update on house.studio_months
  for each row when (new.published) execute function publishing.reject_em_dash();
create trigger days_reject_em_dash before insert or update on house.days
  for each row when (new.published) execute function publishing.reject_em_dash();
create trigger day_dates_reject_em_dash before insert or update on house.day_dates
  for each row execute function publishing.reject_em_dash();

-- ---------------------------------------------------------------------
-- Row level security: staff only on the base tables, no anon grant at all.
-- ---------------------------------------------------------------------
alter table house.rooms enable row level security;
alter table house.room_images enable row level security;
alter table house.things enable row level security;
alter table house.wanted enable row level security;
alter table house.books enable row level security;
alter table house.studio_months enable row level security;
alter table house.days enable row level security;
alter table house.day_dates enable row level security;

grant select on house.rooms, house.room_images, house.things, house.wanted,
  house.books, house.studio_months, house.days, house.day_dates to authenticated;

create policy rooms_select_staff on house.rooms
  for select to authenticated using ((select authz.has_staff_permission('house.manage')));
create policy room_images_select_staff on house.room_images
  for select to authenticated using ((select authz.has_staff_permission('house.manage')));
create policy things_select_staff on house.things
  for select to authenticated using ((select authz.has_staff_permission('house.manage')));
create policy wanted_select_staff on house.wanted
  for select to authenticated using ((select authz.has_staff_permission('house.manage')));
create policy books_select_staff on house.books
  for select to authenticated using ((select authz.has_staff_permission('house.manage')));
create policy studio_months_select_staff on house.studio_months
  for select to authenticated using ((select authz.has_staff_permission('house.manage')));
create policy days_select_staff on house.days
  for select to authenticated using ((select authz.has_staff_permission('house.manage')));
create policy day_dates_select_staff on house.day_dates
  for select to authenticated using ((select authz.has_staff_permission('house.manage')));

-- ---------------------------------------------------------------------
-- Public views (run as owner; the WHERE clause is the only gate)
-- ---------------------------------------------------------------------
create view api.house_rooms with (security_invoker = false) as
select r.id, r.slug, r.name, r.name_ne, r.floor, r.note, r.note_ne, r.sort
from house.rooms r
where r.published
order by r.sort, r.name;

create view api.house_room_images with (security_invoker = false) as
select i.id, i.room_id, i.original_path, i.width, i.height, i.variants,
       i.alt, i.alt_ne, i.photographer, i.sort
from house.room_images i
join house.rooms r on r.id = i.room_id
where r.published
order by i.room_id, i.sort, i.created_at;

-- given_by is withheld unless the giver said yes.
create view api.house_things with (security_invoker = false) as
select t.id, t.name, t.name_ne, t.came_from, t.came_from_ne,
       case when t.given_by_shown then t.given_by end as given_by,
       t.room_id, t.for_use,
       t.image_path, t.image_width, t.image_height, t.image_variants,
       t.image_alt, t.image_photographer
from house.things t
where t.published
order by t.name;

create view api.house_wanted with (security_invoker = false) as
select w.id, w.kind, w.what, w.what_ne, w.note, w.note_ne
from house.wanted w
where w.still_wanted
order by w.sort, w.what;

create view api.house_books with (security_invoker = false) as
select b.id, b.title, b.author, b.language, b.note, b.note_ne, b.shelf
from house.books b
where b.published
order by b.shelf nulls last, b.title;

create view api.house_studio_months with (security_invoker = false) as
select m.id, p.slug as person_slug, p.name as person_name,
       m.from_on, m.to_on, m.note, m.note_ne
from house.studio_months m
join wall.people p on p.id = m.person_id
where m.published and p.published
order by m.from_on desc;

create view api.house_days with (security_invoker = false) as
select d.id, d.slug, d.name, d.name_ne, d.reckoning, d.reckoned_as, d.reckoned_as_ne,
       d.what_the_house_does, d.what_the_house_does_ne
from house.days d
where d.published
order by d.name;

create view api.house_day_dates with (security_invoker = false) as
select x.id, x.day_id, x.falls_on, x.sambat_text
from house.day_dates x
join house.days d on d.id = x.day_id
where d.published
order by x.falls_on;

grant select on api.house_rooms, api.house_room_images, api.house_things, api.house_wanted,
  api.house_books, api.house_studio_months, api.house_days, api.house_day_dates
  to anon, authenticated;

-- ---------------------------------------------------------------------
-- Staff views (RLS narrows them to house.manage)
-- ---------------------------------------------------------------------
create view api.admin_house_rooms with (security_invoker = true) as
select * from house.rooms order by sort, name;
create view api.admin_house_room_images with (security_invoker = true) as
select * from house.room_images order by room_id, sort, created_at;
create view api.admin_house_things with (security_invoker = true) as
select * from house.things order by name;
create view api.admin_house_wanted with (security_invoker = true) as
select * from house.wanted order by sort, what;
create view api.admin_house_books with (security_invoker = true) as
select * from house.books order by shelf nulls last, title;
create view api.admin_house_studio_months with (security_invoker = true) as
select * from house.studio_months order by from_on desc;
create view api.admin_house_days with (security_invoker = true) as
select * from house.days order by name;
create view api.admin_house_day_dates with (security_invoker = true) as
select * from house.day_dates order by falls_on;

grant select on api.admin_house_rooms, api.admin_house_room_images, api.admin_house_things,
  api.admin_house_wanted, api.admin_house_books, api.admin_house_studio_months,
  api.admin_house_days, api.admin_house_day_dates to authenticated;

-- ---------------------------------------------------------------------
-- Writes: one function per table, each checks house.manage and audits.
-- An id in the payload updates that row; no id inserts a new one.
-- ---------------------------------------------------------------------
create function api.save_house_room(p jsonb)
returns uuid
language plpgsql
volatile
security definer
set search_path = house, wall, authz, admin, pg_temp
as $$
declare
  v_actor uuid := wall.require('house.manage');
  v_id uuid := coalesce(nullif(p ->> 'id', '')::uuid, gen_random_uuid());
  v_before jsonb;
begin
  select to_jsonb(r) into v_before from house.rooms r where r.id = v_id;
  insert into house.rooms (id, slug, name, name_ne, floor, note, note_ne, sort, published)
  values (
    v_id, btrim(p ->> 'slug'), btrim(p ->> 'name'), nullif(btrim(p ->> 'name_ne'), ''),
    nullif(btrim(p ->> 'floor'), ''), nullif(btrim(p ->> 'note'), ''),
    nullif(btrim(p ->> 'note_ne'), ''), coalesce((p ->> 'sort')::int, 0),
    coalesce((p ->> 'published')::boolean, false)
  )
  on conflict (id) do update set
    slug = excluded.slug, name = excluded.name, name_ne = excluded.name_ne,
    floor = excluded.floor, note = excluded.note, note_ne = excluded.note_ne,
    sort = excluded.sort, published = excluded.published;
  perform wall.audit(v_actor, 'house.room.save', 'house', 'rooms', v_id, v_before, p);
  return v_id;
end;
$$;

create function api.save_house_room_image(p jsonb)
returns uuid
language plpgsql
volatile
security definer
set search_path = house, wall, authz, admin, pg_temp
as $$
declare
  v_actor uuid := wall.require('house.manage');
  v_id uuid := coalesce(nullif(p ->> 'id', '')::uuid, gen_random_uuid());
  v_before jsonb;
begin
  select to_jsonb(i) into v_before from house.room_images i where i.id = v_id;
  insert into house.room_images
    (id, room_id, original_path, width, height, variants, alt, alt_ne, photographer, sort)
  values (
    v_id, (p ->> 'room_id')::uuid, p ->> 'original_path',
    (p ->> 'width')::int, (p ->> 'height')::int, coalesce(p -> 'variants', '[]'::jsonb),
    btrim(p ->> 'alt'), nullif(btrim(p ->> 'alt_ne'), ''), btrim(p ->> 'photographer'),
    coalesce((p ->> 'sort')::int, 0)
  )
  on conflict (id) do update set
    room_id = excluded.room_id, original_path = excluded.original_path,
    width = excluded.width, height = excluded.height, variants = excluded.variants,
    alt = excluded.alt, alt_ne = excluded.alt_ne, photographer = excluded.photographer,
    sort = excluded.sort;
  perform wall.audit(v_actor, 'house.room_image.save', 'house', 'room_images', v_id, v_before, p);
  return v_id;
end;
$$;

create function api.remove_house_room_image(p_id uuid)
returns void
language plpgsql
volatile
security definer
set search_path = house, wall, authz, admin, pg_temp
as $$
declare
  v_actor uuid := wall.require('house.manage');
  v_before jsonb;
begin
  select to_jsonb(i) into v_before from house.room_images i where i.id = p_id;
  delete from house.room_images where id = p_id;
  if v_before is not null then
    perform wall.audit(v_actor, 'house.room_image.remove', 'house', 'room_images', p_id, v_before, null);
  end if;
end;
$$;

create function api.save_house_thing(p jsonb)
returns uuid
language plpgsql
volatile
security definer
set search_path = house, wall, authz, admin, pg_temp
as $$
declare
  v_actor uuid := wall.require('house.manage');
  v_id uuid := coalesce(nullif(p ->> 'id', '')::uuid, gen_random_uuid());
  v_before jsonb;
begin
  select to_jsonb(t) into v_before from house.things t where t.id = v_id;
  insert into house.things
    (id, name, name_ne, came_from, came_from_ne, given_by, given_by_shown, room_id, for_use,
     image_path, image_width, image_height, image_variants, image_alt, image_photographer, published)
  values (
    v_id, btrim(p ->> 'name'), nullif(btrim(p ->> 'name_ne'), ''),
    nullif(btrim(p ->> 'came_from'), ''), nullif(btrim(p ->> 'came_from_ne'), ''),
    nullif(btrim(p ->> 'given_by'), ''), coalesce((p ->> 'given_by_shown')::boolean, false),
    nullif(p ->> 'room_id', '')::uuid, coalesce((p ->> 'for_use')::boolean, false),
    nullif(p ->> 'image_path', ''), nullif(p ->> 'image_width', '')::int,
    nullif(p ->> 'image_height', '')::int, coalesce(p -> 'image_variants', '[]'::jsonb),
    nullif(btrim(p ->> 'image_alt'), ''), nullif(btrim(p ->> 'image_photographer'), ''),
    coalesce((p ->> 'published')::boolean, false)
  )
  on conflict (id) do update set
    name = excluded.name, name_ne = excluded.name_ne, came_from = excluded.came_from,
    came_from_ne = excluded.came_from_ne, given_by = excluded.given_by,
    given_by_shown = excluded.given_by_shown, room_id = excluded.room_id,
    for_use = excluded.for_use, image_path = excluded.image_path,
    image_width = excluded.image_width, image_height = excluded.image_height,
    image_variants = excluded.image_variants, image_alt = excluded.image_alt,
    image_photographer = excluded.image_photographer, published = excluded.published;
  perform wall.audit(v_actor, 'house.thing.save', 'house', 'things', v_id, v_before, p);
  return v_id;
end;
$$;

create function api.save_house_wanted(p jsonb)
returns uuid
language plpgsql
volatile
security definer
set search_path = house, wall, authz, admin, pg_temp
as $$
declare
  v_actor uuid := wall.require('house.manage');
  v_id uuid := coalesce(nullif(p ->> 'id', '')::uuid, gen_random_uuid());
  v_before jsonb;
begin
  select to_jsonb(w) into v_before from house.wanted w where w.id = v_id;
  insert into house.wanted (id, kind, what, what_ne, note, note_ne, still_wanted, sort)
  values (
    v_id, coalesce(nullif(p ->> 'kind', ''), 'thing'), btrim(p ->> 'what'),
    nullif(btrim(p ->> 'what_ne'), ''), nullif(btrim(p ->> 'note'), ''),
    nullif(btrim(p ->> 'note_ne'), ''), coalesce((p ->> 'still_wanted')::boolean, true),
    coalesce((p ->> 'sort')::int, 0)
  )
  on conflict (id) do update set
    kind = excluded.kind, what = excluded.what, what_ne = excluded.what_ne,
    note = excluded.note, note_ne = excluded.note_ne,
    still_wanted = excluded.still_wanted, sort = excluded.sort;
  perform wall.audit(v_actor, 'house.wanted.save', 'house', 'wanted', v_id, v_before, p);
  return v_id;
end;
$$;

create function api.save_house_book(p jsonb)
returns uuid
language plpgsql
volatile
security definer
set search_path = house, wall, authz, admin, pg_temp
as $$
declare
  v_actor uuid := wall.require('house.manage');
  v_id uuid := coalesce(nullif(p ->> 'id', '')::uuid, gen_random_uuid());
  v_before jsonb;
begin
  select to_jsonb(b) into v_before from house.books b where b.id = v_id;
  insert into house.books (id, title, author, language, note, note_ne, shelf, published)
  values (
    v_id, btrim(p ->> 'title'), nullif(btrim(p ->> 'author'), ''),
    nullif(btrim(p ->> 'language'), ''), nullif(btrim(p ->> 'note'), ''),
    nullif(btrim(p ->> 'note_ne'), ''), nullif(btrim(p ->> 'shelf'), ''),
    coalesce((p ->> 'published')::boolean, false)
  )
  on conflict (id) do update set
    title = excluded.title, author = excluded.author, language = excluded.language,
    note = excluded.note, note_ne = excluded.note_ne, shelf = excluded.shelf,
    published = excluded.published;
  perform wall.audit(v_actor, 'house.book.save', 'house', 'books', v_id, v_before, p);
  return v_id;
end;
$$;

create function api.save_house_studio_month(p jsonb)
returns uuid
language plpgsql
volatile
security definer
set search_path = house, wall, authz, admin, pg_temp
as $$
declare
  v_actor uuid := wall.require('house.manage');
  v_id uuid := coalesce(nullif(p ->> 'id', '')::uuid, gen_random_uuid());
  v_before jsonb;
begin
  select to_jsonb(m) into v_before from house.studio_months m where m.id = v_id;
  insert into house.studio_months (id, person_id, from_on, to_on, note, note_ne, published)
  values (
    v_id, (p ->> 'person_id')::uuid, (p ->> 'from_on')::date, (p ->> 'to_on')::date,
    nullif(btrim(p ->> 'note'), ''), nullif(btrim(p ->> 'note_ne'), ''),
    coalesce((p ->> 'published')::boolean, false)
  )
  on conflict (id) do update set
    person_id = excluded.person_id, from_on = excluded.from_on, to_on = excluded.to_on,
    note = excluded.note, note_ne = excluded.note_ne, published = excluded.published;
  perform wall.audit(v_actor, 'house.studio_month.save', 'house', 'studio_months', v_id, v_before, p);
  return v_id;
end;
$$;

create function api.save_house_day(p jsonb)
returns uuid
language plpgsql
volatile
security definer
set search_path = house, wall, authz, admin, pg_temp
as $$
declare
  v_actor uuid := wall.require('house.manage');
  v_id uuid := coalesce(nullif(p ->> 'id', '')::uuid, gen_random_uuid());
  v_before jsonb;
begin
  select to_jsonb(d) into v_before from house.days d where d.id = v_id;
  insert into house.days
    (id, slug, name, name_ne, reckoning, reckoned_as, reckoned_as_ne,
     what_the_house_does, what_the_house_does_ne, published)
  values (
    v_id, btrim(p ->> 'slug'), btrim(p ->> 'name'), nullif(btrim(p ->> 'name_ne'), ''),
    p ->> 'reckoning', nullif(btrim(p ->> 'reckoned_as'), ''),
    nullif(btrim(p ->> 'reckoned_as_ne'), ''), nullif(btrim(p ->> 'what_the_house_does'), ''),
    nullif(btrim(p ->> 'what_the_house_does_ne'), ''),
    coalesce((p ->> 'published')::boolean, false)
  )
  on conflict (id) do update set
    slug = excluded.slug, name = excluded.name, name_ne = excluded.name_ne,
    reckoning = excluded.reckoning, reckoned_as = excluded.reckoned_as,
    reckoned_as_ne = excluded.reckoned_as_ne,
    what_the_house_does = excluded.what_the_house_does,
    what_the_house_does_ne = excluded.what_the_house_does_ne,
    published = excluded.published;
  perform wall.audit(v_actor, 'house.day.save', 'house', 'days', v_id, v_before, p);
  return v_id;
end;
$$;

create function api.save_house_day_date(p jsonb)
returns uuid
language plpgsql
volatile
security definer
set search_path = house, wall, authz, admin, pg_temp
as $$
declare
  v_actor uuid := wall.require('house.manage');
  v_id uuid := coalesce(nullif(p ->> 'id', '')::uuid, gen_random_uuid());
  v_before jsonb;
begin
  select to_jsonb(x) into v_before from house.day_dates x where x.id = v_id;
  insert into house.day_dates (id, day_id, falls_on, sambat_text)
  values (
    v_id, (p ->> 'day_id')::uuid, (p ->> 'falls_on')::date, nullif(btrim(p ->> 'sambat_text'), '')
  )
  on conflict (id) do update set
    day_id = excluded.day_id, falls_on = excluded.falls_on, sambat_text = excluded.sambat_text;
  perform wall.audit(v_actor, 'house.day_date.save', 'house', 'day_dates', v_id, v_before, p);
  return v_id;
end;
$$;

create function api.remove_house_day_date(p_id uuid)
returns void
language plpgsql
volatile
security definer
set search_path = house, wall, authz, admin, pg_temp
as $$
declare
  v_actor uuid := wall.require('house.manage');
  v_before jsonb;
begin
  select to_jsonb(x) into v_before from house.day_dates x where x.id = p_id;
  delete from house.day_dates where id = p_id;
  if v_before is not null then
    perform wall.audit(v_actor, 'house.day_date.remove', 'house', 'day_dates', p_id, v_before, null);
  end if;
end;
$$;

revoke all on function
  api.save_house_room(jsonb), api.save_house_room_image(jsonb), api.remove_house_room_image(uuid),
  api.save_house_thing(jsonb), api.save_house_wanted(jsonb), api.save_house_book(jsonb),
  api.save_house_studio_month(jsonb), api.save_house_day(jsonb), api.save_house_day_date(jsonb),
  api.remove_house_day_date(uuid)
  from public, anon;
grant execute on function
  api.save_house_room(jsonb), api.save_house_room_image(jsonb), api.remove_house_room_image(uuid),
  api.save_house_thing(jsonb), api.save_house_wanted(jsonb), api.save_house_book(jsonb),
  api.save_house_studio_month(jsonb), api.save_house_day(jsonb), api.save_house_day_date(jsonb),
  api.remove_house_day_date(uuid)
  to authenticated;

-- ---------------------------------------------------------------------
-- Is anyone home: one line, changed from the desk
-- ---------------------------------------------------------------------
-- Three settings: house.status, house.status_ne, and house.status_set_at
-- (written by the save, so the page can say "as of 10:05"). Both blank clears
-- all three.
create function api.set_house_status(p_status text, p_status_ne text)
returns void
language plpgsql
volatile
security definer
set search_path = admin, wall, authz, pg_temp
as $$
declare
  v_actor uuid := wall.require('admin.settings.manage');
  v_en text := nullif(btrim(coalesce(p_status, '')), '');
  v_ne text := nullif(btrim(coalesce(p_status_ne, '')), '');
begin
  if position(chr(8212) in coalesce(v_en, '') || coalesce(v_ne, '')) > 0 then
    raise exception 'An em dash cannot be published. Rewrite the sentence without one.'
      using errcode = '23514';
  end if;

  if v_en is null and v_ne is null then
    delete from admin.settings
    where key in ('house.status', 'house.status_ne', 'house.status_set_at');
    perform wall.audit(v_actor, 'house.status.clear', 'admin', 'settings', null, null, null);
    return;
  end if;

  insert into admin.settings (key, value, updated_by) values
    ('house.status', to_jsonb(coalesce(v_en, '')), v_actor),
    ('house.status_ne', to_jsonb(coalesce(v_ne, '')), v_actor),
    ('house.status_set_at', to_jsonb(now()), v_actor)
  on conflict (key) do update
    set value = excluded.value, updated_by = excluded.updated_by;
  perform wall.audit(v_actor, 'house.status.set', 'admin', 'settings', null, null,
    jsonb_build_object('en', v_en, 'ne', v_ne));
end;
$$;
revoke all on function api.set_house_status(text, text) from public, anon;
grant execute on function api.set_house_status(text, text) to authenticated;

-- The public whitelist grows by exactly these three keys.
create or replace function api.site_info()
returns jsonb
language sql
stable
security definer
set search_path = admin, pg_temp
as $$
  select coalesce(jsonb_object_agg(key, value), '{}'::jsonb)
  from admin.settings
  where key in ('site.name', 'site.tagline', 'site.contact_email',
                'house.status', 'house.status_ne', 'house.status_set_at');
$$;
comment on function api.site_info() is
  'security definer with a hard-coded whitelist: exactly these keys are '
  'public. Everything else in admin.settings stays staff-only.';
