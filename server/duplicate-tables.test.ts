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

describe("the moolatrikona ranges are the same table in all three places", () => {
  // Three copies: vedic/dignity, panchang/dignity, and shadbala — the last of which uses them to
  // compute Sthana bala, so a drift here moves a planet's STRENGTH, not just its label. Two of the
  // three spell the bounds differently (from/to vs lo/hi), which is exactly how a copy hides.
  const moolaOf = (path: string): Record<string, [string, number, number]> => {
    const src = read(path);
    const m = /const MOOLA\b[^=]*=\s*\{/.exec(src);
    if (!m) throw new Error(`MOOLA not found in ${path}`);
    let depth = 0; const start = m.index + m[0].length - 1; let body = "";
    for (let j = start; j < src.length; j++) {
      if (src[j] === "{") depth++;
      else if (src[j] === "}" && --depth === 0) { body = src.slice(start, j + 1); break; }
    }
    const out: Record<string, [string, number, number]> = {};
    for (const x of body.matchAll(/(\w+)\s*:\s*\{\s*sign:\s*"(\w+)"\s*,\s*(?:from|lo):\s*([\d.]+)\s*,\s*(?:to|hi):\s*([\d.]+)/g)) {
      out[x[1]] = [x[2], Number(x[3]), Number(x[4])];
    }
    return out;
  };
  const COPIES = ["server/vedic/dignity.ts", "server/panchang/dignity.ts", "server/vedic/shadbala.ts"];
  const baseline = moolaOf(COPIES[0]);

  it("the baseline is all seven grahas, pinned by value", () => {
    expect(Object.keys(baseline)).toHaveLength(7);
    expect(baseline.Sun).toEqual(["Leo", 0, 20]);
    expect(baseline.Moon).toEqual(["Taurus", 3, 30]);
    expect(baseline.Mercury).toEqual(["Virgo", 15, 20]);
    expect(baseline.Saturn).toEqual(["Aquarius", 0, 20]);
  });

  it.each(COPIES.slice(1))("%s matches", (path) => {
    const copy = moolaOf(path);
    expect(Object.keys(copy)).toHaveLength(7);
    expect(copy).toEqual(baseline);
  });
});

describe("TARAS is a NAME COLLISION, not a duplicated table", () => {
  // The duplicate sweep flagged TARAS in three modules. It is not drift: crown.ts's TARAS is the
  // NINE tara names of the day-star cycle, while natal-states and shadbala use TARAS for the FIVE
  // star-planets. Same identifier, unrelated concepts. Recording it so the next sweep — mine or
  // anyone's — does not "fix" them into agreement, which would be a real bug introduced by tidying.
  it("crown.ts holds the nine tara names, the others hold the five taras (planets)", () => {
    expect(read("server/panchang/crown.ts")).toMatch(/TARAS[\s\S]{0,120}"Janma"/);
    for (const p of ["server/vedic/natal-states.ts", "server/vedic/shadbala.ts"]) {
      expect(read(p)).toMatch(/TARAS[^=]*=\s*\[\s*"Mars"/);
    }
  });
});
