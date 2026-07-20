import { describe, it, expect } from "vitest";
import { LIFE_AREAS, LIFE_AREA_ORDER, isLifeAreaKey, buildLifeAreaLens } from "./life-areas";
import { horaSign, signName, signIndexOf } from "./vargas";

// Every routing value here is checked against Kurczak & Fish Appendix IV (the varga definition
// pages). The lens math (whole-sign houses + vargaSignOf + dignity) is hand-computed, then checked
// against the code — a wrong "primary house" silently points a whole reading at the wrong area.

describe("registry — the routing IS the book (Appendix IV)", () => {
  it("routes each area to its varga / house / primary karaka", () => {
    expect(LIFE_AREAS.money.varga).toBe("D2");
    expect(LIFE_AREAS.money.primaryHouse).toBe(2);
    expect(LIFE_AREAS.money.karakas.find((k) => k.role === "primary")?.planet).toBe("Moon");
    expect(LIFE_AREAS.career.varga).toBe("D10");
    expect(LIFE_AREAS.career.primaryHouse).toBe(10);
    expect(LIFE_AREAS.career.karakas[0].planet).toBe("Saturn");
    expect(LIFE_AREAS.love.varga).toBe("D9");
    expect(LIFE_AREAS.health.varga).toBe("D30");
    expect(LIFE_AREAS.health.primaryHouse).toBe(6);
    expect(LIFE_AREAS.parents.varga).toBe("D12");
  });
  it("every ordered key resolves and every area's primary house is 1–12", () => {
    for (const k of LIFE_AREA_ORDER) {
      expect(isLifeAreaKey(k)).toBe(true);
      expect(LIFE_AREAS[k].primaryHouse).toBeGreaterThanOrEqual(1);
      expect(LIFE_AREAS[k].primaryHouse).toBeLessThanOrEqual(12);
      expect(LIFE_AREAS[k].karakas.length).toBeGreaterThan(0);
    }
  });
  it("rejects a non-area key", () => {
    expect(isLifeAreaKey("bogus")).toBe(false);
    expect(isLifeAreaKey(3)).toBe(false);
  });
});

// ── Fixture: Aries lagna (5° Aries), a spread of natal placements + today's transits + dashas. ──
const FIX = {
  ascLon: 5,
  lagnaSign: "Aries",
  lonByPlanet: { Venus: 200, Moon: 95, Jupiter: 250, Mars: 8, Sun: 100, Mercury: 40, Saturn: 300, Rahu: 150, Ketu: 330 },
  natalByPlanet: {
    Venus: { sign: "Libra", house: 7, dignity: "own", rulesHouses: [2, 7] },
    Moon: { sign: "Cancer", house: 4, dignity: "own", rulesHouses: [4] },
    Jupiter: { sign: "Sagittarius", house: 9, dignity: "own", rulesHouses: [9, 12] },
    Mars: { sign: "Aries", house: 1, dignity: "own", rulesHouses: [1, 8] },
    Mercury: { sign: "Taurus", house: 2, dignity: "neutral", rulesHouses: [3, 6] },
    Sun: { sign: "Cancer", house: 4, dignity: "neutral", rulesHouses: [5] },
    Saturn: { sign: "Capricorn", house: 10, dignity: "own", rulesHouses: [10, 11] },
  } as Record<string, { sign: string; house: number | null; dignity: string; rulesHouses: number[] }>,
  transits: [
    { planet: "Saturn", sign: "Taurus", houseFromLagna: 2, retrograde: false, combust: null, hitsNatalPoint: null, spotlight: false, spotlightReason: null },
    { planet: "Sun", sign: "Cancer", houseFromLagna: 4, retrograde: false, combust: null, hitsNatalPoint: "Venus", spotlight: true, spotlightReason: "tight on natal Venus" },
    { planet: "Rahu", sign: "Gemini", houseFromLagna: 3, retrograde: true, combust: null, hitsNatalPoint: null, spotlight: false, spotlightReason: null },
  ],
  dasha: { mahaDasha: { lord: "Venus" }, antarDasha: { lord: "Moon" }, pratyantarDasha: { lord: "Saturn" } },
};

