import { describe, it, expect } from "vitest";
import { finishDayMode } from "./service.js";

/**
 * THE DAY HAS ONE CLOCK (v789 → v794).
 *
 * `houseActivated` is the day's RULING house — the sign holding the majority of the vedic day.
 * The narrative ships that house beside a mode. If the mode is the one ruling THIS MINUTE, then on
 * every day the Moon changes sign mid-morning the model is handed a house and a mode describing two
 * different halves of the day. v789 split the engine's base mode into day-scale and sunrise-scale
 * and closed that inside the interpreter; the reading kept reading the moment.
 *
 * Every assertion below is undefined against the pre-v794 code — `dayMode` did not exist.
 *
 * Note on values: these tests assert the LAW (which base mode the answer is rooted in, and that the
 * answer does not move with the clock), never a literal mode name. The nakshatra and tithi layers
 * legitimately move a base mode to a different final mode; that is not what is under test.
 */

/** A run-independent "now" in a chosen local zone: returns the utcOffset and matching date string
 *  that place the caller at `localHour` local time, so a test can stand before or after a boundary
 *  without depending on when it is run. */
function zoneWhereLocalTimeIs(localHour: number, localMinute = 0) {
  const now = new Date();
  const nowUtcMin = now.getUTCHours() * 60 + now.getUTCMinutes();
  const wantMin = localHour * 60 + localMinute;
  // Any offset in (-24, +24) is fine for the arithmetic under test — finishDayMode only ever uses
  // it to shift the instant and derive the local date, which we derive the same way.
  const utcOffset = (wantMin - nowUtcMin) / 60;
  const local = new Date(now.getTime() + utcOffset * 3600_000);
  const dateStr = `${local.getUTCFullYear()}-${String(local.getUTCMonth() + 1).padStart(2, "0")}-${String(local.getUTCDate()).padStart(2, "0")}`;
  return { utcOffset, dateStr };
}

/** A day that OPENS in one house (base Action) and crosses into another (base Restraint) half an
 *  hour after sunrise — so the after-sign configuration rules ~23.5 of the day's 24 hours and IS
 *  the ruling house. */
const flipDay = (dateStr: string, utcOffset: number) => ({
  baseMode: "Action" as const,             // the SUNRISE house's mode
  baseModeAfterSign: "Restraint" as const, // the RULING house's mode
  signTransitionTime: "6:30 AM",
  tithi: "Panchami",
  paksha: "Shukla" as const,
  karanaName: null,
  sunriseNak: "Rohini",
  transitionTime: null,
  afterNak: null,
  sunriseLocal: "6:00 AM",
  dateStr,
  utcOffset,
});

describe("the day's mode is the day's, not the minute's", () => {
  it("roots the day mode in the RULING house, even when read from before the crossing", () => {
    // Stand at 3:00 AM local — inside the sunrise segment, hours before the sign changes.
    const { utcOffset, dateStr } = zoneWhereLocalTimeIs(3);
    const r = finishDayMode(flipDay(dateStr, utcOffset));

    // The moment is genuinely in the opening configuration...
    expect(r.modeReason.baseMode).toBe("Action");
    // ...and the DAY is just as genuinely the ruling one. Before v794 there was one field here,
    // and the reading took the first of these while naming the second one's house.
    expect(r.dayModeReason.baseMode).toBe("Restraint");
    expect(r.dayModeReason.baseMode).not.toBe(r.modeReason.baseMode);
  });

  it("gives the same answer for today as for any other date — asking later cannot change it", () => {
    // The whole law in one line: a day-scale field must not depend on when it is read. `mode` on a
    // non-today date already IS the majority answer, so it is the reference.
    const { utcOffset, dateStr } = zoneWhereLocalTimeIs(3);
    const today = finishDayMode(flipDay(dateStr, utcOffset));
    const other = finishDayMode(flipDay("2026-03-11", utcOffset));
    expect(today.dayMode).toBe(other.mode);
    expect(today.dayMode).toBe(other.dayMode);
    expect(today.dayModeReason.baseMode).toBe(other.modeReason.baseMode);
  });

  it("holds from the other side of the crossing too", () => {
    // Stand at 11:00 AM local, after the boundary: the moment now agrees with the day, and the day
    // has not moved. (The failure mode this guards is a 'fix' that just reads the last segment.)
    const { utcOffset, dateStr } = zoneWhereLocalTimeIs(11);
    const late = finishDayMode(flipDay(dateStr, utcOffset));
    const early = finishDayMode(flipDay(...(() => { const z = zoneWhereLocalTimeIs(3); return [z.dateStr, z.utcOffset] as const; })()));
    expect(late.modeReason.baseMode).toBe("Restraint");
    expect(late.dayMode).toBe(early.dayMode);
    expect(late.dayModeReason.baseMode).toBe("Restraint");
  });

  it("leaves the moment-scale field alive — the hero and the timeline still move with the day", () => {
    const { utcOffset, dateStr } = zoneWhereLocalTimeIs(3);
    const r = finishDayMode(flipDay(dateStr, utcOffset));
    // The turn is still announced: the day-scale mode must not silence the timeline.
    expect(r.turnsAtNote).toMatch(/turns at 6:30 AM/);
    expect(r.activeNakshatra).toBe("Rohini");
  });

  it("agrees with the moment on a day that crosses nothing", () => {
    const { utcOffset, dateStr } = zoneWhereLocalTimeIs(11);
    const quiet = { ...flipDay(dateStr, utcOffset), baseModeAfterSign: null, signTransitionTime: null };
    const r = finishDayMode(quiet);
    expect(r.dayMode).toBe(r.mode);
    expect(r.dayNakshatra).toBe(r.activeNakshatra);
    expect(r.dayModeReason.baseMode).toBe(r.modeReason.baseMode);
  });
});
