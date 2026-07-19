import { describe, it, expect } from "vitest";
import { resolveDaySky, localToday, timezoneFor, DEFAULT_SKY, CURRENT_WINDOW_DAYS } from "./resolve-day-sky.js";

const bostonUser = { locationLat: "42.3601", locationLon: "-71.0589", locationTimezone: "America/New_York" };
const seoulUser = { locationLat: "37.5665", locationLon: "126.9780", locationTimezone: "Asia/Seoul" };
const indiaBirth = { birthLocationLat: "19.0760", birthLocationLon: "72.8777", birthTimezone: "Asia/Kolkata" };
const noTzBirth = { birthLocationLat: "35.6762", birthLocationLon: "139.6503", birthTimezone: null };
const withHometown = { ...indiaBirth, hometownLat: "48.8566", hometownLon: "2.3522", hometownTimezone: "Europe/Paris" };
// Deterministic "now" so the Q3 window logic never depends on when the suite runs.
const NOW = new Date("2026-07-18T12:00:00Z");

describe("resolveDaySky precedence", () => {
  it("current tier wins for a near-today date", async () => {
    const sky = await resolveDaySky({ user: seoulUser, profile: indiaBirth, dateStr: "2026-07-18", now: NOW });
    expect(sky.source).toBe("current");
    expect(sky.lat).toBeCloseTo(37.5665);
    expect(sky.utcOffset).toBe(9);
    expect(sky.timezone).toBe("Asia/Seoul");
  });

  it("a partial current location (missing tz) falls through to birth", async () => {
    const sky = await resolveDaySky({ user: { ...seoulUser, locationTimezone: null }, profile: indiaBirth, dateStr: "2026-07-18", now: NOW });
    expect(sky.source).toBe("birth");
    expect(sky.utcOffset).toBe(5.5); // IST half-hour zone survives (H10)
  });

  it("hometown tier sits between current and birth", async () => {
    const sky = await resolveDaySky({ profile: withHometown, dateStr: "2026-07-18", now: NOW });
    expect(sky.source).toBe("hometown");
    expect(sky.utcOffset).toBe(2); // CEST
    expect((await resolveDaySky({ user: seoulUser, profile: withHometown, dateStr: "2026-07-18", now: NOW })).source).toBe("current");
  });

  it("Q3: a far-from-today date skips stale current and reads hometown", async () => {
    const far = await resolveDaySky({ user: seoulUser, profile: withHometown, dateStr: "2026-03-01", now: NOW });
    expect(far.source).toBe("hometown");
    // edge of the window still counts as current
    const edge = await resolveDaySky({ user: seoulUser, profile: withHometown, dateStr: "2026-07-21", now: NOW });
    expect(CURRENT_WINDOW_DAYS).toBe(3);
    expect(edge.source).toBe("current");
  });

  it("Q3 guard: with NO hometown, stale current still beats the app default", async () => {
    const sky = await resolveDaySky({ user: bostonUser, dateStr: "2026-01-18", now: NOW });
    expect(sky.source).toBe("current");
    expect(sky.utcOffset).toBe(-5); // and the offset is EST — DST-correct for the READING's date
  });

  it("birth tier without a stored timezone estimates solar time from longitude, never Boston", async () => {
    const sky = await resolveDaySky({ profile: noTzBirth, dateStr: "2026-07-18", now: NOW });
    expect(sky.source).toBe("birth");
    expect(sky.utcOffset).toBe(Math.round(139.6503 / 15)); // ~+9, not -4
    expect(sky.timezone).toBeNull();
  });

  it("no user and no profile → app default, offset DST-correct for the READING's date", async () => {
    const jul = await resolveDaySky({ dateStr: "2026-07-18", now: NOW });
    const jan = await resolveDaySky({ dateStr: "2026-01-18", now: NOW });
    expect(jul.source).toBe("default");
    expect(jul.lat).toBe(DEFAULT_SKY.lat);
    expect(jul.utcOffset).toBe(-4); // EDT
    expect(jan.utcOffset).toBe(-5); // EST
  });

  it("current tier offset is computed for the reading's date, not now (DST)", async () => {
    const jul = await resolveDaySky({ user: bostonUser, dateStr: "2026-07-18", now: NOW });
    expect(jul.utcOffset).toBe(-4);
  });

  it("southern-hemisphere latitude passes through untouched (season logic depends on sign)", async () => {
    const sky = await resolveDaySky({ user: { locationLat: "-33.8688", locationLon: "151.2093", locationTimezone: "Australia/Sydney" }, dateStr: "2026-07-18", now: NOW });
    expect(sky.lat).toBeLessThan(0);
    expect(sky.utcOffset).toBe(10); // AEST in July (southern winter)
  });
});

describe("timezoneFor / localToday", () => {
  it("follows the same precedence: current tz → hometown tz → birth tz → default", () => {
    expect(timezoneFor(seoulUser, indiaBirth)).toBe("Asia/Seoul");
    expect(timezoneFor(null, withHometown)).toBe("Europe/Paris");
    expect(timezoneFor(null, indiaBirth)).toBe("Asia/Kolkata");
    expect(timezoneFor(null, null)).toBe(DEFAULT_SKY.timezone);
  });

  it("localToday rolls the date at the viewer's tz, not UTC", () => {
    // 2026-07-18 01:00 UTC = still Jul 17 in Boston (-4), already Jul 18 in Seoul (+9)
    const at = new Date("2026-07-18T01:00:00Z");
    expect(localToday(bostonUser, null, at)).toBe("2026-07-17");
    expect(localToday(seoulUser, null, at)).toBe("2026-07-18");
  });
});
