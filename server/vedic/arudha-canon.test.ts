import { describe, it, expect } from "vitest";
import arudhaCanon from "./canon/arudha-lagna.json";
import { buildKnots, type NatalPlanet } from "./knots.js";

/**
 * THE ARUDHA LAGNA MATCHES ITS CANON TABLE (v818).
 *
 * canon/arudha-lagna.json is the fourth file in the "cited in a comment, imported by nothing" set.
 * knots.ts computes the AL inline — count from the Ascendant to its lord, count that many again,
 * with the 1st/7th exception moving ten signs on — and names the canon file in a comment beside it.
 * The canon carries a SHORTCUT TABLE (lagna-lord's house → AL house) that is a completely
 * independent statement of the same rule, which makes it an unusually good control: the code
 * derives, the table asserts, and they were never checked against each other.
 *
 * This matters more than a normal drift test. The AL is the deterministic anchor for reading
 * identity as what the world receives rather than as career — David's dharma law. If it silently
 * drifted, "identity" would quietly go back to meaning the 10th.
 */
const TABLE = (arudhaCanon as any).calculation.lagnaLordHouseToAL as Record<string, number>;
const ZOD = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"];
/** Sign ruled by each planet, first listed — enough to place a lagna lord where we want it. */
const RULES: Record<string, number[]> = {
  Mars: [0, 7], Venus: [1, 6], Mercury: [2, 5], Moon: [3], Sun: [4],
  Jupiter: [8, 11], Saturn: [9, 10],
};

/** Build a minimal natal frame with an Aries lagna whose lord (Mars) sits in `house`. */
function chartWithLagnaLordIn(house: number): Record<string, NatalPlanet> {
  const lagnaIdx = 0; // Aries
  const natal: Record<string, NatalPlanet> = {} as any;
  for (const [planet, signs] of Object.entries(RULES)) {
    natal[planet] = {
      sign: ZOD[signs[0]],
      house: ((signs[0] - lagnaIdx + 12) % 12) + 1,
      rulesHouses: signs.map((s) => ((s - lagnaIdx + 12) % 12) + 1),
      dignity: "neutral",
    } as any;
  }
  // Move Mars — the Aries lagna lord — to the house under test.
  natal.Mars = { ...natal.Mars, sign: ZOD[(lagnaIdx + house - 1) % 12], house } as any;
  return natal;
}

describe("arudha lagna vs canon/arudha-lagna.json", () => {
  it("the canon table covers all twelve houses", () => {
    const keys = Object.keys(TABLE).filter((k) => !k.startsWith("_")).map(Number).sort((a, b) => a - b);
    expect(keys).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  });

  it.each([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])(
    "lagna lord in house %i lands the AL where the canon says",
    (house) => {
      const { arudhaLagnaHouse } = buildKnots({ natal: chartWithLagnaLordIn(house), dashaLords: {} });
      expect(arudhaLagnaHouse, `lagna lord in ${house}`).toBe(TABLE[String(house)]);
    },
  );

  it("honours the 1st/7th exception rather than leaving the AL on the self or its mirror", () => {
    // The exception is the only part of the rule a careless implementation would drop, and the
    // canon states it explicitly: an image cannot sit on the self or its mirror.
    expect(TABLE["1"]).toBe(10);
    expect(TABLE["7"]).toBe(10);
    for (const h of [1, 7]) {
      const { arudhaLagnaHouse } = buildKnots({ natal: chartWithLagnaLordIn(h), dashaLords: {} });
      expect(arudhaLagnaHouse).not.toBe(1);
      expect(arudhaLagnaHouse).not.toBe(7);
    }
  });

  it("the canon file still declares that it is NOT from the K&F set", () => {
    // It is a web reference, and the file says so. If someone folds it into the K&F provenance
    // later, that claim would be false — this keeps the distinction visible.
    expect((arudhaCanon as any)._source).toMatch(/NOT from the Kurczak & Fish set/);
  });
});
