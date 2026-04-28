import type { IngestPayload } from "@clawd-date/shared";

export interface SendIngestOptions {
  url?: string;
  fetch?: typeof fetch;
}

export async function sendIngest(
  payload: IngestPayload,
  opts: SendIngestOptions = {},
): Promise<{ ok: true; userId: string }> {
  const baseUrl = opts.url ?? process.env.CLAWD_API_URL;
  if (!baseUrl) {
    throw new Error("Missing CLAWD_API_URL (Convex HTTP actions URL)");
  }

  const fetchImpl = opts.fetch ?? fetch;
  const res = await fetchImpl(`${baseUrl.replace(/\/$/, "")}/ingest`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error(`Ingest failed: ${res.status} ${await res.text()}`);
  }

  return res.json() as Promise<{ ok: true; userId: string }>;
}
