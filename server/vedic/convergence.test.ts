import { describe, it, expect } from "vitest";
import { computeConvergenceTimeline, natalMapOf } from "./convergence";
import { buildKnots } from "./knots";

const MS_PER_YEAR = 365.25 * 24 * 60 * 60 * 1000;
const BIRTH = Date.UTC(1990, 5, 15, 8, 30);

/**
 * Engineered chart, Aries lagna (lagnaLon 15):
 *  - 7th house = Libra, its lord Venus sits IN Libra (190) — the 7th lord at home.
 *  - Rahu also in Libra (195) — any Rahu period-lord is conjunct the 7th lord (the Simone
 *    signature: her Rahu maha sat with her 7th lord).
 *  - Jupiter in Aquarius (305) casts its 9th-sign aspect onto Libra — a Jupiter period
 *    aspects the 7th house.
 */
const CHART = {
  lonBy: {
    Sun: 40, Moon: 100, Mars: 130, Mercury: 70, Jupiter: 305,
    Venus: 190, Saturn: 250, Rahu: 195, Ketu: 15,
  },
  lagnaLon: 15,
  birthUtcMs: BIRTH,
};

describe("natalMapOf — the buildKnots frame from raw longitudes", () => {
  it("houses, rulership and dignity line up with whole-sign from the lagna", () => {
    const n = natalMapOf(CHART.lonBy, CHART.lagnaLon);
    expect(n.Venus.house).toBe(7);          // Libra from Aries lagna
    expect(n.Venus.rulesHouses).toEqual([2, 7]); // Taurus=2nd, Libra=7th
    expect(n.Venus.dignity).toBe("moolatrikona"); // 10° Libra sits in Venus's 0–15° moolatrikona
    expect(n.Rahu.house).toBe(7);
    expect(n.Rahu.rulesHouses).toEqual([]); // nodes hold no rulership
    expect(n.Jupiter.house).toBe(11);       // Aquarius
  });
});

describe("convergence timeline — structure", () => {
  const spans = computeConvergenceTimeline(CHART);

  it("tiles birth → age 120 gaplessly at pratyantar grain", () => {
    expect(spans[0].startMs).toBe(BIRTH);
    for (let i = 1; i < spans.length; i++) {
      expect(spans[i].startMs).toBe(spans[i - 1].endMs);
    }
    expect(spans[spans.length - 1].endMs - BIRTH).toBeGreaterThanOrEqual(120 * MS_PER_YEAR);
  });

  it("every span carries its full lord chain", () => {
    for (const s of spans.slice(0, 50)) {
      expect(s.maha).toBeTruthy();
      expect(s.antar).toBeTruthy();
      expect(s.pratyantar).toBeTruthy();
    }
  });

  it("spans sharing a lord-triple share the identical themes object (single law, cached)", () => {
    const byKey = new Map<string, object>();
    for (const s of spans) {
      const k = `${s.maha}|${s.antar}|${s.pratyantar}`;
      if (byKey.has(k)) expect(s.themes).toBe(byKey.get(k)); // same reference
      else byKey.set(k, s.themes);
    }
  });
});

describe("convergence timeline — Step 15 agreement with buildKnots (one law)", () => {
  const spans = computeConvergenceTimeline(CHART);

  it("a Venus-maha + Rahu-antar span converges on marriage (lord at home + node conjunct lord)", () => {
    const span = spans.find((s) => s.maha === "Venus" && s.antar === "Rahu" && s.pratyantar === "Venus");
    expect(span).toBeDefined();
    const m = span!.themes.marriage!;
    expect(m).toBeDefined();
    // Venus (7th lord in the 7th) ties; Rahu (conjunct the 7th lord) ties.
    expect(m.lords).toEqual(expect.arrayContaining(["Venus", "Rahu"]));
    expect(m.convergence).toBeGreaterThanOrEqual(2);
    expect(m.mahaTied).toBe(true);
    expect(m.lit).toBe(true); // standing rule: mahaTied ∧ conv ≥ 2
  });

  it("matches a direct buildKnots call for the same triple exactly", () => {
    const natal = natalMapOf(CHART.lonBy, CHART.lagnaLon);
    const { all } = buildKnots({ natal, dashaLords: { maha: "Venus", antar: "Rahu", praty: "Jupiter" } });
    const direct = Object.fromEntries(all.filter((k) => k.convergence >= 1)
      .map((k) => [k.theme, { convergence: k.convergence, weight: k.weight, mahaTied: k.mahaTied, lit: k.lit, lords: k.activeLords }]));
    const span = spans.find((s) => s.maha === "Venus" && s.antar === "Rahu" && s.pratyantar === "Jupiter");
    expect(span).toBeDefined();
    expect(span!.themes).toEqual(direct);
  });

  it("a maha not tied to marriage cannot light it as standing, whatever the sub-lords do", () => {
    // Sun rules the 5th (Leo) here and sits in the 1st (Taurus? no — Sun 40 = Taurus = 2nd house).
    // Sun has no marriage tie: any Sun-maha span must have mahaTied=false → lit=false.
    for (const s of spans.filter((x) => x.maha === "Sun")) {
      const m = s.themes.marriage;
      if (m) {
        expect(m.mahaTied).toBe(false);
        expect(m.lit).toBe(false);
      }
    }
  });

  it("quiet spans store an empty themes object, not fabricated ties", () => {
    // Some triple somewhere should be entirely quiet or at least missing most themes —
    // verify no theme ever appears with convergence 0.
    for (const s of spans) {
      for (const t of Object.values(s.themes)) {
        expect(t!.convergence).toBeGreaterThanOrEqual(1);
      }
    }
  });
});

