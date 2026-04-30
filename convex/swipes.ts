import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";
import { isCompatible } from "./preferences";

const swipeAction = v.union(v.literal("like"), v.literal("pass"));

export const recordByGithubId = internalMutation({
  args: {
    fromUserId: v.id("users"),
    targetGithubId: v.string(),
    action: swipeAction,
  },
  handler: async (ctx, { fromUserId, targetGithubId, action }) => {
    const target = await ctx.db
      .query("users")
      .withIndex("by_github_id", (q) => q.eq("githubId", targetGithubId))
      .first();
    if (!target)
      return { ok: false as const, code: "not_found" as const, reason: "user not found" };
    if (target._id === fromUserId)
      return { ok: false as const, code: "self" as const, reason: "cannot swipe self" };

    const toUserId = target._id;

    const existing = await ctx.db
      .query("swipes")
      .withIndex("by_pair", (q) =>
        q.eq("fromUserId", fromUserId).eq("toUserId", toUserId),
      )
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, { action });
    } else {
      await ctx.db.insert("swipes", { fromUserId, toUserId, action });
    }

    if (action !== "like") return { ok: true as const, mutual: false };

    // Compatibility is enforced only on `like`: a pass is harmless cleanup
    // even on a stale-deck card that became incompatible, and shouldn't
    // dead-end the swipe TUI. A like that would create a match must still
    // respect both sides' current preferences.
    const me = await ctx.db.get(fromUserId);
    if (!me)
      return { ok: false as const, code: "not_found" as const, reason: "user not found" };
    if (!isCompatible(me, target)) {
      return {
        ok: false as const,
        code: "incompatible" as const,
        reason: "incompatible preferences",
      };
    }

    const reciprocal = await ctx.db
      .query("swipes")
      .withIndex("by_pair", (q) =>
        q.eq("fromUserId", toUserId).eq("toUserId", fromUserId),
      )
      .first();

    if (!reciprocal || reciprocal.action !== "like") {
      return { ok: true as const, mutual: false };
    }

    const existingNotif = await ctx.db
      .query("notifications")
      .withIndex("by_user", (q) => q.eq("userId", fromUserId))
      .filter((q) => q.eq(q.field("matchUserId"), toUserId))
      .first();
    if (!existingNotif) {
      await ctx.db.insert("notifications", {
        userId: fromUserId,
        matchUserId: toUserId,
      });
      await ctx.db.insert("notifications", {
        userId: toUserId,
        matchUserId: fromUserId,
      });
    }

    return { ok: true as const, mutual: true };
  },
});

export const discoverFor = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const me = await ctx.db.get(userId);
    if (!me) return [];

    const swiped = await ctx.db
      .query("swipes")
      .withIndex("by_from", (q) => q.eq("fromUserId", me._id))
      .collect();
    const swipedIds = new Set(swiped.map((s) => s.toUserId));

    const everyone = await ctx.db.query("users").take(200);
    const myLangs = new Set(me.languages);
    const myTools = new Set(me.tools);

    const ranked: Array<{
      id: string;
      githubId: string;
      username: string;
      avatarUrl?: string;
      bio?: string;
      languages: string[];
      tools: string[];
      sharedLanguages: string[];
      sharedTools: string[];
      score: number;
      lastActiveAt?: number;
    }> = [];

    for (const u of everyone) {
      if (u._id === me._id || swipedIds.has(u._id)) continue;
      if (!isCompatible(me, u)) continue;
      const sharedLanguages = u.languages.filter((l) => myLangs.has(l));
      const sharedTools = u.tools.filter((t) => myTools.has(t));
      ranked.push({
        id: u._id,
        githubId: u.githubId,
        username: u.username,
        avatarUrl: u.avatarUrl,
        bio: u.bio,
        languages: u.languages,
        tools: u.tools,
        sharedLanguages,
        sharedTools,
        score: sharedLanguages.length * 2 + sharedTools.length,
        lastActiveAt: u.lastActiveAt,
      });
    }

    ranked.sort((a, b) => b.score - a.score);
    return ranked.slice(0, 50);
  },
});

export const mutualFor = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const me = await ctx.db.get(userId);
    if (!me) return [];

    const myLikes = await ctx.db
      .query("swipes")
      .withIndex("by_from", (q) => q.eq("fromUserId", me._id))
      .collect();

    const result = [];
    for (const swipe of myLikes) {
      if (swipe.action !== "like") continue;
      const reciprocal = await ctx.db
        .query("swipes")
        .withIndex("by_pair", (q) =>
          q.eq("fromUserId", swipe.toUserId).eq("toUserId", me._id),
        )
        .first();
      if (!reciprocal || reciprocal.action !== "like") continue;
      const other = await ctx.db.get(swipe.toUserId);
      if (other) {
        result.push({
          id: other._id,
          githubId: other.githubId,
          username: other.username,
          avatarUrl: other.avatarUrl,
          bio: other.bio,
          languages: other.languages,
          tools: other.tools,
          lastActiveAt: other.lastActiveAt,
        });
      }
    }
    return result;
  },
});
