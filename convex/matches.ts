import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const like = mutation({
  args: { fromUserId: v.id("users"), toUserId: v.id("users") },
  handler: async (ctx, { fromUserId, toUserId }) => {
    const existing = await ctx.db
      .query("likes")
      .withIndex("by_pair", (q) =>
        q.eq("fromUserId", fromUserId).eq("toUserId", toUserId),
      )
      .first();
    if (existing) return existing._id;

    const likeId = await ctx.db.insert("likes", { fromUserId, toUserId });

    const reciprocal = await ctx.db
      .query("likes")
      .withIndex("by_pair", (q) =>
        q.eq("fromUserId", toUserId).eq("toUserId", fromUserId),
      )
      .first();
    if (reciprocal) {
      await ctx.db.insert("notifications", {
        userId: fromUserId,
        matchUserId: toUserId,
      });
      await ctx.db.insert("notifications", {
        userId: toUserId,
        matchUserId: fromUserId,
      });
    }

    return likeId;
  },
});

export const mutual = query({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const myLikes = await ctx.db
      .query("likes")
      .withIndex("by_from", (q) => q.eq("fromUserId", userId))
      .collect();

    const result = [];
    for (const like of myLikes) {
      const reciprocal = await ctx.db
        .query("likes")
        .withIndex("by_pair", (q) =>
          q.eq("fromUserId", like.toUserId).eq("toUserId", userId),
        )
        .first();
      if (reciprocal) {
        const other = await ctx.db.get(like.toUserId);
        if (other) result.push(other);
      }
    }
    return result;
  },
});
