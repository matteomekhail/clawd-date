import { readConfig } from "../lib/config.js";
import { writeCache } from "../lib/cache.js";
import { getStatus, postHeartbeat } from "../lib/api.js";

const BOLD_MAGENTA = "\x1b[1m\x1b[35m";
const DIM = "\x1b[2m";
const RESET = "\x1b[0m";

export async function runNotify(): Promise<void> {
  const cfg = readConfig();
  if (!cfg) return;

  postHeartbeat(cfg.apiUrl, cfg.authToken).catch(() => {});

  let status;
  try {
    status = await getStatus(cfg.apiUrl, cfg.authToken);
  } catch {
    return;
  }

  writeCache(status);

  const parts: string[] = [];

  if (status.unreadMatches > 0) {
    const names = status.unreadUsernames
      .slice(0, 3)
      .map((m) => `@${m}`)
      .join(", ");
    const more =
      status.unreadMatches > status.unreadUsernames.length
        ? `, +${status.unreadMatches - status.unreadUsernames.length}`
        : "";
    const label = status.unreadMatches === 1 ? "new match" : "new matches";
    parts.push(
      `${BOLD_MAGENTA}${status.unreadMatches} ${label}${RESET} (${names}${more})`,
    );
  }

  if (status.candidates > 0) parts.push(`${status.candidates} to swipe`);

  const liveMatch = status.activeMatches[0];
  const liveCandidate = status.activeCandidates[0];
  if (liveMatch) parts.push(`🟢 @${liveMatch} (match) active`);
  else if (liveCandidate) parts.push(`🟢 @${liveCandidate} active`);

  if (parts.length === 0) parts.push(`${DIM}all caught up${RESET}`);
  parts.push(`${DIM}run \`clawd-date\`${RESET}`);

  process.stderr.write(`\n💘 clawd.date — ${parts.join(" • ")}\n\n`);
}
