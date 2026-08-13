# ADR-29: CRM Person Timeline (T-095/D-14)

**Status:** Implemented, unrun (`api.person_timeline`, `0044` migration,
`get-person-timeline` Edge Function, `PersonTimeline` component on
`RelationshipDetailPage`).

## Decision

`0020_crm.sql`'s own header deferred this explicitly: "belongs with
whichever migration lands last among the domains it unions, not here;
adding it now would mean revisiting it on every subsequent migration
anyway." Every domain it unions (identity, membership, programs,
hospitality, crm itself) now exists, so this is that last migration —
closing a gap that had sat as a documented absence, not a stub, since
`0020`.

- **`security invoker`, no permission check duplicated in the function.**
  Each of the seven `union all` branches is a plain `select` against a
  table that already has its own staff-only RLS policy
  (`crm.interactions`/`relationships`/`pledges`,
  `membership.applications`/`terms`, `programs.registrations`,
  `hospitality.reservations`). A caller lacking a given category's
  permission simply gets zero rows from that branch — RLS is the single
  source of truth for "who can see what," rather than a parallel set of
  `authz.has_permission()` calls in this function that could drift from
  what the underlying tables actually enforce. Covered by a pgTAP fixture
  giving one viewer broad access and another only `membership_manager`,
  confirming the partial-visibility split actually happens.
- **`crm.interactions`/`crm.pledges` join through `crm.relationships`,
  not a direct `person_id` column** — neither table has one; both are
  scoped by `relationship_id`, and `crm.relationships` itself holds
  either a `person_id` or an `org_id` (never both, per its own check
  constraint). The join is one hop, not a recursive walk.
- **The Build Readiness Review's own text names this "ADR-28."** That
  number was already taken by this session's component workshop
  (ADR-28, written first). This is ADR-29 instead — the "020–021,
  023–024, 029" bucket row in `docs/adr/README.md` already reserved 029
  for an unassigned CRM decision, which this fills naturally rather than
  forcing a renumber of an already-committed ADR.

## Consequences

- Surfaced on `RelationshipDetailPage` (`/admin/relationships/:id`) as a
  "Full timeline" section below the relationship-specific interaction
  log, whenever the relationship's subject is a person (not an
  organization) — the existing "History" section stays scoped to just
  this relationship's logged interactions; the new section is the
  cross-domain view D-14 describes.
- `api.person_timeline` is routed through an Edge Function on the
  frontend rather than a direct typed RPC call — new object this
  session, same reasoning as everything since ADR-26.

## Still open

- **`pnpm db:types` has not been run** and **nothing here has been
  executed against a live database** — same caveat as everything else
  this session; see `docs/remaining-work.md` §1.
- Not surfaced from `MemberDetailPage` or anywhere else a person is
  viewed outside the CRM relationships flow — `PersonTimeline` is a
  standalone component specifically so that's a drop-in addition later,
  not a redesign.
