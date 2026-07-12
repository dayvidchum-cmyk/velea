import { describe, it, expect } from "vitest";
import { findEclipses, nextEclipseSeason, eclipseChartContext } from "./eclipses";

// The pure chart-mapping helpers are hand-computed. findEclipses is ephemeris-backed, so it's an
// integration check against the KNOWN Aug 2026 double eclipse (solar 8/12 in Cancer, lunar 8/28 in
// Aquarius) — the exact season David wants read.

describe("findEclipses — the Aug 2026 double eclipse", () => {
  it("finds both eclipses, correct type + sign, in order", async () => {
    const start = Date.parse("2026-07-12T00:00:00Z");
    const ecl = await findEclipses(start, 90);
    expect(ecl.length).toBe(2);
    expect(ecl[0]).toMatchObject({ date: "2026-08-12", type: "solar", sign: "Cancer" });
    expect(ecl[1]).toMatchObject({ date: "2026-08-28", type: "lunar", sign: "Aquarius" });
    // Deep-ish eclipses: within the ecliptic limits.
    expect(ecl[0].nodeDistDeg).toBeLessThanOrEqual(18);
    expect(ecl[1].nodeDistDeg).toBeLessThanOrEqual(12);
  }, 30000);
});

describe("nextEclipseSeason — clusters the pair into one season", () => {
  it("groups eclipses within ~40 days, stops at the gap", () => {
    const mk = (date: string, dateMs: number) => ({ date, dateMs, type: "solar" as const, eclLon: 0, sign: "Aries", degInSign: 0, nodeDistDeg: 5 });
    const DAY = 86400000;
    const t0 = Date.parse("2026-08-12T00:00:00Z");
    const season = nextEclipseSeason([
      mk("2026-08-12", t0),
      mk("2026-08-28", t0 + 16 * DAY),   // 16 days later → same season
      mk("2027-02-01", t0 + 173 * DAY),  // ~6 months later → next season, excluded
    ]);
    expect(season.map((e) => e.date)).toEqual(["2026-08-12", "2026-08-28"]);
  });
});

describe("eclipseChartContext — house + dispositor + axis hits (pure)", () => {
  // Virgo lagna (5° Virgo), natal Moon 25° Scorpio — David's chart shape from the diagnostic script.
  const lagnaLon = 155;  // 5° Virgo
  const moonLon = 235;   // 25° Scorpio
  const solarEcl = 114.92; // 24.9° Cancer (the real Aug-12 point)

  it("places the Aug-12 solar eclipse in the 11th, 9th from the Moon, disposed by the Moon", () => {
    const ctx = eclipseChartContext(solarEcl, lagnaLon, moonLon, {});
    expect(ctx.wholeSignHouse).toBe(11);   // Cancer is the 11th from Virgo — gains, income, networks
    expect(ctx.houseFromMoon).toBe(9);
    expect(ctx.dispositor).toBe("Moon");   // Cancer's lord
  });

  it("flags natal points on EITHER end of the eclipse axis, tightest first", () => {
    const ctx = eclipseChartContext(solarEcl, lagnaLon, moonLon, {
      Jupiter: 116,               // 1.1° from the eclipse point → conj hit
      Saturn: 293,                // ~2° from the opposition (294.92) → opp hit
      Venus: 13.5,                // far off the axis → no hit
    });
    expect(ctx.hits.map((h) => h.point)).toEqual(["Jupiter", "Saturn"]); // Venus filtered out
    expect(ctx.hits[0]).toMatchObject({ point: "Jupiter", which: "conj" });
    expect(ctx.hits[1]).toMatchObject({ point: "Saturn", which: "opp" });
  });
});
