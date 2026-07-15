-- 0015_programs_cancel_null_actor_fix.sql
--
-- programs.cancel_registration()'s permission check was
-- `if v_reg.person_id <> authz.current_person_id() and not
-- has_staff_permission(...) then raise`. When current_person_id() is null
-- (an authenticated session with no linked identity.people row — not
-- reachable through this app's normal signup trigger, but not otherwise
-- impossible), `<>` against null yields null, `null and anything` is null,
-- and PL/pgSQL treats a null IF-condition as false — silently skipping the
-- permission check instead of denying. Caught by inspection while
-- verifying the adjacent cancel/promote logic live, not by an actual
-- exploit. Hardened to fail closed.

create or replace function programs.cancel_registration(p_registration uuid)
returns void
language plpgsql
security definer
set search_path = programs, authz, pg_temp
as $$
declare
  v_reg programs.registrations;
  v_actor uuid := authz.current_person_id();
  v_promoted uuid;
begin
  select * into v_reg from programs.registrations where id = p_registration for update;
  if not found then
    raise exception 'Registration % does not exist', p_registration;
  end if;

  if (v_actor is null or v_reg.person_id <> v_actor)
     and not authz.has_staff_permission('programs.registration.manage') then
    raise exception 'Not permitted to cancel this registration' using errcode = '42501';
  end if;

  if v_reg.status = 'cancelled' then
    return;
  end if;

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
