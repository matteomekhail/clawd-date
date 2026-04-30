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

export function requireConfig(): LocalConfig {
  const cfg = readConfig();
  if (!cfg) {
    throw new Error(
      "clawd-date is not configured. Run `clawd-date init` to set up.",
    );
  }
  return cfg;
}
