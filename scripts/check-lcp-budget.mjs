#!/usr/bin/env node
/**
 * T-071's still-open half (see docs/perf/README.md and
 * scripts/check-bundle-budget.mjs, which only gate JS byte weight):
 * Largest Contentful Paint measured with a real headless Chromium
 * against a real served build, via the Performance API's own
 * PerformanceObserver -- the same primitive Lighthouse and CrUX use
 * under the hood. This deliberately doesn't run the full Lighthouse
 * pipeline (network throttling, TBT/CLS/etc.) -- LCP is the metric
 * T-071 actually named, and @playwright/test's chromium is already a
 * project devDependency (used for e2e), so this reuses it instead of
 * adding lighthouse + chrome-launcher for a second Chrome install path.
 *
 * Measured against `vite preview` (unthrottled localhost), so the
 * number is a floor, not a real-network estimate -- it still catches a
 * regression (a newly-eager hero image, a render-blocking font, a
 * bundle that got heavier) the same way the byte-budget script catches
 * bundle growth, on the same "measured baseline + headroom" logic.
 */
import { chromium } from "playwright-core";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WEB_DIR = path.join(__dirname, "..", "apps", "web");
const PORT = 4174;
// "localhost", not the literal 127.0.0.1 -- `vite preview` binds [::1]
// (IPv6) only by default, and an explicit IPv4 address will not resolve
// to it.
const URL = `http://localhost:${PORT}/`;
const BUDGET_MS = 2500; // Core Web Vitals' own "good" LCP threshold.

function waitForServer(url, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  return new Promise((resolve, reject) => {
    const attempt = () => {
      fetch(url)
        .then(() => resolve())
        .catch((err) => {
          if (Date.now() > deadline) reject(err);
          else setTimeout(attempt, 300);
        });
    };
    attempt();
  });
}

// Invoked as `node <vite bin>` directly (not `pnpm exec vite`, which on
// Windows spawns via a .cmd shell wrapper -- killing that wrapper process
// doesn't kill the real vite process underneath it, leaking a listener on
// PORT across runs).
const viteBin = path.join(WEB_DIR, "node_modules", "vite", "bin", "vite.js");
const preview = spawn(
  process.execPath,
  [viteBin, "preview", "--port", String(PORT), "--strictPort"],
  { cwd: WEB_DIR, stdio: "pipe" },
);
let previewOutput = "";
preview.stdout.on("data", (d) => (previewOutput += d));
preview.stderr.on("data", (d) => (previewOutput += d));

try {
  await waitForServer(URL, 30_000);

  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();

    // Registered before navigation so no LCP candidate is missed.
    await page.addInitScript(() => {
      window.__lcp = 0;
      new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const last = entries[entries.length - 1];
        if (last) window.__lcp = last.startTime;
      }).observe({ type: "largest-contentful-paint", buffered: true });
    });

    await page.goto(URL, { waitUntil: "load" });
    // LCP finalizes on first input or tab hide; idling gives the
    // observer time to fire without either of those signals.
    await page.waitForTimeout(2_000);
    const lcpMs = await page.evaluate(() => window.__lcp);

    console.log(`Largest Contentful Paint: ${lcpMs.toFixed(0)}ms  (budget: ${BUDGET_MS}ms)`);
    console.log(`  measured against: ${URL} (unthrottled localhost, vite preview)`);

    if (lcpMs === 0) {
      console.error("\nNo LCP entry was recorded -- the page may have rendered nothing.");
      process.exitCode = 1;
    } else if (lcpMs > BUDGET_MS) {
      console.error(
        `\nLCP budget exceeded: ${lcpMs.toFixed(0)}ms > ${BUDGET_MS}ms. ` +
          `Check for a newly-eager hero image or font, or a bundle-weight regression ` +
          `(see scripts/check-bundle-budget.mjs).`,
      );
      process.exitCode = 1;
    } else {
      console.log("\nWithin budget.");
    }
  } finally {
    await browser.close();
  }
} catch (err) {
  console.error("LCP check failed to run:", err.message);
  console.error(previewOutput);
  process.exitCode = 1;
} finally {
  preview.kill();
}
