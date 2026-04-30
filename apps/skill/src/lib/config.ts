import {
  chmodSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { homedir } from "node:os";
import { join, dirname } from "node:path";

const HAS_EXPLICIT_CONFIG_PATH =
  typeof process.env.CLAWD_DATE_CONFIG_PATH === "string" &&
  process.env.CLAWD_DATE_CONFIG_PATH.length > 0;

export const CONFIG_PATH = HAS_EXPLICIT_CONFIG_PATH
  ? (process.env.CLAWD_DATE_CONFIG_PATH as string)
  : join(homedir(), ".config", "clawd-date", "config.json");
const LEGACY_CONFIG_PATH = join(homedir(), ".config", "clawd-match", "config.json");

export interface LocalConfig {
  githubId: string;
  username: string;
  apiUrl: string;
  authToken: string;
}

function parseConfig(path: string): LocalConfig | null {
  try {
    const parsed = JSON.parse(readFileSync(path, "utf8")) as Partial<LocalConfig>;
    if (
      typeof parsed.githubId !== "string" ||
      typeof parsed.username !== "string" ||
      typeof parsed.apiUrl !== "string" ||
      typeof parsed.authToken !== "string"
    ) {
      return null;
    }
    return parsed as LocalConfig;
  } catch {
    return null;
  }
}

export function readConfig(): LocalConfig | null {
  if (existsSync(CONFIG_PATH)) return parseConfig(CONFIG_PATH);
  // When CLAWD_DATE_CONFIG_PATH is set (dev wrapper), don't migrate the
  // legacy ~/.config/clawd-match/config.json — that would silently pull a
  // global/prod token into the dev-isolated config file.
  if (HAS_EXPLICIT_CONFIG_PATH) return null;
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
  writeFileSync(CONFIG_PATH, `${JSON.stringify(config, null, 2)}\n`, {
    encoding: "utf8",
    mode: 0o600,
  });
  try {
    chmodSync(CONFIG_PATH, 0o600);
  } catch {
    // best effort — Windows or unusual fs may reject chmod
  }
}

export function readLegacyApiUrl(): string | null {
  const paths = HAS_EXPLICIT_CONFIG_PATH
    ? [CONFIG_PATH]
    : [CONFIG_PATH, LEGACY_CONFIG_PATH];
  for (const path of paths) {
    if (!existsSync(path)) continue;
    try {
      const parsed = JSON.parse(readFileSync(path, "utf8")) as Record<string, unknown>;
      if (typeof parsed.apiUrl === "string" && parsed.apiUrl) return parsed.apiUrl;
    } catch {
      // ignore malformed
    }
  }
  return null;
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
