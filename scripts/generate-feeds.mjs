#!/usr/bin/env node
// Generates one RSS 2.0 feed per publication series, plus one for the
// Record itself (work plan Part II, #9: "an archive-first press with a
// fortnightly serial needs a machine-readable spine ... this is also how
// third parties mirror you without asking, which is the point"). Same
// anon-key, dependency-free pattern as scripts/export-content.mjs and
// scripts/generate-sitemap.mjs.
//
// Usage: SUPABASE_URL=... SUPABASE_ANON_KEY=... node scripts/generate-feeds.mjs [outDir] [siteUrl]
// Writes <outDir>/<series-path>/feed.xml for each series and
// <outDir>/record/feed.xml for the Record.

import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

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
const OUT_DIR = process.argv[2] ?? "apps/web/dist";
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

const SERIES = [
  { type: "paper", path: "papers", title: "Paz Papers" },
  { type: "brief", path: "brief", title: "Brief" },
  { type: "dispatch", path: "dispatch", title: "Dispatch" },
  { type: "pigeon_post", path: "pigeon-post", title: "Pigeon Post" },
  { type: "annual", path: "annual", title: "Annual" },
];

function escapeXml(s) {
  return String(s ?? "").replace(
    /[<>&'"]/g,
    (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" })[c],
  );
}

function rssItem({ title, link, description, pubDate, guid }) {
  return [
    "    <item>",
    `      <title>${escapeXml(title)}</title>`,
    `      <link>${escapeXml(link)}</link>`,
    `      <guid isPermaLink="true">${escapeXml(guid)}</guid>`,
    pubDate ? `      <pubDate>${new Date(pubDate).toUTCString()}</pubDate>` : null,
    description ? `      <description>${escapeXml(description)}</description>` : null,
    "    </item>",
  ]
    .filter(Boolean)
    .join("\n");
}

function rssFeed({ title, link, description, items }) {
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0">',
    "  <channel>",
    `    <title>${escapeXml(title)}</title>`,
    `    <link>${escapeXml(link)}</link>`,
    `    <description>${escapeXml(description)}</description>`,
    ...items,
    "  </channel>",
    "</rss>",
    "",
  ].join("\n");
}

async function main() {
  console.log(`Generating feeds from ${SUPABASE_URL} -> ${OUT_DIR}`);

  for (const series of SERIES) {
    const rows = await selectFrom(
      "published_items",
      `select=slug,title,summary,published_at&type=eq.${series.type}&order=published_at.desc&limit=50`,
    );
    const items = rows.map((r) =>
      rssItem({
        title: r.title,
        link: `${SITE_URL}/${series.path}/${r.slug}`,
        description: r.summary,
        pubDate: r.published_at,
        guid: `${SITE_URL}/${series.path}/${r.slug}`,
      }),
    );
    const xml = rssFeed({
      title: `PAZ — ${series.title}`,
      link: `${SITE_URL}/${series.path}`,
      description: `The ${series.title} series, kept by PAZ.`,
      items,
    });
    const dir = join(OUT_DIR, series.path);
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "feed.xml"), xml, "utf8");
    console.log(`  ${series.path}/feed.xml: ${rows.length} item(s)`);
  }

  const record = await selectFrom(
    "record_entries",
    "select=deposit_number,title,provenance,deposited_at,link&order=deposited_at.desc&limit=100",
  );
  const recordItems = record.map((r) =>
    rssItem({
      title: `${r.deposit_number} — ${r.title}`,
      link: r.link ? `${SITE_URL}${r.link}` : `${SITE_URL}/the-record`,
      description: r.provenance,
      pubDate: r.deposited_at,
      guid: `${SITE_URL}/the-record#${r.deposit_number}`,
    }),
  );
  const recordXml = rssFeed({
    title: "PAZ — The Record",
    link: `${SITE_URL}/the-record`,
    description: "Everything deposited into the Record, kept in order, forever.",
    items: recordItems,
  });
  const recordDir = join(OUT_DIR, "the-record");
  mkdirSync(recordDir, { recursive: true });
  writeFileSync(join(recordDir, "feed.xml"), recordXml, "utf8");
  console.log(`  the-record/feed.xml: ${record.length} item(s)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
