import { v } from "convex/values";
import { query } from "./_generated/server";

const ACTIVE_WINDOW_MS = 5 * 60 * 1000;

export const statusFor = query({
  args: { githubId: v.string() },
  handler: async (ctx, { githubId }) => {
    const empty = {
      unreadMatches: 0,
      unreadUsernames: [] as string[],
      candidates: 0,
      activeCandidates: [] as string[],
      activeMatches: [] as string[],
      mutualMatches: 0,
    };

    const me = await ctx.db
      .query("users")
      .withIndex("by_github_id", (q) => q.eq("githubId", githubId))
      .first();
    if (!me) return empty;

    const now = Date.now();
    const isActive = (u: { lastActiveAt?: number }) =>
      (u.lastActiveAt ?? 0) >= now - ACTIVE_WINDOW_MS;

    const unread = await ctx.db
      .query("notifications")
      .withIndex("by_user", (q) => q.eq("userId", me._id))
      .collect();
    const pendingNotifs = unread.filter((n) => n.readAt === undefined);
    const unreadUsernames: string[] = [];
    for (const n of pendingNotifs.slice(0, 5)) {
      const u = await ctx.db.get(n.matchUserId);
      if (u) unreadUsernames.push(u.username);
    }

    const swiped = await ctx.db
      .query("swipes")
      .withIndex("by_from", (q) => q.eq("fromUserId", me._id))
      .collect();
    const swipedSet = new Set(swiped.map((s) => s.toUserId));

    const everyone = await ctx.db.query("users").take(200);
    const candidates = everyone.filter(
      (u) => u._id !== me._id && !swipedSet.has(u._id),
    );

    const myLikes = swiped.filter((s) => s.action === "like");
    const mutualUserIds: Array<typeof me._id> = [];
    for (const swipe of myLikes) {
      const reciprocal = await ctx.db
        .query("swipes")
        .withIndex("by_pair", (q) =>
          q.eq("fromUserId", swipe.toUserId).eq("toUserId", me._id),
        )
        .first();
      if (reciprocal && reciprocal.action === "like") {
        mutualUserIds.push(swipe.toUserId);
      }
    }

    const activeCandidates: string[] = [];
    for (const c of candidates) {
      if (isActive(c)) activeCandidates.push(c.username);
    }

    const activeMatches: string[] = [];
    for (const id of mutualUserIds) {
      const u = await ctx.db.get(id);
      if (u && isActive(u)) activeMatches.push(u.username);
    }

    return {
      unreadMatches: pendingNotifs.length,
      unreadUsernames,
      candidates: candidates.length,
      activeCandidates: activeCandidates.slice(0, 3),
      activeMatches: activeMatches.slice(0, 3),
      mutualMatches: mutualUserIds.length,
    };
  },
});
