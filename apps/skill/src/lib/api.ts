import type { IngestPayload } from "@clawd-date/shared";

export interface UnreadMatch {
  id: string;
  username: string;
  avatarUrl?: string;
  bio?: string;
}

function trimUrl(url: string): string {
  return url.replace(/\/$/, "");
}

export async function postIngest(
  apiUrl: string,
  payload: IngestPayload,
): Promise<{ ok: true; userId: string }> {
  const res = await fetch(`${trimUrl(apiUrl)}/ingest`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error(`ingest failed: ${res.status} ${await res.text()}`);
  }
  return res.json() as Promise<{ ok: true; userId: string }>;
}

export async function getUnreadMatches(
  apiUrl: string,
  githubId: string,
): Promise<UnreadMatch[]> {
  const url = `${trimUrl(apiUrl)}/matches/unread?githubId=${encodeURIComponent(githubId)}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`unread fetch failed: ${res.status}`);
  }
  const data = (await res.json()) as { matches: UnreadMatch[] };
  return data.matches;
}

export async function markMatchesRead(
  apiUrl: string,
  githubId: string,
): Promise<number> {
  const res = await fetch(`${trimUrl(apiUrl)}/matches/markRead`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ githubId }),
  });
  if (!res.ok) {
    throw new Error(`markRead failed: ${res.status}`);
  }
  const data = (await res.json()) as { ok: true; count: number };
  return data.count;
}
