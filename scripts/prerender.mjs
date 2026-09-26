#!/usr/bin/env node
// The static half of the house, written at build time: every public page as
// flat HTML, the sitemap, the feeds, and plain text copies of everything
// deposited, so a reader can read all of it with JavaScript switched off.
//
// The rendering itself lives in supabase/functions/_shared/render-site.mjs and
// is shared with the render-site Edge Function, which writes the same files to
// the public `site` bucket whenever staff publish. This script only supplies
// the disk: it reads the built shell from dist/ and writes the pages beside it.
// What it writes is the fallback copy that ships with every upload; the
// Cloudflare Worker prefers the live copy when there is one.
//
// Usage: SUPABASE_URL=... SUPABASE_ANON_KEY=... node scripts/prerender.mjs [distDir] [siteUrl]
//        (or set VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY in apps/web/.env.local)

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { createRequire } from "node:module";
import { renderSite } from "../supabase/functions/_shared/render-site.mjs";

function readEnvLocal() {
  try {
    const text = readFileSync("apps/web/.env.local", "utf8");
    const vars = {};
    for (const line of text.split("\n")) {
      const m = line.match(/^(VITE_SUPABASE_URL|VITE_SUPABASE_ANON_KEY)=(.*)$/);
      if (m) vars[m[1]] = m[2].trim();
    }
    return vars;
  } catch {
    return {};
  }
}

const envLocal = readEnvLocal();
const supabaseUrl = process.env.SUPABASE_URL ?? envLocal.VITE_SUPABASE_URL;
const anonKey = process.env.SUPABASE_ANON_KEY ?? envLocal.VITE_SUPABASE_ANON_KEY;
const distDir = process.argv[2] ?? "apps/web/dist";
const siteUrl = process.argv[3] ?? "https://paz.com.np";

// PRERENDER_FIXTURE=path.json renders from a local file instead of the live
// project ({"tables": {"wall_people": [...]}, "rpc": {"site_info": {...}}}),
// so the static output can be tested without touching the database.
const fixture = process.env.PRERENDER_FIXTURE
  ? JSON.parse(readFileSync(process.env.PRERENDER_FIXTURE, "utf8"))
  : null;

if (!fixture && (!supabaseUrl || !anonKey)) {
  console.error("Missing SUPABASE_URL / SUPABASE_ANON_KEY (env vars, or apps/web/.env.local).");
  process.exit(1);
}
if (!existsSync(join(distDir, "index.html"))) {
  console.error(`${distDir}/index.html not found -- run the Vite build first.`);
  process.exit(1);
}

// app.html is the untouched shell every unmatched path falls back to.
// index.html becomes the prerendered home page, so it can no longer be the
// fallback: serving it for every other address would file the home page under
// all of them (Build Programme 2.1).
const shell = join(distDir, "app.html");
const baseHtml = readFileSync(existsSync(shell) ? shell : join(distDir, "index.html"), "utf8");
writeFileSync(shell, baseHtml, "utf8");

const wording = JSON.parse(
  readFileSync(new URL("../apps/web/src/modules/site/wording.json", import.meta.url), "utf8"),
);

const require = createRequire(new URL("../packages/utils/package.json", import.meta.url));
const nepaliModule = require("nepali-date-converter");
const NepaliDate = nepaliModule.default?.default ?? nepaliModule.default ?? nepaliModule;

// Every static public route in the router must come out prerendered.
const router = readFileSync(new URL("../apps/web/src/app/router.tsx", import.meta.url), "utf8");
const publicPart = router.slice(
  router.indexOf("function publicRouteChildren"),
  router.indexOf("export const router"),
);
const requiredRoutes = [...publicPart.matchAll(/\{\s*path:\s*"([^"]+)"/g)].map((m) => m[1]);

try {
  const result = await renderSite({
    supabaseUrl,
    anonKey,
    siteUrl,
    wording,
    baseHtml,
    NepaliDate,
    fixture,
    requiredRoutes,
    emit(relPath, content) {
      const file = join(distDir, relPath);
      mkdirSync(dirname(file), { recursive: true });
      writeFileSync(file, content, "utf8");
    },
  });
  console.log(
    `sitemap.xml: ${result.sitemapCount} URL(s), each backed by a written file.\n` +
      `Wrote ${result.written} static page(s) into ${distDir} (${result.neCount} Nepali variant(s) where translated text exists), plus feeds and plain-text files for every deposit, chronicle.txt and record.txt.`,
  );
} catch (err) {
  console.error(err);
  process.exit(1);
}
