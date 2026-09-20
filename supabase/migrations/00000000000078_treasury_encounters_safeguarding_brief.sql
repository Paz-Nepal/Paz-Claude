-- 0078_treasury_encounters_safeguarding_brief.sql
--
-- Build Programme 10, 11, 12, 13.
--
--   * the Treasury's account, written for the Annual rather than a live
--     dashboard, with the one-fifth concentration rule checked and reported;
--   * Encounters: the one public calendar the house keeps, structurally
--     apart from anything that asks a person to belong;
--   * safeguarding: a route to raise a concern that does not pass through
--     the people a concern might be about;
--   * the Brief's subscribers: one list, double opt-in, one-action
--     unsubscribe, no segmentation of any kind.

-- ---------------------------------------------------------------------
-- 1. The Treasury's account
-- ---------------------------------------------------------------------
create schema if not exists treasury;
comment on schema treasury is 'The Treasury''s published account, reported once a year in the Annual.';
grant usage on schema treasury to anon, authenticated, service_role;

create table treasury.accounts (
  id                      uuid primary key default gen_random_uuid(),
  -- The house's year runs from the anniversary; the Annual names its year
  -- by that span.
  year_span               text not null unique check (btrim(year_span) <> ''),
  annual_item_id          uuid references publishing.items (id) on delete restrict,
  patronage_share_minor   bigint check (patronage_share_minor is null or patronage_share_minor >= 0),
  patronage_note          text,
  tithe_base_minor        bigint check (tithe_base_minor is null or tithe_base_minor >= 0),
  tithe_minor             bigint check (tithe_minor is null or tithe_minor >= 0),
  -- The largest single share of the year's giving, as a percentage.
  largest_share_pct       numeric(5, 2) check (largest_share_pct is null or (largest_share_pct >= 0 and largest_share_pct <= 100)),
  gifts_note              text,
  instruments_note        text,
  published               boolean not null default false,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);
create trigger accounts_set_updated_at before update on treasury.accounts
  for each row execute function public.set_updated_at();
create trigger accounts_reject_em_dash before insert or update on treasury.accounts
  for each row when (new.published) execute function publishing.reject_em_dash();

alter table treasury.accounts enable row level security;
grant select on treasury.accounts to anon, authenticated;
create policy accounts_public on treasury.accounts
  for select to anon, authenticated using (published);
create policy accounts_staff on treasury.accounts
  for select to authenticated using ((select authz.has_staff_permission('treasury.manage')));

create view api.treasury_accounts with (security_invoker = true) as
select id, year_span, patronage_share_minor, patronage_note, tithe_base_minor, tithe_minor,
  largest_share_pct, (largest_share_pct is not null and largest_share_pct <= 20) as concentration_rule_met,
  gifts_note, instruments_note
from treasury.accounts
order by year_span desc;
grant select on api.treasury_accounts to anon, authenticated;

create view api.admin_treasury_accounts with (security_invoker = true) as
select * from treasury.accounts order by year_span desc;
grant select on api.admin_treasury_accounts to authenticated;

create function api.save_treasury_account(p jsonb)
returns uuid
language plpgsql
volatile
security definer
set search_path = treasury, wall, authz, admin, pg_temp
as $$
declare
  v_actor uuid := wall.require('treasury.manage');
  v_id uuid := nullif(p ->> 'id', '')::uuid;
begin
  if v_id is not null then
    update treasury.accounts set year_span = p ->> 'year_span',
      patronage_share_minor = nullif(p ->> 'patronage_share_minor', '')::bigint,
      patronage_note = nullif(p ->> 'patronage_note', ''),
      tithe_base_minor = nullif(p ->> 'tithe_base_minor', '')::bigint,
      tithe_minor = nullif(p ->> 'tithe_minor', '')::bigint,
      largest_share_pct = nullif(p ->> 'largest_share_pct', '')::numeric,
      gifts_note = nullif(p ->> 'gifts_note', ''),
      instruments_note = nullif(p ->> 'instruments_note', ''),
      published = coalesce((p ->> 'published')::boolean, published)
    where id = v_id;
    if not found then raise exception 'Account % does not exist', v_id; end if;
  else
    insert into treasury.accounts (year_span, patronage_share_minor, patronage_note, tithe_base_minor,
      tithe_minor, largest_share_pct, gifts_note, instruments_note, published)
    values (p ->> 'year_span', nullif(p ->> 'patronage_share_minor', '')::bigint,
      nullif(p ->> 'patronage_note', ''), nullif(p ->> 'tithe_base_minor', '')::bigint,
      nullif(p ->> 'tithe_minor', '')::bigint, nullif(p ->> 'largest_share_pct', '')::numeric,
      nullif(p ->> 'gifts_note', ''), nullif(p ->> 'instruments_note', ''),
      coalesce((p ->> 'published')::boolean, false))
    returning id into v_id;
  end if;
  perform wall.audit(v_actor, 'treasury.account.save', 'treasury', 'accounts', v_id, null, p);
  return v_id;
