import { describe, it, expect } from "vitest";
import { calcPanchang } from "./astronomy.js";

/**
 * THE ENGINE MUST NOT INVENT A SUNRISE (v801).
 *
 * Above the Arctic circle the Sun does not cross the horizon for weeks at a time. The solver clamped
 * the hour-angle cosine into range and returned a time anyway — so the app reported a sunrise that
 * never happened, and because the vedic day is anchored to that instant, the nakshatra, tithi,
 * paksha, karana and the whole majority walk were all keyed to a fiction, with nothing saying so.
 *
 * The clamp stays: every caller needs a number, and solar transit ± 12h is the least-wrong anchor.
 * What changed is that the fabrication is now VISIBLE. Shadbala already refuses honestly in this
 * situation; this path now at least admits it.
 *
 * Longyearbyen, Svalbard (78.22°N) — the northernmost town with a real population.
 */
const SVALBARD = { lat: 78.22, lon: 15.65, tz: 1 };
const BOSTON = { lat: 42.36, lon: -71.06, tz: -5 };

describe("polar day and night are declared, not fabricated silently", () => {
  it("flags polar NIGHT in December", async () => {
    const a: any = await calcPanchang("2026-12-21", SVALBARD.lat, SVALBARD.lon, SVALBARD.tz);
    expect(a.noSunrise).toBe("polar-night");
  });

  it("flags polar DAY at midsummer", async () => {
    const a: any = await calcPanchang("2026-06-21", SVALBARD.lat, SVALBARD.lon, SVALBARD.tz);
    expect(a.noSunrise).toBe("polar-day");
  });

  it("says nothing at the same latitude when the Sun does rise", async () => {
    // The denominator. If this also reported a flag, the flag would mean nothing.
    const a: any = await calcPanchang("2026-03-21", SVALBARD.lat, SVALBARD.lon, SVALBARD.tz);
    expect(a.noSunrise).toBeNull();
  });

  it("never fires where the app actually has users", async () => {
    for (const d of ["2026-12-21", "2026-06-21", "2026-03-21"]) {
      const a: any = await calcPanchang(d, BOSTON.lat, BOSTON.lon, BOSTON.tz);
      expect(a.noSunrise).toBeNull();
    }
  });

  it("still returns a usable anchor, so nothing downstream crashes on a polar date", async () => {
    const a: any = await calcPanchang("2026-12-21", SVALBARD.lat, SVALBARD.lon, SVALBARD.tz);
    expect(a.sunriseLocal).toMatch(/^\d{1,2}:\d{2} (AM|PM)$/);
    expect(Number.isFinite(a.sunriseJD)).toBe(true);
    expect(a.nakshatra).toBeTruthy();
    expect(a.tithi).toBeTruthy();
  });
});
