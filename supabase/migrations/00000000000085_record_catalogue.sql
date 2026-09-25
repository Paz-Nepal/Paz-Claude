-- 0085_record_catalogue.sql
--
-- The Record as three registers (docs/website-additions.md C2 to C4):
--   1. the catalogue: what was given in, an open layer the public may read and
--      a closed layer only the Keeper reads;
--   2. the deposit register: what the Press published (already exists);
--   3. the house's own papers.
--
-- Rules carried into the database:
--   * An accession number (PTN-0042) is assigned by a function, only after an
--     agreement is on file, from a sequence, and is never reused or changed.
--   * One accession has one ruling (its listening tier), so material under
--     different rulings arrives as separate accessions.
--   * The first part of every accession is its consents.
--   * Consent lines are dated and append-only.
--   * A holding opens only by the giver's chosen date, or is online from the
--     start. No account of the content is shown until it opens. A tier of "no
--     one" must name a date, so there is no perpetual seal.
--   * A withdrawn giver leaves a numbered gap with no name.
--   * The closed layer (giver, witness, how the family is reached,
--     cross-references) is never exposed through api and is readable only
--     with record.closed.read.
--   * The listening log keeps names for a fixed period, then counts only.
--
-- Nothing in the open layer is shown until the house sets a number and
-- publishes an accession, so the public pages stand empty until then.

create schema if not exists record;
comment on schema record is
  'The Record: the catalogue of what was given in (open and closed layers) and the house''s own papers.';
grant usage on schema record to authenticated, service_role;

-- ---------------------------------------------------------------------
-- Permissions
-- ---------------------------------------------------------------------
insert into authz.permissions (key, description) values
  ('record.manage', 'Keep the Record''s catalogue (the open layer), the house''s papers, consent lines and the listening log.'),
  ('record.closed.read', 'Read and keep the closed layer of the Record: giver, witness, how the family is reached. Held by the Keeper.')
on conflict (key) do nothing;

insert into authz.role_permissions (role_key, permission_key)
select r.key, g.permission_key
from (values
  ('super_admin', 'record.manage'),
  ('administrator', 'record.manage'),
  ('editor', 'record.manage'),
  ('super_admin', 'record.closed.read')
) as g (role_key, permission_key)
join authz.roles r on r.key = g.role_key
join authz.permissions p on p.key = g.permission_key
on conflict do nothing;

-- ---------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------
-- Numbers are drawn from this sequence and never handed back.
create sequence record.accession_seq;

create table record.accessions (
  id                uuid primary key default gen_random_uuid(),
  number            text unique check (number is null or number ~ '^PTN-[0-9]{4,}$'),
  kind              text not null check (kind in ('voice', 'photographs', 'papers', 'the_present', 'other')),
  dates_from        date,
  dates_to          date,
  -- The ruling. One accession, one ruling.
  listening_tier    text not null check (listening_tier in
                      ('online', 'in_house_works', 'anyone_in_house', 'people_of_house', 'family_only', 'no_one')),
  description_level text not null default 'none' check (description_level in ('none', 'subjects', 'account')),
  description       text,
  description_ne    text,
  -- The giver's chosen opening date.
  opens_on          date,
  copy_first        text not null default 'not_yet' check (copy_first in ('held', 'not_yet', 'lost')),
  copy_second       text not null default 'not_yet' check (copy_second in ('held', 'not_yet', 'lost')),
  copy_third        text not null default 'not_yet' check (copy_third in ('held', 'not_yet', 'lost')),
  -- After a giver's death the Ethics of Memory's consultation of kin governs;
  -- this is a note on the entry, never an automatic opening.
  kin_note          text,
  withdrawn_on      date,
  published         boolean not null default false,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  check (dates_to is null or dates_from is null or dates_to >= dates_from),
  check (listening_tier <> 'no_one' or opens_on is not null),
  check (description_level = 'none' or description is not null or withdrawn_on is not null)
);

