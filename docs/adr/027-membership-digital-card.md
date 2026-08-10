# ADR-27: Membership Digital Card (T-083)

**Status:** Implemented, unrun (`membership.members.card_token_hash`,
`api.my_membership` / `api.issue_my_card` / `api.verify_member_card`,
`0042` migration, `get-my-membership` / `issue-member-card` /
`verify-member-card` Edge Functions) — see "Still open" below.

## Decision

`0001_foundation.sql`'s schema comment on `membership` already named
"digital card" as part of this domain; no ADR or detailed spec existed
for it beyond that one phrase and the T-083 task line. This ADR is that
design, made now rather than left further deferred.

- **No separate `card` table.** A card is just `membership.members` plus
  a verification secret — the member's name, tier, status, and join date
  are already there; nothing about "having a card" is separate state
  from "being a member."
- **Verification is by opaque token, not by `member_no`.** `member_no`
  is a small sequential counter (`membership.next_member_no()`, 0010) —
  `PAZ-00001`, `PAZ-00002`, … — and would be trivially enumerable if it
  alone were enough to look up a member's status. `card_token_hash`
  holds a second, unguessable value instead, hashed at rest (sha256,
  pgcrypto), the same pattern as `membership.invitations.token_hash`
  (ADR-26): a database dump can never be used to forge a valid-looking
  card. Reissuing (`api.issue_my_card`, callable any time) overwrites
  the hash, immediately invalidating the previous code — no history of
  past codes is kept, matching invitations' "one row, replaced in place."
- **No QR/barcode.** This environment has no image-generation dependency
  available to add, and adding one blind (untested against a real build)
  isn't something to commit to a repository the user will host
  elsewhere. The verification code is a 12-character hex string (6
  bytes, `gen_random_bytes`) — short enough to read aloud or retype by
  hand. See "Still open."
- **Verification is staff-authenticated, not public.** `api.verify_member_card`
  is `security invoker`, relying entirely on `membership.members`' own
  `members_select_staff` RLS policy (`membership.member.read`, which
  itself requires aal2) — no new permission key was added. A
  non-staff caller gets zero rows, not an error, the same "empty, not
  denied" shape as every other RLS-scoped read in this codebase. Because
  verification requires staff credentials to even attempt, the 12-hex-char
  code's ~48 bits of entropy is adequate — this is not a public,
  internet-brute-forceable endpoint the way a password-reset token is.
- **`api.my_membership` explicitly filters by `person_id`, not left to
  RLS alone.** `members_select_self` and `members_select_staff` are OR'd
  permissive policies — a `security_invoker` view with no additional
  `WHERE` would let a staff member who is _also_ a member see every row
  `members_select_staff` allows through, not just their own, the moment
  they viewed their own card. The view adds its own
  `where person_id = (select authz.current_person_id())`, the same
  reasoning `api.my_profile`'s explicit `auth.uid()` filter already
  uses (0005). Covered by a dedicated pgTAP fixture (a person who is
  both `membership_manager` and a member).
- **`api.issue_my_card` is `security definer`.** `authenticated` has no
  UPDATE grant on `membership.members` (0010: "created only by
  decide_application(), status changed only by set_member_status()") —
  a `security invoker` function would fail outright. This mirrors
  `api.update_my_directory_opt_in`, whose own comment claims "security
  invoker" but whose code has always been `security definer` — that
  comment is stale, not a design to copy; this ADR notes it rather than
  repeating it.
- **Only active or honorary members can issue a card.** A lapsed, paused,
  or resigned member's issue attempt is rejected outright (`42501`)
  rather than silently succeeding with a code that would immediately
  read as invalid — the point of an "issue" step is to hand someone
  something usable, not something to already know is broken.

## Consequences

- Member-facing: `/membership/card`, cross-linked from the existing
  self-service `/account` page. Shows member_no, tier, status, join
  date, and — once requested — the verification code, with a button to
  issue or rotate it.
- Staff-facing: `/admin/members/verify-card`, linked from the members
  roster (`/admin/members`). A person types the code a member reads off
  their card and gets back name/member_no/tier/status/valid.
- All three new DB objects (`my_membership`, `issue_my_card`,
  `verify_member_card`) are routed through Edge Functions on the
  frontend rather than called directly via `supabase-js` — same reason
  as every other object introduced this session:
  `packages/types/src/database.generated.ts` was never regenerated
  against a live database, so a direct typed call would either fail to
  typecheck or silently rely on a hand-cast `any`.

## Still open

- **No QR/barcode.** The verification code is text-only. A future pass
  with a real build environment (able to install and actually exercise
  an image/QR-generation dependency) could render it as a scannable code
  on the card page; the underlying token format doesn't need to change
  for that, since it's already just an opaque string.
- **`pnpm db:types` has not been run** and **nothing here has been
  executed against a live database.** The status/permission logic is
  hand-verified against the migration's own schema and covered by
  pgTAP, not run.
- **No rate limiting on `verify-member-card`.** The endpoint requires
  staff auth (aal2) to reach at all, which is a meaningfully higher bar
  than the public intake functions this gap is already documented
  against (T-068) — but a compromised staff session could still be used
  to enumerate codes at whatever rate the Edge Function allows.
