import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    githubId: v.string(),
    username: v.string(),
    avatarUrl: v.optional(v.string()),
    bio: v.optional(v.string()),
    languages: v.array(v.string()),
    tools: v.array(v.string()),
  }).index("by_github_id", ["githubId"]),

  sessions: defineTable({
    userId: v.id("users"),
    project: v.string(),
    languages: v.array(v.string()),
    tools: v.array(v.string()),
    summary: v.string(),
    occurredAt: v.number(),
  }).index("by_user", ["userId"]),

  likes: defineTable({
    fromUserId: v.id("users"),
    toUserId: v.id("users"),
  })
    .index("by_from", ["fromUserId"])
    .index("by_to", ["toUserId"])
    .index("by_pair", ["fromUserId", "toUserId"]),
});
