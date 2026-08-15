-- T-040/payments scaffolding follow-up to 0060. initiate-esewa-payment
-- and initiate-khalti-payment need to read a single term's amount_cents
-- on the caller's own behalf, but membership isn't a PostgREST-exposed
-- schema (supabase/config.toml: schemas = ["public", "api"]) -- there
-- was no existing single-term-by-id read in the api schema, only
-- api.member_terms(p_member), which needs a member_id the Edge Function
-- doesn't have. security invoker, so membership.terms' own
-- terms_select_self RLS policy is what actually authorizes this --
-- exactly the same authorization api.member_terms already relies on.
create function api.my_term(p_term uuid)
returns membership.terms
language sql
stable
security invoker
set search_path = membership, pg_temp
as $$
  select * from membership.terms where id = p_term;
$$;

revoke all on function api.my_term(uuid) from public, anon;
grant execute on function api.my_term(uuid) to authenticated;
