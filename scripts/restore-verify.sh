#!/usr/bin/env bash
# Quarterly restore drill (Architecture Blueprint §9, Build Readiness
# Review T-027). Restores the latest nightly export into a scratch
# Postgres and runs sanity checks -- "a backup that has never been
# restored is a hope, not a backup" (blueprint §9). Run quarterly by
# .github/workflows/quarterly-restore-drill.yml, and by hand before
# trusting a backup during a real disaster-recovery incident
# (docs/runbooks/disaster-recovery.md §2).
#
# Required env:
#   RESTORE_DB_URL             scratch Postgres to restore into -- NEVER
#                               a staging or production connection string
#   BACKUP_AGE_PRIVATE_KEY     age identity (AGE-SECRET-KEY-1...) matching
#                               the public key backups were encrypted with;
#                               this script is the only place that secret
#                               should ever be loaded
#   R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET
set -euo pipefail

for var in RESTORE_DB_URL BACKUP_AGE_PRIVATE_KEY R2_ACCOUNT_ID R2_ACCESS_KEY_ID \
  R2_SECRET_ACCESS_KEY R2_BUCKET; do
  if [ -z "${!var:-}" ]; then
    echo "Missing required env var: $var" >&2
    exit 1
  fi
done

if [[ "$RESTORE_DB_URL" == *"supabase.co"* ]]; then
  echo "RESTORE_DB_URL looks like a hosted Supabase project, not a scratch database." >&2
  echo "Refusing to run -- this script restores destructively (pg_restore --clean)." >&2
  exit 1
fi

WORKDIR="$(mktemp -d)"
trap 'rm -rf "$WORKDIR"' EXIT

export RCLONE_CONFIG_R2_TYPE=s3
export RCLONE_CONFIG_R2_PROVIDER=Cloudflare
export RCLONE_CONFIG_R2_ACCESS_KEY_ID="$R2_ACCESS_KEY_ID"
export RCLONE_CONFIG_R2_SECRET_ACCESS_KEY="$R2_SECRET_ACCESS_KEY"
export RCLONE_CONFIG_R2_ENDPOINT="https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com"

echo "==> Finding the latest database dump"
LATEST="$(rclone lsf "R2:${R2_BUCKET}/db/" | sort | tail -n1)"
if [ -z "$LATEST" ]; then
  echo "No backup found in R2:${R2_BUCKET}/db/ -- nothing to verify" >&2
  exit 1
fi
echo "Latest backup: $LATEST"

rclone copyto "R2:${R2_BUCKET}/db/${LATEST}" "$WORKDIR/${LATEST}"

echo "==> Decrypting"
printf '%s\n' "$BACKUP_AGE_PRIVATE_KEY" > "$WORKDIR/identity.txt"
age -d -i "$WORKDIR/identity.txt" -o "$WORKDIR/db.dump" "$WORKDIR/${LATEST}"
rm "$WORKDIR/identity.txt"

echo "==> Restoring into scratch database"
pg_restore --clean --if-exists --no-owner --no-privileges \
  --dbname="$RESTORE_DB_URL" "$WORKDIR/db.dump"

echo "==> Verification checks"
FAIL=0

row_count() {
  psql "$RESTORE_DB_URL" -tAc "select count(*) from $1;"
}

for table in identity.people authz.user_roles admin.audit_log publishing.items; do
  count="$(row_count "$table")"
  echo "  ${table}: ${count} rows"
done

echo "==> Referential integrity: orphaned publishing.item_tags"
ORPHAN_TAGS="$(psql "$RESTORE_DB_URL" -tAc "
  select count(*) from publishing.item_tags it
  left join publishing.items i on i.id = it.item_id
  left join publishing.tags t on t.id = it.tag_id
  where i.id is null or t.id is null;
")"
echo "  orphaned item_tags rows: ${ORPHAN_TAGS}"
if [ "$ORPHAN_TAGS" -ne 0 ]; then
  echo "  FAIL: item_tags references a missing item or tag" >&2
  FAIL=1
fi

echo "==> Referential integrity: audit_log entity references"
BROKEN_ACTORS="$(psql "$RESTORE_DB_URL" -tAc "
  select count(*) from admin.audit_log a
  where a.actor is not null
    and not exists (select 1 from identity.people p where p.id = a.actor);
")"
echo "  audit_log rows with an actor not in identity.people: ${BROKEN_ACTORS}"
if [ "$BROKEN_ACTORS" -ne 0 ]; then
  echo "  FAIL: audit_log.actor references a missing person" >&2
  FAIL=1
fi

echo "==> Sample content render check"
SAMPLE_TITLE="$(psql "$RESTORE_DB_URL" -tAc "
  select title from publishing.items where status = 'published' order by published_at desc limit 1;
")"
if [ -z "$SAMPLE_TITLE" ]; then
  echo "  No published item found to sample-render -- fine on an empty/fresh"
  echo "  database, but check this by hand against a real production restore."
else
  echo "  Most recently published item: ${SAMPLE_TITLE}"
fi

if [ "$FAIL" -ne 0 ]; then
  echo "==> Restore verification FAILED" >&2
  exit 1
fi

echo "==> Restore verification passed"
