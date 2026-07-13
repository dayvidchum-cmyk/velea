import { describe, it, expect } from "vitest";
import { buildKnots, type NatalPlanet } from "./knots";

/**
 * Knot detector — Appendix IV Step 15 convergence. These tests pin the two failure modes:
 *  - OVER-FIRE: quiet / inert charts, and a lone transit drifting through a house, must stay DARK.
 *    (The old weight-sum lit them because every lord holds title to some house.)
 *  - UNDER-FIRE: Simone's real engagement must light 'marriage' as an EVENT (the acceptance case).
 */

// ── Simone (the acceptance chart). Taurus lagna. Engaged 6/7/2026 in her fiancé's home country. ──
// Taurus lagna → Taurus1 Gemini2 Cancer3 Leo4 Virgo5 Libra6 Scorpio7 Sag8 Cap9 Aqu10 Pisces11 Aries12
const SIMONE: Record<string, NatalPlanet> = {
  Sun:     { house: 1,  sign: "Taurus",      rulesHouses: [4] },
  Moon:    { house: 4,  sign: "Leo",         rulesHouses: [3] },
  Mars:    { house: 10, sign: "Aquarius",    rulesHouses: [7, 12] },   // 7th lord (marriage)
  Mercury: { house: 2,  sign: "Gemini",      rulesHouses: [2, 5] },
  Jupiter: { house: 12, sign: "Aries",       rulesHouses: [8, 11] },
  Venus:   { house: 2,  sign: "Gemini",      rulesHouses: [1, 6] },
  Saturn:  { house: 8,  sign: "Sagittarius", rulesHouses: [9, 10] },
  Rahu:    { house: 10, sign: "Aquarius",    rulesHouses: [] },        // maha lord, sits WITH Mars
  Ketu:    { house: 4,  sign: "Leo",         rulesHouses: [] },
};

const SIMONE_ARGS = {
  natal: SIMONE,
  dashaLords: { maha: "Rahu", antar: "Moon", praty: null },
  timeLord: "Moon",
  meridianOnAxis: ["Rahu", "Mars", "Moon", "Ketu"],
  partnerGender: null as null,
};

describe("Step 15 convergence — Simone's Rahu–Moon is the MARRIAGE CHAPTER (standing)", () => {
  const res = buildKnots(SIMONE_ARGS);

  it("marriage leads with ≥2 converging lords, but as a STANDING chapter — a static natal conjunction dates nothing", () => {
    const marriage = res.lit.find((k) => k.theme === "marriage");
    expect(marriage, "marriage should light").toBeTruthy();
    // Rahu (maha) conjunct 7th-lord Mars + Moon (antar) aspects Mars → two converging lords.
    expect(marriage!.convergence).toBeGreaterThanOrEqual(2);
    expect(res.lit[0].theme).toBe("marriage"); // the headline, not buried under the Moon-year
    // CRUCIAL: without a moving trigger this is the chapter, NOT a dated event. The old code set the
    // event tier off the natal Rahu–Mars conjunction, so marriage read as "happening now" every day
    // for the whole 16-year Rahu dasha (the un-dated founding wound). It must be standing here.
    expect(marriage!.tier).toBe("standing");
  });

  it("a slow transit LANDING on the 7th-lord Mars is what dates it → event tier", () => {
    const res2 = buildKnots({
      ...SIMONE_ARGS,
      transitsHitting: [{ planet: "Jupiter", hitsNatalPoint: "Mars", houseFromLagna: 10, slow: true }],
    });
    const marriage = res2.lit.find((k) => k.theme === "marriage");
    expect(marriage!.tier).toBe("event");
    expect(res2.lit[0].theme).toBe("marriage");
  });

  it("the phantom is gone — in a later antardasha with no tie and no transit, marriage does NOT stay a dated event", () => {
    const later = buildKnots({ ...SIMONE_ARGS, dashaLords: { maha: "Rahu", antar: "Venus", praty: null }, timeLord: "Venus" });
    const marriage = later.all.find((k) => k.theme === "marriage");
    expect(marriage!.tier).not.toBe("event");
    expect(marriage!.lit).toBe(false); // conv=1, no maha+1 agreement, no trigger → dark
  });
});

