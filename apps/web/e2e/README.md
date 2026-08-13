# End-to-end tests

Four of the Architecture Blueprint's eight critical journeys (§11.4), covering
the anonymous/public-visitor paths:

| File                             | Journey                                              |
| -------------------------------- | ---------------------------------------------------- |
| `read-article.spec.ts`           | Read an article                                      |
| `programme-registration.spec.ts` | Browse programmes and register                       |
| `membership-application.spec.ts` | Apply for membership                                 |
| `reservation-request.spec.ts`    | Request a reservation                                |
| `contact-message.spec.ts`        | Send a contact message (not one of the eight, T-068) |

**Not yet covered** — the four staff/authenticated journeys (staff
reviews and publishes an item; staff decides an application; confirm a
reservation from the desk board; member views card and directory; admin
grants a role and audit shows it — that's five, the Blueprint's list
overlaps "confirm a reservation" with the request half above). These need
a signed-in, MFA-satisfied staff session — Playwright's `storageState`
against a seeded staff account (`admin@paz.local` /
`editor@paz.local` from `supabase/seed/synthetic.sql`) is the right
mechanism, deliberately not scaffolded speculatively here per this
repo's "no placeholder architecture" standard — add it when someone is
actually building out the staff-journey suite, with a real
authentication fixture to test against, not a guessed-at one.

## Prerequisites

These are real end-to-end tests against a live database, not mocked
component tests:

```bash
supabase start
pnpm db:reset
psql "$SUPABASE_DB_URL" -f supabase/seed/synthetic.sql
pnpm --filter @paz/web test:e2e
```

`playwright.config.ts`'s `webServer` builds and serves the app for you;
it does not start Supabase.

## Status as of this commit

Written against the actual component source (`e2e/*.spec.ts` selectors
match `Field`/`getByLabel` labels and button text read directly from the
pages and forms they exercise) but **not executed against a live
Supabase instance** — the environment these tests were written in has no
Docker daemon available to run `supabase start`. Run them for real before
trusting them in CI.
