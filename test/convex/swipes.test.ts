import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { internal } from "../../convex/_generated/api";
import schema from "../../convex/schema";
import type { Id } from "../../convex/_generated/dataModel";

const modules = import.meta.glob("../../convex/**/*.*s");

type Gender = "man" | "woman" | "other";

async function seed(
  t: ReturnType<typeof convexTest>,
  attrs: { githubId: string; gender?: Gender; pref?: Gender[] },
): Promise<Id<"users">> {
  return await t.run(async (ctx) => {
    return ctx.db.insert("users", {
      githubId: attrs.githubId,
      username: attrs.githubId,
      languages: [],
      tools: [],
      ...(attrs.gender !== undefined ? { gender: attrs.gender } : {}),
      ...(attrs.pref !== undefined ? { genderPreference: attrs.pref } : {}),
    });
  });
}

describe("recordByGithubId", () => {
  test("like on a compatible target → ok, mutual=false", async () => {
    const t = convexTest(schema, modules);
    const me = await seed(t, { githubId: "me", gender: "man", pref: ["woman"] });
    await seed(t, { githubId: "her", gender: "woman", pref: ["man"] });

    const r = await t.mutation(internal.swipes.recordByGithubId, {
      fromUserId: me,
      targetGithubId: "her",
      action: "like",
    });
    expect(r).toEqual({ ok: true, mutual: false });
  });

  test("like on incompatible target → code:incompatible", async () => {
    const t = convexTest(schema, modules);
    const me = await seed(t, { githubId: "me", gender: "man", pref: ["woman"] });
    await seed(t, { githubId: "him", gender: "man" });

    const r = await t.mutation(internal.swipes.recordByGithubId, {
      fromUserId: me,
      targetGithubId: "him",
      action: "like",
    });
    expect(r).toEqual({
      ok: false,
      code: "incompatible",
      reason: "incompatible preferences",
    });
  });

  test("pass on incompatible target → still ok (the harmless-cleanup rule)", async () => {
    const t = convexTest(schema, modules);
    const me = await seed(t, { githubId: "me", gender: "man", pref: ["woman"] });
    await seed(t, { githubId: "him", gender: "man" });

    const r = await t.mutation(internal.swipes.recordByGithubId, {
      fromUserId: me,
      targetGithubId: "him",
      action: "pass",
    });
    expect(r).toEqual({ ok: true, mutual: false });
  });

  test("like on missing target → not found", async () => {
    const t = convexTest(schema, modules);
    const me = await seed(t, { githubId: "me" });

    const r = await t.mutation(internal.swipes.recordByGithubId, {
      fromUserId: me,
      targetGithubId: "ghost",
      action: "like",
    });
    expect(r).toEqual({
      ok: false,
      code: "not_found",
      reason: "user not found",
    });
  });

  test("self-like → code:self", async () => {
    const t = convexTest(schema, modules);
    const me = await seed(t, { githubId: "me" });

    const r = await t.mutation(internal.swipes.recordByGithubId, {
      fromUserId: me,
      targetGithubId: "me",
      action: "like",
    });
    expect(r).toEqual({
      ok: false,
      code: "self",
      reason: "cannot swipe self",
    });
  });

  test("mutual likes create reciprocal notifications exactly once", async () => {
    const t = convexTest(schema, modules);
    const me = await seed(t, { githubId: "me", gender: "man", pref: ["woman"] });
    const her = await seed(t, { githubId: "her", gender: "woman", pref: ["man"] });

    // She likes me first.
    await t.mutation(internal.swipes.recordByGithubId, {
      fromUserId: her,
      targetGithubId: "me",
      action: "like",
    });

    // I like her back → mutual.
    const r = await t.mutation(internal.swipes.recordByGithubId, {
      fromUserId: me,
      targetGithubId: "her",
      action: "like",
    });
    expect(r).toEqual({ ok: true, mutual: true });

    const notifs = await t.run((ctx) => ctx.db.query("notifications").collect());
    expect(notifs).toHaveLength(2);
    expect(notifs.map((n) => n.userId).sort()).toEqual([me, her].sort());

    // Re-liking shouldn't double-insert notifications.
    await t.mutation(internal.swipes.recordByGithubId, {
      fromUserId: me,
      targetGithubId: "her",
      action: "like",
    });
    const after = await t.run((ctx) => ctx.db.query("notifications").collect());
    expect(after).toHaveLength(2);
  });
});

describe("discoverFor", () => {
  test("excludes self, swiped, and incompatible candidates", async () => {
    const t = convexTest(schema, modules);
    const me = await seed(t, { githubId: "me", gender: "man", pref: ["woman"] });
    const compat = await seed(t, { githubId: "compat", gender: "woman", pref: ["man"] });
    await seed(t, { githubId: "incompat-gender", gender: "man" });
    const swiped = await seed(t, { githubId: "swiped", gender: "woman", pref: ["man"] });

    // Me passes on `swiped` so they should be filtered out.
    await t.run(async (ctx) => {
      await ctx.db.insert("swipes", {
        fromUserId: me,
        toUserId: swiped,
        action: "pass",
      });
    });

    const candidates = await t.query(internal.swipes.discoverFor, { userId: me });
    const ids = candidates.map((c) => c.githubId);
    expect(ids).toEqual(["compat"]);
    // Sanity: own user is never returned.
    expect(ids).not.toContain("me");
    expect(candidates[0]?.id).toBe(compat);
  });

  test("returns no candidates when database is empty besides self", async () => {
    const t = convexTest(schema, modules);
    const me = await seed(t, { githubId: "me" });
    const candidates = await t.query(internal.swipes.discoverFor, { userId: me });
    expect(candidates).toEqual([]);
  });
});
