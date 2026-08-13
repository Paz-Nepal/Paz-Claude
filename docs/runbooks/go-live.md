# Go-live checklist

The concrete, one-time sequence to take this repository from "code on a
branch" to "a real Supabase project serving a real deployed website."
`docs/runbooks/environments.md` documents the ongoing local → staging →
production promotion model once this exists; this file is the bootstrap
that gets the first real project into that state. `docs/runbooks/auth-config.md`
is the source of truth for every Auth dashboard setting referenced below.

**None of these steps can be done from this development environment** —
every one of them needs your own Supabase account, your own project, and
credentials this environment was never given. This is the literal list of
what to run yourself.

## 1. Create the Supabase project

Create it in the Supabase dashboard (or `supabase projects create`).
Note the project ref and database password — you'll need both below.

## 2. Link this repository to it and push the schema

```bash
supabase login
supabase link --project-ref <your-project-ref>
supabase db push          # applies every migration in supabase/migrations/, in order
```

`supabase db push` runs migrations `0001` through `0042` (as of this
index) in one pass on a brand-new project — there's no data to migrate
around yet, so this is the simplest possible case of the process
`docs/runbooks/environments.md` describes for later changes.

**Apply the reference seed, not the synthetic one:**

```bash
psql "$(supabase db url)" -f supabase/seed/authz.sql
```

`supabase/seed/authz.sql` is the real role/permission matrix (`membership_manager`,
`editor`, `hospitality_manager`, etc.) — every environment needs it.
**Do not** apply `supabase/seed/synthetic.sql` here — those are the
`[PLACEHOLDER]`-prefixed fake people, pages, and content used for local
development only (see `supabase/seed/synthetic.sql`'s own header). Loading
it into the real project would put obviously-fake institutional copy in
front of real visitors.

## 3. Create your first real staff account, by hand

There is no seeded admin login — `authz.seed.sql` grants _roles_, it
doesn't create _people_. Sign up through the site once it's running (step
7), then, as the project owner, grant yourself the `administrator` role
directly in the database:

```sql
insert into authz.user_roles (person_id, role_key)
select id, 'administrator' from identity.people where email = 'you@example.com';
```

Every other staff account after that can be granted through the admin
console itself, once you're in it.

## 4. Deploy the Edge Functions

```bash
supabase functions deploy request-reservation
supabase functions deploy submit-membership-application
supabase functions deploy decide-membership-application
supabase functions deploy register-for-session
supabase functions deploy ingest-media
supabase functions deploy submit-contact-message
supabase functions deploy send-renewal-notices
supabase functions deploy invite-membership-applicant
supabase functions deploy accept-membership-invitation
supabase functions deploy get-my-membership
supabase functions deploy issue-member-card
supabase functions deploy verify-member-card
```

(Or `supabase functions deploy` with no name to deploy every function
listed in `supabase/config.toml` at once.)

## 5. Set Edge Function secrets

```bash
supabase secrets set RESEND_API_KEY=<your real Resend key> \
  EMAIL_FROM="PAZ <hello@your-real-domain>" \
  PUBLIC_SITE_URL=https://your-real-domain \
  --project-ref <your-project-ref>
```

Get a `RESEND_API_KEY` from resend.com after verifying your sending
domain (ADR-11) — outbound email (reservation/application/invitation/
renewal/contact-form-notification emails) silently fails without it (each
Edge Function catches and logs the failure rather than blocking the
underlying action, so the site still works, it just won't send mail).

`PUBLIC_SITE_URL` must be your real deployed frontend URL — it's used to
build the membership-invitation acceptance link, so this has to be set
correctly _before_ you invite your first applicant.

## 6. Configure Auth in the dashboard

`supabase config push` (bundled into `db push` above) applies everything
already committed to `supabase/config.toml`'s `[auth]` block. Two things
are dashboard-only and **must** be set by hand, per `docs/runbooks/auth-config.md`:

- **Site URL / Redirect URLs**: set to your real deployed frontend
  origin, not `http://127.0.0.1:3000`. Sign-in/invitation/password links
  will point at localhost until this is changed.
- Everything else in `auth-config.md`'s "What's dashboard-only" section —
  confirm it matches, don't just assume the defaults are right.

## 7. Build the frontend and get its env vars right

```bash
cd apps/web
echo "VITE_SUPABASE_URL=https://<your-project-ref>.supabase.co" > .env.production.local
echo "VITE_SUPABASE_ANON_KEY=<your project's anon key, from the dashboard's API settings>" >> .env.production.local
pnpm build
```

This produces `apps/web/dist/` — a fully static site (HTML/CSS/JS, no
server needed). **This is what gets uploaded to your host.** The anon
key is meant to be public (it's rate-limited and RLS-scoped, the same key
the browser would see in any Supabase app's network tab) — the
`SUPABASE_SERVICE_ROLE_KEY` from step 5's dashboard is the one that must
never appear here or anywhere in `apps/web`.

Upload the _contents_ of `dist/` (not the folder itself) to your static
host's document root. Configure the host to serve `index.html` for any
path that doesn't match a real file — this is a client-side-routed
single-page app (`react-router-dom`), so `/journal/some-article` needs to
resolve to the same `index.html` the router then reads, or a direct link
to any non-home page will 404 at the host level before React ever runs.
(Most static hosts call this "SPA fallback" or "rewrite all routes to
index.html" — check your host's docs for the exact setting name.)

## 8. Smoke-test against the real project

Once uploaded: sign in with the account from step 3, confirm the admin
console loads, submit one real reservation/application/contact-form entry
and confirm the corresponding email arrives. This is the first time any
of this session's work will have actually run against a live database —
see `docs/remaining-work.md` §1 for the full list of what's been
hand-verified but never executed until this point.

## 9. Wire up the scheduled jobs (optional, can wait)

`membership-renewal-notices.yml`, `nightly-backup-export.yml`, and
`quarterly-restore-drill.yml` are GitHub Actions workflows already in
`.github/workflows/` — they need the secrets listed in
`docs/runbooks/environments.md`'s "Scheduled jobs" table added to this
repository's Actions secrets before they'll do anything. Nothing breaks
if this is skipped initially; renewal notices and backups just won't run
until it's done.
