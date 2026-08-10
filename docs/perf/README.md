# Query Performance Snapshots

The Build Readiness Review's RLS production discipline (§3.4, point 5)
requires `explain (analyze)` snapshots for the ten hottest queries,
committed here at the end of each phase, so performance drift is visible
in code review instead of discovered in production.

**No snapshots are committed yet.** They can't be produced honestly
without a live database with realistic data volume to run `explain
(analyze)` against — this repository, in the environment these docs were
written in, has no running Postgres instance to generate real output
from, and a fabricated query plan would be actively misleading (someone
would compare a future regression against numbers that were never real).
This file exists so that requirement isn't silently dropped: it's a
documented gap, not an implemented one.

## What to capture, once there's a database to capture it from

Run each query below against a database seeded with realistic volume
(`supabase/seed/synthetic.sql` at a minimum; a staging-scale anonymized
copy is better), using `explain (analyze, buffers)`, and save the output
as `docs/perf/<query-name>.txt` alongside the query itself:

1. `api.published_items` — the public content listing (the query the
   home page and every archive page depend on).
2. `api.search_published(q)` — full-text search over published items.
3. `api.program_sessions` (public calendar) — capacity subquery per row is
   the thing to watch (`§3.3`'s index set was chosen with this in mind).
4. `api.desk_reservations` — the hospitality desk board, filtered by date.
5. `api.membership_applications` — the staff review queue join against
   `identity.people`.
6. `api.member_directory` — the opt-in, active-only member listing.
7. `api.person_timeline(person_id)` (once built — CRM's cross-domain
   union view) — the query most likely to accidentally join more than one
   auxiliary table per policy (§3.4, point 3) as domains are added to it.
8. `admin.audit_log` staff-read query, filtered by `entity_table` +
   `entity_id` — the append-only table's own read path, at whatever row
   count the institution has accumulated by the time this is run.
9. `api.crm_relationships` / `crm.interactions` (relationship detail page)
   — ordered by `occurred_at desc`, checking the index from §3.3 is
   actually used.
10. Whichever admin dashboard query (`analytics` domain) is slowest in
    practice — profile it, don't guess which one from the schema alone.

## What "good" looks like

Per the initplan idiom (§3.4, point 1): every `authz.has_permission(...)`
/ `authz.has_staff_permission(...)` call inside a policy should show up as
a single `InitPlan`, evaluated once per statement — not a `SubPlan`
re-evaluated per row. `supabase/tests/authz/02_rls_initplan.sql` already
asserts this structurally for one representative policy; these snapshots
are the empirical confirmation across the actual hot paths, not a
replacement for that test.

A snapshot that regresses (a `SubPlan` where an `InitPlan` used to be, a
sequential scan where an index scan used to appear) is a signal to fix
the query or the index before merging, not to update the snapshot and
move on.
