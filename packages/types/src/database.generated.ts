/**
 * GENERATED FILE — do not edit by hand.
 *
 * Regenerate with `pnpm db:types` (see root package.json), which runs:
 *   supabase gen types typescript --local --schema identity,authz,admin,api,...
 *
 * CI fails the build if this file is stale relative to `supabase/migrations`
 * (see .github/workflows/ci.yml, "type freshness" step) — the codebase must
 * never hand-describe a database shape that migrations don't actually produce.
 *
 * This placeholder exists so the workspace type-checks before the local
 * Supabase instance has been started for the first time.
 */
export type Database = {
  // Populated by `pnpm db:types` once `supabase start` has run migrations.
  [schema: string]: {
    Tables: Record<string, never>;
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
};
