# Erasure Policy

Implements Build Readiness Review D-3 / ADR-17. This is the policy staff
follow; `identity.erase_person()` (migration `0003_identity.sql`) is its
database enforcement.

## Two distinct operations

**Account closure** (self-service, the default). A person disconnects their
login. Their record and history remain untouched — this is not erasure, it
is simply no longer having a password.

**Erasure request** (staff-executed, requires `identity.person.erase`,
which only `super_admin`/`administrator` hold). Used when someone asks to be
forgotten under applicable data-protection expectations.

## What erasure does

- Replaces `full_name` with the placeholder `"Erased Person"`.
- Nulls `display_name`, `email`, `phone`, `bio`, `avatar_path`.
- Disconnects the auth account (`auth_user_id = null`).
- Deletes any avatar files from storage (performed by the calling Edge
  Function, which has storage access the database function does not need).
- Redacts CRM interaction notes that name the person (calling Edge Function).
- Stamps `erased_at` and writes one audit row containing the pre-erasure
  snapshot — this snapshot is the only place that data still exists, and it
  is readable only by `admin.audit_log.read` holders (super_admin,
  administrator).

## What erasure deliberately does NOT do

- **Does not touch published bylines.** A byline on a published article,
  paper, dispatch, or Pigeon Post edition is part of the institutional
  archive, not a data-processing record. Removing it changes the published
  record and requires an Editor decision and a republication — it is an
  editorial act, not something a data-erasure button should do silently.
  If someone wants their name off a published byline, route them to an
  Editor, not to this function.
- **Does not remove a membership number.** The number is retained as a
  tombstone so the institution's membership history stays continuous, even
  though every other identifying field is gone.
- **Does not touch aggregate analytics.** Rollups contain no PII to begin
  with (Architecture Blueprint §4.8).

## Who to route a request to

Any staff member receiving an erasure request should pass it to an
Administrator, who executes it through the admin console (which calls
`identity.erase_person()` via a service-role Edge Function) and confirms
completion to the requester in writing.
