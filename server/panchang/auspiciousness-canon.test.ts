import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import muhurta from "../vedic/canon/muhurta-tables.json";

/**
 * THE THIRD NAKSHATRA LIST, PINNED TO CANON.
 *
 * auspiciousness.ts carries its own 27-star benefic/harsh scoring for the COLLECTIVE day
 * quality, described in its own comment as "a common general-purpose grouping" — uncited, and
 * a fourth copy of a classification the repo already holds. The audit flagged the copies; the
 * copies are the risk, not (as it turned out) a live disagreement.
 *
 * MEASURED 2026-07-20, all 27 with the denominator printed: it contradicts the cited canon on
 * ZERO stars. Every canon fierce/sharp star scores harsh; every fixed/soft/swift/movable/tender
 * star scores benefic. So it is not remapped here — rewriting a sound table to remove a
 * duplicate would change which days read as collectively auspicious, and that is David's method,
 * not a defect repair.
 *
 * What this file removes is the DRIFT: the copy is now anchored to the cited natures, so an edit
 * that puts it at odds with canon fails instead of quietly shipping. This is the guard the
 * nakshatra copies never had — the interpreter's private list disagreed with the corrected table
 * for eight days with a green suite, because the only test asserted against the copy.
 *
 * THE ONE JUDGEMENT, named rather than buried: the two MIXED stars (Krittika, Vishakha) are
 * scored harsh (-1). Canon says mixed = "routine and mundane work; avoid the extremes", which is
 * neither benefic nor harsh. Scoring them harsh is defensible for a day-quality gate and it is
 * what has always shipped, so it is pinned as-is — but it is David's to move, and if he moves it
 * this test is where the ruling gets recorded.
 */
const SRC = readFileSync(new URL("./auspiciousness.ts", import.meta.url), "utf8");

const NATURE: Record<string, string> = (() => {
  const out: Record<string, string> = {};
  for (const [nature, v] of Object.entries(muhurta.nakshatraNature as any)) {
    if (nature === "_desc") continue;
    for (const s of (v as any).nakshatras as string[]) out[s] = nature;
  }
  return out;
})();

/** The scored list as it actually appears in the source, star name and all. */
function scored(): Array<{ star: string; score: number }> {
  const block = SRC.match(/const NAKSHATRA_SCORE: number\[\] = \[([\s\S]*?)\];/)?.[1];
  if (!block) throw new Error("NAKSHATRA_SCORE not found — this test is blind, not passing");
  return [...block.matchAll(/([+-]\d),\s*\/\/\s*\d+\s+([A-Za-z ]+)/g)].map((m) => ({
    star: m[2].trim().replace(/\s*\(.*$/, ""),
    score: Number(m[1]),
  }));
}

const BENEFIC_NATURES = new Set(["fixed", "soft", "tender", "swift", "movable"]);
const HARSH_NATURES = new Set(["fierce", "sharp"]);

describe("the collective day-quality list agrees with the cited canon", () => {
  it("the extraction is not blind — 27 stars parsed, every one known to canon", () => {
    const rows = scored();
    expect(rows).toHaveLength(27); // denominator
    expect(Object.keys(NATURE)).toHaveLength(27);
    const unknown = rows.filter((r) => !NATURE[r.star]).map((r) => r.star);
    expect(unknown, `stars the canon does not know: ${unknown.join(", ")}`).toEqual([]);
  });

  it("no canon-benefic star is scored harsh, and no canon-harsh star is scored benefic", () => {
    const wrong = scored()
      .filter((r) => (BENEFIC_NATURES.has(NATURE[r.star]) && r.score < 0)
                  || (HARSH_NATURES.has(NATURE[r.star]) && r.score > 0))
      .map((r) => `${r.star} (canon ${NATURE[r.star]}, scored ${r.score > 0 ? "+1" : "-1"})`);
    expect(wrong, `contradicts the cited canon: ${wrong.join(", ")}`).toEqual([]);
  });

  it("the guard can fire — a canon-fierce star scored benefic is caught", () => {
    // Proves the rule above discriminates rather than passing vacuously.
    const fierce = Object.entries(NATURE).find(([, n]) => n === "fierce")![0];
    const fake = [{ star: fierce, score: +1 }];
    const wrong = fake.filter((r) => HARSH_NATURES.has(NATURE[r.star]) && r.score > 0);
    expect(wrong).toHaveLength(1);
  });

  it("the two MIXED stars are pinned by value, so moving them is a decision and not a drift", () => {
    const by = Object.fromEntries(scored().map((r) => [r.star, r.score]));
    expect(Object.entries(NATURE).filter(([, n]) => n === "mixed").map(([s]) => s).sort())
      .toEqual(["Krittika", "Vishakha"]);
    expect(by.Krittika).toBe(-1);
    expect(by.Vishakha).toBe(-1);
  });
});
