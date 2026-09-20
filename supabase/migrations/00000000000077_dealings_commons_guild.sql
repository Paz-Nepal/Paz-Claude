-- 0077_dealings_commons_guild.sql
--
-- Build Programme 7, 8, 9.
--
--   * enquiry to delivery: a dealing carries a sale from enquiry through
--     quote, acceptance, invoice, dispatch and arrival, and writes the
--     work's life as it goes;
--   * agreements and the split recorded against every work, published or not;
--   * the Commons register, Tables kept, the concurrence roll, the Assembly;
--   * the Guild's hallmark register and destroyed punches.
--
-- The Commons register is built so that a rung can never be set by a
-- payment or an application: no function in the commons schema, and none of
-- the api functions here, reads anything from the membership schema, so a
-- Friends tier cannot reach a rung. A test asserts it.

-- ---------------------------------------------------------------------
-- 1. Wall: the life of a work gains dispatch and arrival
-- ---------------------------------------------------------------------
alter table wall.work_events drop constraint work_events_kind_check;
alter table wall.work_events add constraint work_events_kind_check
  check (kind in ('made', 'shown', 'sold', 'loaned', 'returned', 'damaged', 'restored',
    'rehoused', 'dispatched', 'arrived'));

-- Agreements and the split, recorded against every work whether or not it
-- is published. Staff only.
create table wall.work_terms (
  work_id          uuid primary key references wall.works (id) on delete restrict,
  agreement_kind   text check (agreement_kind in ('consignment', 'representation', 'own')),
  agreement_ref    text,
  agreed_on        date,
  house_split_note text
);
alter table wall.work_terms enable row level security;
grant select on wall.work_terms to authenticated;
create policy work_terms_select_staff on wall.work_terms
  for select to authenticated using ((select authz.has_staff_permission('wall.manage')));

create function api.save_work_terms(p jsonb)
returns uuid
language plpgsql
volatile
security definer
set search_path = wall, authz, admin, pg_temp
as $$
declare
  v_actor uuid := wall.require('wall.manage');
  v_work uuid := (p ->> 'work_id')::uuid;
begin
  insert into wall.work_terms (work_id, agreement_kind, agreement_ref, agreed_on, house_split_note)
  values (v_work, nullif(p ->> 'agreement_kind', ''), nullif(p ->> 'agreement_ref', ''),
    nullif(p ->> 'agreed_on', '')::date, nullif(p ->> 'house_split_note', ''))
  on conflict (work_id) do update set
    agreement_kind = excluded.agreement_kind, agreement_ref = excluded.agreement_ref,
    agreed_on = excluded.agreed_on, house_split_note = excluded.house_split_note;
  perform wall.audit(v_actor, 'wall.work_terms.save', 'wall', 'work_terms', v_work, null, p);
  return v_work;
end;
$$;
revoke all on function api.save_work_terms from public, anon;
grant execute on function api.save_work_terms(jsonb) to authenticated;

create view api.admin_work_terms with (security_invoker = true) as
select * from wall.work_terms;
grant select on api.admin_work_terms to authenticated;

-- ---------------------------------------------------------------------
-- 2. Dealings: enquiry to delivery. Staff only.
-- ---------------------------------------------------------------------
create sequence wall.invoice_no_seq start 1;

create table wall.dealings (
  id                   uuid primary key default gen_random_uuid(),
  work_id              uuid not null references wall.works (id) on delete restrict,
  enquiry_id           uuid references admin.contact_messages (id) on delete set null,
  buyer_name           text not null check (btrim(buyer_name) <> ''),
  buyer_email          text,
  buyer_country        text,
  stage                text not null default 'enquiry'
                       check (stage in ('enquiry', 'quoted', 'accepted', 'invoiced',
                                        'dispatched', 'arrived', 'closed', 'lapsed')),
  -- The quote itemises price, framing or rolling, shipping and customs.
  quote                jsonb not null default '{}'::jsonb,
  quoted_on            date,
  accepted_on          date,
  -- PAZ MODERN PVT LTD appears on the invoice and nowhere else.
  invoice_no           text unique,
  invoiced_on          date,
  customs_description  text,
  declared_value_minor bigint,
  carrier              text,
  tracking             text,
  dispatched_on        date,
  arrived_on           date,
  notes                text,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  -- A customs description never understates value.
  constraint dealings_declared_not_understated check (
    declared_value_minor is null
    or nullif(quote ->> 'price_minor', '') is null
    or declared_value_minor >= (quote ->> 'price_minor')::bigint
  )
);
create index dealings_work_idx on wall.dealings (work_id);
create trigger dealings_set_updated_at before update on wall.dealings
  for each row execute function public.set_updated_at();
