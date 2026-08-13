-- 0056_api_check_rate_limit_wrapper.sql
--
-- Root cause of the rate limit silently never firing (all 7 live test
-- calls to send-a-pigeon succeeded, zero rows ever written to
-- admin.intake_rate_limits): _shared/rate-limit.ts called
-- `.schema("admin").rpc("check_rate_limit", ...)`, but `admin` was never
-- in PostgREST's exposed schema list (supabase/config.toml's
-- `schemas = ["public", "api"]`) -- api is deliberately the only exposed
-- surface (see the README/blueprint), so that call always failed at the
-- PostgREST-routing level, before grants even mattered, and
-- checkRateLimit's fail-open error handling swallowed it every time.
--
-- The fix is the same pattern already used everywhere else in this
-- codebase: a thin api.* wrapper, not exposing admin directly.

create function api.check_rate_limit(
  p_endpoint text,
  p_ip_hash text,
  p_max_count int default 5,
  p_window_minutes int default 60
)
returns boolean
language sql
volatile
security definer
set search_path = admin, pg_temp
as $$
  select admin.check_rate_limit(p_endpoint, p_ip_hash, p_max_count, p_window_minutes);
$$;

comment on function api.check_rate_limit(text, text, int, int) is
  'Thin wrapper so Edge Functions can reach admin.check_rate_limit via '
  'the one PostgREST-exposed schema. service_role only, same as the '
  'function it wraps.';

revoke all on function api.check_rate_limit(text, text, int, int) from public, anon, authenticated;
grant execute on function api.check_rate_limit(text, text, int, int) to service_role;
