import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api } from "./_generated/api";

const http = httpRouter();

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

http.route({
  path: "/ingest",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const body = (await request.json()) as {
      profile: {
        githubId: string;
        username: string;
        avatarUrl?: string;
        bio?: string;
        languages: string[];
        tools: string[];
      };
      sessions: Array<{
        project: string;
        languages: string[];
        tools: string[];
        summary: string;
        occurredAt: number;
      }>;
    };

    const userId = await ctx.runMutation(api.users.upsert, body.profile);
    for (const session of body.sessions ?? []) {
      await ctx.runMutation(api.sessions.record, { ...session, userId });
    }

    return json({ ok: true, userId });
  }),
});

http.route({
  path: "/heartbeat",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const body = (await request.json()) as { githubId: string };
    const userId = await ctx.runMutation(api.users.heartbeat, {
      githubId: body.githubId,
    });
    return json({ ok: true, userId });
  }),
});

http.route({
  path: "/status",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const githubId = new URL(request.url).searchParams.get("githubId");
    if (!githubId) return json({ error: "missing githubId" }, 400);
    const status = await ctx.runQuery(api.status.statusFor, { githubId });
    return json(status);
  }),
});

http.route({
  path: "/discover",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const githubId = new URL(request.url).searchParams.get("githubId");
    if (!githubId) return json({ error: "missing githubId" }, 400);
    const candidates = await ctx.runQuery(api.swipes.discoverFor, { githubId });
    return json({ candidates });
  }),
});

http.route({
  path: "/swipe",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const body = (await request.json()) as {
      githubId: string;
      targetGithubId: string;
      action: "like" | "pass";
    };

    const me = await ctx.runQuery(api.users.byGithubId, {
      githubId: body.githubId,
    });
    const target = await ctx.runQuery(api.users.byGithubId, {
      githubId: body.targetGithubId,
    });
    if (!me || !target) return json({ error: "user not found" }, 404);

    const result = await ctx.runMutation(api.swipes.record, {
      fromUserId: me._id,
      toUserId: target._id,
      action: body.action,
    });

    return json(result);
  }),
});

http.route({
  path: "/matches",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const githubId = new URL(request.url).searchParams.get("githubId");
    if (!githubId) return json({ error: "missing githubId" }, 400);
    const matches = await ctx.runQuery(api.swipes.mutualFor, { githubId });
    return json({ matches });
  }),
});

http.route({
  path: "/matches/unread",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const githubId = new URL(request.url).searchParams.get("githubId");
    if (!githubId) return json({ error: "missing githubId" }, 400);
    const matches = await ctx.runQuery(api.notifications.unreadForGithubId, {
      githubId,
    });
    return json({ matches });
  }),
});

http.route({
  path: "/matches/markRead",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const body = (await request.json()) as { githubId: string };
    const count = await ctx.runMutation(
      api.notifications.markAllReadForGithubId,
      { githubId: body.githubId },
    );
    return json({ ok: true, count });
  }),
});

export default http;
