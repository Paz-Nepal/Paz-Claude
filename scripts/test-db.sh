#!/usr/bin/env bash
# Runs every pgTAP test under supabase/tests against the local Supabase
# instance. Requires `supabase start` to already be running (CI starts it
# as a prior step; see .github/workflows/ci.yml).
set -euo pipefail

DB_URL="${SUPABASE_DB_URL:-postgresql://postgres:postgres@127.0.0.1:54322/postgres}"

echo "==> Ensuring pgtap extension is available"
psql "$DB_URL" -v ON_ERROR_STOP=1 -c "create extension if not exists pgtap;"

echo "==> Running pgTAP suite"
find supabase/tests -name '*.sql' | sort | while read -r test_file; do
  echo "--- ${test_file}"
  psql "$DB_URL" -v ON_ERROR_STOP=1 -f "$test_file"
done

echo "==> pgTAP suite complete"
