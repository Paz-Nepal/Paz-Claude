#!/usr/bin/env node
// Puts the built app where the Cloudflare Worker serves it from, so a deploy is
// one command and never an FTP upload:
//
//   pnpm site          # build, then write the pages
//   pnpm publish:app   # send the app's files to the `app` bucket
//
// Order matters and is built in: styles, scripts and fonts first, the shell
// (app.html) last. A page can therefore never name a file that is not there
// yet. Every file is fetched back and compared before the next step, and the
// shell is not sent if any of them is missing or different. Older hashed files
// are left in place, so a reader on a cached page keeps working.
//
// Pass --hold-shell to send everything except the shell (used the first time,
// before the Worker that serves these files is deployed).
//
// Uses the Supabase CLI you are already signed in with (`supabase login`), so
// no key is needed here. Usage: node scripts/publish-app.mjs [distDir]

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const args = process.argv.slice(2);
const HOLD_SHELL = args.includes("--hold-shell");
const DIST = args.find((a) => !a.startsWith("--")) ?? "apps/web/dist";
const REF = process.env.SUPABASE_PROJECT_REF ?? "eczmttndsbockxkklqoe";
const PUBLIC = `https://${REF}.supabase.co/storage/v1/object/public/app`;

if (!existsSync(join(DIST, "app.html"))) {
  console.error(`${DIST}/app.html not found: run pnpm site first.`);
  process.exit(1);
}

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) out.push(...walk(path));
    else out.push(path);
  }
  return out;
}

const key = (file) => relative(DIST, file).replaceAll("\\", "/");

const q = (v) => (process.platform === "win32" ? `"${v}"` : v);

function cli(args) {
  execFileSync("supabase", args, {
    stdio: ["ignore", "ignore", "ignore"],
    shell: process.platform === "win32",
  });
}

async function send(file, cache) {
  const target = q(`ss:///app/${key(file)}`);
  // The storage gateway sits behind a firewall that now and then refuses a burst
  // of uploads, so each file is tried a few times, a few seconds apart.
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      cli(["storage", "cp", q(file), target, "--linked", "--experimental", "--cache-control", q(cache)]);
      return;
    } catch {
      // A file of the same name with different contents (a font, robots.txt)
      // has to go first; copying does not overwrite.
      try {
        cli(["storage", "rm", target, "--linked", "--experimental"]);
      } catch {
        // Nothing there to remove.
      }
      await new Promise((r) => setTimeout(r, 3000 * attempt));
    }
  }
  throw new Error(`could not send ${key(file)}`);
}

async function sameOnline(file) {
  const res = await fetch(`${PUBLIC}/${encodeURI(key(file))}`, { cache: "no-store" });
  if (!res.ok) return false;
  return Buffer.compare(Buffer.from(await res.arrayBuffer()), readFileSync(file)) === 0;
}

const assets = walk(join(DIST, "assets"));
const fonts = existsSync(join(DIST, "fonts")) ? walk(join(DIST, "fonts")) : [];
const loose = ["robots.txt", "mark.svg"].map((n) => join(DIST, n)).filter(existsSync);

const steps = [
  ["scripts and styles", assets, "public, max-age=31536000, immutable"],
  ["fonts", fonts, "public, max-age=2592000"],
  ["other files", loose, "public, max-age=300"],
];

let sent = 0;
for (const [label, files, cache] of steps) {
  for (const file of files) {
    if (await sameOnline(file)) continue;
    await send(file, cache);
    sent++;
    if (!(await sameOnline(file))) {
      console.error(`${key(file)} did not arrive intact. Stopped before the shell: nothing has changed for readers.`);
      process.exit(1);
    }
  }
  console.log(`${label}: ${files.length} file(s) in place`);
}

if (HOLD_SHELL) {
  console.log(`Sent ${sent} file(s). app.html held back: nothing has changed for readers.`);
  process.exit(0);
}
const shell = join(DIST, "app.html");
if (!(await sameOnline(shell))) {
  await send(shell, "public, max-age=0, must-revalidate");
  if (!(await sameOnline(shell))) {
    console.error("app.html did not arrive intact.");
    process.exit(1);
  }
}
console.log(`app.html: in place. Sent ${sent + 1} file(s). The pages are rewritten against it within about a minute.`);