alter table wall.dealings enable row level security;
grant select on wall.dealings to authenticated;
create policy dealings_select_staff on wall.dealings
  for select to authenticated using ((select authz.has_staff_permission('wall.manage')));

create view api.admin_dealings with (security_invoker = true) as
select d.*, w.title as work_title, w.work_number, p.name as person_name, w.price_minor as list_price_minor
from wall.dealings d
join wall.works w on w.id = d.work_id
join wall.people p on p.id = w.person_id
order by d.created_at desc;
grant select on api.admin_dealings to authenticated;

create function api.save_dealing(p jsonb)
returns uuid
language plpgsql
volatile
security definer
set search_path = wall, authz, admin, pg_temp
as $$
declare
  v_actor uuid := wall.require('wall.manage');
  v_id uuid := nullif(p ->> 'id', '')::uuid;
begin
  if v_id is not null then
    update wall.dealings set
      buyer_name = p ->> 'buyer_name', buyer_email = nullif(p ->> 'buyer_email', ''),
      buyer_country = nullif(p ->> 'buyer_country', ''),
      quote = coalesce(p -> 'quote', quote),
      quoted_on = nullif(p ->> 'quoted_on', '')::date,
      customs_description = nullif(p ->> 'customs_description', ''),
      declared_value_minor = nullif(p ->> 'declared_value_minor', '')::bigint,
      carrier = nullif(p ->> 'carrier', ''), tracking = nullif(p ->> 'tracking', ''),
      notes = nullif(p ->> 'notes', '')
    where id = v_id;
    if not found then raise exception 'Dealing % does not exist', v_id; end if;
  else
    insert into wall.dealings (work_id, enquiry_id, buyer_name, buyer_email, buyer_country, quote,
      quoted_on, customs_description, declared_value_minor, carrier, tracking, notes)
    values ((p ->> 'work_id')::uuid, nullif(p ->> 'enquiry_id', '')::uuid, p ->> 'buyer_name',
      nullif(p ->> 'buyer_email', ''), nullif(p ->> 'buyer_country', ''),
      coalesce(p -> 'quote', '{}'::jsonb), nullif(p ->> 'quoted_on', '')::date,
      nullif(p ->> 'customs_description', ''), nullif(p ->> 'declared_value_minor', '')::bigint,
      nullif(p ->> 'carrier', ''), nullif(p ->> 'tracking', ''), nullif(p ->> 'notes', ''))
    returning id into v_id;
  end if;
  perform wall.audit(v_actor, 'wall.dealing.save', 'wall', 'dealings', v_id, null,
    jsonb_build_object('work_id', p ->> 'work_id'));
  return v_id;
end;
$$;

-- Moves a dealing to its next stage and writes the work's life as it goes:
-- acceptance is the sale, dispatch and arrival are recorded against the work.
create function api.record_dealing_stage(p_id uuid, p_stage text, p_on date default current_date)
returns text
language plpgsql
volatile
security definer
set search_path = wall, authz, admin, pg_temp
as $$
declare
  v_actor uuid := wall.require('wall.manage');
  v_d wall.dealings;
begin
  select * into v_d from wall.dealings where id = p_id for update;
  if not found then raise exception 'Dealing % does not exist', p_id; end if;

  if p_stage = 'quoted' then
    update wall.dealings set stage = 'quoted', quoted_on = p_on where id = p_id;
  elsif p_stage = 'accepted' then
    update wall.dealings set stage = 'accepted', accepted_on = p_on where id = p_id;
    update wall.works set availability = 'sold' where id = v_d.work_id;
    insert into wall.work_events (work_id, occurred_on, kind, note)
    values (v_d.work_id, p_on, 'sold', null);
  elsif p_stage = 'invoiced' then
    update wall.dealings set stage = 'invoiced', invoiced_on = p_on,
      invoice_no = coalesce(invoice_no, 'PMI-' || lpad(nextval('wall.invoice_no_seq')::text, 5, '0'))
    where id = p_id;
  elsif p_stage = 'dispatched' then
    update wall.dealings set stage = 'dispatched', dispatched_on = p_on where id = p_id;
    insert into wall.work_events (work_id, occurred_on, kind, note)
    values (v_d.work_id, p_on, 'dispatched', null);
  elsif p_stage = 'arrived' then
    update wall.dealings set stage = 'arrived', arrived_on = p_on where id = p_id;
    insert into wall.work_events (work_id, occurred_on, kind, note)
    values (v_d.work_id, p_on, 'arrived', null);
  elsif p_stage in ('closed', 'lapsed') then
    update wall.dealings set stage = p_stage where id = p_id;
  else
    raise exception 'Unknown stage %', p_stage;
  end if;
  perform wall.audit(v_actor, 'wall.dealing.stage', 'wall', 'dealings', p_id,
    jsonb_build_object('stage', v_d.stage), jsonb_build_object('stage', p_stage, 'on', p_on));
  return p_stage;
