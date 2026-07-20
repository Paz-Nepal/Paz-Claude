-- 0030_hospitality.sql
--
-- Hospitality: menus, service periods, tables, reservations (Build
-- Readiness Review [12] in the dependency graph — depends on identity;
-- the last domain in the approved build order). Architecture Blueprint
-- §4.6 is the schema sketch this follows.
--
-- Reservation flow (v1.0, per the Blueprint): public request form ->
-- 'requested' -> Hospitality Manager confirms (assigns a table; the
-- exclusion constraint below makes a double-booking a database error, not
-- a race) -> guest is contacted. Auto-confirmation with hard capacity math
-- is explicitly Phase 3 — starting with human confirmation matches both
-- the hospitality philosophy (a person welcomes you, not an algorithm)
-- and operational reality.
--
-- Deliberately NOT here (absent, not stubbed):
-- - Confirmation email (needs the T-067 email-provider decision, same gap
--   noted for membership/programs).
-- - Inventory. Blueprint §4.6: explicitly out of scope for v1.0; menu_items
--   are stable entities inventory can reference later.
-- - Table layout / floor plan UI. `tables.zone` is a free-text hint for the
--   desk board list view, not a visual map.

-- Foundation migration (0001) pre-declares every domain schema empty.
create schema if not exists hospitality;

create type hospitality.reservation_status as enum
  ('requested', 'confirmed', 'seated', 'completed', 'cancelled', 'no_show');

-- ---------------------------------------------------------------------
-- hospitality.menus / menu_sections / menu_items
-- ---------------------------------------------------------------------
create table hospitality.menus (
  id         uuid primary key default gen_random_uuid(),
  slug       text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name       text not null,
  status     text not null default 'draft' check (status in ('draft', 'published')),
  valid_from date,
  valid_to   date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint menus_valid_range check (valid_to is null or valid_from is null or valid_to >= valid_from)
);

create trigger menus_set_updated_at
  before update on hospitality.menus
  for each row execute function public.set_updated_at();

create table hospitality.menu_sections (
  id       uuid primary key default gen_random_uuid(),
  menu_id  uuid not null references hospitality.menus (id) on delete cascade,
  name     text not null,
  position int not null default 0
);

create index menu_sections_menu_idx on hospitality.menu_sections (menu_id, position);

create table hospitality.menu_items (
  id          uuid primary key default gen_random_uuid(),
  section_id  uuid not null references hospitality.menu_sections (id) on delete cascade,
  name        text not null,
  description text,
  price_cents int check (price_cents is null or price_cents >= 0),
  currency    char(3) not null default 'NPR',
  dietary     jsonb not null default '[]'::jsonb,  -- e.g. ["veg","vegan","gluten_free"]
  available   boolean not null default true,
  position    int not null default 0
);

create index menu_items_section_idx on hospitality.menu_items (section_id, position);

alter table hospitality.menus enable row level security;
alter table hospitality.menu_sections enable row level security;
alter table hospitality.menu_items enable row level security;

grant select on hospitality.menus, hospitality.menu_sections, hospitality.menu_items
  to anon, authenticated;
grant insert, update, delete on hospitality.menus, hospitality.menu_sections, hospitality.menu_items
  to authenticated;

create policy menus_select_published on hospitality.menus
  for select to anon, authenticated
  using (
    status = 'published'
    and (valid_from is null or valid_from <= current_date)
    and (valid_to is null or valid_to >= current_date)
  );
create policy menus_select_staff on hospitality.menus
  for select to authenticated
  using ((select authz.has_staff_permission('hospitality.menu.read')));
create policy menus_manage_staff on hospitality.menus
  for all to authenticated
  using ((select authz.has_staff_permission('hospitality.menu.manage')))
  with check ((select authz.has_staff_permission('hospitality.menu.manage')));

create policy menu_sections_select_published on hospitality.menu_sections
  for select to anon, authenticated
  using (
    exists (
      select 1 from hospitality.menus m
      where m.id = menu_id and m.status = 'published'
        and (m.valid_from is null or m.valid_from <= current_date)
        and (m.valid_to is null or m.valid_to >= current_date)
    )
  );
create policy menu_sections_select_staff on hospitality.menu_sections
  for select to authenticated
  using ((select authz.has_staff_permission('hospitality.menu.read')));
