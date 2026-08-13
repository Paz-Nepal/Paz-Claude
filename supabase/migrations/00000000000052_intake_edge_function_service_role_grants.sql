-- 0052_intake_edge_function_service_role_grants.sql
--
-- 0051 switched submit-contact-message and submit-membership-application
-- from an anon client (forwarding the caller's Authorization header) to a
-- service_role client, so their own RPC calls would keep working once
-- anon/authenticated execute was revoked. Missed that each also reads
-- something else with the old anon-forwarded client: the staff
-- notification email in submit-contact-message calls api.site_info(),
-- and the confirmation email in submit-membership-application selects
-- from api.membership_tiers for the human-readable tier name. Neither
-- was ever granted to service_role -- unlike RLS, Postgres's ordinary
-- GRANT/REVOKE checks still apply to service_role, it isn't a blanket
-- bypass. Both are already public, non-sensitive reads (site_info is
-- whitelisted settings; membership_tiers is the public pricing list).

grant execute on function api.site_info() to service_role;
grant select on api.membership_tiers to service_role;