end;
$$;
revoke all on function api.save_dealing, api.record_dealing_stage from public, anon;
grant execute on function api.save_dealing(jsonb), api.record_dealing_stage(uuid, text, date)
  to authenticated;

-- ---------------------------------------------------------------------
-- 3. The Commons register
-- ---------------------------------------------------------------------
create schema if not exists commons;
comment on schema commons is
  'The covenanted ring. A register the house keeps: belonging is entered by presence and by saying the covenant words, never bought.';
grant usage on schema commons to authenticated, service_role;

create table commons.people (
  person_id         uuid primary key references identity.people (id) on delete restrict,
  rung              text not null
                    check (rung in ('guest', 'companion', 'denizen', 'steward', 'elder', 'ancestor')),
  rung_since        date not null default current_date,
  covenant_said_on  date,
  abroad            boolean not null default false,
  dues_band         text,
  released_on       date,
  release_reason    text,
  deceased_on       date,
  -- The only path to Denizen or beyond is a recorded covenant date entered
  -- by the house. No payment, no application, no purchase.
  constraint commons_rung_needs_covenant check (
    rung in ('guest', 'companion') or covenant_said_on is not null
  ),
  constraint commons_release_has_grounds check (
    released_on is null or nullif(btrim(release_reason), '') is not null
  )
);
alter table commons.people enable row level security;
grant select on commons.people to authenticated;
create policy commons_people_staff on commons.people
  for select to authenticated using ((select authz.has_staff_permission('commons.manage')));

create table commons.tables_kept (
  id                 uuid primary key default gen_random_uuid(),
  held_on            date not null,
  place              text,
  kept_by_person_id  uuid not null references commons.people (person_id) on delete restrict,
  confirmed_on       date,
  chronicle_line_id  uuid references publishing.chronicle_lines (id) on delete restrict,
  created_at         timestamptz not null default now()
  -- Deliberately nothing about who attended.
);
alter table commons.tables_kept enable row level security;
grant select on commons.tables_kept to authenticated;
create policy tables_kept_staff on commons.tables_kept
  for select to authenticated using ((select authz.has_staff_permission('commons.manage')));

create table commons.assemblies (
  id            uuid primary key default gen_random_uuid(),
  held_on       date not null,
  roll_size     int,
  notes         text,
  created_at    timestamptz not null default now()
);
create table commons.motions (
  id                uuid primary key default gen_random_uuid(),
  assembly_id       uuid not null references commons.assemblies (id) on delete restrict,
  text              text not null check (btrim(text) <> ''),
  threshold         text not null,
  touches_entrenched boolean not null default false,
  extraordinary     boolean not null default false,
  votes_for         int,
  votes_against     int,
  abstentions       int,
  outcome           text check (outcome in ('carried', 'failed', 'withdrawn')),
  -- The outcome is written as a canon amendment by addition.
  amendment_ref     text,
  created_at        timestamptz not null default now()
);
alter table commons.assemblies enable row level security;
alter table commons.motions enable row level security;
grant select on commons.assemblies, commons.motions to authenticated;
create policy assemblies_staff on commons.assemblies
  for select to authenticated using ((select authz.has_staff_permission('commons.manage')));
create policy motions_staff on commons.motions
  for select to authenticated using ((select authz.has_staff_permission('commons.manage')));

create view api.commons_register with (security_invoker = true) as
select c.*, identity.display_name(c.person_id) as name
from commons.people c
order by c.rung, name;
grant select on api.commons_register to authenticated;

create view api.commons_tables_kept with (security_invoker = true) as
select t.*, identity.display_name(t.kept_by_person_id) as kept_by
from commons.tables_kept t
order by t.held_on desc;
grant select on api.commons_tables_kept to authenticated;

