# Deploying the public website

Hostinger shared hosting (`paz.com.np`), LiteSpeed running an
Apache-compatible `.htaccess` rewrite layer, Cloudflare proxying in front.

## The one rule that matters: upload via FTP, never the File Manager zip path

Hostinger's File Manager silently scanned and blocked files extracted from
an uploaded zip on first deploy -- every JS/CSS file 404'd regardless of
size or type, with no error surfaced anywhere. A trivial hand-created file
in the same folder loaded fine; switching to FTP (FileZilla, credentials
from hPanel → FTP Accounts) fixed it immediately and has been reliable
since. **Never use File Manager's "upload zip and extract" flow for a
deploy.** Uploading individual files directly through File Manager (not as
a zip) has not caused this problem, but FTP is the proven path -- use it
when in doubt.

## Build sequence

Run in order, from the repo root:

```bash
pnpm build                              # tsc -b && vite build; wipes and rebuilds apps/web/dist
node scripts/generate-sitemap.mjs apps/web/dist/sitemap.xml   # pnpm sitemap
node scripts/generate-feeds.mjs apps/web/dist                 # pnpm feeds
node scripts/prerender.mjs apps/web/dist                      # pnpm prerender
cp apps/web/deploy/htaccess.template apps/web/dist/.htaccess
```

Each of the last three steps talks to the **live** public API with the
project's anon key (same access a browser has, nothing more -- see the
header comments in each script) to build output that reflects what's
actually published. Run them after `pnpm build`, not before: Vite wipes
`dist/` on every build, so anything written into it earlier is lost.

`apps/web/dist/.htaccess` does not survive `pnpm build` either -- it isn't
part of the Vite build graph and Vite clears `dist/` first. The tracked
source of truth is `apps/web/deploy/htaccess.template`; always copy it in
fresh after building, never hand-edit a copy that only lives in `dist/`.

## What each generated file is for

- **`sitemap.xml`** -- generated from `api.published_items`, so it can't
  drift from what's actually live (work plan Part II, #10).
- **`<series>/feed.xml`, `the-record/feed.xml`** -- one RSS 2.0 feed per
  publication series plus the Record itself (Part II, #9). Served as
  static files; the `.htaccess` template's extension pass-through already
  includes `.xml`.
- **`<path>/index.html`** -- a real, complete static HTML document for
  every deposited item, CMS page, and journal article: title, meta
  description, canonical, Open Graph/Twitter tags, and (for deposited
  items) a `schema.org/Article` JSON-LD block carrying the deposit number
  and licence, plus the actual rendered body -- all present in the raw
  HTML with no JavaScript required (Part II, #6). The SPA bundle is still
  referenced in the `<head>` and boots normally over this for a real
  visitor; this only changes what a crawler, archiver, or link-preview bot
  sees on the initial fetch. **Done when**: the page is legible with
  JavaScript disabled, previews correctly when shared, and carries its
  deposit number and licence on the page.

## Upload

Connect via FTP (see above) and upload the **contents** of `apps/web/dist/`
(not the `dist` folder itself) into `public_html`, overwriting what's
there. `apps/web/dist/fonts/*.woff2` must go too -- the site self-hosts its
fonts rather than loading them from the Google Fonts CDN, which logs
reader IP addresses and would otherwise contradict the no-tracking rule.

## After a Paper, Brief, Dispatch, Pigeon Post, or Annual deposit

The public deposit is only half the three-copy rule. After confirming the
deposit is live on the site:

1. Submit the permalink (e.g. `https://paz.com.np/papers/<slug>`) to the
   [Internet Archive's Wayback Machine](https://web.archive.org/save/) --
   this is the off-site third copy, and it costs nothing. Do this for the
   pre-rendered permalink itself, not just the homepage.
2. Note the archive.org capture URL alongside the deposit record so the
   Record's own provenance can eventually point to it (not yet automated;
   this is a manual step until the Record gets its own archival-copy
   tracking, work plan Part VI, #38).

A second independent archive is worth considering once volume justifies
the extra step; not required for the first deposits.
