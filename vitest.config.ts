import { defineConfig } from "vitest/config";

// `convex-test` runs Convex functions inside an edge-runtime VM so the
// in-memory db + scheduler match the real backend's runtime semantics.
// Pure-Node tests (scripts/lib) override this per-file via `// @vitest-environment node`.
export default defineConfig({
  // Mirrors esbuild's `define` in apps/skill/build.mjs so test runs of
  // skill source (which references the baked __*_API_URL__ globals at
  // module scope) don't blow up with ReferenceError.
  define: {
    __PROD_API_URL__: JSON.stringify("https://test-prod.example/site"),
    __DEV_API_URL__: JSON.stringify("https://test-dev.example/site"),
  },
  test: {
    environment: "edge-runtime",
    server: { deps: { inline: ["convex-test"] } },
    setupFiles: ["./vitest.setup.ts"],
    include: ["test/**/*.test.{ts,tsx,mjs}"],
  },
});
