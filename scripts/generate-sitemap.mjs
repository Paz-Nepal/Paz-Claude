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

// Pages through the whole table; never stops silently at the backend's
// default thousand rows.
async function selectFrom(table, query = "") {
  const rows = [];
  for (let offset = 0; ; offset += 1000) {
    const res = await fetch(`${API}/${table}?${query}&limit=1000&offset=${offset}`, {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        "Accept-Profile": "api",
      },
    });
    if (!res.ok) throw new Error(`${table}: ${res.status} ${await res.text()}`);
    const page = await res.json();
    rows.push(...page);
    if (page.length < 1000) break;
  }
  return rows;
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
  { path: "/wall", priority: "0.9" },
  { path: "/sattal", priority: "0.8" },
  { path: "/chronicle", priority: "0.7" },
  { path: "/press", priority: "0.8" },
  { path: "/house", priority: "0.8" },
  { path: "/the-record", priority: "0.8" },
  { path: "/record", priority: "0.6" },
  { path: "/hearth", priority: "0.6" },
  { path: "/guild", priority: "0.6" },
  { path: "/treasury", priority: "0.6" },
  { path: "/papers", priority: "0.7" },
  { path: "/brief", priority: "0.7" },
  { path: "/dispatch", priority: "0.7" },
  { path: "/pigeon-post", priority: "0.7" },
  { path: "/annual", priority: "0.7" },
  { path: "/programmes", priority: "0.6" },
  { path: "/friends", priority: "0.5" },
  { path: "/commons", priority: "0.5" },
  { path: "/name", priority: "0.5" },
  { path: "/table", priority: "0.5" },
  { path: "/encounters", priority: "0.5" },
  { path: "/canon", priority: "0.5" },
  { path: "/words", priority: "0.5" },
  { path: "/looking-for", priority: "0.4" },
  { path: "/privacy", priority: "0.3" },
  { path: "/terms", priority: "0.3" },
  { path: "/send-a-pigeon", priority: "0.4" },
];

// Every path exists in both languages (the "/ne" tree mirrors the bare
// tree exactly, apps/web/src/app/router.tsx) -- one <url> entry per
// language, each carrying xhtml:link alternates pointing at the other, so
// a search engine sees them as translations of the same page rather than
// two unrelated URLs (work plan Part III, #17).
function urlEntry(bare, lastmod, priority) {
  const nePath = bare === "/" ? "/ne" : `/ne${bare}`;
  const en = `${SITE_URL}${bare}`;
  const ne = `${SITE_URL}${nePath}`;
  const altLinks = [
    `    <xhtml:link rel="alternate" hreflang="en" href="${en}" />`,
    `    <xhtml:link rel="alternate" hreflang="ne" href="${ne}" />`,
    `    <xhtml:link rel="alternate" hreflang="x-default" href="${en}" />`,
  ].join("\n");
  const entry = (loc) =>
    [
      "  <url>",
      `    <loc>${loc}</loc>`,
      lastmod ? `    <lastmod>${lastmod}</lastmod>` : null,
      priority ? `    <priority>${priority}</priority>` : null,
      altLinks,
      "  </url>",
    ]
      .filter(Boolean)
      .join("\n");
  return [entry(en), entry(ne)].join("\n");
}

async function main() {
  console.log(`Generating sitemap from ${SUPABASE_URL} -> ${OUT_FILE}`);

  const items = await selectFrom(
    "published_items",
    "select=type,slug,published_at,deposit_ref&order=published_at.desc,id",
  );
  const [people, works, shows, record] = await Promise.all([
    selectFrom("wall_people", "select=slug&order=slug"),
    selectFrom("wall_works", "select=slug&order=slug"),
    selectFrom("wall_shows", "select=slug,opened_on&order=slug"),
    selectFrom("record_entries", "select=link,deposited_at&order=deposit_number"),
  ]);

  // Keyed by path so a "page" item that shares its slug with a static
  // organ-hub route (e.g. the institutional page slugged "the-record",
  // kept distinct from /record on purpose) doesn't produce a duplicate
  // <url> entry -- the static route wins since it's inserted first.
  const seen = new Map();
  for (const r of STATIC_ROUTES) seen.set(r.path, urlEntry(r.path, null, r.priority));

  // The deposit number is the canonical address of a deposited work
  // (Build Specification 4.10): the register lists those, never the
  // readable slug paths, which only redirect.
  for (const e of record) seen.set(e.link, urlEntry(e.link, e.deposited_at?.slice(0, 10), "0.7"));
  for (const p of people) seen.set(`/people/${p.slug}`, urlEntry(`/people/${p.slug}`, null, "0.7"));
  for (const w of works) seen.set(`/works/${w.slug}`, urlEntry(`/works/${w.slug}`, null, "0.7"));
  for (const sh of shows) {
    seen.set(`/shows/${sh.slug}`, urlEntry(`/shows/${sh.slug}`, sh.opened_on, "0.6"));
  }

  for (const item of items) {
    if (item.deposit_ref) continue;
    const prefix = SERIES_PATH[item.type];
    // "page" items (About, Visit, Guild, Treasury, ...) live directly at
    // /<slug> via the generic catch-all route.
    const path = prefix ? `/${prefix}/${item.slug}` : `/${item.slug}`;
    if (seen.has(path)) continue;
    seen.set(path, urlEntry(path, item.published_at?.slice(0, 10), "0.6"));
  }

  const entries = [...seen.values()];

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">',
    ...entries,
    "</urlset>",
    "",
  ].join("\n");

  writeFileSync(OUT_FILE, xml, "utf8");
  console.log(
    `Wrote ${entries.length * 2} URLs (en+ne pairs for ${entries.length} paths, ${items.length} from the Record/press/journal).`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
