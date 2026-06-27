/**
 * Tests for the Vimshottari Dasha Calculator
 *
 * Reference data: David Chum, born April 13, 1982
 * Moon in Jyeshtha (Scorpio) → Mercury Mahadasha at birth
 * Moon degree in Scorpio ≈ 25.39° → sidereal longitude ≈ 235.39°
 * Jyeshtha spans 226.67° to 240.00° → degree in nakshatra ≈ 8.72°
 * Elapsed fraction ≈ 8.72 / 13.333 ≈ 0.654
 * Remaining Mercury years ≈ 17 * (1 - 0.654) ≈ 5.88 years
 * Mercury Mahadasha ends ≈ Feb 1988 (birth + 5.88y)
 * Then Ketu Mahadasha starts (7 years) → ends ~Feb 1995
 * Then Venus Mahadasha starts (20 years) → ends ~Feb 2015
 * Then Sun Mahadasha starts (6 years) → ends ~Feb 2021
 * Then Moon Mahadasha starts (10 years) → ends ~Feb 2031
 */

import { describe, it, expect } from "vitest";
import { calculateDashaTimeline } from "./dasha-calculator";

// Reference birth data for David Chum
const BIRTH_DATE = "1982-04-13";
const MOON_NAKSHATRA = "Jyeshtha";
const MOON_SIGN = "Scorpio";
// Moon at 25°23'36" in Scorpio = 25.393° in sign
const MOON_DEGREE = "25.39";
const TODAY_2026 = "2026-06-23";

