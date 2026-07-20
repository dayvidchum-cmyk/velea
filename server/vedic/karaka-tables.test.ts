import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { LIFE_AREAS } from "./life-areas.js";

/**
 * THE TWO KARAKA TABLES (v840) — and why one is NOT a corruption of the other.
 *
 * At v839 I reported that server/vedic/life-areas.ts had "drifted" from canon/karakas.json:
 * career missing Jupiter, health missing Saturn, purpose missing Sun. I called it the same class
 * as the drift I fixed in knots.ts at v790/v799 and wrote it into the audit sheet, the working
 * brief and a commit message as a defect awaiting David.
 *
 * IT IS NOT A DEFECT. They are two DIFFERENT TABLES, each cited, from the same book:
 *
 *   canon/karakas.json houseKarakaTable  — Vol I, Ch.7 house-karaka table (p66–90). General
 *                                          significators of a HOUSE. knots.ts reads this.
 *   LIFE_AREAS[*].karakas                — Vol II, Appendix IV, the varga definition pages
 *                                          (p367–374) + the per-house analysis loop (p390).
 *                                          The significators the VARGA method uses. life-areas
 *                                          transcribes this.
 *
 * They are not supposed to match, and health even carries a note recording the divergence at the
 * moment it was transcribed. I read a citation-bearing second source as a corrupted copy of the
 * first because I went looking for a class I had already named. That is a worse failure than the
 * drift I was hunting: it manufactures work and puts a false claim in David's permanent record.
 *
 * So these tests pin BOTH facts:
 *   1. the two tables genuinely differ (if someone "reconciles" them, that is the regression), and
 *   2. each internal index of the canon file agrees with itself (that IS a real invariant, and it
 *      was broken — see below).
 */

const CANON = JSON.parse(readFileSync(new URL("./canon/karakas.json", import.meta.url), "utf8"));
const houseTable: Record<string, string[]> = CANON.houseKarakaTable;
const planetK: Record<string, any> = CANON.planetKarakas;

describe("the canon file agrees with itself", () => {
  // THE REAL BUG (v840): karakas.json carries the house→planet mapping TWICE — forward in
  // houseKarakaTable, inverted in planetKarakas[p].houseKaraka. 17 of 18 pairs agreed. Saturn's
  // inverted entry was [6, 8, 12]: it had dropped the 10th, which houseKarakaTable lists and which
  // Vol II Appendix IV independently names Saturn's PRIMARY area (career). Three-way corroborated,
  // so restoring it is transcription, not interpretation.
  //
  // Nothing reads planetKarakas today, which is exactly why it rotted — and exactly why this test
  // exists rather than a shrug: the next reader gets a wrong answer with no way to notice.
  const forward = new Set<string>();
  for (const [h, ps] of Object.entries(houseTable)) {
    if (!/^\d+$/.test(h)) continue;
    for (const p of ps) forward.add(`${p}/${h}`);
  }
  const inverted = new Set<string>();
  for (const [p, v] of Object.entries(planetK)) {
    for (const h of (v.houseKaraka ?? []) as number[]) inverted.add(`${p}/${h}`);
  }

  it("every houseKarakaTable pair appears in the inverted index", () => {
    expect([...forward].filter((x) => !inverted.has(x)).sort()).toEqual([]);
  });

  it("and the inverted index invents nothing the table does not list", () => {
    expect([...inverted].filter((x) => !forward.has(x)).sort()).toEqual([]);
  });

  it("Saturn is a karaka of the 10th in BOTH directions", () => {
    expect(houseTable["10"]).toContain("Saturn");
    expect(planetK.Saturn.houseKaraka).toContain(10);
  });

  it("covers all twelve houses with at least one karaka", () => {
    for (let h = 1; h <= 12; h++) expect(houseTable[String(h)]?.length ?? 0).toBeGreaterThan(0);
  });
});

describe("the two tables are separate sources, not copies", () => {
  it("each declares where it came from", () => {
    expect(CANON._source).toMatch(/Vol I/);
    expect(CANON._source).toMatch(/Ch\.7 house-karaka table/);
    const src = readFileSync(new URL("./life-areas.ts", import.meta.url), "utf8");
    expect(src).toMatch(/Vol II.*Appendix IV/s);
  });

  it("DIFFER on career, health and purpose — reconciling them is the regression", () => {
    // Written as an expectation, not a comment, because at v839 I very nearly "fixed" this.
    const lensOf = (k: keyof typeof LIFE_AREAS) => LIFE_AREAS[k].karakas.map((x) => x.planet).sort();
    expect(lensOf("career")).not.toEqual([...houseTable["10"]].sort());
    expect(lensOf("health")).not.toEqual([...houseTable["6"]].sort());
    expect(lensOf("purpose")).not.toEqual([...houseTable["9"]].sort());
  });

  it("records the divergence where the transcription noticed it", () => {
    // health's note names the 6th-house step as its source for Sun. The provenance is the defence
    // against the next person calling it drift.
    expect(LIFE_AREAS.health.note).toMatch(/6th-house step/);
  });

  // THE ACTUAL RELATIONSHIP, COMPUTED (server/scripts/karaka-compare.ts), not asserted from a
  // pattern I liked. I guessed twice here and the assertions refuted me twice — first "they never
  // contradict" (health), then "five of six" (money). The same reflex as v839: reach for the tidy
  // rule, skip the enumeration. So the rows below are the output of the script, transcribed.
  const primariesOf = (k: keyof typeof LIFE_AREAS) =>
    LIFE_AREAS[k].karakas.filter((x) => x.role === "primary").map((x) => x.planet);
  const canonFor = (k: keyof typeof LIFE_AREAS) => houseTable[String(LIFE_AREAS[k].primaryHouse)] ?? [];

  it("agree on the PRIMARY in seven of ten areas", () => {
    for (const key of ["self", "siblings", "home", "children", "love", "career", "purpose"] as const) {
      expect(primariesOf(key).some((p) => canonFor(key).includes(p)),
        `${key}: primary ${primariesOf(key)} vs Ch.7 ${canonFor(key)}`).toBe(true);
    }
  });

  it("differ on WHICH LEADS — not on the cast — for money and health", () => {
    // money:  Vol II leads with the Moon (feeling wealthy); Ch.7 lists Jupiter, which Vol II keeps
    //         as secondary. health: Vol II leads with the Sun (constitution, per the 6th-house
    //         step); Ch.7 lists Mars and Saturn, and Mars is Vol II's secondary.
    // Both sources are in the room either way; they disagree about who speaks first.
    for (const key of ["money", "health"] as const) {
      expect(primariesOf(key).some((p) => canonFor(key).includes(p))).toBe(false);
      const shared = LIFE_AREAS[key].karakas.map((k) => k.planet).filter((p) => canonFor(key).includes(p));
      expect(shared.length, `${key} shares no karaka at all`).toBeGreaterThan(0);
    }
    expect(LIFE_AREAS.health.note).toMatch(/6th-house step/);
  });

  it("share NOTHING only for parents — and that one is deliberate", () => {
    // Rahu/Ketu as the maternal/paternal ancestral lines is the 12th read as heredity, which is the
    // whole point of the "Parents & Roots" area; Ch.7's Saturn is the 12th read as loss. The one
    // row with zero overlap is the one row that is a stated design choice, so it is pinned here
    // rather than left to look like the drift it is not.
    expect(primariesOf("parents").sort()).toEqual(["Ketu", "Rahu"]);
    expect(canonFor("parents")).toEqual(["Saturn"]);
    expect(LIFE_AREAS.parents.domain).toMatch(/ancestry/);
  });
});
