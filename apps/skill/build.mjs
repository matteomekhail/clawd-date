import { build, context } from "esbuild";
import { chmodSync } from "node:fs";

const watch = process.argv.includes("--watch");

/** @type {import('esbuild').BuildOptions} */
const common = {
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node20",
  outdir: "dist",
  sourcemap: true,
  logLevel: "info",
  packages: "external",
};

const entries = [
  { entryPoints: ["src/index.ts"] },
  {
    entryPoints: ["src/bin.ts"],
    banner: { js: "#!/usr/bin/env node" },
  },
];

if (watch) {
  for (const e of entries) {
    const ctx = await context({ ...common, ...e });
    await ctx.watch();
  }
} else {
  for (const e of entries) {
    await build({ ...common, ...e });
  }
  try {
    chmodSync("dist/bin.js", 0o755);
  } catch {
    /* file may not exist yet */
  }
}
