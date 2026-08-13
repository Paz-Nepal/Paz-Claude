#!/usr/bin/env node
/**
 * T-035: axe-core accessibility check against the built component
 * workshop. Run `pnpm ladle build` first — this script serves the
 * static build (`ladle preview`) and, for every story in `build/meta.json`,
 * loads it in isolation (`?story=<id>&mode=preview`, Ladle's own
 * single-story preview mode — the same one a browser hits when a story's
 * "open in new tab" link is used) and runs axe against it.
 */
import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";

const PORT = 4173;
const BASE_URL = `http://127.0.0.1:${PORT}`;

function waitForServer(url, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  return new Promise((resolve, reject) => {
    const attempt = async () => {
      try {
        const res = await fetch(url);
        if (res.ok) return resolve();
      } catch {
        // not up yet
      }
      if (Date.now() > deadline) return reject(new Error(`Server at ${url} never came up`));
      setTimeout(attempt, 300);
    };
    void attempt();
  });
}

async function main() {
  const meta = JSON.parse(readFileSync("build/meta.json", "utf8"));
  const storyIds = Object.keys(meta.stories);
  if (storyIds.length === 0) {
    throw new Error("build/meta.json has no stories — did `pnpm ladle build` run first?");
  }

  const server = spawn(
    "pnpm",
    ["exec", "ladle", "preview", "--port", String(PORT)],
    { stdio: "ignore" },
  );

  let exitCode = 0;
  try {
    await waitForServer(BASE_URL, 30_000);

    // This sandbox's pre-installed Chromium revision doesn't always match
    // whatever revision the installed `playwright` version expects by
    // default, so it's launched by explicit path rather than relying on
    // Playwright's own download-cache resolution (CI images should have
    // a version-matched browser and won't need this override, but it's
    // harmless there too — the path either exists or Playwright falls
    // back to its normal resolution).
    const executablePath = existsSync("/opt/pw-browsers/chromium")
      ? "/opt/pw-browsers/chromium"
      : undefined;
    const browser = await chromium.launch({ executablePath });
    const context = await browser.newContext();
    const page = await context.newPage();

    for (const id of storyIds) {
      await page.goto(`${BASE_URL}/?story=${id}&mode=preview`, { waitUntil: "load" });
      // Ladle renders the story client-side after the JS bundle loads;
      // "load" alone can fire before that commit, and "networkidle" (tried
      // first) hangs indefinitely — Ladle's dev/preview client keeps a
      // connection open. Ladle itself sets data-storyloaded on <html> once
      // the story has actually rendered (found by inspecting its DOM), so
      // wait on that instead of a network-quiescence heuristic.
      await page.waitForSelector("html[data-storyloaded]", { timeout: 10_000 });
      const results = await new AxeBuilder({ page }).analyze();

      if (results.violations.length > 0) {
        exitCode = 1;
        console.error(`\n✗ ${id} (${meta.stories[id].filePath})`);
        for (const v of results.violations) {
          console.error(`  [${v.impact}] ${v.id}: ${v.help} (${v.nodes.length} node(s))`);
          console.error(`    ${v.helpUrl}`);
        }
      } else {
        console.log(`✓ ${id}`);
      }
    }

    await browser.close();
  } finally {
    server.kill();
  }

  if (exitCode !== 0) {
    console.error("\nAccessibility violations found — see above.");
  } else {
    console.log("\nNo accessibility violations found.");
  }
  process.exit(exitCode);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
