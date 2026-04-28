import { existsSync, readFileSync, writeFileSync, mkdirSync, copyFileSync } from "node:fs";
import { homedir } from "node:os";
import { join, dirname } from "node:path";

export const CLAUDE_SETTINGS_PATH = join(homedir(), ".claude", "settings.json");
export const HOOK_MARKER = "clawd-match";

interface HookEntry {
  type: "command";
  command: string;
}

interface HookGroup {
  matcher?: string;
  hooks: HookEntry[];
}

interface ClaudeSettings {
  hooks?: Record<string, HookGroup[]>;
  [key: string]: unknown;
}

function readSettings(path: string): ClaudeSettings {
  if (!existsSync(path)) return {};
  try {
    return JSON.parse(readFileSync(path, "utf8")) as ClaudeSettings;
  } catch (err) {
    throw new Error(
      `~/.claude/settings.json non è JSON valido. Sistemalo a mano o spostalo prima di rieseguire init.\n${err instanceof Error ? err.message : err}`,
    );
  }
}

function isClawdHook(entry: HookEntry): boolean {
  return entry.type === "command" && entry.command.includes(HOOK_MARKER);
}

function ensureGroup(
  settings: ClaudeSettings,
  event: string,
): { settings: ClaudeSettings; group: HookGroup } {
  if (!settings.hooks) settings.hooks = {};
  if (!settings.hooks[event]) settings.hooks[event] = [];
  let group = settings.hooks[event].find((g) => (g.matcher ?? "") === "");
  if (!group) {
    group = { matcher: "", hooks: [] };
    settings.hooks[event].push(group);
  }
  return { settings, group };
}

function upsertHook(group: HookGroup, command: string): boolean {
  const existing = group.hooks.find(
    (h) => h.type === "command" && h.command === command,
  );
  if (existing) return false;
  group.hooks = group.hooks.filter((h) => !isClawdHook(h));
  group.hooks.push({ type: "command", command });
  return true;
}

export interface InstallResult {
  added: string[];
  unchanged: string[];
  backup?: string;
}

export function installHooks(
  hooks: Array<{ event: string; command: string }>,
  path: string = CLAUDE_SETTINGS_PATH,
): InstallResult {
  const settings = readSettings(path);

  let backup: string | undefined;
  if (existsSync(path)) {
    backup = `${path}.backup-${Date.now()}`;
    copyFileSync(path, backup);
  }

  const added: string[] = [];
  const unchanged: string[] = [];

  for (const { event, command } of hooks) {
    const { group } = ensureGroup(settings, event);
    const wasAdded = upsertHook(group, command);
    if (wasAdded) added.push(event);
    else unchanged.push(event);
  }

  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(settings, null, 2)}\n`, "utf8");

  return { added, unchanged, backup };
}

export function uninstallHooks(path: string = CLAUDE_SETTINGS_PATH): number {
  const settings = readSettings(path);
  if (!settings.hooks) return 0;

  let removed = 0;
  for (const event of Object.keys(settings.hooks)) {
    for (const group of settings.hooks[event]!) {
      const before = group.hooks.length;
      group.hooks = group.hooks.filter((h) => !isClawdHook(h));
      removed += before - group.hooks.length;
    }
    settings.hooks[event] = settings.hooks[event]!.filter(
      (g) => g.hooks.length > 0,
    );
    if (settings.hooks[event]!.length === 0) delete settings.hooks[event];
  }

  writeFileSync(path, `${JSON.stringify(settings, null, 2)}\n`, "utf8");
  return removed;
}
