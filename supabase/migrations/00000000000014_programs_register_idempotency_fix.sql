-- 0014_programs_register_idempotency_fix.sql
--
-- programs.register()'s capacity count included the caller's own existing
-- row when re-registering (e.g. a double-submitted request, or any
-- idempotent re-call) — an already-'registered' person got counted against
-- the very capacity check that was about to re-decide their own status,
-- incorrectly bumping them to 'waitlisted' on a session that was in fact
-- exactly full with them in it. Caught live: two sequential registration
-- calls for the same person against a capacity-1 session both ended up
-- 'waitlisted' instead of the first staying 'registered'.

create or replace function programs.register(p_session uuid, p_person uuid)
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
