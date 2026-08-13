#!/usr/bin/env node
/**
 * T-071: a build-time gate on the JS a first-time visitor's browser
 * actually has to download before the app can render anything —
 * apps/web/dist/index.html's own <script>/<link rel="modulepreload">
 * tags are the ground truth for that set, not every chunk Vite emits
 * (most chunks are route-level and only load when a person navigates
 * there, per apps/web/src/app/router.tsx's lazy imports).
 *
 * Budget is measured in gzip bytes (what actually crosses the network,
 * same basis Lighthouse's own "Total Byte Weight" uses), not raw bytes.
 *
 * T-071's original target was 150KB. Current eager JS is measured well
 * above that (see BUDGET_KB below) -- this script enforces the measured
 * baseline plus headroom so regressions are still caught today, rather
 * than either silently passing a budget that was never actually met or
 * hard-failing every build until a real bundle-reduction pass happens.
 * Lower BUDGET_KB as that work lands; see docs/adr/027 sibling gap notes
 * for T-071's still-open Lighthouse/LCP half (not implemented here --
 * that needs an actual Lighthouse run against a served build, which this
 * script deliberately doesn't attempt to fake).
 */
import { readFileSync } from "node:fs";
import { gzipSync } from "node:zlib";
import path from "node:path";

const DIST_DIR = "apps/web/dist";
const BUDGET_KB = 200;

const html = readFileSync(path.join(DIST_DIR, "index.html"), "utf8");

const scriptSrcs = [...html.matchAll(/<script[^>]+src="([^"]+\.js)"/g)].map((m) => m[1]);
const preloadHrefs = [...html.matchAll(/<link rel="modulepreload"[^>]+href="([^"]+\.js)"/g)].map(
  (m) => m[1],
);
const eagerPaths = [...new Set([...scriptSrcs, ...preloadHrefs])];

if (eagerPaths.length === 0) {
  console.error(`No eager <script>/modulepreload JS found in ${DIST_DIR}/index.html.`);
  process.exit(1);
}

let totalGzipBytes = 0;
const rows = eagerPaths.map((assetPath) => {
  // assetPath is an absolute URL path ("/assets/foo.js"); dist/ is its root.
  const filePath = path.join(DIST_DIR, assetPath.replace(/^\//, ""));
  const gzipBytes = gzipSync(readFileSync(filePath)).length;
  totalGzipBytes += gzipBytes;
  return { file: path.basename(assetPath), gzipKB: (gzipBytes / 1024).toFixed(1) };
});

const totalKB = totalGzipBytes / 1024;

console.log("Eager JS (script + modulepreload), gzip:");
for (const row of rows) {
  console.log(`  ${row.file.padEnd(28)} ${row.gzipKB.padStart(7)} KB`);
}
console.log(
  `  ${"total".padEnd(28)} ${totalKB.toFixed(1).padStart(7)} KB  (budget: ${BUDGET_KB} KB)`,
);

if (totalKB > BUDGET_KB) {
  console.error(
    `\nEager JS budget exceeded: ${totalKB.toFixed(1)}KB > ${BUDGET_KB}KB. ` +
      `Check apps/web/vite.config.ts's manualChunks split, or whether something ` +
      `newly eager-imported (rather than lazy-loaded via React.lazy in router.tsx) ` +
      `pulled a large dependency into the initial bundle.`,
  );
  process.exit(1);
}

console.log("\nWithin budget.");