create policy menu_sections_manage_staff on hospitality.menu_sections
  for all to authenticated
  using ((select authz.has_staff_permission('hospitality.menu.manage')))
  with check ((select authz.has_staff_permission('hospitality.menu.manage')));

create policy menu_items_select_published on hospitality.menu_items
  for select to anon, authenticated
  using (
    available and exists (
      select 1 from hospitality.menu_sections s
      join hospitality.menus m on m.id = s.menu_id
      where s.id = section_id and m.status = 'published'
        and (m.valid_from is null or m.valid_from <= current_date)
        and (m.valid_to is null or m.valid_to >= current_date)
    )
  );
create policy menu_items_select_staff on hospitality.menu_items
  for select to authenticated
  using ((select authz.has_staff_permission('hospitality.menu.read')));
create policy menu_items_manage_staff on hospitality.menu_items
  for all to authenticated
  using ((select authz.has_staff_permission('hospitality.menu.manage')))
  with check ((select authz.has_staff_permission('hospitality.menu.manage')));

-- ---------------------------------------------------------------------
-- hospitality.service_periods — opening hours (weekday recurring or a
-- one-off date override, e.g. an event closure)
-- ---------------------------------------------------------------------
create table hospitality.service_periods (
  id                     uuid primary key default gen_random_uuid(),
  weekday                int check (weekday between 0 and 6),
  on_date                date,
  opens                  time not null,
  closes                 time not null,
  seating_interval_minutes int not null default 30 check (seating_interval_minutes > 0),
  closed                 boolean not null default false,

  constraint service_periods_one_kind check (
    (weekday is not null and on_date is null) or (weekday is null and on_date is not null)
  ),
  constraint service_periods_valid_hours check (closed or closes > opens)
);

create index service_periods_weekday_idx on hospitality.service_periods (weekday) where weekday is not null;
create index service_periods_date_idx on hospitality.service_periods (on_date) where on_date is not null;

alter table hospitality.service_periods enable row level security;
grant select on hospitality.service_periods to anon, authenticated;
grant insert, update, delete on hospitality.service_periods to authenticated;

create policy service_periods_select_all on hospitality.service_periods
  for select to anon, authenticated using (true);
create policy service_periods_manage_staff on hospitality.service_periods
  for all to authenticated
  using ((select authz.has_staff_permission('hospitality.service.manage')))
  with check ((select authz.has_staff_permission('hospitality.service.manage')));

-- ---------------------------------------------------------------------
-- hospitality.tables — internal desk data, never exposed publicly (spec
-- consistency with the rest of the system: floor layout is an operational
-- detail, not public content)
-- ---------------------------------------------------------------------
create table hospitality.tables (
  id     uuid primary key default gen_random_uuid(),
  name   text not null,
  seats  int not null check (seats > 0),
  zone   text,
  active boolean not null default true
);

alter table hospitality.tables enable row level security;
grant select on hospitality.tables to authenticated;
grant insert, update on hospitality.tables to authenticated;

create policy tables_select_staff on hospitality.tables
  for select to authenticated
  using ((select authz.has_staff_permission('hospitality.reservation.read')));
create policy tables_manage_staff on hospitality.tables
  for all to authenticated
  using ((select authz.has_staff_permission('hospitality.service.manage')))
  with check ((select authz.has_staff_permission('hospitality.service.manage')));

-- tstzrange()'s two-argument form isn't marked immutable (it's STABLE
-- because a 3-argument bounds-inclusivity variant exists that could read
-- config), so the exclusion constraint below needs its own immutable
-- wrapper rather than calling tstzrange() directly in the index expression.
create function hospitality.reservation_span(p_starts_at timestamptz, p_duration_minutes int)
returns tstzrange
language sql
immutable
as $$
  select tstzrange(p_starts_at, p_starts_at + (p_duration_minutes || ' minutes')::interval);
$$;

