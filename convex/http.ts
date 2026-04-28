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

export default http;
