-- 0037_fix_redirects_grant.sql
--
-- Live bug found while smoke-testing 0036: an RLS policy alone doesn't
-- grant access in Postgres -- it only narrows rows once a table-level GRANT
-- already permits the operation. 0036 enabled RLS and added
-- redirects_select_all but never actually granted SELECT on the table, so
-- api.get_redirect() (security invoker) failed for anon with "permission
-- denied for table redirects" on every call. Same class of miss as 0034.

grant select on publishing.redirects to anon, authenticated;
