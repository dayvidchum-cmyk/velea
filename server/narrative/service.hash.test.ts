import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
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
    // (This used to be the WHOLE of the stage guard: it hashed the same object twice, so it could
    // never fail, while carrying the name of the guard that was actually missing. See below.)
    expect(dayStableHash(stage, "deep")).toBe(dayStableHash(stage, "deep"));
    // and the no-op claim itself is worth asserting: adding a panchang must change the hash.
    expect(dayStableHash({ ...stage, panchang: { paksha: "shukla" } }, "deep")).not.toBe(dayStableHash(stage, "deep"));
  });

  it("THE STAGE INPUT CARRIES NO DAY LAYER — the year read must not re-bill every morning", () => {
    // A real leak, found 2026-07-20. `personalApex` (today's tara rung + chandra house, which move
    // almost daily) was written onto the shared `natal` object and the slow-only return shipped it.
    // dayStableHash strips volatile fields only from `input.panchang`, and a stage input has no
    // panchang — so deep/deep_full/chapter hashed a value that turned over daily, the
    // "reuse the latest matching row" path never matched, and every new day billed a fresh
    // generation of a reading whose scope is the YEAR. This asserts the shape the builder returns.
    const SRC = readFileSync(new URL("./input-builder.ts", import.meta.url), "utf8");
    const stageBlock = SRC.slice(SRC.indexOf("if (moment?.slowOnly) {"));
    const stageReturn = stageBlock.slice(stageBlock.indexOf("return { subject: { profileId: p.id }"));
    expect(stageReturn.slice(0, 200), "the stage return ships the shared natal object again")
      .toContain("natal: natalStage");
    expect(stageBlock.slice(0, stageBlock.indexOf("return {")), "personalApex is not stripped from the stage natal")
      .toMatch(/const \{ personalApex: _dayApex, \.\.\.natalStage \} = natal as any;/);

    // CONTROL, in the hash itself: a day-varying personalApex DOES move a stage hash, which is
    // exactly why it must not be in there. If this ever stops being true the guard above is moot.
    const stage = { subject: { profileId: 1 }, natal: { lagna: 175 }, profection: { year: 12 } };
    const mon = { ...stage, natal: { ...stage.natal, personalApex: { tara: "Sampat", chandraHouse: 6 } } };
    const tue = { ...stage, natal: { ...stage.natal, personalApex: { tara: "Vipat", chandraHouse: 7 } } };
    expect(dayStableHash(mon, "deep")).not.toBe(dayStableHash(tue, "deep"));
    expect(dayStableHash(stage, "deep")).not.toBe(dayStableHash(mon, "deep"));
  });
});
