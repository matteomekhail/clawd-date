import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api } from "./_generated/api";

const http = httpRouter();

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

    return new Response(JSON.stringify({ ok: true, userId }), {
      headers: { "content-type": "application/json" },
    });
  }),
});

http.route({
  path: "/matches/unread",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const url = new URL(request.url);
    const githubId = url.searchParams.get("githubId");
    if (!githubId) {
      return new Response(JSON.stringify({ error: "missing githubId" }), {
        status: 400,
        headers: { "content-type": "application/json" },
      });
    }
    const matches = await ctx.runQuery(api.notifications.unreadForGithubId, {
      githubId,
    });
    return new Response(JSON.stringify({ matches }), {
      headers: { "content-type": "application/json" },
    });
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
    return new Response(JSON.stringify({ ok: true, count }), {
      headers: { "content-type": "application/json" },
    });
  }),
});

export default http;
