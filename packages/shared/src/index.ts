export interface DevProfile {
  githubId: string;
  username: string;
  avatarUrl?: string;
  bio?: string;
  languages: string[];
  tools: string[];
}

export interface SessionPayload {
  project: string;
  languages: string[];
  tools: string[];
  summary: string;
  occurredAt: number;
}

export interface IngestPayload {
  profile: DevProfile;
  sessions: SessionPayload[];
}
