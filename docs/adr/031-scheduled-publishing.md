# ADR-31: Scheduled Publishing (T-061)

**Status:** Implemented, unrun (`publishing.item_status` gains
`'scheduled'`, `0046`/`0047` migrations, `api.publish_scheduled_items`,
Edge Functions `schedule-item` / `publish-scheduled`, GitHub Actions
workflow `publish-scheduled-items.yml`).

## Decision

`0008_publishing.sql`'s own header deferred this: "scheduled publishing
(T-061 — needs the job runner decision from T-006)." That decision has
since been made in practice, just never written down as resolving T-061
too — `send-renewal-notices` (ADR-25) and the two backup workflows
(ADR-10) all use GitHub Actions cron instead of `pg_cron`, and the
Architecture Blueprint's own `publish-scheduled` design "already
tolerates either." This closes the gap using the exact same shape as
those two.

- **`'scheduled'` added to `publishing.item_status` in its own
  migration** (`0046`), no other statements — the enum-isolation rule
  this repository already follows for every other enum addition.
- **Three new legal edges on `publishing.transition_item`**
  (draft/in_review → scheduled, scheduled → draft, scheduled →
  published), added via `create or replace function` (0047) — the same
  append-only-parameter technique already used for
  `api.submit_membership_application` (0041) — rather than a new
  function, since this is still fundamentally the same state machine
  with three more edges, not a different concept.
- **Scheduling requires a future `scheduled_for`**, checked inside
  `transition_item` itself, not just in the UI — a past or missing time
  is rejected at the database layer regardless of what called it.
- **The automated job doesn't call `transition_item`.**
  `transition_item` requires a signed-in human actor (`authz.current_person_id()`
  must be non-null) — reasonable for every edge a person triggers, but
  the scheduled-publish job has no person to attribute the change to.
  `api.publish_scheduled_items()` is a separate, service-role-only
  function (same layering as `api.terms_due_for_renewal_notice` /
  `mark_renewal_notice_sent`, ADR-25) that does the equivalent work
  directly — status update, revision snapshot, audit row — with
  `created_by`/`actor` left `null` (both nullable) rather than
  attributed to nobody in particular.
- **Deposit-series items (Paper/Brief/Dispatch/Pigeon Post/Annual) are
  not offered scheduling in the UI.** `publishing.deposit_item()`
  assigns the permanent `deposit_ref` and writes the Record entry by
  calling `transition_item()` internally — which, per the point above,
  needs a human actor the automated job doesn't have. Rather than
  extend `deposit_item`/`transition_item` to support an actor-less
  system path (a change to already-relied-upon core functions, wider
  blast radius, and not verifiable without a live database to test
  against), scheduling stays a manual "Publish" for these five series
  for now. This is a UI-level guard (`transition-buttons.tsx`), not a
  database-level restriction — noted in `transition_item`'s own comment
  in `0047` and in "Still open" below.
- **`kathmanduInputToUtcIso` added to `@paz/utils`** — the reverse of
  the existing `formatKathmanduTime` (UTC → Kathmandu display); nothing
  converted a `<input type="datetime-local">` value _back_ to UTC using
  Kathmandu's fixed +05:45 offset before this. The existing
  `session-form.tsx` datetime inputs use `new Date(value).toISOString()`
  instead, which is only correct by coincidence (the browser's own local
  timezone, not necessarily Kathmandu's) — a pre-existing inconsistency
  this ADR doesn't touch, since fixing it wasn't asked for and risks an
  unrelated behavior change to already-shipped code.

## Consequences

- Item editor: a "Schedule…" control (draft/in_review, non-deposit
  types only) opens an inline Asia/Kathmandu-labeled datetime input;
  "Cancel schedule" and "Publish now" appear once an item is scheduled.
- Editorial desk: a "Scheduled" status filter, and a "Publishes
  <date>" note under the status badge for scheduled items
  (`api.desk_items` gains `scheduled_for`, appended via `create or
replace view` — the same append-only-column restriction as functions).
- `publish-scheduled-items.yml` runs every 15 minutes (`workflow_dispatch`
  also available for manual triggering) — frequent enough that a
  scheduled time means something close to on-time, without being
  wasteful. Needs `SUPABASE_PROJECT_URL`/`SUPABASE_SERVICE_ROLE_KEY` in
  this repository's Actions secrets before it does anything (same gap
  already documented for the renewal-notices workflow).

## Still open

Both items below were closed in migration `0050_block_deposit_series_scheduling.sql`,
after this branch was merged into a session with live Supabase access
(see `docs/remaining-work.md`'s update note at the top):

- ~~**Deposit-series scheduling is UI-only blocked**, not database-
  enforced.~~ **Closed.** `publishing.transition_item`'s
  `draft/in_review -> scheduled` edge now rejects the five deposit types
  (paper/brief/dispatch/pigeon_post/annual) outright, rather than
  teaching the automated job to fabricate a deposit with no human actor
  — the safer of the two options this ADR named. A deposit-series item
  still reaches `published` immediately via `deposit_item()` exactly as
  before; only the `scheduled` path is closed to it. Verified live:
  applied against the linked project, `create function` (not
  `create or replace`) so it doesn't repeat the arity-overload mistake
  documented in `0048`/`0049`.
- ~~**`pnpm db:types` has not been run** and **nothing here has been
  executed against a live database**.~~ **Resolved** by the merge —
  see `docs/remaining-work.md`.
