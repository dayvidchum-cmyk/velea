import { describe, it, expect } from "vitest";
import {
  calculateProfectionYear,
  isDateInProfectionYear,
  getProfectionYearsInRange,
} from "./calculator";

describe("Profection Calculator", () => {
  describe("calculateProfectionYear", () => {
    it("should calculate age 37 profection year correctly", () => {
      const result = calculateProfectionYear("1988-05-25", "2026-05-15", "Taurus");
      
      expect(result.age).toBe(37);
      expect(result.activatedHouse).toBe(2); // 37 % 12 = 1 -> 2nd house
      expect(result.activatedSign).toBe("Gemini");
      expect(result.timeLord).toBe("Mercury");
      expect(result.yearStart).toBe("2025-05-25");
      expect(result.yearEnd).toBe("2026-05-24");
    });

    it("should calculate age 38 profection year correctly", () => {
      const result = calculateProfectionYear("1988-05-25", "2026-05-25", "Taurus");
      
      expect(result.age).toBe(38);
      expect(result.activatedHouse).toBe(3); // 38 % 12 = 2 -> 3rd house
      expect(result.activatedSign).toBe("Cancer");
      expect(result.timeLord).toBe("Moon");
      expect(result.yearStart).toBe("2026-05-25");
      expect(result.yearEnd).toBe("2027-05-24");
    });

    it("should handle age 0 correctly", () => {
      const result = calculateProfectionYear("2026-01-01", "2026-06-01", "Aries");
      
      expect(result.age).toBe(0);
      expect(result.activatedHouse).toBe(1); // 0 % 12 = 0 -> 1st house
      expect(result.activatedSign).toBe("Aries");
      expect(result.timeLord).toBe("Mars");
    });

    it("should handle age 12 correctly", () => {
      const result = calculateProfectionYear("2014-01-01", "2026-06-01", "Leo");
      
      expect(result.age).toBe(12);
      expect(result.activatedHouse).toBe(1); // 12 % 12 = 0 -> 1st house (cycle repeats)
    });

    it("should throw on invalid Lagna sign", () => {
      expect(() => {
        calculateProfectionYear("1988-05-25", "2026-05-25", "InvalidSign");
      }).toThrow("Invalid Lagna sign");
    });
  });

  describe("isDateInProfectionYear", () => {
    it("should return true for dates within the profection year", () => {
      const result = isDateInProfectionYear("2026-06-01", "2026-05-25", "2027-05-24");
      expect(result).toBe(true);
    });

    it("should return false for dates outside the profection year", () => {
      const result = isDateInProfectionYear("2026-05-24", "2026-05-25", "2027-05-24");
      expect(result).toBe(false);
    });

    it("should return true for start date", () => {
      const result = isDateInProfectionYear("2026-05-25", "2026-05-25", "2027-05-24");
      expect(result).toBe(true);
    });

    it("should return true for end date", () => {
      const result = isDateInProfectionYear("2027-05-24", "2026-05-25", "2027-05-24");
      expect(result).toBe(true);
    });
  });

  describe("getProfectionYearsInRange", () => {
    it("should return at least one profection year", () => {
      const results = getProfectionYearsInRange("1988-05-25", "2026-06-01", "2026-12-31", "Taurus");
      expect(results.length).toBeGreaterThanOrEqual(1);
    });

    it("should handle ranges that cross birthday", () => {
      const results = getProfectionYearsInRange("1988-05-25", "2026-05-01", "2026-06-30", "Taurus");
      expect(results.length).toBeGreaterThanOrEqual(1);
    });

    it("should handle multi-year ranges", () => {
      const results = getProfectionYearsInRange("1988-05-25", "2025-01-01", "2027-12-31", "Taurus");
      expect(results.length).toBeGreaterThanOrEqual(1);
    });
  });
});
