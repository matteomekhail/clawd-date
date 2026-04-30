import { v } from "convex/values";
import { internalMutation } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

const FAKES: Array<{
  githubId: string;
  username: string;
  bio: string;
  avatarUrl: string;
  languages: string[];
  tools: string[];
}> = [
  {
    githubId: "seed-1001",
    username: "ada-byte",
    bio: "FE infra at a stealth devtool. Convex+Next forever.",
    avatarUrl: "https://avatars.githubusercontent.com/u/1?v=4",
    languages: ["TypeScript", "Python"],
    tools: ["Next.js", "Convex", "Tailwind"],
  },
  {
    githubId: "seed-1002",
    username: "rustacean-rin",
    bio: "Ex-Cloudflare. Loves Rust and writing CLIs no one asked for.",
    avatarUrl: "https://avatars.githubusercontent.com/u/2?v=4",
    languages: ["Rust", "TypeScript"],
    tools: ["Tauri", "Vite"],
  },
  {
    githubId: "seed-1003",
    username: "leo-shipper",
    bio: "Ships TS prototypes faster than coffee gets cold.",
    avatarUrl: "https://avatars.githubusercontent.com/u/3?v=4",
    languages: ["TypeScript", "Go"],
    tools: ["Next.js", "tRPC", "Postgres"],
  },
  {
    githubId: "seed-1004",
    username: "moss-the-greybeard",
    bio: "20y in Python. Reluctantly learning TS for the bag.",
    avatarUrl: "https://avatars.githubusercontent.com/u/4?v=4",
    languages: ["Python", "TypeScript"],
    tools: ["FastAPI", "Postgres"],
  },
  {
    githubId: "seed-1005",
    username: "sora-tinkers",
    bio: "Indie hacker. Three half-finished SaaS, one cat.",
    avatarUrl: "https://avatars.githubusercontent.com/u/5?v=4",
    languages: ["TypeScript"],
    tools: ["Convex", "Next.js"],
  },
];

export const dev = internalMutation({
  args: { likeMeGithubId: v.string() },
  handler: async (ctx, { likeMeGithubId }) => {
    const me = await ctx.db
      .query("users")
      .withIndex("by_github_id", (q) => q.eq("githubId", likeMeGithubId))
      .first();
    if (!me) {
      throw new Error(
        `User with githubId=${likeMeGithubId} not found — run \`clawd-date init\` then start a Claude Code session so the SessionEnd hook ingests you.`,
      );
    }

    const created: string[] = [];
    const reused: string[] = [];
    const liked: string[] = [];

    for (const f of FAKES) {
      const existing = await ctx.db
        .query("users")
        .withIndex("by_github_id", (q) => q.eq("githubId", f.githubId))
        .first();

      let fakeId: Id<"users">;
      if (existing) {
        await ctx.db.patch(existing._id, {
          username: f.username,
          bio: f.bio,
          avatarUrl: f.avatarUrl,
          languages: f.languages,
          tools: f.tools,
          lastActiveAt: Date.now(),
        });
        fakeId = existing._id;
        reused.push(f.username);
      } else {
        fakeId = await ctx.db.insert("users", {
          githubId: f.githubId,
          username: f.username,
          bio: f.bio,
          avatarUrl: f.avatarUrl,
          languages: f.languages,
          tools: f.tools,
          lastActiveAt: Date.now(),
        });
        created.push(f.username);
      }

      const already = await ctx.db
        .query("swipes")
        .withIndex("by_pair", (q) =>
          q.eq("fromUserId", fakeId).eq("toUserId", me._id),
        )
        .first();
      if (!already) {
        await ctx.db.insert("swipes", {
          fromUserId: fakeId,
          toUserId: me._id,
          action: "like",
        });
        liked.push(f.username);
      }
    }

    return { created, reused, liked, total: FAKES.length };
  },
});

export const wipe = internalMutation({
  args: {},
  handler: async (ctx) => {
    const fakes = [];
    for (const f of FAKES) {
      const u = await ctx.db
        .query("users")
        .withIndex("by_github_id", (q) => q.eq("githubId", f.githubId))
        .first();
      if (u) fakes.push(u._id);
    }
    let removedSwipes = 0;
    let removedNotifs = 0;
    for (const id of fakes) {
      const fromSwipes = await ctx.db
        .query("swipes")
        .withIndex("by_from", (q) => q.eq("fromUserId", id))
        .collect();
      for (const s of fromSwipes) {
        await ctx.db.delete(s._id);
        removedSwipes++;
      }
      const allSwipes = await ctx.db.query("swipes").collect();
      for (const s of allSwipes) {
        if (s.toUserId === id) {
          await ctx.db.delete(s._id);
          removedSwipes++;
        }
      }
      const notifs = await ctx.db.query("notifications").collect();
      for (const n of notifs) {
        if (n.userId === id || n.matchUserId === id) {
          await ctx.db.delete(n._id);
          removedNotifs++;
        }
      }
      await ctx.db.delete(id);
    }
    return { removedUsers: fakes.length, removedSwipes, removedNotifs };
  },
});
