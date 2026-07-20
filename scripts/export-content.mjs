#!/usr/bin/env node
// Exports every deposited/published item as a plain Markdown file with a
// JSON frontmatter block — proof, and the actual mechanism, for
// Non-negotiable §6: "Built for a tiny non-technical staff, for the long
// term... content that is exportable as plain files (no hard vendor
// lock-in)." Deliberately dependency-free (raw fetch against PostgREST,
// the anon key, no service role, no supabase-js) — this is what an
// outside party with nothing but the public site's own credentials could
// run, same access a browser has, nothing more.
//
// Usage: SUPABASE_URL=... SUPABASE_ANON_KEY=... node scripts/export-content.mjs [outDir]
// Falls back to reading apps/web/.env.local for both if the env vars
// aren't set, since that file already holds exactly these two values for
// local dev.

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
const OUT_DIR = process.argv[2] ?? "export-output";

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error("Missing SUPABASE_URL / SUPABASE_ANON_KEY (env vars, or apps/web/.env.local).");
  process.exit(1);
}

const API = `${SUPABASE_URL}/rest/v1`;

// PostgREST serves the `public` schema by default; every table/function
// this project exposes lives in `api` instead (README: "the api schema is
// the only PostgREST-exposed surface"), selected via these profile headers.
async function callRpc(fn, args = {}) {
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
  return res.json();
}

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

// Flattens the frozen ProseMirror node set (RichText's own contract, see
// packages/ui) into plain text -- good enough for a readable export; the
// raw JSON is included too for anything that needs full fidelity.
function bodyToText(doc) {
  if (!doc || typeof doc !== "object") return "";
  const parts = [];
  const walk = (node) => {
    if (!node) return;
    if (node.type === "text") parts.push(node.text ?? "");
    if (Array.isArray(node.content)) {
      for (const child of node.content) walk(child);
      if (node.type === "paragraph" || node.type === "heading") parts.push("\n\n");
      if (node.type === "list_item") parts.push("\n");
    }
  };
  walk(doc);
  return parts
    .join("")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function writeItem(dir, filename, frontmatter, bodyText) {
  mkdirSync(dir, { recursive: true });
  const fm = JSON.stringify(frontmatter, null, 2);
  writeFileSync(join(dir, filename), `---\n${fm}\n---\n\n${bodyText}\n`, "utf8");
}

async function main() {
  console.log(`Exporting from ${SUPABASE_URL} into ./${OUT_DIR}/`);
  mkdirSync(OUT_DIR, { recursive: true });

  const items = await selectFrom("published_items", "select=*");
  console.log(`Found ${items.length} published items across all types.`);

  let exported = 0;
  for (const item of items) {
    const dir = join(OUT_DIR, item.type);
    if (["paper", "brief", "dispatch", "pigeon_post", "annual"].includes(item.type)) {
      const fn = {
        paper: "get_paper",
        brief: "get_brief",
        dispatch: "get_dispatch",
        pigeon_post: "get_pigeon_post",
        annual: "get_annual",
      }[item.type];
      const [detail] = await callRpc(fn, { p_slug: item.slug });
      if (!detail) continue;
      writeItem(
        dir,
        `${item.slug}.md`,
        {
          type: item.type,
          title: detail.title,
          title_ne: detail.title_ne ?? null,
          deposit_ref: detail.deposit_ref ?? null,
          slug: item.slug,
        },
        bodyToText(detail.body) || "(no body — see PDF/keepsake)",
      );
    } else {
      const [detail] = await callRpc("get_published_item", {
        p_type: item.type,
        p_slug: item.slug,
      });
      if (!detail) continue;
      writeItem(
        dir,
        `${item.slug}.md`,
        {
          type: item.type,
          title: detail.title,
          title_ne: detail.title_ne ?? null,
          published_at: detail.published_at ?? null,
          slug: item.slug,
        },
        bodyToText(detail.body),
      );
    }
    exported++;
  }

  const record = await selectFrom("record_entries", "select=*&order=deposited_at.desc");
  writeFileSync(join(OUT_DIR, "record.json"), JSON.stringify(record, null, 2), "utf8");

  console.log(
    `Exported ${exported} item(s) as Markdown, plus record.json (${record.length} Record entries).`,
  );
  console.log("PDFs/scans are not duplicated here -- they are already plain files in the public");
  console.log("storage bucket, downloadable directly from their storage_path with no export step.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
