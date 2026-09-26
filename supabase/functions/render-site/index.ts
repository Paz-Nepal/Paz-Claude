// Writes the public site's static pages into the `site` bucket whenever staff
// publish, so the CMS goes live with no build and no upload. A Cloudflare
// Worker serves what this writes (see cloudflare/ and
// docs/runbooks/publish-instantly.md).
//
// Called by pg_cron every thirty seconds (migration 0090) and does nothing
// unless the database says the site changed, the app was redeployed, or the
// last attempt failed. Authenticated by a shared secret the database made for
// itself, not by a JWT, so a stranger cannot make the site re-render.
//
// The rendering is the same code the build uses (_shared/render-site.mjs), so
// the pages here and the pages in dist/ can never say different things.
import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";
import NepaliDateModule from "npm:nepali-date-converter@3.4.0";
import wording from "../_shared/wording.json" with { type: "json" };
import { renderSite } from "../_shared/render-site.mjs";

const BUCKET = "site";

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function contentTypeFor(path: string): string {
  if (path.endsWith(".html")) return "text/html; charset=utf-8";
  if (path.endsWith("sitemap.xml")) return "application/xml; charset=utf-8";
  if (path.endsWith(".xml")) return "application/rss+xml; charset=utf-8";
  return "text/plain; charset=utf-8";
}

async function sha256(text: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Every object path under a prefix, following folders. */
async function listAll(client: SupabaseClient, prefix = ""): Promise<string[]> {
  const out: string[] = [];
  const { data, error } = await client.storage.from(BUCKET).list(prefix, { limit: 1000 });
  if (error) throw new Error(`list ${prefix}: ${error.message}`);
  for (const entry of data ?? []) {
    const path = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.id === null) out.push(...(await listAll(client, path)));
    else out.push(path);
  }
  return out;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const service = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const api = service.schema("api");

  const { data: secret } = await api.rpc("site_render_secret");
  if (!secret || req.headers.get("x-render-secret") !== secret) {
    return json({ error: "Not allowed" }, 403);
  }

  const siteUrl = (Deno.env.get("SITE_URL") ?? "https://paz.com.np").replace(/\/$/, "");
  const shellRes = await fetch(`${siteUrl}/app.html`, { headers: { "Cache-Control": "no-cache" } });
  if (!shellRes.ok) return json({ error: `app shell unavailable (${shellRes.status})` }, 502);
  const baseHtml = await shellRes.text();
  const shellHash = await sha256(baseHtml);

  const { data: go, error: beginError } = await api.rpc("site_render_begin", {
    p_shell_hash: shellHash,
  });
  if (beginError) return json({ error: beginError.message }, 500);
  if (!go) return json({ skipped: true });

  try {
    const files = new Map<string, string>();
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const nepali = NepaliDateModule as unknown as {
      default?: { default?: unknown } | unknown;
    };
    const NepaliDate =
      (nepali.default as { default?: unknown } | undefined)?.default ?? nepali.default ?? nepali;

    const result = await renderSite({
      supabaseUrl,
      anonKey,
      siteUrl,
      wording,
      baseHtml,
      NepaliDate,
      emit: (path: string, content: string) => files.set(path, content),
    });

    // Write everything, eight at a time.
    const entries = [...files.entries()];
    for (let i = 0; i < entries.length; i += 8) {
      await Promise.all(
        entries.slice(i, i + 8).map(async ([path, content]) => {
          const { error } = await service.storage.from(BUCKET).upload(path, content, {
            contentType: contentTypeFor(path),
            upsert: true,
            cacheControl: "30",
          });
          if (error) throw new Error(`upload ${path}: ${error.message}`);
        }),
      );
    }

    // A page that is no longer published disappears from the bucket too.
    const stale = (await listAll(service)).filter((path) => !files.has(path));
    for (let i = 0; i < stale.length; i += 100) {
      const { error } = await service.storage.from(BUCKET).remove(stale.slice(i, i + 100));
      if (error) throw new Error(`remove: ${error.message}`);
    }

    await api.rpc("site_render_finish", {
      p_ok: true,
      p_message: `${result.written} pages, ${files.size} files, ${stale.length} removed`,
      p_files: files.size,
      p_shell_hash: shellHash,
    });
    return json({ ok: true, pages: result.written, files: files.size, removed: stale.length });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("render-site failed:", message);
    await api.rpc("site_render_finish", {
      p_ok: false,
      p_message: message,
      p_files: 0,
      p_shell_hash: shellHash,
    });
    return json({ error: message }, 500);
  }
});
