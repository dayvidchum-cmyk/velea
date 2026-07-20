import { describe, it, expect } from "vitest";
import { dayFilter } from "./day-filter.js";

/**
 * THE SEVEN FAVORABLE STARS (David's doctrine, 2026-07-20, canon/seven-favorable-stars.md).
 *
 * I asked whether the cited nature should drive every star's score, or only overrule the ones that
 * contradict it. His answer was NEITHER, and it reframed the question: these seven are not
 * universally lucky days, they are favourable FOR PARTICULAR KINDS OF WORK — "the suitability of a
 * day depends on the complete Muhurta… and the specific activity being undertaken."
 *
 * So a single mode-score was the wrong instrument. What a day supports is a LIST, and it belongs to
 * the star, not to the seven-way class the star sits in.
 *
 * THE DEFECT THAT EXPOSED: supports came from the NATURE, and for some stars the nature is simply
 * wrong. Shatabhisha is classed movable — so the app told the reader the star of the Hundred
 * Physicians was a good day for travel and buying a vehicle.
 */
const base = { varaLord: "Monday", vishti: false, tara: null, tithiNumber: 5 } as any;
const supportsOf = (nakshatra: string) => dayFilter({ ...base, nakshatra }).supports.join(" · ");

describe("the star's own supports outrank its nature", () => {
  it("Shatabhisha is healing and investigation, NOT travel and vehicles", () => {
    const s = supportsOf("Shatabhisha");
    expect(s).toMatch(/medical treatment/);
    expect(s).toMatch(/research/);
    expect(s).toMatch(/detoxification/);
    expect(s).not.toMatch(/vehicles/);          // the actual bug: it used to say this
    expect(s).not.toMatch(/moves and relocations/);
  });

  it("Shravana is learning and teaching, not merely movement", () => {
    const s = supportsOf("Shravana");
    expect(s).toMatch(/studying/);
    expect(s).toMatch(/teaching/);
    expect(s).toMatch(/seeking advice/);
    expect(s).toMatch(/travel/);                // he kept travel on this one
  });

  it("Uttara Phalguni carries patronage — marriage, contracts, leadership", () => {
    const s = supportsOf("Uttara Phalguni");
    expect(s).toMatch(/marriage and partnerships/);
    expect(s).toMatch(/contracts and legal agreements/);
  });

  it("Uttara Bhadrapada is the slow one — research, planning, spiritual practice", () => {
    const s = supportsOf("Uttara Bhadrapada");
    expect(s).toMatch(/spiritual practice/);
    expect(s).toMatch(/long-term financial planning/);
  });

  it("Hasta is skill and dexterity", () => {
    const s = supportsOf("Hasta");
    expect(s).toMatch(/learning new skills/);
    expect(s).toMatch(/crafts and technical work/);
  });

  it("Punarvasu is renewal and second chances", () => {
    const s = supportsOf("Punarvasu");
    expect(s).toMatch(/restarting projects/);
    expect(s).toMatch(/recovery and renewal/);
  });

  it("Uttara Ashadha is endurance — long enterprises and public responsibility", () => {
    const s = supportsOf("Uttara Ashadha");
    expect(s).toMatch(/beginning long-term enterprises/);
    expect(s).toMatch(/public responsibilities/);
  });
});

const NAK = ["Ashwini","Bharani","Krittika","Rohini","Mrigashira","Ardra","Punarvasu","Pushya","Ashlesha","Magha","Purva Phalguni","Uttara Phalguni","Hasta","Chitra","Swati","Vishakha","Anuradha","Jyeshtha","Mula","Purva Ashadha","Uttara Ashadha","Shravana","Dhanishtha","Shatabhisha","Purva Bhadrapada","Uttara Bhadrapada","Revati"];

