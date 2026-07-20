import { describe, expect, it } from "vitest";
import karakas from "./canon/karakas.json";
import { THEME_TABLE_FOR_TEST } from "./knots";

/**
 * The knot themes must not drift from the canon again.
 *
 * canon/karakas.json was one of three canon files imported by nothing, and the hand-copied table
 * had already drifted: career's karakas were [Saturn, Sun, Mercury] where Vol I says
 * [Mercury, Sun, Jupiter, Saturn]. Jupiter — the karaka of counsel, teaching and wisdom — was
 * missing from the vocation theme, so a Jupiter dasha or Jupiter lighting the 10th never
 * registered as a career knot.
 */
const CANON = (karakas as any).knotSignificatorMap as Record<string, { houses?: number[]; karakas?: string[] }>;
const CANON_THEMES = ["marriage", "children", "career", "identity", "fame", "siblings"] as const;

describe("knot themes vs the canon", () => {
  it.each(CANON_THEMES)("%s matches canon/karakas.json exactly", (theme) => {
    const c = CANON[theme];
    const t = (THEME_TABLE_FOR_TEST as any)[theme];
    expect(t, `${theme} missing from the table`).toBeDefined();
    expect([...t.houses].sort()).toEqual([...(c.houses ?? [])].sort());
    expect([...t.karakas].sort()).toEqual([...(c.karakas ?? [])].sort());
  });

  it("career carries JUPITER — the drift this test exists to catch", () => {
    expect((THEME_TABLE_FOR_TEST as any).career.karakas).toContain("Jupiter");
  });

  it("keeps the four themes the canon does not index — deriving everything would delete them", () => {
    for (const t of ["wealth", "parents", "home", "health"]) {
      expect((THEME_TABLE_FOR_TEST as any)[t], `${t} vanished`).toBeDefined();
      expect(CANON[t]).toBeUndefined(); // denominator: these genuinely are NOT in the canon index
    }
  });

  it("`parents` is exactly the canon's father ∪ mother, not an invention", () => {
    const father = CANON.father, mother = CANON.mother;
    const houses = new Set([...(father.houses ?? []), ...(mother.houses ?? [])]);
    const karakas = new Set([...(father.karakas ?? []), ...(mother.karakas ?? [])]);
    const p = (THEME_TABLE_FOR_TEST as any).parents;
    expect([...p.houses].sort()).toEqual([...houses].sort());
    expect([...p.karakas].sort()).toEqual([...karakas].sort());
  });

  it("marriage keeps the partner-karaka rule, which is gendered by the SPOUSE", () => {
    const p = (THEME_TABLE_FOR_TEST as any).marriage.partnerKaraka;
    expect(p).toEqual({ husband: "Jupiter", wife: "Venus" });
    expect(CANON.marriage).toHaveProperty("partnerKarakaBySpouseGender");
  });
});
