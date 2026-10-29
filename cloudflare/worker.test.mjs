import { test } from "node:test";
import assert from "node:assert/strict";
import worker, { appKeyFor, isAppRoute, keyFor } from "./worker.mjs";

const ENV = {
  SITE_BUCKET_URL: "https://x.supabase.co/storage/v1/object/public/site",
  APP_BUCKET_URL: "https://x.supabase.co/storage/v1/object/public/app",
};

/** A fake world: which bucket keys exist, and what the host says. */
function world(files) {
  const seen = [];
  globalThis.fetch = async (input) => {
    const url = typeof input === "string" ? input : input.url;
    seen.push(url);
    for (const [prefix, key] of [
      [ENV.SITE_BUCKET_URL + "/", "site"],
      [ENV.APP_BUCKET_URL + "/", "app"],
    ]) {
      if (url.startsWith(prefix)) {
        const name = decodeURI(url.slice(prefix.length));
        return files[`${key}:${name}`] !== undefined
          ? new Response(files[`${key}:${name}`], { status: 200 })
          : new Response("none", { status: 404 });
      }
    }
    return new Response("from host", { status: 200 });
  };
  return seen;
}

const get = (path, init) => worker.fetch(new Request(`https://paz.example${path}`, init), ENV);

test("a public path maps to its page in the site bucket", () => {
  assert.equal(keyFor("/"), "index.html");
  assert.equal(keyFor("/wall"), "wall/index.html");
  assert.equal(keyFor("/wall/"), "wall/index.html");
  assert.equal(keyFor("/ne/wall"), "ne/wall/index.html");
  assert.equal(keyFor("/sitemap.xml"), "sitemap.xml");
  assert.equal(keyFor("/record/PAZ-DEP-000001/text.txt"), "record/PAZ-DEP-000001/text.txt");
});

test("the app's files map to the app bucket, never to a page", () => {
  assert.equal(appKeyFor("/assets/index-abc.js"), "assets/index-abc.js");
  assert.equal(appKeyFor("/fonts/x.woff2"), "fonts/x.woff2");
  assert.equal(appKeyFor("/app.html"), "app.html");
  assert.equal(appKeyFor("/wall"), null);
  assert.equal(keyFor("/assets/index-abc.js"), null);
  assert.equal(keyFor("/admin/works"), null);
});

test("Cloudflare's and the host's own paths are never ours", () => {
  for (const p of ["/cdn-cgi/trace", "/.well-known/acme-challenge/x"]) {
    assert.equal(keyFor(p), null, p);
    assert.equal(appKeyFor(p), null, p);
    assert.equal(isAppRoute(p), false, p);
  }
});

test("only extensionless addresses are the router's", () => {
  assert.equal(isAppRoute("/admin"), true);
  assert.equal(isAppRoute("/works/a-new-work"), true);
  assert.equal(isAppRoute("/nothing.png"), false);
});

test("a path that tries to climb out is refused", () => {
  for (const p of ["/a/../secret", "/%2e%2e/x", "/%E0%A4%A"]) {
    assert.equal(keyFor(p), null, p);
    assert.equal(appKeyFor(p), null, p);
  }
});

test("a stored page is served with its type and the security headers", async () => {
  world({ "site:wall/index.html": "<h1>Wall</h1>" });
  const res = await get("/wall");
  assert.equal(res.headers.get("content-type"), "text/html; charset=utf-8");
  assert.equal(res.headers.get("x-content-type-options"), "nosniff");
  assert.equal(res.headers.get("x-paz-render"), "live");
  assert.equal(await res.text(), "<h1>Wall</h1>");
});

test("a hashed bundle comes from the app bucket and is kept for a year", async () => {
  world({ "app:assets/index-9Z11SeQ_.js": "console.log(1)" });
  const res = await get("/assets/index-9Z11SeQ_.js");
  assert.equal(res.headers.get("content-type"), "text/javascript; charset=utf-8");
  assert.match(res.headers.get("cache-control"), /max-age=31536000, immutable/);
  assert.equal(res.headers.get("x-paz-app"), "live");
});

test("an app file the bucket lacks falls through to the host", async () => {
  const seen = world({});
  const res = await get("/assets/old-abcdefgh.js");
  assert.equal(await res.text(), "from host");
  assert.ok(seen.at(-1).startsWith("https://paz.example"));
});

test("a route only the app knows gets the shell, not a 404", async () => {
  world({ "app:app.html": "<div id=root></div>" });
  for (const p of ["/admin", "/works/a-new-work"]) {
    const res = await get(p);
    assert.equal(res.status, 200, p);
    assert.equal(res.headers.get("x-paz-app"), "shell", p);
    assert.equal(await res.text(), "<div id=root></div>", p);
  }
});

test("a missing file with an extension goes to the host so a real 404 stays a 404", async () => {
  world({ "app:app.html": "shell" });
  const res = await get("/missing.png");
  assert.equal(await res.text(), "from host");
});

test("with the app bucket unset, nothing changes for the app's files", async () => {
  world({ "site:wall/index.html": "<h1>Wall</h1>" });
  const res = await worker.fetch(new Request("https://paz.example/assets/x-abcdefgh.js"), {
    SITE_BUCKET_URL: ENV.SITE_BUCKET_URL,
  });
  assert.equal(await res.text(), "from host");
});

test("does nothing to a request that is not a read", async () => {
  world({});
  const res = await get("/wall", { method: "POST" });
  assert.equal(await res.text(), "from host");
});
