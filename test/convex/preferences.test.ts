import { describe, expect, test } from "vitest";
import { isCompatible, isGender } from "../../convex/preferences";

// Minimal shape — isCompatible only reads gender + genderPreference, but
// the parameter is typed as Pick<Doc<"users">, ...>, which infers from the
// schema. Casting is fine: we are deliberately testing the gating logic
// in isolation from the rest of the user doc.
const u = (gender?: "man" | "woman" | "other", pref?: Array<"man" | "woman" | "other">) =>
  ({ gender, genderPreference: pref }) as Parameters<typeof isCompatible>[0];

describe("isCompatible", () => {
  test("neither side has prefs → match", () => {
    expect(isCompatible(u("man"), u("woman"))).toBe(true);
    expect(isCompatible(u(), u())).toBe(true);
  });

  test("my pref matches their gender → match", () => {
    expect(isCompatible(u("man", ["woman"]), u("woman"))).toBe(true);
  });

  test("my pref does not match their gender → no match", () => {
    expect(isCompatible(u("man", ["woman"]), u("man"))).toBe(false);
  });

  test("their pref does not match my gender → no match (symmetric)", () => {
    expect(isCompatible(u("man"), u("woman", ["woman"]))).toBe(false);
  });

  test("both prefs satisfied → match", () => {
    expect(isCompatible(u("man", ["woman"]), u("woman", ["man"]))).toBe(true);
  });

  test("both prefs set, one mismatches → no match", () => {
    expect(isCompatible(u("man", ["woman"]), u("woman", ["other"]))).toBe(false);
  });

  test("pref set but other side has no gender → no match", () => {
    expect(isCompatible(u("man", ["woman"]), u(undefined))).toBe(false);
  });

  test("empty pref array behaves like 'no preference'", () => {
    // The HTTP layer rejects this in practice (TUI guards size>0), but the
    // pure logic should still treat [] as 'no filter' so a future API
    // change to allow clearing via [] doesn't silently exclude everyone.
    expect(isCompatible(u("man", []), u("man"))).toBe(true);
  });
});

describe("isGender", () => {
  test("accepts valid values", () => {
    expect(isGender("man")).toBe(true);
    expect(isGender("woman")).toBe(true);
    expect(isGender("other")).toBe(true);
  });

  test("rejects invalid input", () => {
    expect(isGender("MAN")).toBe(false);
    expect(isGender("")).toBe(false);
    expect(isGender(null)).toBe(false);
    expect(isGender(undefined)).toBe(false);
    expect(isGender(42)).toBe(false);
    expect(isGender({ gender: "man" })).toBe(false);
  });
});
