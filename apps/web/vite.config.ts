import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

// See Frontend Implementation Review §5.5: the admin route tree is lazy
// loaded (app/router.tsx), so no manual chunk config is needed here to
// keep the public bundle small — code-splitting happens at the route level.
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
  },
});
