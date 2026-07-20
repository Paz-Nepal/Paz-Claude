# PAZ OS

The digital operating system for PAZ, a hospitality-led cultural institution
in Kathmandu. See `docs/` for the full architecture — this file only gets
you running.

> The institution always comes before the software. If something here seems
> to optimize for engagement, growth, or cleverness at the expense of
> clarity or longevity, that's a bug — say so.

## What's here right now

This repository is under active construction, in dependency order:

```
✅ Repository foundation   (workspace, TypeScript, lint, test, CI)
✅ Database foundation     (extensions, schemas, conventions)
✅ Identity                (identity.people, merge, erasure, auth linkage)
✅ Authorization           (authz roles/permissions/RLS helpers, MFA gate)
✅ Audit                   (append-only audit_log, generic trigger)
✅ Authentication          (sign-in, session context, ProtectedRoute, staff MFA enrollment)
✅ Media, CMS/Publishing, Website (editorial desk, workflow, public site)
✅ Membership                (applications, decisions, members, terms, payments, directory)
✅ Programmes                (venues, sessions, registration, waitlist, attendance)
✅ CRM                       (organizations, relationships, interactions, pledges)
✅ Hospitality                (menus, service periods, tables, reservations)
✅ Analytics                  (per-role dashboards over existing operational data)
```

Every domain in the original approved build order is now built. See
`docs/PAZ_OS_v1.0_Build_Readiness_Review.md` for what's still open beyond
that list (deferred items each carry their own "deliberately not here"
note in the migration that touches them).

Do not build ahead of this list — see `docs/adr/034-partial-rebuild.md` and
the Build Readiness Review for why order matters here.

## Getting started

Prerequisites: Node 20 (`.nvmrc`), pnpm 9, Docker (for local Supabase),
Supabase CLI.

```bash
pnpm install
supabase start                                          # local Postgres/Auth/Storage/Studio
cp apps/web/.env.example apps/web/.env.local             # fill in from `supabase start` output
pnpm db:types                                            # generate packages/types/src/database.generated.ts
psql "$SUPABASE_DB_URL" -f supabase/seed/synthetic.sql   # optional: fake local users
pnpm dev                                                 # http://127.0.0.1:3000
```

Verify everything before you start changing anything:

```bash
pnpm lint && pnpm typecheck && pnpm test
pnpm test:db          # pgTAP suite against the local database
node scripts/check-authz-matrix.mjs
```

If all of these pass on a fresh clone, you're ready to build. If any of
them fail on a fresh clone, that's a bug in the foundation — fix it before
adding a feature on top of it.

## Repository layout

```
apps/web/            The one application: public site + admin console
packages/ui/          Design system — presentation only, no data fetching
packages/types/        Generated DB types + AppError taxonomy + settings registry
packages/utils/         Pure helpers (cn, timezone-safe dates)
packages/config/        Shared tsconfig / eslint / prettier / tailwind preset
supabase/migrations/    THE schema. Numbered, immutable once merged. No dashboard edits, ever.
supabase/tests/         pgTAP — every RLS policy needs an allow test AND a deny test.
supabase/seed/          authz.sql (reference data, all environments) + synthetic.sql (local only)
docs/adr/               Why we did what we did. One file per implemented decision.
docs/runbooks/          How to operate this thing when something goes wrong.
docs/policies/          Human-readable policy behind a piece of enforcement code.
scripts/                CI and operational scripts.
```

## The rules that don't get relitigated

- **Migrations are the schema.** Nobody edits a table through the Supabase
  dashboard in staging or production. `pnpm db:diff` / CI's drift check
  exists to catch it if someone tries.
- **Every table gets RLS the moment it's created.** No exceptions, not even
  for one migration (see how `identity.people` handles this before `authz`
  even exists, in `0003_identity.sql`).
- **Every RLS policy gets two pgTAP tests: allow and deny.**
- **`(select authz.has_permission(...))`, never `authz.has_permission(...)`
  bare**, inside a policy — see the comment on `authz.has_permission` for
  why the wrapper matters.
- **No module reaches into another module's internals** — only its
  `index.ts` (enforced by `eslint-plugin-boundaries`, see
  `packages/config/eslint.config.mjs`).
- **No placeholder architecture.** If something isn't built yet, it's
  absent, not stubbed — see the CI workflow's comment on why there's no
  empty Playwright job yet.

## Where the reasoning lives

- `docs/PAZ_OS_v1.0_Architecture_Blueprint.md` — the full architecture
- `docs/PAZ_OS_v1.0_Build_Readiness_Review.md` — the gap-closing review and
  the 100-task backlog this build follows
- `docs/adr/` — individual decisions, one file per implemented ADR
