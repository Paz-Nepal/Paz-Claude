// The static renderer, run against an empty fixture (no network): it must
// write every public route, the sitemap and the feeds, be safe to run twice in
// one process (the Edge Function stays warm between renders), and refuse a
// shell that already holds a page.
import { assert, assertEquals, assertRejects } from "jsr:@std/assert@1";
import wording from "./wording.json" with { type: "json" };
import { renderSite } from "./render-site.mjs";

const SHELL =
  '<!doctype html><html lang="en"><head><title>x</title></head><body><div id="root"></div></body></html>';

// Only the shape the renderer calls: getDate, getMonth (zero based), getYear.
class FakeNepaliDate {
  getDate = () => 1;
  getMonth = () => 0;
  getYear = () => 2083;
}

function run(baseHtml = SHELL) {
  const files = new Map<string, string>();
  return renderSite({
    supabaseUrl: "http://fixture.invalid",
    anonKey: "fixture",
    siteUrl: "https://paz.example",
    wording,
    baseHtml,
    NepaliDate: FakeNepaliDate,
    fixture: { tables: {}, rpc: { site_info: { "site.name": "PAZ" } } },
    emit: (path: string, content: string) => files.set(path, content),
  }).then((result: { written: number }) => ({ files, result }));
}

Deno.test(
  "renders the public pages, the sitemap and the feeds from nothing but a fixture",
  async () => {
    const { files, result } = await run();
    assert(result.written > 40, `only ${result.written} pages written`);
    for (const path of [
      "index.html",
      "wall/index.html",
      "house/rooms/index.html",
      "record/catalogue/index.html",
      "verify/index.html",
      "sitemap.xml",
      "papers/feed.xml",
      "record/feed.xml",
    ]) {
      assert(files.has(path), `missing ${path}`);
    }
    assert(files.get("wall/index.html")!.includes("<h1>"), "the Wall page has no heading");
    assert(files.get("sitemap.xml")!.includes("https://paz.example/wall"), "sitemap misses /wall");
  },
);

Deno.test("is safe to run twice in one process: nothing carries over", async () => {
  const first = await run();
  const second = await run();
  assertEquals([...second.files.keys()].sort(), [...first.files.keys()].sort());
  assertEquals(second.result.written, first.result.written);
});

Deno.test("refuses a shell that already holds a prerendered page", async () => {
  await assertRejects(() => run(SHELL.replace('<div id="root"></div>', "<main>hi</main>")));
});
