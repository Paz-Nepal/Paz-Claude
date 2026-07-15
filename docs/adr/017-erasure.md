# ADR-17: Account Deletion & Erasure Specification

**Status:** Implemented (`0003_identity.sql`, `docs/policies/erasure.md`)

## Decision

Two distinct operations:

1. **Account closure** (self-service): disconnect `auth_user_id`; the
   person record and history remain. This is the default and requires no
   special permission.
2. **Erasure** (staff-executed, `identity.person.erase`): scrubs PII from
   `identity.people` via `identity.erase_person()`, preserving the row
   itself (never a hard delete), a member number if one exists (future,
   membership phase), and any published byline (an editorial decision, not
   a data operation — see the policy doc for the reasoning).

## Why this split

An institution with a 100-year archive cannot let a data-erasure request
silently rewrite published intellectual output — that would be closer to
falsifying the record than protecting privacy. Separating "erase personal
data" from "the archive decides what its published record says" keeps both
obligations honest.

## Consequences

- `docs/policies/erasure.md` is the document staff actually follow; this
  ADR is the engineering rationale behind it.
- The database function only handles the `identity` half of erasure;
  storage cleanup and CRM note redaction happen in the calling Edge
  Function (not yet built — lands with the CRM/media phases), which has
  access those tables the database function doesn't need directly.
