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
pnpm site    # clears dist, builds, writes feeds, then prerenders every route and the sitemap
```

Each of the last three steps talks to the **live** public API with the
project's anon key (same access a browser has, nothing more -- see the
header comments in each script) to build output that reflects what's
actually published. Run them after `pnpm build`, not before: Vite wipes
`dist/` on every build, so anything written into it earlier is lost.

`.htaccess` lives in `apps/web/public/.htaccess`, so Vite copies it into
`dist/` on every build and every zip carries it. It is the only copy: there
used to be a second in `apps/web/deploy/`, which had drifted, and it is gone.
Edit the one in `public/`, never a copy on the host.

It does five things, in order: HTTPS and one host name (www goes to the
bare domain); serve a real file as it is; serve a prerendered directory
WITHOUT Apache's trailing-slash redirect (`DirectorySlash Off`, so a sitemap
URL answers 200 in place and its canonical link is true); return a real 404
for a missing asset instead of the app shell with a 200; and send everything
else to `app.html`. It also sets long-lived caching on hashed bundles and
basic security headers (HSTS, nosniff, X-Frame-Options, Referrer-Policy).

## After uploading: check the live host

```bash
pnpm check:deployed https://your-domain
```

It asserts that every sitemap URL answers 200 in place (no redirect hop) with a
canonical link equal to the requested URL, that a missing asset is a 404, that
the security headers and the long cache on hashed bundles are present, that
www redirects, and that `/contact` has not been rewritten by Cloudflare. The
first run on a new host is the one that matters: the directory handling
depends on the host honouring `DirectorySlash Off`.

## Cloudflare settings that must match

The pages promise no tracking and a readable address without JavaScript.
Two Cloudflare features quietly break that, so switch them off for this zone:

- **Email Address Obfuscation** (Scrape Shield): it rewrites every address in
  the served HTML into a placeholder that only a Cloudflare script can decode,
  so a visitor without JavaScript sees `[email protected]`. The prerendered
  pages also wrap themselves in `<!--email_off-->`, which Cloudflare honours,
  but the toggle is the real fix.
- **Rocket Loader**, **Web Analytics** (the auto-injected beacon) and any other
  option that injects a script into the page.
- **Browser Cache TTL**: leave it on "Respect Existing Headers", or it will
  override the long cache set on hashed bundles.

## What each generated file is for

- **`sitemap.xml`** -- generated from `api.published_items`, so it can't
  drift from what's actually live (work plan Part II, #10).
- **`<series>/feed.xml`, `the-record/feed.xml`** -- one RSS 2.0 feed per
  publication series plus the Record itself (Part II, #9). Served as
  static files; a real file is always served as it is, `.xml` included.
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