describe("the heavy lord — one law, and it ranks rather than gates (v798)", () => {
  // Aries lagna, MC in Libra: Venus (7th lord, in Libra) and Rahu (also Libra) are AXIS-SEATED.
  const MC_LON = 190; // Libra — so the MC/IC axis is Libra/Aries
  const WITH_MC = { ...CHART, mcLon: MC_LON };

  it("weights an axis-seated tied lord, and the stored row says so", () => {
    const spans = computeConvergenceTimeline(WITH_MC);
    const span = spans.find((s) => s.maha === "Venus" && s.antar === "Rahu" && s.pratyantar === "Venus");
    const m = span!.themes.marriage!;
    // Venus and Rahu both tie AND both sit on the axis → 2 lords, +2 weight.
    expect(m.convergence).toBe(2);
    expect(m.weight).toBeGreaterThan(m.convergence);
  });

  it("stores the honest LORD COUNT as convergence, never the weighted number", () => {
    const spans = computeConvergenceTimeline(WITH_MC);
    for (const s of spans) {
      for (const t of Object.values(s.themes)) {
        // Before v798 the weighted number was stored AS `convergence`, so a row could claim more
        // tied lords than it listed. The list is the proof.
        expect(t!.convergence).toBe(t!.lords.length);
        expect(t!.weight).toBeGreaterThanOrEqual(t!.convergence);
      }
    }
  });

  it("A SINGLE axis-seated maha lord does NOT light a standing chapter alone", () => {
    // The founding wound. One tied lord, doubled by the meridian, reaches 2 — and must still not
    // light, because nobody agrees with it. This is what knots.test.ts caught when the gate briefly
    // read `weight`, and what the STORED timeline had been getting wrong since v639.
    const spans = computeConvergenceTimeline(WITH_MC);
    let checked = 0;
    for (const s of spans) {
      for (const t of Object.values(s.themes)) {
        if (t!.lords.length === 1 && t!.weight >= 2) {
          expect(t!.lit).toBe(false);
          checked++;
        }
      }
    }
    // The probe must be able to fail: if no such span exists, this asserts nothing.
    expect(checked).toBeGreaterThan(0);
  });

  it("live buildKnots and the stored timeline agree on the same triple, weights included", () => {
    const spans = computeConvergenceTimeline(WITH_MC);
    const natal = natalMapOf(CHART.lonBy, CHART.lagnaLon);
    // The axis-seated set the timeline derives, restated here from the chart itself.
    const axis = Object.entries(CHART.lonBy)
      .filter(([, lon]) => Math.floor(lon / 30) === 6 || Math.floor(lon / 30) === 0)
      .map(([p]) => p);
    const { all } = buildKnots({
      natal, dashaLords: { maha: "Venus", antar: "Rahu", praty: "Jupiter" }, meridianOnAxis: axis,
    });
    const direct = Object.fromEntries(all.filter((k) => k.convergence >= 1)
      .map((k) => [k.theme, { convergence: k.convergence, weight: k.weight, mahaTied: k.mahaTied, lit: k.lit, lords: k.activeLords }]));
    const span = spans.find((s) => s.maha === "Venus" && s.antar === "Rahu" && s.pratyantar === "Jupiter");
    expect(span!.themes).toEqual(direct);
    // And it must actually be exercising the weighting, or the agreement is vacuous.
    expect(Object.values(direct).some((t: any) => t.weight > t.convergence)).toBe(true);
  });
});
