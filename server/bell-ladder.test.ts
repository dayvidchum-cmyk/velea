import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

/**
 * THE BELL'S LADDER AND ITS REACH (v808).
 *
 * Two defects, both of them "the code is written and nothing reads it":
 *
 *  1. POOL.crown has carried David's crown-day line since it was written, and the selector never
 *     looked at it — it went straight to the eclipse rung. The top rung of his blessed ladder
 *     (crown > eclipse > retroshade > waterfalls > horizon > ordinary) had never once fired, so a
 *     crowned day — one of the twelve apex days of a person's whole solar year — rang the ordinary
 *     stage line. It is the only PERSONAL rung, which is why it sat unwired.
 *  2. The ring loop read users.locationTimezone and nothing else, so anyone who never set a current
 *     location had no clock and was skipped forever — while the app already knew their timezone
 *     from the hometown (backfilled from birth) and the birth record.
 *
 * push.ts talks to the network, the scheduler and three tables, so these are structural assertions
 * on the source. They are narrow on purpose: each pins the exact wiring that was missing, and each
 * fails against the pre-v808 file.
 */
const SRC = readFileSync(new URL("./push.ts", import.meta.url), "utf8");

describe("the crown rung", () => {
  it("is read by the selector, not merely defined", () => {
    expect(SRC).toContain("POOL.crown"); // the line exists…
    const uses = SRC.split("POOL.crown").length - 1;
    expect(uses, "POOL.crown is defined but never read").toBeGreaterThan(1);
    expect(SRC).toMatch(/if \(isCrownDay\) return pickLine\(POOL\.crown/);
  });

  it("sits ABOVE the eclipse rung — the ladder's order is the whole point", () => {
    const crownIdx = SRC.indexOf("if (isCrownDay) return pickLine(POOL.crown");
    const eclipseIdx = SRC.indexOf("for (const ec of marks.eclipses ?? [])");
    expect(crownIdx).toBeGreaterThan(-1);
    expect(eclipseIdx).toBeGreaterThan(-1);
    expect(crownIdx).toBeLessThan(eclipseIdx);
  });

  it("draws the crown from the SAME ranked year as the calendar and the reading", () => {
    // If the bell had its own definition of a crown day it could announce an apex the calendar
    // does not show — the exact split v778/v781 closed between the reading and the calendar.
    expect(SRC).toContain("rankedSolarYearForProfile");
    expect(SRC).toContain("summary?.topDates");
    expect(SRC).not.toContain("crownDay(");   // never the old per-reading helper
  });

  it("reads the SUBSCRIBER'S OWN chart, not whichever profile is active (v821)", () => {
    // getActiveProfile returns the profile flagged isActive — the chart the user last SWITCHED TO.
    // Multi-profile is the paid seam, so that is routinely a friend's chart, and the bell is
    // addressed to the person by their own first name. Announcing someone else's crown day under
    // your name is worse than announcing nothing.
    const fn = SRC.slice(SRC.indexOf("async function isCrownDayFor"));
    const body = fn.slice(0, fn.indexOf("\n}\n"));
    expect(body).toContain("profiles.isOwner");
    // The CALL, not the word — my first version matched the mention inside the explanatory
    // comment and failed against correct code. An assertion that cannot tell a comment from a
    // call is not asserting what it claims.
    expect(body).not.toContain("getActiveProfile(");
  });

  it("fails to FALSE rather than throwing — a bad lookup must not cost the morning", () => {
    const fn = SRC.slice(SRC.indexOf("async function isCrownDayFor"));
    const body = fn.slice(0, fn.indexOf("\n}\n"));
    expect(body).toContain("catch");
    expect(body).toContain("return false");
  });
});

describe("the bell's reach", () => {
  it("walks the standing location precedence instead of current-location-or-nothing", () => {
    expect(SRC).toContain("hometownTimezone");
    expect(SRC).toContain("birthTimezone");
    // The order must be current → hometown → birth, matching resolve-day-sky.
    expect(SRC).toMatch(/hometownTimezone \?\? f\.birthTimezone \?\? f\.userBirthTz/);
  });

  it("only looks up the users who actually lack a clock", () => {
    // A fully-located userbase must cost nothing extra.
    expect(SRC).toContain("if (needTz.length)");
  });

  it("still refuses to GUESS a timezone when there is genuinely none", () => {
    // localClock's contract is skip, don't guess — the fallback adds sources, it does not invent one.
    expect(SRC).toMatch(/if \(!tz\) return null;/);
    expect(SRC).toMatch(/\?\? null;/);
  });
});
