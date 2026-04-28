import { build, context } from "esbuild";

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
  { entryPoints: ["src/index.ts"], outExtension: { ".js": ".js" } },
  {
    entryPoints: ["src/bin.ts"],
    outExtension: { ".js": ".js" },
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
}
