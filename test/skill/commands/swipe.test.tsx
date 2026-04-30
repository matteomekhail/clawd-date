// @vitest-environment node
import { render } from "ink-testing-library";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

// Mock the api module before importing the component (ESM hoisting via vi.mock).
// Path is resolved relative to THIS test file, not the importer — vitest then
// matches the resolved absolute path against any import in the dep graph.
vi.mock("../../../apps/skill/src/lib/api.js", () => ({
  getDiscover: vi.fn(),
  getMutualMatches: vi.fn(),
  markMatchesRead: vi.fn(),
  postSwipe: vi.fn(),
  UnauthorizedError: class extends Error {},
}));

import { App } from "../../../apps/skill/src/commands/swipe.js";
import * as api from "../../../apps/skill/src/lib/api.js";

const cfg = {
  apiUrl: "https://test.convex.site",
  authToken: "test-token",
  username: "me",
  githubId: "me-gh",
};

const candidate = (overrides: Partial<{ githubId: string; username: string }> = {}) => ({
  id: `id-${overrides.githubId ?? "her"}`,
  githubId: overrides.githubId ?? "her",
  username: overrides.username ?? "her",
  bio: undefined,
  avatarUrl: undefined,
  languages: ["typescript"],
  tools: ["claude"],
  sharedLanguages: ["typescript"],
  sharedTools: [],
  score: 2,
  lastActiveAt: undefined,
});

// Lets useEffect chains + setState resolve before assertions.
const flush = async () => {
  for (let i = 0; i < 3; i++) await new Promise((r) => setTimeout(r, 0));
};

beforeEach(() => {
  vi.mocked(api.getMutualMatches).mockResolvedValue([]);
  vi.mocked(api.markMatchesRead).mockResolvedValue(0);
});

afterEach(() => {
  // resetAllMocks (not clearAllMocks) — the latter only wipes call history,
  // leaving any queued `mockResolvedValueOnce` entries to leak into the next
  // test. resetAllMocks tears down the queued implementations too.
  vi.resetAllMocks();
});

describe("<SwipeApp>", () => {
  test("renders loading then the first candidate's username", async () => {
    vi.mocked(api.getDiscover).mockResolvedValue([candidate({ username: "alice" })]);

    const { lastFrame, unmount } = render(<App cfg={cfg} />);
    expect(lastFrame()).toContain("Loading");

    await flush();
    expect(lastFrame()).toContain("@alice");
    unmount();
  });

  test("pressing 'l' calls postSwipe(like) and advances to the next card", async () => {
    vi.mocked(api.getDiscover).mockResolvedValue([
      candidate({ githubId: "alice", username: "alice" }),
      candidate({ githubId: "bea", username: "bea" }),
    ]);
    vi.mocked(api.postSwipe).mockResolvedValue({ ok: true, mutual: false });

    const { lastFrame, stdin, unmount } = render(<App cfg={cfg} />);
    await flush();
    expect(lastFrame()).toContain("@alice");

    stdin.write("l");
    await flush();

    expect(api.postSwipe).toHaveBeenCalledWith(cfg.apiUrl, cfg.authToken, "alice", "like");
    expect(lastFrame()).toContain("@bea");
    unmount();
  });

  test("pressing 'p' calls postSwipe(pass)", async () => {
    vi.mocked(api.getDiscover).mockResolvedValue([
      candidate({ githubId: "alice" }),
      candidate({ githubId: "bea" }),
    ]);
    vi.mocked(api.postSwipe).mockResolvedValue({ ok: true, mutual: false });

    const { stdin, unmount } = render(<App cfg={cfg} />);
    await flush();

    stdin.write("p");
    await flush();
    expect(api.postSwipe).toHaveBeenCalledWith(cfg.apiUrl, cfg.authToken, "alice", "pass");
    unmount();
  });

  test("mutual match flashes 'It's a match' and increments match counter", async () => {
    // Two candidates: matching on the first leaves us still in the card view
    // (with the flash visible). The empty-deck view drops the flash entirely
    // — testing that path would conflate two behaviors.
    vi.mocked(api.getDiscover).mockResolvedValue([
      candidate({ username: "alice", githubId: "alice" }),
      candidate({ username: "bea", githubId: "bea" }),
    ]);
    vi.mocked(api.postSwipe).mockResolvedValue({ ok: true, mutual: true });

    const { lastFrame, stdin, unmount } = render(<App cfg={cfg} />);
    await flush();
    stdin.write("l");
    await flush();

    expect(lastFrame()).toContain("It's a match with @alice");
    // Match counter rendered in header.
    expect(lastFrame()).toMatch(/💘\s*1/);
    unmount();
  });

  test("409 (incompatible) skips the card and triggers a discover refresh", async () => {
    vi.mocked(api.getDiscover)
      .mockResolvedValueOnce([candidate({ username: "alice" })])
      .mockResolvedValueOnce([candidate({ username: "carol", githubId: "carol" })]);
    vi.mocked(api.postSwipe).mockResolvedValue({
      ok: false,
      skip: "incompatible",
      reason: "incompatible preferences",
    });

    const { lastFrame, stdin, unmount } = render(<App cfg={cfg} />);
    await flush();
    expect(lastFrame()).toContain("@alice");

    stdin.write("l");
    await flush();

    // Both: a flash that mentions the skip, AND a second getDiscover (refresh).
    expect(lastFrame()).toContain("preferences changed");
    expect(api.getDiscover).toHaveBeenCalledTimes(2);
    unmount();
  });

  test("404 (not_found) skips card without refreshing the deck", async () => {
    vi.mocked(api.getDiscover).mockResolvedValue([
      candidate({ githubId: "alice" }),
      candidate({ githubId: "bea" }),
    ]);
    vi.mocked(api.postSwipe).mockResolvedValue({
      ok: false,
      skip: "not_found",
      reason: "user not found",
    });

    const { lastFrame, stdin, unmount } = render(<App cfg={cfg} />);
    await flush();
    stdin.write("l");
    await flush();

    expect(lastFrame()).toContain("Skipped");
    // Initial discover only — no refresh on plain not_found.
    expect(api.getDiscover).toHaveBeenCalledTimes(1);
    unmount();
  });

  test("empty deck shows the no-candidates message", async () => {
    vi.mocked(api.getDiscover).mockResolvedValue([]);
    const { lastFrame, unmount } = render(<App cfg={cfg} />);
    await flush();
    expect(lastFrame()?.toLowerCase()).toMatch(/no.+(devs|candidates|match)/);
    unmount();
  });
});
