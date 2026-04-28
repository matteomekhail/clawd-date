import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { join, dirname } from "node:path";

export const CONFIG_PATH = join(homedir(), ".config", "clawd-match", "config.json");

export interface LocalConfig {
  githubId: string;
  username: string;
  apiUrl: string;
}

export function readConfig(): LocalConfig | null {
  if (!existsSync(CONFIG_PATH)) return null;
  try {
    return JSON.parse(readFileSync(CONFIG_PATH, "utf8")) as LocalConfig;
  } catch {
    return null;
  }
}

export function writeConfig(config: LocalConfig): void {
  mkdirSync(dirname(CONFIG_PATH), { recursive: true });
  writeFileSync(CONFIG_PATH, `${JSON.stringify(config, null, 2)}\n`, "utf8");
}

export function requireConfig(): LocalConfig {
  const cfg = readConfig();
  if (!cfg) {
    throw new Error(
      "clawd-match non è configurato. Esegui `clawd-match init` per fare setup.",
    );
  }
  return cfg;
}
