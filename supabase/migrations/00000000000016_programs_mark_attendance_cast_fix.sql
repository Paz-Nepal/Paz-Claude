-- 0016_programs_mark_attendance_cast_fix.sql
--
-- mark_attendance()'s CASE expression produced untyped text ('attended' /
-- 'no_show'), which Postgres won't implicitly cast to the
-- registration_status enum column in an UPDATE ... SET — failed the first
-- time it was actually called ("column status is of type
-- registration_status but expression is of type text").

create or replace function programs.mark_attendance(p_registration uuid, p_attended boolean)
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
  set status = case when p_attended then 'attended' else 'no_show' end::programs.registration_status,
      attended_at = case when p_attended then now() else null end
  where id = p_registration and status in ('registered', 'attended', 'no_show')
  returning * into v_reg;

  if not found then
    raise exception 'Registration % is not eligible for attendance marking (not a registered seat)', p_registration;
  end if;
  return v_reg;
end;
$$;
