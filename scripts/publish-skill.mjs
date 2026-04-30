#!/usr/bin/env node
// Publish `clawd-date` to npm with dev artifacts stripped.
//
// Steps:
//   1. Refuse to run unless CLAWD_PROD_API_URL is set (env or .env.local).
//   2. Build the CLI (URLs baked in via esbuild `define`).
//   3. Snapshot apps/skill/package.json, then strip the `clawd-date-dev`
//      bin entry so the published manifest never lists it.
//   4. Delete dist/bin-dev.js + .map so the tarball never contains them.
//   5. Run `pnpm --filter clawd-date publish` (forwards extra args).
//   6. Always restore the manifest + rebuild dist on exit, even on failure.

import { spawnSync } from "node:child_process";
import {
  existsSync,
  readFileSync,
  readdirSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseEnvFile } from "./lib/env.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "..");
const skillDir = join(repoRoot, "apps", "skill");
const pkgPath = join(skillDir, "package.json");
const distDir = join(skillDir, "dist");

function collectJsFiles(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    const stat = statSync(p);
    if (stat.isDirectory()) out.push(...collectJsFiles(p));
    else if (entry.endsWith(".js")) out.push(p);
  }
  return out;
}

const envLocal = parseEnvFile(join(repoRoot, ".env.local"));
const prodUrl =
  process.env.CLAWD_PROD_API_URL || envLocal.CLAWD_PROD_API_URL || "";
const devUrl =
  process.env.CLAWD_DEV_API_URL || envLocal.CLAWD_DEV_API_URL || "";

if (!prodUrl) {
  process.stderr.write(
    "\nRefusing to publish: CLAWD_PROD_API_URL is not set " +
      "(checked env and .env.local).\n" +
      "Set it before running `pnpm publish:skill`.\n\n",
  );
  process.exit(1);
}
// Compare against the *current* dev URL rather than a hardcoded slug —
// rotating the dev deployment must not silently disable this guard.
// `===` is enough: full Convex URLs are unambiguous, and `includes()`
// would only invent false positives.
if (devUrl && prodUrl === devUrl) {
  process.stderr.write(
    "\nRefusing to publish: CLAWD_PROD_API_URL points at the dev " +
      `deployment (${prodUrl}).\n\n`,
  );
  process.exit(1);
}

// Force the build to use this prod URL regardless of any local override.
process.env.CLAWD_PROD_API_URL = prodUrl;

console.log(`Publishing clawd-date with prod backend ${prodUrl}\n`);

console.log("→ Building (URLs baked in)…");
const build = spawnSync("pnpm", ["--filter", "clawd-date", "build"], {
  cwd: repoRoot,
  stdio: "inherit",
});
if (build.status !== 0) process.exit(build.status ?? 1);

const originalManifest = readFileSync(pkgPath, "utf8");
let success = false;

const removedFiles = [];
function removeIfExists(path) {
  if (existsSync(path)) {
    unlinkSync(path);
    removedFiles.push(path);
  }
}

try {
  // Strip the dev bin entry from the manifest that will end up in the
  // tarball. (npm reads package.json at pack time.)
  const manifest = JSON.parse(originalManifest);
  if (manifest.bin && manifest.bin["clawd-date-dev"]) {
    delete manifest.bin["clawd-date-dev"];
    writeFileSync(pkgPath, `${JSON.stringify(manifest, null, 2)}\n`);
    console.log("→ Stripped `clawd-date-dev` from package.json bin");
  }

  removeIfExists(join(distDir, "bin-dev.js"));
  removeIfExists(join(distDir, "bin-dev.js.map"));
  if (removedFiles.length) {
    console.log(`→ Removed dev artifacts: ${removedFiles.join(", ")}`);
  }

  // Sanity check: walk every JS file in dist/ and confirm
  //   (a) the dev URL never appears anywhere (esbuild splitting can land
  //       defines in chunk-*.js, not just the entrypoints), and
  //   (b) the prod URL we expect is actually baked into bin.js — guards
  //       against a stale env shadowing the build's CLAWD_PROD_API_URL.
  const allJs = collectJsFiles(distDir);

  if (devUrl) {
    for (const f of allJs) {
      if (readFileSync(f, "utf8").includes(devUrl)) {
        throw new Error(`prod artifact ${f} contains dev URL ${devUrl}`);
      }
    }
  }

  const binPath = join(distDir, "bin.js");
  if (!existsSync(binPath) || !readFileSync(binPath, "utf8").includes(prodUrl)) {
    throw new Error(
      `dist/bin.js does not contain expected prod URL ${prodUrl} — build did not bake CLAWD_PROD_API_URL correctly`,
    );
  }

  const args = process.argv.slice(2);
  console.log("→ Running pnpm publish…");
  const publish = spawnSync(
    "pnpm",
    ["--filter", "clawd-date", "publish", ...args],
    { cwd: repoRoot, stdio: "inherit" },
  );
  if (publish.status !== 0) {
    throw new Error(`pnpm publish exited with status ${publish.status}`);
  }
  success = true;
} finally {
  // Restore manifest unconditionally.
  writeFileSync(pkgPath, originalManifest);
  // Rebuild so dev artifacts come back for local use. If this fails, dist
  // is left in a partially-stripped state — surface it loudly so the user
  // knows to re-run `pnpm --filter clawd-date build` before using the dev binary.
  const rebuild = spawnSync("pnpm", ["--filter", "clawd-date", "build"], {
    cwd: repoRoot,
    stdio: "inherit",
  });
  if (rebuild.status !== 0) {
    process.stderr.write(
      `\n⚠️  Post-publish rebuild failed (exit ${rebuild.status}).\n` +
        "   dist/ may be missing the dev artifacts. Run `pnpm --filter clawd-date build` to restore them.\n",
    );
    // Surface a nonzero exit so chained CI jobs notice — but only if publish
    // itself actually succeeded; otherwise we already exited via the throw.
    if (success) process.exitCode = 1;
  }
  console.log(success ? "\n✅ Published." : "\n❌ Publish aborted; restored.");
}
