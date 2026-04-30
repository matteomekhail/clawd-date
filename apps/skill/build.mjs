import { build, context } from "esbuild";
import { chmodSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { parseEnvFile } from "../../scripts/lib/env.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "..", "..");

const watch = process.argv.includes("--watch");

// URLs are baked into the bundle via esbuild `define`. Source is process.env
// (so CI / publish workflows can inject overrides), with .env.local from the
// repo root as a fallback for local dev. Hardcoded fallbacks ensure a fresh
// checkout still builds — `pnpm publish:skill` enforces that the prod URL is
// actually set, so it can't ship a bogus value.
const FALLBACK_PROD = "https://cautious-dachshund-642.convex.site";
const FALLBACK_DEV = "https://impartial-dinosaur-5.convex.site";

const envLocal = parseEnvFile(join(repoRoot, ".env.local"));
const PROD_URL =
  process.env.CLAWD_PROD_API_URL || envLocal.CLAWD_PROD_API_URL || FALLBACK_PROD;
const DEV_URL =
  process.env.CLAWD_DEV_API_URL || envLocal.CLAWD_DEV_API_URL || FALLBACK_DEV;

/** @type {import('esbuild').BuildOptions} */
const config = {
  entryPoints: [
    "src/index.ts",
    "src/bin.ts",
    "src/bin-dev.ts",
    "src/commands/swipe.tsx",
    "src/commands/matches.tsx",
    "src/commands/profile.tsx",
  ],
  bundle: true,
  splitting: true,
  platform: "node",
  format: "esm",
  target: "node20",
  outdir: "dist",
  sourcemap: true,
  logLevel: "info",
  packages: "external",
  jsx: "automatic",
  define: {
    __PROD_API_URL__: JSON.stringify(PROD_URL),
    __DEV_API_URL__: JSON.stringify(DEV_URL),
  },
};

function fixupBin() {
  for (const path of ["dist/bin.js", "dist/bin-dev.js"]) {
    if (!existsSync(path)) continue;
    const content = readFileSync(path, "utf8");
    if (!content.startsWith("#!")) {
      writeFileSync(path, `#!/usr/bin/env node\n${content}`);
    }
    chmodSync(path, 0o755);
  }
}

if (watch) {
  const ctx = await context({
    ...config,
    plugins: [
      {
        name: "fixup-bin",
        setup(b) {
          b.onEnd(() => fixupBin());
        },
      },
    ],
  });
  await ctx.watch();
} else {
  await build(config);
  fixupBin();
}
