import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { genderValidator } from "./preferences";

export default defineSchema({
  users: defineTable({
    githubId: v.string(),
    username: v.string(),
    avatarUrl: v.optional(v.string()),
    bio: v.optional(v.string()),
    languages: v.array(v.string()),
    tools: v.array(v.string()),
    lastActiveAt: v.optional(v.number()),
    gender: v.optional(genderValidator),
    genderPreference: v.optional(v.array(genderValidator)),
  }).index("by_github_id", ["githubId"]),

  sessions: defineTable({
    userId: v.id("users"),
    project: v.string(),
    languages: v.array(v.string()),
    tools: v.array(v.string()),
    summary: v.string(),
    occurredAt: v.number(),
  }).index("by_user", ["userId"]),

  swipes: defineTable({
    fromUserId: v.id("users"),
    toUserId: v.id("users"),
    action: v.union(v.literal("like"), v.literal("pass")),
  })
    .index("by_from", ["fromUserId"])
    .index("by_pair", ["fromUserId", "toUserId"]),

  notifications: defineTable({
    userId: v.id("users"),
    matchUserId: v.id("users"),
    readAt: v.optional(v.number()),
  }).index("by_user", ["userId"]),
});