describe("over-fire is fixed — inert structure stays dark", () => {
  // Aries lagna, planets spread so NO period-lord actively ties to any theme; benefic drift only.
  const RULES: Record<string, number[]> = {
    Sun: [5], Moon: [4], Mars: [1, 8], Mercury: [3, 6], Jupiter: [9, 12], Venus: [2, 7], Saturn: [10, 11], Rahu: [], Ketu: [],
  };
  const ZOD = ["Aries","Taurus","Gemini","Cancer","Leo","Virgo","Libra","Scorpio","Sagittarius","Capricorn","Aquarius","Pisces"];
  const mk = (houses: Record<string, number>): Record<string, NatalPlanet> =>
    Object.fromEntries(Object.entries(houses).map(([p, h]) => [p, { house: h, sign: ZOD[(h - 1) % 12], rulesHouses: RULES[p] }]));

  it("a quiet chart with no active period-lord ties lights nothing", () => {
    const quiet = mk({ Sun: 11, Moon: 2, Mars: 5, Mercury: 9, Jupiter: 3, Venus: 10, Saturn: 8, Rahu: 12, Ketu: 6 });
    const res = buildKnots({
      natal: quiet, dashaLords: { maha: "Mercury", antar: "Venus", praty: null }, timeLord: "Saturn",
      meridianOnAxis: [], transitsHitting: [], partnerGender: null,
    });
    expect(res.lit).toHaveLength(0);
  });

  it("a slow benefic merely transiting the 7th does NOT fabricate a marriage event", () => {
    const quiet = mk({ Sun: 11, Moon: 2, Mars: 5, Mercury: 9, Jupiter: 3, Venus: 10, Saturn: 8, Rahu: 12, Ketu: 6 });
    const res = buildKnots({
      natal: quiet, dashaLords: { maha: "Mercury", antar: "Venus", praty: null }, timeLord: "Saturn",
      meridianOnAxis: [],
      transitsHitting: [{ planet: "Saturn", hitsNatalPoint: null, houseFromLagna: 7, slow: true }],
      partnerGender: null,
    });
    const marriage = res.all.find((k) => k.theme === "marriage");
    expect(marriage!.lit).toBe(false); // transit-through-house alone is weather, not an event
  });
});

describe("convergence semantics — a natal conjunction is a chapter, a transit is the clock", () => {
  it("a lone maha conjunct the house-lord, no transit, does NOT fabricate a dated event", () => {
    // maha Rahu conjunct 7th-lord Mars, nothing else, no moving trigger → 1 lord, static.
    const res = buildKnots({
      natal: SIMONE, dashaLords: { maha: "Rahu", antar: null, praty: null }, timeLord: null,
      meridianOnAxis: [], transitsHitting: [], partnerGender: null,
    });
    const marriage = res.all.find((k) => k.theme === "marriage");
    expect(marriage!.tier).not.toBe("event");   // no clock → not dated
    expect(marriage!.lit).toBe(false);           // conv=1 alone, no agreement, no trigger → dark
  });

  it("the SAME chart + a slow transit onto the ruler → a single-lord dated event", () => {
    const res = buildKnots({
      natal: SIMONE, dashaLords: { maha: "Rahu", antar: null, praty: null }, timeLord: null,
      meridianOnAxis: [], transitsHitting: [{ planet: "Saturn", hitsNatalPoint: "Mars", houseFromLagna: null, slow: true }], partnerGender: null,
    });
    const marriage = res.all.find((k) => k.theme === "marriage");
    expect(marriage!.lit).toBe(true);
    expect(marriage!.tier).toBe("event");
    expect(marriage!.convergence).toBe(1);
  });
});
