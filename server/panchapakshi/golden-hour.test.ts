import { describe, it, expect } from "vitest";
import { gateFromInputs, housesRuledFromLagna } from "./golden-hour.js";

// Proves the deterministic gate logic locked with David (2026-07-04):
// golden = bird favorable (golden/good) ∧ hora lord favorable (not debilitated, not combust).
describe("golden hour — the gate", () => {
  it("bird is favorable only on golden or good quality", () => {
    expect(gateFromInputs("golden", "own", false).birdFavorable).toBe(true);
    expect(gateFromInputs("good", "own", false).birdFavorable).toBe(true);
    for (const q of ["neutral", "low", "avoid"]) {
      expect(gateFromInputs(q, "own", false).birdFavorable).toBe(false);
    }
  });

  it("hora lord fails ONLY on debilitation or combustion — retrograde/enemy/neutral still open", () => {
    expect(gateFromInputs("golden", "debilitated", false).lordFavorable).toBe(false);
    expect(gateFromInputs("golden", "own", true).lordFavorable).toBe(false); // combust
    // lenient bar: everything that isn't debilitated + isn't combust opens the gate
    for (const t of ["exalted", "moolatrikona", "own", "friend", "neutral", "enemy"]) {
      expect(gateFromInputs("golden", t, false).lordFavorable).toBe(true);
    }
  });

  it("golden = bird AND lord", () => {
    expect(gateFromInputs("golden", "exalted", false).isGolden).toBe(true);
    expect(gateFromInputs("low", "exalted", false).isGolden).toBe(false); // bird not favorable
    expect(gateFromInputs("golden", "debilitated", false).isGolden).toBe(false); // lord debilitated
    expect(gateFromInputs("good", "enemy", false).isGolden).toBe(true); // enemy still counts
  });

  it("houses a lord rules, counted from the lagna (whole sign)", () => {
    // Aries lagna: Capricorn = 10th, Aquarius = 11th → Saturn rules 10 & 11.
    expect(housesRuledFromLagna("Aries", "Saturn")).toEqual([10, 11]);
    // Aries lagna: Leo = 5th → Sun rules the 5th.
    expect(housesRuledFromLagna("Aries", "Sun")).toEqual([5]);
    // Virgo lagna: Gemini = 10th, Virgo = 1st → Mercury rules 1 & 10.
    expect(housesRuledFromLagna("Virgo", "Mercury")).toEqual([1, 10]);
    // Shadow planets rule nothing.
    expect(housesRuledFromLagna("Aries", "Rahu")).toEqual([]);
  });
});
