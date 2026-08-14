-- 0058_invitation_acceptance_rate_limiting.sql
--
-- Closes the second half of ADR-36's "Still open" list: membership
-- invitation acceptance was the other genuinely public, unauthenticated
-- intake-shaped endpoint with the same gap (direct anon RPC access,
-- bypassing the Edge Function). It's a token-guessing target specifically
-- -- the raw token is the entire credential -- so a rate limit here is
-- more than the usual anti-abuse floor, it's a real brute-force mitigation.
--
-- verify-member-card (ADR-27, digital card verification) is deliberately
-- left out of this pass: it's already `authenticated`-only, not
-- anon-callable, and further gated by staff-permission RLS internally,
-- so the risk profile is meaningfully lower (docs/remaining-work.md
-- already noted this). Single definition, no arity-overload risk to
-- check for this one (unlike 0057's find).

revoke execute on function api.accept_membership_invitation(text) from anon, authenticated;
grant execute on function api.accept_membership_invitation(text) to service_role;
