import { readConfig } from "../lib/config.js";
import { readCache, writeCache } from "../lib/cache.js";
import { getStatus, type Status } from "../lib/api.js";

const CACHE_TTL_MS = 60_000;
const FETCH_TIMEOUT_MS = 1500;

const BOLD = "\x1b[1m";
const MAGENTA = "\x1b[35m";
const GREEN = "\x1b[32m";
const DIM = "\x1b[2m";
const RESET = "\x1b[0m";

function format(s: Status): string {
  const parts: string[] = [];

  if (s.unreadMatches > 0) {
    const names = s.unreadUsernames
      .slice(0, 2)
      .map((u) => `@${u}`)
      .join(", ");
    const more =
      s.unreadMatches > s.unreadUsernames.length
        ? `, +${s.unreadMatches - s.unreadUsernames.length}`
        : s.unreadUsernames.length > 2
          ? `, +${s.unreadUsernames.length - 2}`
          : "";
    parts.push(
      `${BOLD}${MAGENTA}💘 ${s.unreadMatches} match${s.unreadMatches === 1 ? "" : "es"}${RESET} (${names}${more})`,
    );
  } else {
    parts.push(`${MAGENTA}💘 clawd.date${RESET}`);
  }

  if (s.candidates > 0) parts.push(`${s.candidates} to swipe`);

  const live = [
    ...s.activeMatches.map((u) => ({ name: u, isMatch: true })),
    ...s.activeCandidates.map((u) => ({ name: u, isMatch: false })),
  ];
  if (live.length > 0) {
    const first = live[0]!;
    const tag = first.isMatch ? "match" : "candidate";
    const extra = live.length > 1 ? ` +${live.length - 1}` : "";
    parts.push(`${GREEN}🟢 @${first.name}${RESET} ${DIM}(${tag} active${extra})${RESET}`);
  } else if (s.unreadMatches === 0 && s.candidates === 0) {
    parts.push(`${DIM}all caught up${RESET}`);
  }

  return parts.join(" • ");
}

async function fetchWithTimeout(
  apiUrl: string,
  token: string,
): Promise<Status | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await getStatus(apiUrl, token, controller.signal);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function runStatus(): Promise<void> {
  const cfg = readConfig();
  if (!cfg) {
    process.stdout.write("");
    return;
  }

  const cache = readCache<Status>();
  const isFresh = cache.ok && cache.ageMs! < CACHE_TTL_MS;

  if (isFresh && cache.data) {
    process.stdout.write(format(cache.data));
    return;
  }

  const fetched = await fetchWithTimeout(cfg.apiUrl, cfg.authToken);

  if (fetched) {
    writeCache(fetched);
    process.stdout.write(format(fetched));
    return;
  }

  if (cache.ok && cache.data) {
    process.stdout.write(format(cache.data));
    return;
  }

  process.stdout.write(`${DIM}💘 clawd.date — loading…${RESET}`);
}