describe("buildLifeAreaLens — Money (D2, 2nd house) from Aries lagna", () => {
  const lens = buildLifeAreaLens({ area: "money", ...FIX });

  it("reads the Rasi 2nd house: Taurus, ruled by Venus, tenanted by Mercury", () => {
    expect(lens.rasi.houseSign).toBe("Taurus");     // 2nd from Aries
    expect(lens.rasi.houseLord).toBe("Venus");       // Taurus lord
    expect(lens.rasi.occupants).toEqual(["Mercury"]); // the only planet in house 2
  });

  it("derives the D2 (Hora) lagna and 2nd house by the varga math", () => {
    // Ascendant 5° Aries → Hora lagna is Leo (odd sign, first half → Sun's hora).
    expect(lens.vargaChart.lagnaSign).toBe(signName(horaSign(5)));
    expect(lens.vargaChart.lagnaSign).toBe("Leo");
    // 2nd house of a Leo varga-lagna = Virgo, ruled by Mercury.
    expect(lens.vargaChart.houseSign).toBe("Virgo");
    expect(lens.vargaChart.houseLord).toBe("Mercury");
  });

  it("places the house lord (Venus) both natally and in the Hora", () => {
    expect(lens.houseLord?.planet).toBe("Venus");
    expect(lens.houseLord?.natalHouse).toBe(7);
    // Venus at 200° (Libra 20°) → Hora sign is Cancer (odd sign, 2nd half → Moon's hora).
    expect(lens.houseLord?.vargaSign).toBe(signName(horaSign(200)));
    expect(lens.houseLord?.vargaSign).toBe("Cancer");
  });

  it("carries the book's karakas (Moon primary, Jupiter + Mars secondary) with their state", () => {
    const planets = lens.karakas.map((k) => k.planet);
    expect(planets).toEqual(["Moon", "Jupiter", "Mars"]);
    expect(lens.karakas[0].role).toBe("primary");
    expect(lens.karakas[0].state?.natalHouse).toBe(4);        // natal Moon in Cancer/4th
  });

  it("activates the area from TODAY's sky: transit in the 2nd + a hit on the house lord", () => {
    const players = lens.activation.transitsOnArea.map((t) => t.planet);
    expect(players).toContain("Saturn");  // transiting the 2nd (money territory)
    expect(players).toContain("Sun");     // landing on natal Venus, the house lord
    expect(players).not.toContain("Rahu"); // in the 3rd, not a money player — touches nothing here
  });

  it("a KARAKA doing nothing today is roster, not news — but is named as a player once it moves", () => {
    // REVERSED 2026-07-20. This case used to assert the opposite ("a transiting KARAKA counts as
    // activation even away from the house"), justified in its own comment as "the book's logic"
    // with no citation — written during the 07-12 life-area build, not from canon and not from a
    // ruling of David's. It is what made "nothing much is touching this today" unsayable: every
    // area's ruler and karakas are in the transit list every single day, so 0 of 14,400 measured
    // area-days ever came back quiet. David's audit lists that as broken and mine to repair.
    //
    // Mars sits in the 5th, touching nothing. It is a money significator, and that fact still
    // reaches the model in full via `karakas` (with dignity and live state) — it is simply not
    // TODAY'S NEWS.
    const withMars = buildLifeAreaLens({
      ...FIX, area: "money",
      transits: [...FIX.transits, { planet: "Mars", sign: "Leo", houseFromLagna: 5, retrograde: false, combust: null, hitsNatalPoint: null, spotlight: false, spotlightReason: null }],
    });
    expect(withMars.activation.transitsOnArea.find((t) => t.planet === "Mars")).toBeUndefined();
    expect(withMars.karakas.map((k) => k.planet)).toContain("Mars"); // still on the roster

    // ...and the moment the sky gives it something to do, it activates AND is named a significator.
    const marsWorking = buildLifeAreaLens({
      ...FIX, area: "money",
      transits: [...FIX.transits, { planet: "Mars", sign: "Taurus", houseFromLagna: 2, retrograde: false, combust: null, hitsNatalPoint: null, spotlight: false, spotlightReason: null }],
    });
    const mars = marsWorking.activation.transitsOnArea.find((t) => t.planet === "Mars");
    expect(mars?.via).toMatch(/territory/);
    expect(mars?.via).toMatch(/significator/);
  });

  it("reads the dasha bearing: Venus rules the area, Moon is a significator, Saturn is unrelated", () => {
    const byLord = Object.fromEntries(lens.activation.dashaBearing.map((d) => [d.lord, d.how]));
    expect(byLord.Venus).toMatch(/rules this area/);
    expect(byLord.Moon).toMatch(/significator/);
    expect(byLord.Saturn).toBeUndefined(); // Capricorn/10th Saturn bears nothing on money here
  });
});

describe("buildLifeAreaLens — Career (D10, 10th) points somewhere different", () => {
  const lens = buildLifeAreaLens({ area: "career", ...FIX });
  it("routes the 10th house, ruled by Saturn (Capricorn), and its own D10", () => {
    expect(lens.rasi.houseSign).toBe("Capricorn");  // 10th from Aries
    expect(lens.rasi.houseLord).toBe("Saturn");
    expect(lens.varga).toBe("D10");
    expect(lens.karakas[0].planet).toBe("Saturn");
    // Saturn (career lord) sits in its own 10th natally and is the primary karaka — strong convergence.
    expect(lens.houseLord?.natalHouse).toBe(10);
  });
});
