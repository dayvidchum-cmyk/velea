import { describe, it, expect } from "vitest";
import { solarRelationship, combustion, COMBUSTION_ORB } from "./affliction.js";

/**
 * THE SOLAR RELATIONSHIP (David 2026-07-23) — combustion as a graded lived state, not a boolean.
 *
 * These pin the SHAPE (the ordered progression + cazimi as the tight-end inversion + free beyond the
 * orb), not the exact cut points — those are David's first curve, tuned by looking (combustion-scan).
 * `combust`/`orbDeg` are the classical truth and stay put; the test proves they're unchanged and the
 * relationship layers on.
 */
describe("solarRelationship — the graded state by distance from the Sun", () => {
  const limit = 14; // Mercury direct, for concreteness

  it("beyond the orb is free of the Sun", () => {
    expect(solarRelationship(limit + 0.1, limit)).toBe("free");
    expect(solarRelationship(20, limit)).toBe("free");
  });

  it("the very heart (~17') is CAZIMI — the inversion, not combustion", () => {
    expect(solarRelationship(0.1, limit)).toBe("cazimi");
    expect(solarRelationship(0.28, limit)).toBe("cazimi");
  });

  it("progresses inward: mild → moderate → strong → deep → heart → cazimi", () => {
    const order = ["free", "mild-combustion", "moderate-combustion", "strong-combustion", "deep-combustion", "heart-of-the-sun", "cazimi"];
    // A distance sweep from far to near must never move BACKWARD along that order.
    let lastIdx = -1;
    for (let d = limit + 1; d >= 0.05; d -= 0.05) {
      const idx = order.indexOf(solarRelationship(d, limit));
      expect(idx).toBeGreaterThanOrEqual(0);
      expect(idx, `at ${d.toFixed(2)}° the state jumped backward`).toBeGreaterThanOrEqual(lastIdx);
      lastIdx = idx;
    }
    // And the sweep actually REACHES the extremes (not stuck in the middle).
    expect(lastIdx).toBe(order.length - 1); // ended at cazimi
  });

  it("the combustion tiers scale with the planet's OWN orb", () => {
    // The same fraction-of-orb distance is the same tier for a wide-orb and a narrow-orb planet.
    const mars = COMBUSTION_ORB.Mars.direct;   // 17
    const venus = COMBUSTION_ORB.Venus.direct; // 10
    expect(solarRelationship(mars * 0.5, mars)).toBe(solarRelationship(venus * 0.5, venus));
    expect(solarRelationship(mars * 0.9, mars)).toBe(solarRelationship(venus * 0.9, venus));
  });
});

describe("combustion() layers the state on without changing the classical truth", () => {
  it("keeps combust/orbDeg and adds relationship", () => {
    // Mercury 3° from the Sun: still combust (orb 14), deep in the glare (within 35% of the orb).
    const c = combustion("Mercury", 3, 0, false)!;
    expect(c.combust).toBe(true);           // classical truth unchanged
    expect(c.orbDeg).toBe(3);
    expect(c.limitDeg).toBe(14);
    expect(c.relationship).toBe("deep-combustion");
  });

  it("a planet clear of the Sun is free, not combust", () => {
    const c = combustion("Mercury", 20, 0, false)!;
    expect(c.combust).toBe(false);
    expect(c.relationship).toBe("free");
  });

  it("cazimi still reports combust:true (geometric) — the inversion lives in the relationship", () => {
    // David's law: layer, don't replace. The boolean stays geometric; the prose reads the state and
    // knows cazimi is the throne, not the fire.
    const c = combustion("Mercury", 0.1, 0, false)!;
    expect(c.combust).toBe(true);
    expect(c.relationship).toBe("cazimi");
  });

  it("the Sun and the nodes have no solar relationship (null)", () => {
    expect(combustion("Sun", 0, 0)).toBeNull();
    expect(combustion("Rahu", 1, 0)).toBeNull();
  });
});