end;
$$;
revoke all on function api.save_treasury_account from public, anon;
grant execute on function api.save_treasury_account(jsonb) to authenticated;

-- ---------------------------------------------------------------------
-- 2. Encounters
-- ---------------------------------------------------------------------
create schema if not exists encounters;
comment on schema encounters is
  'Field Studies, Common Ground, The Chautari and workshops: public civic work with dates, a place, and a way to turn up. Nothing here links onward to belonging.';
grant usage on schema encounters to anon, authenticated, service_role;

create table encounters.events (
  id                uuid primary key default gen_random_uuid(),
  slug              text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  kind              text not null check (kind in ('field_study', 'common_ground', 'chautari', 'workshop')),
  title             text not null check (btrim(title) <> ''),
  title_ne          text,
  starts_on         date not null,
  ends_on           date check (ends_on is null or ends_on >= starts_on),
  place             text,
  place_ne          text,
  how_to_turn_up    text,
  how_to_turn_up_ne text,
  -- Some of this site is addressed to the neighbourhood, not the world:
  -- those pages are Nepali first (Build Programme 14).
  leads_ne          boolean not null default false,
  published         boolean not null default false,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create trigger events_set_updated_at before update on encounters.events
  for each row execute function public.set_updated_at();
create trigger events_reject_em_dash before insert or update on encounters.events
  for each row when (new.published) execute function publishing.reject_em_dash();
alter table encounters.events enable row level security;
grant select on encounters.events to anon, authenticated;
create policy events_public on encounters.events
  for select to anon, authenticated using (published);
create policy events_staff on encounters.events
  for select to authenticated using ((select authz.has_staff_permission('encounters.manage')));

create view api.encounters_calendar with (security_invoker = true) as
select id, slug, kind, title, title_ne, starts_on, ends_on, place, place_ne,
  how_to_turn_up, how_to_turn_up_ne, leads_ne
from encounters.events
order by starts_on desc, title;
grant select on api.encounters_calendar to anon, authenticated;

create view api.admin_encounters with (security_invoker = true) as
select * from encounters.events order by starts_on desc;
grant select on api.admin_encounters to authenticated;

create function api.save_encounter(p jsonb)
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
      published = coalesce((p ->> 'published')::boolean, published)
    where id = v_id;
    if not found then raise exception 'Encounter % does not exist', v_id; end if;
  else
    insert into encounters.events (slug, kind, title, title_ne, starts_on, ends_on, place, place_ne,
      how_to_turn_up, how_to_turn_up_ne, leads_ne, published)
    values (p ->> 'slug', p ->> 'kind', p ->> 'title', nullif(p ->> 'title_ne', ''),
      (p ->> 'starts_on')::date, nullif(p ->> 'ends_on', '')::date, nullif(p ->> 'place', ''),
      nullif(p ->> 'place_ne', ''), nullif(p ->> 'how_to_turn_up', ''),
      nullif(p ->> 'how_to_turn_up_ne', ''), coalesce((p ->> 'leads_ne')::boolean, false),
      coalesce((p ->> 'published')::boolean, false))
    returning id into v_id;
  end if;
  perform wall.audit(v_actor, 'encounters.event.save', 'encounters', 'events', v_id, null, p);
  return v_id;
end;
$$;
revoke all on function api.save_encounter from public, anon;
grant execute on function api.save_encounter(jsonb) to authenticated;

-- ---------------------------------------------------------------------
-- 3. Safeguarding concerns
-- ---------------------------------------------------------------------
create table crm.concerns (
  id            uuid primary key default gen_random_uuid(),
  submitted_at  timestamptz not null default now(),
  writer_name   text,
  contact       text,
  body          text not null check (btrim(body) <> '')
);
-- Readable only by the holder of safeguarding.read, which is one named
-- person and never the people a concern might be about. Deliberately not
-- covered by any general staff permission.
alter table crm.concerns enable row level security;
grant select on crm.concerns to authenticated;
create policy concerns_staff on crm.concerns
  for select to authenticated using ((select authz.has_staff_permission('safeguarding.read')));

create function api.submit_concern(p_writer_name text, p_contact text, p_body text)
returns uuid
language plpgsql
volatile
security definer
set search_path = crm, pg_temp
as $$
declare v_id uuid;
begin
  if btrim(coalesce(p_body, '')) = '' then
    raise exception 'A concern needs some words.';
  end if;
  insert into crm.concerns (writer_name, contact, body)
  values (nullif(btrim(p_writer_name), ''), nullif(btrim(p_contact), ''), btrim(p_body))
  returning id into v_id;
  return v_id;
end;
$$;
revoke all on function api.submit_concern from public, anon, authenticated;
grant execute on function api.submit_concern(text, text, text) to service_role;

create view api.concerns with (security_invoker = true) as
select id, submitted_at, writer_name, contact, body from crm.concerns order by submitted_at desc;
grant select on api.concerns to authenticated;

-- ---------------------------------------------------------------------
-- 4. The Brief's subscribers. One list, the same letter to everyone.
--    No segmentation of any kind: nothing here records what a person
--    read, bought, or looked at, and there is no tags column and no
--    second list.
-- ---------------------------------------------------------------------
create schema if not exists mail;
comment on schema mail is 'The Brief''s one list. Double opt-in, one-action unsubscribe, no tracking, no segmentation.';
grant usage on schema mail to service_role, authenticated;

create table mail.subscribers (
  id                uuid primary key default gen_random_uuid(),
  email             citext not null unique,
  status            text not null default 'pending' check (status in ('pending', 'confirmed', 'unsubscribed')),
  confirm_token     uuid not null default gen_random_uuid() unique,
  unsubscribe_token uuid not null default gen_random_uuid() unique,
  requested_at      timestamptz not null default now(),
  confirmed_at      timestamptz,
  unsubscribed_at   timestamptz
);
alter table mail.subscribers enable row level security;
grant select on mail.subscribers to authenticated;
create policy subscribers_staff on mail.subscribers
  for select to authenticated using ((select authz.has_staff_permission('mail.manage')));

-- One row per Brief sent, so an issue can never go out twice.
create table mail.brief_sends (
  item_id          uuid primary key references publishing.items (id) on delete restrict,
  sent_at          timestamptz not null default now(),
  recipient_count  int not null
);
alter table mail.brief_sends enable row level security;
grant select on mail.brief_sends to authenticated;
create policy brief_sends_staff on mail.brief_sends
  for select to authenticated using ((select authz.has_staff_permission('mail.manage')));

create function api.brief_subscribe(p_email text)
returns table (confirm_token uuid, already_confirmed boolean)
language plpgsql
volatile
security definer
set search_path = mail, pg_temp
as $$
declare v mail.subscribers;
begin
  if p_email is null or btrim(p_email) !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'That does not look like an email address.';
  end if;
  insert into mail.subscribers (email) values (btrim(p_email))
  on conflict (email) do update set
    status = case when mail.subscribers.status = 'confirmed' then 'confirmed' else 'pending' end,
    requested_at = now()
  returning * into v;
  return query select v.confirm_token, v.status = 'confirmed';
end;
$$;

create function api.brief_confirm(p_token uuid)
returns boolean
language plpgsql
volatile
security definer
set search_path = mail, pg_temp
as $$
begin
  update mail.subscribers set status = 'confirmed', confirmed_at = now(), unsubscribed_at = null
  where confirm_token = p_token;
  return found;
end;
$$;

create function api.brief_unsubscribe(p_token uuid)
returns boolean
language plpgsql
volatile
security definer
set search_path = mail, pg_temp
as $$
begin
  update mail.subscribers set status = 'unsubscribed', unsubscribed_at = now()
  where unsubscribe_token = p_token;
  return found;
end;
$$;

-- The confirmed list, for the sender only (service role).
create function api.brief_recipients()
returns table (email citext, unsubscribe_token uuid)
language sql
stable
security definer
set search_path = mail, pg_temp
as $$
  select email, unsubscribe_token from mail.subscribers where status = 'confirmed' order by confirmed_at;
$$;

create function api.brief_record_send(p_item uuid, p_count int)
returns void
language sql
volatile
security definer
set search_path = mail, pg_temp
as $$
  insert into mail.brief_sends (item_id, recipient_count) values (p_item, p_count);
$$;

revoke all on function api.brief_subscribe, api.brief_confirm, api.brief_unsubscribe,
  api.brief_recipients, api.brief_record_send from public, anon, authenticated;
grant execute on function api.brief_subscribe(text), api.brief_confirm(uuid),
  api.brief_unsubscribe(uuid), api.brief_recipients(), api.brief_record_send(uuid, int)
  to service_role;
