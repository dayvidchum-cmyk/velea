import { describe, it, expect } from "vitest";
import { labelWithCancellation, CANCELLED_ACTIVE_LABEL, CANCELLED_LATENT_LABEL, neechaBhanga } from "./dignity.js";
import { buildLifeAreaLens } from "./life-areas.js";

/**
 * A CANCELLED FALL IS NOT A STRAINED PLANET (v796).
 *
 * David's standing law: dignity and cancellation ALWAYS travel together — a raw "Debilitated" is a
 * trap, because a cancelled debilitation is the fall-then-rise, often a raja yoga. vedic/dignity.ts
 * has computed neecha bhanga since it was written. The consumers never asked it: the life-area lens
 * and day-frame both classify on labels produced by panchang/dignity.ts, which has no concept of
 * cancellation at all. His own Moon — debilitated in Scorpio, cancelled — read as strained.
 *
 * DAVID'S RULING, 2026-07-20, taken from canon/yogas.json rather than from my instinct: a cancelled
 * fall "can act as if exalted" — SUPPORTIVE — but gated by the canon's own dashaGate rule, so it is
 * a strength only while a period of the planets forming it runs. Outside that period it is a fall
 * that will convert: not strained, not yet supported.
 *
 * Every assertion here fails against the pre-v796 code, where the label was the bare tier.
 */

// A chart built to cancel: Moon debilitated in Scorpio (218°), and Mars — lord of Scorpio, the
// debilitation sign — in a kendra from the Aries ascendant. That is condition 1 of the classical set.
const CANCELLING = {
  Sun: 100, Moon: 218, Mars: 5, Mercury: 110, Jupiter: 200, Venus: 130, Saturn: 250,
};
// Same debilitated Moon, but every cancelling condition is deliberately denied. For a Moon in
// Scorpio from an Aries lagna the classical set reduces to three live checks (nothing exalts in
// Scorpio, so that one cannot fire): the dispositor Mars in a kendra from the lagna or the Moon,
// Venus — lord of the Moon's exaltation sign Taurus — in one of those kendras, and Mars aspecting
// the Moon. Kendras from Aries are Aries/Cancer/Libra/Capricorn; from Scorpio they are
// Scorpio/Aquarius/Taurus/Leo. Mars in Gemini and Venus in Virgo sit outside both sets, and Gemini
// is the 6th from Scorpio — not 4th, 7th or 8th — so Mars does not aspect the Moon either.
// (My first attempt at this fixture put Venus in Leo, which IS a kendra from the Moon, and the test
// caught it. The fixture was wrong, not the code — worth leaving in the record.)
const NOT_CANCELLING = {
  Sun: 100, Moon: 218, Mars: 65, Mercury: 110, Jupiter: 95, Venus: 160, Saturn: 65,
};
const ASC = 0; // 0° Aries

describe("labelWithCancellation is the one owner of an honest dignity label", () => {
  it("marks a debilitation the chart cancels, and names who cancels it", () => {
    const nb = neechaBhanga("Moon", CANCELLING as any, ASC);
    expect(nb.cancelled).toBe(true);
    expect(nb.by).toEqual(["Mars", "Venus"]); // Scorpio's lord in a kendra + Taurus' lord in a kendra
    const r = labelWithCancellation("Moon", "Debilitated", CANCELLING, ASC);
    expect(r.cancelled).toBe(true);
    expect(r.reasons.length).toBeGreaterThan(0);
    expect(r.by).toContain("Mars");
  });

  it("is LATENT with no period running — dashaGate, not a dial", () => {
    expect(labelWithCancellation("Moon", "Debilitated", CANCELLING, ASC).label).toBe(CANCELLED_LATENT_LABEL);
    expect(labelWithCancellation("Moon", "Debilitated", CANCELLING, ASC, []).label).toBe(CANCELLED_LATENT_LABEL);
    // A period belonging to nobody who forms it does NOT activate it. In this chart the formers are
    // Mars (dispositor of Scorpio, in a kendra, and aspecting the Moon) and Venus (lord of the
    // Moon's exaltation Taurus, also in a kendra) — my first version of this line used Venus as a
    // NON-former and the test caught me: it is one of them. The fixture was wrong, not the gate.
    expect(labelWithCancellation("Moon", "Debilitated", CANCELLING, ASC, ["Saturn", "Jupiter"]).label)
      .toBe(CANCELLED_LATENT_LABEL);
  });

  it("ACTS AS EXALTED while a forming planet's period runs", () => {
    // The debilitated planet's own period counts...
    const own = labelWithCancellation("Moon", "Debilitated", CANCELLING, ASC, ["Moon"]);
    expect(own.label).toBe(CANCELLED_ACTIVE_LABEL);
    expect(own.active).toBe(true);
    // ...and so does the canceller's, at any level.
    expect(labelWithCancellation("Moon", "Debilitated", CANCELLING, ASC, ["Jupiter", "Mars"]).label)
      .toBe(CANCELLED_ACTIVE_LABEL);
    expect(labelWithCancellation("Moon", "Debilitated", CANCELLING, ASC, [null, undefined, "Mars"]).label)
      .toBe(CANCELLED_ACTIVE_LABEL);
  });

  it("leaves an UNcancelled debilitation exactly as it was", () => {
    expect(neechaBhanga("Moon", NOT_CANCELLING as any, ASC).cancelled).toBe(false);
    // Even with every lord running: nothing to activate, because nothing cancels.
    const r = labelWithCancellation("Moon", "Debilitated", NOT_CANCELLING, ASC, ["Moon", "Mars"]);
    expect(r.label).toBe("Debilitated");
    expect(r.cancelled).toBe(false);
    expect(r.active).toBe(false);
  });

  it("never softens what it could not check — silence is not cancellation", () => {
    // Missing longitudes, a node, and a non-finite ascendant must all pass the label through.
    expect(labelWithCancellation("Moon", "Debilitated", { Moon: 218 }, ASC).label).toBe("Debilitated");
    expect(labelWithCancellation("Rahu", "Debilitated", CANCELLING, ASC).label).toBe("Debilitated");
    expect(labelWithCancellation("Moon", "Debilitated", CANCELLING, NaN).label).toBe("Debilitated");
  });

  it("passes every other dignity through untouched", () => {
    for (const l of ["Exalted", "Moolatrikona", "Own", "Friend", "Neutral", "Enemy", "—"]) {
      expect(labelWithCancellation("Moon", l, CANCELLING, ASC).label).toBe(l);
    }
    expect(labelWithCancellation("Moon", null, CANCELLING, ASC).label).toBe("—");
  });

  it("never reports a cancellation it could not verify as active", () => {
    // The gate is one-directional: an unknown dasha is latent, never assumed running.
    const r = labelWithCancellation("Moon", "Debilitated", CANCELLING, ASC, [null, undefined]);
    expect(r.active).toBe(false);
  });
});