create table record.consent_lines (
  id           uuid primary key default gen_random_uuid(),
  accession_id uuid not null references record.accessions (id) on delete restrict,
  kind         text not null check (kind in ('asked', 'agreed', 'narrowed', 'withdrawn', 'note')),
  line         text not null check (btrim(line) <> ''),
  recorded_on  date not null default current_date,
  recorded_by  uuid references identity.people (id) on delete restrict,
  created_at   timestamptz not null default now()
);
create index consent_lines_accession_idx on record.consent_lines (accession_id, recorded_on, created_at);

create table record.parts (
  id            uuid primary key default gen_random_uuid(),
  accession_id  uuid not null references record.accessions (id) on delete restrict,
  part_no       int not null check (part_no > 0),
  label         text not null check (btrim(label) <> ''),
  -- The first part is always the consents.
  is_consents   boolean not null,
  -- SHA-256 of the master. Published only for a part opened online.
  sha256        text check (sha256 is null or sha256 ~ '^[0-9a-f]{64}$'),
  opened_online boolean not null default false,
  online_path   text,
  created_at    timestamptz not null default now(),
  unique (accession_id, part_no),
  check (is_consents = (part_no = 1)),
  check (not opened_online or (sha256 is not null and online_path is not null))
);

-- Closed layer. Never exposed through api.
create table record.closed (
  accession_id   uuid primary key references record.accessions (id) on delete restrict,
  giver          text,
  witness        text,
  family_reached text,
  -- Other accessions by the same giver.
  cross_refs     uuid[] not null default '{}',
  updated_at     timestamptz not null default now()
);

