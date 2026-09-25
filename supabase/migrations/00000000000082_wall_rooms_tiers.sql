-- 0082_wall_rooms_tiers.sql
--
-- The Wall as the house's walls (docs/website-additions.md B1, B4, F2, F3).
--
--   * Each work records the room it hangs in today.
--   * A painter is early or signed; an early painter's work shows the house
--     price unless the work sets its own, stated once on the Wall.
--   * Anyone can check a certificate (a work number) or a hallmark (a maker's
--     mark or year letter) and read only what the house already says in public:
--     never a buyer, never a price paid.
--
-- Also here: the public whitelist in api.site_info() gains the two settings
-- these parts need (wall.early_price_minor, sattal.rate_minor).

-- The public functions below call into house.rooms through a definer helper,
-- so anon needs to be able to resolve the schema (it still has no table grants).
grant usage on schema house to anon;

-- ---------------------------------------------------------------------
-- Rooms and tiers
-- ---------------------------------------------------------------------
alter table wall.works
  add column if not exists room_id uuid references house.rooms (id) on delete restrict;
create index if not exists works_room_idx on wall.works (room_id);

alter table wall.people
  add column if not exists tier text check (tier in ('early', 'signed'));

-- A room is only ever shown when it is published.
create function house.room_is_published(p_room uuid)
returns boolean
language sql
stable
security definer
set search_path = house, pg_temp
as $$
  select exists (select 1 from house.rooms r where r.id = p_room and r.published);
$$;
revoke all on function house.room_is_published(uuid) from public;
grant execute on function house.room_is_published(uuid) to anon, authenticated, service_role;

