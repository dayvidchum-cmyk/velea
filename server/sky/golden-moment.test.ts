import { describe, it, expect } from "vitest";
import { computeGoldenMoment, goldenMomentEffect, computeVerdict, universalLevel, personalLevel, whenPhrase, type GoldenMomentSignal } from "./golden-moment";
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

  it("(effect) dampens launch-flavored tasks and lifts finish-flavored tasks during an eclipse", () => {
    const eclipse: GoldenMomentSignal = { kind: "eclipse", eclipseType: "solar", daysAway: 0, direction: "caution", domain: "beginnings", weight: 0.9, favorModes: ["Restraint", "Build"], opposeModes: ["Action"], qualifierLean: "caution", summary: "" };
    const launch: any = { title: "Launch the new campaign", mode: "Selective", projectName: null };
    const finish: any = { title: "Finish the report", mode: "Selective", projectName: null };
    expect(goldenMomentEffect(launch, [eclipse]).multiplier).toBeLessThan(1);
    const f = goldenMomentEffect(finish, [eclipse]);
    expect(f.multiplier).toBeGreaterThan(1);
    expect(f.bubbles).toContain("eclipse: finish");
  });

  it("(effect) lifts a task whose content matches a favoring planet, with a bubble", () => {
    const jup: GoldenMomentSignal = { kind: "lit-house", planet: "Jupiter", house: 10, direction: "favor", domain: "growth", weight: 0.4, favorModes: ["Action", "Build"], opposeModes: [], qualifierLean: null, summary: "" };
    const task: any = { title: "Study for the course", mode: "Selective", projectName: null };
    const e = goldenMomentEffect(task, [jup]);
    expect(e.multiplier).toBeGreaterThan(1);
    expect(e.bubbles).toContain("Jupiter favors");
  });

  it("(effect) dampens a domain-matching task under a retrograde caution, with no bubble", () => {
    const merc: GoldenMomentSignal = { kind: "retrograde", planet: "Mercury", direction: "caution", domain: "communication", weight: 0.5, favorModes: ["Build", "Selective"], opposeModes: ["Action", "Selective"], qualifierLean: "review", summary: "" };
    const task: any = { title: "Send email to client", mode: "Build", projectName: null };
    const e = goldenMomentEffect(task, [merc]);
    expect(e.multiplier).toBeLessThan(1);
    expect(e.bubbles).toHaveLength(0);
  });

  it("(effect) is 1.0 with no signals and stays within the [0.7, 1.4] clamp", () => {
    const task: any = { title: "Launch launch launch publish ship", mode: "Action", projectName: null };
    expect(goldenMomentEffect(task, []).multiplier).toBe(1);
    const manyEclipses: GoldenMomentSignal[] = Array.from({ length: 8 }, () => ({ kind: "eclipse", eclipseType: "solar", daysAway: 0, direction: "caution", domain: "beginnings", weight: 1, favorModes: ["Restraint"], opposeModes: ["Action"], qualifierLean: "caution", summary: "" }));
    expect(goldenMomentEffect(task, manyEclipses).multiplier).toBeGreaterThanOrEqual(0.7);
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

describe("computeVerdict", () => {
  const favor: GoldenMomentSignal = { kind: "lit-house", planet: "Jupiter", direction: "favor", domain: "growth", weight: 0.9, favorModes: ["Action"], opposeModes: [], qualifierLean: null, summary: "" };
  const caution: GoldenMomentSignal = { kind: "eclipse", eclipseType: "solar", direction: "caution", domain: "beginnings", weight: 0.9, favorModes: ["Restraint"], opposeModes: ["Action"], qualifierLean: "caution", summary: "" };

  it("levels: net favor/caution and check-in average map to the right buckets", () => {
    expect(universalLevel([favor])).toBe("favorable");
    expect(universalLevel([caution])).toBe("unfavorable");
    expect(universalLevel([])).toBe("neutral");
    expect(personalLevel(null)).toBe("unknown");
    expect(personalLevel(4.2)).toBe("favorable");
    expect(personalLevel(2.0)).toBe("unfavorable");
    expect(personalLevel(3.0)).toBe("neutral");
  });

  it("no check-in → weather-only read, no task-type split", () => {
    const v = computeVerdict([favor], null);
    expect(v.hasCheckIn).toBe(false);
    expect(v.personalLevel).toBe("unknown");
    expect(v.forPersonal).toBeNull();
    expect(v.forCollective).toBeNull();
  });

  it("both favorable → Go all in", () => {
    const v = computeVerdict([favor], 4.5);
    expect(v.call).toBe("Go all in");
    expect(v.forPersonal).toBeTruthy();
  });

  it("both unfavorable → Hold", () => {
    const v = computeVerdict([caution], 2.0);
    expect(v.call).toBe("Hold");
  });

  it("personal favorable but universal unfavorable → mixed, trust self / hold launches", () => {
    const v = computeVerdict([caution], 4.5);
    expect(v.call).toContain("Mixed");
    expect(v.forPersonal).toMatch(/trust yourself/i);
    expect(v.forCollective).toMatch(/hold launches/i);
  });

  it("personal unfavorable but universal favorable → mixed, hold personal / moment carries collective", () => {
    const v = computeVerdict([favor], 2.0);
    expect(v.call).toContain("Mixed");
    expect(v.forCollective).toMatch(/carries/i);
  });
});

// WHEN A DATED SKY EVENT ACTUALLY IS (2026-07-21). Two lines wrote their own version of this and
// both were wrong in the same shape: `daysAway <= 0 ? <past phrase> : "in N days"`.
//
// Measured against the producers, not argued: detectStations scans `off = -12 → 60`, so daysAway
// goes negative and a station 1-3 days PAST said "just now". findEclipses starts at `off =
// stepDays` and only walks forward, so daysAway is never negative — `<= 0` fired only at exactly
// 0, meaning an eclipse happening TODAY, possibly still hours ahead, was announced as "just
// passed" on the one day it matters most.
describe("a dated sky event says when it actually is", () => {
  it("names today as today — never as already over", () => {
    expect(whenPhrase(0)).toBe("today");
    // The specific words that shipped. An eclipse still to come must not claim to be finished.
    expect(whenPhrase(0)).not.toMatch(/passed|just now|ago/);
  });

  it("a past event reads as past, with its real distance", () => {
    expect(whenPhrase(-1)).toBe("yesterday");
    expect(whenPhrase(-3)).toBe("3 days ago");
    // The station branch emits for abs(daysAway) <= 3, so every reachable past value is covered.
    for (const d of [-1, -2, -3]) expect(whenPhrase(d)).not.toMatch(/just now|^in /);
  });

  it("a future event reads as future", () => {
    expect(whenPhrase(1)).toBe("tomorrow");
    expect(whenPhrase(5)).toBe("in 5 days");
  });

  // "in 1 days" is the signature of a hand-rolled phrase and was one edit away in both originals.
  it("never produces a plural one", () => {
    for (let d = -10; d <= 10; d++) expect(whenPhrase(d)).not.toMatch(/\b1 days\b/);
  });
});
