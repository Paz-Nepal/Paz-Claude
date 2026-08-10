# Environments

Three Supabase projects, promoted in one direction only: `local` → `staging` → `production`.

|                                                | local                                              | staging                               | production                                |
| ---------------------------------------------- | -------------------------------------------------- | ------------------------------------- | ----------------------------------------- |
| Supabase project                               | CLI-managed, on your machine                       | separate hosted project               | separate hosted project                   |
| Data                                           | synthetic fixtures (`supabase/seed/synthetic.sql`) | **anonymized copy of production**     | real institutional data                   |
| Reference seed (`supabase/seed/authz.sql`)     | auto-applied by `supabase db reset`                | auto-applied on deploy                | auto-applied on deploy                    |
| Synthetic seed (`supabase/seed/synthetic.sql`) | applied manually, whenever you want fresh fixtures | **never applied**                     | **never applied**                         |
| Schema changes                                 | edit a new file in `supabase/migrations/`          | applied via CI from `main`            | applied via CI from `main`, after staging |
| Dashboard access                               | full                                               | read-only except the two Super Admins | read-only except the two Super Admins     |

## Rule: production PII never leaves production

Staging is anonymized production data, not synthetic data, because the
whole point of staging is to catch bugs that only show up with realistic
data shapes and volumes. The anonymization pass (`scripts/anonymize-for-staging.ts`,
built alongside the first domain that holds real PII) replaces every
identifying field with realistic-looking fakes before the copy ever reaches
the staging project.

## Local setup

```bash
supabase start                     # boots local Postgres, Auth, Storage, Studio
pnpm db:reset                      # runs every migration + supabase/seed/authz.sql from zero
psql "$SUPABASE_DB_URL" -f supabase/seed/synthetic.sql   # optional: fake people for UI development
pnpm db:types                      # regenerate packages/types/src/database.generated.ts
pnpm dev                           # apps/web against the local instance
```

`apps/web/.env.example` lists the local URL/anon key `supabase start` prints
on boot — copy it to `.env.local`.

## Edge Functions & secrets

Edge Functions (`supabase/functions/`) hold provider credentials — the
outbound-email provider today (ADR-11) — that must never reach the
frontend bundle or `apps/web/.env*`. They're configured separately:

```bash
cp supabase/functions/.env.example supabase/functions/.env   # local only, gitignored
supabase functions serve                                      # runs functions against the local DB, reading that .env
```

Staging and production secrets are pushed with the Supabase CLI, never
typed into a dashboard field and never committed:

```bash
supabase secrets set --env-file supabase/functions/.env.staging --project-ref <staging-ref>
supabase secrets set --env-file supabase/functions/.env.production --project-ref <production-ref>
```

Those per-environment `.env.staging` / `.env.production` files live only
on the machine (or CI secret store) that runs the `secrets set` command —
`.gitignore`'s `.env.*` rule keeps every variant but `.env.example` out of
the repository. Rotate a key (provider compromise, staff departure with
access) by regenerating it with the provider and re-running `secrets set`;
nothing in the function code changes.

## Promoting a schema change

1. Write a new migration file in `supabase/migrations/`, numbered after the
   latest one. Never edit a migration that has already been applied
   anywhere outside local.
2. `pnpm db:reset` locally; confirm `pnpm test:db` (pgTAP) passes.
3. Open a PR. CI re-runs migrations from zero against an ephemeral
   database and runs `supabase db diff` to confirm no drift (see
   `.github/workflows/ci.yml`).
4. On merge to `main`, CI applies the migration to staging, then (after a
   manual approval gate) to production.

No migration is ever applied by hand through a project's dashboard. If the
dashboard was used to make an emergency fix, the same change is written as
a migration file immediately afterward so the migration history stays the
single source of truth.
