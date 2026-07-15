-- 0017_program_sessions_anon_fix.sql
--
-- api.program_sessions (security_invoker = true) computes registered_count
-- via a subquery against programs.registrations — but anon has no grant on
-- that table at all (only authenticated does, deliberately, since a
-- registrations row can name a person). As invoker, anon's own query hit
-- "permission denied for table registrations" the first time a signed-out
-- visitor loaded a programme page. The seat count itself isn't sensitive
-- (a number, no PII) and the view's own WHERE clause (active programs,
-- scheduled sessions) already matches what the underlying RLS would have
-- allowed anyway — same reasoning as api.member_directory and
-- api.site_info: switch to security_invoker = false so the view runs as
-- owner, with its WHERE clause as the sole authorization.

create or replace view api.program_sessions
with (security_invoker = false)
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