create function api.save_commons_person(p jsonb)
returns uuid
language plpgsql
volatile
security definer
set search_path = commons, wall, authz, admin, pg_temp
as $$
declare
  v_actor uuid := wall.require('commons.manage');
  v_person uuid := (p ->> 'person_id')::uuid;
begin
  insert into commons.people (person_id, rung, rung_since, covenant_said_on, abroad, dues_band,
    released_on, release_reason, deceased_on)
  values (v_person, p ->> 'rung', coalesce(nullif(p ->> 'rung_since', '')::date, current_date),
    nullif(p ->> 'covenant_said_on', '')::date, coalesce((p ->> 'abroad')::boolean, false),
    nullif(p ->> 'dues_band', ''), nullif(p ->> 'released_on', '')::date,
    nullif(p ->> 'release_reason', ''), nullif(p ->> 'deceased_on', '')::date)
  on conflict (person_id) do update set
    rung = excluded.rung, rung_since = excluded.rung_since,
    covenant_said_on = excluded.covenant_said_on, abroad = excluded.abroad,
    dues_band = excluded.dues_band, released_on = excluded.released_on,
    release_reason = excluded.release_reason, deceased_on = excluded.deceased_on;
  perform wall.audit(v_actor, 'commons.person.save', 'commons', 'people', v_person, null,
    jsonb_build_object('rung', p ->> 'rung'));
  return v_person;
end;
$$;

-- A Denizen abroad reports a Table kept; a person confirms it; it becomes a
-- chronicle line. The line carries the date and nothing about anyone.
create function api.report_table_kept(p_person uuid, p_held_on date, p_place text)
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
  insert into commons.tables_kept (held_on, place, kept_by_person_id)
  values (p_held_on, nullif(btrim(p_place), ''), p_person)
  returning id into v_id;
  perform wall.audit(v_actor, 'commons.table.report', 'commons', 'tables_kept', v_id, null,
    jsonb_build_object('held_on', p_held_on));
  return v_id;
end;
$$;

create function api.confirm_table_kept(p_id uuid)
returns uuid
language plpgsql
volatile
security definer
set search_path = commons, publishing, wall, authz, admin, pg_temp
as $$
declare
  v_actor uuid := wall.require('commons.manage');
  v_t commons.tables_kept;
  v_line uuid;
begin
  select * into v_t from commons.tables_kept where id = p_id for update;
  if not found then raise exception 'Table % does not exist', p_id; end if;
  if v_t.confirmed_on is not null then raise exception 'Already confirmed.'; end if;
  insert into publishing.chronicle_lines (line_on, line, created_by)
  values (v_t.held_on, 'A Table was kept.', v_actor)
  returning id into v_line;
  update commons.tables_kept set confirmed_on = current_date, chronicle_line_id = v_line where id = p_id;
  perform wall.audit(v_actor, 'commons.table.confirm', 'commons', 'tables_kept', p_id, null, null);
  return v_line;
end;
$$;

-- The concurrence roll for a year: Denizens abroad who kept the Table in the
-- year before. Computed from the register and the Tables kept, shown to the
-- house, never published. Under twenty-five, the leg folds into the Assembly.
create function api.concurrence_roll(p_year int)
returns table (person_id uuid, name text, roll_size bigint, folds_into_assembly boolean)
language plpgsql
stable
security definer
set search_path = commons, identity, wall, authz, pg_temp
as $$
begin
  perform wall.require('commons.manage');
  return query
    with roll as (
      select c.person_id, identity.display_name(c.person_id) as full_name
      from commons.people c
      where c.rung = 'denizen' and c.abroad and c.released_on is null and c.deceased_on is null
        and exists (
          select 1 from commons.tables_kept t
          where t.kept_by_person_id = c.person_id and t.confirmed_on is not null
            and extract(year from t.held_on)::int = p_year - 1
        )
    )
    select r.person_id, r.full_name, (select count(*) from roll), (select count(*) from roll) < 25
    from roll r
    order by r.full_name;
end;
$$;

-- Is the Assembly due? After Denizens number twenty-five, or five years from
-- adoption, whichever comes first. The adoption date is the setting
-- commons.adopted_on, entered by the house.
create function api.assembly_readiness()
returns table (denizens bigint, adopted_on date, five_years_on date, ready boolean)
language plpgsql
stable
security definer
set search_path = commons, admin, wall, authz, pg_temp
as $$
declare
  v_adopted date;
  v_n bigint;