describe("the life-area lens carries the cancellation to its consumers", () => {
  // Only the Moon's row is under test here — the rest exist so the lens has a complete chart to
  // walk. Their signs mirror the CANCELLING longitudes; the NOT_CANCELLING variant moves two
  // planets without restating this table, since no assertion reads their signs.
  const natalByPlanet = {
    Sun: { sign: "Cancer", house: 4, dignity: "Neutral", rulesHouses: [5] },
    Moon: { sign: "Scorpio", house: 8, dignity: "Debilitated", rulesHouses: [4] },
    Mars: { sign: "Aries", house: 1, dignity: "Own", rulesHouses: [1, 8] },
    Mercury: { sign: "Cancer", house: 4, dignity: "Neutral", rulesHouses: [3, 6] },
    Jupiter: { sign: "Libra", house: 7, dignity: "Neutral", rulesHouses: [9, 12] },
    Venus: { sign: "Leo", house: 5, dignity: "Neutral", rulesHouses: [2, 7] },
    Saturn: { sign: "Sagittarius", house: 9, dignity: "Neutral", rulesHouses: [10, 11] },
  };

  const lensFor = (lon: Record<string, number>, dasha: any = null) =>
    buildLifeAreaLens({
      area: "home", // 4th house — ruled by the Moon from an Aries lagna
      lonByPlanet: lon, ascLon: ASC, lagnaSign: "Aries",
      natalByPlanet, transits: [], dasha,
    });

  it("labels the cancelled house lord latent when no period of its formers runs", () => {
    const lens = lensFor(CANCELLING, null);
    expect(lens.houseLord?.planet).toBe("Moon");
    expect(lens.houseLord?.natalDignity).toBe(CANCELLED_LATENT_LABEL);
    expect(lens.houseLord?.cancelledDebilitation?.reasons.length).toBeGreaterThan(0);
    expect(lens.houseLord?.cancelledDebilitation?.by).toContain("Mars");
    expect(lens.houseLord?.cancelledDebilitation?.active).toBe(false);
  });

  it("flips it to acting-as-exalted when the canceller's dasha runs", () => {
    const lens = lensFor(CANCELLING, { mahaDasha: { lord: "Mars" } });
    expect(lens.houseLord?.natalDignity).toBe(CANCELLED_ACTIVE_LABEL);
    expect(lens.houseLord?.cancelledDebilitation?.active).toBe(true);
  });

  it("and when the fallen planet's own dasha runs, at any level", () => {
    const lens = lensFor(CANCELLING, { pratyantarDasha: { lord: "Moon" } });
    expect(lens.houseLord?.natalDignity).toBe(CANCELLED_ACTIVE_LABEL);
  });

  it("still says Debilitated when the chart does not cancel it", () => {
    const lens = lensFor(NOT_CANCELLING);
    expect(lens.houseLord?.natalDignity).toBe("Debilitated");
    expect(lens.houseLord?.cancelledDebilitation).toBeNull();
  });

  it("keeps the varga label bare — there is no canon here for cancelling inside a divisional", () => {
    const lens = lensFor(CANCELLING, { mahaDasha: { lord: "Mars" } });
    expect(lens.houseLord?.vargaDignity).not.toBe(CANCELLED_LATENT_LABEL);
    expect(lens.houseLord?.vargaDignity).not.toBe(CANCELLED_ACTIVE_LABEL);
  });
});
