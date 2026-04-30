#!/usr/bin/env node
// Install / uninstall the dev binary `clawd-date-dev` as a symlink in
// ~/.local/bin so it can be invoked from any directory, separately from the
// production `clawd-date` (which is normally installed via `npm install -g`).
//
// Usage:
//   node scripts/install-dev.mjs           # install
//   node scripts/install-dev.mjs --remove  # uninstall

import { spawnSync } from "node:child_process";
import {
  existsSync,
  lstatSync,
  mkdirSync,
  readlinkSync,
  symlinkSync,
  unlinkSync,
} from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "..");
const target = join(repoRoot, "apps", "skill", "dist", "bin-dev.js");
const linkDir = join(homedir(), ".local", "bin");
const linkPath = join(linkDir, "clawd-date-dev");

const remove = process.argv.includes("--remove") || process.argv.includes("-r");

function describeExisting() {
  if (!existsSync(linkPath)) return null;
  const stat = lstatSync(linkPath);
  if (stat.isSymbolicLink()) return { kind: "symlink", to: readlinkSync(linkPath) };
  return { kind: "file" };
}

if (remove) {
  const existing = describeExisting();
  if (!existing) {
    console.log(`Nothing to remove at ${linkPath}.`);
    process.exit(0);
  }
  if (existing.kind !== "symlink") {
    console.error(
      `Refusing to remove ${linkPath}: it's a real file, not a symlink. Delete it manually.`,
    );
    process.exit(1);
  }
  unlinkSync(linkPath);
  console.log(`✅ Removed ${linkPath}`);
  process.exit(0);
}

if (!existsSync(target)) {
  console.log("→ dist/bin-dev.js missing — building first…");
  const build = spawnSync("pnpm", ["--filter", "clawd-date", "build"], {
    cwd: repoRoot,
    stdio: "inherit",
  });
  if (build.status !== 0) process.exit(build.status ?? 1);
}

mkdirSync(linkDir, { recursive: true });

const existing = describeExisting();
if (existing) {
  if (existing.kind === "symlink" && existing.to === target) {
    console.log(`Already linked: ${linkPath} → ${target}`);
  } else if (existing.kind === "symlink") {
    unlinkSync(linkPath);
    symlinkSync(target, linkPath);
    console.log(`Replaced existing symlink: ${linkPath} → ${target}`);
  } else {
    console.error(
      `Refusing to overwrite ${linkPath}: it's a real file, not a symlink. Move it aside and rerun.`,
    );
    process.exit(1);
  }
} else {
  symlinkSync(target, linkPath);
  console.log(`✅ Linked ${linkPath} → ${target}`);
}

// Unix PATH separator. The repo only targets macOS/Linux (engines.node + the
// ~/.local/bin convention below would not work on Windows anyway).
const onPath = (process.env.PATH ?? "")
  .split(":")
  .some((p) => p === linkDir);
if (!onPath) {
  console.warn(
    `\n⚠️  ${linkDir} is not in your PATH.\n` +
      `   Add this to your shell profile (~/.zshrc) and reopen the terminal:\n\n` +
      `     export PATH="$HOME/.local/bin:$PATH"\n`,
  );
} else {
  console.log("\nDone. Run `clawd-date-dev` from anywhere.");
}
