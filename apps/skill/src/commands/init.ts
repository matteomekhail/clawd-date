import { execSync } from "node:child_process";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { installHooks } from "../lib/settings.js";
import { writeConfig, readConfig } from "../lib/config.js";

const DEFAULT_API_URL = "https://impartial-dinosaur-5.convex.site";

function tryGhUser(): { githubId: string; username: string } | null {
  try {
    const json = execSync("gh api user", { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
    const data = JSON.parse(json) as { id: number; login: string };
    return { githubId: String(data.id), username: data.login };
  } catch {
    return null;
  }
}

async function prompt(question: string, fallback?: string): Promise<string> {
  const rl = createInterface({ input, output });
  const suffix = fallback ? ` [${fallback}]` : "";
  const answer = (await rl.question(`${question}${suffix}: `)).trim();
  rl.close();
  return answer || fallback || "";
}

export async function runInit(): Promise<void> {
  console.log("clawd-match setup\n");

  const existing = readConfig();
  const detected = tryGhUser();

  let username = existing?.username ?? detected?.username ?? "";
  let githubId = existing?.githubId ?? detected?.githubId ?? "";

  if (!detected) {
    console.log("(`gh` CLI non trovato o non autenticato — uso input manuale)");
  } else {
    console.log(`Rilevato GitHub: @${detected.username}`);
  }

  if (!username) username = await prompt("GitHub username");
  if (!githubId) {
    githubId = await prompt("GitHub user id (numerico)", username || undefined);
  }
  const apiUrl = await prompt("Convex HTTP URL", existing?.apiUrl ?? DEFAULT_API_URL);

  if (!username || !githubId || !apiUrl) {
    throw new Error("Setup interrotto: campi mancanti.");
  }

  writeConfig({ githubId, username, apiUrl });

  const result = installHooks([
    { event: "SessionStart", command: "clawd-match notify" },
    { event: "SessionEnd", command: "clawd-match ingest" },
  ]);

  console.log("");
  console.log(`✅ Config salvato in ~/.config/clawd-match/config.json`);
  if (result.backup) console.log(`📦 Backup di settings.json → ${result.backup}`);
  if (result.added.length) console.log(`✅ Hook aggiunti: ${result.added.join(", ")}`);
  if (result.unchanged.length) {
    console.log(`ℹ️  Hook già presenti (skip): ${result.unchanged.join(", ")}`);
  }
  console.log("\nPronto. Apri una nuova sessione di Claude Code per attivare i hook.");
}
