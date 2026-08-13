#!/usr/bin/env bash
# nightly-backup-export (Architecture Blueprint §9, Build Readiness Review
# T-026). Dumps every schema and mirrors the public media bucket to a
# second, independently-credentialed provider (Cloudflare R2) -- this,
# not Supabase's own backups, is what makes the "restore to self-hosted
# within one week using only the repo and the latest backup" exit test
# possible (Build Readiness Review §4 item 2). Run nightly by
# .github/workflows/nightly-backup-export.yml.
#
# Required env:
#   SUPABASE_DB_URL              postgres connection string to dump from
#   BACKUP_AGE_PUBLIC_KEY        age recipient public key (age1...) -- this
#                                 job only ever holds the public key, never
#                                 the matching private key (see
#                                 docs/runbooks/disaster-recovery.md)
#   R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET
#                                 destination, on an account with credentials
#                                 separate from Supabase's (vendor risk and
#                                 account-compromise risk must not share a
#                                 fate -- Architecture Blueprint §9)
#   SUPABASE_S3_ENDPOINT, SUPABASE_S3_ACCESS_KEY_ID, SUPABASE_S3_SECRET_ACCESS_KEY
#                                 Supabase Storage's S3-compatible
#                                 credentials (Project Settings -> Storage
#                                 -> S3 Connection); read-only scope if the
#                                 project plan supports it
set -euo pipefail

for var in SUPABASE_DB_URL BACKUP_AGE_PUBLIC_KEY R2_ACCOUNT_ID R2_ACCESS_KEY_ID \
  R2_SECRET_ACCESS_KEY R2_BUCKET SUPABASE_S3_ENDPOINT SUPABASE_S3_ACCESS_KEY_ID \
  SUPABASE_S3_SECRET_ACCESS_KEY; do
  if [ -z "${!var:-}" ]; then
    echo "Missing required env var: $var" >&2
    exit 1
  fi
done

TIMESTAMP="$(date -u +%Y%m%dT%H%M%SZ)"
WORKDIR="$(mktemp -d)"
trap 'rm -rf "$WORKDIR"' EXIT

echo "==> Dumping database"
pg_dump "$SUPABASE_DB_URL" --format=custom --no-owner --no-privileges \
  --file="$WORKDIR/db-${TIMESTAMP}.dump"

echo "==> Encrypting database dump (age, public-key only)"
age -r "$BACKUP_AGE_PUBLIC_KEY" -o "$WORKDIR/db-${TIMESTAMP}.dump.age" \
  "$WORKDIR/db-${TIMESTAMP}.dump"
rm "$WORKDIR/db-${TIMESTAMP}.dump"

export RCLONE_CONFIG_R2_TYPE=s3
export RCLONE_CONFIG_R2_PROVIDER=Cloudflare
export RCLONE_CONFIG_R2_ACCESS_KEY_ID="$R2_ACCESS_KEY_ID"
export RCLONE_CONFIG_R2_SECRET_ACCESS_KEY="$R2_SECRET_ACCESS_KEY"
export RCLONE_CONFIG_R2_ENDPOINT="https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com"

echo "==> Uploading encrypted database dump to R2"
rclone copyto "$WORKDIR/db-${TIMESTAMP}.dump.age" \
  "R2:${R2_BUCKET}/db/db-${TIMESTAMP}.dump.age"

export RCLONE_CONFIG_SUPABASE_TYPE=s3
export RCLONE_CONFIG_SUPABASE_PROVIDER=Other
export RCLONE_CONFIG_SUPABASE_ACCESS_KEY_ID="$SUPABASE_S3_ACCESS_KEY_ID"
export RCLONE_CONFIG_SUPABASE_SECRET_ACCESS_KEY="$SUPABASE_S3_SECRET_ACCESS_KEY"
export RCLONE_CONFIG_SUPABASE_ENDPOINT="$SUPABASE_S3_ENDPOINT"

echo "==> Mirroring the media storage bucket to R2 (incremental sync)"
rclone sync "SUPABASE:media" "R2:${R2_BUCKET}/storage/media" --checksum

echo "==> Writing the storage manifest (D-8: what the orphan report reads)"
rclone lsjson "R2:${R2_BUCKET}/storage/media" --recursive \
  > "$WORKDIR/manifest-${TIMESTAMP}.json"
rclone copyto "$WORKDIR/manifest-${TIMESTAMP}.json" \
  "R2:${R2_BUCKET}/manifests/manifest-${TIMESTAMP}.json"

echo "==> Backup export complete: ${TIMESTAMP}"
