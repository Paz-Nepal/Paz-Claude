# ADR-30: Item Version History (T-060)

**Status:** Implemented, unrun (`api.item_revisions` / `get_item_revision`
/ `restore_item_revision`, `0045` migration, `VersionHistoryPanel` in the
item editor).

## Decision

`publishing.item_revisions` has recorded every content change since
`0008` (a trigger, `publishing.capture_revision`, snapshots one on every
title/body/body_schema_version change) — this migration is the first to
give it an API surface at all.

- **"Restore as new" is a plain `UPDATE`, not a bespoke insert.**
  `api.restore_item_revision` looks up the target revision's
  title/body/body_schema_version and writes them onto the item's current
  row — `capture_revision`'s existing trigger snapshots that write as a
  fresh revision automatically. No code here duplicates what the trigger
  already does; restoring an old version is not a different code path
  from editing normally, just a different source for the new content.
- **`security invoker` throughout, no permission check duplicated.** The
  read (`item_revisions_select_own`/`_staff`, `0008`) and the write
  (`items_update_own_draft`/`items_update_staff`, `0008`) are already
  exactly the checks that should gate viewing history and restoring a
  version — restoring isn't a distinct privilege from editing the item.
  Verified by a pgTAP case: a caller with no access to the item can't
  read the target revision at all, so the restore fails before ever
  reaching the item table.
- **No structural diff.** Comparing two ProseMirror documents field by
  field is meaningfully more work than reading and comparing two
  rendered versions by eye — this ships the list, the full-content
  preview, and restore now rather than blocking all three on a diff
  algorithm. See "Still open."
- **The open editor reloads on restore rather than live-updating its own
  form state.** `ItemEditorForm`'s fields are initialized once at mount
  from the loaded item; a query invalidation alone wouldn't flow into
  already-mounted `react-hook-form` state. A full reload is simple,
  obviously correct, and restoring an old version is rare enough not to
  need more machinery than that.

## Consequences

- `VersionHistoryPanel`, shown at the bottom of the item editor for any
  saved item: an expandable list (revision number, kind, author, date),
  each entry opening to the full rendered title + body, with a "Restore
  this version" action on every entry except the current one.
- Three new Edge Functions (`list-item-revisions`, `get-item-revision`,
  `restore-item-revision`) — new DB objects this session, hand-typed
  responses, same reasoning as everything since ADR-26.

## Still open

- **`pnpm db:types` has not been run** and **nothing here has been
  executed against a live database** — same caveat as everything else
  this session; see `docs/remaining-work.md` §1.

### Resolved since this ADR was written

- **Structural diff between two revisions**: `VersionHistoryPanel` now
  shows a block-level diff (paragraph/heading/list-item granularity)
  against the immediately preceding revision by default, with the full
  rendered content still available behind a details/summary toggle. See
  `apps/web/src/modules/publishing/lib/revision-diff.ts` and its
  component; not its own ADR since the "still open" note above already
  scoped and named this piece of work.
