import { test } from "node:test";
import assert from "node:assert/strict";
import worker, { keyFor } from "./worker.mjs";

test("a public path maps to its page in the bucket", () => {
  assert.equal(keyFor("/"), "index.html");
  assert.equal(keyFor("/wall"), "wall/index.html");
  assert.equal(keyFor("/wall/"), "wall/index.html");
  assert.equal(keyFor("/house/rooms/the-hall"), "house/rooms/the-hall/index.html");
  assert.equal(keyFor("/ne/wall"), "ne/wall/index.html");
});

test("files keep their names", () => {
  assert.equal(keyFor("/sitemap.xml"), "sitemap.xml");
  assert.equal(keyFor("/papers/feed.xml"), "papers/feed.xml");
  assert.equal(keyFor("/record/PAZ-DEP-000001/text.txt"), "record/PAZ-DEP-000001/text.txt");
});

test("what the host owns is left to the host", () => {
  for (const p of ["/assets/index-abc.js", "/fonts/x.woff2", "/admin", "/admin/works", "/app.html", "/robots.txt", "/mark.svg"]) {
    assert.equal(keyFor(p), null, p);
  }
});

test("a path that tries to climb out is refused", () => {
  assert.equal(keyFor("/a/../secret"), null);
  assert.equal(keyFor("/%2e%2e/x"), null);
  assert.equal(keyFor("/%E0%A4%A"), null);
});

test("falls through to the host when the bucket has no page, so the worst case is today's site", async () => {
  const seen = [];
  globalThis.fetch = async (input) => {
    const url = typeof input === "string" ? input : input.url;
    seen.push(url);
    if (url.includes("/storage/")) return new Response("nope", { status: 404 });
    return new Response("from host", { status: 200 });
  };
  const res = await worker.fetch(new Request("https://paz.example/works/not-yet"), {
    SITE_BUCKET_URL: "https://x.supabase.co/storage/v1/object/public/site",
  });
  assert.equal(await res.text(), "from host");
  assert.ok(seen[0].endsWith("/works/not-yet/index.html"));
});

test("serves a stored page with the right type and the security headers", async () => {
  globalThis.fetch = async () => new Response("<h1>Wall</h1>", { status: 200 });
  const res = await worker.fetch(new Request("https://paz.example/wall"), {
    SITE_BUCKET_URL: "https://x.supabase.co/storage/v1/object/public/site",
  });
  assert.equal(res.headers.get("content-type"), "text/html; charset=utf-8");
  assert.equal(res.headers.get("x-content-type-options"), "nosniff");
  assert.equal(res.headers.get("x-paz-render"), "live");
  assert.equal(await res.text(), "<h1>Wall</h1>");
});

test("does nothing to a request that is not a read", async () => {
  globalThis.fetch = async () => new Response("host", { status: 200 });
  const res = await worker.fetch(new Request("https://paz.example/wall", { method: "POST" }), {
    SITE_BUCKET_URL: "x",
  });
  assert.equal(await res.text(), "host");
});