-- The early-painter house price, from the settings table (null until set).
create function wall.early_price_minor()
returns bigint
language sql
stable
security definer
set search_path = admin, pg_temp
as $$
  select (s.value #>> '{}')::bigint from admin.settings s where s.key = 'wall.early_price_minor';
$$;
revoke all on function wall.early_price_minor() from public;
grant execute on function wall.early_price_minor() to anon, authenticated, service_role;

-- ---------------------------------------------------------------------
-- Views: append the new columns (existing columns keep their positions)
-- ---------------------------------------------------------------------
create or replace view api.wall_people with (security_invoker = true) as
select id, slug, name, name_ne, statement, statement_ne, roles, represented,
       formed_by_guild, active, tier
from wall.people p
order by name;

create or replace view api.admin_wall_people with (security_invoker = true) as
select p.id, p.slug, p.name, p.name_ne, p.statement, p.statement_ne, p.roles, p.represented,
       p.formed_by_guild, p.active, p.published, p.created_at, p.updated_at,
       t.house_split_note, p.tier
from wall.people p
left join wall.person_terms t on t.person_id = p.id
order by p.name;

create or replace view api.wall_works with (security_invoker = true) as
select w.id, w.slug, w.work_number, w.person_id,
       p.slug as person_slug, p.name as person_name, p.name_ne as person_name_ne,
       p.formed_by_guild as person_formed_by_guild, p.active as person_active,
       w.title, w.title_ne, w.year, w.medium, w.medium_ne,
       w.height_mm, w.width_mm, w.depth_mm,
       case when w.availability = 'available'
            then coalesce(w.price_minor, case when p.tier = 'early' then wall.early_price_minor() end)
       end as price_minor,
       case when w.availability = 'available' then w.friends_price_minor end as friends_price_minor,
       w.currency, w.availability, w.hallmarked, w.provenance_note,
       case when house.room_is_published(w.room_id) then w.room_id end as room_id
from wall.works w
join wall.people p on p.id = w.person_id
order by w.work_number;

create or replace view api.admin_wall_works with (security_invoker = true) as
select w.id, w.slug, w.work_number, w.person_id, w.title, w.title_ne, w.year, w.medium,
       w.medium_ne, w.height_mm, w.width_mm, w.depth_mm, w.price_minor, w.currency,
       w.friends_price_minor, w.availability, w.first_showing, w.hallmarked,
       w.provenance_note, w.image_licence, w.may_show_after_sale, w.published,
       w.created_at, w.updated_at, p.name as person_name, w.room_id
from wall.works w
join wall.people p on p.id = w.person_id
order by w.work_number desc;

-- ---------------------------------------------------------------------
-- Writes: the two save functions learn the new fields. A payload without the
-- key leaves the stored value alone, so older callers keep working.
-- ---------------------------------------------------------------------
create or replace function api.save_person(p jsonb)
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
      published = coalesce((p ->> 'published')::boolean, published),
      tier = case when p ? 'tier' then nullif(p ->> 'tier', '') else tier end
    where id = v_id;
  else
    insert into wall.people (slug, name, name_ne, statement, statement_ne, roles,
      represented, formed_by_guild, active, published, tier)
    values (
      p ->> 'slug', p ->> 'name', nullif(p ->> 'name_ne', ''),
      nullif(p ->> 'statement', ''), nullif(p ->> 'statement_ne', ''),
      case when p ? 'roles' then array(select jsonb_array_elements_text(p -> 'roles')) else '{artist}'::text[] end,
      coalesce((p ->> 'represented')::boolean, false),
      coalesce((p ->> 'formed_by_guild')::boolean, false),
      coalesce((p ->> 'active')::boolean, true),
      coalesce((p ->> 'published')::boolean, false),
      nullif(p ->> 'tier', '')
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

create or replace function api.save_work(p jsonb)
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
      published = coalesce((p ->> 'published')::boolean, published),
      room_id = case when p ? 'room_id' then nullif(p ->> 'room_id', '')::uuid else room_id end
    where id = v_id;
  else
    insert into wall.works (slug, person_id, title, title_ne, year, medium, medium_ne,
      height_mm, width_mm, depth_mm, price_minor, currency, friends_price_minor, availability,
      first_showing, hallmarked, provenance_note, image_licence, may_show_after_sale, published,
      room_id)
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
      coalesce((p ->> 'published')::boolean, false),
      nullif(p ->> 'room_id', '')::uuid
    )
    returning id into v_id;
  end if;

  perform wall.audit(v_actor, 'wall.work.save', 'wall', 'works', v_id, v_before, p);
  return v_id;
end;
$$;

-- ---------------------------------------------------------------------
-- F2. Check a certificate
-- ---------------------------------------------------------------------
-- What the house says in public about a numbered work, and nothing else: no
-- buyer, no price paid. A sale appears in the work's life as a date only.
create function api.verify_work(p_number int)
returns table (
  work_number int, slug text, title text, title_ne text, year int,
  medium text, medium_ne text, height_mm int, width_mm int, depth_mm int,
  person_slug text, person_name text, person_name_ne text,
  hallmarked boolean, mark_description text, year_letter text,
  events jsonb
)
language sql
stable
security definer
set search_path = wall, guild, pg_temp
as $$
  select w.work_number, w.slug, w.title, w.title_ne, w.year, w.medium, w.medium_ne,
         w.height_mm, w.width_mm, w.depth_mm,
         p.slug, p.name, p.name_ne,
         w.hallmarked,
         case when w.hallmarked then m.mark_description end,
         case when w.hallmarked then m.year_letter end,
         coalesce((
           select jsonb_agg(
             jsonb_build_object(
               'occurred_on', e.occurred_on,
               'kind', e.kind,
               'note', case when e.kind = 'sold' then null else e.note end
             ) order by e.occurred_on, e.recorded_at)
           from wall.work_events e where e.work_id = w.id
         ), '[]'::jsonb)
  from wall.works w
  join wall.people p on p.id = w.person_id
  left join guild.makers m on m.person_id = p.id and m.published
  where w.work_number = p_number and w.published
  limit 1;
$$;
comment on function api.verify_work(int) is
  'Public. Only what the house already shows on the work''s own page. '
  'Never the buyer, never a price paid; a sale is a date with no note.';
revoke all on function api.verify_work(int) from public;
grant execute on function api.verify_work(int) to anon, authenticated, service_role;

-- ---------------------------------------------------------------------
-- F3. Check a hallmark
-- ---------------------------------------------------------------------
create function api.verify_hallmark(p_query text)
returns table (
  person_slug text, person_name text, person_name_ne text, stage text,
  mark_description text, year_letter text, registered_on date,
  destroyed_on date, punch_status text
)
language sql
stable
security definer
set search_path = guild, wall, pg_temp
as $$
  with pat as (
    select '%' || replace(replace(replace(btrim(coalesce(p_query, '')), '\', '\\'), '%', '\%'), '_', '\_') || '%' as p
  )
  select p.slug, p.name, p.name_ne, m.stage, m.mark_description, m.year_letter,
         m.registered_on,
         (select max(d.destroyed_on) from guild.punch_destructions d where d.maker_id = m.id),
         case when exists (select 1 from guild.punch_destructions d where d.maker_id = m.id)
              then 'destroyed' else 'in use' end
  from guild.makers m
  join wall.people p on p.id = m.person_id, pat
  where m.published and btrim(coalesce(p_query, '')) <> ''
    and (m.mark_description ilike pat.p or m.year_letter ilike pat.p
         or p.name ilike pat.p or p.name_ne ilike pat.p)
  order by m.registered_on nulls last, p.name
  limit 20;
$$;
comment on function api.verify_hallmark(text) is
  'Public. Answers from the published hallmark register: in use, or the punch destroyed.';
revoke all on function api.verify_hallmark(text) from public;
grant execute on function api.verify_hallmark(text) to anon, authenticated, service_role;

-- ---------------------------------------------------------------------
-- Public settings whitelist: the two settings this part reads
-- ---------------------------------------------------------------------
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
                'house.status', 'house.status_ne', 'house.status_set_at',
                'wall.early_price_minor', 'sattal.rate_minor');
$$;
comment on function api.site_info() is
  'security definer with a hard-coded whitelist: exactly these keys are '
  'public. Everything else in admin.settings stays staff-only.';
