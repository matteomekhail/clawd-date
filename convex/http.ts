import { httpRouter, type GenericActionCtx } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { identityFromRequest } from "./auth";
import type { DataModel, Id } from "./_generated/dataModel";
import { type Gender, isGender } from "./preferences";

type HttpCtx = GenericActionCtx<DataModel>;

const http = httpRouter();

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

const unauthorized = () => json({ error: "unauthorized" }, 401);

async function authedUserId(
  ctx: HttpCtx,
  request: Request,
): Promise<Id<"users"> | null> {
  const identity = await identityFromRequest(request);
  if (!identity) return null;
  const userId = await ctx.runQuery(internal.auth.userIdByGithubId, {
    githubId: identity.githubId,
  });
  return userId;
}

http.route({
  path: "/auth/exchange",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    let body: { githubAccessToken?: unknown };
    try {
      body = (await request.json()) as { githubAccessToken?: unknown };
    } catch {
      return json({ error: "invalid body" }, 400);
    }
    if (typeof body.githubAccessToken !== "string" || !body.githubAccessToken) {
      return json({ error: "missing githubAccessToken" }, 400);
    }
    try {
      const result = await ctx.runAction(internal.auth.exchangeGithubToken, {
        githubAccessToken: body.githubAccessToken,
      });
      return json(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : "exchange failed";
      return json({ error: message }, 401);
    }
  }),
});

http.route({
  path: "/ingest",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const userId = await authedUserId(ctx, request);
    if (!userId) return unauthorized();

    let body: {
      profile?: {
        languages?: unknown;
        tools?: unknown;
        bio?: unknown;
      };
      sessions?: Array<{
        project: string;
        languages: string[];
        tools: string[];
        summary: string;
        occurredAt: number;
      }>;
    };
    try {
      body = await request.json();
    } catch {
      return json({ error: "invalid body" }, 400);
    }

    const langs = body.profile?.languages;
    const tools = body.profile?.tools;
    if (
      !Array.isArray(langs) ||
      !Array.isArray(tools) ||
      langs.some((l) => typeof l !== "string") ||
      tools.some((t) => typeof t !== "string")
    ) {
      return json({ error: "invalid profile" }, 400);
    }

    const bio = typeof body.profile?.bio === "string" ? (body.profile.bio as string) : undefined;

    await ctx.runMutation(internal.users.updateProfile, {
      userId,
      languages: langs as string[],
      tools: tools as string[],
      bio,
    });
    await ctx.runMutation(internal.users.heartbeat, { userId });

    for (const session of body.sessions ?? []) {
      await ctx.runMutation(internal.sessions.record, {
        userId,
        project: session.project,
        languages: session.languages,
        tools: session.tools,
        summary: session.summary,
        occurredAt: session.occurredAt,
      });
    }

    return json({ ok: true, userId });
  }),
});

http.route({
  path: "/heartbeat",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const userId = await authedUserId(ctx, request);
    if (!userId) return unauthorized();
    await ctx.runMutation(internal.users.heartbeat, { userId });
    return json({ ok: true, userId });
  }),
});

http.route({
  path: "/status",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const userId = await authedUserId(ctx, request);
    if (!userId) return unauthorized();
    const status = await ctx.runQuery(internal.status.statusFor, { userId });
    return json(status);
  }),
});

http.route({
  path: "/discover",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const userId = await authedUserId(ctx, request);
    if (!userId) return unauthorized();
    const candidates = await ctx.runQuery(internal.swipes.discoverFor, { userId });
    return json({ candidates });
  }),
});

http.route({
  path: "/swipe",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const userId = await authedUserId(ctx, request);
    if (!userId) return unauthorized();

    let body: { targetGithubId?: unknown; action?: unknown };
    try {
      body = await request.json();
    } catch {
      return json({ error: "invalid body" }, 400);
    }
    if (typeof body.targetGithubId !== "string") {
      return json({ error: "missing targetGithubId" }, 400);
    }
    if (body.action !== "like" && body.action !== "pass") {
      return json({ error: "invalid action" }, 400);
    }

    const result = await ctx.runMutation(internal.swipes.recordByGithubId, {
      fromUserId: userId,
      targetGithubId: body.targetGithubId,
      action: body.action,
    });
    if (!result.ok) {
      // Map structural code → HTTP status. Reason strings are for humans;
      // never branch on them — they will drift.
      const status = result.code === "incompatible" ? 409 : 404;
      return json({ error: result.reason }, status);
    }
    return json({ mutual: result.mutual });
  }),
});

http.route({
  path: "/profile",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const userId = await authedUserId(ctx, request);
    if (!userId) return unauthorized();
    const profile = await ctx.runQuery(internal.users.myProfile, { userId });
    return json(profile ?? { gender: null, genderPreference: [] });
  }),
});

http.route({
  path: "/profile",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const userId = await authedUserId(ctx, request);
    if (!userId) return unauthorized();

    let body: { gender?: unknown; genderPreference?: unknown };
    try {
      body = await request.json();
    } catch {
      return json({ error: "invalid body" }, 400);
    }

    // null = explicit clear, undefined / missing = leave unchanged.
    let gender: Gender | null | undefined;
    if (body.gender === null) {
      gender = null;
    } else if (body.gender !== undefined) {
      if (!isGender(body.gender)) return json({ error: "invalid gender" }, 400);
      gender = body.gender;
    }

    // null OR [] = clear (no filter). The TUI guards against saving an
    // empty array, but a hand-rolled API call would otherwise persist []
    // and silently match everyone — close that backdoor here.
    let genderPreference: Gender[] | null | undefined;
    if (body.genderPreference === null) {
      genderPreference = null;
    } else if (body.genderPreference !== undefined) {
      if (!Array.isArray(body.genderPreference) || !body.genderPreference.every(isGender)) {
        return json({ error: "invalid genderPreference" }, 400);
      }
      const deduped = Array.from(new Set(body.genderPreference)) as Gender[];
      genderPreference = deduped.length === 0 ? null : deduped;
    }

    await ctx.runMutation(internal.users.setPreferences, {
      userId,
      gender,
      genderPreference,
    });
    return json({ ok: true });
  }),
});

http.route({
  path: "/matches",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const userId = await authedUserId(ctx, request);
    if (!userId) return unauthorized();
    const matches = await ctx.runQuery(internal.swipes.mutualFor, { userId });
    return json({ matches });
  }),
});

http.route({
  path: "/matches/unread",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const userId = await authedUserId(ctx, request);
    if (!userId) return unauthorized();
    const matches = await ctx.runQuery(internal.notifications.unreadFor, { userId });
    return json({ matches });
  }),
});

http.route({
  path: "/matches/markRead",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const userId = await authedUserId(ctx, request);
    if (!userId) return unauthorized();
    const count = await ctx.runMutation(internal.notifications.markAllRead, { userId });
    return json({ ok: true, count });
  }),
});

export default http;
