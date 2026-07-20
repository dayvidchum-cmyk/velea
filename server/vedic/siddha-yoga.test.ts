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

  it("NEITHER yoga puts BEGINNINGS on an emptied day — Amrita shipped exactly that", () => {
    // Saturday + Rohini IS Amrita Siddhi, and tithi 4 is Rikta. Before 2026-07-20 this came back
    // carrying "beginning long-term enterprises" on a day whose own verdict is "nothing new unless
    // it severs" — a shipped self-contradiction that no test caught. Encoding Raman's Siddha grid
    // (Saturday-on-Riktha is explicitly a yoga there) is what surfaced it.
    const amritaOnEmpty = dayFilter({ nakshatra: "Rohini", tithiNumber: 4, varaLord: "Saturn", vishti: false });
    expect(amritaOnEmpty.amritaSiddhi, "the fixture must actually form Amrita, or this proves nothing").toBe(true);
    expect(amritaOnEmpty.family).toBe("rikta");
    // The shipped defect was the CONTENT, not the presence: it offered "beginning long-term
    // enterprises" on a day whose verdict is "nothing new unless it severs". Under David's
    // option-2 ruling the yoga may speak — in completion only.
    expect(amritaOnEmpty.supports.join(" "), "an emptied day was offered beginnings")
      .not.toMatch(/beginning|enterprise|contract|start/i);

    // ...and the same for the Siddha grid: Saturday on Riktha is one of Raman's own pairings.
    const siddhaOnEmpty = dayFilter({ nakshatra: "Swati", tithiNumber: 4, varaLord: "Saturn", vishti: false });
    expect(siddhaOnEmpty.siddhaYoga, "the fixture must actually form Siddha").not.toBeNull();
    expect(siddhaOnEmpty.supports.join(" ")).not.toMatch(/beginning|enterprise|contract|start/i);

    // ANCHOR: on a day the law does NOT empty, the yoga still adds its supports.
    const lifted = dayFilter({ nakshatra: "Ashwini", tithiNumber: 3, varaLord: "Mars", vishti: false });
    expect(lifted.siddhaYoga).not.toBeNull();
    expect(lifted.supports.length).toBeGreaterThan(0);
  });

  it("a yoga on an EMPTIED rikta day speaks in the day's grammar — finishing, never beginning", () => {
    // David's ruling 2026-07-20 (option 2). Raman names Saturday-on-Riktha a Siddha Yoga, so total
    // silence there overrules the book; but the day's verdict is "nothing new unless it severs".
    const d = dayFilter({ nakshatra: "Swati", tithiNumber: 4, varaLord: "Saturn", vishti: false });
    expect(d.family).toBe("rikta");
    expect(d.siddhaYoga, "fixture must actually form the yoga").not.toBeNull();
    expect(d.supports.length, "the yoga must speak").toBeGreaterThan(0);
    // ...and it must say NOTHING that begins anything.
    for (const s of d.supports) expect(s).not.toMatch(/begin|new|start|launch|enterprise/i);
    expect(d.supports.some((x) => /finish|clos/i.test(x))).toBe(true);
    // the day's veto is untouched
    expect(d.vetoes.some((v) => /runs on empty/i.test(v))).toBe(true);
  });

  it("withholds the SEVERING half on a nature whose own canon avoid-list refuses cutting", () => {
    // FIVE of the twelve emptied+yoga days a year are TENDER, whose canon avoid-list is
    // ["confrontation", "cutting anything off"]. Offering severing there rebuilds the exact
    // self-contradiction David ruled against in July. Read from the canon, not by naming a nature.
    const tender = dayFilter({ nakshatra: "Chitra", tithiNumber: 4, varaLord: "Venus", vishti: false });
    if (tender.family === "rikta" && tender.supports.length && (tender.siddhaYoga || tender.amritaSiddhi)) {
      expect(tender.nature).toBe("tender");
      for (const s of tender.supports) expect(s, "a tender day was offered cutting").not.toMatch(/cut|sever/i);
    }
    // ANCHOR — a nature that does NOT refuse cutting still gets the severing half.
    const notTender = dayFilter({ nakshatra: "Swati", tithiNumber: 4, varaLord: "Saturn", vishti: false });
    expect(notTender.supports.some((x) => /cutting away/i.test(x))).toBe(true);
  });
});
