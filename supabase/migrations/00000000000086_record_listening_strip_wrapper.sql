-- 0086_record_listening_strip_wrapper.sql
--
-- The scheduled job reaches the database only through PostgREST, which exposes
-- the api schema, so the name-stripping function of 0085 gets an api wrapper.
-- Service role only, like every other job entry point.
create function api.strip_listening_names()
returns int
language sql
volatile
security definer
set search_path = record, pg_temp
as $$
  select record.strip_listening_names();
$$;
revoke all on function api.strip_listening_names() from public, anon, authenticated;
grant execute on function api.strip_listening_names() to service_role;
