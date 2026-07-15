-- 0009_schema_usage_grants.sql
--
-- Migrations 0003, 0004, 0006, and 0008 each granted table/view-level
-- privileges on identity.*, authz.*, admin.*, and publishing.* — but none
-- of them granted USAGE on the schema itself. Table grants are inert
-- without it: PostgREST/direct-table access to any of these was silently
-- broken from the moment each migration landed (masked so far because
-- every RLS-gated read the frontend actually exercised went through either
-- a security definer function, which runs as the function owner and never
-- needed caller schema USAGE, or the JWT claims hook, also security
-- definer). Surfaced when api.save_item — security invoker, deliberately,
-- so publishing.items' own RLS is what authorizes the write — tried to
-- insert as an authenticated staff member and got "permission denied for
-- schema publishing".
--
-- (security_invoker views/functions re-check privileges on their
-- underlying tables as the calling role in Postgres 15+, which is exactly
-- why api.published_items, api.my_profile, api.settings, etc. all need
-- this too, not just direct table access.)

grant usage on schema identity to authenticated;
grant usage on schema authz to authenticated;
grant usage on schema admin to authenticated;
grant usage on schema publishing to anon, authenticated;
