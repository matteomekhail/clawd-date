import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { CONFIG_PATH } from "./config.js";

// Co-located with the auth config so dev (CLAWD_DATE_CONFIG_PATH) and prod
// installs each get their own cache and never overwrite each other.
const CACHE_PATH = join(dirname(CONFIG_PATH), "status-cache.json");

interface CacheEntry<T> {
  fetchedAt: number;
  data: T;
}

export interface CacheRead<T> {
  ok: boolean;
  data?: T;
  ageMs?: number;
}

export function readCache<T>(): CacheRead<T> {
  if (!existsSync(CACHE_PATH)) return { ok: false };
  try {
    const parsed = JSON.parse(readFileSync(CACHE_PATH, "utf8")) as CacheEntry<T>;
    return {
      ok: true,
      data: parsed.data,
      ageMs: Date.now() - parsed.fetchedAt,
    };
  } catch {
    return { ok: false };
  }
}

export function writeCache<T>(data: T): void {
  try {
    mkdirSync(dirname(CACHE_PATH), { recursive: true });
    const entry: CacheEntry<T> = { fetchedAt: Date.now(), data };
    writeFileSync(CACHE_PATH, JSON.stringify(entry), "utf8");
  } catch {
    /* best effort */
  }
}