begin
  perform wall.require('commons.manage');
  select nullif(trim(both '"' from value::text), '')::date into v_adopted
  from admin.settings where key = 'commons.adopted_on';
  select count(*) into v_n from commons.people
  where rung = 'denizen' and released_on is null and deceased_on is null;
  return query select v_n, v_adopted, (v_adopted + interval '5 years')::date,
    (v_n >= 25 or (v_adopted is not null and current_date >= (v_adopted + interval '5 years')::date));
end;
$$;

create function api.save_assembly(p jsonb)
returns uuid
language plpgsql
volatile
security definer
set search_path = commons, wall, authz, admin, pg_temp
as $$
declare
  v_actor uuid := wall.require('commons.manage');
  v_id uuid := nullif(p ->> 'id', '')::uuid;
  v_m jsonb;
begin
  if v_id is null then
    insert into commons.assemblies (held_on, roll_size, notes)
    values ((p ->> 'held_on')::date, nullif(p ->> 'roll_size', '')::int, nullif(p ->> 'notes', ''))
    returning id into v_id;
  else
    update commons.assemblies set held_on = (p ->> 'held_on')::date,
      roll_size = nullif(p ->> 'roll_size', '')::int, notes = nullif(p ->> 'notes', '')
    where id = v_id;
  end if;
  -- Motions are added, never rewritten: the record is the record.
  for v_m in select * from jsonb_array_elements(coalesce(p -> 'motions', '[]'::jsonb)) loop
    insert into commons.motions (assembly_id, text, threshold, touches_entrenched, extraordinary,
      votes_for, votes_against, abstentions, outcome, amendment_ref)
    values (v_id, v_m ->> 'text', v_m ->> 'threshold',
      coalesce((v_m ->> 'touches_entrenched')::boolean, false),
      coalesce((v_m ->> 'extraordinary')::boolean, false),
      nullif(v_m ->> 'votes_for', '')::int, nullif(v_m ->> 'votes_against', '')::int,
      nullif(v_m ->> 'abstentions', '')::int, nullif(v_m ->> 'outcome', ''),
      nullif(v_m ->> 'amendment_ref', ''));
  end loop;
  perform wall.audit(v_actor, 'commons.assembly.save', 'commons', 'assemblies', v_id, null, null);
  return v_id;
end;
$$;
revoke all on function api.save_commons_person, api.report_table_kept, api.confirm_table_kept,
  api.concurrence_roll, api.assembly_readiness, api.save_assembly from public, anon;
grant execute on function api.save_commons_person(jsonb), api.report_table_kept(uuid, date, text),
  api.confirm_table_kept(uuid), api.concurrence_roll(int), api.assembly_readiness(),
  api.save_assembly(jsonb) to authenticated;

create view api.commons_assemblies with (security_invoker = true) as
select a.*, coalesce((select jsonb_agg(to_jsonb(m) order by m.created_at) from commons.motions m
  where m.assembly_id = a.id), '[]'::jsonb) as motions
from commons.assemblies a order by a.held_on desc;
grant select on api.commons_assemblies to authenticated;

-- ---------------------------------------------------------------------
-- 4. The Guild: the hallmark register
-- ---------------------------------------------------------------------
create schema if not exists guild;
comment on schema guild is 'The hallmark register: formed makers, their marks, and punches destroyed.';
grant usage on schema guild to anon, authenticated, service_role;