-- ---------------------------------------------------------------------
-- hospitality.reservations
-- ---------------------------------------------------------------------
create table hospitality.reservations (
  id               uuid primary key default gen_random_uuid(),
  code             text not null unique,
  person_id        uuid references identity.people (id) on delete set null,
  guest_name       text not null,
  guest_phone      text,
  guest_email      citext,
  party_size       int not null check (party_size between 1 and 20),
  starts_at        timestamptz not null,
  duration_minutes int not null default 90 check (duration_minutes > 0),
  status           hospitality.reservation_status not null default 'requested',
  table_id         uuid references hospitality.tables (id) on delete set null,
  notes            text,
  occasion         text,
  created_at       timestamptz not null default now(),

  -- A table can only be double-assigned across non-overlapping time spans.
  -- Cancelled/no-show reservations don't hold the table, and a request with
  -- no table assigned yet (table_id is null) never conflicts with anything.
  exclude using gist (
    table_id with =,
    hospitality.reservation_span(starts_at, duration_minutes) with &&
  ) where (table_id is not null and status not in ('cancelled', 'no_show'))
);
comment on table hospitality.reservations is
  'The exclusion constraint (not an application check) is what makes a '
  'double-booked table impossible under concurrent confirmations -- the '
  'same race-safety principle as programs.sessions capacity, enforced at '
  'the row level instead of a row lock since this is a range overlap, not '
  'a count.';

create index reservations_starts_at_idx on hospitality.reservations (starts_at);
create index reservations_status_starts_idx on hospitality.reservations (status, starts_at);
create index reservations_person_idx on hospitality.reservations (person_id);

alter table hospitality.reservations enable row level security;
grant select on hospitality.reservations to authenticated;
-- No direct insert/update grant: all writes go through
-- hospitality.request_reservation()/set_reservation_status() (security
-- definer) so the exclusion constraint and status rules can't be bypassed
-- by a direct write, same reasoning as programs.registrations.

create policy reservations_select_self on hospitality.reservations
  for select to authenticated
  using (person_id = (select authz.current_person_id()));
create policy reservations_select_staff on hospitality.reservations
  for select to authenticated
  using ((select authz.has_staff_permission('hospitality.reservation.read')));

-- ---------------------------------------------------------------------
-- Schema usage
-- ---------------------------------------------------------------------
grant usage on schema hospitality to anon, authenticated;

-- ---------------------------------------------------------------------
-- hospitality.request_reservation(...) — public intake, same
-- find-or-create-guest pattern as api.register_for_session (0013) and
-- api.submit_membership_application (0010).
-- ---------------------------------------------------------------------
create function hospitality.request_reservation(
  p_full_name text,
  p_email text,
  p_phone text,
  p_party_size int,
  p_starts_at timestamptz,
  p_duration_minutes int,
  p_notes text,
  p_occasion text
)
returns hospitality.reservations
language plpgsql
security definer
set search_path = hospitality, identity, authz, public, pg_temp
as $$
declare
  v_person_id uuid := authz.current_person_id();
  v_code text;
  v_reservation hospitality.reservations;
begin
  if p_full_name is null or btrim(p_full_name) = '' then
    raise exception 'Full name is required';
  end if;
  if p_party_size is null or p_party_size < 1 or p_party_size > 20 then
    raise exception 'Party size must be between 1 and 20';
  end if;
  if p_starts_at is null or p_starts_at <= now() then
    raise exception 'Reservation time must be in the future';
  end if;

  if v_person_id is null and p_email is not null and btrim(p_email) <> '' then
    select id into v_person_id
    from identity.people
    where email = p_email::citext and merged_into is null
    limit 1;

    if v_person_id is null then
      insert into identity.people (full_name, email, phone, source)
      values (p_full_name, p_email, p_phone, 'application')
      returning id into v_person_id;
    end if;
  end if;

  -- gen_random_uuid() (pg_catalog, always available) rather than
  -- pgcrypto's gen_random_bytes(), which lives in a schema whose name
  -- varies by project (extensions here) -- one fewer search_path to pin.
  v_code := 'PZ-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 4));

  insert into hospitality.reservations
    (code, person_id, guest_name, guest_phone, guest_email, party_size,
     starts_at, duration_minutes, notes, occasion)
  values (
    v_code, v_person_id, p_full_name, p_phone, p_email, p_party_size,
    p_starts_at, coalesce(p_duration_minutes, 90), p_notes, p_occasion
  )
  returning * into v_reservation;

  return v_reservation;
end;
$$;

revoke all on function hospitality.request_reservation from public;
grant execute on function hospitality.request_reservation to anon, authenticated;

-- ---------------------------------------------------------------------
-- hospitality.set_reservation_status(...) — the one path for every status
-- change (confirm assigns a table; the exclusion constraint is what
-- actually rejects a double-booking, this function just gives it a
-- friendly error). Self may only cancel their own; every other edge and
-- every other status is staff-only.
-- ---------------------------------------------------------------------
create function hospitality.set_reservation_status(
  p_id uuid,
  p_status hospitality.reservation_status,
  p_table_id uuid
)
returns hospitality.reservations
language plpgsql
security definer
set search_path = hospitality, authz, pg_temp
as $$
declare
  v_res hospitality.reservations;
  v_actor uuid := authz.current_person_id();
