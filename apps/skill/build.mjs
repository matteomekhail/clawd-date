import { build, context } from "esbuild";
import { chmodSync, readFileSync, writeFileSync, existsSync } from "node:fs";

const watch = process.argv.includes("--watch");

/** @type {import('esbuild').BuildOptions} */
const config = {
  entryPoints: [
    "src/index.ts",
    "src/bin.ts",
    "src/commands/swipe.tsx",
    "src/commands/matches.tsx",
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
};

function fixupBin() {
  const path = "dist/bin.js";
  if (!existsSync(path)) return;
  const content = readFileSync(path, "utf8");
  if (!content.startsWith("#!")) {
    writeFileSync(path, `#!/usr/bin/env node\n${content}`);
  }
  chmodSync(path, 0o755);
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
