// @vitest-environment node
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import {
  UnauthorizedError,
  getDiscover,
  getProfile,
  getStatus,
  postProfile,
  postSwipe,
} from "../../../apps/skill/src/lib/api";

const API = "https://test.convex.site";
const TOKEN = "test-jwt";

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function lastCall(): { url: string; init: RequestInit } {
  const [url, init] = fetchMock.mock.calls.at(-1) as [string, RequestInit];
  return { url, init };
}

describe("postSwipe", () => {
  test("200 → ok:true with mutual flag", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ mutual: true }));

    const result = await postSwipe(API, TOKEN, "her", "like");
    expect(result).toEqual({ ok: true, mutual: true });

    const call = lastCall();
    expect(call.url).toBe(`${API}/swipe`);
    expect(call.init.method).toBe("POST");
    const headers = call.init.headers as Record<string, string>;
    expect(headers.authorization).toBe(`Bearer ${TOKEN}`);
    expect(headers["content-type"]).toBe("application/json");
    expect(JSON.parse(call.init.body as string)).toEqual({
      targetGithubId: "her",
      action: "like",
    });
  });

  test("409 → ok:false with skip:incompatible", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ error: "incompatible preferences" }, 409));

    const result = await postSwipe(API, TOKEN, "him", "like");
    expect(result).toEqual({
      ok: false,
      skip: "incompatible",
      reason: "incompatible preferences",
    });
  });

  test("404 → ok:false with skip:not_found", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ error: "user not found" }, 404));

    const result = await postSwipe(API, TOKEN, "ghost", "like");
    expect(result).toEqual({
      ok: false,
      skip: "not_found",
      reason: "user not found",
    });
  });

  test("401 → throws UnauthorizedError", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ error: "unauthorized" }, 401));
    await expect(postSwipe(API, TOKEN, "x", "like")).rejects.toBeInstanceOf(UnauthorizedError);
  });

  test("500 → throws generic Error", async () => {
    fetchMock.mockResolvedValue(new Response("boom", { status: 500 }));
    await expect(postSwipe(API, TOKEN, "x", "like")).rejects.toThrow(/swipe failed: 500/);
  });

  test("trims trailing slash from apiUrl", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ mutual: false }));
    await postSwipe(`${API}/`, TOKEN, "x", "like");
    expect(lastCall().url).toBe(`${API}/swipe`);
  });
});

describe("postProfile", () => {
  test("sends null in body when clearing", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ ok: true }));
    await postProfile(API, TOKEN, { gender: null });
    expect(JSON.parse(lastCall().init.body as string)).toEqual({ gender: null });
  });

  test("sends only provided fields (omits undefined)", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ ok: true }));
    await postProfile(API, TOKEN, { genderPreference: ["woman"] });
    const body = JSON.parse(lastCall().init.body as string);
    expect(body).toEqual({ genderPreference: ["woman"] });
    expect("gender" in body).toBe(false);
  });
});

describe("getDiscover", () => {
  test("returns parsed candidates array", async () => {
    const candidate = {
      id: "u1",
      githubId: "g1",
      username: "alice",
      languages: ["ts"],
      tools: ["claude"],
      sharedLanguages: ["ts"],
      sharedTools: [],
      score: 2,
    };
    fetchMock.mockResolvedValue(jsonResponse({ candidates: [candidate] }));

    const result = await getDiscover(API, TOKEN);
    expect(result).toEqual([candidate]);

    const call = lastCall();
    expect(call.url).toBe(`${API}/discover`);
    const headers = call.init.headers as Record<string, string>;
    expect(headers.authorization).toBe(`Bearer ${TOKEN}`);
  });

  test("401 → throws UnauthorizedError (not generic)", async () => {
    fetchMock.mockResolvedValue(new Response("nope", { status: 401 }));
    await expect(getDiscover(API, TOKEN)).rejects.toBeInstanceOf(UnauthorizedError);
  });
});

describe("getStatus + getProfile", () => {
  test("getStatus returns parsed body and forwards AbortSignal", async () => {
    const status = {
      unreadMatches: 1,
      unreadUsernames: ["alice"],
      candidates: 5,
      activeCandidates: ["alice"],
      activeMatches: [],
      mutualMatches: 1,
    };
    fetchMock.mockResolvedValue(jsonResponse(status));

    const ac = new AbortController();
    const result = await getStatus(API, TOKEN, ac.signal);
    expect(result).toEqual(status);
    expect(lastCall().init.signal).toBe(ac.signal);
  });

  test("getProfile returns gender + array shape", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ gender: null, genderPreference: [] }));
    const result = await getProfile(API, TOKEN);
    expect(result).toEqual({ gender: null, genderPreference: [] });
  });
});
