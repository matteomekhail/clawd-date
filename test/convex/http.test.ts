import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import schema from "../../convex/schema";
import { authHeaderFor, seedUser } from "./test-helpers";

const modules = import.meta.glob("../../convex/**/*.*s");

const ME = { githubId: "me-gh", username: "me" };

async function setupMe(t: ReturnType<typeof convexTest>, opts: Parameters<typeof seedUser>[1] = {}) {
  return seedUser(t, { githubId: ME.githubId, username: ME.username, ...opts });
}

describe("auth guard", () => {
  test("requests without bearer token return 401", async () => {
    const t = convexTest(schema, modules);
    const res = await t.fetch("/status", { method: "GET" });
    expect(res.status).toBe(401);
  });

  test("requests with a valid token resolve", async () => {
    const t = convexTest(schema, modules);
    await setupMe(t);
    const res = await t.fetch("/status", {
      method: "GET",
      headers: await authHeaderFor(ME.githubId, ME.username),
    });
    expect(res.status).toBe(200);
  });
});

describe("POST /swipe", () => {
  test("400 on missing targetGithubId", async () => {
    const t = convexTest(schema, modules);
    await setupMe(t);
    const res = await t.fetch("/swipe", {
      method: "POST",
      headers: {
        ...(await authHeaderFor(ME.githubId, ME.username)),
        "content-type": "application/json",
      },
      body: JSON.stringify({ action: "like" }),
    });
    expect(res.status).toBe(400);
  });

  test("400 on invalid action", async () => {
    const t = convexTest(schema, modules);
    await setupMe(t);
    const res = await t.fetch("/swipe", {
      method: "POST",
      headers: {
        ...(await authHeaderFor(ME.githubId, ME.username)),
        "content-type": "application/json",
      },
      body: JSON.stringify({ targetGithubId: "x", action: "maybe" }),
    });
    expect(res.status).toBe(400);
  });

  test("404 on missing target user", async () => {
    const t = convexTest(schema, modules);
    await setupMe(t);
    const res = await t.fetch("/swipe", {
      method: "POST",
      headers: {
        ...(await authHeaderFor(ME.githubId, ME.username)),
        "content-type": "application/json",
      },
      body: JSON.stringify({ targetGithubId: "ghost", action: "like" }),
    });
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body).toEqual({ error: "user not found" });
  });

  test("409 on like with incompatible preferences", async () => {
    const t = convexTest(schema, modules);
    await setupMe(t, { gender: "man", pref: ["woman"] });
    await seedUser(t, { githubId: "him", gender: "man" });

    const res = await t.fetch("/swipe", {
      method: "POST",
      headers: {
        ...(await authHeaderFor(ME.githubId, ME.username)),
        "content-type": "application/json",
      },
      body: JSON.stringify({ targetGithubId: "him", action: "like" }),
    });
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body).toEqual({ error: "incompatible preferences" });
  });

  test("200 with mutual=false on a one-sided like", async () => {
    const t = convexTest(schema, modules);
    await setupMe(t, { gender: "man", pref: ["woman"] });
    await seedUser(t, { githubId: "her", gender: "woman", pref: ["man"] });

    const res = await t.fetch("/swipe", {
      method: "POST",
      headers: {
        ...(await authHeaderFor(ME.githubId, ME.username)),
        "content-type": "application/json",
      },
      body: JSON.stringify({ targetGithubId: "her", action: "like" }),
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ mutual: false });
  });
});

