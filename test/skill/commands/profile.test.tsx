// @vitest-environment node
import { render } from "ink-testing-library";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../../../apps/skill/src/lib/api.js", () => ({
  getProfile: vi.fn(),
  postProfile: vi.fn(),
}));

import { App } from "../../../apps/skill/src/commands/profile.js";
import * as api from "../../../apps/skill/src/lib/api.js";

const cfg = {
  apiUrl: "https://test.convex.site",
  authToken: "test-token",
  username: "me",
  githubId: "me-gh",
};

const flush = async () => {
  for (let i = 0; i < 3; i++) await new Promise((r) => setTimeout(r, 0));
};

beforeEach(() => {
  vi.mocked(api.getProfile).mockResolvedValue({ gender: null, genderPreference: [] });
  vi.mocked(api.postProfile).mockResolvedValue();
});

afterEach(() => {
  // See swipe.test.tsx for why this is reset, not clear.
  vi.resetAllMocks();
});

describe("<ProfileApp>", () => {
  test("loads existing profile and shows the gender picker", async () => {
    const { lastFrame, unmount } = render(<App cfg={cfg} />);
    expect(lastFrame()).toContain("Loading");

    await flush();
    const frame = lastFrame() ?? "";
    expect(frame).toContain("I am a…");
    expect(frame).toContain("Man");
    expect(frame).toContain("Woman");
    expect(frame).toContain("Other");
    unmount();
  });

  test("save flow: pick gender → pick preference → postProfile called with both", async () => {
    const { lastFrame, stdin, unmount } = render(<App cfg={cfg} />);
    await flush();

    // Move cursor down to "Man" (index 0 starts at -1, one ↓ lands on 0).
    stdin.write("[B");
    await flush();
    // Confirm gender → preference step.
    stdin.write("\r");
    await flush();
    expect(lastFrame()).toContain("Show me…");

    // Cursor starts at index 0 ("Man"). Move down twice to "Other".
    stdin.write("[B");
    stdin.write("[B");
    await flush();
    // Toggle the current option (Other).
    stdin.write(" ");
    await flush();

    // Hit return to save.
    stdin.write("\r");
    await flush();

    expect(api.postProfile).toHaveBeenCalledWith(cfg.apiUrl, cfg.authToken, {
      gender: "man",
      genderPreference: ["other"],
    });
    unmount();
  });

  test("return on the preference step is a no-op until at least one is picked", async () => {
    const { stdin, unmount } = render(<App cfg={cfg} />);
    await flush();

    // Pick gender.
    stdin.write("[B");
    stdin.write("\r");
    await flush();

    // Try to save with empty preference set — should NOT call postProfile.
    stdin.write("\r");
    await flush();
    expect(api.postProfile).not.toHaveBeenCalled();
    unmount();
  });

  test("preloads existing gender + preference from server", async () => {
    vi.mocked(api.getProfile).mockResolvedValue({
      gender: "woman",
      genderPreference: ["man", "other"],
    });

    const { lastFrame, stdin, unmount } = render(<App cfg={cfg} />);
    await flush();

    // Skip past gender step (cursor already on the existing value, just confirm).
    stdin.write("\r");
    await flush();
    const frame = lastFrame() ?? "";
    // Both pre-existing prefs should appear checked.
    const checkedLines = frame.split("\n").filter((l) => l.includes("[x]"));
    expect(checkedLines.length).toBe(2);
    unmount();
  });
});
