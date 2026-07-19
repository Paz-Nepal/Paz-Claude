-- 0027_fix_anon_identity_schema_usage.sql
--
-- Live bug found while browser-testing the public site (Task 19): every
-- anonymous request to a CMS page or article (api.get_published_item,
-- api.published_items) fails with "permission denied for schema identity".
-- Both are security_invoker and call identity.display_name(uuid) in their
-- select list -- EXECUTE was granted to anon on that function back in 0008,
-- but 0009's schema-usage sweep only covered `authenticated`, not `anon`
-- (0009 line 21: "grant usage on schema identity to authenticated;").
-- Calling a schema-qualified function still requires USAGE on its schema
-- regardless of the function's own EXECUTE grant.
--
-- Safe to grant: schema USAGE alone exposes no data by itself -- table
-- access to identity.people is still gated by its own RLS + grants (staff
-- only), and the two functions anon can call in this schema
-- (display_name, email_for) are narrow, security-definer, purpose-built
-- public accessors, not table access.

grant usage on schema identity to anon;
