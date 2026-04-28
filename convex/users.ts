import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const byGithubId = query({
  args: { githubId: v.string() },
  handler: (ctx, { githubId }) =>
    ctx.db
      .query("users")
      .withIndex("by_github_id", (q) => q.eq("githubId", githubId))
      .first(),
});

export const upsert = mutation({
  args: {
    githubId: v.string(),
    username: v.string(),
    avatarUrl: v.optional(v.string()),
    bio: v.optional(v.string()),
    languages: v.array(v.string()),
    tools: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("users")
      .withIndex("by_github_id", (q) => q.eq("githubId", args.githubId))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, args);
      return existing._id;
    }
    return ctx.db.insert("users", args);
  },
});

export const list = query({
  args: {},
  handler: (ctx) => ctx.db.query("users").take(50),
});
