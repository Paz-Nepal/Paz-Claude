-- 0051_intake_rate_limiting.sql
--
-- Closes a real gap flagged in docs/remaining-work.md §5: "no rate
-- limiting on every public intake endpoint" (contact form, pigeon post,
-- membership application). A rate limit enforced only inside an Edge
-- Function is not actually a rate limit if the underlying RPC it wraps
-- is still directly callable via PostgREST with the anon key -- an
-- attacker just skips the Edge Function. So this closes it from both
-- ends: a shared IP-based check (admin.check_rate_limit, called by each
-- Edge Function, which is the only place a real client IP is visible at
-- all), and revoking anon/authenticated's direct execute grant on the
-- three RPCs these Edge Functions wrap, so the Edge Function -- and the
-- rate limit inside it -- is now the only path in. Cloudflare Turnstile
-- was the originally-designed defense for the pigeon intake specifically
-- and is unrelated to this: still deferred pending a site key, this is a
-- floor underneath it and everything else, not a replacement for it.

create table admin.intake_rate_limits (
  id bigint generated always as identity primary key,
  endpoint text not null,
  ip_hash text not null,
  occurred_at timestamptz not null default now()
);

create index intake_rate_limits_lookup on admin.intake_rate_limits (endpoint, ip_hash, occurred_at);

comment on table admin.intake_rate_limits is
  'One row per accepted attempt at a rate-limited public intake endpoint. '
  'ip_hash is SHA-256 of the raw IP, never the IP itself (this repo does '
  'not retain reader-identifying data even for anti-abuse purposes when a '
  'hash serves exactly as well). Rows older than a day are opportunistically '
  'deleted by admin.check_rate_limit itself -- there is no separate cleanup '
  'job for what is, by volume, a tiny table.';

alter table admin.intake_rate_limits enable row level security;
-- No policies: RLS with zero policies denies every row to every role
-- except the table owner and superuser, which is the point -- this table
-- is written and read exclusively through the security-definer function
-- below, never through PostgREST directly.

create function admin.check_rate_limit(
  p_endpoint text,
  p_ip_hash text,
  p_max_count int default 5,
  p_window_minutes int default 60
)
returns boolean
language plpgsql
security definer
set search_path = admin, pg_temp
as $$
declare
  v_count int;
begin
  delete from admin.intake_rate_limits where occurred_at < now() - interval '1 day';

  select count(*) into v_count
  from admin.intake_rate_limits
  where endpoint = p_endpoint
    and ip_hash = p_ip_hash
    and occurred_at > now() - (p_window_minutes || ' minutes')::interval;

  if v_count >= p_max_count then
    return false;
  end if;

  insert into admin.intake_rate_limits (endpoint, ip_hash) values (p_endpoint, p_ip_hash);
  return true;
end;
$$;

comment on function admin.check_rate_limit(text, text, int, int) is
  'Records this attempt and reports whether it is within the limit --
  call it once per request, before doing the actual write, and refuse the
  request if it returns false. service_role only: called from inside
  Edge Functions, which are the only place a real client IP is available
  to hash in the first place.';

revoke all on function admin.check_rate_limit(text, text, int, int) from public, anon, authenticated;
grant execute on function admin.check_rate_limit(text, text, int, int) to service_role;

-- ---------------------------------------------------------------------
-- Force the three public intake RPCs these Edge Functions wrap behind
-- the Edge Function -- and its rate-limit check -- as the only path in.
-- Each Edge Function switches from the anon key (forwarding the caller's
-- own Authorization header) to the service_role key to keep working
-- after this revoke.
-- ---------------------------------------------------------------------
revoke execute on function api.send_a_pigeon(text, text, text) from anon, authenticated;
grant execute on function api.send_a_pigeon(text, text, text) to service_role;

revoke execute on function api.submit_contact_message(text, text, text) from anon, authenticated;
grant execute on function api.submit_contact_message(text, text, text) to service_role;

revoke execute on function api.submit_membership_application(text, text, text, text, text, jsonb)
  from anon, authenticated;
grant execute on function api.submit_membership_application(text, text, text, text, text, jsonb)
  to service_role;
