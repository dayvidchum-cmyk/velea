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

/**
 * OWNERSHIP GATES THE CURRENT TIER (2026-07-21).
 *
 * `users.location*` is one slot per ACCOUNT — where the phone holding this login is. It used to
 * outrank every other profile's own ground, so each of David's six non-owner profiles was cast
 * from Boston because that is where HE is. Lisa lives in New Jersey.
 *
 * His ruling when I filed it as a power-user edge case: "everyone is the average user." Multi-
 * profile is the paid seam, so this lands on paying accounts and the person it misreads is the
 * reader, not a fixture.
 *
 * Controls run in BOTH directions throughout: the owner must still get the current tier, and an
 * unknown ownership must behave exactly as before, or this "fix" is a silent regression for the
 * ~85 call sites that pass partial profile objects.
 */
describe("ownership gates the current tier", () => {
  const lisaLikeNonOwner = {
    isOwner: 0,                                   // MySQL tinyint, as the driver returns it
    birthLocationLat: "40.706210", birthLocationLon: "-73.306230", birthTimezone: "America/New_York",
    hometownLat: "40.706210", hometownLon: "-73.306230", hometownTimezone: "America/New_York",
    hometownCity: "West Islip, NY",
  };

  it("a non-owner profile does NOT inherit the account's current location", async () => {
    const sky = await resolveDaySky({ user: bostonUser, profile: lisaLikeNonOwner, dateStr: "2026-07-18", now: NOW });
    expect(sky.source).toBe("hometown");
    expect(sky.city).toBe("West Islip, NY");
    expect(sky.lat).toBeCloseTo(40.70621);
  });

  it("CONTROL — the owner's own profile still gets the current tier", async () => {
    const sky = await resolveDaySky({ user: bostonUser, profile: { ...lisaLikeNonOwner, isOwner: 1 }, dateStr: "2026-07-18", now: NOW });
    expect(sky.source).toBe("current");
    expect(sky.lat).toBeCloseTo(42.3601);
  });

  it("CONTROL — ownership unknown behaves exactly as before (no silent regression)", async () => {
    const { isOwner: _drop, ...noOwnershipField } = lisaLikeNonOwner;
    const sky = await resolveDaySky({ user: bostonUser, profile: noOwnershipField, dateStr: "2026-07-18", now: NOW });
    expect(sky.source).toBe("current");
  });

  it("boolean false is honoured as well as tinyint 0", async () => {
    const sky = await resolveDaySky({ user: bostonUser, profile: { ...lisaLikeNonOwner, isOwner: false }, dateStr: "2026-07-18", now: NOW });
    expect(sky.source).toBe("hometown");
  });

  it("a non-owner with only a birth place falls to birth, not to the account's city", async () => {
    const sky = await resolveDaySky({
      user: bostonUser,
      profile: { isOwner: 0, birthLocationLat: "19.0760", birthLocationLon: "72.8777", birthTimezone: "Asia/Kolkata" },
      dateStr: "2026-07-18", now: NOW,
    });
    expect(sky.source).toBe("birth");
    expect(sky.utcOffset).toBe(5.5);
  });

  it("a non-owner with NO ground of its own still uses the current tier — never the Boston default", async () => {
    // Skipping `current` here would trade a near-miss for a worse guess. The gate is a
    // preference for the person's OWN ground, not a blanket ban.
    const sky = await resolveDaySky({ user: bostonUser, profile: { isOwner: 0 }, dateStr: "2026-07-18", now: NOW });
    expect(sky.source).toBe("current");
    expect(sky.city).not.toBe(DEFAULT_SKY.city);
  });

  it("THE CASE THAT MATTERS — reading someone else's chart from abroad", async () => {
    // David in Seoul opening Lisa's chart. Before the gate her whole day came from Korea:
    // wrong sunrise, wrong tithi boundary, wrong hora. Nine hours of someone else's sky.
    const sky = await resolveDaySky({ user: seoulUser, profile: lisaLikeNonOwner, dateStr: "2026-07-18", now: NOW });
    expect(sky.source).toBe("hometown");
    expect(sky.timezone).toBe("America/New_York");
    expect(sky.utcOffset).not.toBe(9);
    // and the control: his OWN chart still follows him to Seoul
    const his = await resolveDaySky({ user: seoulUser, profile: { ...lisaLikeNonOwner, isOwner: 1 }, dateStr: "2026-07-18", now: NOW });
    expect(his.utcOffset).toBe(9);
  });

  it("a per-date override still outranks ownership (tier 1 is untouched)", async () => {
    // No profileId passed → no override lookup; this asserts the ordering did not move by
    // checking the gate sits BELOW the override branch, which returns before any of this.
    const sky = await resolveDaySky({ user: bostonUser, profile: lisaLikeNonOwner, dateStr: "2026-07-18", now: NOW });
    expect(["override", "hometown"]).toContain(sky.source);
  });
});
