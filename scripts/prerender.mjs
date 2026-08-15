#!/usr/bin/env node
// Work plan Part II, #6: "index.html ships a title tag and an empty div.
// That is what paz.com.np currently serves and what every crawler,
// archiver, link preview, and reader-mode parser sees." This writes a real,
// complete static HTML document for every deposited item, CMS page, and
// journal article at build/deploy time -- dist/<path>/index.html, so a
// direct fetch of the permalink (curl, a crawler, an archive.org capture,
// a link-preview bot) sees the actual title, metadata, and body content
// with no JavaScript required. The SPA still boots normally on top of it
// for a real visitor's browser (createRoot().render() simply replaces
// #root's contents once the bundle loads) -- this only changes what's
// present before that happens.
//
// Deliberately not full server-side React rendering (no react-dom/server,
// no hydration): a plain string-templated HTML renderer that mirrors
// packages/ui/src/components/rich-text.tsx's node vocabulary is enough to
// satisfy every stated Phase 0 acceptance criterion ("legible with
// JavaScript disabled") without the much larger surface area a real SSR
// pipeline would add (loaders, hydration mismatches, an SSR entry point).
// A true SSR upgrade is future work, not required for this to be honest.
//
// Usage: SUPABASE_URL=... SUPABASE_ANON_KEY=... node scripts/prerender.mjs [distDir] [siteUrl]

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
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
const DIST_DIR = process.argv[2] ?? "apps/web/dist";
const SITE_URL = (process.argv[3] ?? "https://paz.com.np").replace(/\/$/, "");

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error("Missing SUPABASE_URL / SUPABASE_ANON_KEY (env vars, or apps/web/.env.local).");
  process.exit(1);
}
if (!existsSync(join(DIST_DIR, "index.html"))) {
  console.error(`${DIST_DIR}/index.html not found -- run the Vite build first.`);
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

async function callRpc(fn, args) {
  const res = await fetch(`${API}/rpc/${fn}`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      "Content-Type": "application/json",
      "Content-Profile": "api",
    },
    body: JSON.stringify(args),
  });
  if (!res.ok) throw new Error(`${fn}: ${res.status} ${await res.text()}`);
  const rows = await res.json();
  return rows[0] ?? null;
}

