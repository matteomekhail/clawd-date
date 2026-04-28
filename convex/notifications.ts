import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const unreadForGithubId = query({
  args: { githubId: v.string() },
  handler: async (ctx, { githubId }) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_github_id", (q) => q.eq("githubId", githubId))
      .first();
    if (!user) return [];

    const items = await ctx.db
      .query("notifications")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    const unread = items.filter((n) => n.readAt === undefined);
    const enriched = [];
    for (const n of unread) {
      const match = await ctx.db.get(n.matchUserId);
      if (match) {
        enriched.push({
          id: n._id,
          username: match.username,
          avatarUrl: match.avatarUrl,
          bio: match.bio,
        });
      }
    }
    return enriched;
  },
});

export const markAllReadForGithubId = mutation({
  args: { githubId: v.string() },
  handler: async (ctx, { githubId }) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_github_id", (q) => q.eq("githubId", githubId))
      .first();
    if (!user) return 0;

    const items = await ctx.db
      .query("notifications")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    const now = Date.now();
    let count = 0;
    for (const n of items) {
      if (n.readAt === undefined) {
        await ctx.db.patch(n._id, { readAt: now });
        count++;
      }
    }
    return count;
  },
});
