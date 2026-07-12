import { describe, it, expect } from "vitest";
import {
  computeAshtakavarga, ashtakavargaFromLongitudes, BINDU_TABLE, BINDU_TOTALS, SARVA_TOTAL,
  GRAHAS, REF_POINTS, transitStrength, type RefPoint,
} from "./ashtakavarga";
import { calculateBirthChart } from "../birthchart/calculator";

const allAt = (sign: number) =>
  Object.fromEntries(REF_POINTS.map((r) => [r, sign])) as Record<RefPoint, number>;

describe("ashtakavarga — table integrity (the BPHS invariants)", () => {
  it("every planet's benefic-place table sums to its fixed BAV total", () => {
    for (const p of GRAHAS) {
      const total = REF_POINTS.reduce((n, r) => n + BINDU_TABLE[p][r].length, 0);
      expect(total, `${p} BAV total`).toBe(BINDU_TOTALS[p]);
    }
  });

  it("the seven totals sum to the canonical Sarva total (337)", () => {
    expect(Object.values(BINDU_TOTALS).reduce((a, b) => a + b, 0)).toBe(SARVA_TOTAL);
  });

  it("every table entry is a valid house number 1–12, no duplicates in a row", () => {
    for (const p of GRAHAS) for (const r of REF_POINTS) {
      const row = BINDU_TABLE[p][r];
      expect(new Set(row).size, `${p}/${r} has dupes`).toBe(row.length);
      for (const h of row) { expect(h).toBeGreaterThanOrEqual(1); expect(h).toBeLessThanOrEqual(12); }
    }
  });
});

describe("ashtakavarga — computation", () => {
  it("each BAV grid sums to its planet total; SAV sums to 337", () => {
    const av = computeAshtakavarga(allAt(4)); // everything in Leo — totals must be invariant to placement
    for (const p of GRAHAS) expect(av.bhinna[p].reduce((a, b) => a + b, 0)).toBe(BINDU_TOTALS[p]);
    expect(av.sarva.reduce((a, b) => a + b, 0)).toBe(SARVA_TOTAL);
  });

  it("SAV is exactly the sign-by-sign sum of the seven BAVs", () => {
    const av = computeAshtakavarga(allAt(2));
    for (let s = 0; s < 12; s++) {
      const summed = GRAHAS.reduce((n, p) => n + av.bhinna[p][s], 0);
      expect(av.sarva[s]).toBe(summed);
    }
  });

  it("no BAV cell exceeds 8 (at most the eight reference points can each give one bindu)", () => {
    const av = computeAshtakavarga(allAt(7));
    for (const p of GRAHAS) for (const s of av.bhinna[p]) expect(s).toBeLessThanOrEqual(8);
  });

  it("deterministic hand-check: all 8 references in Aries → the Sun's BAV is exact", () => {
    // With every reference at Aries, a house h maps to sign (h-1); each sign's bindu count = the
    // number of reference rows that include house (sign+1). Counted by hand from BINDU_TABLE.Sun:
    const av = computeAshtakavarga(allAt(0));
    expect(av.bhinna.Sun).toEqual([3, 3, 3, 4, 2, 5, 4, 3, 5, 6, 7, 3]);
  });

  it("rotating every reference by one sign rotates the whole grid by one sign", () => {
    const a = computeAshtakavarga(allAt(0));
    const b = computeAshtakavarga(allAt(1));
    for (let s = 0; s < 12; s++) expect(b.sarva[(s + 1) % 12]).toBe(a.sarva[s]);
  });
});

describe("ashtakavarga — on the real primary chart (1982-04-13 17:20 Bataan)", () => {
  it("computes valid grids and surfaces the native's strong/weak signs", async () => {
    const chart = await calculateBirthChart("1982-04-13", "17:20", 14.6, 120.6, "Asia/Manila", {
      lagnaBasis: "ascendant",
    });
    const lons = {
      Sun: chart.sun.longitude, Moon: chart.moon.longitude, Mars: chart.mars.longitude,
      Mercury: chart.mercury.longitude, Jupiter: chart.jupiter.longitude,
      Venus: chart.venus.longitude, Saturn: chart.saturn.longitude,
    };
    const av = ashtakavargaFromLongitudes(lons, chart.lagna.longitude);
    for (const p of GRAHAS) expect(av.bhinna[p].reduce((a, b) => a + b, 0)).toBe(BINDU_TOTALS[p]);
    expect(av.sarva.reduce((a, b) => a + b, 0)).toBe(SARVA_TOTAL);

    // A transit grade sanity check: pick Jupiter transiting the native's Moon sign right now-ish.
    const t = transitStrength(av, "Jupiter", chart.moon.longitude);
    expect(t.bhinna).toBeGreaterThanOrEqual(0);
    expect(t.bhinna).toBeLessThanOrEqual(8);

    const SIGNS = ["Aries","Taurus","Gemini","Cancer","Leo","Virgo","Libra","Scorpio","Sagittarius","Capricorn","Aquarius","Pisces"];
    const lagnaSign = Math.floor(((chart.lagna.longitude % 360) + 360) % 360 / 30);
    const rows = av.sarva.map((b, s) => {
      const house = ((s - lagnaSign + 12) % 12) + 1;
      return { sign: SIGNS[s], house, bindus: b };
    }).sort((a, b) => b.bindus - a.bindus);
    console.log("Sarvashtakavarga for the primary chart (sign · whole-sign house · bindus):");
    for (const r of rows) console.log(`  ${r.sign.padEnd(11)} house ${String(r.house).padStart(2)}  ${r.bindus} bindus`);
  });
});
