#!/usr/bin/env node
// Checks a DEPLOYED site against what the build promises, so a host that
// behaves differently from Apache-as-assumed is caught the day it is
// uploaded, not by an outside audit. Run after uploading dist/:
//
//   node scripts/check-deployed.mjs https://paz.com.np
//
// It asserts, using only plain fetches (no cookies, no scripts):
//   * every sitemap URL answers 200 in place, with no redirect hop;
//   * each page's canonical link is the URL that was requested;
//   * a missing asset is a 404, not the app shell with a 200;
//   * the security headers are present and hashed bundles are cached for good;
//   * www redirects to the bare domain;
//   * no address on /contact has been rewritten into a placeholder.

const origin = (process.argv[2] ?? "").replace(/\/$/, "");
if (!/^https?:\/\//.test(origin)) {
  console.error("Usage: node scripts/check-deployed.mjs https://your-domain");
  process.exit(2);
}

const problems = [];
const fail = (msg) => problems.push(msg);
const get = (url, opts = {}) => fetch(url, { redirect: "manual", ...opts });

async function main() {
  const sitemap = await (await get(`${origin}/sitemap.xml`)).text();
  const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  if (urls.length === 0) fail("sitemap.xml lists no URLs");

  for (const listed of urls) {
    // Request the listed path on the origin under test (the sitemap may name
    // the production domain while a staging host is being checked).
    const path = new URL(listed).pathname;
    const url = `${origin}${path}`;
    const res = await get(url);
    if (res.status !== 200) {
      fail(
        `${path}: answered ${res.status}${res.headers.get("location") ? ` to ${res.headers.get("location")}` : ""}, expected 200 in place`,
      );
      continue;
    }
    const html = await res.text();
    const canonical = /<link rel="canonical" href="([^"]+)"/.exec(html)?.[1];
    if (canonical) {
      const canonPath = new URL(canonical).pathname;
      if (canonPath !== path) fail(`${path}: canonical points at ${canonPath}`);
    } else {
      fail(`${path}: no canonical link`);
    }
  }

  const missing = await get(`${origin}/assets/does-not-exist.js`);
  if (missing.status !== 404) fail(`a missing asset answered ${missing.status}, expected 404`);
  const mark = await get(`${origin}/mark.svg`);
  if (mark.status === 200 && (mark.headers.get("content-type") ?? "").includes("html")) {
    fail("/mark.svg answered 200 with HTML: the fallback is swallowing missing files");
  }

  const home = await get(`${origin}/`);
  const need = {
    "strict-transport-security": "HSTS",
    "x-content-type-options": "X-Content-Type-Options",
    "referrer-policy": "Referrer-Policy",
  };
  for (const [h, name] of Object.entries(need)) {
    if (!home.headers.get(h)) fail(`missing header: ${name}`);
  }
  const bundle = /\/assets\/[^"']+\.js/.exec(await home.text())?.[0];
  if (bundle) {
    const cc = (await get(`${origin}${bundle}`)).headers.get("cache-control") ?? "";
    if (!/max-age=31536000/.test(cc))
      fail(`hashed bundle cache-control is "${cc}", expected one year`);
  }

  const host = new URL(origin).hostname;
  if (!host.startsWith("www.")) {
    const www = await get(`${origin.replace(host, `www.${host}`)}/`);
    const to = www.headers.get("location") ?? "";
    if (![301, 308].includes(www.status) || !to.includes(host)) {
      fail(
        `www.${host} answered ${www.status} (${to || "no redirect"}), expected a redirect to the bare domain`,
      );
    }
  }

  const contact = await (await get(`${origin}/contact`)).text();
  if (/data-cfemail|\[email(&#160;|\s)?protected\]|email-decode/i.test(contact)) {
    fail("/contact carries Cloudflare's email obfuscation: switch off Email Address Obfuscation");
  }

  if (problems.length) {
    console.error(`${problems.length} problem(s):\n- ${problems.join("\n- ")}`);
    process.exit(1);
  }
  console.log(
    `${urls.length} sitemap URL(s) answer 200 in place with a true canonical; headers, 404s, www and email checks pass.`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
