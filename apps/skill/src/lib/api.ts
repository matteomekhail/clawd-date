import type { IngestPayload } from "@clawd-date/shared";

export interface UnreadMatch {
  id: string;
  username: string;
  avatarUrl?: string;
  bio?: string;
}

export interface Candidate {
  id: string;
  githubId: string;
  username: string;
  avatarUrl?: string;
  bio?: string;
  languages: string[];
  tools: string[];
  sharedLanguages: string[];
  sharedTools: string[];
  score: number;
  lastActiveAt?: number;
}

export interface MutualMatch {
  id: string;
  githubId: string;
  username: string;
  avatarUrl?: string;
  bio?: string;
  languages: string[];
  tools: string[];
  lastActiveAt?: number;
}

export interface Status {
  unreadMatches: number;
  unreadUsernames: string[];
  candidates: number;
  activeCandidates: string[];
  activeMatches: string[];
  mutualMatches: number;
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

export async function postHeartbeat(
  apiUrl: string,
  githubId: string,
): Promise<void> {
  const res = await fetch(`${trimUrl(apiUrl)}/heartbeat`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ githubId }),
  });
  if (!res.ok) throw new Error(`heartbeat failed: ${res.status}`);
}

export async function getStatus(
  apiUrl: string,
  githubId: string,
  signal?: AbortSignal,
): Promise<Status> {
  const url = `${trimUrl(apiUrl)}/status?githubId=${encodeURIComponent(githubId)}`;
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`status failed: ${res.status}`);
  return res.json() as Promise<Status>;
}

export async function getUnreadMatches(
  apiUrl: string,
  githubId: string,
): Promise<UnreadMatch[]> {
  const url = `${trimUrl(apiUrl)}/matches/unread?githubId=${encodeURIComponent(githubId)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`unread fetch failed: ${res.status}`);
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
  if (!res.ok) throw new Error(`markRead failed: ${res.status}`);
  const data = (await res.json()) as { ok: true; count: number };
  return data.count;
}

export async function getDiscover(
  apiUrl: string,
  githubId: string,
): Promise<Candidate[]> {
  const url = `${trimUrl(apiUrl)}/discover?githubId=${encodeURIComponent(githubId)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`discover failed: ${res.status}`);
  const data = (await res.json()) as { candidates: Candidate[] };
  return data.candidates;
}

export async function postSwipe(
  apiUrl: string,
  githubId: string,
  targetGithubId: string,
  action: "like" | "pass",
): Promise<{ mutual: boolean }> {
  const res = await fetch(`${trimUrl(apiUrl)}/swipe`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ githubId, targetGithubId, action }),
  });
  if (!res.ok) throw new Error(`swipe failed: ${res.status} ${await res.text()}`);
  return res.json() as Promise<{ mutual: boolean }>;
}

export async function getMutualMatches(
  apiUrl: string,
  githubId: string,
): Promise<MutualMatch[]> {
  const url = `${trimUrl(apiUrl)}/matches?githubId=${encodeURIComponent(githubId)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`matches failed: ${res.status}`);
  const data = (await res.json()) as { matches: MutualMatch[] };
  return data.matches;
}
