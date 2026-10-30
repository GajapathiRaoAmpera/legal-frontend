import { fileURLToPath, URL } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const target = process.env.API_PROXY_TARGET ?? "http://localhost:8000";

export default defineConfig(({ mode }) => ({
  plugins: [react(), tailwindcss()],
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  // the MSW service worker is only served in `pnpm dev:mock`, never shipped in dist/
  publicDir: mode === "mock" ? "mock-public" : "public",
  server: {
    port: 5173,
    proxy:
      mode === "mock"
        ? undefined
        : {
            "/api": { target, changeOrigin: true },
            "/openapi.json": { target, changeOrigin: true },
            "/healthz": { target, changeOrigin: true },
          },
  },
  build: { manifest: true, sourcemap: false, target: "es2022" },
}));
