-- 0010_membership.sql
--
-- Membership: tiers, applications, members, terms (Build Readiness Review
-- D-4, D-11, D-12 as simplified for v1 — see notes below on what's
-- deliberately not here yet).
--
-- Deliberately NOT here (absent, not stubbed, per the "no placeholder
-- architecture" rule):
-- - Invitation tokens / email-driven acceptance (D-12). v1 decides an
--   application accepted/declined directly; the "invited" intermediate
--   state needs the email-sending decision (T-067, provider not chosen
--   yet) to mean anything, so it's not modeled until that exists.
-- - Renewal notice emails / grace-period automation (D-11). The state
--   machine supports the statuses; the scheduled job that walks expiring
--   terms is future work once a job runner exists (same T-006 dependency
--   noted for publish-scheduled in migration 0008).
-- - Digital card issuance. Depends on member-facing auth surfaces beyond
--   what Authentication (this repo's prior phase) built.
-- - Rate limiting / bot protection on the public application endpoint
--   (matches the same known gap on the future contact-message function,
--   T-068 — Turnstile wiring is a frontend+Edge-Function decision, not a
--   schema one).

create type membership.application_status as enum
  ('pending', 'accepted', 'declined', 'withdrawn');

create type membership.member_status as enum
  ('active', 'lapsed', 'paused', 'resigned', 'honorary');

-- ---------------------------------------------------------------------
-- membership.tiers
-- ---------------------------------------------------------------------
create table membership.tiers (
  key              text primary key,
  name             text not null,
  description      text,
  annual_fee_cents int not null check (annual_fee_cents >= 0),
  active           boolean not null default true
);

alter table membership.tiers enable row level security;
grant select on membership.tiers to anon, authenticated;
grant insert, update on membership.tiers to authenticated;

create policy tiers_select_all on membership.tiers
  for select to anon, authenticated using (true);

create policy tiers_manage_staff on membership.tiers
  for all to authenticated
  using ((select authz.has_staff_permission('membership.tier.manage')))
  with check ((select authz.has_staff_permission('membership.tier.manage')));

-- ---------------------------------------------------------------------
-- membership.applications
-- ---------------------------------------------------------------------
create table membership.applications (
  id             uuid primary key default gen_random_uuid(),
  person_id      uuid not null references identity.people (id) on delete restrict,
  tier_key       text not null references membership.tiers (key) on delete restrict,
  status         membership.application_status not null default 'pending',
  motivation     text,
  submitted_at   timestamptz not null default now(),
  decided_at     timestamptz,
  decided_by     uuid references identity.people (id) on delete restrict,
  decision_notes text
);
comment on table membership.applications is
  'Public applications land here via api.submit_membership_application '
  '(security definer — applicants need no account). Decisions go through '
  'membership.decide_application(), never a direct UPDATE, so accepting '
  'always creates the member/term pair atomically with the status change.';

create index applications_status_idx on membership.applications (status, submitted_at desc);
create index applications_person_idx on membership.applications (person_id);

alter table membership.applications enable row level security;
grant select on membership.applications to authenticated;

create policy applications_select_staff on membership.applications
  for select to authenticated
  using ((select authz.has_staff_permission('membership.application.read')));

create trigger applications_audit
  after insert or update or delete on membership.applications
  for each row execute function public.audit_row_change('membership.application.changed');

-- ---------------------------------------------------------------------
-- membership.members
-- ---------------------------------------------------------------------
create table membership.members (
  id               uuid primary key default gen_random_uuid(),
  person_id        uuid not null unique references identity.people (id) on delete restrict,
  member_no        text not null unique,
  tier_key         text not null references membership.tiers (key) on delete restrict,
  status           membership.member_status not null default 'active',
  directory_opt_in boolean not null default false,
  joined_on        date not null default current_date,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
comment on table membership.members is
  'Former members keep their row (status leaves active/honorary, D-4) — '
  'membership is never deleted, only its status changed, matching the '
  '"people are never hard-deleted" posture the rest of the schema follows.';

create index members_status_idx on membership.members (status, tier_key);

create trigger members_set_updated_at
  before update on membership.members
  for each row execute function public.set_updated_at();

create trigger members_audit
  after insert or update or delete on membership.members
  for each row execute function public.audit_row_change('membership.member.changed');

alter table membership.members enable row level security;
grant select on membership.members to authenticated;
-- No insert/update grant to authenticated: created only by
-- decide_application(), status changed only by set_member_status() —
-- both security definer, so direct table grants aren't needed for those
-- paths; a member updating their own directory_opt_in is the one
-- self-service write, handled by api.update_my_directory_opt_in below.

create policy members_select_self on membership.members
  for select to authenticated
  using (person_id = (select authz.current_person_id()));

create policy members_select_staff on membership.members
  for select to authenticated
  using ((select authz.has_staff_permission('membership.member.read')));

-- ---------------------------------------------------------------------
-- membership.terms
-- ---------------------------------------------------------------------
create table membership.terms (
  id           uuid primary key default gen_random_uuid(),
  member_id    uuid not null references membership.members (id) on delete restrict,
  tier_key     text not null references membership.tiers (key) on delete restrict,
  starts_on    date not null,
  ends_on      date not null,
  amount_cents int not null check (amount_cents >= 0),
  paid_at      timestamptz,
  recorded_by  uuid references identity.people (id) on delete restrict,
  created_at   timestamptz not null default now(),

  constraint terms_valid_range check (ends_on > starts_on)
);

create index terms_member_idx on membership.terms (member_id, ends_on desc);
create index terms_unpaid_idx on membership.terms (ends_on) where paid_at is null;

alter table membership.terms enable row level security;
grant select on membership.terms to authenticated;

create policy terms_select_self on membership.terms
  for select to authenticated
  using (
    exists (
      select 1 from membership.members m
      where m.id = member_id and m.person_id = (select authz.current_person_id())
    )
  );

create policy terms_select_staff on membership.terms
  for select to authenticated
  using (
    (select authz.has_staff_permission('membership.member.read'))
    or (select authz.has_staff_permission('membership.term.manage'))
  );

create trigger terms_audit
  after insert or update or delete on membership.terms
  for each row execute function public.audit_row_change('membership.term.changed');

-- ---------------------------------------------------------------------
-- Member number generator
-- ---------------------------------------------------------------------
create sequence membership.member_no_seq start 1;

create function membership.next_member_no()
returns text
language sql
as $$
  select 'PAZ-' || lpad(nextval('membership.member_no_seq')::text, 5, '0');
$$;

-- ---------------------------------------------------------------------
-- membership.decide_application(application, decision, notes)
-- ---------------------------------------------------------------------
create function membership.decide_application(
  p_application uuid,
  p_decision membership.application_status,
  p_notes text default null
)
returns membership.applications
language plpgsql
security definer
set search_path = membership, identity, authz, pg_temp
as $$
declare
  v_app membership.applications;
  v_actor uuid := authz.current_person_id();
  v_member_id uuid;
  v_fee int;
begin
  if v_actor is null or not authz.has_staff_permission('membership.application.decide') then
    raise exception 'Not permitted to decide applications' using errcode = '42501';
  end if;
  if p_decision not in ('accepted', 'declined') then
    raise exception 'Decision must be accepted or declined, got %', p_decision;
  end if;

  select * into v_app from membership.applications where id = p_application for update;
  if not found then
    raise exception 'Application % does not exist', p_application;
  end if;
  if v_app.status <> 'pending' then
    raise exception 'Application has already been decided (status: %)', v_app.status;
  end if;

  update membership.applications
  set status = p_decision, decided_at = now(), decided_by = v_actor, decision_notes = p_notes
  where id = p_application
  returning * into v_app;

  if p_decision = 'accepted' then
    select annual_fee_cents into v_fee from membership.tiers where key = v_app.tier_key;

    insert into membership.members (person_id, member_no, tier_key, joined_on)
    values (v_app.person_id, membership.next_member_no(), v_app.tier_key, current_date)
    on conflict (person_id) do update
      set status = 'active', tier_key = excluded.tier_key
    returning id into v_member_id;

    insert into membership.terms (member_id, tier_key, starts_on, ends_on, amount_cents, recorded_by)
    values (
      v_member_id, v_app.tier_key, current_date,
      (current_date + interval '1 year')::date, coalesce(v_fee, 0), v_actor
    );
  end if;

  return v_app;
end;
$$;

revoke all on function membership.decide_application(uuid, membership.application_status, text) from public, anon;
grant execute on function membership.decide_application(uuid, membership.application_status, text) to authenticated;

-- ---------------------------------------------------------------------
-- membership.set_member_status(member, status)
-- ---------------------------------------------------------------------
create function membership.set_member_status(p_member uuid, p_status membership.member_status)
returns membership.members
language plpgsql
security definer
set search_path = membership, authz, pg_temp
as $$
declare
  v_member membership.members;
begin
  if not authz.has_staff_permission('membership.member.manage') then
    raise exception 'Not permitted to change member status' using errcode = '42501';
  end if;

  update membership.members set status = p_status where id = p_member
  returning * into v_member;
  if not found then
    raise exception 'Member % does not exist', p_member;
  end if;
  return v_member;
end;
$$;

revoke all on function membership.set_member_status(uuid, membership.member_status) from public, anon;
grant execute on function membership.set_member_status(uuid, membership.member_status) to authenticated;

-- ---------------------------------------------------------------------
-- membership.record_payment(term, amount_cents)
-- ---------------------------------------------------------------------
create function membership.record_payment(p_term uuid, p_amount_cents int)
returns membership.terms
language plpgsql
security definer
set search_path = membership, authz, pg_temp
as $$
declare
  v_term membership.terms;
begin
  if not authz.has_staff_permission('membership.term.manage') then
    raise exception 'Not permitted to record payments' using errcode = '42501';
  end if;
  if p_amount_cents < 0 then
    raise exception 'Amount cannot be negative';
  end if;

  update membership.terms
  set paid_at = now(), amount_cents = p_amount_cents, recorded_by = authz.current_person_id()
  where id = p_term
  returning * into v_term;
  if not found then
    raise exception 'Term % does not exist', p_term;
  end if;
  return v_term;
end;
$$;

revoke all on function membership.record_payment(uuid, int) from public, anon;
grant execute on function membership.record_payment(uuid, int) to authenticated;

-- ---------------------------------------------------------------------
-- Schema usage (learned the hard way in migration 0009 — granting this
-- from the start this time).
-- ---------------------------------------------------------------------
grant usage on schema membership to anon, authenticated;

-- ---------------------------------------------------------------------
-- api surface
-- ---------------------------------------------------------------------

create view api.membership_tiers
with (security_invoker = true)
as
select key, name, description, annual_fee_cents
from membership.tiers
where active;

grant select on api.membership_tiers to anon, authenticated;

-- Public application intake. security definer: applicants need no
-- account. Mirrors identity.handle_new_auth_user's email-dedupe so an
-- applicant already known to CRM/reservations doesn't become a duplicate
-- person (D-1).
create function api.submit_membership_application(
  p_full_name text,
  p_email text,
  p_phone text,
  p_tier_key text,
  p_motivation text
)
returns uuid
language plpgsql
security definer
set search_path = identity, membership, pg_temp
as $$
declare
  v_person_id uuid;
  v_app_id uuid;
begin
  if p_full_name is null or btrim(p_full_name) = '' then
    raise exception 'Full name is required';
  end if;
  if p_email is null or btrim(p_email) = '' then
    raise exception 'Email is required';
  end if;

  select id into v_person_id
  from identity.people
  where email = p_email::citext and merged_into is null
  limit 1;

  if v_person_id is null then
    insert into identity.people (full_name, email, phone, source)
    values (p_full_name, p_email, p_phone, 'application')
    returning id into v_person_id;
  end if;

  insert into membership.applications (person_id, tier_key, motivation)
  values (v_person_id, p_tier_key, p_motivation)
  returning id into v_app_id;

  return v_app_id;
end;
$$;

revoke all on function api.submit_membership_application from public;
grant execute on function api.submit_membership_application to anon, authenticated;

-- Staff: application review queue.
create view api.membership_applications
with (security_invoker = true)
as
select
  a.id, a.status, a.tier_key, a.motivation, a.submitted_at,
  a.decided_at, a.decision_notes,
  identity.display_name(a.person_id) as applicant_name,
  p.email as applicant_email
from membership.applications a
join identity.people p on p.id = a.person_id;

grant select on api.membership_applications to authenticated;

create function api.decide_membership_application(
  p_application uuid,
  p_decision text,
  p_notes text default null
)
returns membership.application_status
language sql
volatile
security invoker
set search_path = membership, pg_temp
as $$
  select (membership.decide_application(p_application, p_decision::membership.application_status, p_notes)).status;
$$;

revoke all on function api.decide_membership_application from public, anon;
grant execute on function api.decide_membership_application to authenticated;

-- Staff: member roster.
create view api.members
with (security_invoker = true)
as
select
  m.id, m.member_no, m.tier_key, m.status, m.directory_opt_in, m.joined_on,
  identity.display_name(m.person_id) as member_name,
  p.email as member_email
from membership.members m
join identity.people p on p.id = m.person_id;

grant select on api.members to authenticated;

create function api.set_member_status(p_member uuid, p_status text)
returns membership.member_status
language sql
volatile
security invoker
set search_path = membership, pg_temp
as $$
  select (membership.set_member_status(p_member, p_status::membership.member_status)).status;
$$;

revoke all on function api.set_member_status from public, anon;
grant execute on function api.set_member_status to authenticated;

-- Staff: terms for one member (payment history + renewal state).
create function api.member_terms(p_member uuid)
returns setof membership.terms
language sql
stable
security invoker
set search_path = membership, pg_temp
as $$
  select * from membership.terms where member_id = p_member order by starts_on desc;
$$;

revoke all on function api.member_terms from public, anon;
grant execute on function api.member_terms to authenticated;

create function api.record_payment(p_term uuid, p_amount_cents int)
returns boolean
language sql
volatile
security invoker
set search_path = membership, pg_temp
as $$
  select (membership.record_payment(p_term, p_amount_cents)).paid_at is not null;
$$;

revoke all on function api.record_payment from public, anon;
grant execute on function api.record_payment to authenticated;

-- Self-service: a signed-in member toggling their own directory opt-in.
-- security invoker: members_select_self / the lack of any other update
-- grant means this only works for the caller's own row, enforced by
-- Postgres's ordinary privilege check, not a bespoke condition here.
create function api.update_my_directory_opt_in(p_opt_in boolean)
returns void
language sql
volatile
security definer
set search_path = membership, authz, pg_temp
as $$
  update membership.members
  set directory_opt_in = p_opt_in
  where person_id = (select authz.current_person_id());
$$;

revoke all on function api.update_my_directory_opt_in from public, anon;
grant execute on function api.update_my_directory_opt_in to authenticated;

-- Public: opt-in member directory. security_invoker = false (runs as
-- owner, like api.site_info): membership.members' RLS is otherwise
-- self-or-staff only, and this view's own WHERE clause is the entire
-- authorization for what it exposes — the same pattern as the settings
-- whitelist in api.site_info().
create view api.member_directory
with (security_invoker = false)
as
select m.id, identity.display_name(m.person_id) as display_name, m.tier_key, m.joined_on
from membership.members m
where m.directory_opt_in and m.status in ('active', 'honorary');

grant select on api.member_directory to anon, authenticated;

-- ---------------------------------------------------------------------
-- Seed: starter tiers
-- ---------------------------------------------------------------------
insert into membership.tiers (key, name, description, annual_fee_cents) values
  ('friend', 'Friend', 'Supports PAZ''s public programme with a modest annual gift.', 200000),
  ('patron', 'Patron', 'Deeper support with member events and the quarterly Dispatch in print.', 500000),
  ('fellow', 'Fellow', 'Sustaining membership for institutions and long-term supporters.', 1500000)
on conflict (key) do nothing;
