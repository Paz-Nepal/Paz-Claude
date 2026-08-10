# Auth Configuration

Supabase Auth's own configuration (providers, session lifetimes, MFA
enforcement toggles) lives in the Supabase dashboard, not in a migration
— it's the one piece of this system's security posture that isn't
enforced by something in `supabase/migrations/`. The Build Readiness
Review's §4 answer to that gap: document the intended settings here,
re-verify quarterly that the dashboard still matches this file, and make
sure the one setting that actually matters (MFA enforcement) is backed up
by something structural so a wrong dashboard toggle can't silently open a
hole.

**This file is the source of truth for what the dashboard should say.**
If a quarterly check finds drift, the dashboard is wrong, not this file —
fix the dashboard and note the correction below, don't edit this file to
match an accidental change.

## What's committed as code (`supabase/config.toml`)

Everything below `[auth]` in `supabase/config.toml` is applied by
`supabase start` locally and by `supabase config push` to a linked
project — this is the part of auth config that _is_ code, and it's
already enforced the same way every other migration is (CI runs `supabase
start` from zero on every PR):

| Setting                                           | Value                                     | Why                                                                                                                                                                                                                                                                                                        |
| ------------------------------------------------- | ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `jwt_expiry`                                      | `3600` (1 hour)                           | Short enough that a leaked token has a bounded blast radius; long enough not to force constant silent refreshes.                                                                                                                                                                                           |
| `enable_signup`                                   | `true`                                    | Public sign-up is allowed — the public site needs it (reservation guests, applicants) even though most institutional roles are staff-granted, not self-signed-up.                                                                                                                                          |
| `auth.email.enable_confirmations`                 | `true`                                    | No unconfirmed email gets a working session.                                                                                                                                                                                                                                                               |
| `auth.email.otp_length`                           | `8`                                       | Longer than Supabase's 6-digit default — kept explicit in `config.toml` specifically because a `supabase config push` once silently downgraded it (see the comment in `config.toml`); this file's existence is the fix for that class of drift.                                                            |
| `auth.mfa.totp.enroll_enabled` / `verify_enabled` | `true` / `true`                           | TOTP is the only MFA method enabled. No SMS-based MFA (SIM-swap risk; also an ongoing SMS-provider cost this institution doesn't need).                                                                                                                                                                    |
| `auth.hook.custom_access_token`                   | enabled, `authz.custom_access_token_hook` | Every JWT gets the person's role/permission claims baked in at mint time — RLS policies still re-check live against `authz.has_permission()`/`has_staff_permission()` (the JWT claims are a performance optimization, never trusted alone; see the function's own comment in `0007_authz_jwt_claims.sql`). |

## What's dashboard-only (verify quarterly, not committed anywhere)

These have no `config.toml` key and must be checked by hand in the
Supabase dashboard against this list every quarter (pair it with the
quarterly restore drill — same calendar cadence, same owner):

- **OAuth/social providers**: none enabled. Email+password and TOTP MFA
  only. If a provider is ever added, it belongs in `config.toml` under
  `[auth.external.<provider>]` immediately, not left dashboard-only — the
  same discipline that put `otp_length` in the file after it drifted once
  applies here from the start.
- **Site URL / redirect URLs for staging and production**: `config.toml`'s
  `site_url`/`additional_redirect_urls` are the _local_ values (`http://127.0.0.1:3000`).
  Staging and production each need their own dashboard-configured values
  pointing at their real domains — verify these match the actual deployed
  domain, not a stale one from an earlier deploy target.
- **Rate limits** on sign-in/OTP/email-send: left at Supabase platform
  defaults for now. No institution-specific tuning has been needed; if
  abuse is ever observed, the change and the reason belong in this file.
- **SMTP provider for Auth's own emails** (confirmation, password reset —
  distinct from the application's transactional email in
  `docs/adr/011-transactional-email-provider.md`, which is a separate
  Resend integration for domain notifications, not Auth's built-in mail):
  currently Supabase's shared default sender. This has known deliverability
  limits (low sending volume, shared reputation) — revisit alongside the
  Resend deliverability-from-Nepal test noted as still open in ADR-11;
  Supabase Auth supports a custom SMTP provider if that test recommends
  moving off the shared default.

## MFA enforcement is structural, not a toggle (why this matters)

The dashboard's MFA settings only control whether TOTP _enrollment_ is
possible. Whether MFA is _required_ for a sensitive action is enforced in
the database, not by any auth setting: `authz.has_staff_permission()`
(`0004_authz.sql`) checks `authz.session_aal() = 'aal2'` — the
Authenticator Assurance Level Supabase Auth writes into the JWT itself
after a successful TOTP challenge — before checking the permission at
all. Every RLS policy gating a staff-only action calls
`has_staff_permission()`, never the plain `has_permission()`.

This means: **a mis-toggled dashboard setting cannot silently remove MFA
enforcement.** Someone could disable TOTP enrollment entirely in the
dashboard and every existing staff session would still be checked against
`aal2` — they just couldn't _complete_ the MFA flow anymore, which fails
closed (no `aal2` claim, no staff permission), not open. The dashboard
setting controls onboarding; the database controls authorization. Verify
this file's understanding still holds during the quarterly check by
reading `authz.has_staff_permission`'s definition, not just the dashboard
screen — the function is the actual control.

## Quarterly verification checklist

- [ ] Dashboard auth providers match "What's dashboard-only" above exactly
      (no unexpected provider enabled).
- [ ] Staging and production site URL / redirect URLs point at the
      current real domains.
- [ ] `config.toml`'s committed values still match what `supabase config
push` would apply (run it against staging with `--dry-run` if that
      flag is available in the CLI version in use, or diff manually).
- [ ] Spot-check one staff account: confirm a staff-only action fails
      without MFA and succeeds after a TOTP challenge, in staging.
- [ ] Note the date and who performed the check here:

| Date                                                  | Performed by | Findings |
| ----------------------------------------------------- | ------------ | -------- |
| _(none yet — first check is a Phase 0/1 deliverable)_ |              |          |
