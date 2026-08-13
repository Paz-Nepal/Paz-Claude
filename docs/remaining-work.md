# Remaining Work Index

A single index of everything still open to call the PAZ OS build complete,
compiled by auditing the actual repository state against the Build
Readiness Review's `T-001`–`T-100` list (§9) and every ADR's own "Still
open" section — not by re-reading the task list alone. Grouped by why
it's still open, since that determines who can close it and how.

Last compiled: 2026-08-13, at commit `c79586c` on `claude/paz-os-work-cayqnz`.

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

## 2. Deliberately deferred — now actually unblockable

These were explicitly deferred in the original migrations pending a
decision that later work in this session has, in practice, already made.
Worth revisiting before assuming they still need T-006.

- **T-061 — scheduled publishing UI + `publish-scheduled` job.**
  `0008_publishing.sql`'s own header says this "needs the job runner
  decision from T-006." That decision has since been made, just not
  written down as such: `send-renewal-notices` (ADR-25) and the two
  backup workflows (ADR-10) all use GitHub Actions cron instead of
  `pg_cron`, and the Architecture Blueprint itself says the
  `publish-scheduled` design "already tolerates either." Building this
  now would mean: a `scheduled_for timestamptz` column + a `scheduled`
  `item_status` value (own migration, per the enum-isolation rule), a
  cron-triggered Edge Function mirroring `send-renewal-notices`'
  shape, and a scheduling UI in the item editor labeled Asia/Kathmandu
  per the task's own note.
- **T-049 — redirects + slug-change trigger.** Deferred "until the
  prerender pipeline" (0008's header) — but the table, trigger, and a
  redirect check in the public router don't actually depend on
  prerendering existing first; that dependency was assumed, not
  structural. Could be built as a standalone piece.

---

## 3. Real gaps — buildable now, no external blocker

Ordered roughly by size.

- **T-060 — version history UI.** `publishing.item_revisions` has
  existed since `0008` (every save already writes a revision row via
  trigger) with zero frontend consumer. A revision list + diff view +
  "restore as new" action in the item editor is pure frontend work
  against data that already exists.
- **T-059 — review flow: inline comments, decision panel, send-back
  note.** `publishing.transition_item()` takes no notes/comment
  parameter at all today — `transition-buttons.tsx` is a bare
  approve/reject action with no text field. Needs a schema decision
  (a notes column on the transition call vs. a proper comments table)
  before any UI.
- **T-048 — autosave coalescing.** The `item_revisions` migration's own
  comment says "today every save is 'manual'" — autosave (`kind =
'autosave'`, coalesced writes rather than one row per keystroke-driven
  save) was explicitly left for later. Needs both a debounced save path
  in `item-editor-page.tsx` and a coalescing rule in the write function
  (don't create a new row per autosave tick within some window).
- **T-095 (frontend half) — CRM person timeline UI.**
  `api.person_timeline` exists (`0020_crm.sql`); no admin page reads it.
  Same "backend built, zero frontend consumer" shape as `api.my_profile`
  and `api.my_membership` were before this session — worth checking the
  rest of the API surface for more of these before assuming this is the
  last one.
- **T-047 — pgTAP transition-matrix coverage.** `supabase/tests/publishing/02_items_rls.sql`
  has one incidental "bad status insert should fail" assertion, not the
  full legal/illegal edge matrix the task calls for (draft→in_review,
  in_review→published, published→archived, archived→draft, and every
  illegal skip like draft→published directly — permission-checked per
  edge, per role).
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
- **Digital card QR/barcode** (ADR-27 "Still open"). No image-generation
  dependency was available to add blind earlier in this session — worth
  reconsidering now that this same session proved a real `playwright`
  install and headless Chromium both work end-to-end here (used for the
  component-workshop accessibility gate, ADR-28). A QR library is a much
  smaller ask than a browser automation stack; this is more "wasn't
  revisited" than "structurally blocked" at this point.

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
