#!/usr/bin/env node
/**
 * Fails (exit 1) if a permission key exists in supabase/seed/authz.sql but
 * not in docs/authz-matrix.md, or vice versa. Run in CI on every PR (see
 * .github/workflows/ci.yml, "authz matrix sync" step) so the two can never
 * silently drift — the doc is what a human auditing access reads; the seed
 * is what the database actually enforces, and they must describe the same
 * thing.
 */
import { readFileSync } from "node:fs";

const SEED_PATH = "supabase/seed/authz.sql";
const DOC_PATH = "docs/authz-matrix.md";

function extractSeedPermissionKeys(sql) {
  const match = sql.match(/insert into authz\.permissions \(key, description\) values([\s\S]*?);/);
  if (!match) {
    throw new Error(`Could not find an "insert into authz.permissions" block in ${SEED_PATH}`);
  }
  const keys = [...match[1].matchAll(/\('([a-z0-9_.]+)'/g)].map((m) => m[1]);
  if (keys.length === 0) {
    throw new Error(`Parsed zero permission keys from ${SEED_PATH} — check the regex against the current file shape.`);
  }
  return new Set(keys);
}

function extractDocPermissionKeys(markdown) {
  // Permission keys always follow domain.entity.action (at least one dot);
  // role keys (e.g. `super_admin`) do not, so the dot requirement is what
  // keeps this from matching the Roles table above the Permissions table.
  const keys = [...markdown.matchAll(/^\| `([a-z0-9_]+\.[a-z0-9_.]+)` \|/gm)].map((m) => m[1]);
  return new Set(keys);
}

const seedSql = readFileSync(SEED_PATH, "utf8");
const docMarkdown = readFileSync(DOC_PATH, "utf8");

const seedKeys = extractSeedPermissionKeys(seedSql);
const docKeys = extractDocPermissionKeys(docMarkdown);

const missingFromDoc = [...seedKeys].filter((k) => !docKeys.has(k));
const missingFromSeed = [...docKeys].filter((k) => !seedKeys.has(k));

if (missingFromDoc.length > 0 || missingFromSeed.length > 0) {
  console.error("authz matrix drift detected:\n");
  if (missingFromDoc.length > 0) {
    console.error(`  In ${SEED_PATH} but missing from ${DOC_PATH}:`);
    missingFromDoc.forEach((k) => console.error(`    - ${k}`));
  }
  if (missingFromSeed.length > 0) {
    console.error(`  In ${DOC_PATH} but missing from ${SEED_PATH}:`);
    missingFromSeed.forEach((k) => console.error(`    - ${k}`));
  }
  process.exit(1);
}

console.log(`authz matrix in sync: ${seedKeys.size} permission keys match in both files.`);
