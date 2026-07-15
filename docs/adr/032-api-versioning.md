# ADR-32: API Surface Versioning

**Status:** Implemented (`api` schema convention; `0005_api_schema.sql`)

## Decision

Views and functions in the `api` schema are the only database objects
exposed to PostgREST (`supabase/config.toml`, `[api] schemas`). A **breaking**
change to a view's shape (removing/renaming a column, changing a type)
requires creating a new versioned object (`api.published_items_v2`)
alongside the old one; the old one is dropped in a later migration only
after clients have moved. **Additive** changes (a new nullable column) may
be made in place.

## Why

This is what makes "replace the frontend without touching the backend"
(the point of the headless/API-first posture, Architecture Blueprint §1.2)
actually true rather than aspirational. Without a versioning discipline, the
first convenient schema tweak during a feature deadline breaks whatever
consumes that view, and the API stops being a real contract.

## Consequences

- Every `api.*` view/function carries a comment stating this rule (see
  `api.my_profile` for the template).
- `docs/runbooks/` will get an "api deprecation" runbook once the first
  view actually needs a `_v2` — not written speculatively now.
