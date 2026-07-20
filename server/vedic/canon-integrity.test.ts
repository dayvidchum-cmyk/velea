import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import houseLords from "./canon/house-lord-combinations.json";
import muhurta from "./canon/muhurta-tables.json";
import timing from "./canon/timing.json";
import bhava from "./canon/bhava-significations.json";
import karakas from "./canon/karakas.json";

/**
 * CANON INTEGRITY (v845) — closing the "canon file with a production reader and no test" gap.
 *
 * At v844 five canon files had production readers and no test. Friendships was pinned there; these
 * are the other four. Every check below was run by hand first, and every one of them came back
 * CLEAN. Three null results in a row:
 *
 *   · house-lord-combinations.json claims "144/144 complete, _gaps: []" — the claim is TRUE, all
 *     144 L{lord}H{placement} keys present, none empty.
 *   · muhurta-tables.json puts all 27 nakshatras in exactly one of seven natures, none missing,
 *     none duplicated; the five tithi families are the classical allocation covering 1–15.
 *   · timing.json's Vimshottari sequence is the classical one summing to 120 — and
 *     dasha-calculator.ts, which hand-rolls its own copy, agrees with it exactly, including all 27
 *     star→lord assignments following the nine-lord cycle.
 *   · bhava-significations.json carries its own house-karaka list and cites the SAME source and
 *     pages as karakas.json (Vol I Ch.7, p66–90). Same source means they must agree — they do,
 *     all twelve houses.
 *
 * That last one is the check v839 should have been. There I compared two tables citing DIFFERENT
 * chapters and called the difference drift. Here two tables cite the SAME chapter, so agreement is
 * a real invariant rather than a coincidence I get to be pleased about. The difference between
 * those two cases is the whole lesson: read the provenance before comparing the values.
 *
 * None of this needed a fix. What it needed was a guard, because every one of these is a DUPLICATE
 * of something — and an unwatched duplicate is a drift that has not happened yet.
 */

describe("house-lord-combinations.json keeps its own promise", () => {
  const combos: Record<string, any> = (houseLords as any).combinations;

  it("has all 144 lord×placement entries", () => {
    const missing: string[] = [];
    for (let l = 1; l <= 12; l++) for (let h = 1; h <= 12; h++) {
      if (!combos[`L${l}H${h}`]) missing.push(`L${l}H${h}`);
    }
    expect(missing).toEqual([]);
    expect(Object.keys(combos)).toHaveLength(144);
  });

  it("has no entry that is present but empty — a blank is worse than a gap", () => {
    // A gap is visible in _gaps. A key whose body is empty reads as covered and says nothing.
    const blank = Object.entries(combos).filter(([, v]) => !v || !Object.values(v).some(Boolean));
    expect(blank.map(([k]) => k)).toEqual([]);
  });

  it("the _coverage and _gaps headers match reality", () => {
    expect((houseLords as any)._gaps).toEqual([]);
    expect((houseLords as any)._coverage).toMatch(/144\/144/);
  });
});

describe("muhurta-tables.json — the day's character", () => {
  const NAK = ["Ashwini","Bharani","Krittika","Rohini","Mrigashira","Ardra","Punarvasu","Pushya","Ashlesha","Magha","Purva Phalguni","Uttara Phalguni","Hasta","Chitra","Swati","Vishakha","Anuradha","Jyeshtha","Mula","Purva Ashadha","Uttara Ashadha","Shravana","Dhanishtha","Shatabhisha","Purva Bhadrapada","Uttara Bhadrapada","Revati"];
  const natures = Object.entries((muhurta as any).nakshatraNature).filter(([k]) => !k.startsWith("_"));

  it("assigns every one of the 27 stars to exactly one of the seven natures", () => {
    expect(natures).toHaveLength(7);
    // Each nature is an OBJECT ({ sanskrit, nakshatras, supports, avoid }), not a bare array. My
    // first version flatMapped the objects themselves and got 7 where it wanted 27 — the assertion
    // caught my misread of the shape, which is what it is for.
    const all = natures.flatMap(([, v]) => (v as any).nakshatras as string[]);
    expect(all).toHaveLength(27);
    expect(new Set(all).size, "a star appears in two natures").toBe(27);
    expect(NAK.filter((n) => !all.includes(n)), "stars with no nature").toEqual([]);
    expect(all.filter((n) => !NAK.includes(n)), "names that are not nakshatras").toEqual([]);
  });

  it("uses the classical tithi families — nanda 1/6/11 through purna 5/10/15", () => {
    const fams = Object.entries((muhurta as any).tithiFamily).filter(([k]) => !k.startsWith("_"));
    expect(fams.map(([k]) => k)).toEqual(["nanda", "bhadra", "jaya", "rikta", "purna"]);
    const expected: Record<string, number[]> = {
      nanda: [1, 6, 11], bhadra: [2, 7, 12], jaya: [3, 8, 13], rikta: [4, 9, 14], purna: [5, 10, 15],
    };
    const seen: number[] = [];
    for (const [name, v] of fams) {
      expect((v as any).tithisInPaksha, name).toEqual(expected[name]);
      seen.push(...(v as any).tithisInPaksha);
    }
    expect([...seen].sort((a, b) => a - b)).toEqual(Array.from({ length: 15 }, (_, i) => i + 1));
  });

  it("covers all seven varas", () => {
    const vara = Object.keys((muhurta as any).vara).filter((k) => !k.startsWith("_"));
    expect(vara.sort()).toEqual(["Jupiter", "Mars", "Mercury", "Moon", "Saturn", "Sun", "Venus"]);
  });
});

