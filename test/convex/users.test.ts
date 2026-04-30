import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { internal } from "../../convex/_generated/api";
import schema from "../../convex/schema";

// convex-test resolves the Convex modules root by walking up from each
// matched file until it finds `_generated/` — so the glob must point at
// the real source tree, not at this test directory.
const modules = import.meta.glob("../../convex/**/*.*s");

const seedUser = async (
  t: ReturnType<typeof convexTest>,
  overrides: { githubId?: string; gender?: "man" | "woman" | "other"; pref?: Array<"man" | "woman" | "other"> } = {},
) => {
  return await t.run(async (ctx) => {
    return ctx.db.insert("users", {
      githubId: overrides.githubId ?? "gh-default",
      username: "alice",
      languages: [],
      tools: [],
      ...(overrides.gender !== undefined ? { gender: overrides.gender } : {}),
      ...(overrides.pref !== undefined ? { genderPreference: overrides.pref } : {}),
    });
  });
};

describe("setPreferences", () => {
  test("sets both fields when missing", async () => {
    const t = convexTest(schema, modules);
    const userId = await seedUser(t);

    await t.mutation(internal.users.setPreferences, {
      userId,
      gender: "man",
      genderPreference: ["woman"],
    });

    const user = await t.run((ctx) => ctx.db.get(userId));
    expect(user?.gender).toBe("man");
    expect(user?.genderPreference).toEqual(["woman"]);
  });

  test("undefined leaves existing fields unchanged", async () => {
    const t = convexTest(schema, modules);
    const userId = await seedUser(t, { gender: "woman", pref: ["man"] });

    // Touch only one field — the other must survive.
    await t.mutation(internal.users.setPreferences, {
      userId,
      gender: "other",
    });

    const user = await t.run((ctx) => ctx.db.get(userId));
    expect(user?.gender).toBe("other");
    expect(user?.genderPreference).toEqual(["man"]);
  });

  test("null on gender clears the field", async () => {
    const t = convexTest(schema, modules);
    const userId = await seedUser(t, { gender: "man", pref: ["woman"] });

    await t.mutation(internal.users.setPreferences, {
      userId,
      gender: null,
    });

    const user = await t.run((ctx) => ctx.db.get(userId));
    expect(user?.gender).toBeUndefined();
    expect(user?.genderPreference).toEqual(["woman"]);
  });

  test("null on genderPreference clears the field", async () => {
    const t = convexTest(schema, modules);
    const userId = await seedUser(t, { gender: "man", pref: ["woman"] });

    await t.mutation(internal.users.setPreferences, {
      userId,
      genderPreference: null,
    });

    const user = await t.run((ctx) => ctx.db.get(userId));
    expect(user?.gender).toBe("man");
    expect(user?.genderPreference).toBeUndefined();
  });

  test("clearing both at once works", async () => {
    const t = convexTest(schema, modules);
    const userId = await seedUser(t, { gender: "man", pref: ["woman"] });

    await t.mutation(internal.users.setPreferences, {
      userId,
      gender: null,
      genderPreference: null,
    });

    const user = await t.run((ctx) => ctx.db.get(userId));
    expect(user?.gender).toBeUndefined();
    expect(user?.genderPreference).toBeUndefined();
  });
});

describe("myProfile", () => {
  test("returns gender:null + empty array when unset", async () => {
    const t = convexTest(schema, modules);
    const userId = await seedUser(t);

    const profile = await t.query(internal.users.myProfile, { userId });
    expect(profile).toEqual({ gender: null, genderPreference: [] });
  });
});
