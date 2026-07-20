import { describe, it, expect } from "vitest";
import { NAKSHATRA_MODIFIERS } from "./modifier-config.js";
import tables from "../vedic/canon/muhurta-tables.json";

/**
 * THE CITED TABLE WINS (David's ruling, 2026-07-20).
 *
 * Six lists in this app classify the 27 nakshatras and exactly ONE carries a source citation:
 * canon/muhurta-tables.json, from Muhurta Chintamani (Nakshatra-prakarana) and Brihat Samhita 98.
 * The mode engine's NAKSHATRA_MODIFIERS was hand-made and, on four stars, asserted the OPPOSITE of
 * the cited one — calling a FIERCE or MIXED star "+1: supports expansion/outward movement".
 *
 * David: "Cited tables from the textbooks win. I'm not sure how something described as fierce or
 * mixed is expansive because fierce makes me think danger, bad, aggressive."
 *
 * WHAT I DID NOT DO, and it matters. Deriving every modifier from the nature wholesale would have
 * moved ELEVEN stars. Seven of those were only Selective or Neutral against a "fixed"/"movable"/
 * "swift" nature — which is not a contradiction, it is simply saying less. Changing them would have
 * been me rewriting his method under cover of his ruling, which is the one thing his standing
 * instruction forbids. Those seven are recorded as an open question instead.
 *
 * So the invariant here is narrow and exact: NO STAR MAY CLAIM EXPANSION WHILE THE CITED CANON
 * CALLS IT FIERCE OR MIXED.
 */

const nature: Record<string, { sanskrit: string; nakshatras: string[]; supports: string[]; avoid?: string[] }> =
  Object.fromEntries(Object.entries((tables as any).nakshatraNature).filter(([k]) => !k.startsWith("_"))) as any;

const natureOf = (star: string): string => {
  for (const [n, v] of Object.entries(nature)) if (v.nakshatras.includes(star)) return n;
  throw new Error(`${star} has no nature in the cited canon`);
};

describe("the cited canon and the mode engine agree on the 27 stars", () => {
  it("every star the mode engine scores exists in the cited table", () => {
    // A star in one and not the other is how the two drifted in the first place.
    const scored = Object.keys(NAKSHATRA_MODIFIERS);
    expect(scored).toHaveLength(27);
    for (const s of scored) expect(() => natureOf(s), `${s} not in the canon`).not.toThrow();
  });

  it("NO fierce star is scored as expansion", () => {
    // The canon: fierce supports "force, demolition, hard confrontation, acts requiring
    // ruthlessness" and avoids "almost everything gentle, beginnings, journeys".
    for (const star of nature.fierce.nakshatras) {
      expect(NAKSHATRA_MODIFIERS[star].score, `${star} is fierce`).toBeLessThanOrEqual(0);
    }
  });

  it("NO mixed star is scored as expansion", () => {
    // The canon is explicit that mixed avoids "the extremes — neither launch nor cut".
    for (const star of nature.mixed.nakshatras) {
      expect(NAKSHATRA_MODIFIERS[star].score, `${star} is mixed`).toBe(0);
    }
  });

  it("names the four that were corrected, so a silent revert is caught", () => {
    expect(NAKSHATRA_MODIFIERS["Magha"].score).toBe(-1);
    expect(NAKSHATRA_MODIFIERS["Purva Phalguni"].score).toBe(-1);
    expect(NAKSHATRA_MODIFIERS["Purva Ashadha"].score).toBe(-1);
    expect(NAKSHATRA_MODIFIERS["Vishakha"].score).toBe(0);
  });

  it("sharp stars are containment too — they already were, and must stay", () => {
    // Not part of the correction; asserted so the fix cannot drift the other way later.
    for (const star of nature.sharp.nakshatras) {
      expect(NAKSHATRA_MODIFIERS[star].score, `${star} is sharp`).toBeLessThanOrEqual(0);
    }
  });

  it("the seven still-open stars are LEFT ALONE, on purpose", () => {
    // fixed / movable / swift stars currently scored 0. A wholesale nature→score mapping would push
    // these to +1. That is a method change David has not made, so it must not happen by accident —
    // if someone "completes" the remap, this fails and sends them back to him for a ruling.
    for (const star of ["Uttara Phalguni", "Uttara Ashadha", "Uttara Bhadrapada",
      "Punarvasu", "Shravana", "Shatabhisha", "Hasta"]) {
      expect(NAKSHATRA_MODIFIERS[star].score, `${star} moved without a ruling`).toBe(0);
    }
  });
});
