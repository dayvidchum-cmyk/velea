import { describe, it, expect } from "vitest";
import { dayFrameReading } from "./day-frame";

/**
 * The day-frame dispatcher's own logic: arena routing (Moon's house → the matter), tilt
 * (Tārabala ∧ Chandrabala), condition classification (dignity → supported/strained/mixed/unlit),
 * chapter convergence, and the 8/11 D1-fallback. The varga-deep condition is exercised end-to-end
 * by the tryit script on the real chart; here we pin the routing/classification deterministically.
 */
const ZOD = ["Aries","Taurus","Gemini","Cancer","Leo","Virgo","Libra","Scorpio","Sagittarius","Capricorn","Aquarius","Pisces"];
// Aries lagna classical lordships (house-from-lagna → ruler).
const RULES: Record<string, number[]> = { Sun:[5], Moon:[4], Mars:[1,8], Mercury:[3,6], Jupiter:[9,12], Venus:[2,7], Saturn:[10,11], Rahu:[], Ketu:[] };

// Full natal map for the Aries native; `dignities` overrides specific planets' D1 dignity string.
function natalBy(dignities: Record<string, string> = {}) {
  const by: Record<string, { sign: string; house: number | null; dignity: string; rulesHouses: number[] }> = {};
  for (const p of Object.keys(RULES)) by[p] = { sign: "Aries", house: 1, dignity: dignities[p] ?? "Neutral", rulesHouses: RULES[p] };
  return by;
}
// Longitudes for the life-area path (buildLifeAreaLens needs them); one planet per sign, harmless spread.
const natalLonSpread = Object.fromEntries(Object.keys(RULES).map((p, i) => [p, i * 30 + 5]));

describe("day-frame — arena routing + tilt", () => {
  it("day-Moon in the 7th → the love/marriage arena, read in D9", () => {
    const r = dayFrameReading({
      natalLon: natalLonSpread, ascLon: 5, lagnaSign: "Aries", natalByPlanet: natalBy(),
      birthNakIdx: 0, natalMoonSignIdx: 0,   // natal Moon Aries
      dayMoonLon: 6 * 30 + 5,                // Libra → 7th from Aries
      dayNakIdx: 1,                          // Sampat (favorable tara)
    });
    expect(r.arena.house).toBe(7);
    expect(r.arena.area.toLowerCase()).toMatch(/marriage|spouse|partner/);
    expect(r.arena.varga).toBe("D9");
    // Sampat (favorable) + Moon 7th-from-natal (favorable chandra) → supported tilt
    expect(r.tilt).toBe("supported");
  });

  it("a bad-tara day tilts STRAINED regardless of the arena", () => {
    const r = dayFrameReading({
      natalLon: natalLonSpread, ascLon: 5, lagnaSign: "Aries", natalByPlanet: natalBy(),
      birthNakIdx: 0, natalMoonSignIdx: 0,
      dayMoonLon: 9 * 30 + 5,                // Capricorn → 10th
      dayNakIdx: 2,                          // Vipat (bad, cycle 1)
    });
    expect(r.arena.house).toBe(10);
    expect(r.tilt).toBe("strained");
  });
});

describe("day-frame — condition classification (via the 8/11 D1-fallback, fully controlled)", () => {
  const base = {
    natalLon: {}, ascLon: 5, lagnaSign: "Aries", birthNakIdx: 0, natalMoonSignIdx: 0,
    dayMoonLon: 7 * 30 + 5, dayNakIdx: 1, // Scorpio → 8th (fallback path, no varga)
  };

  it("a debilitated arena-ruler → STRAINED", () => {
    const r = dayFrameReading({ ...base, natalByPlanet: natalBy({ Mars: "Debilitated" }) }); // Mars rules the 8th
    expect(r.arena.house).toBe(8);
    expect(r.arena.varga).toBe("—");
    expect(r.condition).toBe("strained");
  });

  it("all-neutral significators → UNLIT (steady, nothing lit — not 'mixed')", () => {
    const r = dayFrameReading({ ...base, natalByPlanet: natalBy() });
    expect(r.condition).toBe("unlit");
  });

  it("a strong ruler with no strained significator → SUPPORTED", () => {
    const r = dayFrameReading({ ...base, natalByPlanet: natalBy({ Mars: "Own" }) });
    expect(r.condition).toBe("supported");
  });

  it("a strong RULER out-votes a strained karaka → SUPPORTED (the ruler carries the house)", () => {
    const r = dayFrameReading({ ...base, natalByPlanet: natalBy({ Mars: "Exalted", Saturn: "Debilitated" }) }); // Mars rules, Saturn = 8th karaka
    expect(r.condition).toBe("supported");
  });

  it("a NEUTRAL ruler lets the karaka break the tie → SUPPORTED via karaka", () => {
    const r = dayFrameReading({ ...base, natalByPlanet: natalBy({ Mars: "Neutral", Saturn: "Own" }) });
    expect(r.condition).toBe("supported");
  });
});

describe("day-frame — chapter convergence", () => {
  it("a running dasha lord that rules the lit house → the day plugs into the chapter", () => {
    const r = dayFrameReading({
      natalLon: {}, ascLon: 5, lagnaSign: "Aries", natalByPlanet: natalBy(),
      birthNakIdx: 0, natalMoonSignIdx: 0, dayMoonLon: 7 * 30 + 5, dayNakIdx: 1, // 8th house
      dasha: { mahaDasha: { lord: "Mars" }, antarDasha: { lord: "Venus" } },     // Mars rules the 8th
    });
    expect(r.chapter.converges).toBe(true);
    expect(r.chapter.via.join(" ")).toMatch(/Mars/);
  });

  it("a dasha with no tie to the lit house → stands apart", () => {
    const r = dayFrameReading({
      natalLon: {}, ascLon: 5, lagnaSign: "Aries", natalByPlanet: natalBy(),
      birthNakIdx: 0, natalMoonSignIdx: 0, dayMoonLon: 7 * 30 + 5, dayNakIdx: 1,
      dasha: { mahaDasha: { lord: "Moon" }, antarDasha: { lord: "Mercury" } },   // neither rules/karakas the 8th
    });
    expect(r.chapter.converges).toBe(false);
  });
});
