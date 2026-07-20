import { describe, it, expect } from "vitest";
import { buildLifeAreaLens } from "./life-areas.js";

/**
 * A QUIET AREA MUST BE REACHABLE.
 *
 * The reading is instructed that "nothing much is touching this today" is a real, honest answer.
 * It could never give it: a transit was marked as bearing on an area whenever the planet WAS the
 * area's ruler or one of its karakas — which is true of Venus and love every day of every life.
 * Measured over 14,400 area-days (120 days x 12 lagnas x 10 areas): 0.0% quiet, minimum two
 * planets "touching" every area every day. Dropping that one clause gave 19.2%.
 *
 * Identity is not an event. Who rules an area is CONTEXT and already reaches the model in full
 * (rasi.houseLord, karakas, both with dignity and state). Activation must mean the sky is doing
 * something: standing in the territory, or landing on a key player.
 */

// A deliberately quiet sky: every planet parked in house 3, nothing hitting a natal point.
// Love's primary house is 7, so nothing is in its territory.
const QUIET_TRANSITS = ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn"].map((planet) => ({
  planet, sign: "Gemini", houseFromLagna: 3, retrograde: false, combust: null,
  hitsNatalPoint: null, spotlight: false, spotlightReason: null,
}));

const NATAL = Object.fromEntries(
  ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn"].map((p) => [
    p, { sign: "Aries", house: 1, dignity: "neutral", rulesHouses: [] as number[] },
  ]),
);

const lens = (transits: typeof QUIET_TRANSITS) =>
  buildLifeAreaLens({
    area: "love", lonByPlanet: Object.fromEntries(Object.keys(NATAL).map((p, i) => [p, i * 30])),
    ascLon: 5, lagnaSign: "Aries", natalByPlanet: NATAL as any, transits, dasha: null,
  });

describe("a quiet life area is reachable", () => {
  it("ANCHOR — a real sky event still activates the area (the probe can fire)", () => {
    const inTerritory = QUIET_TRANSITS.map((t) =>
      t.planet === "Saturn" ? { ...t, houseFromLagna: 7 } : t);
    const on = lens(inTerritory).activation.transitsOnArea;
    expect(on.map((t) => t.planet)).toContain("Saturn");
    expect(on.find((t) => t.planet === "Saturn")!.via).toMatch(/territory/);
  });

  it("ANCHOR — landing on a key player still activates the area", () => {
    const hit = QUIET_TRANSITS.map((t) =>
      t.planet === "Mars" ? { ...t, hitsNatalPoint: "Venus" } : t);
    expect(lens(hit).activation.transitsOnArea.map((t) => t.planet)).toContain("Mars");
  });

  it("MEASURE — a sky doing nothing to the area reports NOTHING on the area", () => {
    const on = lens(QUIET_TRANSITS).activation.transitsOnArea;
    expect(on.map((t) => `${t.planet}: ${t.via}`)).toEqual([]);
  });

  it("the area's ruler and karakas still reach the model as context, not as activation", () => {
    const l = lens(QUIET_TRANSITS);
    expect(l.rasi.houseLord).toBeTruthy();
    expect(l.karakas.length).toBeGreaterThan(0);
    expect(l.activation.transitsOnArea).toEqual([]);
  });
});
