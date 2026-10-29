// Serves the whole public site from Supabase storage, so that nothing a reader
// needs depends on a manual upload to the web host.
//
//   * The `site` bucket holds the pages, sitemap and feeds, written by the
//     render-site Edge Function whenever staff publish (a minute, no build).
//   * The `app` bucket holds the app itself (scripts, styles, fonts, the shell),
//     put there by `pnpm publish:app`, scripts and styles before the shell, so
//     a page can never name a file that is not there yet.
//
// Anything not found in either bucket goes straight to the web host, which
// still holds the last uploaded build as a fallback. So the worst case is the
// site as it was before this Worker, never a broken one. Runs on Cloudflare,
// which already sits in front of paz.com.np.

const APP_FILES = [
  /^\/assets\//,
  /^\/fonts\//,
  /^\/app\.html$/,
  /^\/robots\.txt$/,
  /^\/mark\.svg$/,
  /^\/favicon/,
];

// Never ours: Cloudflare's own paths and the host's.
const HOST_ONLY = [/^\/cdn-cgi\//, /^\/\.well-known\//];

// Paths the app owns outright; they are never a static page.
const APP_ROUTES = [/^\/admin(\/|$)/];

function clean(pathname) {
  let path;
  try {
    path = decodeURIComponent(pathname);
  } catch {
    return null;
  }
  if (path.includes("..") || path.includes("\0")) return null;
  return path;
}

/** The `app` bucket key for a file the app owns, or null. */
export function appKeyFor(pathname) {
  const path = clean(pathname);
  if (!path || HOST_ONLY.some((re) => re.test(path))) return null;
  return APP_FILES.some((re) => re.test(path)) ? path.replace(/^\/+/, "") : null;
}

/** The `site` bucket key for a public page or file, or null when the app owns the path. */
export function keyFor(pathname) {
  const path = clean(pathname);
  if (!path) return null;
  if (HOST_ONLY.some((re) => re.test(path)) || APP_ROUTES.some((re) => re.test(path))) return null;
  if (APP_FILES.some((re) => re.test(path))) return null;
  const trimmed = path.replace(/^\/+/, "");
  if (trimmed === "") return "index.html";
  if (trimmed.endsWith("/")) return `${trimmed}index.html`;
  const last = trimmed.split("/").pop();
  return last.includes(".") ? trimmed : `${trimmed}/index.html`;
}

/** An address the app's router answers (no file extension, not a static page). */
export function isAppRoute(pathname) {
  const path = clean(pathname);
  if (!path || HOST_ONLY.some((re) => re.test(path))) return false;
  return !path.split("/").pop().includes(".");
}

const TYPES = {
  html: "text/html; charset=utf-8",
  xml: "application/xml; charset=utf-8",
  txt: "text/plain; charset=utf-8",
  js: "text/javascript; charset=utf-8",
  mjs: "text/javascript; charset=utf-8",
  css: "text/css; charset=utf-8",
  map: "application/json; charset=utf-8",
  json: "application/json; charset=utf-8",
  svg: "image/svg+xml",
  ico: "image/x-icon",
  png: "image/png",
  webp: "image/webp",
  woff2: "font/woff2",
  woff: "font/woff",
};

function contentType(key) {
  if (key.endsWith("/feed.xml")) return "application/rss+xml; charset=utf-8";
  return TYPES[key.split(".").pop()] ?? "application/octet-stream";
}

// The same headers the host's .htaccess sets, since a response made here never
// reaches the host to get them.
const SECURITY = {
  "Strict-Transport-Security": "max-age=31536000",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "SAMEORIGIN",
  "Referrer-Policy": "strict-origin-when-cross-origin",
};

/** Hashed bundles never change under their name, so they are kept for good. */
function cacheFor(key) {
  if (/^assets\/.+-[A-Za-z0-9_-]{8}\.(js|css)$/.test(key)) return "public, max-age=31536000, immutable";
  if (key.startsWith("fonts/")) return "public, max-age=2592000";
  return "public, max-age=0, must-revalidate";
}

async function fromBucket(base, key) {
  try {
    // Cloudflare keeps a copy for 30 seconds (a day for hashed files), so a
    // burst of readers is one request to storage.
    const hashed = key.startsWith("assets/") || key.startsWith("fonts/");
    return await fetch(`${base}/${encodeURI(key)}`, {
      cf: { cacheTtl: hashed ? 86400 : 30, cacheEverything: true },
    });
  } catch {
    return null;
  }
}

function respond(request, stored, key, extra = {}) {
  return new Response(request.method === "HEAD" ? null : stored.body, {
    status: 200,
    headers: {
      "Content-Type": contentType(key),
      "Cache-Control": cacheFor(key),
      "X-Paz-Render": "live",
      ...SECURITY,
      ...extra,
    },
  });
}

export default {
  async fetch(request, env) {
    if (request.method !== "GET" && request.method !== "HEAD") return fetch(request);
    if (!env.SITE_BUCKET_URL) return fetch(request);
    const { pathname } = new URL(request.url);

    // 1. The app's own files.
    const appKey = appKeyFor(pathname);
    if (appKey && env.APP_BUCKET_URL) {
      const stored = await fromBucket(env.APP_BUCKET_URL, appKey);
      if (stored?.ok) return respond(request, stored, appKey, { "X-Paz-App": "live" });
      return fetch(request);
    }

    // 2. A published page.
    const key = keyFor(pathname);
    if (key) {
      const stored = await fromBucket(env.SITE_BUCKET_URL, key);
      if (stored?.ok) return respond(request, stored, key);
    }

    // 3. Anything else the app's router answers (/admin, a work published a
    //    moment ago): the shell, which loads the page from the database.
    if (isAppRoute(pathname) && env.APP_BUCKET_URL) {
      const shell = await fromBucket(env.APP_BUCKET_URL, "app.html");
      if (shell?.ok) return respond(request, shell, "app.html", { "X-Paz-App": "shell" });
    }

    // 4. Not ours: the host decides (and answers a missing file with a 404).
    return fetch(request);
  },
};
