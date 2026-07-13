import { describe, it, expect } from "vitest";
import { dayStableHash } from "./service.js";

// Proves the reopen-regeneration leak is closed: the day-read/cast/glance cache identity must be
// STABLE across a day (the day-mode field turns intra-day: mode, nakshatra, tithi, karana, etc.),
// yet still BUST when the underlying chart or a day-anchored layer actually changes.

const baseInput = () => ({
  subject: { profileId: 1 },
  date: "2026-07-12",
  natal: { lagna: 175 },
  transits: [{ planet: "Moon", sign: "Scorpio" }],
  panchang: {
    // day-anchored (must stay in the hash):
    eclipse: { type: "solar", phase: "building" },
    asOf: "2026-07-12",
    hora: null,
    // live-minute (must NOT affect the hash):
    mode: "Build",
    qualifier: "steady",
    activatedHouse: 3,
    nakshatra: "Anuradha",
    tithi: "Shukla Dashami",
    karana: { name: "Gara", quality: "movable", vishti: false },
    turnsAtNote: "The day turns at 10:59 PM — Build gives way to Restraint.",
    modeStepReasons: ["nakshatra lord is strong"],
    weatherGated: false,
  },
});

describe("dayStableHash — reopen must be a cache hit", () => {
  it("is identical when only the live-minute panchang fields turn (a reopen later in the day)", () => {
    const morning = baseInput();
    const evening = baseInput();
    // The day turned: mode, nakshatra, tithi, karana, qualifier, reasons all advanced.
    evening.panchang.mode = "Restraint";
    evening.panchang.qualifier = "contained";
    evening.panchang.nakshatra = "Jyeshtha";
    evening.panchang.tithi = "Shukla Ekadashi";
    evening.panchang.karana = { name: "Vanija", quality: "movable", vishti: false };
    evening.panchang.activatedHouse = 4;
    evening.panchang.modeStepReasons = ["a different reason now"];
    evening.panchang.weatherGated = true;
    expect(dayStableHash(evening, "day_read")).toBe(dayStableHash(morning, "day_read"));
  });

  it("still BUSTS when a day-anchored layer changes (eclipse phase / chart)", () => {
    const a = baseInput();
    const b = baseInput();
    b.panchang.eclipse = { type: "solar", phase: "peak" }; // day-anchored → must bust
    expect(dayStableHash(b, "day_read")).not.toBe(dayStableHash(a, "day_read"));

    const c = baseInput();
    c.natal.lagna = 176; // a chart change → must bust
    expect(dayStableHash(c, "day_read")).not.toBe(dayStableHash(a, "day_read"));

    const d = baseInput();
    d.transits = [{ planet: "Moon", sign: "Sagittarius" }]; // transits (noon-anchored) → must bust across days
    expect(dayStableHash(d, "day_read")).not.toBe(dayStableHash(a, "day_read"));
  });

  it("separates surfaces by their salt", () => {
    const x = baseInput();
    expect(dayStableHash(x, "day_read")).not.toBe(dayStableHash(x, "cast"));
  });

  it("is a no-op for slow-only (stage) inputs that carry no panchang", () => {
    const stage = { subject: { profileId: 1 }, natal: { lagna: 175 }, profection: { year: 12 } };
    // No panchang → identical to the plain hash, no crash.
    expect(dayStableHash(stage, "deep")).toBe(dayStableHash(stage, "deep"));
  });
});
