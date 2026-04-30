import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";

export const record = internalMutation({
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

export const forUser = internalQuery({
  args: { userId: v.id("users") },
  handler: (ctx, { userId }) =>
    ctx.db
      .query("sessions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .take(50),
});
