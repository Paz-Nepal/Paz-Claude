#!/usr/bin/env node
// The static half of the house: at build/deploy time, write everything
// that has been deposited or published out as flat HTML and plain text, so
// that a reader can read all of it with JavaScript switched off, and so
// that if the company hosting the database vanished on a Tuesday, what had
// been deposited would still read on Wednesday (Build Specification 11.1).
//
// The desk (the database and the admin console) keeps working exactly as
// it does. This is one additive step after `pnpm build`:
//
//   * every public page is written to dist/<path>/index.html, with the
//     title, description, canonical link, hreflang alternates and
//     structured data in the served markup, not written by script later;
//   * the deposit number is the canonical address of a deposited work
//     (dist/record/<PAZ-DEP-...>/index.html); the readable slug path is a
//     redirect stub pointing at it, never the reverse;
//   * the same content is written as plain text (dist/record/<ref>/text.txt,
//     dist/chronicle.txt, dist/record.txt) so it can be read, kept and
//     copied without a browser at all.
//
// The SPA still boots over the top of this for a real browser; this only
// changes what is present before that happens.
//
// Deliberately dependency-free (raw fetch against PostgREST with the
// public anon key, same access a browser has), except for the Bikram Sambat
// reference-table library, which is the one thing not worth reimplementing.
//
// Usage: SUPABASE_URL=... SUPABASE_ANON_KEY=... node scripts/prerender.mjs [distDir] [siteUrl]

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { createRequire } from "node:module";

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
const DIST_DIR = process.argv[2] ?? "apps/web/dist";
const SITE_URL = (process.argv[3] ?? "https://paz.com.np").replace(/\/$/, "");

// PRERENDER_FIXTURE=path.json renders from a local file instead of the live
// project ({"tables": {"wall_people": [...]}, "rpc": {"site_info": {...}}}),
// so the static output can be tested without touching the database.
const FIXTURE = process.env.PRERENDER_FIXTURE
  ? JSON.parse(readFileSync(process.env.PRERENDER_FIXTURE, "utf8"))
  : null;

if (!FIXTURE && (!SUPABASE_URL || !SUPABASE_ANON_KEY)) {
  console.error("Missing SUPABASE_URL / SUPABASE_ANON_KEY (env vars, or apps/web/.env.local).");
  process.exit(1);
}
if (!existsSync(join(DIST_DIR, "index.html"))) {
  console.error(`${DIST_DIR}/index.html not found -- run the Vite build first.`);
  process.exit(1);
}

const API = `${SUPABASE_URL}/rest/v1`;
const PAGE = 1000;

// The same file the app reads (apps/web/src/modules/site/empty-states.json),
// so the static pages and the app never say different things.
const EMPTY = JSON.parse(
  readFileSync(new URL("../apps/web/src/modules/site/empty-states.json", import.meta.url), "utf8"),
);

const HEADERS = {
  apikey: SUPABASE_ANON_KEY,
  Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
  "Accept-Profile": "api",
};

async function selectPage(table, query, offset) {
  const sep = query ? "&" : "";
  const res = await fetch(`${API}/${table}?${query}${sep}limit=${PAGE}&offset=${offset}`, {
    headers: HEADERS,
  });
  if (!res.ok) throw new Error(`${table}: ${res.status} ${await res.text()}`);
  return res.json();
}

// Pages through the whole table: nothing here ever stops silently at the
// backend's default thousand rows.
async function all(table, query = "") {
  if (FIXTURE) return FIXTURE.tables?.[table] ?? [];
  const rows = [];
  for (let offset = 0; ; offset += PAGE) {
    const page = await selectPage(table, query, offset);
    rows.push(...page);
    if (page.length < PAGE) break;
  }
  return rows;
}

async function callRpc(fn, args = {}) {
  if (FIXTURE) {
    const v = FIXTURE.rpc?.[fn];
    const hit = typeof v === "object" && v && !Array.isArray(v) && args.p_slug ? v[args.p_slug] : v;
    return Array.isArray(hit) ? hit : hit == null ? [] : fn === "site_info" ? hit : [hit];
  }
  const res = await fetch(`${API}/rpc/${fn}`, {
    method: "POST",
    headers: { ...HEADERS, "Content-Type": "application/json", "Content-Profile": "api" },
    body: JSON.stringify(args),
  });
  if (!res.ok) throw new Error(`${fn}: ${res.status} ${await res.text()}`);
  return res.json();
}

// ---------------------------------------------------------------------
// Dates: Gregorian and Bikram Sambat, from the Kathmandu calendar day.
// ---------------------------------------------------------------------
const require = createRequire(new URL("../packages/utils/package.json", import.meta.url));
const nepaliModule = require("nepali-date-converter");
const NepaliDate = nepaliModule.default?.default ?? nepaliModule.default ?? nepaliModule;
const BS_MONTHS = [
  "Baisakh",
  "Jestha",
  "Asar",
  "Shrawan",
  "Bhadra",
  "Aswin",
  "Kartik",
  "Mangsir",
  "Poush",
  "Magh",
  "Falgun",
  "Chaitra",
];
const kathmanduParts = new Intl.DateTimeFormat("en-US", {
  timeZone: "Asia/Kathmandu",
  year: "numeric",
  month: "numeric",
  day: "numeric",
});
const kathmanduLong = new Intl.DateTimeFormat("en-US", {
  timeZone: "Asia/Kathmandu",
  year: "numeric",
  month: "short",
  day: "numeric",
});

function asInstant(value) {
  const v = String(value);
  return new Date(/^\d{4}-\d{2}-\d{2}$/.test(v) ? `${v}T12:00:00Z` : v);
}
function gregorian(value) {
  return kathmanduLong.format(asInstant(value));
}
function bikramSambat(value) {
  const parts = kathmanduParts.formatToParts(asInstant(value));
  const get = (t) => Number(parts.find((p) => p.type === t)?.value);
  const bs = new NepaliDate(new Date(get("year"), get("month") - 1, get("day")));
  return `${bs.getDate()} ${BS_MONTHS[bs.getMonth()]} ${bs.getYear()} BS`;
}
const dualEra = (value) => `${gregorian(value)} AD · ${bikramSambat(value)}`;

function money(minor, currency = "NPR") {
  const major = minor / 100;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    currencyDisplay: "code",
    minimumFractionDigits: Number.isInteger(major) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(major);
}
function dimensions(h, w, d) {
  const parts = [h, w, d].filter((n) => n != null);
  return parts.length ? `${parts.map((mm) => String(Math.round(mm) / 10)).join(" × ")} cm` : null;
}

// ---------------------------------------------------------------------
// HTML helpers
// ---------------------------------------------------------------------
function esc(s) {
  return String(s ?? "").replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c],
  );
}

function safeHref(raw) {
  const href = String(raw ?? "");
  return /^(https?:\/\/|mailto:|\/)/i.test(href) ? href : "#";
}