// ---------------------------------------------------------------------
// ProseMirror JSON -> HTML. Mirrors packages/ui/src/components/rich-text.tsx
// node-for-node -- keep the two in sync by hand if the frozen node set ever
// grows (Build Readiness Review D-7: a schema-version bump is the
// sanctioned way to do that).
// ---------------------------------------------------------------------
function escapeHtml(s) {
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
  let html = escapeHtml(node.text ?? "");
  for (const mark of node.marks ?? []) {
    if (mark.type === "bold") html = `<strong>${html}</strong>`;
    else if (mark.type === "italic") html = `<em>${html}</em>`;
    else if (mark.type === "link") {
      html = `<a href="${escapeHtml(safeHref(mark.attrs?.href))}" rel="noopener noreferrer">${html}</a>`;
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

function renderDoc(doc) {
  if (!doc || !Array.isArray(doc.content)) return "";
  return doc.content.map(renderNode).join("");
}

// An empty ProseMirror doc ({type: "doc", content: []}) is truthy as an
// object but renders nothing -- CMS items get one seeded on creation for
// every bilingual field, whether or not anyone's actually translated it
// yet, so "the field exists" and "someone wrote something" are different
// questions. Only the second one should trigger a Nepali variant.
function hasNeContent(detail) {
  if (detail.title_ne?.trim()) return true;
  if (Array.isArray(detail.body_ne?.content) && detail.body_ne.content.length > 0) return true;
  return false;
}

// ---------------------------------------------------------------------
// Path + head-tag conventions -- mirror apps/web/src/app/router.tsx and
// apps/web/src/modules/site/components/document-head.tsx. Kept as string
// templates here (not a shared import) since this script runs standalone
// under plain Node, outside the Vite/TS build graph.
// ---------------------------------------------------------------------
const SERIES = {
  paper: { path: "papers", name: "Paz Papers", fn: "get_paper" },
  brief: { path: "brief", name: "Brief", fn: "get_brief" },
  dispatch: { path: "dispatch", name: "Dispatch", fn: "get_dispatch" },
  pigeon_post: { path: "pigeon-post", name: "Pigeon Post", fn: "get_pigeon_post" },
  annual: { path: "annual", name: "Annual", fn: "get_annual" },
};

function buildHead({ title, description, path, ogType, depositRef, license, seriesName, lang }) {
  const fullTitle = title && title !== "PAZ" ? `${escapeHtml(title)} — PAZ` : "PAZ";
  const nePath = path === "/" ? "/ne" : `/ne${path}`;
  const localizedPath = lang === "ne" ? nePath : path;
  const url = `${SITE_URL}${localizedPath}`;
  const desc = escapeHtml(
    description || "PAZ, a hospitality-led cultural institution in Kathmandu.",
  );
  const tags = [
    `<title>${fullTitle}</title>`,
    `<meta name="description" content="${desc}" />`,
    `<link rel="canonical" href="${url}" />`,
    `<link rel="alternate" hreflang="en" href="${SITE_URL}${path}" />`,
    `<link rel="alternate" hreflang="ne" href="${SITE_URL}${nePath}" />`,
    `<link rel="alternate" hreflang="x-default" href="${SITE_URL}${path}" />`,
    `<meta name="robots" content="index, follow" />`,
    `<meta property="og:title" content="${fullTitle}" />`,
    `<meta property="og:description" content="${desc}" />`,
    `<meta property="og:type" content="${ogType}" />`,
    `<meta property="og:url" content="${url}" />`,
    `<meta property="og:site_name" content="PAZ" />`,
    `<meta name="twitter:card" content="summary" />`,
    `<meta name="twitter:title" content="${fullTitle}" />`,
    `<meta name="twitter:description" content="${desc}" />`,
  ];
  if (depositRef) {
    const ld = {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: title,
      identifier: depositRef,
      url,
      ...(seriesName ? { isPartOf: { "@type": "PublicationSeries", name: seriesName } } : {}),
      ...(license ? { license } : {}),
    };
    tags.push(`<script type="application/ld+json">${JSON.stringify(ld)}</script>`);
  }
  return tags.join("\n    ");
}

function writeRoute(baseHtml, distDir, path, headHtml, bodyHtml, lang = "en") {
  let html = baseHtml
    .replace(/<title>.*?<\/title>/s, "")
    .replace("</head>", `${headHtml}\n  </head>`);
  html = html.replace('<div id="root"></div>', `<div id="root">${bodyHtml}</div>`);
  if (lang === "ne") html = html.replace('<html lang="en">', '<html lang="ne">');
  const routePath = lang === "ne" ? `/ne${path === "/" ? "" : path}` : path;
  const outDir = join(distDir, routePath.replace(/^\//, ""));
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, "index.html"), html, "utf8");
}

function itemBodyHtml({ title, byline, bodyDoc, depositRef, license }) {
  const parts = [`<h1>${escapeHtml(title)}</h1>`];
  if (byline) parts.push(`<p>${escapeHtml(byline)}</p>`);
  parts.push(renderDoc(bodyDoc));
  if (depositRef) {
    parts.push(
      `<p>Kept by the house · Deposited in the Record (${escapeHtml(depositRef)})${license ? ` · ${escapeHtml(license)}` : ""}</p>`,
    );
  }
  return parts.join("\n");
}

async function main() {
  const baseHtml = readFileSync(join(DIST_DIR, "index.html"), "utf8");
  let count = 0;
  let neCount = 0;

  const items = await selectFrom("published_items", "select=type,slug&order=published_at.desc");

  for (const { type, slug } of items) {
    const series = SERIES[type];
    if (series) {
      const detail = await callRpc(series.fn, { p_slug: slug });
      if (!detail) continue;
      const path = `/${series.path}/${slug}`;
      const head = buildHead({
        title: detail.title,
        description: detail.abstract || null,
        path,
        ogType: "article",
        depositRef: detail.deposit_ref,
        license: detail.license,
        seriesName: series.name,
        lang: "en",
      });
      const body = itemBodyHtml({
        title: detail.title,
        byline: type === "paper" ? "A Paz Paper" : null,
        bodyDoc: detail.body,
        depositRef: detail.deposit_ref,
        license: detail.license,
      });
      writeRoute(baseHtml, DIST_DIR, path, head, body);
      count++;

      // Only pre-render a Nepali variant when there's actually translated
      // content -- a page that's byte-identical to its English sibling
      // except the URL is thin/duplicate content, not a real translation,
      // and would only confuse a search engine rather than help one.
      if (hasNeContent(detail)) {
        const neHead = buildHead({
          title: detail.title_ne || detail.title,
          description: detail.abstract || null,
          path,
          ogType: "article",
          depositRef: detail.deposit_ref,
          license: detail.license,
          seriesName: series.name,
          lang: "ne",
        });
        const neBody = itemBodyHtml({
          title: detail.title_ne || detail.title,
          byline: type === "paper" ? "A Paz Paper" : null,
          bodyDoc: detail.body_ne || detail.body,
          depositRef: detail.deposit_ref,
          license: detail.license,
        });
        writeRoute(baseHtml, DIST_DIR, path, neHead, neBody, "ne");
        neCount++;
      }
    } else if (type === "page" || type === "article") {
      const detail = await callRpc("get_published_item", { p_type: type, p_slug: slug });
      if (!detail) continue;
      const path = type === "article" ? `/journal/${slug}` : `/${slug}`;
      const head = buildHead({
        title: detail.title,
        description: detail.summary || detail.subtitle || null,
        path,
        ogType: "article",
        depositRef: detail.deposit_ref,
        lang: "en",
      });
      const body = itemBodyHtml({
        title: detail.title,
        byline: type === "article" ? detail.author_name : null,
        bodyDoc: detail.body,
        depositRef: detail.deposit_ref,
      });
      writeRoute(baseHtml, DIST_DIR, path, head, body);
      count++;

      if (hasNeContent(detail)) {
        const neHead = buildHead({
          title: detail.title_ne || detail.title,
          description: detail.summary_ne || detail.summary || detail.subtitle || null,
          path,
          ogType: "article",
          depositRef: detail.deposit_ref,
          lang: "ne",
        });
        const neBody = itemBodyHtml({
          title: detail.title_ne || detail.title,
          byline: type === "article" ? detail.author_name : null,
          bodyDoc: detail.body_ne || detail.body,
          depositRef: detail.deposit_ref,
        });
        writeRoute(baseHtml, DIST_DIR, path, neHead, neBody, "ne");
        neCount++;
      }
    }
  }

  console.log(
    `Pre-rendered ${count} static page(s) into ${DIST_DIR}/<path>/index.html, plus ${neCount} Nepali variant(s) into ${DIST_DIR}/ne/<path>/index.html (only where translated content actually exists).`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