describe("all 27 stars now carry their own work (his complete table, 2026-07-20)", () => {
  // "The remaining nakshatras are not 'good' or 'bad.' In classical Muhurta, each belongs to a
  // functional category. The question is what kind of work is the star designed to support?"
  it("every star produces a non-empty supports list", () => {
    for (const n of NAK) expect(supportsOf(n), `${n} has no supports`).not.toBe("");
  });

  it("the sharp and fierce stars get their real work, not a blank", () => {
    // These were the ones a "good day / bad day" model had nothing useful to say about.
    expect(supportsOf("Ardra")).toMatch(/surgery/);
    expect(supportsOf("Mula")).toMatch(/uprooting/);
    expect(supportsOf("Bharani")).toMatch(/removing obstacles/);
    expect(supportsOf("Purva Ashadha")).toMatch(/campaigns/);
    expect(supportsOf("Magha")).toMatch(/ancestral rites/);
  });

  it("Dhanishtha is spelled the way the engine emits it", () => {
    // His table writes "Dhanishta". The canon and the engine emit "Dhanishtha". A key that does not
    // match the emitted name is a silent no-op — exactly the bug audit M11 found in the nakshatra
    // modifiers, where 'Dhanishta' never once matched.
    expect(supportsOf("Dhanishtha")).toMatch(/music/);
  });
});

describe("his classification agrees with the cited canon", () => {
  it("all 27 natures match — his table did not overrule the sourced one", async () => {
    const tables = (await import("./canon/muhurta-tables.json")).default as any;
    const canonNature: Record<string, string> = {};
    for (const [nat, v] of Object.entries<any>(tables.nakshatraNature)) {
      if (nat.startsWith("_")) continue;
      for (const star of v.nakshatras) canonNature[star] = nat;
    }
    const his: Record<string, string> = {
      Ashwini: "swift", Bharani: "fierce", Krittika: "mixed", Rohini: "fixed", Mrigashira: "tender",
      Ardra: "sharp", Punarvasu: "movable", Pushya: "swift", Ashlesha: "sharp", Magha: "fierce",
      "Purva Phalguni": "fierce", "Uttara Phalguni": "fixed", Hasta: "swift", Chitra: "tender",
      Swati: "movable", Vishakha: "mixed", Anuradha: "tender", Jyeshtha: "sharp", Mula: "sharp",
      "Purva Ashadha": "fierce", "Uttara Ashadha": "fixed", Shravana: "movable",
      Dhanishtha: "movable", Shatabhisha: "movable", "Purva Bhadrapada": "fierce",
      "Uttara Bhadrapada": "fixed", Revati: "tender",
    };
    for (const [star, nature] of Object.entries(his)) {
      expect(canonNature[star], `${star}: he says ${nature}`).toBe(nature);
    }
  });
});

describe("the per-star lists do not overwrite the cited nature table", () => {

  it("exactly seven stars carry his wording — and no eighth quietly joins", () => {
    // Two earlier versions of this check were wrong, both by INFERRING which stars were overridden
    // from their wording. That cannot work: Punarvasu's own list legitimately keeps "moves and
    // relocations", so it reads as un-overridden. Asserting the fact directly instead — each
    // signature phrase belongs to exactly ONE star, and to no other.
    const NAK = ["Ashwini","Bharani","Krittika","Rohini","Mrigashira","Ardra","Punarvasu","Pushya","Ashlesha","Magha","Purva Phalguni","Uttara Phalguni","Hasta","Chitra","Swati","Vishakha","Anuradha","Jyeshtha","Mula","Purva Ashadha","Uttara Ashadha","Shravana","Dhanishtha","Shatabhisha","Purva Bhadrapada","Uttara Bhadrapada","Revati"];
    const signature: Record<string, RegExp> = {
      "Uttara Phalguni":   /contracts and legal agreements/,
      "Uttara Ashadha":    /beginning long-term enterprises/,
      "Uttara Bhadrapada": /long-term financial planning/,
      Hasta:               /crafts and technical work/,
      Punarvasu:           /recovery and renewal/,
      Shravana:            /seeking advice/,
      Shatabhisha:         /detoxification/,
    };
    for (const [star, re] of Object.entries(signature)) {
      expect(supportsOf(star), `${star} lost its own supports`).toMatch(re);
      for (const other of NAK) {
        if (other === star) continue;
        expect(supportsOf(other), `${other} picked up ${star}'s wording`).not.toMatch(re);
      }
    }
  });
});
