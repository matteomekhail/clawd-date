#!/usr/bin/env node
// Run the clawd-date CLI against the local dev Convex deployment.
// Usage: pnpm cli <command> [args...]
//
// Loads .env.local from the repo root, points the CLI at CONVEX_SITE_URL
// (the dev deployment's HTTP actions URL), and uses a repo-local config
// file so a globally-installed `clawd-date` is not affected.

import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseEnvFile } from "./lib/env.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "..");
const binPath = join(repoRoot, "apps", "skill", "dist", "bin.js");

if (!existsSync(binPath)) {
  process.stderr.write(
    `\nMissing build at ${binPath}\nRun \`pnpm build\` (or \`pnpm --filter clawd-date dev\`) first.\n\n`,
  );
  process.exit(1);
}

const env = { ...process.env };

// process.env wins over .env.local (matches dotenv default).
for (const [key, value] of Object.entries(parseEnvFile(join(repoRoot, ".env.local")))) {
  if (env[key] === undefined) env[key] = value;
}

const apiUrl =
  env.CLAWD_MATCH_API_URL ??
  env.CONVEX_SITE_URL ??
  (env.CONVEX_URL ? env.CONVEX_URL.replace(".convex.cloud", ".convex.site") : undefined);

if (!apiUrl) {
  process.stderr.write(
    "\nMissing CONVEX_SITE_URL (or CLAWD_MATCH_API_URL) in .env.local.\n\n",
  );
  process.exit(1);
}

env.CLAWD_MATCH_API_URL = apiUrl;
env.CLAWD_DATE_CONFIG_PATH ??= join(repoRoot, ".clawd-date-local", "config.json");

// In dev wrapper mode, never let `init` *write* hooks/statusline (would be
// bare `clawd-date <cmd>` strings, executed without our env, talking to
// prod) and never let `uninstall` *remove* them (would wipe the user's
// global prod install). Force --no-settings on both unless explicit.
const args = process.argv.slice(2);
const SETTINGS_GUARDED = new Set(["init", "uninstall"]);
if (SETTINGS_GUARDED.has(args[0]) && !args.includes("--no-settings")) {
  args.push("--no-settings");
}

const child = spawn(process.execPath, [binPath, ...args], {
  stdio: "inherit",
  env,
});
child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  else process.exit(code ?? 0);
});
