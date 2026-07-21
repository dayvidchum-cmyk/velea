import { describe, it, expect } from "vitest";
import { addressOf, contactsOf, disagreements, separation } from "./contacts";

/**
 * THE PRIMARY CHART (1982-04-13 17:20 Bataan) is the fixture because it is the case where the two
 * conventions are wrong in OPPOSITE directions, in the same chart:
 *
 *   Sun Pisces 29.52 / Mercury Aries 1.34   — 1.82 apart, DIFFERENT signs   (sign says "unrelated")
 *   Mars Virgo 11.92 / Saturn Virgo 24.98   — 13.06 apart, SAME sign        (sign says "fused")
 *
 * Longitudes are pinned rather than computed so this file needs no ephemeris and cannot drift with
 * one; they were printed from calculateBirthChart and are asserted against below.
 */
const LON: Record<string, number> = {
  Sun: 359.52, Moon: 235.39, Mars: 161.92, Mercury: 1.34,
  Jupiter: 193.44, Venus: 313.48, Saturn: 174.98, Rahu: 84.16, Ketu: 264.16,
};
const LAGNA = 167.97; // Virgo 17.97

describe("separation is the shortest arc, and knows nothing about signs", () => {
  it("measures across 0° without a seam", () => {
    expect(separation(359.52, 1.34)).toBeCloseTo(1.82, 2);
    expect(separation(1.34, 359.52)).toBeCloseTo(1.82, 2);
    expect(separation(10, 200)).toBeCloseTo(170, 6);   // never exceeds 180
    expect(separation(0, 180)).toBeCloseTo(180, 6);
  });
});

describe("an address is what one planet can say without reference to any other", () => {
  it("names the sign, house, star, star-lord and host", () => {
    const merc = addressOf("Mercury", LON, LAGNA);
    expect(merc.sign).toBe("Aries");
    expect(merc.house).toBe(8);
    expect(merc.nakshatra).toBe("Ashwini");
    expect(merc.nakshatraLord).toBe("Ketu");
    expect(merc.host).toBe("Mars");
    expect(merc.hostSign).toBe("Virgo");
    expect(merc.hostHouse).toBe(1);
    expect(merc.ownHouse).toBe(false);

    const sun = addressOf("Sun", LON, LAGNA);
    expect(sun.sign).toBe("Pisces");
    expect(sun.house).toBe(7);
    expect(sun.nakshatra).toBe("Revati");
    expect(sun.host).toBe("Jupiter");
  });

  it("sees a planet standing in its own sign as at home, not a guest", () => {
    // ANCHOR: nothing in this chart is at home, so a synthetic one proves the flag can fire.
    const athome = addressOf("Mars", { ...LON, Mars: 15 }, LAGNA); // Mars in Aries
    expect(athome.ownHouse).toBe(true);
    expect(athome.host).toBe("Mars");
    expect(addressOf("Mars", LON, LAGNA).ownHouse).toBe(false);
  });

  it("the exchange is visible from the addresses alone — no yoga engine required", () => {
    const merc = addressOf("Mercury", LON, LAGNA);
    const mars = addressOf("Mars", LON, LAGNA);
    expect(merc.host).toBe("Mars");
    expect(mars.host).toBe("Mercury");   // parivartana: each is a guest of the other
  });
});

describe("a contact is its own fact, and names which convention it breaks", () => {
  const all = contactsOf(LON, LAGNA);

  it("finds the tight pair the SIGN convention cannot see", () => {
    const sm = all.find((c) => [c.a, c.b].sort().join("-") === "Mercury-Sun")!;
    expect(sm, "the 1.82° pair vanished").toBeTruthy();
    expect(sm.orbDeg).toBeCloseTo(1.82, 2);
    expect(sm.sameSign).toBe(false);
    expect(sm.sameHouse).toBe(false);
    expect(sm.kind).toBe("through-the-wall");
    expect(sm.conventionsAgree).toBe(false);
    expect([sm.aSign, sm.bSign].sort()).toEqual(["Aries", "Pisces"]);
    expect([sm.aHouse, sm.bHouse].sort()).toEqual([7, 8]);
  });

  it("finds the wide pair the DEGREE convention would not call a conjunction", () => {
    const ms = all.find((c) => [c.a, c.b].sort().join("-") === "Mars-Saturn")!;
    expect(ms.orbDeg).toBeCloseTo(13.06, 2);
    expect(ms.sameSign).toBe(true);
    expect(ms.sameHouse).toBe(true);
    expect(ms.kind).toBe("across-the-room");
    expect(ms.conventionsAgree).toBe(false);
  });

  it("on THIS chart the conventions agree about nothing — which is why it broke here", () => {
    expect(all).toHaveLength(2);                    // denominator
    expect(disagreements(all)).toHaveLength(2);
    expect(all.every((c) => c.kind !== "same-party")).toBe(true);
  });

  it("CONTROL — a genuine same-party conjunction reports agreement", () => {
    // Without this, returning "disagree" unconditionally would pass every test above.
    const synthetic = contactsOf({ A: 100, B: 103 }, LAGNA);
    expect(synthetic).toHaveLength(1);
    expect(synthetic[0].kind).toBe("same-party");
    expect(synthetic[0].sameSign).toBe(true);
    expect(synthetic[0].conventionsAgree).toBe(true);
    expect(disagreements(synthetic)).toHaveLength(0);
  });

  it("CONTROL — two planets that are neither near nor sign-mates are not a contact at all", () => {
    expect(contactsOf({ A: 10, B: 200 }, LAGNA)).toHaveLength(0);
  });

  it("the orb is the caller's, and changing it changes only the degree-side answer", () => {
    // At a 1° orb the tight pair stops being a contact; the same-sign pair still is.
    const tight = contactsOf(LON, LAGNA, { orbDeg: 1 });
    expect(tight.find((c) => [c.a, c.b].sort().join("-") === "Mercury-Sun")).toBeUndefined();
    expect(tight.find((c) => [c.a, c.b].sort().join("-") === "Mars-Saturn")?.kind).toBe("across-the-room");
    // and at a 15° orb the same-sign pair flips to a full agreement
    const wide = contactsOf(LON, LAGNA, { orbDeg: 15 });
    expect(wide.find((c) => [c.a, c.b].sort().join("-") === "Mars-Saturn")?.kind).toBe("same-party");
  });
});