describe("POST /profile", () => {
  test("400 on invalid gender value", async () => {
    const t = convexTest(schema, modules);
    await setupMe(t);
    const res = await t.fetch("/profile", {
      method: "POST",
      headers: {
        ...(await authHeaderFor(ME.githubId, ME.username)),
        "content-type": "application/json",
      },
      body: JSON.stringify({ gender: "robot" }),
    });
    expect(res.status).toBe(400);
  });

  test("400 on invalid genderPreference shape", async () => {
    const t = convexTest(schema, modules);
    await setupMe(t);
    const res = await t.fetch("/profile", {
      method: "POST",
      headers: {
        ...(await authHeaderFor(ME.githubId, ME.username)),
        "content-type": "application/json",
      },
      body: JSON.stringify({ genderPreference: ["man", "robot"] }),
    });
    expect(res.status).toBe(400);
  });

  test("sets gender + preference, persisted across GET", async () => {
    const t = convexTest(schema, modules);
    await setupMe(t);
    const headers = {
      ...(await authHeaderFor(ME.githubId, ME.username)),
      "content-type": "application/json",
    };

    const post = await t.fetch("/profile", {
      method: "POST",
      headers,
      body: JSON.stringify({ gender: "man", genderPreference: ["woman"] }),
    });
    expect(post.status).toBe(200);

    const get = await t.fetch("/profile", { method: "GET", headers });
    expect(await get.json()).toEqual({ gender: "man", genderPreference: ["woman"] });
  });

  test("null gender clears the field", async () => {
    const t = convexTest(schema, modules);
    await setupMe(t, { gender: "man", pref: ["woman"] });
    const headers = {
      ...(await authHeaderFor(ME.githubId, ME.username)),
      "content-type": "application/json",
    };

    const post = await t.fetch("/profile", {
      method: "POST",
      headers,
      body: JSON.stringify({ gender: null }),
    });
    expect(post.status).toBe(200);

    const get = await t.fetch("/profile", { method: "GET", headers });
    // genderPreference unchanged because it wasn't in the body.
    expect(await get.json()).toEqual({ gender: null, genderPreference: ["woman"] });
  });

  test("empty genderPreference [] is treated as null (clears the field)", async () => {
    const t = convexTest(schema, modules);
    await setupMe(t, { gender: "man", pref: ["woman"] });
    const headers = {
      ...(await authHeaderFor(ME.githubId, ME.username)),
      "content-type": "application/json",
    };

    const post = await t.fetch("/profile", {
      method: "POST",
      headers,
      body: JSON.stringify({ genderPreference: [] }),
    });
    expect(post.status).toBe(200);

    const get = await t.fetch("/profile", { method: "GET", headers });
    // myProfile falls back to [] when the field is unset, so observably it
    // looks like a no-op from outside — but the underlying field is now gone.
    expect(await get.json()).toEqual({ gender: "man", genderPreference: [] });
  });

  test("dedupes genderPreference array", async () => {
    const t = convexTest(schema, modules);
    await setupMe(t);
    const headers = {
      ...(await authHeaderFor(ME.githubId, ME.username)),
      "content-type": "application/json",
    };

    await t.fetch("/profile", {
      method: "POST",
      headers,
      body: JSON.stringify({ genderPreference: ["man", "woman", "man"] }),
    });

    const get = await t.fetch("/profile", { method: "GET", headers });
    const body = (await get.json()) as { genderPreference: string[] };
    // Order is irrelevant; just no duplicates.
    expect([...body.genderPreference].sort()).toEqual(["man", "woman"]);
  });
});

describe("GET /discover", () => {
  test("returns only compatible non-self users", async () => {
    const t = convexTest(schema, modules);
    await setupMe(t, { gender: "man", pref: ["woman"] });
    await seedUser(t, { githubId: "her", gender: "woman", pref: ["man"] });
    await seedUser(t, { githubId: "him", gender: "man" });

    const res = await t.fetch("/discover", {
      method: "GET",
      headers: await authHeaderFor(ME.githubId, ME.username),
    });
    expect(res.status).toBe(200);
    const { candidates } = (await res.json()) as { candidates: Array<{ githubId: string }> };
    expect(candidates.map((c) => c.githubId)).toEqual(["her"]);
  });
});

describe("POST /heartbeat", () => {
  test("updates lastActiveAt", async () => {
    const t = convexTest(schema, modules);
    const userId = await setupMe(t);
    const before = await t.run((ctx) => ctx.db.get(userId));
    expect(before?.lastActiveAt).toBeUndefined();

    const res = await t.fetch("/heartbeat", {
      method: "POST",
      headers: await authHeaderFor(ME.githubId, ME.username),
    });
    expect(res.status).toBe(200);

    const after = await t.run((ctx) => ctx.db.get(userId));
    expect(typeof after?.lastActiveAt).toBe("number");
  });
});
