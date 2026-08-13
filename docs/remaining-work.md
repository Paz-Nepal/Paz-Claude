# Remaining Work Index

A single index of everything still open to call the PAZ OS build complete,
compiled by auditing the actual repository state against the Build
Readiness Review's `T-001`–`T-100` list (§9) and every ADR's own "Still
open" section — not by re-reading the task list alone. Grouped by why
it's still open, since that determines who can close it and how.

Last compiled: 2026-08-13, at commit `7527789` on `claude/paz-os-work-cayqnz`
(revised after closing T-049, T-060, T-061, T-095, T-047, the digital
card QR code, and the notes half of T-059 — see each item's status
below for what moved and why).

---

## 1. Blocked on live infrastructure access

Nothing in this group can be built further without a running Supabase
project (or, for the last two, real third-party accounts). This is the
single largest category by impact — it also caveats every item in every
other section below.

| Item                                                               | What's needed                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **T-006** — plan-tier spike                                        | Log into the actual Supabase project and confirm PITR / `pg_cron` / Image Transformations availability; write the ADR the spike is supposed to produce. Nothing here can be simulated honestly.                                                                                                                                                                                                                                                                                                                                                                                      |
| **`pnpm db:types`** never run                                      | `packages/types/src/database.generated.ts` has never been regenerated against a live database. Every DB object added since ADR-26 (invitations, contact messages, renewal notices, search, communication preferences, digital card) is routed through Edge Functions with hand-written response types specifically to work around this — see each ADR's "Still open." Running this once would let those hand-written types be replaced with real generated ones and unblock the UI polish noted in ADR-26/27 (e.g. a proper `status === 'invited'` branch in the applications list). |
| **Every migration, pgTAP test, and RLS policy added this session** | Hand-verified against the migration's own SQL, never executed. `supabase start` + `pnpm test:db` against a real local instance is the first real gate all of it needs to pass.                                                                                                                                                                                                                                                                                                                                                                                                       |
| **T-021** — image-transform strategy spike                         | Needs T-006's plan-tier answer before choosing on-the-fly vs. on-ingest transforms.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| **T-007** — real staging + production Supabase projects            | The env-promotion _runbook_ exists (`docs/runbooks/environments.md`); the projects themselves don't.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| **ADR-10 backups**, **ADR-25 renewal notices**                     | Both implemented as GitHub Actions workflows, both need real secrets (R2/age credentials; `SUPABASE_SERVICE_ROLE_KEY`/`PUBLIC_SITE_URL`) in the repo's Actions secrets before their first real run.                                                                                                                                                                                                                                                                                                                                                                                  |

---

## 2. Deliberately deferred — now closed

These were explicitly deferred in the original migrations pending a
decision that later work in this session had, in practice, already made.
Both are now built.

- ~~**T-061 — scheduled publishing UI + `publish-scheduled` job.**~~
  **Closed.** `0008_publishing.sql`'s own header said this "needs the
  job runner decision from T-006" — that decision was already made in
  practice (`send-renewal-notices`/ADR-25 and the two backup workflows/
  ADR-10 all use GitHub Actions cron, not `pg_cron`). Built as
  `'scheduled'` item status (`0046`), three new `transition_item` edges
  (`0047`), `api.publish_scheduled_items()` (service-role only, no
  human actor required), `schedule-item`/`publish-scheduled` Edge
  Functions, and `publish-scheduled-items.yml` (every 15 minutes). See
  ADR-31 for what's still UI-only (deposit-series exclusion).
- ~~**T-049 — redirects + slug-change trigger.**~~ **Closed.** The
  "needs the prerender pipeline first" dependency (0008's header) was
  assumed, not structural — built as `publishing.redirects` +
  `items_slug_redirect` trigger + `api.resolve_redirect`, wired into
  all 7 published-content page types via `NotPublishedOrRedirect`.

---

## 3. Real gaps — buildable now, no external blocker

- ~~**T-060 — version history UI.**~~ **Closed.** `api.item_revisions`/
  `get_item_revision`/`restore_item_revision` (`0045`) + `VersionHistoryPanel`
  in the item editor. No structural diff between revisions (comparing
  two ProseMirror docs field-by-field is separate, larger work) — see
  ADR-30.
- **T-059 — review flow: inline comments, decision panel, send-back
  note.** **Partially closed.** The send-back-note half is done:
  `transition_item`/`api.transition_item` take an optional `p_notes`
  (`0048`), stored on the transition's revision and shown in
  `VersionHistoryPanel`; `SendBackControl` replaces the old plain-click
  "Send back to draft" with an inline optional-note form. **Inline
  comments anchored to a position in the document are not built** —
  that needs a position-anchoring scheme resilient to concurrent edits
  plus its own UI, a meaningfully larger piece of work. See ADR-35.
- **T-048 — autosave coalescing.** **Deliberately not attempted.** The
  natural implementation point is `publishing.capture_revision`, the
  trigger every save/transition/restore already depends on — extending
  it to coalesce autosave writes is a change to core, shared logic that
  isn't safely verifiable without a live database to test against (same
  reasoning as the deposit-series scheduling exclusion in ADR-31). See
  ADR-35 "Still open." Still needs: a debounced save path in
  `item-editor-page.tsx` and a coalescing rule in the write function.
