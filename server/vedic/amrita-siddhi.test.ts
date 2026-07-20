import { describe, it, expect } from "vitest";
import { amritaSiddhi, dayFilter } from "./day-filter.js";
import tables from "./canon/muhurta-tables.json";

/**
 * AMRITA SIDDHI YOGA — the table I refused to build twice.
 *
 * I said there was "no cited source in this repo" and let that stand as a refusal. David pushed
 * back: "muhurta yogas and siddhi grids are definitely in the textbooks. i think you are making
 * assumptions." He was right. The source was in his own library — B.V. Raman, *Muhurtha*, Chapter VI
 * p.40, the SAME BOOK melana.json already cites — and I had never opened the folder.
 *
 * The refusal to type a table from memory was correct. Not looking for the table first was not.
 *
 * THE VERSE: "Sunday to Saturday respectively coinciding with the constellations Hasta, Sravana,
 * Aswini, Anuradha, Pushya, Revati and Rohini will give rise to Amita Siddha Yoga." Seven pairs,
 * one per weekday. Verified in two independent text extractions plus the book's own index entry.
 */
const CANON: any = (tables as any).amritaSiddhiYoga;

describe("the canon entry", () => {
  it("carries its source, the verse, and what was normalised", () => {
    expect(CANON._source).toMatch(/Raman/);
    expect(CANON._source).toMatch(/Chapter VI/);
    expect(CANON._verse).toMatch(/Sunday to Saturday respectively/);
    // Raman's spellings differ from the names this engine emits; the mapping must be disclosed,
    // never silently applied — that is how a "transcription" quietly becomes an edit.
    expect(CANON._transcription).toMatch(/Sravana|Aswini|Roliini/);
  });

  it("is seven pairings, one per weekday, all real nakshatras", () => {
    const NAK = ["Ashwini","Bharani","Krittika","Rohini","Mrigashira","Ardra","Punarvasu","Pushya","Ashlesha","Magha","Purva Phalguni","Uttara Phalguni","Hasta","Chitra","Swati","Vishakha","Anuradha","Jyeshtha","Mula","Purva Ashadha","Uttara Ashadha","Shravana","Dhanishtha","Shatabhisha","Purva Bhadrapada","Uttara Bhadrapada","Revati"];
    const days = Object.keys(CANON.byWeekday);
    expect(days).toEqual(["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"]);
    for (const star of Object.values<string>(CANON.byWeekday)) expect(NAK).toContain(star);
  });

  it("matches the verse exactly, in Raman's order", () => {
    expect(Object.values(CANON.byWeekday)).toEqual([
      "Hasta", "Shravana", "Ashwini", "Anuradha", "Pushya", "Revati", "Rohini",
    ]);
  });
});

describe("the detector", () => {
  it("fires on each of the seven pairings", () => {
    const byLord: Array<[string, string]> = [
      ["Sun", "Hasta"], ["Moon", "Shravana"], ["Mars", "Ashwini"], ["Mercury", "Anuradha"],
      ["Jupiter", "Pushya"], ["Venus", "Revati"], ["Saturn", "Rohini"],
    ];
    for (const [lord, star] of byLord) expect(amritaSiddhi(lord, star), `${lord}+${star}`).toBe(true);
  });

  it("does NOT fire on the same stars under the wrong weekday", () => {
    // The pairing IS the yoga. Hasta on a Monday is just Hasta.
    expect(amritaSiddhi("Moon", "Hasta")).toBe(false);
    expect(amritaSiddhi("Sun", "Rohini")).toBe(false);
    expect(amritaSiddhi("Saturn", "Pushya")).toBe(false);
  });

  it("is silent on an unknown weekday lord rather than guessing", () => {
    expect(amritaSiddhi("Rahu", "Hasta")).toBe(false);
    expect(amritaSiddhi("", "Hasta")).toBe(false);
  });
});

describe("what it does to the day, and what it must NOT do", () => {
  const base = { tithiNumber: 5, paksha: "Shukla", vishti: false, tara: null } as any;

  it("adds Raman's elections to a qualifying day", () => {
    const d = dayFilter({ ...base, varaLord: "Sun", nakshatra: "Hasta" });
    expect(d.amritaSiddhi).toBe(true);
    expect(d.supports.join(" · ")).toMatch(/beginning long-term enterprises/);
    expect(d.supports.join(" · ")).toMatch(/important life decisions/);
  });

  it("adds nothing on a day that is not the pairing", () => {
    const d = dayFilter({ ...base, varaLord: "Sun", nakshatra: "Rohini" });
    expect(d.amritaSiddhi).toBe(false);
    expect(d.supports.join(" · ")).not.toMatch(/important life decisions/);
  });

  it("does NOT clear a veto — Raman claims the best chances, not immunity", () => {
    // "chances of success would be by far the greatest" is not "the obstacle is gone", and David's
    // own calibration says these improve probability rather than ensure outcomes. A yoga that
    // erased Vishti would be exactly the overclaim he pulled back from.
    const d = dayFilter({ ...base, varaLord: "Sun", nakshatra: "Hasta", vishti: true });
    expect(d.amritaSiddhi).toBe(true);
    expect(d.vetoes.join(" ")).toMatch(/blocks starting/);
  });

  it("stays silent on a contained day — the personal layer still outranks it", () => {
    const d = dayFilter({ ...base, varaLord: "Sun", nakshatra: "Hasta",
      tara: { quality: "bad", taraNum: 7, cycle: 1 } });
    expect(d.contained).toBe(true);
    expect(d.supports.join(" · ")).not.toMatch(/important life decisions/);
  });
});
