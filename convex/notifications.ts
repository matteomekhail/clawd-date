import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";

export const unreadFor = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const items = await ctx.db
      .query("notifications")
      .withIndex("by_user", (q) => q.eq("userId", userId))
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

export const markAllRead = internalMutation({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const items = await ctx.db
      .query("notifications")
      .withIndex("by_user", (q) => q.eq("userId", userId))
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
