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

**Update, same day, after merge into `main` (commit `b593cfe`):** this
branch was merged into the session that had live Supabase project access.
Section 1's central premise — "nothing here can be built further without
a running Supabase project," "never regenerated," "never executed" — no
longer holds for most of it: `pnpm db:types` has now been run against the
live project (the hand-written Edge Function response types this note
told you to replace, e.g. in ADR-26/27, can now be swapped for real
generated ones), and every migration/pgTAP policy from this branch has
been applied and, where reachable without Docker, exercised live rather
than only hand-verified — see the merge commit message for the two real
bugs that surfaced only once migrations 0048/0049 actually ran (`create
or replace function` silently creating a second overload instead of
replacing in place, twice). The pgTAP suite itself still hasn't executed
anywhere except CI (no local Docker in the merging session either) — that
part of section 1 stands. T-006/T-007/T-021 (plan tier, staging/prod
projects, image-transform strategy) and the ADR-10/ADR-25 secrets are
still genuinely open; nothing below was touched by the merge.

**Update, 2026-08-15:** closed T-035's still-open note (Field/RichText now
have real-validation/seed-data stories, ADR-28), T-060's still-open note
(structural diff, ADR-30), T-071's still-open Lighthouse/LCP half
(`scripts/check-lcp-budget.mjs`, `docs/perf/README.md`), added
Devanagari-aware full-text search (migration `0059`), and added the
bilingual `/ne/` route tree with hreflang/canonical tags. Also built
online payment scaffolding (eSewa/Khalti, migrations `0060`/`0061`, 4
Edge Functions, ADR-37) **ahead of** the Architecture Blueprint's own
Phase 3 scoping ("deliberately deferred rather than half-built", §4.4) —
asked the user directly given the direct conflict with that stated
principle, and built it at their explicit choice. See ADR-37 for every
caveat: it has never run against a real eSewa/Khalti endpoint, no
merchant account exists for either gateway yet, and it needs a real
security review before Phase 3 is actually reached.

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
  Capacity/waitlist locking exists in the function (`select ... for
update` on the session row before the capacity check — architecturally
  sound); `supabase/tests/programs/01_rls.sql` only covers RLS, not a
  genuine concurrent-registration race. pgTAP's single-transaction-
  rollback model can't really simulate two connections racing each
  other.
  **Attempted, blocked on tooling/credentials, not on difficulty**: the
  session with live database access has no Postgres connection string,
  no `SUPABASE_SERVICE_ROLE_KEY`, and no real authenticated test user on
  the live project (correctly — these are secrets it shouldn't have) —
  so there's no way to open genuinely concurrent connections against it.
  `supabase db query` (the one available tool) doesn't support real
  parallel invocations either: five backgrounded calls hung rather than
  racing. Test setup/teardown (a capacity-2 session, five contending
  people) was built and cleanly removed; the actual concurrent-call step
  was never run rather than faked. Needs either a local `supabase start`
  instance (no Docker in this environment) or someone with the service
  role key / DB password running a small two-connection script by hand.

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

- ~~**No rate limiting** on the contact form, pigeon post, membership
  application, and membership invitation acceptance.~~ **Closed for all
  four** — see ADR-36: a real IP-based limit, enforced at the only place
  a real client IP is ever visible (the Edge Function each now runs
  behind exclusively; the underlying RPCs are service_role-only as of
  `0051`/`0058`). Invitation acceptance got a tighter window (10/hour)
  since the raw token is the entire credential — this one is a
  brute-force mitigation, not just an anti-spam floor. Surfaced three
  real bugs along the way (two duplicate function overloads each leaving
  a bypass live, and `service_role` never having schema-level `USAGE`
  grants at all) — all fixed, see the ADR. **Still open**: digital card
  verification (ADR-27) — deliberately deferred, already
  `authenticated`-only and staff-permission-gated, a meaningfully lower
  risk profile than the four closed here.
- **Component workshop coverage is the shell**, not every real state a
  consuming page constructs (ADR-28) — e.g. `Field` wired to a live
  `react-hook-form` validation error, `RichText` against real seed
  articles rather than a hand-built sample doc.
- **Bundle budget is JS-size only**, no LCP/Lighthouse metric (ADR-27's
  sibling gap in `docs/perf/README.md`) — needs a served build + headless
  Chrome to measure honestly, deliberately not approximated.
- **No `explain (analyze)` query snapshots** (`docs/perf/README.md`) —
  needs a database with realistic data volume to profile against.
- ~~**Deposit-series scheduling was a UI-only guard, not database-enforced.**~~
  **Closed** — migration `0050` blocks the `draft`/`in_review` →
  `scheduled` edge for Paper/Brief/Dispatch/Pigeon Post/Annual inside
  `publishing.transition_item` itself, the only function that ever
  changes `status`. A caller using the API directly gets a clear
  exception, not a silently-published item with no `deposit_ref`. See
  ADR-31.
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
