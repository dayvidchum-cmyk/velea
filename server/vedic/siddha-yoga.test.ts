import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { siddhaYoga, dayFilter } from "./day-filter.js";
import siddha from "./canon/siddha-yoga.json";
import muhurta from "./canon/muhurta-tables.json";

/**
 * SIDDHA YOGA — encoded on David's ruling, 2026-07-20.
 *
 * The grid sat transcribed-but-unencoded because three of Raman's 1941 star names could not be
 * recovered from a dirty scan. He ruled: "sounds like the answer is to make the names on the siddha
 * yoga source grid match the spellings and names we have been using elsewhere." So bare "Uttara"
 * is Uttara Phalguni, "Blwvishta" is Dhanishtha, "Animidha" is Anuradha.
 *
 * What this file guards is that the encoding stays a TRANSCRIPTION: every star it names must be one
 * of the 27 the engine actually emits (an unmatchable spelling is a rule that silently never fires
 * — that exact bug cost this repo a nakshatra for months), the tithi lists must match the source
 * markdown, and the yoga must never clear a veto.
 */
const SOURCE = readFileSync(new URL("./canon/siddha-yoga-source.md", import.meta.url), "utf8");

const CANON_STARS = new Set<string>(
  Object.entries((muhurta as any).nakshatraNature)
    .filter(([k]) => k !== "_desc")
    .flatMap(([, v]: any) => v.nakshatras as string[]),
);

const rows = () => Object.entries((siddha as any).byWeekday) as Array<[string, any]>;

describe("the Siddha Yoga grid is a transcription, not an invention", () => {
  it("names only stars the engine actually emits", () => {
    expect(CANON_STARS.size).toBe(27); // denominator
    const unknown: string[] = [];
    for (const [day, row] of rows()) {
      for (const s of row.nakshatras as string[]) if (!CANON_STARS.has(s)) unknown.push(`${day}: ${s}`);
    }
    expect(unknown, `stars no chart can ever match: ${unknown.join(", ")}`).toEqual([]);
  });

  it("carries David's three rulings, and the source still shows what they replaced", () => {
    // The encoded grid uses the normalised names...
    expect((siddha as any).byWeekday.Sunday.nakshatras).toContain("Uttara Phalguni");
    expect((siddha as any).byWeekday.Monday.nakshatras).toContain("Dhanishtha");
    expect((siddha as any).byWeekday.Wednesday.nakshatras).toContain("Anuradha");
    // ...and the OCR originals stay visible in the source, so the inference is never lost.
    for (const raw of ["Blwvishta", "Animidha"]) expect(SOURCE).toContain(raw);
    expect((siddha as any)._spellings).toMatch(/David's ruling, 2026-07-20/);
  });

  it("keeps every weekday's tithi list as the source gives it", () => {
    // Written out rather than derived, so a silent edit to the JSON fails here.
    const EXPECTED: Record<string, number[] | null> = {
      Sunday: [1, 4, 6, 7, 12],
      Monday: [2, 7, 12],
      Tuesday: null, // the source gives NO tithi list for Tuesday
      Wednesday: [2, 7, 12, 3, 8, 13], // Bhadra & Jaya
      Thursday: [4, 5, 7, 9, 13, 14],
      Friday: [1, 6, 11, 2, 7, 12], // Nanda & Bhadra
      Saturday: [2, 7, 12, 4, 9, 14], // Bhadra & Riktha
    };
    for (const [day, tithis] of Object.entries(EXPECTED)) {
      expect((siddha as any).byWeekday[day].tithis, day).toEqual(tithis);
    }
  });

  it("reads Tuesday's missing tithi list as 'no requirement stated', never as 'any tithi'", () => {
    // Tuesday + Ashwini is in the grid. It must fire on the STAR, and it must not be the case that
    // Tuesday fires for a star that is NOT in the grid just because a tithi happens to match.
    expect(siddhaYoga("Mars", "Ashwini", 5)?.kind).toBe("grid");
    expect(siddhaYoga("Mars", "Ashwini", 22)?.kind).toBe("grid");
    // Krittika is not on Tuesday's list; any hit must come from the weekday-tithi claim instead.
    const other = siddhaYoga("Mars", "Krittika", 3);
    expect(other === null || other.kind === "weekday-tithi").toBe(true);
  });

  it("Raman's second claim fires on weekday and tithi alone", () => {
    // Tuesday on Jaya (3, 8, 13) — no star required.
    expect(siddhaYoga("Mars", "Krittika", 3)?.kind).toBe("weekday-tithi");
    expect(siddhaYoga("Mars", "Krittika", 4)).toBeNull(); // 4 is not Jaya
  });

  it("ANCHOR — a day with no coincidence forms nothing (the predicate can say no)", () => {
    expect(siddhaYoga("Sun", "Krittika", 3)).toBeNull();
    expect(siddhaYoga("nonsense", "Ashwini", 1)).toBeNull();
  });

  it("LIFTS but NEVER clears a veto — Raman says chances, not certainty", () => {
    // A Vishti (Bhadra) day that also forms a Siddha Yoga must keep its vetoes.
    const withVeto = dayFilter({ nakshatra: "Ashwini", tithiNumber: 3, varaLord: "Mars", vishti: true });
    expect(withVeto.siddhaYoga, "this fixture must actually form the yoga, or the test proves nothing").not.toBeNull();
    expect(withVeto.vetoes.length, "a Siddha Yoga cleared the day's vetoes").toBeGreaterThan(0);
  });

  it("NEITHER yoga refills a day the rikta law emptied — Amrita had this bug too", () => {
    // Saturday + Rohini IS Amrita Siddhi, and tithi 4 is Rikta. Before 2026-07-20 this came back
    // carrying "beginning long-term enterprises" on a day whose own verdict is "nothing new unless
    // it severs" — a shipped self-contradiction that no test caught. Encoding Raman's Siddha grid
    // (Saturday-on-Riktha is explicitly a yoga there) is what surfaced it.
    const amritaOnEmpty = dayFilter({ nakshatra: "Rohini", tithiNumber: 4, varaLord: "Saturn", vishti: false });
    expect(amritaOnEmpty.amritaSiddhi, "the fixture must actually form Amrita, or this proves nothing").toBe(true);
    expect(amritaOnEmpty.family).toBe("rikta");
    expect(amritaOnEmpty.supports, "Amrita Siddhi refilled an emptied day").toEqual([]);

    // ...and the same for the Siddha grid: Saturday on Riktha is one of Raman's own pairings.
    const siddhaOnEmpty = dayFilter({ nakshatra: "Swati", tithiNumber: 4, varaLord: "Saturn", vishti: false });
    expect(siddhaOnEmpty.siddhaYoga, "the fixture must actually form Siddha").not.toBeNull();
    expect(siddhaOnEmpty.supports, "Siddha Yoga refilled an emptied day").toEqual([]);

    // ANCHOR: on a day the law does NOT empty, the yoga still adds its supports.
    const lifted = dayFilter({ nakshatra: "Ashwini", tithiNumber: 3, varaLord: "Mars", vishti: false });
    expect(lifted.siddhaYoga).not.toBeNull();
    expect(lifted.supports.length).toBeGreaterThan(0);
  });
});
