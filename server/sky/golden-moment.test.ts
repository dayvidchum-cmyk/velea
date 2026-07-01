import { describe, it, expect } from "vitest";
import { computeGoldenMoment } from "./golden-moment";
import type { CurrentSky, SkyPlanet } from "./current-sky";

function planet(p: Partial<SkyPlanet> & { planet: string }): SkyPlanet {
  return {
    planet: p.planet,
    longitude: p.longitude ?? 0,
    sign: p.sign ?? "Aries",
    degreeInSign: p.degreeInSign ?? 0,
    nakshatra: p.nakshatra ?? "Ashwini",
    house: p.house ?? 1,
    speed: p.speed ?? 1,
    isRetrograde: p.isRetrograde ?? false,
    station: p.station ?? null,
    hits: p.hits ?? [],
  };
}

function sky(planets: SkyPlanet[], eclipses: CurrentSky["eclipses"] = []): CurrentSky {
  return { computedAt: "2026-06-30T00:00:00.000Z", planets, retrogrades: [], eclipses };
}

describe("computeGoldenMoment", () => {
  it("emits a retrograde caution for Mercury Rx that leans the qualifier to review and opposes forward modes", () => {
    const s = computeGoldenMoment(sky([planet({ planet: "Mercury", isRetrograde: true, speed: -0.1 })]));
    const rx = s.find((x) => x.kind === "retrograde" && x.planet === "Mercury");
    expect(rx).toBeTruthy();
    expect(rx!.qualifierLean).toBe("review");
    expect(rx!.opposeModes).toContain("Action");
    expect(rx!.favorModes).toContain("Build");
  });

  it("does NOT emit a retrograde signal for the always-retrograde nodes", () => {
    const s = computeGoldenMoment(sky([
      planet({ planet: "Rahu", isRetrograde: true, speed: -0.05 }),
      planet({ planet: "Ketu", isRetrograde: true, speed: -0.05 }),
    ]));
    expect(s.find((x) => x.kind === "retrograde")).toBeUndefined();
  });

  it("emits a station signal only within ±3 days", () => {
    const near = computeGoldenMoment(sky([planet({ planet: "Saturn", station: { type: "turns retrograde", date: "x", daysAway: 2 } })]));
    expect(near.find((x) => x.kind === "station")).toBeTruthy();
    const far = computeGoldenMoment(sky([planet({ planet: "Saturn", station: { type: "turns retrograde", date: "x", daysAway: 9 } })]));
    expect(far.find((x) => x.kind === "station")).toBeUndefined();
  });

  it("emits a tight natal-hit for a slow planet on a core point, weighted higher when close", () => {
    const s = computeGoldenMoment(sky([planet({ planet: "Saturn", hits: [{ natalPoint: "Moon", orb: 0.5 }] })]));
    const hit = s.find((x) => x.kind === "natal-hit");
    expect(hit).toBeTruthy();
    expect(hit!.weight).toBeGreaterThan(0.8);
    expect(hit!.favorModes).toContain("Restraint");
    expect(hit!.opposeModes).toContain("Action");
  });

  it("ignores natal hits to non-core points and hits from fast planets", () => {
    const s = computeGoldenMoment(sky([
      planet({ planet: "Saturn", hits: [{ natalPoint: "Venus", orb: 0.5 }] }), // non-core → ignored
      planet({ planet: "Mercury", hits: [{ natalPoint: "Moon", orb: 0.5 }] }), // fast planet → ignored
    ]));
    expect(s.find((x) => x.kind === "natal-hit")).toBeUndefined();
  });

  it("emits a lit-house signal only for slow planets in a lit house", () => {
    const s = computeGoldenMoment(
      sky([planet({ planet: "Jupiter", house: 10 })]),
      { litHouses: [1, 10, 6] },
    );
    const lit = s.find((x) => x.kind === "lit-house");
    expect(lit).toBeTruthy();
    expect(lit!.house).toBe(10);
    expect(lit!.direction).toBe("favor");
  });

  it("flags eclipses within 10 days and scales weight with closeness, ignoring far ones", () => {
    const s = computeGoldenMoment(sky([], [
      { type: "solar", date: "x", daysAway: 2 },
      { type: "lunar", date: "y", daysAway: 30 },
    ]));
    const ecl = s.filter((x) => x.kind === "eclipse");
    expect(ecl).toHaveLength(1);
    expect(ecl[0].eclipseType).toBe("solar");
    expect(ecl[0].opposeModes).toContain("Action");
    expect(ecl[0].weight).toBeGreaterThan(0.7);
  });

  it("returns signals sorted by weight descending", () => {
    const s = computeGoldenMoment(
      sky(
        [
          planet({ planet: "Jupiter", house: 10 }), // lit-house 0.4
          planet({ planet: "Saturn", hits: [{ natalPoint: "Sun", orb: 0.3 }] }), // natal-hit 0.9
        ],
        [{ type: "solar", date: "x", daysAway: 0 }], // eclipse ~0.9
      ),
      { litHouses: [10] },
    );
    for (let i = 1; i < s.length; i++) {
      expect(s[i - 1].weight).toBeGreaterThanOrEqual(s[i].weight);
    }
  });
});
