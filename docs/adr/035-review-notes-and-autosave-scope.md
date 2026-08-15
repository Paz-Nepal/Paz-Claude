# ADR-35: Review Flow Notes, and Autosave (T-059/T-048)

**Status:** Implemented, unrun (notes half) / not attempted (autosave
half). `0048` migration adds `publishing.item_revisions.notes` and
extends `publishing.transition_item`/`api.transition_item`/
`api.item_revisions`; `SendBackControl` in `transition-buttons.tsx`;
`VersionHistoryPanel` shows the note on a revision that has one.

## Decision

The Build Readiness Review's T-059 ("review flow: inline comments,
decision panel, send-back note") and T-048 ("autosave") are two
different sizes of work bundled under one line each. This ADR splits
them and closes only the well-scoped, safely-buildable half of each.

### T-059 — a note attached to a transition, not inline comments

- **"Inline comments anchored to a position in the document" is a
  meaningfully larger, separate feature** — it needs a place to store a
  position within a ProseMirror document (an anchor that survives
  further edits), a UI for placing and resolving them, and its own
  permission/visibility model. That's out of scope here.
- **What this closes instead: an optional note on the transition
  itself** — most useful on a send-back ("needs a stronger lede — see
  paragraph 2"), but not restricted to one; `p_notes` is a plain
  optional parameter on `transition_item`, usable on any edge.
  `publishing.item_revisions` gains a nullable `notes` column, set only
  when the caller passes one.
- **`create or replace function`, appending `p_notes` as the fourth
  parameter** to both `publishing.transition_item` and
  `api.transition_item` — the same append-only-parameter technique
  already used for `p_scheduled_for` (`0047`) and
  `submit_membership_application` (`0041`). `api.item_revisions` gains
  `notes` appended at the end of its `RETURNS TABLE` list, the same
  restriction that applies to `create or replace view`.
- **Frontend split the same way scheduling was split** (ADR-31):
  `p_notes` doesn't touch the `p_to` literal union, so `useTransitionItem`
  stayed on a direct typed `.rpc()` call — the extra field passes
  through via `asArgs()` rather than needing a new Edge Function.
- **UI:** the old plain-click "Send back to draft" action was replaced
  with `SendBackControl`, an inline form offering an optional note
  before submitting — a single click can no longer send an item back
  without the option to explain why. `VersionHistoryPanel` shows the
  note (quoted, muted text) under any revision that has one.

### T-048 — not attempted

Autosave means periodically writing a draft's in-progress content
without the author explicitly saving. The natural implementation point
is `publishing.capture_revision`, the trigger every save, transition,
and restore already goes through to snapshot a revision — but that
trigger is core, already-relied-upon logic: every write path in the
publishing domain depends on its current behavior, and coalescing
autosave writes correctly (e.g. not creating a new revision row every
few seconds, or debouncing at the right layer) is a change to that
shared logic, not an additive one. Extending it blind, with no live
database to verify the change doesn't alter the snapshot behavior every
other path already depends on, is the same category of risk this
session declined twice already: the deposit-series scheduling exclusion
(ADR-31) and the decision not to touch `session-form.tsx`'s timezone
handling. T-048 is left untouched and stays open in
`docs/remaining-work.md`.

## Consequences

- Sending an item back to draft during review now optionally carries a
  note the author can read in the item's version history.
- Notes are visible wherever revisions are: `api.item_revisions` (list)
  already carried enough columns to show them without a second query.
- No inline/positional commenting exists yet; a reviewer's only channel
  for feedback beyond a send-back note is still out-of-band (chat,
  email, etc.).
- No autosave exists yet; authors must still explicitly save. Content
  loss on an unsaved tab close remains a real risk, same as before this
  ADR.

## Still open

- **Inline/anchored comments** (the rest of T-059's original scope) —
  not started; would need a position-anchoring scheme resilient to
  concurrent edits, plus its own UI.
- **`pnpm db:types` has not been run** and **nothing here has been
  executed against a live database** — same caveat as everything else
  this session; see `docs/remaining-work.md` §1.

### Resolved since this ADR was written

- **Autosave (T-048)**: migration `0062` adds `publishing.autosave_item`
  (a separate write path from `api.save_item`, RLS-authorized the same
  way) and coalescing logic in `publishing.capture_revision` itself —
  repeated autosave ticks update the most recent revision in place
  (same actor, within 10 minutes, itself an autosave) instead of each
  inserting its own, while a manual save is completely unaffected: same
  insert-a-fresh-revision behavior as before this migration, byte for
  byte. `item-editor-page.tsx` debounces 3s after the last title/body
  change (English or Nepali) and calls the new `autosave-item` Edge
  Function. Verified live against the linked project (not just
  hand-verified): two autosave ticks coalesced into one revision, a
  manual save created its own fresh checkpoint, and a third autosave
  tick after that started a new revision rather than overwriting the
  checkpoint — see migration `0062`'s own header for the full test.
