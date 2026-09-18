-- Standing Specifications, 18 Sept 2026, "The two rings" / "What the
-- site must therefore not do": "Access to the house is never sold.
-- There is no paid membership for entry or for the use of rooms...
-- A programme gated to a paid tier contradicts this." This was a real,
-- database-enforced gate, not just a UI badge: programs.register()
-- rejected registration outright ("This session is for members only")
-- for anyone who wasn't an active/honorary row in membership.members --
-- the commercial (Friends of PAZ) side of the two rings, not the
-- covenanted Commons the ruling is actually protecting. Removed
-- entirely -- column, gate, and every dependent view/function -- rather
-- than just disabled, so the mechanism to re-gate a programme doesn't
-- sit latent waiting to be flipped back on by someone who doesn't know
-- it's forbidden. This is the same "write the boundary into the
-- schema, don't leave it as an accident" discipline the spec asks for
-- elsewhere (the Record/CRM wall).

-- Dependents first (views can't drop a column via CREATE OR REPLACE;
-- api.save_program's arity is changing, same reasoning), then the
-- column itself.

drop view api.admin_programs;
drop view api.program_sessions;
drop view api.programs;
drop function api.save_program(uuid, text, text, text, boolean, uuid);

create or replace function programs.register(p_session uuid, p_person uuid)
returns programs.registrations
language plpgsql
security definer
set search_path = programs, membership, authz, pg_temp
as $$
declare
  v_session programs.sessions;
  v_taken int;
  v_status programs.registration_status;
  v_reg programs.registrations;
begin
  select * into v_session from programs.sessions where id = p_session for update;
  if not found then
    raise exception 'Session % does not exist', p_session;
  end if;
  if v_session.status <> 'scheduled' then
    raise exception 'This session is not open for registration';
  end if;

  -- Exclude the caller's own row: re-registering (a double-submit, or any
  -- idempotent re-call) must not count against the capacity check that is
  -- about to decide the caller's own status.
  select count(*) into v_taken
  from programs.registrations
  where session_id = p_session and status = 'registered' and person_id <> p_person;

  v_status := case when v_taken < v_session.capacity then 'registered' else 'waitlisted' end;

  insert into programs.registrations (session_id, person_id, status)
  values (p_session, p_person, v_status)
  on conflict (session_id, person_id) do update
    set status = v_status, registered_at = now()
  returning * into v_reg;

  return v_reg;
end;
$$;

alter table programs.programs drop column member_only;

create view api.programs
with (security_invoker = true)
as
select id, slug, title, summary, description_item
from programs.programs
where active;

grant select on api.programs to anon, authenticated;

-- security_invoker = false, matching 0017's fix: anon has no grant on
-- programs.registrations at all (a row can name a person), so an
-- invoker-mode view broke the registered_count subquery for signed-out
-- visitors. The view's own WHERE clause is the sole authorization.
create view api.program_sessions
with (security_invoker = false)
as
select
  s.id, s.program_id, s.starts_at, s.ends_at, s.capacity, s.status,
  v.name as venue_name,
  p.slug as program_slug, p.title as program_title,
  (
    select count(*) from programs.registrations r
    where r.session_id = s.id and r.status = 'registered'
  ) as registered_count
from programs.sessions s
join programs.programs p on p.id = s.program_id
left join programs.venues v on v.id = s.venue_id
where p.active and s.status = 'scheduled';

grant select on api.program_sessions to anon, authenticated;

create view api.admin_programs
with (security_invoker = true)
as
select id, slug, title, summary, active, description_item
from programs.programs;

grant select on api.admin_programs to authenticated;

create function api.save_program(
  p_id uuid,
  p_slug text,
  p_title text,
  p_summary text,
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
    insert into programs.programs (slug, title, summary, description_item)
    values (p_slug, p_title, p_summary, p_description_item)
    returning id into v_id;
  else
    update programs.programs
    set slug = p_slug, title = p_title, summary = p_summary,
        description_item = p_description_item
    where id = p_id
    returning id into v_id;
  end if;
  return v_id;
end;
$$;

revoke all on function api.save_program from public, anon;
grant execute on function api.save_program to authenticated;