create table guild.makers (
  id                 uuid primary key default gen_random_uuid(),
  person_id          uuid not null unique references wall.people (id) on delete restrict,
  stage              text not null check (stage in ('learner', 'apprentice', 'maker', 'teacher')),
  -- The maker's own mark, described in words; the drawing waits on the
  -- house's mark asset and is never a placeholder.
  mark_description   text,
  year_letter        text check (year_letter is null or year_letter ~ '^[A-Z]$'),
  registered_on      date,
  -- An apprenticeship ends with a presentation at the Table, entered in the Record.
  presented_on       date,
  published          boolean not null default false,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create trigger makers_set_updated_at before update on guild.makers
  for each row execute function public.set_updated_at();
create trigger makers_reject_em_dash before insert or update on guild.makers
  for each row when (new.published) execute function publishing.reject_em_dash();

-- A punch that leaves the house's keeping is destroyed, not recovered, and
-- the destruction is recorded. Append-only.
create table guild.punch_destructions (
  id            uuid primary key default gen_random_uuid(),
  maker_id      uuid not null references guild.makers (id) on delete restrict,
  destroyed_on  date not null,
  note          text,
  recorded_at   timestamptz not null default now()
);
create function guild.block_destruction_change()
returns trigger language plpgsql as $$
begin
  raise exception 'A destruction is recorded, never changed.' using errcode = '42501';
end;
$$;
create trigger punch_destructions_append_only before update or delete on guild.punch_destructions
  for each row execute function guild.block_destruction_change();

alter table guild.makers enable row level security;
alter table guild.punch_destructions enable row level security;
grant select on guild.makers, guild.punch_destructions to anon, authenticated;
create policy makers_public on guild.makers
  for select to anon, authenticated using (published);
create policy makers_staff on guild.makers
  for select to authenticated using ((select authz.has_staff_permission('guild.manage')));
create policy destructions_public on guild.punch_destructions
  for select to anon, authenticated
  using (exists (select 1 from guild.makers m where m.id = maker_id and m.published));
create policy destructions_staff on guild.punch_destructions
  for select to authenticated using ((select authz.has_staff_permission('guild.manage')));

create view api.guild_register with (security_invoker = true) as
select m.id, p.slug as person_slug, p.name as person_name, p.name_ne as person_name_ne,
  m.stage, m.mark_description, m.year_letter, m.registered_on,
  (select max(d.destroyed_on) from guild.punch_destructions d where d.maker_id = m.id) as destroyed_on
from guild.makers m
join wall.people p on p.id = m.person_id
order by m.registered_on nulls last, p.name;
grant select on api.guild_register to anon, authenticated;

create view api.admin_guild_makers with (security_invoker = true) as
select m.*, p.name as person_name,
  (select max(d.destroyed_on) from guild.punch_destructions d where d.maker_id = m.id) as destroyed_on
from guild.makers m join wall.people p on p.id = m.person_id
order by p.name;
grant select on api.admin_guild_makers to authenticated;

create function api.save_guild_maker(p jsonb)
returns uuid
language plpgsql
volatile
security definer
set search_path = guild, wall, authz, admin, pg_temp
as $$
declare
  v_actor uuid := wall.require('guild.manage');
  v_id uuid := nullif(p ->> 'id', '')::uuid;
  v_person uuid := (p ->> 'person_id')::uuid;
begin
  if v_id is not null then
    update guild.makers set stage = p ->> 'stage',
      mark_description = nullif(p ->> 'mark_description', ''),
      year_letter = nullif(p ->> 'year_letter', ''),
      registered_on = nullif(p ->> 'registered_on', '')::date,
      presented_on = nullif(p ->> 'presented_on', '')::date,
      published = coalesce((p ->> 'published')::boolean, published)
    where id = v_id;
    if not found then raise exception 'Maker % does not exist', v_id; end if;
  else
    insert into guild.makers (person_id, stage, mark_description, year_letter, registered_on,
      presented_on, published)
    values (v_person, p ->> 'stage', nullif(p ->> 'mark_description', ''),
      nullif(p ->> 'year_letter', ''), nullif(p ->> 'registered_on', '')::date,
      nullif(p ->> 'presented_on', '')::date, coalesce((p ->> 'published')::boolean, false))
    returning id into v_id;
  end if;
  -- Formation is the Guild's, and the hallmark rule reads this flag.
  update wall.people set formed_by_guild = true
  where id = (select person_id from guild.makers where id = v_id);
  perform wall.audit(v_actor, 'guild.maker.save', 'guild', 'makers', v_id, null, p);
  return v_id;
end;
$$;

create function api.record_punch_destruction(p_maker uuid, p_on date, p_note text)
returns uuid
language plpgsql
volatile
security definer
set search_path = guild, wall, authz, admin, pg_temp
as $$
declare
  v_actor uuid := wall.require('guild.manage');
  v_id uuid;
begin
  insert into guild.punch_destructions (maker_id, destroyed_on, note)
  values (p_maker, p_on, nullif(btrim(p_note), '')) returning id into v_id;
  perform wall.audit(v_actor, 'guild.punch.destroyed', 'guild', 'punch_destructions', v_id, null,
    jsonb_build_object('maker_id', p_maker, 'on', p_on));
  return v_id;
end;
$$;
revoke all on function api.save_guild_maker, api.record_punch_destruction from public, anon;
grant execute on function api.save_guild_maker(jsonb), api.record_punch_destruction(uuid, date, text)
  to authenticated;
