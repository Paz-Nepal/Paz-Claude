# ADR-15: Duplicate Person Handling & Merge Process

**Status:** Implemented (`supabase/migrations/00000000000003_identity.sql`)

## Decision

Duplicates are merged by `identity.merge_people(survivor, duplicate, actor)`,
which re-points every foreign key referencing `identity.people(id)` by
**discovering them dynamically** through `information_schema` at call time,
rather than maintaining a hand-written list of "tables that reference
people." The duplicate is tombstoned (`merged_into` set, `email` released,
`auth_user_id` cleared) — never hard-deleted. One audit row captures the
full pre-merge snapshot of both records.

## Why dynamic discovery, not a maintained list

The Build Readiness Review specified "a pgTAP test that fails when a new FK
is added without updating the merge function." Implementing the function
with dynamic discovery makes that requirement true by construction instead
of by discipline: a new domain table added six years from now that
references `identity.people` is covered automatically, with no PR to
`merge_people()` required and no way to forget. `supabase/tests/identity/02_merge_people.sql`
proves this by creating a synthetic table the function has never heard of by
name and confirming its foreign key is still re-pointed correctly.

This does not reopen the merge decision — it fulfills the same requirement
more robustly than the originally sketched approach.

## Consequences

- Merges are not reversible by application code; the audit snapshot is the
  only recovery path (documented in the function's own audit `context`).
- `identity.canonical_person(id)` is the single required resolution point
  for any code that might read a merged (tombstoned) row.
- Only `super_admin`/`administrator` (holders of `identity.person.merge`)
  can invoke it, via a service-role Edge Function that re-checks the
  permission itself before calling the database function.
