import { setTimeout as sleep } from "node:timers/promises";
import { applySettings } from "../lib/settings.js";
import { writeConfig, readConfig, readLegacyApiUrl } from "../lib/config.js";
import { exchangeGithubToken } from "../lib/api.js";

const DEFAULT_API_URL = "https://cautious-dachshund-642.convex.site";
const GITHUB_CLIENT_ID = "Ov23liN8Dl4BF9lziPsY";
const DEVICE_CODE_URL = "https://github.com/login/device/code";
const ACCESS_TOKEN_URL = "https://github.com/login/oauth/access_token";
const SCOPE = "read:user";

interface DeviceCodeResponse {
  device_code: string;
  user_code: string;
  verification_uri: string;
  expires_in: number;
  interval: number;
}

interface AccessTokenResponse {
  access_token?: string;
  token_type?: string;
  scope?: string;
  error?: string;
  error_description?: string;
  interval?: number;
}

async function requestDeviceCode(): Promise<DeviceCodeResponse> {
  const res = await fetch(DEVICE_CODE_URL, {
    method: "POST",
    headers: { accept: "application/json", "content-type": "application/json" },
    body: JSON.stringify({ client_id: GITHUB_CLIENT_ID, scope: SCOPE }),
  });
  if (!res.ok) {
    throw new Error(`GitHub device code request failed: ${res.status} ${await res.text()}`);
  }
  return res.json() as Promise<DeviceCodeResponse>;
}

async function pollAccessToken(deviceCode: string): Promise<AccessTokenResponse> {
  const res = await fetch(ACCESS_TOKEN_URL, {
    method: "POST",
    headers: { accept: "application/json", "content-type": "application/json" },
    body: JSON.stringify({
      client_id: GITHUB_CLIENT_ID,
      device_code: deviceCode,
      grant_type: "urn:ietf:params:oauth:grant-type:device_code",
    }),
  });
  return res.json() as Promise<AccessTokenResponse>;
}

async function tryOpenBrowser(url: string): Promise<void> {
  const cmd =
    process.platform === "darwin" ? "open" :
    process.platform === "win32" ? "start" :
    "xdg-open";
  try {
    const { spawn } = await import("node:child_process");
    spawn(cmd, [url], { stdio: "ignore", detached: true }).unref();
  } catch {
    // best effort
  }
}

async function deviceFlow(): Promise<string> {
  const code = await requestDeviceCode();

  const bold = "\x1b[1m";
  const dim = "\x1b[2m";
  const reset = "\x1b[0m";

  console.log("");
  console.log(`  ${dim}Open this URL in your browser:${reset}`);
  console.log(`    ${bold}${code.verification_uri}${reset}`);
  console.log(`  ${dim}and enter the code:${reset}`);
  console.log(`    ${bold}${code.user_code}${reset}`);
  console.log("");
  console.log(`  ${dim}Waiting for you to authorize…${reset}`);

  await tryOpenBrowser(code.verification_uri);

  const deadline = Date.now() + code.expires_in * 1000;
  let interval = Math.max(code.interval, 5);

  while (Date.now() < deadline) {
    await sleep(interval * 1000);
    const token = await pollAccessToken(code.device_code);
    if (token.access_token) return token.access_token;
    if (token.error === "authorization_pending") continue;
    if (token.error === "slow_down") {
      interval = (token.interval ?? interval) + 1;
      continue;
    }
    if (token.error === "expired_token" || token.error === "access_denied") {
      throw new Error(token.error_description ?? token.error);
    }
    if (token.error) {
      throw new Error(`${token.error}: ${token.error_description ?? "unknown"}`);
    }
  }
  throw new Error("authorization timed out — re-run `clawd-date init`");
}

export async function runInit(): Promise<void> {
  console.log("clawd-date setup\n");

  const existing = readConfig();
  const apiUrl =
    process.env.CLAWD_MATCH_API_URL ??
    existing?.apiUrl ??
    readLegacyApiUrl() ??
    DEFAULT_API_URL;

  console.log("  We'll authenticate you with GitHub via Device Flow.");
  console.log("  No tokens or passwords are typed into this terminal.");

  const githubAccessToken = await deviceFlow();

  console.log("\n  Verifying with backend…");
  const exchanged = await exchangeGithubToken(apiUrl, githubAccessToken);

  writeConfig({
    githubId: exchanged.githubId,
    username: exchanged.username,
    apiUrl,
    authToken: exchanged.token,
  });

  const result = applySettings({
    hooks: [
      { event: "SessionStart", command: "clawd-date notify" },
      { event: "SessionEnd", command: "clawd-date ingest" },
    ],
    statusLine: { command: "clawd-date status" },
  });

  console.log("");
  console.log(`✅ Authenticated as @${exchanged.username}`);
  console.log("✅ Config saved to ~/.config/clawd-date/config.json");
  if (result.backup) {
    console.log(`📦 Backup of settings.json → ${result.backup}`);
  }
  if (result.hooks.added.length) {
    console.log(`✅ Hooks installed: ${result.hooks.added.join(", ")}`);
  }
  if (result.hooks.unchanged.length) {
    console.log(
      `ℹ️  Hooks already present (skipped): ${result.hooks.unchanged.join(", ")}`,
    );
  }

  switch (result.statusLine.kind) {
    case "added":
      console.log("✅ Statusline installed — you'll see matches inside Claude Code");
      break;
    case "unchanged":
      console.log("ℹ️  Statusline already pointing to clawd-date");
      break;
    case "skipped":
      console.log(
        `⚠️  Statusline not installed: you already have a custom one (${result.statusLine.existingCommand}). ` +
          `Replace it manually if you want to see matches inside Claude Code.`,
      );
      break;
  }

  console.log("\nDone. Open a new Claude Code session to activate the hooks.");
}
