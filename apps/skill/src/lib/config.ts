import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { join, dirname } from "node:path";

export const CONFIG_PATH = join(homedir(), ".config", "clawd-date", "config.json");
const LEGACY_CONFIG_PATH = join(homedir(), ".config", "clawd-match", "config.json");

export interface LocalConfig {
  githubId: string;
  username: string;
  apiUrl: string;
}

function parseConfig(path: string): LocalConfig | null {
  try {
    return JSON.parse(readFileSync(path, "utf8")) as LocalConfig;
  } catch {
    return null;
  }
}

export function readConfig(): LocalConfig | null {
  if (existsSync(CONFIG_PATH)) return parseConfig(CONFIG_PATH);
  if (existsSync(LEGACY_CONFIG_PATH)) {
    const legacy = parseConfig(LEGACY_CONFIG_PATH);
    if (legacy) {
      writeConfig(legacy);
      return legacy;
    }
  }
  return null;
}

export function writeConfig(config: LocalConfig): void {
  mkdirSync(dirname(CONFIG_PATH), { recursive: true });
  writeFileSync(CONFIG_PATH, `${JSON.stringify(config, null, 2)}\n`, "utf8");
}

export class NotConfiguredError extends Error {
  constructor() {
    super("clawd-date is not configured");
    this.name = "NotConfiguredError";
  }
}

export function requireConfig(): LocalConfig {
  const cfg = readConfig();
  if (!cfg) throw new NotConfiguredError();
  return cfg;
}

export function printNotConfigured(): void {
  const magenta = "\x1b[95m";
  const dim = "\x1b[2m";
  const bold = "\x1b[1m";
  const reset = "\x1b[0m";
  process.stderr.write(
    `\n  ${magenta}${bold}clawd.date${reset} isn't set up yet.\n` +
      `  ${dim}Run${reset} ${bold}clawd-date init${reset} ${dim}to get started.${reset}\n\n`,
  );
}