function renderInline(node) {
  let html = esc(node.text ?? "");
  for (const mark of node.marks ?? []) {
    if (mark.type === "bold") html = `<strong>${html}</strong>`;
    else if (mark.type === "italic") html = `<em>${html}</em>`;
    else if (mark.type === "link") {
      html = `<a href="${esc(safeHref(mark.attrs?.href))}" rel="noopener noreferrer">${html}</a>`;
    }
  }
  return html;
}

function renderNode(node) {
  const children = (node.content ?? []).map(renderNode).join("");
  switch (node.type) {
    case "text":
      return renderInline(node);
    case "paragraph":
      return `<p>${children}</p>`;
    case "heading": {
      const level = Math.min(Math.max(Number(node.attrs?.level ?? 2), 2), 4);
      return `<h${level}>${children}</h${level}>`;
    }
    case "blockquote":
      return `<blockquote>${children}</blockquote>`;
    case "bulletList":
      return `<ul>${children}</ul>`;
    case "orderedList":
      return `<ol>${children}</ol>`;
    case "listItem":
      return `<li>${children}</li>`;
    case "horizontalRule":
      return "<hr />";
    case "hardBreak":
      return "<br />";
    default:
      return children;
  }
}

const renderDoc = (doc) =>
  doc && Array.isArray(doc.content) ? doc.content.map(renderNode).join("") : "";

function docText(node) {
  if (!node) return "";
  if (node.type === "text") return node.text ?? "";
  const inner = (node.content ?? []).map(docText).join("");
  return ["paragraph", "heading", "blockquote", "listItem"].includes(node.type)
    ? `${inner}\n\n`
    : inner;
}
const plain = (doc) =>
  docText(doc)
    .replace(/\n{3,}/g, "\n\n")
    .trim();

const hasDoc = (doc) => Array.isArray(doc?.content) && doc.content.length > 0;
const hasNe = (d) => Boolean(d.title_ne?.trim()) || hasDoc(d.body_ne);

const PAGES = new Map();

const SERIES = {
  paper: { path: "papers", name: "Paz Papers", fn: "get_paper", byline: "A Paz Paper" },
  brief: { path: "brief", name: "Brief", fn: "get_brief", byline: null },
  dispatch: { path: "dispatch", name: "Dispatch", fn: "get_dispatch", byline: null },
  pigeon_post: { path: "pigeon-post", name: "Pigeon Post", fn: "get_pigeon_post", byline: null },
  annual: { path: "annual", name: "Annual", fn: "get_annual", byline: null },
};

const SPEAKER = {
  anonymous: "Anonymous, of the house. The house sends this without a name.",
  house: "The house, unsigned. The seal says the house wrote this.",
  signed: "Signed, not the house. The seal attests provenance and deposit, never agreement.",
};
const SERIES_SPEAKER = { pigeon_post: "anonymous" };

const NAV = [
  ["/wall", "The Wall"],
  ["/press", "The Press"],
  ["/house", "The House"],
  ["/record", "The Record"],
  ["/search", "Search"],
];
const FOOT = [
  ["/canon", "The Canon"],
  ["/name", "The name"],
  ["/words", "Words"],
  ["/looking-for", "Looking for"],
  ["/privacy", "Privacy"],
  ["/terms", "Terms"],
  ["/contact", "Contact"],
];

let SITE_NAME = "PAZ";
let CONTACT_EMAIL = null;

function chrome(main) {
  const nav = NAV.map(([to, label]) => `<a href="${to}">${esc(label)}</a>`).join(" · ");
  const foot = FOOT.map(([to, label]) => `<a href="${to}">${esc(label)}</a>`).join(" · ");
  return [
    `<header><p><a href="/">${esc(SITE_NAME)}</a></p><nav aria-label="Main">${nav}</nav></header>`,
    `<main>${main}</main>`,
    `<footer><p>${foot}</p><p>Patan, Lalitpur. No cookies, no analytics, no reader tracking of any kind.${
      CONTACT_EMAIL ? ` <a href="mailto:${esc(CONTACT_EMAIL)}">${esc(CONTACT_EMAIL)}</a>` : ""
    }</p></footer>`,
  ].join("\n");
}

function head({
  title,
  description,
  path,
  ogType = "website",
  ld,
  noindex,
  canonicalPath,
  alternateNe,
}) {
  const fullTitle = title && title !== SITE_NAME ? `${esc(title)} · ${SITE_NAME}` : SITE_NAME;
  const canon = canonicalPath ?? path;
  const nePath = canon === "/" ? "/ne" : `/ne${canon}`;
  const url = `${SITE_URL}${canon}`;
  const tags = [
    `<title>${fullTitle}</title>`,
    `<link rel="canonical" href="${url}" />`,
    `<meta name="robots" content="${noindex ? "noindex, follow" : "index, follow"}" />`,
    `<meta property="og:title" content="${fullTitle}" />`,
    `<meta property="og:type" content="${ogType}" />`,
    `<meta property="og:url" content="${url}" />`,
    `<meta property="og:site_name" content="${esc(SITE_NAME)}" />`,
    `<meta name="twitter:card" content="summary" />`,
    `<meta name="twitter:title" content="${fullTitle}" />`,
  ];
  // The house's own description of itself is blocked: no description tag
  // is written unless a page has words of its own to put there.
  // hreflang only where the Nepali page is genuinely prerendered: an
  // alternate pointing at a page with no served markup misleads crawlers
  // (Build Programme 2.1).
  if (alternateNe) {
    tags.push(
      `<link rel="alternate" hreflang="en" href="${SITE_URL}${canon}" />`,
      `<link rel="alternate" hreflang="ne" href="${SITE_URL}${nePath}" />`,
      `<link rel="alternate" hreflang="x-default" href="${SITE_URL}${canon}" />`,
    );
  }
  if (description) {
    const d = esc(description);
    tags.push(
      `<meta name="description" content="${d}" />`,
      `<meta property="og:description" content="${d}" />`,
      `<meta name="twitter:description" content="${d}" />`,
    );
  }
  if (ld) tags.push(`<script type="application/ld+json">${JSON.stringify(ld)}</script>`);
  return tags.join("\n    ");
}

let baseHtml = "";
let written = 0;

// Every indexable page actually written, keyed by canonical path. The
// sitemap is generated from this and from nothing else, and every entry is
// checked against a file on disk (Build Programme 2.1).
const SITEMAP = new Map();

