-- 0055_service_role_submit_pigeon_grant.sql
--
-- Last layer of the same issue 0053/0054 fixed: api.send_a_pigeon is
-- security invoker, so the caller -- service_role, since 0051 -- needs
-- its own EXECUTE grant on publishing.submit_pigeon, not just schema
-- USAGE (0054). publishing.submit_pigeon was only ever granted to
-- anon/authenticated (0033), from back when api.send_a_pigeon was still
-- directly anon-callable and the distinction didn't matter.

grant execute on function publishing.submit_pigeon(text, text, text) to service_role;
