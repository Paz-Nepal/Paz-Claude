# ADR-10: Nightly Off-Platform Encrypted Export + Quarterly Restore Drill

**Status:** Implemented, unrun (`scripts/backup-export.sh`,
`scripts/restore-verify.sh`, `.github/workflows/nightly-backup-export.yml`,
`.github/workflows/quarterly-restore-drill.yml`) — see "Still open" below.

## Decision

The Architecture Blueprint (§9) and Build Readiness Review (§4 item 2)
already decided _that_ a nightly off-platform export is the sovereignty
guarantee — "it, not Supabase's own backups, is what makes the 10-year
answer 'yes.'" What was still open was _how_. This ADR makes the concrete
choices:

- **Encryption: `age`, public-key only in the backup job.** The nightly
  export job (`nightly-backup-export.yml`) holds only `BACKUP_AGE_PUBLIC_KEY`
  — it can encrypt but never decrypt. The private key
  (`BACKUP_AGE_PRIVATE_KEY`) exists only as a secret on the quarterly
  restore-drill workflow and in whatever offline location the two Super
  Admins keep it for a real incident (`docs/runbooks/disaster-recovery.md`).
  A compromised backup-job credential (a leaked `BACKUP_AGE_PUBLIC_KEY`,
  or the R2 write credentials) cannot decrypt a single past backup.
- **Storage mirror + manifest: `rclone`.** `rclone sync` from Supabase
  Storage's S3-compatible endpoint to the R2 bucket gives an incremental
  mirror for free (only changed objects transfer), and `rclone lsjson`
  produces the manifest in the same tool — no bespoke pagination/diffing
  code to get subtly wrong.
- **Destination: Cloudflare R2**, matching the Blueprint's own example
  and the "vendor risk and account-compromise risk must not share a
  fate" requirement (§9) — a separate account, separate credentials, a
  different vendor than Supabase entirely.
- **Schedule:** nightly at 02:15 UTC (off-peak, offset from the top of
  the hour); restore drill quarterly (Jan/Apr/Jul/Oct 1st).
- **"A failed backup pages someone"** (§9): a failed scheduled GitHub
  Actions run already notifies the repository's watchers — that
  notification path _is_ the paging mechanism, not a separate thing to
  build.

## Why these two scripts, not a single one

`backup-export.sh` only ever needs write credentials (R2 write, Supabase
Storage read, the age _public_ key). `restore-verify.sh` needs the one
genuinely dangerous secret (the age _private_ key) plus a scratch
database to restore into. Keeping them as separate scripts, run by
separate workflows with separate secret scopes, means the nightly job
that runs unattended every single night never has access to the key that
could decrypt every backup ever taken.

## Still open (account-level setup this repository cannot do for itself)

None of this has been run against real infrastructure — it was written
in an environment with no Cloudflare account, no Supabase project's real
S3 credentials, and no way to generate and safely store an age keypair
for an institution that doesn't have one yet. Before the first real run:

1. **Create the R2 bucket** and an API token scoped to it only.
2. **Generate an age keypair** (`age-keygen`) — store the private key
   somewhere durable and offline (a password manager the two Super Admins
   both have access to is the minimum bar; a hardware security key or a
   sealed physical copy is better for an institution's 10-year horizon).
   Losing this key makes every past backup permanently unreadable — there
   is no recovery path, by design (that's what makes it secure).
3. **Enable Supabase Storage's S3-compatible access** (Project Settings →
   Storage → S3 Connection) and generate credentials, read-only if the
   plan tier supports scoping it.
4. **Verify PITR availability on the actual Supabase plan tier** — Build
   Readiness Review §4 item 1, T-006 — and adjust the RPO statement in
   `docs/runbooks/disaster-recovery.md` if daily logical backups (this
   job) are the actual floor, not a PITR-backed shorter window.
5. **Add the seven `BACKUP_*` secrets** these workflows reference to the
   repository (or, better, to a GitHub environment scoped to just these
   two workflows) — see each workflow file for the exact names.
6. **Run the nightly export once by hand** (`workflow_dispatch`), then
   the restore drill once by hand, before trusting the schedule.

## Consequences

- `docs/runbooks/disaster-recovery.md`'s restore order (§3) depends on
  this backup existing and having been drilled — it says so explicitly
  and will keep saying so until a real drill has gone green.
- The scratch database the restore drill restores into is a throwaway
  GitHub Actions Postgres service container, recreated every run —
  `restore-verify.sh` refuses to run at all if `RESTORE_DB_URL` looks
  like a hosted Supabase URL, specifically to make it structurally hard
  to point the destructive `pg_restore --clean` at anything real.