describe("calculateDashaTimeline", () => {
  it("returns a timeline with entries", () => {
    const result = calculateDashaTimeline(
      BIRTH_DATE,
      MOON_NAKSHATRA,
      MOON_SIGN,
      MOON_DEGREE,
      TODAY_2026
    );
    expect(result.entries.length).toBeGreaterThan(0);
  });

  it("identifies the correct starting dasha lord (Mercury for Jyeshtha)", () => {
    const result = calculateDashaTimeline(
      BIRTH_DATE,
      MOON_NAKSHATRA,
      MOON_SIGN,
      MOON_DEGREE,
      TODAY_2026
    );
    expect(result.startingDashaLord).toBe("Mercury");
  });

  it("returns the correct moon nakshatra", () => {
    const result = calculateDashaTimeline(
      BIRTH_DATE,
      MOON_NAKSHATRA,
      MOON_SIGN,
      MOON_DEGREE,
      TODAY_2026
    );
    expect(result.moonNakshatra).toBe("Jyeshtha");
  });

  it("first entry is Mercury/Rahu (first antardasha of Mercury mahadasha)", () => {
    const result = calculateDashaTimeline(
      BIRTH_DATE,
      MOON_NAKSHATRA,
      MOON_SIGN,
      MOON_DEGREE,
      TODAY_2026
    );
    const first = result.entries[0];
    expect(first.mahadasha).toBe("Mercury");
    // First antardasha of Mercury mahadasha is Rahu (sequence starts at Mercury index = 8,
    // so antardasha starts at Mercury itself... wait, let's check actual sequence)
    // Mercury is index 8 in DASHA_SEQUENCE, so antardashas start at index 8:
    // Mercury, Ketu, Venus, Sun, Moon, Mars, Rahu, Jupiter, Saturn
    expect(first.antardasha).toBe("Mercury");
  });

  it("first entry starts at birth date", () => {
    const result = calculateDashaTimeline(
      BIRTH_DATE,
      MOON_NAKSHATRA,
      MOON_SIGN,
      MOON_DEGREE,
      TODAY_2026
    );
    const first = result.entries[0];
    expect(first.startDate).toBe(BIRTH_DATE);
  });

  it("first entry startAge is 'birth'", () => {
    const result = calculateDashaTimeline(
      BIRTH_DATE,
      MOON_NAKSHATRA,
      MOON_SIGN,
      MOON_DEGREE,
      TODAY_2026
    );
    expect(result.entries[0].startAge).toBe("birth");
  });

  it("produces exactly 81 entries (9 mahadashas × 9 antardashas)", () => {
    const result = calculateDashaTimeline(
      BIRTH_DATE,
      MOON_NAKSHATRA,
      MOON_SIGN,
      MOON_DEGREE,
      TODAY_2026
    );
    expect(result.entries.length).toBe(81);
  });

  it("marks exactly one entry as current", () => {
    const result = calculateDashaTimeline(
      BIRTH_DATE,
      MOON_NAKSHATRA,
      MOON_SIGN,
      MOON_DEGREE,
      TODAY_2026
    );
    const currentEntries = result.entries.filter((e) => e.isCurrent);
    expect(currentEntries.length).toBe(1);
  });

  it("current mahadasha is Moon (2021-2031 for this birth data)", () => {
    const result = calculateDashaTimeline(
      BIRTH_DATE,
      MOON_NAKSHATRA,
      MOON_SIGN,
      MOON_DEGREE,
      TODAY_2026
    );
    expect(result.currentMahadasha).toBe("Moon");
  });

  it("current antardasha is Saturn (Moon/Saturn ~May 2025 to Dec 2026)", () => {
    const result = calculateDashaTimeline(
      BIRTH_DATE,
      MOON_NAKSHATRA,
      MOON_SIGN,
      MOON_DEGREE,
      TODAY_2026
    );
    expect(result.currentAntardasha).toBe("Saturn");
  });

  it("entries are in chronological order", () => {
    const result = calculateDashaTimeline(
      BIRTH_DATE,
      MOON_NAKSHATRA,
      MOON_SIGN,
      MOON_DEGREE,
      TODAY_2026
    );
    for (let i = 1; i < result.entries.length; i++) {
      expect(result.entries[i].startDate >= result.entries[i - 1].startDate).toBe(true);
    }
  });

  it("each entry's endDate equals the next entry's startDate", () => {
    const result = calculateDashaTimeline(
      BIRTH_DATE,
      MOON_NAKSHATRA,
      MOON_SIGN,
      MOON_DEGREE,
      TODAY_2026
    );
    for (let i = 0; i < result.entries.length - 1; i++) {
      // End date and next start date should be within 1 day (rounding)
      const endMs = new Date(result.entries[i].endDate).getTime();
      const nextStartMs = new Date(result.entries[i + 1].startDate).getTime();
      const diffDays = Math.abs(endMs - nextStartMs) / (24 * 60 * 60 * 1000);
      expect(diffDays).toBeLessThanOrEqual(1);
    }
  });

  it("mahadasha sequence follows Vimshottari order starting from Mercury", () => {
    const result = calculateDashaTimeline(
      BIRTH_DATE,
      MOON_NAKSHATRA,
      MOON_SIGN,
      MOON_DEGREE,
      TODAY_2026
    );
    // Get unique mahadashas in order of first appearance
    const mahaSequence: string[] = [];
    for (const entry of result.entries) {
      if (!mahaSequence.includes(entry.mahadasha)) {
        mahaSequence.push(entry.mahadasha);
      }
    }
    // Starting from Mercury (index 8): Mercury → Ketu → Venus → Sun → Moon → Mars → Rahu → Jupiter → Saturn
    expect(mahaSequence).toEqual([
      "Mercury", "Ketu", "Venus", "Sun", "Moon", "Mars", "Rahu", "Jupiter", "Saturn"
    ]);
  });

  it("handles Ashwini nakshatra (Ketu dasha lord)", () => {
    // Birth with Moon in Ashwini (Aries) — Ketu dasha lord
    const result = calculateDashaTimeline(
      "1990-01-01",
      "Ashwini",
      "Aries",
      "5.00",
      "2026-06-23"
    );
    expect(result.startingDashaLord).toBe("Ketu");
    expect(result.entries[0].mahadasha).toBe("Ketu");
  });

  it("handles Revati nakshatra (Mercury dasha lord, last nakshatra)", () => {
    const result = calculateDashaTimeline(
      "1985-06-15",
      "Revati",
      "Pisces",
      "10.00",
      "2026-06-23"
    );
    expect(result.startingDashaLord).toBe("Mercury");
  });

  it("throws for unknown nakshatra", () => {
    expect(() =>
      calculateDashaTimeline(
        BIRTH_DATE,
        "UnknownNakshatra",
        MOON_SIGN,
        MOON_DEGREE,
        TODAY_2026
      )
    ).toThrow("Unknown nakshatra");
  });

  it("throws for unknown sign", () => {
    expect(() =>
      calculateDashaTimeline(
        BIRTH_DATE,
        MOON_NAKSHATRA,
        "UnknownSign",
        MOON_DEGREE,
        TODAY_2026
      )
    ).toThrow("Unknown sign");
  });

  it("total timeline spans the remaining Vimshottari cycle from birth", () => {
    const result = calculateDashaTimeline(
      BIRTH_DATE,
      MOON_NAKSHATRA,
      MOON_SIGN,
      MOON_DEGREE,
      TODAY_2026
    );
    const firstStart = new Date(result.entries[0].startDate).getTime();
    const lastEnd = new Date(result.entries[result.entries.length - 1].endDate).getTime();
    const totalYears = (lastEnd - firstStart) / (365.25 * 24 * 60 * 60 * 1000);
    // The timeline starts at birth and covers the remaining Vimshottari cycle.
    // For Jyeshtha Moon at 25.39° in Scorpio, the Mercury dasha is already ~65% elapsed
    // at birth, so the total from birth is ~120 - (0.654 * 17) ≈ 108.9 years.
    // The timeline should be between 100 and 120 years.
    expect(totalYears).toBeGreaterThan(100);
    expect(totalYears).toBeLessThan(120);
  });
});
