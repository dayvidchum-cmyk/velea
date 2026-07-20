import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

/**
 * A PAID READING MUST NAME ITS OWN SKY.
 *
 * The `horoscopes` table froze the prose, the prompt version and the model — and no location at
 * all. The page meanwhile printed a LIVE "Lived in {city}" directly above that frozen prose. So:
 * reveal a past date with no override (computed from the hometown), later set that date's location
 * to Tokyo, and the page reads "Lived in Tokyo" over a reading whose sky was cast for the
 * hometown. Nothing in the row recorded what it was computed for, so the mismatch was
 * undetectable afterwards — on something someone paid for.
 *
 * David ran server/scripts/add-horoscope-location-columns.ts on 2026-07-20. This guards the wiring.
 */
const ROUTERS = readFileSync(new URL("./routers.ts", import.meta.url), "utf8");
const SCHEMA = readFileSync(new URL("../drizzle/schema.ts", import.meta.url), "utf8");
const PAGE = readFileSync(new URL("../client/src/pages/Horoscope.tsx", import.meta.url), "utf8");
const RESOLVER = readFileSync(new URL("./panchang/resolve-day-sky.ts", import.meta.url), "utf8");

/** The `horoscopes` table body. */
function horoscopeTable(): string {
  const m = SCHEMA.match(/export const horoscopes = mysqlTable\([\s\S]*?\n\}\)/);
  expect(m, "the horoscopes table is gone — this test is blind, not passing").toBeTruthy();
  return m![0];
}

describe("the location a paid reading was computed for", () => {
  it("the table records it", () => {
    const t = horoscopeTable();
    for (const col of ["computedLat", "computedLon", "computedTimezone", "computedCity", "computedSource"]) {
      expect(t, `horoscopes is missing ${col}`).toContain(col);
    }
  });

  it("the resolver carries a place name, so there is something to record", () => {
    // Every tier that HAS a stored name must pass it through; the type must allow null, because
    // "not stored" has to stay distinguishable from a guess.
    expect(RESOLVER).toMatch(/city:\s*string\s*\|\s*null/);
    for (const tier of ["o.city", "locationCity", "hometownCity", "birthLocation"]) {
      expect(RESOLVER, `the ${tier} tier drops its place name`).toContain(tier);
    }
  });

  it("the freeze records the SAME sky the reading was computed from", () => {
    // Not a re-resolve at write time — the identical `dayLoc` object passed to the generator.
    // Re-resolving would reintroduce the whole bug at a one-line distance.
    const reveal = ROUTERS.slice(ROUTERS.indexOf("const frozen = await insertHoroscope("));
    const call = reveal.slice(0, reveal.indexOf("});") + 3);
    for (const f of ["computedLat: dayLoc.lat", "computedLon: dayLoc.lon", "computedTimezone: dayLoc.timezone",
                     "computedCity: dayLoc.city", "computedSource: dayLoc.source"]) {
      expect(call, `the freeze does not record ${f}`).toContain(f);
    }
  });

  it("the endpoint hands the frozen place back to the reader", () => {
    const get = ROUTERS.slice(ROUTERS.indexOf("exists: true as const, date: row.readingDate"));
    expect(get.slice(0, 400)).toContain("computedCity");
  });

  it("the page prefers the frozen place and NEVER falls back to a live lookup on a read date", () => {
    // The exact defect: `dayPlace` (a live query) rendered above immutable prose.
    expect(PAGE).toMatch(/frozenPlace/);
    const line = PAGE.slice(PAGE.indexOf("{frozenPlace"), PAGE.indexOf("{frozenPlace") + 420);
    expect(line, "the frozen place must be preferred").toMatch(/frozenPlace\s*\n?\s*\?/);
    // A revealed reading with no recorded location must say something honest, not the live city.
    expect(line, "an already-revealed date must not fall through to the live location")
      .toMatch(/reading\?\.exists/);
    // and the live lookup may only be reached when the date has NOT been read.
    const liveIdx = line.indexOf("dayPlace");
    const existsIdx = line.indexOf("reading?.exists");
    expect(existsIdx).toBeGreaterThan(-1);
    expect(liveIdx, "the live lookup must come after the exists check").toBeGreaterThan(existsIdx);
  });
});
