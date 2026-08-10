# Disaster Recovery

This is the runbook the Build Readiness Review's §4 required change asked
for: a decision tree, a restore order, and an explicit answer to the
auth-restore question the Architecture Blueprint left open. It exists
so a bad night doesn't turn into a bad month of improvising.

**Prerequisite this runbook depends on and does not itself provide:** the
nightly off-platform export (`nightly-backup-export`: `pg_dump` of every
schema + a storage object manifest + an incremental storage mirror,
encrypted, to a second provider under separate credentials — Architecture
Blueprint §9) is specified but **not yet implemented in this repository**
(no `scripts/backup-export.*`, no scheduled job). Until it exists and has
been through at least one quarterly restore drill, everything below is
the _procedure_ for a disaster this project cannot yet actually survive.
Building that job is call T-026/T-027 in the Build Readiness Review's
100-task backlog and should be treated as still P0, not merely "nice to
finish."

## 1. Who declares an incident

Any of the two Super Admins (`docs/runbooks/environments.md` — the only
two accounts with dashboard access beyond read-only) may declare a
disaster-recovery incident. Declaring it means:

1. Post in the institution's incident channel: what's down, since when,
   suspected cause if known.
2. Assign an **incident lead** — the Super Admin who declared it, unless
   they explicitly hand it off. One person drives; everyone else is asked
   before they act, not after.
3. Start a timestamped log (a shared doc is fine) of every action taken
   from this point on. The quarterly restore drill produces a template
   for this; use it if one exists, start a blank one if not.

A disaster-recovery incident is: production data loss or corruption,
production database or auth unreachable for reasons Supabase support
cannot resolve within the RTO, or a confirmed compromise of the
`service_role` key or a Super Admin credential. A regular outage
Supabase's own status page shows them actively fixing is not this — page
the incident lead only if the outage will blow the RTO below.

## 2. RPO / RTO, stated honestly

The Architecture Blueprint's target: **RPO 24 hours, RTO 1 week**
(the "restore to self-hosted Postgres + a generic object store within one
week using only the repository and the latest backup" test, §9).

That number assumes the nightly export exists and has been drilled. Two
things must be verified, not assumed, before trusting it in a live
incident:

- **PITR availability on the actual Supabase plan tier** — Build
  Readiness Review §4 item 1. If the project is on a tier without PITR,
  the floor is whatever the last nightly logical backup captured, and the
  RPO is honestly "up to 24 hours plus however stale that backup job's
  last successful run was" — check the backup job's own success log
  first, in step 3 below, before quoting a number to anyone.
- **The nightly export job is actually green.** A backup that silently
  stopped running three weeks ago is not a backup, it's a false sense of
  one. This is why the Architecture Blueprint says "a failed backup pages
  someone" (§9) — if that paging isn't wired up yet, checking the job's
  last-success timestamp by hand is step 3, every time, no exceptions.

## 3. Restore order

Restore in this order — each step depends on the one before it:

1. **Database.** Provision a fresh Postgres (self-hosted or a new
   Supabase project), restore from the latest verified `pg_dump`, run
   every migration in `supabase/migrations/` in order to confirm the
   restored schema matches what the repository says it should be (`supabase
db diff` should come back empty — the same check CI runs on every PR).
2. **Storage.** Restore the object mirror into a fresh bucket (or the new
   Supabase project's storage), matching `publishing.media.storage_path`
   values so nothing in the restored database points at a missing object.
   Verify with a spot-check: pick five recently-published items, confirm
   their `featured_media` and inline images resolve.
3. **Auth users.** See §4 below — this is the step with a real decision
   to make, not just a mechanical restore.
4. **DNS / traffic.** Only after 1–3 are verified working against the
   restored stack does DNS (or the deploy target) move traffic to it.
   Cutting over before the database and auth are confirmed consistent
   turns one incident into two.

Verify each step before moving to the next. A restore that "looks done"
after step 1 but has a broken storage mirror is worse than a slower,
verified restore — institutional memory doesn't get a second draft.

## 4. The auth-restore caveat (the decision the Blueprint left open)

`pg_dump` of the `auth` schema includes `auth.users`, and that includes
password hashes — so a same-provider Supabase restore brings sign-in back
intact. A restore to **self-hosted** Postgres does not automatically
bring sign-in back with it: GoTrue (Supabase's auth server) would need to
be stood up separately and pointed at the restored `auth` schema, which
is real infrastructure work under incident pressure, not a `pg_dump`
away.

**Decision (per the Build Readiness Review's recommendation): on a
catastrophic restore to self-hosted, do not attempt to stand up GoTrue
under incident pressure. Force a password reset for every account
instead.**

What that means in practice:

- Every `identity.people` row with a non-null `auth_user_id` gets an
  email (once the restored stack can send one — `docs/adr/011-transactional-email-provider.md`)
  explaining that a password reset is required and why.
- MFA-enrolled staff (`aal2` requirement, Architecture Blueprint §8.2)
  re-enroll their authenticator from scratch — TOTP secrets are not
  something a database restore can recover by design.
- This is a same-provider-Supabase-restore non-issue: restoring to a
  fresh Supabase project (not self-hosted) keeps GoTrue as part of the
  platform and `auth.users` restores normally. The forced-reset path is
  specifically the self-hosted exit scenario — which is also exactly the
  scenario the "exit-capable Supabase posture" (Architecture Blueprint
  §5, ADR self-hosting rationale) exists to make survivable at all, even
  at this cost.

## 5. After the incident

- Close out the timestamped log from step 1; it becomes the incident
  record.
- Run the quarterly restore-drill verification script (once it exists —
  T-027) against the _actual_ restored production data as a sanity check,
  not just the drill's scratch database.
- Write a one-page postmortem: what happened, what the restore actually
  took (compare against the 1-week RTO), what would have made it faster.
  File it under `docs/runbooks/` or wherever the institution keeps
  incident history — the point is it's read again before the next drill,
  not filed and forgotten.
