import { v } from "convex/values";
import { internalAction, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";

declare const process: { env: Record<string, string | undefined> };

const TOKEN_TTL_MS = 365 * 24 * 60 * 60 * 1000;

interface TokenPayload {
  githubId: string;
  username: string;
  iat: number;
  exp: number;
}

function bytesToBase64Url(bytes: ArrayBuffer | Uint8Array): string {
  const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let bin = "";
  for (let i = 0; i < u8.length; i++) bin += String.fromCharCode(u8[i]);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlDecode(s: string): Uint8Array {
  const padded = s.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (s.length % 4)) % 4);
  const bin = atob(padded);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function stringToBase64Url(s: string): string {
  return bytesToBase64Url(new TextEncoder().encode(s));
}

function base64UrlToString(s: string): string {
  return new TextDecoder().decode(base64UrlDecode(s));
}

function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

function getSecret(): string {
  const secret = process.env.CLAWD_AUTH_SECRET;
  if (!secret) {
    throw new Error("CLAWD_AUTH_SECRET is not set on this Convex deployment");
  }
  return secret;
}

async function importHmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

async function signMessage(secret: string, message: string): Promise<string> {
  const key = await importHmacKey(secret);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return bytesToBase64Url(sig);
}

export async function signToken(payload: Omit<TokenPayload, "iat" | "exp">): Promise<string> {
  const secret = getSecret();
  const now = Date.now();
  const full: TokenPayload = { ...payload, iat: now, exp: now + TOKEN_TTL_MS };
  const header = stringToBase64Url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = stringToBase64Url(JSON.stringify(full));
  const sig = await signMessage(secret, `${header}.${body}`);
  return `${header}.${body}.${sig}`;
}

export async function verifyToken(token: string): Promise<TokenPayload | null> {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [header, body, sig] = parts;

  const expected = await signMessage(getSecret(), `${header}.${body}`);
  if (!timingSafeEqual(base64UrlDecode(sig), base64UrlDecode(expected))) return null;

  let payload: TokenPayload;
  try {
    payload = JSON.parse(base64UrlToString(body)) as TokenPayload;
  } catch {
    return null;
  }
  if (typeof payload.githubId !== "string" || typeof payload.username !== "string") return null;
  if (typeof payload.exp !== "number" || payload.exp < Date.now()) return null;
  return payload;
}

export async function identityFromRequest(
  request: Request,
): Promise<TokenPayload | null> {
  const header = request.headers.get("authorization");
  if (!header) return null;
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  if (!match) return null;
  return verifyToken(match[1]);
}

export const upsertFromGithub = internalMutation({
  args: {
    githubId: v.string(),
    username: v.string(),
    avatarUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("users")
      .withIndex("by_github_id", (q) => q.eq("githubId", args.githubId))
      .first();
    if (existing) {
      const patch: Record<string, unknown> = { username: args.username };
      if (args.avatarUrl !== undefined) patch.avatarUrl = args.avatarUrl;
      await ctx.db.patch(existing._id, patch);
      return existing._id;
    }
    return ctx.db.insert("users", {
      githubId: args.githubId,
      username: args.username,
      avatarUrl: args.avatarUrl,
      languages: [],
      tools: [],
    });
  },
});

export const userIdByGithubId = internalQuery({
  args: { githubId: v.string() },
  handler: async (ctx, { githubId }) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_github_id", (q) => q.eq("githubId", githubId))
      .first();
    return user?._id ?? null;
  },
});

interface GithubUser {
  id: number;
  login: string;
  avatar_url?: string;
}

export const exchangeGithubToken = internalAction({
  args: { githubAccessToken: v.string() },
  handler: async (ctx, { githubAccessToken }): Promise<{
    token: string;
    githubId: string;
    username: string;
  }> => {
    const res = await fetch("https://api.github.com/user", {
      headers: {
        authorization: `Bearer ${githubAccessToken}`,
        accept: "application/vnd.github+json",
        "user-agent": "clawd-date",
      },
    });
    if (!res.ok) {
      throw new Error(`github verification failed: ${res.status}`);
    }
    const user = (await res.json()) as GithubUser;
    if (typeof user.id !== "number" || typeof user.login !== "string") {
      throw new Error("malformed github response");
    }
    const githubId = String(user.id);
    const username = user.login;

    await ctx.runMutation(internal.auth.upsertFromGithub, {
      githubId,
      username,
      avatarUrl: user.avatar_url,
    });

    const token = await signToken({ githubId, username });
    return { token, githubId, username };
  },
});
