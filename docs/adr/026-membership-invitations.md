# ADR-26: Membership Invitations (D-12)

**Status:** Implemented, unrun (`membership.invite_applicant` /
`accept_invitation` / `reissue_invitation`, `0039`/`0040` migrations,
`invite-membership-applicant` + `accept-membership-invitation` Edge
Functions) — see "Still open" below.

## Decision

`0010_membership.sql` explicitly deferred this: "the `invited`
intermediate state needs the email-sending decision (T-067) to mean
anything, so it's not modeled until that exists." ADR-11 resolved that
dependency; this closes D-12 on top of it.

- **`invited` added as its own migration** (`0039`), no other statements
  in it — Postgres `ALTER TYPE ... ADD VALUE` has historically needed to
  run alone (Build Readiness Review §3.6), and this repository already
  follows that rule for every other enum addition (`0024_publishing_item_type_enum.sql`).
- **Tokens are hashed at rest, never stored raw.** `membership.invitations.token_hash`
  is a sha256 digest (pgcrypto); the raw token exists only in the instant
  `invite_applicant`/`reissue_invitation` generate it and in the email
  sent to the applicant. A database dump can never be used to accept an
  invitation on someone's behalf — the same reasoning as password-reset
  tokens anywhere else.
- **One invitation row per application, replaced in place on re-issue**,
  not accumulated as history. Only the current token is ever valid;
  there's no product need to know about superseded ones, and
  `admin.audit_log` already records the decision to invite/re-issue
  through the domain functions' normal audit path (D-14's convention,
  reused here — those two functions don't insert directly into audit_log
  themselves, `authz.has_staff_permission`'s check plus the eventual
  member/application row changes are what's audited).
- **Acceptance requires a person to click a button, not to just open a
  link.** `accept-membership-invitation` is a `POST` with the token in a
  JSON body, not a `GET` with the token in the URL alone — email clients'
  automated link scanners/prefetchers (a real, common failure mode) would
  otherwise consume a single-use token before the actual applicant ever
  sees it. The frontend page (`accept-invitation-page.tsx`) requires an
  explicit "Accept invitation" click before it calls anything.
- **`api.accept_membership_invitation` is `SECURITY DEFINER`**, the one
  exception to this codebase's general preference for `SECURITY INVOKER`
  API wrappers (matching `hospitality.request_reservation`'s style):
  there is no caller authz context to preserve for an anonymous
  token-bearer, and `membership.accept_invitation` itself grants execute
  to nobody by name — only the wrapper's ownership makes the call
  possible, deliberately, so nothing can reach the accept logic except
  through this one named, versioned entry point.

## Consequences

- `membership.accept_invitation` returns just the new `member_no` (`text`),
  not the full `membership.members` row — matching
  `api.decide_membership_application`'s existing "return the narrow
  thing" precedent rather than exposing an internal row shape to an
  anonymous caller.
- Accepted terms are unpaid (`recorded_by = null`) — same as
  `decide_application`'s accepted path — a staff member records the
  actual payment later via `record_payment()`.
- The applications review UI's "Invite" button
  (`application-row.tsx`) is additive to the existing Accept/Decline
  actions — a `pending` application can now go three ways instead of two.
  Re-issuing an expired invitation is wired at the API/hook level
  (`useInviteApplication({ id, reissue: true })`) but has no dedicated UI
  affordance yet — the applications list doesn't currently distinguish
  `invited` rows with their own actions, it falls into the same generic
  "Decided" bucket as accepted/declined. A `Database["membership"]["Enums"]["application_status"]`
  regenerated type would be needed to safely add a status-specific branch
  there (see "Still open").

## Still open

- **`pnpm db:types` has not been run** — this environment had no live
  Supabase instance to generate against. `packages/types/src/database.generated.ts`
  does not yet know about `invited`, `membership.invitations`, or any of
  the five new functions/views this ADR adds. Every place this ADR's code
  touches the frontend routes through Edge Functions with hand-written
  return types specifically to avoid depending on stale generated types
  (matching the pattern already used for `admin.contact_messages` earlier
  this session) — but a proper "re-issue" affordance in the applications
  list, or anything that needs to type-narrow on `status === 'invited'`,
  should wait for real generated types rather than accumulate more
  hand-cast workarounds.
- **Not run against a live database at all.** The token hashing, the
  enum addition, the exclusion of already-accepted/expired tokens — all
  hand-verified against the migration's own schema, not executed.
- **No rate limiting on `accept-membership-invitation`**, same known gap
  as every other public intake function in this repository (T-068).
