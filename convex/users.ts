import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";
import { type Gender, genderValidator } from "./preferences";

export const byId = internalQuery({
  args: { userId: v.id("users") },
  handler: (ctx, { userId }) => ctx.db.get(userId),
});

export const myProfile = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const user = await ctx.db.get(userId);
    if (!user) return null;
    return {
      gender: user.gender ?? null,
      genderPreference: user.genderPreference ?? [],
    };
  },
});

export const setPreferences = internalMutation({
  args: {
    userId: v.id("users"),
    // null = explicit clear; undefined = leave unchanged. Patching the field
    // to `undefined` removes it from the doc (it is `v.optional` in schema).
    gender: v.optional(v.union(genderValidator, v.null())),
    genderPreference: v.optional(v.union(v.array(genderValidator), v.null())),
  },
  handler: async (ctx, { userId, gender, genderPreference }) => {
    if (gender === undefined && genderPreference === undefined) return userId;
    const patch: { gender?: Gender; genderPreference?: Gender[] } = {};
    if (gender !== undefined) patch.gender = gender === null ? undefined : gender;
    if (genderPreference !== undefined) {
      patch.genderPreference = genderPreference === null ? undefined : genderPreference;
    }
    await ctx.db.patch(userId, patch);
    return userId;
  },
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
