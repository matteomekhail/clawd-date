// Test-only helpers for the Convex backend test suite.

import type { convexTest } from "convex-test";
import { signToken } from "../../convex/auth";
import type { Id } from "../../convex/_generated/dataModel";

// Must be set BEFORE auth.ts evaluates getSecret(). vitest setup file
// (vitest.setup.ts) primes process.env, so importing this module is safe.
export const TEST_AUTH_SECRET = "test-secret-do-not-use-in-prod";

type Gender = "man" | "woman" | "other";

export interface SeedOptions {
  githubId?: string;
  username?: string;
  gender?: Gender;
  pref?: Gender[];
  languages?: string[];
  tools?: string[];
}

export async function seedUser(
  t: ReturnType<typeof convexTest>,
  options: SeedOptions = {},
): Promise<Id<"users">> {
  const githubId = options.githubId ?? "gh-default";
  return await t.run(async (ctx) => {
    return ctx.db.insert("users", {
      githubId,
      username: options.username ?? githubId,
      languages: options.languages ?? [],
      tools: options.tools ?? [],
      ...(options.gender !== undefined ? { gender: options.gender } : {}),
      ...(options.pref !== undefined ? { genderPreference: options.pref } : {}),
    });
  });
}

export async function authHeaderFor(
  githubId: string,
  username: string,
): Promise<{ authorization: string }> {
  const token = await signToken({ githubId, username });
  return { authorization: `Bearer ${token}` };
}