- ~~**T-095 (frontend half) — CRM person timeline UI.**~~ **Closed.**
  `api.person_timeline` (`0044`) + `PersonTimeline` component, wired
  into the relationship detail page. See ADR-29.
- ~~**T-047 — pgTAP transition-matrix coverage.**~~ **Closed.**
  `supabase/tests/publishing/07_transition_matrix.sql` — all 6 legal
  edges (allow + deny, matched to the exact permission each requires)
  and all 6 illegal edges (rejected by the state machine itself, not a
  missing grant).
- **T-088 (partial) — concurrency/race test for `programs.register()`.**
  Capacity/waitlist locking exists in the function; `supabase/tests/programs/01_rls.sql`
  only covers RLS, not a genuine concurrent-registration race. pgTAP's
  single-transaction-rollback model can't really simulate two
  connections racing each other — this may need a different tool
  (a small script opening two real connections against a local Supabase
  instance) rather than another pgTAP file, which is itself worth
  deciding explicitly rather than silently declaring "done" with an RLS
  test that doesn't test what T-088 asked for.

---

## 4. Deliberately out of scope for this environment

Each of these needs either a real third-party account/service this
environment doesn't have, or was explicitly placed outside Claude's
scope by the user ("deployment stays with me").

- **T-065 — prerender pipeline** and **T-066 — Cloudflare deploy hook.**
  Both need the actual hosting target's specifics (which this session
  was told stays with the user: _"at the end i will change the hosted
  files to the complete project completed here"_). Building a deploy
  hook against a Cloudflare project that doesn't exist yet would be
  fabricated, not implemented.
- **T-037/T-099 — analytics beacon + events table + rollup job.**
  `0032_analytics.sql`'s own header calls this out explicitly: a
  first-party visitor-counting beacon is a product/privacy decision
  ("cookieless," what gets counted, retention) that wasn't made by the
  original planning docs either — flagged there as needing sign-off
  before building, not silently skipped.
- ~~**Digital card QR/barcode**~~ **Closed.** Added `qrcode.react`;
  `member-card-page.tsx` now renders a `QRCodeSVG` of the verification
  token next to the existing text code. ADR-27 updated.

---

## 5. Documented, small, cross-cutting

Each already has a line in its own ADR's "Still open" — collected here
so they're visible in one place instead of five files.

- **No rate limiting** on every public intake endpoint: contact form
  (T-068), membership invitation acceptance (ADR-26), digital card
  verification (ADR-27, though staff-auth-gated so lower risk).
- **Component workshop coverage is the shell**, not every real state a
  consuming page constructs (ADR-28) — e.g. `Field` wired to a live
  `react-hook-form` validation error, `RichText` against real seed
  articles rather than a hand-built sample doc.
- **Bundle budget is JS-size only**, no LCP/Lighthouse metric (ADR-27's
  sibling gap in `docs/perf/README.md`) — needs a served build + headless
  Chrome to measure honestly, deliberately not approximated.
- **No `explain (analyze)` query snapshots** (`docs/perf/README.md`) —
  needs a database with realistic data volume to profile against.
- **Deposit-series scheduling is a UI-only guard, not database-enforced**
  (ADR-31 "Still open") — a caller using the API directly could still
  schedule a Paper/Brief/Dispatch/Pigeon Post/Annual item, which would
  publish without a `deposit_ref` or Record entry.
- **`session-form.tsx`'s datetime handling** uses
  `new Date(value).toISOString()` (browser-local timezone) rather than
  the `kathmanduInputToUtcIso()` helper added for scheduled publishing
  (ADR-31) — only correct by coincidence when the browser's local zone
  happens to be Kathmandu's. Not touched, to avoid an unrelated
  behavior change to already-shipped code.
- **No structural diff in the version history UI** (ADR-30) — revisions
  are shown in full, not as a field-by-field comparison.

---

## How to use this

Section 1 is the actual bottleneck — most of section 3 and all of
section 2 could be built blind the same way everything in this session
was (hand-verified against schema, never executed), but every one of
them would carry the same "unrun" caveat until section 1's live-database
gap closes. If a live Supabase instance becomes available, **running the
full existing test suite against it for the first time** is higher
priority than starting anything new in section 2 or 3 — it's the one
action that would upgrade "hand-verified" to "verified" for the entire
last ~20 commits of this session at once.