function writePage(path, opts, main, lang = "en") {
  let html = baseHtml
    .replace(/<title>.*?<\/title>/s, "")
    .replace("</head>", `${head({ ...opts, path })}\n  </head>`);
  html = html.replace('<div id="root"></div>', `<div id="root">${chrome(main)}</div>`);
  if (lang === "ne") html = html.replace('<html lang="en">', '<html lang="ne">');
  const routePath = lang === "ne" ? `/ne${path === "/" ? "" : path}` : path;
  const outDir = join(DIST_DIR, routePath.replace(/^\//, ""));
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, "index.html"), html, "utf8");
  written++;
  if (lang === "en" && !opts.noindex) {
    const canon = opts.canonicalPath ?? path;
    const prior = SITEMAP.get(canon);
    SITEMAP.set(canon, {
      lastmod: opts.lastmod ?? prior?.lastmod ?? null,
      priority: opts.priority ?? prior?.priority ?? "0.5",
      ne: Boolean(prior?.ne),
    });
  }
  if (lang === "ne") {
    const canon = opts.canonicalPath ?? path;
    const prior = SITEMAP.get(canon);
    if (prior) prior.ne = true;
  }
}

function writeText(relPath, text) {
  const file = join(DIST_DIR, relPath);
  mkdirSync(join(file, ".."), { recursive: true });
  writeFileSync(file, text.endsWith("\n") ? text : `${text}\n`, "utf8");
}

