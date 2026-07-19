import { describe, it, expect } from "vitest";
import { resolveDaySky, localToday, timezoneFor, DEFAULT_SKY } from "./resolve-day-sky.js";

const bostonUser = { locationLat: "42.3601", locationLon: "-71.0589", locationTimezone: "America/New_York" };
const seoulUser = { locationLat: "37.5665", locationLon: "126.9780", locationTimezone: "Asia/Seoul" };
const indiaBirth = { birthLocationLat: "19.0760", birthLocationLon: "72.8777", birthTimezone: "Asia/Kolkata" };
const noTzBirth = { birthLocationLat: "35.6762", birthLocationLon: "139.6503", birthTimezone: null };

describe("resolveDaySky precedence", () => {
  it("current tier wins when the user has a full stored location", () => {
    const sky = resolveDaySky({ user: seoulUser, profile: indiaBirth, dateStr: "2026-07-18" });
    expect(sky.source).toBe("current");
    expect(sky.lat).toBeCloseTo(37.5665);
    expect(sky.utcOffset).toBe(9);
    expect(sky.timezone).toBe("Asia/Seoul");
  });

  it("a partial current location (missing tz) falls through to birth", () => {
    const sky = resolveDaySky({ user: { ...seoulUser, locationTimezone: null }, profile: indiaBirth, dateStr: "2026-07-18" });
    expect(sky.source).toBe("birth");
    expect(sky.utcOffset).toBe(5.5); // IST half-hour zone survives (H10)
  });

  it("birth tier without a stored timezone estimates solar time from longitude, never Boston", () => {
    const sky = resolveDaySky({ profile: noTzBirth, dateStr: "2026-07-18" });
    expect(sky.source).toBe("birth");
    expect(sky.utcOffset).toBe(Math.round(139.6503 / 15)); // ~+9, not -4
    expect(sky.timezone).toBeNull();
  });

  it("no user and no profile → app default, offset DST-correct for the READING's date", () => {
    const jul = resolveDaySky({ dateStr: "2026-07-18" });
    const jan = resolveDaySky({ dateStr: "2026-01-18" });
    expect(jul.source).toBe("default");
    expect(jul.lat).toBe(DEFAULT_SKY.lat);
    expect(jul.utcOffset).toBe(-4); // EDT
    expect(jan.utcOffset).toBe(-5); // EST
  });

  it("current tier offset is computed for the reading's date, not now (DST)", () => {
    const jul = resolveDaySky({ user: bostonUser, dateStr: "2026-07-18" });
    const jan = resolveDaySky({ user: bostonUser, dateStr: "2026-01-18" });
    expect(jul.utcOffset).toBe(-4);
    expect(jan.utcOffset).toBe(-5);
  });

  it("southern-hemisphere latitude passes through untouched (season logic depends on sign)", () => {
    const sky = resolveDaySky({ user: { locationLat: "-33.8688", locationLon: "151.2093", locationTimezone: "Australia/Sydney" }, dateStr: "2026-07-18" });
    expect(sky.lat).toBeLessThan(0);
    expect(sky.utcOffset).toBe(10); // AEST in July (southern winter)
  });
});

describe("timezoneFor / localToday", () => {
  it("follows the same precedence: current tz → birth tz → default", () => {
    expect(timezoneFor(seoulUser, indiaBirth)).toBe("Asia/Seoul");
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
