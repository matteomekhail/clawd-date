import { execSync } from "node:child_process";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { applySettings } from "../lib/settings.js";
import { writeConfig, readConfig } from "../lib/config.js";

const DEFAULT_API_URL = "https://cautious-dachshund-642.convex.site";

function tryGhUser(): { githubId: string; username: string } | null {
  try {
    const json = execSync("gh api user", {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    const data = JSON.parse(json) as { id: number; login: string };
    return { githubId: String(data.id), username: data.login };
  } catch {
    return null;
  }
}

async function prompt(
  question: string,
  fallback?: string,
): Promise<string> {
  const rl = createInterface({ input, output });
  const suffix = fallback ? ` [${fallback}]` : "";
  const answer = (await rl.question(`${question}${suffix}: `)).trim();
  rl.close();
  return answer || fallback || "";
}

export async function runInit(): Promise<void> {
  console.log("clawd-date setup\n");

  const existing = readConfig();
  const detected = tryGhUser();

  let username = existing?.username ?? detected?.username ?? "";
  let githubId = existing?.githubId ?? detected?.githubId ?? "";

  if (!detected) {
    console.log("(`gh` CLI not found or not authenticated — falling back to manual input)");
  } else {
    console.log(`Detected GitHub: @${detected.username}`);
  }

  if (!username) username = await prompt("GitHub username");
  if (!githubId) {
    githubId = await prompt("GitHub user id (numeric)", username || undefined);
  }
  const apiUrl =
    process.env.CLAWD_MATCH_API_URL ?? existing?.apiUrl ?? DEFAULT_API_URL;

  if (!username || !githubId) {
    throw new Error("Setup aborted: missing fields.");
  }

  writeConfig({ githubId, username, apiUrl });

  const result = applySettings({
    hooks: [
      { event: "SessionStart", command: "clawd-date notify" },
      { event: "SessionEnd", command: "clawd-date ingest" },
    ],
    statusLine: { command: "clawd-date status" },
  });

  console.log("");
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
