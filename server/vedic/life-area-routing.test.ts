import { describe, it, expect } from "vitest";
import { LIFE_AREAS } from "./life-areas.js";

/**
 * THE VARGA ROUTING IS THE PAID LENS (v838).
 *
 * "Life area → its varga, its house, its karaka" is the method the pick-a-date reading is built on:
 * the area routes to a divisional chart, and the reading is the CONDITION of that arena read in D1
 * and in its varga. Ten routings, each of them a classical assignment, and not one test.
 *
 * Checked against the standard shodasavarga set. Nine match exactly. The tenth — purpose → D9 — is
 * shared with love, and that is CORRECT rather than a collision: navamsa is genuinely the dharma
 * varga as well as the marriage one, so the lens reads its 7th for marriage and its 9th for dharma.
 * Recording that reasoning here so a later reader does not "fix" the duplication.
 *
 * The one genuine disagreement in this table is NOT the varga — it is that parents routes to house
 * 12 while knots.ts and the canon put parents at 4 and 9. That is David's ruling, it is on the
 * sheet, and this test deliberately pins the CURRENT value so a change is a decision rather than a
 * drift.
 */
const EXPECTED: Record<string, { varga: string; house: number; why: string }> = {
  self:     { varga: "D1",  house: 1,  why: "the rasi itself — body and identity" },
  money:    { varga: "D2",  house: 2,  why: "hora, the wealth division" },
  siblings: { varga: "D3",  house: 3,  why: "drekkana, the sibling division" },
  home:     { varga: "D4",  house: 4,  why: "chaturthamsa, property and home" },
  children: { varga: "D7",  house: 5,  why: "saptamsa, the children division" },
  love:     { varga: "D9",  house: 7,  why: "navamsa, the spouse division, read at its 7th" },
  career:   { varga: "D10", house: 10, why: "dasamsa, the career division" },
  health:   { varga: "D30", house: 6,  why: "trimsamsa, the division of afflictions" },
  parents:  { varga: "D12", house: 12, why: "dwadasamsa is the parents varga; the HOUSE is David's open ruling" },
  purpose:  { varga: "D9",  house: 9,  why: "navamsa is the dharma varga too — same chart, read at its 9th" },
};

describe("life-area → varga → house routing", () => {
  it("covers exactly the ten areas the lens defines", () => {
    expect(Object.keys(LIFE_AREAS as any).sort()).toEqual(Object.keys(EXPECTED).sort());
  });

  it.each(Object.entries(EXPECTED))("%s routes to its classical division", (key, want) => {
    const area = (LIFE_AREAS as any)[key];
    expect(area, `${key} missing from LIFE_AREAS`).toBeTruthy();
    expect(area.varga, `${key}: ${want.why}`).toBe(want.varga);
    expect(area.primaryHouse, `${key}: ${want.why}`).toBe(want.house);
  });

  it("shares D9 between love and purpose deliberately, at DIFFERENT houses", () => {
    // Not a collision to be tidied away: navamsa is both the marriage and the dharma varga, and the
    // lens distinguishes them by which house of it it reads.
    const love = (LIFE_AREAS as any).love, purpose = (LIFE_AREAS as any).purpose;
    expect(love.varga).toBe(purpose.varga);
    expect(love.primaryHouse).not.toBe(purpose.primaryHouse);
  });

  it("every area carries at least one karaka — a lens with no significator reads nothing", () => {
    for (const [key, area] of Object.entries(LIFE_AREAS as any)) {
      expect((area as any).karakas?.length, `${key} has no karakas`).toBeGreaterThan(0);
    }
  });
});
