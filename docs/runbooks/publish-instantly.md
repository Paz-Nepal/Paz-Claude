# Publishing from the CMS with no build and no upload

Staff edit and publish in the desk, and the public site changes by itself
within about a minute. Nobody runs `pnpm site`, nobody uploads anything.

## How it works

1. Every table whose contents show on the public site marks the site "dirty"
   when it is written (migration `0090`). Drafts do not: an item counts only
   when it is, or was, published.
2. `pg_cron` calls the **render-site** Edge Function every thirty seconds. It
   does nothing unless the site is dirty, the app was redeployed, or the last
   attempt failed. When there is work it renders every page from the database,
   the same code the build uses (`supabase/functions/_shared/render-site.mjs`),
   and writes the result into the public storage bucket `site`. A page that is
   no longer published is removed from it. It takes about ten seconds.
3. A **Cloudflare Worker** (`cloudflare/worker.mjs`) answers page requests for
   `paz.com.np` from that bucket, keeping a 30 second copy at Cloudflare. It
   also adds the security headers the host's `.htaccess` sets.
4. Anything the Worker has no page for (the app's scripts, fonts, `/admin`, a
   path only the app knows) goes straight on to the web host, as before. The
   pages that `pnpm site` puts in `dist/` stay on the host as a fallback, so the
   worst case is exactly today's site, never a broken one.

The app itself (the React code) still reaches the host only by an upload. That
is the only thing that ever needs one, and only when a developer changes code.
When that upload changes the app's files, the next tick re-renders every page so
they point at the new files.

## Setting it up (once)

The database side is already in place (migration `0090`, the `render-site`
function, the `site` bucket, the thirty second clock). What remains is the
Worker, which lives in your Cloudflare account:

```bash
cd cloudflare
npx wrangler login            # opens a browser; sign in to the Cloudflare account that holds paz.com.np
npx wrangler deploy           # publishes the Worker and attaches it to paz.com.np/* and www.paz.com.np/*
```

Then check it: open any page and look for the response header `X-Paz-Render:
live`, or run `pnpm check:deployed https://paz.com.np`.

If a new environment is created, point the clock at its function once:

```sql
update admin.site_render_state
   set endpoint = 'https://<project-ref>.supabase.co/functions/v1/render-site'
 where id = 1;
```

## Seeing that it works

Admin, Settings shows "Publishing to the site": whether the site is up to date,
when it last published, and a button to publish everything again. In SQL,
`select * from admin.site_render_state;` shows the same.

## When something is wrong

- **A change did not appear.** Wait a minute, then look at Admin, Settings. If
  it says the last attempt failed, the message says why. It retries by itself.
- **"Unknown wording key".** Someone added a line of wording in the code but did
  not update the function's copy. Run `pnpm sync:wording`, then
  `supabase functions deploy render-site`.
- **To switch it off,** remove the Worker route in Cloudflare (or
  `npx wrangler delete`). The site goes back to serving the files on the host.
- **To stop the clock,** `select cron.unschedule('render-site');`.

## What is deliberately not here

- Changes to the app's code still go through the upload in `deploy.md`.
- The pages in `dist/` are still built by `pnpm site` and uploaded with the app.
  They are the fallback, not the source of truth.
- Nothing here sends email or tells anyone. It only keeps the public pages in
  step with the database.
