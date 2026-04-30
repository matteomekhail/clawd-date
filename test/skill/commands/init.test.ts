// @vitest-environment node
import { describe, expect, test } from "vitest";
import { resolveApiUrl } from "../../../apps/skill/src/commands/init";

const PROD = "https://prod.convex.site";
const DEV = "https://dev.convex.site";

describe("resolveApiUrl", () => {
  test("env override beats everything (the dev wrapper case)", () => {
    expect(
      resolveApiUrl({
        envUrl: DEV,
        existingUrl: "https://config.example/site",
        legacyUrl: "https://legacy.example/site",
        defaultUrl: PROD,
      }),
    ).toBe(DEV);
  });

  test("existing config wins over legacy + default when no env", () => {
    expect(
      resolveApiUrl({
        envUrl: undefined,
        existingUrl: "https://config.example/site",
        legacyUrl: "https://legacy.example/site",
        defaultUrl: PROD,
      }),
    ).toBe("https://config.example/site");
  });

  test("legacy config picked up when nothing newer", () => {
    expect(
      resolveApiUrl({
        envUrl: undefined,
        existingUrl: undefined,
        legacyUrl: "https://legacy.example/site",
        defaultUrl: PROD,
      }),
    ).toBe("https://legacy.example/site");
  });

  test("falls back to baked default on a virgin install", () => {
    expect(
      resolveApiUrl({
        envUrl: undefined,
        existingUrl: undefined,
        legacyUrl: null,
        defaultUrl: PROD,
      }),
    ).toBe(PROD);
  });

  test("regression: a fresh dev install does NOT silently pick the prod default", () => {
    // Models bin-dev.ts: env injected, no config on disk, no legacy.
    // Earlier review claimed the env injection was dead code — this asserts
    // the chain still honors it.
    expect(
      resolveApiUrl({
        envUrl: DEV,
        existingUrl: undefined,
        legacyUrl: null,
        defaultUrl: PROD,
      }),
    ).toBe(DEV);
  });
});
