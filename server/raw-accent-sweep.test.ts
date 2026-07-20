import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

/**
 * NO SURFACE COLOUR MAY BE PAINTED AS TEXT (v815).
 *
 * The day-mode accents, planet inks and sign colours fill coins, tint backgrounds and draw rings.
 * As TEXT they fail 4.5:1 on one ground or the other — that measured table is the whole reason
 * shared/accent-ink.ts exists. The v791/792 sweep claimed "64 call sites, zero raw accents left as
 * text"; the re-audit found roughly six it had missed, and they survived because nothing was
 * watching for the next one.
 *
 * This watches. It is a source scan over the client, because the defect is a literal in a style
 * object and no render test would see it more clearly.
 */
const ROOTS = ["client/src/pages", "client/src/components"];
const REPO = new URL("../", import.meta.url).pathname;

/** `color:` set to a raw accent — the var without its readable twin, or a bare accent identifier. */
const RAW_AS_TEXT = [
  /color:\s*"var\(--day-accent\)"/,          // the twin is --day-accent-ink
  /color:\s*accentSolid(?![A-Za-z])/,        // MODE_SOLID, straight onto a tint
  /color:\s*SIGN_COLOR\[/,                   // sign colours are surface colours
];

function scan(): Record<string, string[]> {
  const bad: Record<string, string[]> = {};
  for (const root of ROOTS) {
    const dir = join(REPO, root);
    for (const f of readdirSync(dir).filter((x) => x.endsWith(".tsx"))) {
      const src = readFileSync(join(dir, f), "utf8");
      const hits = RAW_AS_TEXT.filter((re) => re.test(src)).map((re) => re.source);
      if (hits.length) bad[`${root}/${f}`] = hits;
    }
  }
  return bad;
}

describe("raw accents are never painted as text", () => {
  it("scans real files — a scan over nothing proves nothing", () => {
    let n = 0;
    for (const root of ROOTS) n += readdirSync(join(REPO, root)).filter((x) => x.endsWith(".tsx")).length;
    expect(n).toBeGreaterThan(20);
  });

  it("finds none anywhere in pages or components", () => {
    expect(scan()).toEqual({});
  });

  it("the patterns it looks for are real ones — they matched before v815", () => {
    // Denominator: if these regexes could never match anything, the test above is decoration.
    // Each is quoted from the site it was actually found at.
    for (const [sample, re] of [
      ['style={{ color: "var(--day-accent)" }}', RAW_AS_TEXT[0]],
      ["style={{ color: accentSolid, border: x }}", RAW_AS_TEXT[1]],
      ["color: SIGN_COLOR[sel.sign] ?? TEXT_PRIMARY", RAW_AS_TEXT[2]],
    ] as const) {
      expect(re.test(sample), `pattern ${re.source} cannot match its own example`).toBe(true);
    }
  });
});
