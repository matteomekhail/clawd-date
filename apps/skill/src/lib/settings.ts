import { existsSync, readFileSync, writeFileSync, mkdirSync, copyFileSync } from "node:fs";
import { homedir } from "node:os";
import { join, dirname } from "node:path";

export const CLAUDE_SETTINGS_PATH = join(homedir(), ".claude", "settings.json");
export const HOOK_MARKER = "clawd-date";
const LEGACY_HOOK_MARKERS = ["clawd-match"];

interface HookEntry {
  type: "command";
  command: string;
}

interface HookGroup {
  matcher?: string;
  hooks: HookEntry[];
}

interface StatusLineConfig {
  type?: "command";
  command?: string;
  padding?: number;
}

interface ClaudeSettings {
  hooks?: Record<string, HookGroup[]>;
  statusLine?: StatusLineConfig;
  [key: string]: unknown;
}

function readSettings(path: string): ClaudeSettings {
  if (!existsSync(path)) return {};
  try {
    return JSON.parse(readFileSync(path, "utf8")) as ClaudeSettings;
  } catch (err) {
    throw new Error(
      `~/.claude/settings.json is not valid JSON. Fix it manually or move it before re-running init.\n${err instanceof Error ? err.message : err}`,
    );
  }
}

function isClawdHook(entry: HookEntry): boolean {
  if (entry.type !== "command") return false;
  if (entry.command.includes(HOOK_MARKER)) return true;
  return LEGACY_HOOK_MARKERS.some((m) => entry.command.includes(m));
}

function ensureGroup(settings: ClaudeSettings, event: string): HookGroup {
  if (!settings.hooks) settings.hooks = {};
  if (!settings.hooks[event]) settings.hooks[event] = [];
  let group = settings.hooks[event].find((g) => (g.matcher ?? "") === "");
  if (!group) {
    group = { matcher: "", hooks: [] };
    settings.hooks[event].push(group);
  }
  return group;
}

function upsertHookInGroup(group: HookGroup, command: string): boolean {
  const exact = group.hooks.find(
    (h) => h.type === "command" && h.command === command,
  );
  if (exact) return false;
  group.hooks = group.hooks.filter((h) => !isClawdHook(h));
  group.hooks.push({ type: "command", command });
  return true;
}

export type StatusLineOutcome =
  | { kind: "added"; command: string }
  | { kind: "unchanged" }
  | { kind: "skipped"; existingCommand: string };

export interface ApplyResult {
  hooks: { added: string[]; unchanged: string[] };
  statusLine: StatusLineOutcome;
  backup?: string;
}

export interface ApplyOptions {
  hooks: Array<{ event: string; command: string }>;
  statusLine?: { command: string };
  path?: string;
}

export function applySettings(opts: ApplyOptions): ApplyResult {
  const path = opts.path ?? CLAUDE_SETTINGS_PATH;
  const settings = readSettings(path);

  let backup: string | undefined;
  if (existsSync(path)) {
    backup = `${path}.backup-${Date.now()}`;
    copyFileSync(path, backup);
  }

  const added: string[] = [];
  const unchanged: string[] = [];
  for (const { event, command } of opts.hooks) {
    const group = ensureGroup(settings, event);
    if (upsertHookInGroup(group, command)) added.push(event);
    else unchanged.push(event);
  }

  let statusLine: StatusLineOutcome = { kind: "unchanged" };
  if (opts.statusLine) {
    const desired = opts.statusLine.command;
    const existing = settings.statusLine;
    if (!existing) {
      settings.statusLine = { type: "command", command: desired };
      statusLine = { kind: "added", command: desired };
    } else if (existing.command === desired) {
      statusLine = { kind: "unchanged" };
    } else if (
      existing.command &&
      (existing.command.includes(HOOK_MARKER) ||
        LEGACY_HOOK_MARKERS.some((m) => existing.command!.includes(m)))
    ) {
      settings.statusLine = { ...existing, type: "command", command: desired };
      statusLine = { kind: "added", command: desired };
    } else {
      statusLine = {
        kind: "skipped",
        existingCommand: existing.command ?? "(unknown)",
      };
    }
  }

  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(settings, null, 2)}\n`, "utf8");

  return { hooks: { added, unchanged }, statusLine, backup };
}

export function uninstallAll(path: string = CLAUDE_SETTINGS_PATH): {
  hooks: number;
  statusLine: boolean;
} {
  if (!existsSync(path)) return { hooks: 0, statusLine: false };
  const settings = readSettings(path);
  let removedHooks = 0;
  let removedStatusLine = false;

  if (settings.hooks) {
    for (const event of Object.keys(settings.hooks)) {
      for (const group of settings.hooks[event]!) {
        const before = group.hooks.length;
        group.hooks = group.hooks.filter((h) => !isClawdHook(h));
        removedHooks += before - group.hooks.length;
      }
      settings.hooks[event] = settings.hooks[event]!.filter(
        (g) => g.hooks.length > 0,
      );
      if (settings.hooks[event]!.length === 0) delete settings.hooks[event];
    }
  }

  const slCmd = settings.statusLine?.command;
  if (
    slCmd &&
    (slCmd.includes(HOOK_MARKER) ||
      LEGACY_HOOK_MARKERS.some((m) => slCmd.includes(m)))
  ) {
    delete settings.statusLine;
    removedStatusLine = true;
  }

  if (removedHooks > 0 || removedStatusLine) {
    writeFileSync(path, `${JSON.stringify(settings, null, 2)}\n`, "utf8");
  }
  return { hooks: removedHooks, statusLine: removedStatusLine };
}
