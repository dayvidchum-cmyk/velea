import { describe, it, expect } from "vitest";
import { computeTransitPressure, type NatalLongitude, type TransitLongitude } from "./transit-pressure";

const SUN: NatalLongitude = { point: "Sun", longitude: 100 };
const MOON: NatalLongitude = { point: "Moon", longitude: 200 };
const LAGNA: NatalLongitude = { point: "Lagna", longitude: 1 };

describe("Layer 3 — computeTransitPressure (pure)", () => {
  it("detects a conjunction within 3° and reports orb + planet/point", () => {
    const transiting: TransitLongitude[] = [{ planet: "Saturn", longitude: 102.1 }];
    const active = computeTransitPressure([SUN, MOON], transiting);
    expect(active).toHaveLength(1);
    expect(active[0].transitingPlanet).toBe("Saturn");
    expect(active[0].natalPoint).toBe("Sun");
    expect(active[0].orb).toBeCloseTo(2.1, 5);
  });

  it("excludes separations beyond the 3° orb", () => {
    const transiting: TransitLongitude[] = [{ planet: "Saturn", longitude: 104 }];
    expect(computeTransitPressure([SUN], transiting)).toHaveLength(0);
  });

  it("severity bands: <1 high, 1–2 moderate, 2–3 low", () => {
    const hi = computeTransitPressure([SUN], [{ planet: "Saturn", longitude: 100.5 }]);
    const mod = computeTransitPressure([SUN], [{ planet: "Saturn", longitude: 101.5 }]);
    const low = computeTransitPressure([SUN], [{ planet: "Saturn", longitude: 102.5 }]);
    expect(hi[0].severity).toBe("high");
    expect(mod[0].severity).toBe("moderate");
    expect(low[0].severity).toBe("low");
  });

  it("handles the 0/360 wrap boundary", () => {
    // transiting at 359.5° vs natal Lagna at 1° → 1.5° apart
    const active = computeTransitPressure([LAGNA], [{ planet: "Ketu", longitude: 359.5 }]);
    expect(active).toHaveLength(1);
    expect(active[0].orb).toBeCloseTo(1.5, 5);
    expect(active[0].severity).toBe("moderate");
  });

  it("reports each real conjunction separately (Rahu and Ketu distinct)", () => {
    // Rahu near Sun, Ketu (opposite) near a hypothetical point — both reported
    const transiting: TransitLongitude[] = [
      { planet: "Rahu", longitude: 100.4 },
      { planet: "Ketu", longitude: 200.2 },
    ];
    const active = computeTransitPressure([SUN, MOON], transiting);
    expect(active).toHaveLength(2);
    const planets = active.map((a) => a.transitingPlanet).sort();
    expect(planets).toEqual(["Ketu", "Rahu"]);
  });

  it("returns empty when nothing is in orb", () => {
    expect(computeTransitPressure([SUN, MOON, LAGNA], [{ planet: "Saturn", longitude: 50 }])).toEqual([]);
  });

  it("sorts tightest orb first", () => {
    const transiting: TransitLongitude[] = [
      { planet: "Saturn", longitude: 102.8 }, // 2.8 from Sun
      { planet: "Rahu", longitude: 200.3 },   // 0.3 from Moon
    ];
    const active = computeTransitPressure([SUN, MOON], transiting);
    expect(active[0].orb).toBeLessThan(active[1].orb);
  });
});