// A redirect stub: the readable slug path pointing at the deposit number.
function writeRedirectStub(fromPath, toPath, title) {
  const target = `${SITE_URL}${toPath}`;
  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>${esc(title)} · ${esc(SITE_NAME)}</title>
    <link rel="canonical" href="${target}" />
    <meta http-equiv="refresh" content="0; url=${esc(toPath)}" />
    <meta name="robots" content="noindex, follow" />
  </head>
  <body>
    <p>This is now kept at <a href="${esc(toPath)}">${esc(toPath)}</a>.</p>
  </body>
</html>
`;
  const outDir = join(DIST_DIR, fromPath.replace(/^\//, ""));
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, "index.html"), html, "utf8");
  written++;
}

const link = (to, label) => `<a href="${esc(to)}">${esc(label)}</a>`;

// ---------------------------------------------------------------------
// Deposited items and CMS pages
// ---------------------------------------------------------------------
function itemMain({ title, speaker, byline, bodyDoc, detail, series }) {
  const parts = [];
  if (speaker) parts.push(`<p><strong>${esc(SPEAKER[speaker])}</strong></p>`);
  parts.push(`<article><h1>${esc(title)}</h1>`);
  if (byline) parts.push(`<p>${esc(byline)}</p>`);
  if (detail?.abstract) parts.push(`<p><em>${esc(detail.abstract)}</em></p>`);
  parts.push(renderDoc(bodyDoc));
  if (detail?.sources_note) parts.push(`<p>Sources: ${esc(detail.sources_note)}</p>`);
  if (detail?.deposit_ref) {
    parts.push(`<p>Kept by the house · Deposited in the Record (${esc(detail.deposit_ref)})</p>`);
    if (detail.license) parts.push(`<p>Licence: ${esc(detail.license)}.</p>`);
    parts.push(
      `<p>Cite as: ${esc([title, series, "PAZ, Patan, Lalitpur", detail.deposit_ref].filter(Boolean).join(". "))}.</p>`,
    );
    parts.push(`<p><a href="/record/${esc(detail.deposit_ref)}/text.txt">Plain text</a></p>`);
  }
  parts.push("</article>");
  return parts.join("\n");
}

function itemText({ title, byline, bodyDoc, detail, series, url }) {
  return [
    title,
    byline ?? "",
    "",
    plain(bodyDoc),
    "",
    detail?.sources_note ? `Sources: ${detail.sources_note}` : "",
    `Kept by the house. Deposited in the Record (${detail.deposit_ref}).`,
    detail?.license ? `Licence: ${detail.license}.` : "",
    `Cite as: ${[title, series, "PAZ, Patan, Lalitpur", detail.deposit_ref].filter(Boolean).join(". ")}.`,
    url,
  ]
    .filter((l, i, arr) => l !== "" || (arr[i - 1] ?? "") !== "")
    .join("\n");
}

async function renderItems(items) {
  let neCount = 0;
  for (const { type, slug } of items) {
    const series = SERIES[type];
    if (series) {
      const detail = await callRpc(series.fn, { p_slug: slug }).then((r) => r[0] ?? null);
      if (!detail) continue;
      const readable = `/${series.path}/${slug}`;
      const canonical = detail.deposit_ref ? `/record/${detail.deposit_ref}` : readable;
      const speaker = SERIES_SPEAKER[type] ?? "house";
      const ld = detail.deposit_ref
        ? {
            "@context": "https://schema.org",
            "@type": "Article",
            headline: detail.title,
            identifier: detail.deposit_ref,
            url: `${SITE_URL}${canonical}`,
            isPartOf: { "@type": "PublicationSeries", name: series.name },
            ...(detail.license ? { license: detail.license } : {}),
          }
        : undefined;
      const opts = {
        title: detail.title,
        description: detail.abstract || null,
        ogType: "article",
        ld,
        canonicalPath: canonical,
        alternateNe: hasNe(detail),
        lastmod: detail.deposited_at?.slice(0, 10) ?? null,
        priority: "0.7",
      };
      const main = itemMain({
        title: detail.title,
        speaker,
        byline: series.byline,
        bodyDoc: detail.body,
        detail,
        series: series.name,
      });
      writePage(canonical, opts, main);
      if (detail.deposit_ref) {
        writeRedirectStub(readable, canonical, detail.title);
        writeText(
          `record/${detail.deposit_ref}/text.txt`,
          itemText({
            title: detail.title,
            byline: series.byline,
            bodyDoc: detail.body,
            detail,
            series: series.name,
            url: `${SITE_URL}${canonical}`,
          }),
        );
      }
      if (hasNe(detail)) {
        writePage(
          canonical,
          { ...opts, title: detail.title_ne || detail.title },
          itemMain({
            title: detail.title_ne || detail.title,
            speaker,
            byline: series.byline,
            bodyDoc: hasDoc(detail.body_ne) ? detail.body_ne : detail.body,
            detail,
            series: series.name,
          }),
          "ne",
        );
        neCount++;
      }
    } else if (type === "page" || type === "article") {
      const detail = await callRpc("get_published_item", { p_type: type, p_slug: slug }).then(
        (r) => r[0] ?? null,
      );
      if (!detail) continue;
      if (type === "page")
        PAGES.set(slug, {
          slug,
          title: detail.title,
          subtitle: detail.subtitle,
          body: detail.body,
        });
      const path = type === "article" ? `/journal/${slug}` : `/${slug}`;
      const opts = {
        title: detail.title,
        description: detail.summary || detail.subtitle || null,
        ogType: "article",
      };
      const build = (t, doc) =>
        `<article><h1>${esc(t)}</h1>${detail.subtitle ? `<p>${esc(detail.subtitle)}</p>` : ""}${renderDoc(doc)}</article>`;
      // The canon documents live at /canon/<n>, never at their page slug.
      if (!slug.startsWith("canon-")) writePage(path, opts, build(detail.title, detail.body));
      if (hasNe(detail)) {
        writePage(
          path,
          { ...opts, title: detail.title_ne || detail.title },
          build(
            detail.title_ne || detail.title,
            hasDoc(detail.body_ne) ? detail.body_ne : detail.body,
          ),
          "ne",
        );
        neCount++;
      }
    }
  }
  return neCount;
}

// ---------------------------------------------------------------------
// The Wall
// ---------------------------------------------------------------------
function imageHtml(img, eager = false) {
  if (!img) return "";
  const media = (p) => `${SUPABASE_URL}/storage/v1/object/public/media/${p}`;
  const variants = (img.variants ?? []).filter((v) => v && v.w).sort((a, b) => a.w - b.w);
  const set = (k) =>
    variants
      .filter((v) => v[k])
      .map((v) => `${media(v[k])} ${v.w}w`)
      .join(", ");
  const webp = set("webp");
  const jpg = set("jpg");
  const fallback = variants.length
    ? (variants[variants.length - 1].jpg ?? img.original_path)
    : img.original_path;
  return `<figure><div class="work-surround"><picture>${
    webp
      ? `<source type="image/webp" srcset="${esc(webp)}" sizes="(min-width: 1024px) 58vw, 92vw" />`
      : ""
  }${jpg ? `<source type="image/jpeg" srcset="${esc(jpg)}" sizes="(min-width: 1024px) 58vw, 92vw" />` : ""}<img src="${esc(media(fallback))}" alt="${esc(img.alt)}" width="${img.width}" height="${img.height}" loading="${eager ? "eager" : "lazy"}" decoding="async" /></picture></div><figcaption>Photograph: ${esc(img.photographer)} · <a href="${esc(media(img.original_path))}">Full size</a></figcaption></figure>`;
}

const EVENT_LABEL = {
  made: "Made",
  shown: "Shown",
  sold: "Sold",
  loaned: "Loaned",
  returned: "Returned",
  damaged: "Damaged",
  restored: "Restored",
  rehoused: "Rehoused",
};
const AVAIL = {
  available: "Available",
  sold: "Sold",
  not_for_sale: "Not for sale",
  on_loan: "On loan",
};

function renderWall(d) {
  const people = d.people;
  const byPerson = new Map();
  for (const w of d.works) {
    if (!byPerson.has(w.person_id)) byPerson.set(w.person_id, []);
    byPerson.get(w.person_id).push(w);
  }
  const imagesByWork = new Map();
  for (const i of d.images) {
    if (!imagesByWork.has(i.work_id)) imagesByWork.set(i.work_id, []);
    imagesByWork.get(i.work_id).push(i);
  }
  const showsByWork = new Map();
  for (const l of d.showWorks) {
    if (!showsByWork.has(l.work_id)) showsByWork.set(l.work_id, []);
    showsByWork.get(l.work_id).push(l.show_id);
  }
  const showById = new Map(d.shows.map((s) => [s.id, s]));
  const personById = new Map(people.map((p) => [p.id, p]));
  const workById = new Map(d.works.map((w) => [w.id, w]));
  const whole = (wid) => (imagesByWork.get(wid) ?? []).find((i) => i.frame === "whole");

  const workCard = (w) =>
    `<li>${whole(w.id) ? `<a href="/works/${esc(w.slug)}">${imageHtml(whole(w.id))}</a>` : ""}<p>${link(`/works/${w.slug}`, w.title)}</p><p>${esc(w.person_name)}${w.year ? `, ${w.year}` : ""}${w.availability === "sold" ? ". Sold." : ""}</p></li>`;

  // The Wall front: current people (active only), recent work, shows.
  const current = people.filter((p) => p.active);
  const currentIds = new Set(current.map((p) => p.id));
  const listed = d.works.filter((w) => currentIds.has(w.person_id)).slice(0, 24);
  writePage(
    "/wall",
    { title: "The Wall" },
    `<h1>The Wall</h1><h2>People</h2><ul>${current.map((p) => `<li>${link(`/people/${p.slug}`, p.name)}</li>`).join("")}</ul><h2>Work</h2><ul>${listed.map(workCard).join("")}</ul><h2>Shows</h2>${d.shows.length ? "" : `<p>${esc(EMPTY.shows)}</p>`}<ol>${d.shows
      .map(
        (s) =>
          `<li>${link(`/shows/${s.slug}`, s.title)} <span>${gregorian(s.opened_on)}${s.closed_on ? ` to ${gregorian(s.closed_on)}` : ""}</span></li>`,
      )
      .join("")}</ol>`,
  );

  for (const p of people) {
    const works = byPerson.get(p.id) ?? [];
    const workIds = new Set(works.map((w) => w.id));
    const hung = d.shows.filter((s) =>
      d.showWorks.some((l) => l.show_id === s.id && workIds.has(l.work_id)),
    );
    const elsewhere = d.exhibitions.filter((e) => e.person_id === p.id);
    const writings = d.writings.filter((x) => x.person_id === p.id);
    const about = d.pieces.filter((x) => x.subject_person_id === p.id);
    const main = [
      `<article><h1>${esc(p.name)}</h1>`,
      p.active
        ? ""
        : "<p>This page is kept as a record. The house does not currently present this person.</p>",
      p.statement ? `<h2>In their own words</h2><p>${esc(p.statement)}</p>` : "",
      `<h2>Work</h2><ul>${works.map(workCard).join("") || `<li>${esc(EMPTY.artistNoWork)}</li>`}</ul>`,
      hung.length || elsewhere.length
        ? `<h2>Where they have shown</h2><ul>${hung
            .map(
              (s) =>
                `<li>${link(`/shows/${s.slug}`, s.title)} · At the house · ${gregorian(s.opened_on)}</li>`,
            )
            .join("")}${elsewhere
            .map(
              (e) =>
                `<li>${esc(e.title)}${e.place ? ` · ${esc(e.place)}` : ""}${e.year ? ` · ${e.year}` : ""}</li>`,
            )
            .join("")}</ul>`
        : "",
      about.length || writings.length
        ? `<h2>Written about</h2><ul>${about
            .map(
              (x) =>
                `<li>${link(`/record/${x.deposit_ref}`, x.title)} · by ${esc(x.person_name)} · The Sattal</li>`,
            )
            .join("")}${writings
            .map(
              (x) =>
                `<li>${x.url ? link(x.url, x.title) : esc(x.title)} · ${esc(x.source)}${x.year ? `, ${x.year}` : ""}</li>`,
            )
            .join("")}</ul>`
        : "",
      "</article>",
    ].join("\n");
    writePage(
      `/people/${p.slug}`,
      {
        title: p.name,
        ld: {
          "@context": "https://schema.org",
          "@type": "Person",
          name: p.name,
          url: `${SITE_URL}/people/${p.slug}`,
        },
      },
      main,
    );
  }

  for (const w of d.works) {
    const p = personById.get(w.person_id);
    const frames = ["whole", "detail", "scale"]
      .map((f) => (imagesByWork.get(w.id) ?? []).find((i) => i.frame === f))
      .filter(Boolean);
    const events = d.events.filter((e) => e.work_id === w.id);
    const texts = d.texts.filter((t) => t.work_id === w.id);
    const hung = (showsByWork.get(w.id) ?? []).map((id) => showById.get(id)).filter(Boolean);
    const about = d.pieces.filter((x) => x.subject_work_id === w.id);
    const dims = dimensions(w.height_mm, w.width_mm, w.depth_mm);
    const main = [
      `<article>${frames.map((f, i) => imageHtml(f, i === 0)).join("")}`,
      `<p>${p ? link(`/people/${p.slug}`, p.name) : esc(w.person_name)}</p><h1>${esc(w.title)}</h1>`,
      `<p>${[w.year, w.medium, dims].filter(Boolean).map(esc).join("<br />")}</p><p>Work no. ${w.work_number}</p>`,
      w.price_minor != null ? `<p>${esc(money(w.price_minor, w.currency))}</p>` : "",
      w.friends_price_minor != null
        ? `<p>Friends of PAZ price: ${esc(money(w.friends_price_minor, w.currency))}</p>`
        : "",
      `<p><strong>${esc(AVAIL[w.availability] ?? w.availability)}</strong></p>`,
      w.provenance_note ? `<p>${esc(w.provenance_note)}</p>` : "",
      ...texts.map(
        (t) =>
          `<p><em>${t.attribution === "maker" ? "In the maker's words" : "The house writes"}</em></p><p>${esc(t.body)}</p>`,
      ),
      `<h2>Its life</h2><ol>${
        events
          .map(
            (e) =>
              `<li>${gregorian(e.occurred_on)} ${esc(EVENT_LABEL[e.kind] ?? e.kind)}${e.note ? `. ${esc(e.note)}` : ""}</li>`,
          )
          .join("") || "<li>Nothing has been recorded yet.</li>"
      }</ol>`,
      hung.length
        ? `<h2>Where it has hung</h2><ul>${hung.map((s) => `<li>${link(`/shows/${s.slug}`, s.title)} · ${gregorian(s.opened_on)}</li>`).join("")}</ul>`
        : "",
      about.length
        ? `<h2>Written about it</h2><ul>${about.map((x) => `<li>${link(`/record/${x.deposit_ref}`, x.title)} · by ${esc(x.person_name)}</li>`).join("")}</ul>`
        : "",
      "</article>",
    ].join("\n");
    const ld = {
      "@context": "https://schema.org",
      "@type": "VisualArtwork",
      name: w.title,
      url: `${SITE_URL}/works/${w.slug}`,
      ...(p ? { creator: { "@type": "Person", name: p.name } } : {}),
      ...(w.year ? { dateCreated: String(w.year) } : {}),
      ...(w.medium ? { artMedium: w.medium } : {}),
      ...(w.availability === "available" && w.price_minor != null
        ? {
            offers: {
              "@type": "Offer",
              price: w.price_minor / 100,
              priceCurrency: w.currency,
              availability: "https://schema.org/InStock",
            },
          }
        : {}),
    };
    writePage(`/works/${w.slug}`, { title: `${w.title}, ${w.person_name}`, ld }, main);
  }

  for (const s of d.shows) {
    const ids = new Set(d.showWorks.filter((l) => l.show_id === s.id).map((l) => l.work_id));
    const hung = [...ids].map((id) => workById.get(id)).filter(Boolean);
    writePage(
      `/shows/${s.slug}`,
      { title: s.title },
      `<article><h1>${esc(s.title)}</h1><p>${gregorian(s.opened_on)}${s.closed_on ? ` to ${gregorian(s.closed_on)}` : ""}</p>${
        s.text ? `<p><em>The house writes</em></p><p>${esc(s.text)}</p>` : ""
      }<h2>What hung</h2><ul>${hung.map(workCard).join("") || `<li>${esc(EMPTY.wall)}</li>`}</ul></article>`,
    );
  }
}

// ---------------------------------------------------------------------
// The Sattal
// ---------------------------------------------------------------------
const KEY = /\[\[([^\]]+)\]\]/g;
const showKeys = (html) => html.replace(KEY, "[$1]");

function renderSattal(d) {
  const FORM = { study: "Study", review: "Review", account: "Account" };
  const readers = d.readers;
  writePage(
    "/sattal",
    { title: "The Sattal" },
    `<h1>The Sattal</h1><p><strong>${esc(SPEAKER.signed)}</strong></p><p>Work the house shows, sells or has formed, and anything critical of PAZ, is published here only when an author unconnected to it has written it and a named outside reader, whom the house cannot overrule, has accepted it.</p><p>${
      readers.length
        ? `${readers.length === 1 ? "The outside reader is" : "The outside readers are"} ${esc(readers.map((r) => r.name).join(", "))}.`
        : EMPTY.sattalNoReader
    }</p><ol>${
      d.pieces
        .map(
          (x) =>
            `<li>${esc(FORM[x.form] ?? x.form)} no. ${x.piece_number}<br />${link(`/record/${x.deposit_ref}`, x.title)}<br />${esc(x.person_name)}</li>`,
        )
        .join("") || `<li>${esc(EMPTY.sattal)}</li>`
    }</ol>`,
  );

  for (const x of d.pieces) {
    const corrections = d.corrections.filter((c) => c.piece_id === x.id);
    const replies = d.pieces.filter((r) => r.reply_to_piece_id === x.id);
    const original = d.pieces.find((o) => o.id === x.reply_to_piece_id);
    const en = x.body?.content ?? [];
    const ne = x.body_ne?.content ?? [];
    const sources = (x.sources ?? []).filter((s) => s && s.key);
    const source = (k) => sources.find((s) => s.key === k)?.text ?? "";
    const margin = (node) => {
      const keys = [...plain({ content: [node] }).matchAll(KEY)].map((m) => m[1]);
      return keys.length
        ? `<aside>${keys.map((k) => `<p>[${esc(k)}] ${esc(source(k))}</p>`).join("")}</aside>`
        : "";
    };
    const block = (node) => showKeys(renderDoc({ content: [node] }));
    let body;
    if (en.length && ne.length) {
      const rows = Math.max(en.length, ne.length);
      const originalIsNe = x.original_language !== "en";
      body = `<div class="sattal-leaf"><div class="sattal-row sattal-row-parallel"><p lang="en">English${originalIsNe ? ", translation" : ", the original"}</p><p lang="ne">नेपाली</p></div>${Array.from(
        { length: rows },
        (_, i) =>
          `<div class="sattal-row sattal-row-parallel"><div lang="en">${en[i] ? block(en[i]) : ""}</div><div lang="ne">${ne[i] ? block(ne[i]) : ""}</div></div>`,
      ).join("")}${
        sources.length
          ? `<aside>${sources.map((s) => `<p>[${esc(s.key)}] ${esc(s.text)}</p>`).join("")}</aside>`
          : ""
      }</div>`;
    } else {
      const only = en.length ? en : ne;
      body = `<div class="sattal-leaf"${en.length ? "" : ' lang="ne"'}>${only
        .map((node) => `<div class="sattal-row">${block(node)}${margin(node)}</div>`)
        .join("")}</div>`;
    }
    const canonical = `/record/${x.deposit_ref}`;
    const main = [
      `<article><p>${esc(x.person_name)}</p>`,
      `<p>${esc(FORM[x.form] ?? x.form)} no. ${x.piece_number}</p><h1>${esc(x.title)}</h1><p>${esc(x.person_name)}</p>`,
      original
        ? `<p>A reply to ${link(`/record/${original.deposit_ref}`, original.title)}.</p>`
        : "",
      body,
      "<footer><hr />",
      corrections.length
        ? `<p><strong>Corrections, by addition</strong></p><ul>${corrections.map((c) => `<li>${gregorian(c.added_at)}. ${esc(c.note)}</li>`).join("")}</ul>`
        : "",
      `<p><strong>Relation to the subject.</strong> ${esc(x.relation_declaration)}</p>`,
      x.outside_reader_name
        ? `<p><strong>Accepted by the outside reader</strong> ${esc(x.outside_reader_name)}${x.reader_accepted_on ? `, ${gregorian(x.reader_accepted_on)}` : ""}.</p>`
        : "",
      `<p><strong>${esc(SPEAKER.signed)}</strong></p>`,
      `<p>Sattal piece no. ${x.piece_number}. Deposited in the Record as ${esc(x.deposit_ref)}. <a href="${canonical}/text.txt">Plain text</a></p>`,
      "</footer>",
      replies.length
        ? `<h2>Replies</h2><ul>${replies.map((r) => `<li>${link(`/record/${r.deposit_ref}`, r.title)} · ${esc(r.person_name)}</li>`).join("")}</ul>`
        : "",
      "</article>",
    ].join("\n");
    writePage(
      canonical,
      {
        title: `${x.title}, ${x.person_name}`,
        ogType: "article",
        ld: {
          "@context": "https://schema.org",
          "@type": "Article",
          headline: x.title,
          identifier: x.deposit_ref,
          url: `${SITE_URL}${canonical}`,
          author: { "@type": "Person", name: x.person_name },
          isPartOf: { "@type": "PublicationSeries", name: "The Sattal" },
        },
      },
      main,
    );
    writeRedirectStub(`/sattal/${x.slug}`, canonical, x.title);
    writeText(
      `record/${x.deposit_ref}/text.txt`,
      [
        x.title,
        x.person_name,
        "",
        plain(x.body).replace(KEY, "[$1]"),
        ne.length ? `\n---\n\n${plain(x.body_ne).replace(KEY, "[$1]")}` : "",
        "",
        sources.length ? sources.map((s) => `[${s.key}] ${s.text}`).join("\n") : "",
        `Relation to the subject. ${x.relation_declaration}`,
        SPEAKER.signed,
        `Sattal piece no. ${x.piece_number}. Deposited in the Record as ${x.deposit_ref}.`,
        `${SITE_URL}${canonical}`,
      ].join("\n"),
    );
  }
}

// ---------------------------------------------------------------------
// The Chronicle, the Record, the glossary, the home page
// ---------------------------------------------------------------------
function renderChronicle(lines) {
  writePage(
    "/chronicle",
    { title: "The Chronicle" },
    `<h1>The Chronicle</h1><ol>${lines.map((l) => `<li>${gregorian(l.line_on)} ${esc(l.line)}</li>`).join("") || `<li>${esc(EMPTY.chronicle)}</li>`}</ol>`,
  );
  writeText(
    "chronicle.txt",
    lines.map((l) => `${l.line_on}  ${l.line}`).join("\n") || EMPTY.chronicle,
  );
}

function renderGlossary(terms) {
  writePage(
    "/words",
    { title: "Words" },
    `<h1>Words</h1><dl>${
      terms
        .map(
          (t) =>
            `<div id="${esc(t.slug)}"><dt>${esc(t.term)}${t.kind === "spelling" ? " · spelling" : ""}</dt><dd>${esc(t.definition)}</dd></div>`,
        )
        .join("") || "<p>No words are listed yet.</p>"
    }</dl>`,
  );
}

function renderHome(d) {
  const recent = d.works.filter((w) => w.person_active).slice(0, 6);
  writePage(
    "/",
    { title: SITE_NAME, ogType: "website" },
    `<h1>${esc(SITE_NAME)}</h1><p>Patan, Lalitpur</p><h2>The Wall</h2><ul>${
      recent
        .map((w) => `<li>${esc(w.person_name)}<br />${link(`/works/${w.slug}`, w.title)}</li>`)
        .join("") || `<li>${esc(EMPTY.wall)}</li>`
    }</ul><h2>The Sattal</h2><ol>${d.pieces
      .slice(0, 3)
      .map(
        (x) => `<li>${link(`/record/${x.deposit_ref}`, x.title)}<br />${esc(x.person_name)}</li>`,
      )
      .join("")}</ol><h2>The Chronicle</h2><ol>${d.chronicle
      .slice(0, 5)
      .map((l) => `<li>${gregorian(l.line_on)} ${esc(l.line)}</li>`)
      .join("")}</ol><nav aria-label="The six organs">${[
      ["/house", "House"],
      ["/record", "Record"],
      ["/guild", "Guild"],
      ["/press", "Press"],
      ["/hearth", "Hearth"],
      ["/treasury", "Treasury"],
    ]
      .map(([to, label]) => link(to, label))
      .join(" · ")}</nav>`,
  );
}

// ---------------------------------------------------------------------
// Every remaining public route (Build Programme 2.1): the series indexes,
// the six organs, the deposit register, programmes, Friends, and the pages
// whose words the house supplies. Empty rooms are written too, with the
// house's own empty sentence and never an instruction to the desk.
// ---------------------------------------------------------------------
const SERIES_INDEX = [
  {
    type: "paper",
    path: "/papers",
    title: "Papers",
    note: "Long-form essays. Numbered, permanent.",
  },
  { type: "brief", path: "/brief", title: "Brief" },
  { type: "dispatch", path: "/dispatch", title: "Dispatch" },
  { type: "pigeon_post", path: "/pigeon-post", title: "Pigeon Post" },
  { type: "annual", path: "/annual", title: "Annual" },
];

function renderSeriesIndexes(items, deposits) {
  const byRef = new Map(deposits.map((d) => [d.deposit_number, d]));
  for (const s of SERIES_INDEX) {
    const rows = items.filter((i) => i.type === s.type);
    writePage(
      s.path,
      { title: s.title, priority: "0.7" },
      `<h1>${esc(s.title)}</h1>${s.note ? `<p>${esc(s.note)}</p>` : ""}<ul>${
        rows
          .map((i) => {
            const to = i.deposit_ref ? `/record/${i.deposit_ref}` : `${s.path}/${i.slug}`;
            const d = i.deposit_ref ? byRef.get(i.deposit_ref) : null;
            return `<li>${link(to, i.title)}${d ? ` <span>${esc(dualEra(d.deposited_at))}</span>` : ""}</li>`;
          })
          .join("") || `<li>${esc(EMPTY.series)}</li>`
      }</ul>`,
    );
  }
}

function pageBody(pagesBySlug, slug) {
  const p = pagesBySlug.get(slug);
  return p ? renderDoc(p.body) : "";
}

const ORGAN_LINKS = {
  house: [
    ["/hearth", "The Hearth"],
    ["/guild", "The Guild"],
    ["/press", "The Press"],
    ["/record", "The Record"],
    ["/treasury", "The Treasury"],
    ["/chronicle", "The Chronicle"],
    ["/commons", "The Commons"],
    ["/friends", "Friends of PAZ"],
    ["/table", "The Table"],
    ["/encounters", "Encounters"],
    ["/name", "The name"],
    ["/canon", "The Canon"],
  ],
  record: [
    ["/record/deposits", "The deposit register"],
    ["/chronicle", "The Chronicle"],
  ],
  press: [
    ...SERIES_INDEX.map((s) => [s.path, s.title]),
    ["/sattal", "The Sattal"],
    ["/send-a-pigeon", "Send a pigeon"],
  ],
};

function renderOrgans(pagesBySlug, extra = {}) {
  const ORGANS = [
    ["house", "The House"],
    ["hearth", "The Hearth"],
    ["guild", "The Guild"],
    ["press", "The Press"],
    ["record", "The Record"],
    ["treasury", "The Treasury"],
  ];
  for (const [slug, title] of ORGANS) {
    const p = pagesBySlug.get(slug);
    const links = (ORGAN_LINKS[slug] ?? [])
      .map(([to, label]) => `<li>${link(to, label)}</li>`)
      .join("");
    writePage(
      `/${slug}`,
      {
        title: p?.title || title,
        description: p?.subtitle || null,
        priority: "0.8",
      },
      `<h1>${esc(p?.title || title)}</h1><p>An organ of the house</p>${p ? renderDoc(p.body) : ""}${
        extra[slug] ?? ""
      }${links ? `<nav aria-label="In ${esc(title)}"><ul>${links}</ul></nav>` : ""}`,
    );
  }
}

function renderDeposits(entries) {
  writePage(
    "/record/deposits",
    { title: "The deposit register", priority: "0.6" },
    `<h1>The deposit register</h1><ol>${
      entries
        .map(
          (e) =>
            `<li id="${esc(e.deposit_number)}">${esc(e.deposit_number)} · ${esc(dualEra(e.deposited_at))}<br />${link(e.link, e.title)}<br />${esc(e.provenance)}</li>`,
        )
        .join("") || `<li>${esc(EMPTY.deposits)}</li>`
    }</ol>`,
  );
  writeText(
    "record.txt",
    entries
      .map(
        (e) => `${e.deposit_number}  ${dualEra(e.deposited_at)}  ${e.title}  ${SITE_URL}${e.link}`,
      )
      .join("\n") || EMPTY.deposits,
  );
}

function renderProgrammes(sessions) {
  const bySlug = new Map();
  for (const s of sessions) {
    if (!s.program_slug) continue;
    if (!bySlug.has(s.program_slug)) bySlug.set(s.program_slug, []);
    bySlug.get(s.program_slug).push(s);
  }
  const row = (s) =>
    `<li>${esc(s.starts_at ? gregorian(s.starts_at) : "")}${s.venue_name ? ` · ${esc(s.venue_name)}` : ""}</li>`;
  writePage(
    "/programmes",
    { title: "Programmes", priority: "0.6" },
    `<h1>Programmes</h1><ul>${
      [...bySlug.entries()]
        .map(
          ([slug, rows]) =>
            `<li>${link(`/programmes/${slug}`, rows[0].program_title)}<ul>${rows.map(row).join("")}</ul></li>`,
        )
        .join("") || `<li>${esc(EMPTY.encounters)}</li>`
    }</ul>`,
  );
  for (const [slug, rows] of bySlug) {
    writePage(
      `/programmes/${slug}`,
      { title: rows[0].program_title, priority: "0.5" },
      `<h1>${esc(rows[0].program_title)}</h1><ul>${rows.map(row).join("")}</ul>`,
    );
  }
}

function renderFriends(tiers) {
  writePage(
    "/friends",
    { title: "Friends of PAZ", priority: "0.5" },
    `<h1>Friends of PAZ</h1><ul>${tiers
      .map(
        (t) =>
          `<li><strong>${esc(t.name)}</strong> · ${esc(money(t.annual_fee_cents, "NPR"))} a year${
            t.description ? `<br />${esc(t.description)}` : ""
          }</li>`,
      )
      .join("")}</ul>${formNote("Applying")}`,
  );
}

function formNote(what) {
  return `<p>${esc(what)} needs JavaScript.${
    CONTACT_EMAIL ? ` Write to ${link(`mailto:${CONTACT_EMAIL}`, CONTACT_EMAIL)} instead.` : ""
  }</p>`;
}

const LADDER = ["Guest", "Companion", "Denizen", "Steward", "Elder", "Ancestor"];

// Pages whose words the house supplies: written from the published page of
// the same slug if there is one, otherwise the plain shell.
const SHELLS = [
  ["name", "The name"],
  ["table", "The Table"],
  ["encounters", "Encounters"],
  ["looking-for", "Looking for"],
  ["privacy", "Privacy"],
  ["terms", "Terms"],
];

function renderShells(pagesBySlug, written) {
  for (const [slug, title] of SHELLS) {
    if (written.has(`/${slug}`)) continue;
    writePage(
      `/${slug}`,
      { title, priority: "0.4" },
      `<h1>${esc(title)}</h1><p>This page has not been written yet.</p>`,
    );
  }
  if (!written.has("/commons")) {
    writePage(
      "/commons",
      { title: "The Commons", priority: "0.5" },
      `<h1>The Commons</h1>${pageBody(pagesBySlug, "commons") || "<p>This page has not been written yet.</p>"}<h2>The ladder</h2><ol>${LADDER.map((r) => `<li>${esc(r)}</li>`).join("")}</ol><p>${esc(EMPTY.commons)}</p>`,
    );
  }
  writePage(
    "/canon",
    { title: "The Canon", priority: "0.5" },
    `<h1>The Canon</h1>${
      [...pagesBySlug.values()]
        .filter((p) => p.slug.startsWith("canon-"))
        .map((p) => `<p>${link(`/canon/${p.slug.replace(/^canon-/, "")}`, p.title)}</p>`)
        .join("") || "<p>No document has been published yet.</p>"
    }`,
  );
  for (const p of pagesBySlug.values()) {
    if (!p.slug.startsWith("canon-")) continue;
    const doc = p.slug.replace(/^canon-/, "");
    writePage(
      `/canon/${doc}`,
      { title: p.title, priority: "0.5" },
      `<h1>${esc(p.title)}</h1>${renderDoc(p.body)}`,
    );
  }
  writePage(
    "/contact",
    { title: "Contact", priority: "0.4" },
    `<h1>Contact</h1>${formNote("Writing from this page")}`,
  );
  writePage(
    "/send-a-pigeon",
    { title: "Send a pigeon", priority: "0.4" },
    `<h1>Send a pigeon</h1>${formNote("Sending a pigeon")}`,
  );
  writePage(
    "/a-voice",
    { title: "A voice", noindex: true },
    `<h1>A voice</h1>${pageBody(pagesBySlug, "a-voice")}${formNote("This form")}`,
  );
  writePage(
    "/search",
    { title: "Search", noindex: true },
    `<h1>Search</h1><p>Search needs JavaScript. ${link("/record/deposits", "The deposit register")} lists everything deposited.</p>`,
  );
}

// ---------------------------------------------------------------------
// The sitemap comes from what was actually written, and the build fails
// when an entry has no file or a public route has no page.
// ---------------------------------------------------------------------
const APP_ONLY = new Set([
  "sign-in",
  "account",
  "my-registrations",
  "membership/card",
  "membership/apply",
  "membership/directory",
  "membership/accept-invitation",
  "journal",
  "the-record",
  "visit",
]);

function checkRoutesAndWriteSitemap() {
  const problems = [];
  for (const path of SITEMAP.keys()) {
    const file = join(DIST_DIR, path === "/" ? "" : path.replace(/^\//, ""), "index.html");
    if (!existsSync(file)) problems.push(`sitemap entry ${path} has no file (${file})`);
  }
  // Every static public route in the router must have been prerendered.
  const router = readFileSync(new URL("../apps/web/src/app/router.tsx", import.meta.url), "utf8");
  const publicPart = router.slice(
    router.indexOf("function publicRouteChildren"),
    router.indexOf("export const router"),
  );
  for (const m of publicPart.matchAll(/\{\s*path:\s*"([^"]+)"/g)) {
    const path = m[1];
    if (path.includes(":") || path === "*" || APP_ONLY.has(path)) continue;
    const file = join(DIST_DIR, path, "index.html");
    if (!existsSync(file)) problems.push(`public route /${path} was not prerendered`);
  }
  if (problems.length) {
    console.error(problems.join("\n"));
    process.exit(1);
  }

  const entry = (path, meta) => {
    const loc = `${SITE_URL}${path === "/" ? "/" : path}`;
    return [
      "  <url>",
      `    <loc>${esc(loc)}</loc>`,
      meta.lastmod ? `    <lastmod>${meta.lastmod}</lastmod>` : null,
      `    <priority>${meta.priority}</priority>`,
      // hreflang only for pages whose Nepali page was prerendered too.
      ...(meta.ne
        ? [
            `    <xhtml:link rel="alternate" hreflang="en" href="${esc(loc)}" />`,
            `    <xhtml:link rel="alternate" hreflang="ne" href="${esc(`${SITE_URL}/ne${path === "/" ? "" : path}`)}" />`,
          ]
        : []),
      "  </url>",
    ]
      .filter(Boolean)
      .join("\n");
  };
  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">',
    ...[...SITEMAP.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([p, m]) => entry(p, m)),
    "</urlset>",
    "",
  ].join("\n");
  writeFileSync(join(DIST_DIR, "sitemap.xml"), xml, "utf8");
  console.log(`sitemap.xml: ${SITEMAP.size} URL(s), each backed by a written file.`);
}

async function main() {
  // app.html is the untouched shell every unmatched path falls back to.
  // index.html becomes the prerendered home page, so it can no longer be
  // the fallback: serving it for every other address would file the home
  // page under all of them (Build Programme 2.1).
  const shell = join(DIST_DIR, "app.html");
  baseHtml = readFileSync(existsSync(shell) ? shell : join(DIST_DIR, "index.html"), "utf8");
  if (baseHtml.includes("<main>")) throw new Error("The shell already holds a prerendered page.");
  writeFileSync(shell, baseHtml, "utf8");

  const info = await callRpc("site_info").catch(() => ({}));
  SITE_NAME = info?.["site.name"] || "PAZ";
  CONTACT_EMAIL = info?.["site.contact_email"] || null;

  const [
    items,
    people,
    works,
    images,
    events,
    texts,
    shows,
    showWorks,
    exhibitions,
    writings,
    pieces,
    corrections,
    readers,
    chronicle,
    glossary,
    record,
    sessions,
    tiers,
  ] = await Promise.all([
    all("published_items", "select=type,slug,title,deposit_ref&order=published_at.desc,id"),
    all("wall_people", "select=*&order=name,id"),
    all("wall_works", "select=*&order=work_number.desc"),
    all("wall_work_images", "select=*&order=work_id,frame"),
    all("wall_work_events", "select=*&order=occurred_on,id"),
    all("wall_work_texts", "select=*&order=id"),
    all("wall_shows", "select=*&order=opened_on.desc,id"),
    all("wall_show_works", "select=*&order=show_id,work_id"),
    all("wall_person_exhibitions", "select=*&order=year.desc,id"),
    all("wall_person_writings", "select=*&order=year.desc,id"),
    all("sattal_pieces", "select=*&order=published_at.desc,id"),
    all("sattal_corrections", "select=*&order=added_at,id"),
    all("sattal_readers", "select=*&order=appointed_on,id"),
    all("chronicle_lines", "select=*&order=line_on.desc,id.desc"),
    all("glossary_terms", "select=*&order=term,id"),
    all("record_entries", "select=*&order=deposit_number"),
    all("program_sessions", "select=*&order=starts_at,id"),
    all("membership_tiers", "select=*&order=annual_fee_cents"),
  ]);

  const neCount = await renderItems(items);
  renderWall({
    people,
    works,
    images,
    events,
    texts,
    shows,
    showWorks,
    exhibitions,
    writings,
    pieces,
  });
  renderSattal({ pieces, corrections, readers });
  renderChronicle(chronicle);
  renderDeposits(record);
  renderGlossary(glossary);
  renderHome({ works, pieces, chronicle });
  renderSeriesIndexes(items, record);
  renderOrgans(PAGES);
  renderProgrammes(sessions);
  renderFriends(tiers);
  renderShells(PAGES, new Set(SITEMAP.keys()));
  // Old addresses that moved: a redirect stub for hosts that cannot
  // consult the redirect table (Build Programme 2.4).
  for (const [from, to, title] of [
    ["/the-record", "/record", "The Record"],
    ["/visit", "/wall", "The Wall"],
    ["/journal", "/chronicle", "The Chronicle"],
    ["/membership/apply", "/friends", "Friends of PAZ"],
  ]) {
    writeRedirectStub(from, to, title);
  }
  checkRoutesAndWriteSitemap();

  console.log(
    `Wrote ${written} static page(s) into ${DIST_DIR} (${neCount} Nepali variant(s) where translated text exists), plus plain-text files for every deposit, chronicle.txt and record.txt.`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
