# ADR-25: Membership Renewal Workflow & Expiry (D-11)

**Status:** Implemented, unrun (`send-renewal-notices` Edge Function,
`0040_membership_renewal_notices.sql`,
`.github/workflows/membership-renewal-notices.yml`) — see "Still open"
below.

## Decision

`0010_membership.sql` shipped the status model (`active → lapsed →
paused/resigned/honorary`, D-4) and the 30-day grace period logic, but
explicitly deferred the renewal _notice_ emails pending two things that
didn't exist yet: an email provider (ADR-11) and a scheduled-job pattern.
Both now exist, so this closes D-11's remaining piece:

- **T-30 and T-7 as two independent one-time sends**, not a state
  machine between them. `membership.terms` gets two nullable timestamp
  columns (`renewal_notice_30d_sent_at`, `renewal_notice_7d_sent_at`) —
  each is its own idempotency guard. A term appearing eligible for both
  in the same run (a short-lived term, or a job that missed several days)
  gets both notices; that reading of D-11's "T-30... one reminder at T-7,
  none after" was chosen over trying to suppress the 30-day notice
  retroactively if T-7 arrives first, which would need to reason about
  send order rather than just "has this specific notice gone out yet."
- **Idempotency lives in the schema, not the audit log.** `admin.audit_log`
  already records every send (via `sendEmail()`'s call to
  `api.log_system_event`), but it stays a historical record, not
  something the system's own logic depends on to decide what to do next
  — the same separation of concerns as the rest of this schema (audit
  trails describe what happened; domain tables hold what's true now).
- **Scheduled by GitHub Actions cron, same as the backup jobs** (ADR-10)
  — a daily workflow triggers the Edge Function rather than a person's
  action. This is the first flow in the repository shaped that way, and
  the difference matters: there is no end-user request to forward an
  Authorization header from, so `send-renewal-notices` builds its own
  service-role client and — because `verify_jwt = true` only proves _a_
  valid JWT was presented, not which one — additionally checks the
  caller's bearer token equals `SUPABASE_SERVICE_ROLE_KEY` exactly before
  reading a single row. Every other Edge Function in this repo forwards
  the caller's own JWT and lets RLS/`authz.has_staff_permission` do the
  gating; this one has no caller to delegate to, so the gate is explicit
  instead.

## Why not `pg_cron`

The Build Readiness Review's T-006 spike (verify `pg_cron` availability on
the actual Supabase plan tier) was never run — this repository has no
access to the live project to check. GitHub Actions cron doesn't have
that dependency and is already the established pattern here (ADR-10), so
it's the safer default until T-006 is actually run. If `pg_cron` turns
out to be available and preferred, this workflow is replaceable without
touching the Edge Function itself — the trigger mechanism and the work it
triggers are already separate.

## Still open (account-level setup this repository cannot do for itself)

- **`SUPABASE_PROJECT_URL` and `SUPABASE_SERVICE_ROLE_KEY`** as repository
  secrets — the workflow refuses to run with a clear error if they're
  missing, same pattern as the backup workflows.
- **This has not been triggered against a live Supabase project.** The
  query logic (`api.terms_due_for_renewal_notice`) and the service-role
  gate are hand-verified against the migration's own schema, not run.
- **A member who already renewed stops getting notices on the old term**
  by construction — `terms_due_for_renewal_notice` only considers each
  member's most-recent term (`ends_on = max(ends_on)` for that
  `member_id`), so once a new term row exists (D-11: "Renewal =... new
  `membership.terms` row"), the superseded one is never queried again
  regardless of its own `renewal_notice_*_sent_at` state. This is reasoned
  through against the schema, not observed against a real renewal — worth
  a specific check the first time this runs against real data.
