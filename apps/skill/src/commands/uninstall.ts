import { existsSync, readFileSync, unlinkSync, rmdirSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { uninstallAll } from "../lib/settings.js";
import { CONFIG_PATH } from "../lib/config.js";

const CACHE_PATH = join(
  homedir(),
  ".config",
  "clawd-date",
  "status-cache.json",
);

const LEGACY_CONFIG_DIR = join(homedir(), ".config", "clawd-match");

const LEGACY_SLASH_COMMAND_PATH = join(
  homedir(),
  ".claude",
  "commands",
  "clawd-date.md",
);
const LEGACY_SLASH_MARKER = "<!-- managed by clawd-match — safe to delete to uninstall -->";

function tryUnlink(path: string): boolean {
  if (!existsSync(path)) return false;
  unlinkSync(path);
  return true;
}

function tryRemoveEmptyDir(path: string): void {
  try {
    if (existsSync(path) && readdirSync(path).length === 0) {
      rmdirSync(path);
    }
  } catch {
    // ignore
  }
}

function purgeDir(path: string): void {
  if (!existsSync(path)) return;
  for (const entry of readdirSync(path)) tryUnlink(join(path, entry));
  tryRemoveEmptyDir(path);
}

export async function runUninstall(): Promise<void> {
  console.log("clawd-date uninstall\n");

  const settingsResult = uninstallAll();
  if (settingsResult.hooks > 0) {
    console.log(`✅ Removed ${settingsResult.hooks} hook(s) from ~/.claude/settings.json`);
  } else {
    console.log("ℹ️  No clawd-date hooks found in ~/.claude/settings.json");
  }
  if (settingsResult.statusLine) {
    console.log("✅ Removed statusline");
  } else {
    console.log("ℹ️  No clawd-date statusline to remove");
  }

  if (existsSync(LEGACY_SLASH_COMMAND_PATH)) {
    const contents = readFileSync(LEGACY_SLASH_COMMAND_PATH, "utf8");
    if (contents.includes(LEGACY_SLASH_MARKER)) {
      unlinkSync(LEGACY_SLASH_COMMAND_PATH);
      console.log(`✅ Removed legacy slash command (${LEGACY_SLASH_COMMAND_PATH})`);
    } else {
      console.log(
        `⚠️  ${LEGACY_SLASH_COMMAND_PATH} exists but is user-owned — leaving it alone`,
      );
    }
  }

  if (tryUnlink(CONFIG_PATH)) {
    console.log(`✅ Removed config (${CONFIG_PATH})`);
  } else {
    console.log("ℹ️  No config file to remove");
  }
  tryUnlink(CACHE_PATH);
  tryRemoveEmptyDir(dirname(CONFIG_PATH));

  if (existsSync(LEGACY_CONFIG_DIR)) {
    purgeDir(LEGACY_CONFIG_DIR);
    console.log(`✅ Removed legacy config dir (${LEGACY_CONFIG_DIR})`);
  }

  console.log("\nDone. Restart Claude Code for the hooks to drop out.");
  console.log("To remove the binary itself: `npm uninstall -g clawd-date` (or pnpm/yarn equivalent).");
}
