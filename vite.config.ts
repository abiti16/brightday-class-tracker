// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  // Bolt hosting publishes static files, so build as an SPA instead of an SSR
  // server bundle. The client still talks to Supabase directly.
  nitro: false,
  tanstackStart: {
    spa: { enabled: true, maskPath: "/", prerender: { enabled: true, outputPath: "/index.html" } },
  },
  vite: {
    environments: {
      client: {
        build: { outDir: "dist" },
      },
    },
  },
});