begin
  select * into v_res from hospitality.reservations where id = p_id for update;
  if not found then
    raise exception 'Reservation % does not exist', p_id;
  end if;

  if p_status = 'cancelled' and v_res.person_id is not null and v_res.person_id = v_actor then
    -- self-cancel: no staff permission needed
    null;
  elsif not authz.has_staff_permission('hospitality.reservation.manage') then
    raise exception 'Not permitted to change this reservation' using errcode = '42501';
  end if;

  update hospitality.reservations
  set status = p_status,
      table_id = case when p_status = 'confirmed' then coalesce(p_table_id, table_id) else table_id end
  where id = p_id
  returning * into v_res;

  return v_res;
exception
  when exclusion_violation then
    raise exception 'That table is already booked over this time' using errcode = '23P01';
end;
$$;

revoke all on function hospitality.set_reservation_status from public, anon;
grant execute on function hospitality.set_reservation_status to authenticated;

-- ---------------------------------------------------------------------
-- api surface
-- ---------------------------------------------------------------------

-- Public: the current menu, flattened (section + item together) — a
-- small non-technical staff and a quiet public page don't need nested
-- JSON, just an ordered list the page groups by section_name client-side.
create view api.public_menu
with (security_invoker = true)
as
select
  m.id as menu_id, m.slug as menu_slug, m.name as menu_name,
  s.id as section_id, s.name as section_name, s.position as section_position,
  i.id as item_id, i.name as item_name, i.description as item_description,
  i.price_cents, i.currency, i.dietary, i.position as item_position
from hospitality.menu_items i
join hospitality.menu_sections s on s.id = i.section_id
join hospitality.menus m on m.id = s.menu_id
where i.available
order by s.position, i.position;

grant select on api.public_menu to anon, authenticated;

-- Public: opening hours.
create view api.service_periods
with (security_invoker = true)
as
select id, weekday, on_date, opens, closes, seating_interval_minutes, closed
from hospitality.service_periods;

grant select on api.service_periods to anon, authenticated;

-- Public/self-service: request a reservation.
create function api.request_reservation(
  p_full_name text,
  p_email text,
  p_phone text,
  p_party_size int,
  p_starts_at timestamptz,
  p_duration_minutes int,
  p_notes text,
  p_occasion text
)
returns text
language sql
volatile
security invoker
set search_path = hospitality, pg_temp
as $$
  select (hospitality.request_reservation(
    p_full_name, p_email, p_phone, p_party_size, p_starts_at,
    p_duration_minutes, p_notes, p_occasion
  )).code;
$$;

revoke all on function api.request_reservation from public;
grant execute on function api.request_reservation to anon, authenticated;

-- Self-service: my own reservations.
create view api.my_reservations
with (security_invoker = true)
as
select id, code, guest_name, party_size, starts_at, duration_minutes, status, occasion
from hospitality.reservations
where person_id = (select authz.current_person_id());

grant select on api.my_reservations to authenticated;

create function api.cancel_my_reservation(p_id uuid)
returns void
language sql
volatile
security invoker
set search_path = hospitality, pg_temp
as $$
  select (hospitality.set_reservation_status(p_id, 'cancelled', null)).id;
$$;

revoke all on function api.cancel_my_reservation from public, anon;
grant execute on function api.cancel_my_reservation to authenticated;

-- Staff: the desk board — every reservation, newest-starting-soonest first.
create view api.desk_reservations
with (security_invoker = true)
as
select
  r.id, r.code, r.guest_name, r.guest_phone, r.guest_email, r.party_size,
  r.starts_at, r.duration_minutes, r.status, r.table_id, r.notes, r.occasion,
  t.name as table_name
from hospitality.reservations r
left join hospitality.tables t on t.id = r.table_id
order by r.starts_at;

grant select on api.desk_reservations to authenticated;

create function api.set_reservation_status(p_id uuid, p_status hospitality.reservation_status, p_table_id uuid)
returns hospitality.reservation_status
language sql
volatile
security invoker
set search_path = hospitality, pg_temp
as $$
  select (hospitality.set_reservation_status(p_id, p_status, p_table_id)).status;
