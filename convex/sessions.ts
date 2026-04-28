import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const record = mutation({
  args: {
    userId: v.id("users"),
    project: v.string(),
    languages: v.array(v.string()),
    tools: v.array(v.string()),
    summary: v.string(),
    occurredAt: v.number(),
  },
  handler: (ctx, args) => ctx.db.insert("sessions", args),
});

export const forUser = query({
  args: { userId: v.id("users") },
  handler: (ctx, { userId }) =>
    ctx.db
      .query("sessions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .take(50),
});
