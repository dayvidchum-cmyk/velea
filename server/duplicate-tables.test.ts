import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

/**
 * THE SAME TABLE IN TWO FILES IS A BUG WITH A DELAY (v835).
 *
 * Three have already bitten this project:
 *   · HOUSE_TO_BASE_MODE — a private copy of the house→mode map, drifted for eight days on houses
 *     3/5/9, and still being served on a PUBLIC endpoint when v810 found it.
 *   · karakas — a hand-copied snapshot that lost Jupiter from career, so a Jupiter dasha never tied
 *     to vocation (v790).
 *   · the exaltation tables — two copies, verified identical and locked in v834.
 *
 * A sweep for constants declared in more than one module found 22 more. This locks the ones that
 * carry astrological JUDGEMENT rather than structure — the sign→ruler map (EIGHT copies under three
 * names, the most load-bearing table in the engine) and the strong-restraint tithis (whose sibling
 * in the same file is the one that drifted).
 *
 * All of them agree TODAY. That is the point: this is written while they agree, so the next edit to
 * one copy fails here instead of shipping.
 */
const read = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");

/** Pull an object/array literal by name and return its "key": "value" pairs. */
function pairsOf(path: string, name: string): Record<string, string> {
  const src = read(path);
  const m = new RegExp(`const ${name}\\b[^=]*=\\s*([{\\[])`).exec(src);
  if (!m) throw new Error(`${name} not found in ${path}`);
  const open = m[1], close = open === "{" ? "}" : "]";
  let depth = 0, start = m.index + m[0].length - 1;
  for (let j = start; j < src.length; j++) {
    if (src[j] === open) depth++;
    else if (src[j] === close && --depth === 0) {
      const body = src.slice(start, j + 1);
      return Object.fromEntries([...body.matchAll(/"?(\w+)"?\s*:\s*"(\w+)"/g)].map((x) => [x[1], x[2]]));
    }
  }
  throw new Error(`unterminated literal for ${name} in ${path}`);
}

const RULER_COPIES: Array<[string, string]> = [
  ["server/vedic/dignity.ts", "SIGN_RULER"],
  ["server/vedic/vargas.ts", "SIGN_RULER"],
  ["server/sky/eclipses.ts", "SIGN_RULER"],
  ["server/panchang/dignity.ts", "SIGN_LORD"],
  ["server/vedic/melana.ts", "SIGN_LORD"],
  ["server/narrative/input-builder.ts", "SIGN_RULERS"],
  ["server/profection/calculator.ts", "SIGN_RULERS"],
  ["server/vedic/varshaphala.ts", "SIGN_RULERS"],
];

describe("the sign→ruler map is the same map in all eight places", () => {
  const baseline = pairsOf(...RULER_COPIES[0]);

  it("the baseline is a complete, correct zodiac — everything below compares to this", () => {
    expect(Object.keys(baseline)).toHaveLength(12);
    // Pinned by value, so all eight copies drifting together still fails.
    expect(baseline.Aries).toBe("Mars");
    expect(baseline.Cancer).toBe("Moon");
    expect(baseline.Leo).toBe("Sun");
    expect(baseline.Scorpio).toBe("Mars");
    expect(baseline.Aquarius).toBe("Saturn");
    expect(baseline.Pisces).toBe("Jupiter");
  });

  it.each(RULER_COPIES.slice(1))("%s :: %s matches", (path, name) => {
    const copy = pairsOf(path, name);
    expect(Object.keys(copy)).toHaveLength(12);
    expect(copy).toEqual(baseline);
  });
});

describe("the strong-restraint tithis are the same list in both files", () => {
  // Its sibling in modifier-config.ts is HOUSE_TO_BASE_MODE, which drifted and was published.
  const listOf = (path: string) => {
    const src = read(path);
    const m = /STRONG_RESTRAINT_TITHIS[^=]*=\s*\[([\s\S]*?)\]/.exec(src);
    if (!m) throw new Error(`STRONG_RESTRAINT_TITHIS not found in ${path}`);
    return [...m[1].matchAll(/'(\w+)'/g)].map((x) => x[1]).sort();
  };

  it("agree, and are the four the engine has always used", () => {
    const a = listOf("server/panchang/modifier-config.ts");
    const b = listOf("server/panchang/interpreter.ts");
    expect(a).toEqual(b);
    expect(a).toEqual(["Amavasya", "Ashtami", "Chaturdashi", "Ekadashi"]);
  });
});