$$;

revoke all on function api.set_reservation_status from public, anon;
grant execute on function api.set_reservation_status to authenticated;

-- Staff: tables management.
create view api.tables
with (security_invoker = true)
as
select id, name, seats, zone, active from hospitality.tables;

grant select on api.tables to authenticated;

create function api.save_table(p_id uuid, p_name text, p_seats int, p_zone text, p_active boolean)
returns uuid
language plpgsql
security invoker
set search_path = hospitality, pg_temp
as $$
declare
  v_id uuid;
begin
  if p_id is null then
    insert into hospitality.tables (name, seats, zone, active)
    values (p_name, p_seats, p_zone, coalesce(p_active, true))
    returning id into v_id;
  else
    update hospitality.tables
    set name = p_name, seats = p_seats, zone = p_zone, active = coalesce(p_active, active)
    where id = p_id
    returning id into v_id;
  end if;
  return v_id;
end;
$$;

revoke all on function api.save_table from public, anon;
grant execute on function api.save_table to authenticated;

-- Staff: menu + section + item management. security invoker -- the
-- tables' own *_manage_staff policies are the authority.
create view api.admin_menus
with (security_invoker = true)
as
select id, slug, name, status, valid_from, valid_to from hospitality.menus;

grant select on api.admin_menus to authenticated;

create function api.save_menu(
  p_id uuid, p_slug text, p_name text, p_status text, p_valid_from date, p_valid_to date
)
returns uuid
language plpgsql
security invoker
set search_path = hospitality, pg_temp
as $$
declare
  v_id uuid;
begin
  if p_id is null then
    insert into hospitality.menus (slug, name, status, valid_from, valid_to)
    values (p_slug, p_name, coalesce(p_status, 'draft'), p_valid_from, p_valid_to)
    returning id into v_id;
  else
    update hospitality.menus
    set slug = p_slug, name = p_name, status = coalesce(p_status, status),
        valid_from = p_valid_from, valid_to = p_valid_to
    where id = p_id
    returning id into v_id;
  end if;
  return v_id;
end;
$$;

revoke all on function api.save_menu from public, anon;
grant execute on function api.save_menu to authenticated;

create view api.admin_menu_sections
with (security_invoker = true)
as
select id, menu_id, name, position from hospitality.menu_sections;

grant select on api.admin_menu_sections to authenticated;

create function api.save_menu_section(p_id uuid, p_menu_id uuid, p_name text, p_position int)
returns uuid
language plpgsql
security invoker
set search_path = hospitality, pg_temp
as $$
declare
  v_id uuid;
begin
  if p_id is null then
    insert into hospitality.menu_sections (menu_id, name, position)
    values (p_menu_id, p_name, coalesce(p_position, 0))
    returning id into v_id;
  else
    update hospitality.menu_sections
    set name = p_name, position = coalesce(p_position, position)
    where id = p_id
    returning id into v_id;
  end if;
  return v_id;
end;
$$;

revoke all on function api.save_menu_section from public, anon;
grant execute on function api.save_menu_section to authenticated;

create view api.admin_menu_items
with (security_invoker = true)
as
select id, section_id, name, description, price_cents, currency, dietary, available, position
from hospitality.menu_items;

grant select on api.admin_menu_items to authenticated;

create function api.save_menu_item(
  p_id uuid, p_section_id uuid, p_name text, p_description text,
  p_price_cents int, p_dietary jsonb, p_available boolean, p_position int
)
returns uuid
language plpgsql
security invoker
set search_path = hospitality, pg_temp
as $$
declare
  v_id uuid;
begin
  if p_id is null then
    insert into hospitality.menu_items
      (section_id, name, description, price_cents, dietary, available, position)
    values (
      p_section_id, p_name, p_description, p_price_cents,
      coalesce(p_dietary, '[]'::jsonb), coalesce(p_available, true), coalesce(p_position, 0)
    )
    returning id into v_id;
  else
    update hospitality.menu_items
    set name = p_name, description = p_description, price_cents = p_price_cents,
        dietary = coalesce(p_dietary, dietary), available = coalesce(p_available, available),
        position = coalesce(p_position, position)
    where id = p_id
    returning id into v_id;
  end if;
  return v_id;
end;
$$;

revoke all on function api.save_menu_item from public, anon;
grant execute on function api.save_menu_item to authenticated;
