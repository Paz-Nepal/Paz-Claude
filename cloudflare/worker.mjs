// Serves the site's pages from what the render-site Edge Function writes, so a
// change published in the CMS is live within about a minute with no build and
// no upload. Everything else (the app's scripts, fonts, /admin, files) still
// comes from the web host, exactly as before. Runs on Cloudflare, which already
// sits in front of paz.com.np.
//
// A request is answered from the `site` bucket when there is a page for it;
// when there is not (a path only the app knows, or the bucket is unreachable)
// it falls straight through to the host, whose .htaccess serves the app shell.
// So the worst case is today's behaviour, never a broken site.

const HOST_ONLY = [
  /^\/assets\//,
  /^\/fonts\//,
  /^\/admin(\/|$)/,
  /^\/cdn-cgi\//,
  /^\/app\.html$/,
  /^\/robots\.txt$/,
  /^\/mark\.svg$/,
  /^\/favicon/,
  /^\/\.well-known\//,
];

/** The bucket key for a public path, or null when the host should answer. */
export function keyFor(pathname) {
  let path;
  try {
    path = decodeURIComponent(pathname);
  } catch {
    return null;
  }
  if (path.includes("..") || path.includes("\0")) return null;
  if (HOST_ONLY.some((re) => re.test(path))) return null;
  const trimmed = path.replace(/^\/+/, "");
  if (trimmed === "") return "index.html";
  if (trimmed.endsWith("/")) return `${trimmed}index.html`;
  const last = trimmed.split("/").pop();
  return last.includes(".") ? trimmed : `${trimmed}/index.html`;
}

const TYPES = {
  html: "text/html; charset=utf-8",
  xml: "application/xml; charset=utf-8",
  txt: "text/plain; charset=utf-8",
};

function contentType(key) {
  if (key.endsWith("/feed.xml")) return "application/rss+xml; charset=utf-8";
  return TYPES[key.split(".").pop()] ?? "text/plain; charset=utf-8";
}

// The same headers the host's .htaccess sets, since a page answered here never
// reaches the host to get them.
const SECURITY = {
  "Strict-Transport-Security": "max-age=31536000",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "SAMEORIGIN",
  "Referrer-Policy": "strict-origin-when-cross-origin",
};

export default {
  async fetch(request, env) {
    if (request.method !== "GET" && request.method !== "HEAD") return fetch(request);
    const key = keyFor(new URL(request.url).pathname);
    if (!key || !env.SITE_BUCKET_URL) return fetch(request);

    let stored;
    try {
      // Cloudflare keeps a copy for 30 seconds, so a burst of readers is one
      // request to storage, and a publish shows up within half a minute.
      stored = await fetch(`${env.SITE_BUCKET_URL}/${encodeURI(key)}`, {
        cf: { cacheTtl: 30, cacheEverything: true },
      });
    } catch {
      return fetch(request);
    }
    if (!stored.ok) return fetch(request);

    return new Response(request.method === "HEAD" ? null : stored.body, {
      status: 200,
      headers: {
        "Content-Type": contentType(key),
        // Browsers ask again each visit; Cloudflare answers from its copy.
        "Cache-Control": "public, max-age=0, must-revalidate",
        "X-Paz-Render": "live",
        ...SECURITY,
      },
    });
  },
};
