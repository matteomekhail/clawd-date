// @vitest-environment node
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parseEnvFile } from "../../scripts/lib/env.mjs";

let dir;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "env-test-"));
});
afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

function write(content) {
  const p = join(dir, ".env");
  writeFileSync(p, content);
  return p;
}

describe("parseEnvFile", () => {
  test("missing file → empty object", () => {
    expect(parseEnvFile(join(dir, "does-not-exist"))).toEqual({});
  });

  test("parses simple KEY=value lines", () => {
    const p = write("FOO=bar\nBAZ=qux\n");
    expect(parseEnvFile(p)).toEqual({ FOO: "bar", BAZ: "qux" });
  });

  test("ignores blank lines and comments", () => {
    const p = write("# top comment\n\nFOO=bar\n#BAZ=ignored\n");
    expect(parseEnvFile(p)).toEqual({ FOO: "bar" });
  });

  test("strips matching surrounding quotes", () => {
    const p = write(`A="quoted"\nB='single'\nC=naked\n`);
    expect(parseEnvFile(p)).toEqual({ A: "quoted", B: "single", C: "naked" });
  });

  test("strips trailing inline comments preceded by space", () => {
    const p = write("FOO=bar # trailing comment\nBAZ=qux#nospace\n");
    expect(parseEnvFile(p)).toEqual({
      FOO: "bar",
      // No leading space before #, so it's part of the value (matches our
      // current parser; documenting the behavior so a future change is
      // intentional).
      BAZ: "qux#nospace",
    });
  });

  test("preserves '=' inside values", () => {
    const p = write("URL=https://example.com/?q=1&r=2\n");
    expect(parseEnvFile(p)).toEqual({
      URL: "https://example.com/?q=1&r=2",
    });
  });

  test("skips malformed lines without an '='", () => {
    const p = write("FOO=bar\nNOTANENV\nBAZ=qux\n");
    expect(parseEnvFile(p)).toEqual({ FOO: "bar", BAZ: "qux" });
  });
});
