interface SessionPayload {
  project: string;
  languages: string[];
  tools: string[];
  summary: string;
  occurredAt: number;
}

interface IngestPayload {
  profile: {
    languages: string[];
    tools: string[];
    bio?: string;
  };
  sessions: SessionPayload[];
}

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

export interface ExchangeResult {
  token: string;
  githubId: string;
  username: string;
}

export class UnauthorizedError extends Error {
  constructor() {
    super("clawd-date token is missing or expired");
    this.name = "UnauthorizedError";
  }
}

function trimUrl(url: string): string {
  return url.replace(/\/$/, "");
}

function authHeaders(token: string): Record<string, string> {
  return { authorization: `Bearer ${token}` };
}

async function ensureOk(res: Response, label: string): Promise<void> {
  if (res.ok) return;
  if (res.status === 401) throw new UnauthorizedError();
  throw new Error(`${label} failed: ${res.status} ${await res.text()}`);
}

export async function exchangeGithubToken(
  apiUrl: string,
  githubAccessToken: string,
): Promise<ExchangeResult> {
  const res = await fetch(`${trimUrl(apiUrl)}/auth/exchange`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ githubAccessToken }),
  });
  if (!res.ok) {
    throw new Error(`auth exchange failed: ${res.status} ${await res.text()}`);
  }
  return res.json() as Promise<ExchangeResult>;
}

export async function postIngest(
  apiUrl: string,
  token: string,
  payload: IngestPayload,
): Promise<{ ok: true; userId: string }> {
  const res = await fetch(`${trimUrl(apiUrl)}/ingest`, {
    method: "POST",
    headers: { "content-type": "application/json", ...authHeaders(token) },
    body: JSON.stringify(payload),
  });
  await ensureOk(res, "ingest");
  return res.json() as Promise<{ ok: true; userId: string }>;
}

export async function postHeartbeat(apiUrl: string, token: string): Promise<void> {
  const res = await fetch(`${trimUrl(apiUrl)}/heartbeat`, {
    method: "POST",
    headers: { "content-type": "application/json", ...authHeaders(token) },
  });
  await ensureOk(res, "heartbeat");
}

export async function getStatus(
  apiUrl: string,
  token: string,
  signal?: AbortSignal,
): Promise<Status> {
  const res = await fetch(`${trimUrl(apiUrl)}/status`, {
    headers: authHeaders(token),
    signal,
  });
  await ensureOk(res, "status");
  return res.json() as Promise<Status>;
}

export async function getUnreadMatches(
  apiUrl: string,
  token: string,
): Promise<UnreadMatch[]> {
  const res = await fetch(`${trimUrl(apiUrl)}/matches/unread`, {
    headers: authHeaders(token),
  });
  await ensureOk(res, "unread");
  const data = (await res.json()) as { matches: UnreadMatch[] };
  return data.matches;
}

export async function markMatchesRead(
  apiUrl: string,
  token: string,
): Promise<number> {
  const res = await fetch(`${trimUrl(apiUrl)}/matches/markRead`, {
    method: "POST",
    headers: { "content-type": "application/json", ...authHeaders(token) },
  });
  await ensureOk(res, "markRead");
  const data = (await res.json()) as { ok: true; count: number };
  return data.count;
}

export async function getDiscover(
  apiUrl: string,
  token: string,
): Promise<Candidate[]> {
  const res = await fetch(`${trimUrl(apiUrl)}/discover`, {
    headers: authHeaders(token),
  });
  await ensureOk(res, "discover");
  const data = (await res.json()) as { candidates: Candidate[] };
  return data.candidates;
}

export async function postSwipe(
  apiUrl: string,
  token: string,
  targetGithubId: string,
  action: "like" | "pass",
): Promise<{ mutual: boolean }> {
  const res = await fetch(`${trimUrl(apiUrl)}/swipe`, {
    method: "POST",
    headers: { "content-type": "application/json", ...authHeaders(token) },
    body: JSON.stringify({ targetGithubId, action }),
  });
  await ensureOk(res, "swipe");
  return res.json() as Promise<{ mutual: boolean }>;
}

export async function getMutualMatches(
  apiUrl: string,
  token: string,
): Promise<MutualMatch[]> {
  const res = await fetch(`${trimUrl(apiUrl)}/matches`, {
    headers: authHeaders(token),
  });
  await ensureOk(res, "matches");
  const data = (await res.json()) as { matches: MutualMatch[] };
  return data.matches;
}