describe("the Vimshottari clock, and the copy the calculator keeps", () => {
  const seq = (timing as any).vimshottari.sequenceYears as Array<{ planet: string; years: number }>;
  const SRC = readFileSync(new URL("../dasha-calculator.ts", import.meta.url), "utf8");

  it("is the classical sequence and sums to 120", () => {
    expect(seq.map((s) => [s.planet, s.years])).toEqual([
      ["Ketu", 7], ["Venus", 20], ["Sun", 6], ["Moon", 10], ["Mars", 7],
      ["Rahu", 18], ["Jupiter", 16], ["Saturn", 19], ["Mercury", 17],
    ]);
    expect(seq.reduce((a, s) => a + s.years, 0)).toBe(120);
    expect((timing as any).vimshottari.totalYears).toBe(120);
  });

  it("dasha-calculator.ts hand-rolls the same table — and it agrees", () => {
    // It does NOT import the canon. Same unguarded-duplicate shape as the friendship tables in
    // panchang/dignity.ts (v844): correct today, watched by nothing until now.
    const m = SRC.match(/DASHA_SEQUENCE: \{ planet: string; years: number \}\[\] = \[([\s\S]*?)\n\];/);
    expect(m, "DASHA_SEQUENCE is gone from dasha-calculator.ts").toBeTruthy();
    const code = [...m![1].matchAll(/planet: "(\w+)",\s*years: (\d+)/g)].map((x) => [x[1], Number(x[2])]);
    expect(code).toEqual(seq.map((s) => [s.planet, s.years]));
  });

  it("every one of the 27 stars starts the cycle at the right lord", () => {
    // The birth star picks which dasha a life BEGINS in — get one wrong and that chart's entire
    // 120-year clock is offset. The nine lords repeat three times across the 27.
    const NAK = ["Ashwini","Bharani","Krittika","Rohini","Mrigashira","Ardra","Punarvasu","Pushya","Ashlesha","Magha","Purva Phalguni","Uttara Phalguni","Hasta","Chitra","Swati","Vishakha","Anuradha","Jyeshtha","Mula","Purva Ashadha","Uttara Ashadha","Shravana","Dhanishtha","Shatabhisha","Purva Bhadrapada","Uttara Bhadrapada","Revati"];
    const m = SRC.match(/NAKSHATRA_DASHA_LORD: Record<string, string> = \{([\s\S]*?)\n\};/);
    expect(m, "NAKSHATRA_DASHA_LORD is gone").toBeTruthy();
    const map = Object.fromEntries([...m![1].matchAll(/"([\w ]+)":\s*"(\w+)"/g)].map((x) => [x[1], x[2]]));
    expect(Object.keys(map)).toHaveLength(27);
    NAK.forEach((n, i) => expect(map[n], `${n} (#${i + 1})`).toBe(seq[i % 9].planet));
  });
});

describe("two canon files citing the SAME chapter must agree", () => {
  it("bhava-significations and karakas give the same house karakas", () => {
    // Both cite Vol I Ch.7, p66-90. This is the check v839 should have been: THERE I compared two
    // tables citing DIFFERENT chapters and called the difference drift. Agreement is only an
    // invariant when the provenance is the same — so read the provenance before comparing values.
    const H: Record<string, any> = (bhava as any).houses;
    const T: Record<string, string[]> = (karakas as any).houseKarakaTable;
    for (let h = 1; h <= 12; h++) {
      const bk = H[String(h)].karakas;
      expect(Array.isArray(bk) ? bk : [bk], `house ${h}`).toEqual(T[String(h)]);
    }
  });

  it("both cite Vol I Ch.7 — if one is re-sourced, the test above stops being valid", () => {
    expect((bhava as any)._source).toMatch(/Vol I.*Ch\.7/);
    expect((karakas as any)._source).toMatch(/Ch\.7 house-karaka table/);
  });

  it("every house is present and non-empty in the significations", () => {
    const H: Record<string, any> = (bhava as any).houses;
    for (let h = 1; h <= 12; h++) {
      expect(H[String(h)], `house ${h}`).toBeTruthy();
      expect((H[String(h)].indications ?? []).length, `house ${h} indications`).toBeGreaterThan(0);
    }
  });
});

describe("no canon file arrives unguarded", () => {
  it("every canon/*.json is referenced by at least one test", () => {
    // THE CLASS FIX. v844 found five canon files with production readers and no test by hand. This
    // makes the next one impossible to miss: add a canon file, and either a test names it or this
    // fails. Fixing the instances without this is how the same gap reopens.
    const canonDir = new URL("./canon/", import.meta.url);
    const jsons = readdirSync(canonDir).filter((f) => f.endsWith(".json"));
    expect(jsons.length).toBeGreaterThan(5);

    const testBlob = (function walk(dir: URL): string {
      let out = "";
      for (const e of readdirSync(dir, { withFileTypes: true })) {
        if (e.name === "node_modules") continue;
        const p = new URL(e.name + (e.isDirectory() ? "/" : ""), dir);
        out += e.isDirectory() ? walk(p) : (/\.test\.tsx?$/.test(e.name) ? readFileSync(p, "utf8") : "");
      }
      return out;
    })(new URL("../", import.meta.url));

    const unguarded = jsons.filter((j) => !testBlob.includes(j));
    expect(unguarded, `canon files no test mentions: ${unguarded.join(", ")}`).toEqual([]);
  });
});
