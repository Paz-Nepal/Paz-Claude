import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

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
export default defineConfig({
  plugins: [react()],
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
