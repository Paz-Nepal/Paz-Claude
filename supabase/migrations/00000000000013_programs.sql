-- 0013_programs.sql
--
-- Programmes: venues, programs, sessions, registration with capacity/
-- waitlist, attendance (Build Readiness Review [10] in the dependency
-- graph — depends on publishing for descriptions and membership for
-- member_only gating, both now built).
--
-- Deliberately NOT here (absent, not stubbed):
-- - Waitlist promotion notification email (needs the T-067 email-provider
--   decision, same gap noted for membership's application flow).
-- - Recurring/series sessions. v1 sessions are single occurrences; a
--   "repeat weekly" convenience is a frontend batch-insert feature, not a
--   schema one, and isn't built until there's a real programme that needs it.

create type programs.session_status as enum ('scheduled', 'cancelled', 'completed');
create type programs.registration_status as enum ('registered', 'waitlisted', 'cancelled', 'attended', 'no_show');

-- ---------------------------------------------------------------------
-- programs.venues
-- ---------------------------------------------------------------------
create table programs.venues (
  id       uuid primary key default gen_random_uuid(),
  name     text not null,
  address  text,
  capacity int check (capacity is null or capacity > 0)
);

alter table programs.venues enable row level security;
grant select on programs.venues to anon, authenticated;
grant insert, update on programs.venues to authenticated;

create policy venues_select_all on programs.venues
  for select to anon, authenticated using (true);

create policy venues_manage_staff on programs.venues
  for all to authenticated
  using ((select authz.has_staff_permission('programs.venue.manage')))
  with check ((select authz.has_staff_permission('programs.venue.manage')));

-- ---------------------------------------------------------------------
-- programs.programs
-- ---------------------------------------------------------------------
create table programs.programs (
  id                uuid primary key default gen_random_uuid(),
  slug              text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title             text not null,
  summary           text,
  description_item  uuid references publishing.items (id) on delete set null,
  member_only       boolean not null default false,
  active            boolean not null default true,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
comment on column programs.programs.description_item is
  'Optional: a publishing.items row (type page) carrying the long-form '
  'description, so the same editor/workflow/media tooling that runs the '
  'website runs this too. Nullable because a programme can exist (sessions '
  'schedulable) before its write-up is ready.';

create trigger programs_set_updated_at
  before update on programs.programs
  for each row execute function public.set_updated_at();

alter table programs.programs enable row level security;
grant select on programs.programs to anon, authenticated;
grant insert, update on programs.programs to authenticated;

create policy programs_select_active on programs.programs
  for select to anon, authenticated using (active);

create policy programs_select_staff on programs.programs
  for select to authenticated
  using ((select authz.has_staff_permission('programs.program.read')));

create policy programs_manage_staff on programs.programs
  for all to authenticated
  using ((select authz.has_staff_permission('programs.program.manage')))
  with check ((select authz.has_staff_permission('programs.program.manage')));

-- ---------------------------------------------------------------------
-- programs.sessions
-- ---------------------------------------------------------------------
create table programs.sessions (
  id         uuid primary key default gen_random_uuid(),
  program_id uuid not null references programs.programs (id) on delete restrict,
  venue_id   uuid references programs.venues (id) on delete set null,
  starts_at  timestamptz not null,
  ends_at    timestamptz not null,
  capacity   int not null check (capacity > 0),
  status     programs.session_status not null default 'scheduled',

  constraint sessions_valid_range check (ends_at > starts_at)
);

create index sessions_program_idx on programs.sessions (program_id, starts_at);
create index sessions_upcoming_idx on programs.sessions (starts_at) where status = 'scheduled';

alter table programs.sessions enable row level security;
grant select on programs.sessions to anon, authenticated;
grant insert, update on programs.sessions to authenticated;

create policy sessions_select_of_visible_program on programs.sessions
  for select to anon, authenticated
  using (
    exists (
      select 1 from programs.programs p
      where p.id = program_id and p.active
    )
  );

create policy sessions_select_staff on programs.sessions
  for select to authenticated
  using ((select authz.has_staff_permission('programs.program.read')));

create policy sessions_manage_staff on programs.sessions
  for all to authenticated
  using ((select authz.has_staff_permission('programs.program.manage')))
  with check ((select authz.has_staff_permission('programs.program.manage')));

-- ---------------------------------------------------------------------
-- programs.registrations
-- ---------------------------------------------------------------------
create table programs.registrations (
  id            uuid primary key default gen_random_uuid(),
  session_id    uuid not null references programs.sessions (id) on delete restrict,
  person_id     uuid not null references identity.people (id) on delete restrict,
  status        programs.registration_status not null default 'registered',
  registered_at timestamptz not null default now(),
  attended_at   timestamptz,

  unique (session_id, person_id)
);
comment on table programs.registrations is
  'One row per person per session, ever — cancelling sets status rather '
  'than deleting, so a re-registration is a status flip (register() '
  'upserts on the (session_id, person_id) key) and history survives.';

create index registrations_session_idx on programs.registrations (session_id, status);
create index registrations_person_idx on programs.registrations (person_id);

alter table programs.registrations enable row level security;
grant select on programs.registrations to authenticated;
-- No direct insert/update grant: all writes go through programs.register()/
-- cancel_registration()/mark_attendance() (security definer), so capacity
-- and waitlist accounting can never be bypassed by a direct write.

create policy registrations_select_self on programs.registrations
  for select to authenticated
  using (person_id = (select authz.current_person_id()));

create policy registrations_select_staff on programs.registrations
  for select to authenticated
  using ((select authz.has_staff_permission('programs.registration.read')));

-- ---------------------------------------------------------------------
-- Schema usage
-- ---------------------------------------------------------------------
grant usage on schema programs to anon, authenticated;

-- ---------------------------------------------------------------------
-- programs.register(session, person) — capacity + waitlist, race-safe
-- ---------------------------------------------------------------------
create function programs.register(p_session uuid, p_person uuid)
returns programs.registrations
language plpgsql
security definer
set search_path = programs, membership, authz, pg_temp
as $$
declare
  v_session programs.sessions;
  v_program programs.programs;
  v_taken int;
  v_status programs.registration_status;
  v_reg programs.registrations;
begin
  -- Row-lock the session for the duration of the capacity check + insert —
  -- this is what makes the capacity count race-safe under concurrent
  -- registration attempts (Build Readiness Review T-088's "race test").
  select * into v_session from programs.sessions where id = p_session for update;
  if not found then
    raise exception 'Session % does not exist', p_session;
  end if;
  if v_session.status <> 'scheduled' then
    raise exception 'This session is not open for registration';
  end if;

  select * into v_program from programs.programs where id = v_session.program_id;
  if v_program.member_only then
    if not exists (
      select 1 from membership.members m
      where m.person_id = p_person and m.status in ('active', 'honorary')
    ) then
      raise exception 'This session is for members only' using errcode = '42501';
    end if;
  end if;

  select count(*) into v_taken
  from programs.registrations
  where session_id = p_session and status = 'registered';

  v_status := case when v_taken < v_session.capacity then 'registered' else 'waitlisted' end;

  insert into programs.registrations (session_id, person_id, status)
  values (p_session, p_person, v_status)
  on conflict (session_id, person_id) do update
    set status = v_status, registered_at = now()
  returning * into v_reg;

  return v_reg;
end;
$$;

revoke all on function programs.register(uuid, uuid) from public, anon;
grant execute on function programs.register(uuid, uuid) to authenticated;

-- ---------------------------------------------------------------------
-- programs.cancel_registration(registration) — self or staff; promotes
-- the earliest waitlisted registration into the freed seat.
-- ---------------------------------------------------------------------
create function programs.cancel_registration(p_registration uuid)
returns void
language plpgsql
security definer
set search_path = programs, authz, pg_temp
as $$
declare
  v_reg programs.registrations;
  v_promoted uuid;
begin
  select * into v_reg from programs.registrations where id = p_registration for update;
  if not found then
    raise exception 'Registration % does not exist', p_registration;
  end if;

  if v_reg.person_id <> authz.current_person_id()
     and not authz.has_staff_permission('programs.registration.manage') then
    raise exception 'Not permitted to cancel this registration' using errcode = '42501';
  end if;

  if v_reg.status = 'cancelled' then
    return;
  end if;

  -- Lock the session row too so a concurrent register() can't slot into
  -- the seat before the waitlist promotion below runs.
  perform 1 from programs.sessions where id = v_reg.session_id for update;

  update programs.registrations set status = 'cancelled' where id = p_registration;

  if v_reg.status = 'registered' then
    select id into v_promoted
    from programs.registrations
    where session_id = v_reg.session_id and status = 'waitlisted'
    order by registered_at
    limit 1
    for update;

    if v_promoted is not null then
      update programs.registrations set status = 'registered' where id = v_promoted;
    end if;
  end if;
end;
$$;

revoke all on function programs.cancel_registration(uuid) from public, anon;
grant execute on function programs.cancel_registration(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- programs.mark_attendance(registration, attended)
-- ---------------------------------------------------------------------
create function programs.mark_attendance(p_registration uuid, p_attended boolean)
returns programs.registrations
language plpgsql
security definer
set search_path = programs, authz, pg_temp
as $$
declare
  v_reg programs.registrations;
begin
  if not authz.has_staff_permission('programs.registration.manage') then
    raise exception 'Not permitted to mark attendance' using errcode = '42501';
  end if;

  update programs.registrations
  set status = case when p_attended then 'attended' else 'no_show' end,
      attended_at = case when p_attended then now() else null end
  where id = p_registration and status in ('registered', 'attended', 'no_show')
  returning * into v_reg;

  if not found then
    raise exception 'Registration % is not eligible for attendance marking (not a registered seat)', p_registration;
  end if;
  return v_reg;
end;
$$;

revoke all on function programs.mark_attendance(uuid, boolean) from public, anon;
grant execute on function programs.mark_attendance(uuid, boolean) to authenticated;

-- ---------------------------------------------------------------------
-- api surface
-- ---------------------------------------------------------------------

create view api.programs
with (security_invoker = true)
as
select id, slug, title, summary, member_only, description_item
from programs.programs
where active;

grant select on api.programs to anon, authenticated;

create view api.program_sessions
with (security_invoker = true)
as
select
  s.id, s.program_id, s.starts_at, s.ends_at, s.capacity, s.status,
  v.name as venue_name,
  p.slug as program_slug, p.title as program_title, p.member_only,
  (
    select count(*) from programs.registrations r
    where r.session_id = s.id and r.status = 'registered'
  ) as registered_count
from programs.sessions s
join programs.programs p on p.id = s.program_id
left join programs.venues v on v.id = s.venue_id
where p.active and s.status = 'scheduled';

grant select on api.program_sessions to anon, authenticated;

-- Public/self-service: register for a session. Handles both signed-in
-- callers (current_person_id()) and anonymous ones (email dedupe, same
-- pattern as api.submit_membership_application) — a public programme
-- shouldn't require an account to attend.
create function api.register_for_session(
  p_session uuid,
  p_full_name text,
  p_email text,
  p_phone text
)
returns programs.registration_status
language plpgsql
security definer
set search_path = programs, identity, authz, public, pg_temp
as $$
declare
  v_person_id uuid := authz.current_person_id();
  v_reg programs.registrations;
begin
  if v_person_id is null then
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
  end if;

  v_reg := programs.register(p_session, v_person_id);
  return v_reg.status;
end;
$$;

revoke all on function api.register_for_session from public;
grant execute on function api.register_for_session to anon, authenticated;

create function api.cancel_my_registration(p_registration uuid)
returns void
language sql
volatile
security invoker
set search_path = programs, pg_temp
as $$
  select programs.cancel_registration(p_registration);
$$;

revoke all on function api.cancel_my_registration from public, anon;
grant execute on function api.cancel_my_registration to authenticated;

-- Staff: my own upcoming registrations (member-facing "my registrations"
-- surface — self-service, no special permission needed beyond sign-in).
create view api.my_registrations
with (security_invoker = true)
as
select
  r.id, r.status, r.registered_at,
  s.id as session_id, s.starts_at, s.ends_at,
  p.title as program_title, p.slug as program_slug
from programs.registrations r
join programs.sessions s on s.id = r.session_id
join programs.programs p on p.id = s.program_id
where r.person_id = (select authz.current_person_id());

grant select on api.my_registrations to authenticated;

-- Staff: full session roster (names/emails via the same narrow accessors
-- used by membership, not a direct identity.people join).
create function api.session_roster(p_session uuid)
returns table (
  registration_id uuid,
  person_name text,
  person_email citext,
  status programs.registration_status,
  registered_at timestamptz
)
language sql
stable
security definer
set search_path = programs, identity, authz, pg_temp
as $$
  select r.id, identity.display_name(r.person_id), identity.email_for(r.person_id),
         r.status, r.registered_at
  from programs.registrations r
  where r.session_id = p_session
    and (select authz.has_staff_permission('programs.registration.read'))
  order by r.registered_at;
$$;

revoke all on function api.session_roster from public, anon;
grant execute on function api.session_roster to authenticated;

create function api.mark_attendance(p_registration uuid, p_attended boolean)
returns programs.registration_status
language sql
volatile
security invoker
set search_path = programs, pg_temp
as $$
  select (programs.mark_attendance(p_registration, p_attended)).status;
$$;

revoke all on function api.mark_attendance from public, anon;
grant execute on function api.mark_attendance to authenticated;

-- Staff: create/update programs and sessions. security invoker — the
-- tables' own RLS (programs_manage_staff / sessions_manage_staff) is the
-- authority.
create function api.save_program(
  p_id uuid,
  p_slug text,
  p_title text,
  p_summary text,
  p_member_only boolean,
  p_description_item uuid
)
returns uuid
language plpgsql
security invoker
set search_path = programs, pg_temp
as $$
declare
  v_id uuid;
begin
  if p_id is null then
    insert into programs.programs (slug, title, summary, member_only, description_item)
    values (p_slug, p_title, p_summary, coalesce(p_member_only, false), p_description_item)
    returning id into v_id;
  else
    update programs.programs
    set slug = p_slug, title = p_title, summary = p_summary,
        member_only = coalesce(p_member_only, member_only),
        description_item = p_description_item
    where id = p_id
    returning id into v_id;
  end if;
  return v_id;
end;
$$;

revoke all on function api.save_program from public, anon;
grant execute on function api.save_program to authenticated;

create function api.save_session(
  p_id uuid,
  p_program_id uuid,
  p_venue_id uuid,
  p_starts_at timestamptz,
  p_ends_at timestamptz,
  p_capacity int
)
returns uuid
language plpgsql
security invoker
set search_path = programs, pg_temp
as $$
declare
  v_id uuid;
begin
  if p_id is null then
    insert into programs.sessions (program_id, venue_id, starts_at, ends_at, capacity)
    values (p_program_id, p_venue_id, p_starts_at, p_ends_at, p_capacity)
    returning id into v_id;
  else
    update programs.sessions
    set venue_id = p_venue_id, starts_at = p_starts_at, ends_at = p_ends_at, capacity = p_capacity
    where id = p_id
    returning id into v_id;
  end if;
  return v_id;
end;
$$;

revoke all on function api.save_session from public, anon;
grant execute on function api.save_session to authenticated;

-- Staff: full (including inactive/cancelled) program + session listings
-- for the admin console.
create view api.admin_programs
with (security_invoker = true)
as
select id, slug, title, summary, member_only, active, description_item
from programs.programs;

grant select on api.admin_programs to authenticated;

create view api.admin_program_sessions
with (security_invoker = true)
as
select
  s.id, s.program_id, s.venue_id, s.starts_at, s.ends_at, s.capacity, s.status,
  p.title as program_title,
  (
    select count(*) from programs.registrations r
    where r.session_id = s.id and r.status = 'registered'
  ) as registered_count
from programs.sessions s
join programs.programs p on p.id = s.program_id;

grant select on api.admin_program_sessions to authenticated;
