import { readConfig } from "../lib/config.js";
import { getUnreadMatches } from "../lib/api.js";

export async function runNotify(): Promise<void> {
  const cfg = readConfig();
  if (!cfg) return;

  let matches: Awaited<ReturnType<typeof getUnreadMatches>> = [];
  try {
    matches = await getUnreadMatches(cfg.apiUrl, cfg.githubId);
  } catch {
    return;
  }

  if (matches.length === 0) return;

  const verb = matches.length === 1 ? "match" : "match";
  const names = matches
    .slice(0, 3)
    .map((m) => `@${m.username}`)
    .join(", ");
  const more = matches.length > 3 ? ` +${matches.length - 3} altri` : "";

  process.stderr.write(
    `\n💘 clawd.date — ${matches.length} nuovo ${verb}: ${names}${more}\n` +
      `   Apri https://clawd.date/matches per vederli\n\n`,
  );
}
