-- 0023_drop_more_orphaned_legacy_functions.sql
--
-- Same sweep as 0022: three more legacy trigger functions migration 0019
-- missed when it dropped the Horizons tables. Orphaned once their tables
-- were dropped (no trigger anywhere still references them — confirmed via
-- pg_trigger before writing this), dead code, not actively breaking
-- anything the way 0022's fix was, but cleaned up for the same reason.

drop function if exists public.touch_record();
drop function if exists public.update_search_vector();
drop function if exists public.update_updated_at();
