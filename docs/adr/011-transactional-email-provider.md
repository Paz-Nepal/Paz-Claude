# ADR-11: Single Transactional Email Provider Behind an Internal Utility

**Status:** Implemented (`supabase/functions/_shared/send-email.ts`,
`supabase/functions/_shared/resend.ts`)

## Decision

Resend is the transactional email provider. Every Edge Function that needs
to notify a person imports `sendEmail()` from `supabase/functions/_shared/send-email.ts`
— nothing outside that one file is allowed to call `resend.ts` or write a
notification row to `admin.audit_log` directly. Templates are pure,
versioned functions in `supabase/functions/_shared/email-templates.ts`
(`EMAIL_TEMPLATE_VERSION`), written in the institutional voice the
Architecture Blueprint specifies (§8): clear, warm, no urgency theater.

Every send — success or failure — is logged to `admin.audit_log` via
`api.log_system_event` (migration `0036_notification_audit_log.sql`), the
service-role-only entry point for audit rows that have no human actor. A
failed send never blocks or hides the database write it was notifying
about; it's logged and the request still succeeds (see
`request-reservation`'s catch block).

## Why Resend over Postmark

The blueprint left this open pending "deliverability testing from Nepal."
That test has not been run — it requires a live domain and real
sends, which a repository can't do for itself. Resend is chosen now on
narrower grounds: simplest integration (a single HTTP POST, no SDK
dependency needed in Deno), a free tier sufficient for v1.0 volume, and
first-class support for the exact pattern used here (Supabase Edge
Functions calling out over `fetch`). **The deliverability test from Nepal
is still an open operational task** — run it before relying on this for
membership renewal notices or any other time-sensitive send, and revisit
this ADR if it fails.

## Why an internal utility instead of calling Resend from each function

Every Edge Function that sends mail would otherwise duplicate template
rendering, error handling, and audit logging — and a future provider swap
would mean finding and changing every call site instead of one file.
`resend.ts` knows Resend's request shape; nothing else does.

## Consequences

- Provider swap (Resend → Postmark or elsewhere) touches `resend.ts` only.
- A new notification is: one function in `email-templates.ts`, one case in
  `send-email.ts`'s `render()` switch, and a call to `sendEmail()` from
  whichever Edge Function triggers it — no new provider code.
- `RESEND_API_KEY` and `EMAIL_FROM` are Edge Function secrets
  (`supabase secrets set`), never `apps/web` environment variables — the
  frontend never talks to the provider directly (`docs/runbooks/environments.md`).
- Flows wired to this utility so far: hospitality reservation requests
  (`request-reservation`), membership application received
  (`submit-membership-application`), membership application decided
  (`decide-membership-application`), programme session
  registered/waitlisted (`register-for-session`), and the contact form
  (`submit-contact-message`, T-068 — notifies staff, not the submitter;
  see the comment on `api.submit_contact_message`, migration 0037).
- Still not wired in, because the underlying decision was explicitly
  deferred in its own migration and needs more than an email to finish:
  membership **invitation tokens** (D-12 — `0010_membership.sql` notes
  the `invited` application state and single-use acceptance token don't
  exist yet; adding them is a schema change, not just a send) and
  **renewal notice automation** (D-11 — needs a scheduled job runner;
  `.github/workflows/nightly-backup-export.yml` is a working pattern for
  one now, but no renewal-notice job has been built on top of it yet).
