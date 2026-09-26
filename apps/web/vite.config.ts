import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { existsSync } from "node:fs";
import { wordingDefaults } from "./wording-plugin";

// See Frontend Implementation Review §5.5: the admin route tree is lazy
// loaded (app/router.tsx), so route-level code-splitting keeps the public
// *route* code small. That's separate from the vendor manualChunks split
// below: without it, react/react-dom/react-router/@tanstack/react-query/
// @supabase/supabase-js all land in one ~500KB "index" file, which is (a)
// a single blob that never benefits from long-term browser caching across
// app-code deploys, and (b) exactly the shape — one large dense minified
// file — that tripped a host's automated content/malware scanner in
// production (Hostinger silently 404'd it; a trivial small .js file in
// the same folder served fine). Splitting vendor code into its own
// per-library chunks avoids both problems without changing total bytes
// shipped.
// The mark is one file. While it does not exist, every slot for it is
// absent (Build Programme 15): the components read this flag, and the tab
// icon is only linked when the file is there.
const markPresent = existsSync(path.resolve(__dirname, "public/mark.svg"));

export default defineConfig({
  define: { __MARK__: JSON.stringify(markPresent) },
  plugins: [
    react(),
    wordingDefaults(),
    {
      name: "paz-mark-favicon",
      transformIndexHtml(html) {
        return markPresent
          ? html.replace(
              "</head>",
              `  <link rel="icon" type="image/svg+xml" href="/mark.svg" />
  </head>`,
            )
          : html;
      },
    },
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 3000,
  },
  build: {
    target: "es2022",
    rollupOptions: {
      output: {
        manualChunks: {
          "vendor-react": ["react", "react-dom", "react-router-dom"],
          "vendor-query": ["@tanstack/react-query"],
          "vendor-supabase": ["@supabase/supabase-js"],
        },
      },
    },
  },
});
