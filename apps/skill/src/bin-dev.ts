// `clawd-date-dev` — same CLI as `clawd-date`, but pre-pointed at the dev
// Convex deployment with a separate config file so prod and dev installs
// can coexist on the same machine.

import { homedir } from "node:os";
import { join } from "node:path";

// Substituted at build time from CLAWD_DEV_API_URL (see build.mjs).
const DEV_API_URL = __DEV_API_URL__;
const DEV_CONFIG_PATH = join(
  homedir(),
  ".config",
  "clawd-date-dev",
  "config.json",
);

process.env.CLAWD_DATE_CONFIG_PATH ??= DEV_CONFIG_PATH;
process.env.CLAWD_MATCH_API_URL ??= DEV_API_URL;

// `init` writes hooks + statusline into ~/.claude/settings.json; `uninstall`
// removes them. Both target a global file shared with the prod install — the
// dev wrapper must not fight prod here. Force --no-settings on both unless
// the user explicitly opts in.
const SETTINGS_GUARDED = new Set(["init", "uninstall"]);
if (
  SETTINGS_GUARDED.has(process.argv[2] ?? "") &&
  !process.argv.includes("--no-settings")
) {
  process.argv.push("--no-settings");
}

await import("./bin.js");
