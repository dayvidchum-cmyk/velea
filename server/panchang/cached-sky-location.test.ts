import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * THE CACHED ROW MUST NEVER NAME SOMEONE ELSE'S SKY (v795).
 *
 * The `panchang` table is keyed on DATE ALONE — no location column — so the row belongs to whoever
 * opened that date first, at THEIR coordinates. The 2026-07-19 mitigation recomputed the sky at the
 * caller's coordinates and used it for the derived values (house, mode, day filter) — and then
 * handed back the STORED moonSign, nakshatra, pada and sunrise anyway. That is worse than the
 * original bug: the reading's derived character and the sky it names disagree with each other.
 *
 * This test poisons the cached row with a sky no location produces and asserts the returned field
 * matches an INDEPENDENT calcPanchang at the caller's own coordinates. It fails against the
 * pre-v795 code, where the poison values were returned verbatim.
 */

const poison = {
  date: "2026-07-20",
  display: "Jul 20",
  sunrise: "11:47 PM",            // no sunrise anywhere is 11:47 PM
  moonSign: "Aries",
  moonLongitude: "0.0000",
  houseActivated: 1,
  nakshatra: "Ashwini",
  nakshatraPada: 4,
  tithi: "Krishna Chaturdashi",
  tithiPaksha: "Krishna",
  mode: "Restraint",
  instruction: "",
  calculatedAt: new Date(),
};

vi.mock("../db.js", () => ({
  getPanchangByDate: vi.fn(async () => poison),
  upsertPanchang: vi.fn(async () => undefined),
}));

// Seoul — deliberately far from wherever a first writer might have been.
const SEOUL = { lat: 37.5665, lon: 126.978, utcOffset: 9 };
const DATE = "2026-07-20";

describe("a cached panchang row never leaks its writer's location", () => {
  beforeEach(() => vi.clearAllMocks());

  it("emits the CALLER's sky, not the stored one", async () => {
    const { getDayField } = await import("./service.js");
    const { calcPanchang } = await import("./astronomy.js");

    const truth = await calcPanchang(DATE, SEOUL.lat, SEOUL.lon, SEOUL.utcOffset);
    const field = await getDayField(DATE, false, SEOUL, "Virgo");
    expect(field).not.toBeNull();

    // The four fields that were being served from the stranger's row.
    expect(field!.moonSign).toBe(truth.moonSign);
    expect(field!.nakshatra).toBe(truth.nakshatra);
    expect(field!.nakshatraPada).toBe(truth.nakshatraPada);
    expect(field!.sunriseLocal).toBe(truth.sunriseLocal);

    // And none of them is the poison — belt and braces, so the test cannot pass by a stub that
    // happens to agree with the sky.
    expect(field!.sunriseLocal).not.toBe(poison.sunrise);
    expect(field!.nakshatraPada).not.toBe(poison.nakshatraPada);
  });

  it("keeps the derived values agreeing with the sky it names", async () => {
    const { getDayField } = await import("./service.js");
    const { moonSignToHouse } = await import("./interpreter.js");
    const SIGNS = ["Aries","Taurus","Gemini","Cancer","Leo","Virgo","Libra","Scorpio","Sagittarius","Capricorn","Aquarius","Pisces"];

    const field = await getDayField(DATE, false, SEOUL, "Virgo");
    // The house is derived from the ruling Moon sign; if the emitted sign and the derived house
    // came from different locations this equality breaks. That mismatch is the shape of the bug.
    expect(field!.houseActivated).toBe(moonSignToHouse(SIGNS.indexOf(field!.moonSign), "Virgo"));
  });

  it("still serves the cached row when the recompute is impossible", async () => {
    // A degraded read beats no read: with unusable coordinates the fallback must hold, not throw.
    const { getDayField } = await import("./service.js");
    const field = await getDayField(DATE, false, { lat: NaN, lon: NaN, utcOffset: 0 }, "Virgo");
    expect(field).not.toBeNull();
    expect(field!.moonSign).toBe(poison.moonSign);
    expect(field!.nakshatra).toBe(poison.nakshatra);
  });
});
