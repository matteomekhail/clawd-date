export interface SessionPayload {
  project: string;
  languages: string[];
  tools: string[];
  summary: string;
  occurredAt: number;
}

export interface IngestPayload {
  profile: {
    languages: string[];
    tools: string[];
    bio?: string;
  };
  sessions: SessionPayload[];
}
