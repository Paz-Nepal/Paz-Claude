-- 0018_api_venues_view.sql
--
-- The frontend's venue picker queried `supabase.schema("programs").from
-- ("venues")` directly — but PostgREST only exposes `public`/`api`
-- (supabase/config.toml [api] schemas), so every such call failed with
-- "Invalid schema: programs". Caught live: the session-creation form's
-- venue dropdown silently rendered empty (the query error wasn't surfaced
-- in that particular component). Missing api view, not a permissions bug —
-- programs.venues' own RLS already allows anon+authenticated to read it.

create view api.venues
with (security_invoker = true)
as
select id, name, address, capacity
from programs.venues;

grant select on api.venues to anon, authenticated;