create table record.house_papers (
  id          uuid primary key default gen_random_uuid(),
  reference   text not null unique check (reference ~ '^HP-[0-9]{4,}$'),
  title       text not null check (btrim(title) <> ''),
  title_ne    text,
  dated_on    date,
  kind        text,
  note        text,
  note_ne     text,
  published   boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- The listening log. Names go after a fixed period; the count stays.
create table record.listenings (
  id                 uuid primary key default gen_random_uuid(),
  accession_id       uuid not null references record.accessions (id) on delete restrict,
  part_id            uuid references record.parts (id) on delete restrict,
  listened_at        timestamptz not null default now(),
  who                text,
  names_stripped_at  timestamptz
);
create index listenings_accession_idx on record.listenings (accession_id);

-- ---------------------------------------------------------------------
-- Guards
-- ---------------------------------------------------------------------
create function record.block_number_change()
returns trigger
language plpgsql
as $$
begin
  if old.number is not null and new.number is distinct from old.number then
    raise exception 'An accession number is never changed or reused.' using errcode = '23514';
  end if;
  return new;
end;
$$;
create trigger accessions_number_fixed before update on record.accessions
  for each row execute function record.block_number_change();

create function record.block_delete()
returns trigger
language plpgsql
as $$
begin
  raise exception 'This register is kept, not edited.' using errcode = '42501';
end;
$$;
create trigger accessions_no_delete before delete on record.accessions
  for each row execute function record.block_delete();
create trigger consent_lines_no_update before update on record.consent_lines
  for each row execute function record.block_delete();
create trigger consent_lines_no_delete before delete on record.consent_lines
  for each row execute function record.block_delete();

create trigger accessions_set_updated_at before update on record.accessions
  for each row execute function public.set_updated_at();
create trigger house_papers_set_updated_at before update on record.house_papers
  for each row execute function public.set_updated_at();
create trigger closed_set_updated_at before update on record.closed
  for each row execute function public.set_updated_at();

create trigger accessions_reject_em_dash before insert or update on record.accessions
  for each row when (new.published) execute function publishing.reject_em_dash();
create trigger consent_lines_reject_em_dash before insert on record.consent_lines
  for each row execute function publishing.reject_em_dash();
create trigger parts_reject_em_dash before insert or update on record.parts
  for each row execute function publishing.reject_em_dash();
create trigger house_papers_reject_em_dash before insert or update on record.house_papers
  for each row when (new.published) execute function publishing.reject_em_dash();

-- ---------------------------------------------------------------------
-- Row level security: staff only; the closed layer narrower still
-- ---------------------------------------------------------------------
alter table record.accessions enable row level security;
alter table record.consent_lines enable row level security;
alter table record.parts enable row level security;
alter table record.closed enable row level security;
alter table record.house_papers enable row level security;
alter table record.listenings enable row level security;

grant select on record.accessions, record.consent_lines, record.parts, record.closed,
  record.house_papers, record.listenings to authenticated;

create policy accessions_select_staff on record.accessions
  for select to authenticated using ((select authz.has_staff_permission('record.manage')));
create policy consent_lines_select_staff on record.consent_lines
  for select to authenticated using ((select authz.has_staff_permission('record.manage')));
create policy parts_select_staff on record.parts
  for select to authenticated using ((select authz.has_staff_permission('record.manage')));
create policy house_papers_select_staff on record.house_papers
  for select to authenticated using ((select authz.has_staff_permission('record.manage')));
create policy listenings_select_staff on record.listenings
  for select to authenticated using ((select authz.has_staff_permission('record.manage')));
create policy closed_select_keeper on record.closed
  for select to authenticated using ((select authz.has_staff_permission('record.closed.read')));

-- ---------------------------------------------------------------------
-- Public views: the open layer only, run as owner
-- ---------------------------------------------------------------------
-- A holding is "open" when it is online from the start, or its date has come.
create view api.record_accessions with (security_invoker = false) as
select
  a.number, a.kind, a.dates_from, a.dates_to, a.listening_tier, a.description_level,
  a.opens_on,
  (a.listening_tier = 'online' or (a.opens_on is not null and a.opens_on <= current_date)) as is_open,
  case when a.description_level <> 'none'
        and (a.listening_tier = 'online' or (a.opens_on is not null and a.opens_on <= current_date))
       then a.description end as description,
  case when a.description_level <> 'none'
        and (a.listening_tier = 'online' or (a.opens_on is not null and a.opens_on <= current_date))
       then a.description_ne end as description_ne,
  (select c.line from record.consent_lines c
    where c.accession_id = a.id order by c.recorded_on desc, c.created_at desc limit 1) as consent_now,
  a.copy_first, a.copy_second, a.copy_third, a.kin_note,
  (select count(*)::int from record.listenings l where l.accession_id = a.id) as listenings
from record.accessions a
where a.published and a.number is not null and a.withdrawn_on is null
order by a.number;

-- A withdrawn giver leaves a numbered gap and nothing else.
create view api.record_withdrawn with (security_invoker = false) as
select a.number
from record.accessions a
where a.withdrawn_on is not null and a.number is not null
order by a.number;

create view api.record_parts with (security_invoker = false) as
select a.number, a.number || '.' || lpad(p.part_no::text, 2, '0') as part_label,
       p.part_no, p.label, p.is_consents,
       case when p.opened_online then p.sha256 end as sha256,
       case when p.opened_online then p.online_path end as online_path
from record.parts p
join record.accessions a on a.id = p.accession_id
where a.published and a.number is not null and a.withdrawn_on is null
order by a.number, p.part_no;

create view api.record_house_papers with (security_invoker = false) as
select h.reference, h.title, h.title_ne, h.dated_on, h.kind, h.note, h.note_ne
from record.house_papers h
where h.published
order by h.reference;

grant select on api.record_accessions, api.record_withdrawn, api.record_parts,
  api.record_house_papers to anon, authenticated;

-- ---------------------------------------------------------------------
-- Staff views
-- ---------------------------------------------------------------------
create view api.admin_record_accessions with (security_invoker = true) as
select a.*, (select count(*)::int from record.listenings l where l.accession_id = a.id) as listenings
from record.accessions a
order by a.number nulls first, a.created_at desc;
create view api.admin_record_consent_lines with (security_invoker = true) as
select * from record.consent_lines order by accession_id, recorded_on, created_at;
create view api.admin_record_parts with (security_invoker = true) as
select * from record.parts order by accession_id, part_no;
create view api.admin_record_house_papers with (security_invoker = true) as
select * from record.house_papers order by reference;
create view api.admin_record_closed with (security_invoker = true) as
select * from record.closed;
grant select on api.admin_record_accessions, api.admin_record_consent_lines,
  api.admin_record_parts, api.admin_record_house_papers, api.admin_record_closed to authenticated;

-- ---------------------------------------------------------------------
-- Writes
-- ---------------------------------------------------------------------
create function api.save_record_accession(p jsonb)
returns uuid
language plpgsql
volatile
security definer
set search_path = record, wall, authz, admin, pg_temp
as $$
declare
  v_actor uuid := wall.require('record.manage');
  v_id uuid := coalesce(nullif(p ->> 'id', '')::uuid, gen_random_uuid());
  v_before jsonb;
begin
  select to_jsonb(a) into v_before from record.accessions a where a.id = v_id;
  if v_before is not null and (v_before ->> 'withdrawn_on') is not null then
    raise exception 'A withdrawn accession is not edited.' using errcode = '23514';
  end if;
  insert into record.accessions
    (id, kind, dates_from, dates_to, listening_tier, description_level, description,
     description_ne, opens_on, copy_first, copy_second, copy_third, kin_note, published)
  values (v_id, p ->> 'kind', nullif(p ->> 'dates_from', '')::date, nullif(p ->> 'dates_to', '')::date,
    p ->> 'listening_tier', coalesce(nullif(p ->> 'description_level', ''), 'none'),
    nullif(btrim(p ->> 'description'), ''), nullif(btrim(p ->> 'description_ne'), ''),
    nullif(p ->> 'opens_on', '')::date,
    coalesce(nullif(p ->> 'copy_first', ''), 'not_yet'),
    coalesce(nullif(p ->> 'copy_second', ''), 'not_yet'),
    coalesce(nullif(p ->> 'copy_third', ''), 'not_yet'),
    nullif(btrim(p ->> 'kin_note'), ''), coalesce((p ->> 'published')::boolean, false))
  on conflict (id) do update set
    kind = excluded.kind, dates_from = excluded.dates_from, dates_to = excluded.dates_to,
    listening_tier = excluded.listening_tier, description_level = excluded.description_level,
    description = excluded.description, description_ne = excluded.description_ne,
    opens_on = excluded.opens_on, copy_first = excluded.copy_first,
    copy_second = excluded.copy_second, copy_third = excluded.copy_third,
    kin_note = excluded.kin_note, published = excluded.published;
  perform wall.audit(v_actor, 'record.accession.save', 'record', 'accessions', v_id, v_before, p);
  return v_id;
end;
$$;

-- The number is drawn only once an agreement is on file.
create function api.assign_record_accession_number(p_id uuid)
returns text
language plpgsql
volatile
security definer
set search_path = record, wall, authz, admin, pg_temp
as $$
declare
  v_actor uuid := wall.require('record.manage');
  v_number text;
  v_current text;
begin
  select number into v_current from record.accessions where id = p_id for update;
  if not found then
    raise exception 'That accession does not exist.' using errcode = 'P0002';
  end if;
  if v_current is not null then
    raise exception 'This accession already has its number, %.', v_current using errcode = '23505';
  end if;
  if not exists (select 1 from record.consent_lines c where c.accession_id = p_id and c.kind = 'agreed') then
    raise exception 'A number is given only after an agreement is on file.' using errcode = '23514';
  end if;
  v_number := 'PTN-' || lpad(nextval('record.accession_seq')::text, 4, '0');
  update record.accessions set number = v_number where id = p_id;
  -- The first part is always the consents.
  insert into record.parts (accession_id, part_no, label, is_consents)
  values (p_id, 1, 'Consents', true)
  on conflict (accession_id, part_no) do nothing;
  perform wall.audit(v_actor, 'record.accession.number', 'record', 'accessions', p_id, null,
    jsonb_build_object('number', v_number));
  return v_number;
end;
$$;

create function api.add_record_consent_line(p_accession uuid, p_kind text, p_line text, p_on date default null)
returns uuid
language plpgsql
volatile
security definer
set search_path = record, wall, authz, admin, pg_temp
as $$
declare
  v_actor uuid := wall.require('record.manage');
  v_id uuid;
begin
  insert into record.consent_lines (accession_id, kind, line, recorded_on, recorded_by)
  values (p_accession, p_kind, btrim(p_line), coalesce(p_on, current_date), v_actor)
  returning id into v_id;
  perform wall.audit(v_actor, 'record.consent.add', 'record', 'consent_lines', v_id, null,
    jsonb_build_object('accession_id', p_accession, 'kind', p_kind));
  return v_id;
end;
$$;

-- A giver withdraws: the number stays as a gap, the content is cleared.
create function api.withdraw_record_accession(p_id uuid, p_on date default null)
returns void
language plpgsql
volatile
security definer
set search_path = record, wall, authz, admin, pg_temp
as $$
declare
  v_actor uuid := wall.require('record.manage');
begin
  update record.accessions
     set withdrawn_on = coalesce(p_on, current_date), published = false,
         description = null, description_ne = null, kin_note = null
   where id = p_id and withdrawn_on is null;
  if not found then
    raise exception 'That accession does not exist or is already withdrawn.' using errcode = 'P0002';
  end if;
  insert into record.consent_lines (accession_id, kind, line, recorded_on, recorded_by)
  values (p_id, 'withdrawn', 'The giver withdrew this holding.', coalesce(p_on, current_date), v_actor);
  perform wall.audit(v_actor, 'record.accession.withdraw', 'record', 'accessions', p_id, null, null);
end;
$$;

create function api.save_record_part(p jsonb)
returns uuid
language plpgsql
volatile
security definer
set search_path = record, wall, authz, admin, pg_temp
as $$
declare
  v_actor uuid := wall.require('record.manage');
  v_id uuid := coalesce(nullif(p ->> 'id', '')::uuid, gen_random_uuid());
  v_no int := (p ->> 'part_no')::int;
  v_before jsonb;
begin
  select to_jsonb(x) into v_before from record.parts x where x.id = v_id;
  insert into record.parts (id, accession_id, part_no, label, is_consents, sha256, opened_online, online_path)
  values (v_id, (p ->> 'accession_id')::uuid, v_no, btrim(p ->> 'label'), v_no = 1,
    nullif(lower(btrim(p ->> 'sha256')), ''), coalesce((p ->> 'opened_online')::boolean, false),
    nullif(btrim(p ->> 'online_path'), ''))
  on conflict (id) do update set
    part_no = excluded.part_no, label = excluded.label, is_consents = excluded.is_consents,
    sha256 = excluded.sha256, opened_online = excluded.opened_online,
    online_path = excluded.online_path;
  perform wall.audit(v_actor, 'record.part.save', 'record', 'parts', v_id, v_before, p);
  return v_id;
end;
$$;

create function api.record_listening(p_accession uuid, p_part uuid default null, p_who text default null)
returns uuid
language plpgsql
volatile
security definer
set search_path = record, wall, authz, admin, pg_temp
as $$
declare
  v_actor uuid := wall.require('record.manage');
  v_id uuid;
begin
  insert into record.listenings (accession_id, part_id, who)
  values (p_accession, p_part, nullif(btrim(p_who), ''))
  returning id into v_id;
  perform wall.audit(v_actor, 'record.listening.add', 'record', 'listenings', v_id, null,
    jsonb_build_object('accession_id', p_accession));
  return v_id;
end;
$$;

create function api.save_record_house_paper(p jsonb)
returns uuid
language plpgsql
volatile
security definer
set search_path = record, wall, authz, admin, pg_temp
as $$
declare
  v_actor uuid := wall.require('record.manage');
  v_id uuid := coalesce(nullif(p ->> 'id', '')::uuid, gen_random_uuid());
  v_before jsonb;
begin
  select to_jsonb(h) into v_before from record.house_papers h where h.id = v_id;
  insert into record.house_papers (id, reference, title, title_ne, dated_on, kind, note, note_ne, published)
  values (v_id, btrim(p ->> 'reference'), btrim(p ->> 'title'), nullif(btrim(p ->> 'title_ne'), ''),
    nullif(p ->> 'dated_on', '')::date, nullif(btrim(p ->> 'kind'), ''),
    nullif(btrim(p ->> 'note'), ''), nullif(btrim(p ->> 'note_ne'), ''),
    coalesce((p ->> 'published')::boolean, false))
  on conflict (id) do update set
    reference = excluded.reference, title = excluded.title, title_ne = excluded.title_ne,
    dated_on = excluded.dated_on, kind = excluded.kind, note = excluded.note,
    note_ne = excluded.note_ne, published = excluded.published;
  perform wall.audit(v_actor, 'record.house_paper.save', 'record', 'house_papers', v_id, v_before, p);
  return v_id;
end;
$$;

-- The closed layer: kept only by the Keeper. The audit row names the
-- accession, never what was written.
create function api.save_record_closed(p jsonb)
returns void
language plpgsql
volatile
security definer
set search_path = record, wall, authz, admin, pg_temp
as $$
declare
  v_actor uuid := wall.require('record.closed.read');
  v_acc uuid := (p ->> 'accession_id')::uuid;
begin
  insert into record.closed (accession_id, giver, witness, family_reached, cross_refs)
  values (v_acc, nullif(btrim(p ->> 'giver'), ''), nullif(btrim(p ->> 'witness'), ''),
    nullif(btrim(p ->> 'family_reached'), ''),
    coalesce(array(select jsonb_array_elements_text(p -> 'cross_refs'))::uuid[], '{}'))
  on conflict (accession_id) do update set
    giver = excluded.giver, witness = excluded.witness,
    family_reached = excluded.family_reached, cross_refs = excluded.cross_refs;
  perform wall.audit(v_actor, 'record.closed.save', 'record', 'closed', v_acc, null,
    jsonb_build_object('accession_id', v_acc));
end;
$$;

revoke all on function
  api.save_record_accession(jsonb), api.assign_record_accession_number(uuid),
  api.add_record_consent_line(uuid, text, text, date), api.withdraw_record_accession(uuid, date),
  api.save_record_part(jsonb), api.record_listening(uuid, uuid, text),
  api.save_record_house_paper(jsonb), api.save_record_closed(jsonb)
  from public, anon;
grant execute on function
  api.save_record_accession(jsonb), api.assign_record_accession_number(uuid),
  api.add_record_consent_line(uuid, text, text, date), api.withdraw_record_accession(uuid, date),
  api.save_record_part(jsonb), api.record_listening(uuid, uuid, text),
  api.save_record_house_paper(jsonb), api.save_record_closed(jsonb)
  to authenticated;

-- ---------------------------------------------------------------------
-- C4. Names in the listening log go after a fixed period
-- ---------------------------------------------------------------------
-- The period is the setting record.listening_names_days. Until the house sets
-- it, nothing is stripped. Called on a schedule by the strip-listening-names
-- Edge Function (service role only).
create function record.strip_listening_names()
returns int
language plpgsql
volatile
security definer
set search_path = record, admin, pg_temp
as $$
declare
  v_days int;
  v_n int;
begin
  select (s.value #>> '{}')::int into v_days from admin.settings s where s.key = 'record.listening_names_days';
  if v_days is null or v_days < 0 then
    return 0;
  end if;
  update record.listenings
     set who = null, names_stripped_at = now()
   where who is not null and listened_at < now() - make_interval(days => v_days);
  get diagnostics v_n = row_count;
  return v_n;
end;
$$;
revoke all on function record.strip_listening_names() from public, anon, authenticated;
grant execute on function record.strip_listening_names() to service_role;
