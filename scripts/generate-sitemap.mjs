#!/usr/bin/env node
// Generates dist/sitemap.xml from the live public API at build/deploy time,
// so the sitemap is definitionally complete (work plan Part II, #10) --
// it can never drift from what's actually published because it's built
// from the same read path a browser uses, not maintained by hand.
// Same anon-key, dependency-free pattern as scripts/export-content.mjs.
//
// Usage: SUPABASE_URL=... SUPABASE_ANON_KEY=... node scripts/generate-sitemap.mjs [outFile] [siteUrl]

import { readFileSync, writeFileSync } from "node:fs";

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
const SUPABASE_URL = process.env.SUPABASE_URL ?? envLocal.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY ?? envLocal.VITE_SUPABASE_ANON_KEY;
const OUT_FILE = process.argv[2] ?? "apps/web/dist/sitemap.xml";
const SITE_URL = (process.argv[3] ?? "https://paz.com.np").replace(/\/$/, "");

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error("Missing SUPABASE_URL / SUPABASE_ANON_KEY (env vars, or apps/web/.env.local).");
  process.exit(1);
}

const API = `${SUPABASE_URL}/rest/v1`;

async function selectFrom(table, query = "") {
  const res = await fetch(`${API}/${table}?${query}`, {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      "Accept-Profile": "api",
    },
  });
  if (!res.ok) throw new Error(`${table}: ${res.status} ${await res.text()}`);
  return res.json();
}

// Matches apps/web/src/app/router.tsx: series with a dedicated index/detail
// route get that prefix; everything else (page, article) falls through to
// the generic ":slug" / "journal/:slug" routes.
const SERIES_PATH = {
  paper: "papers",
  brief: "brief",
  dispatch: "dispatch",
  pigeon_post: "pigeon-post",
  annual: "annual",
  article: "journal",
};

const STATIC_ROUTES = [
  { path: "/", priority: "1.0" },
  { path: "/press", priority: "0.8" },
  { path: "/house", priority: "0.8" },
  { path: "/hearth", priority: "0.8" },
  { path: "/the-record", priority: "0.8" },
  { path: "/record", priority: "0.6" },
  { path: "/papers", priority: "0.7" },
  { path: "/brief", priority: "0.7" },
  { path: "/dispatch", priority: "0.7" },
  { path: "/pigeon-post", priority: "0.7" },
  { path: "/annual", priority: "0.7" },
  { path: "/journal", priority: "0.6" },
  { path: "/programmes", priority: "0.6" },
  { path: "/membership/apply", priority: "0.5" },
  { path: "/send-a-pigeon", priority: "0.4" },
];

function urlEntry(loc, lastmod, priority) {
  return [
    "  <url>",
    `    <loc>${loc}</loc>`,
    lastmod ? `    <lastmod>${lastmod}</lastmod>` : null,
    priority ? `    <priority>${priority}</priority>` : null,
    "  </url>",
  ]
    .filter(Boolean)
    .join("\n");
}

async function main() {
  console.log(`Generating sitemap from ${SUPABASE_URL} -> ${OUT_FILE}`);

  const items = await selectFrom(
    "published_items",
    "select=type,slug,published_at&order=published_at.desc",
  );

  // Keyed by path so a "page" item that shares its slug with a static
  // organ-hub route (e.g. the institutional page slugged "the-record",
  // kept distinct from /record on purpose) doesn't produce a duplicate
  // <url> entry -- the static route wins since it's inserted first.
  const seen = new Map();
  for (const r of STATIC_ROUTES)
    seen.set(r.path, urlEntry(`${SITE_URL}${r.path}`, null, r.priority));

  for (const item of items) {
    const prefix = SERIES_PATH[item.type];
    // "page" items (About, Visit, Guild, Treasury, ...) live directly at
    // /<slug> via the generic catch-all route.
    const path = prefix ? `/${prefix}/${item.slug}` : `/${item.slug}`;
    if (seen.has(path)) continue;
    seen.set(path, urlEntry(`${SITE_URL}${path}`, item.published_at?.slice(0, 10), "0.6"));
  }

  const entries = [...seen.values()];

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...entries,
    "</urlset>",
    "",
  ].join("\n");

  writeFileSync(OUT_FILE, xml, "utf8");
  console.log(`Wrote ${entries.length} URLs (${items.length} from the Record/press/journal).`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
