import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";

export const byId = internalQuery({
  args: { userId: v.id("users") },
  handler: (ctx, { userId }) => ctx.db.get(userId),
});

export const updateProfile = internalMutation({
  args: {
    userId: v.id("users"),
    languages: v.array(v.string()),
    tools: v.array(v.string()),
    bio: v.optional(v.string()),
  },
  handler: async (ctx, { userId, languages, tools, bio }) => {
    const patch: Record<string, unknown> = { languages, tools };
    if (bio !== undefined) patch.bio = bio;
    await ctx.db.patch(userId, patch);
    return userId;
  },
});

export const heartbeat = internalMutation({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    await ctx.db.patch(userId, { lastActiveAt: Date.now() });
    return userId;
  },
});
