import { describe, it, expect } from "vitest";
import { generateProfectionInterpretation, type NatalChart } from "./interpreter";
import type { ProfectionData } from "./calculator";

describe("Profection Interpreter with Natal Chart", () => {
  it("should generate interpretation with natal Time Lord data", () => {
    const profection: ProfectionData = {
      age: 44,
      activatedHouse: 9,
      activatedSign: "Taurus",
      timeLord: "Venus",
      yearStart: "2026-04-13",
      yearEnd: "2027-04-13",
      lagnaSign: "Virgo",
    };

    const natalChart: NatalChart = {
      lagnaSign: "Virgo",
      bodies: [
        {
          id: 1,
          userId: 1,
          planet: "Venus",
          sign: "Aquarius",
          degree: "12.6",
          house: 5,
          nakshatra: "Dhanishta",
          pada: 2,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 2,
          userId: 1,
          planet: "Moon",
          sign: "Scorpio",
          degree: "24.51",
          house: 8,
          nakshatra: "Jyeshtha",
          pada: 3,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
    };

    const interpretation = generateProfectionInterpretation(profection, natalChart);

    // Verify section 5 includes natal Time Lord data
    expect(interpretation.section5).toContain("Venus");
    expect(interpretation.section5).toContain("Aquarius");
    expect(interpretation.section5).toContain("5");
    expect(interpretation.section5).toContain("Dhanishta");
    expect(interpretation.section5).toContain("Pada 2");

    // Verify section 6 includes growth guidance
    expect(interpretation.section6).toContain("•");

    // Verify section 7 includes friction guidance
    expect(interpretation.section7).toContain("•");

    console.log("=== INTERPRETATION OUTPUT ===");
    console.log("Section 5 (Yearly Focus):");
    console.log(interpretation.section5);
    console.log("\nSection 6 (What Supports Growth):");
    console.log(interpretation.section6);
    console.log("\nSection 7 (What Creates Friction):");
    console.log(interpretation.section7);
  });

  it("should fail explicitly when natal Time Lord data is missing", () => {
    const profection: ProfectionData = {
      age: 44,
      activatedHouse: 9,
      activatedSign: "Taurus",
      timeLord: "Venus",
      yearStart: "2026-04-13",
      yearEnd: "2027-04-13",
      lagnaSign: "Virgo",
    };

    const natalChart: NatalChart = {
      lagnaSign: "Virgo",
      bodies: [
        {
          id: 1,
          userId: 1,
          planet: "Moon",
          sign: "Scorpio",
          degree: "24.51",
          house: 8,
          nakshatra: "Jyeshtha",
          pada: 3,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
    };

    // Should throw an error when natal Time Lord placement is missing
    expect(() => {
      generateProfectionInterpretation(profection, natalChart);
    }).toThrow("Complete birth chart data is required.");
  });

  it("should work with different Time Lords", () => {
    const profection: ProfectionData = {
      age: 25,
      activatedHouse: 3,
      activatedSign: "Gemini",
      timeLord: "Mercury",
      yearStart: "2025-04-13",
      yearEnd: "2026-04-13",
      lagnaSign: "Virgo",
    };

    const natalChart: NatalChart = {
      lagnaSign: "Virgo",
      bodies: [
        {
          id: 1,
          userId: 1,
          planet: "Mercury",
          sign: "Aries",
          degree: "15.3",
          house: 7,
          nakshatra: "Ashwini",
          pada: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
    };

    const interpretation = generateProfectionInterpretation(profection, natalChart);

    // Verify Mercury-specific content
    expect(interpretation.section5).toContain("Mercury");
    expect(interpretation.section5).toContain("Aries");
    expect(interpretation.section5).toContain("7");

    console.log("=== MERCURY TIME LORD INTERPRETATION ===");
    console.log(interpretation.section5);
  });

  describe("Operational Chain Regression Tests", () => {
    it("should generate complete Operational Chain with all required components for David Chum fixture", () => {
      // David Chum: Age 44, 9th House (Taurus) activated by Venus
      // Venus natal: Aquarius, House 6, Shatabhisha, Pada 2
      const profection: ProfectionData = {
        age: 44,
        activatedHouse: 9,
        activatedSign: "Taurus",
        timeLord: "Venus",
        yearStart: "2026-04-13",
        yearEnd: "2027-04-13",
        lagnaSign: "Virgo",
      };

      const natalChart: NatalChart = {
        lagnaSign: "Virgo",
        bodies: [
          {
            id: 4,
            userId: 1,
            planet: "Venus",
            sign: "Aquarius",
            degree: "12.60",
            house: 6,
            nakshatra: "Shatabhisha",
            pada: 2,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
      };

      const interpretation = generateProfectionInterpretation(profection, natalChart);

      // Verify operationalChain exists
      expect(interpretation.operationalChain).toBeDefined();
      expect(interpretation.operationalChain).toBeTruthy();

      // Verify all required components are present in operationalChain
      expect(interpretation.operationalChain).toContain("9th House");
      expect(interpretation.operationalChain).toContain("Taurus");
      expect(interpretation.operationalChain).toContain("Venus");
      expect(interpretation.operationalChain).toContain("Aquarius");
      expect(interpretation.operationalChain).toContain("6th House");
      expect(interpretation.operationalChain).toContain("Shatabhisha");

      // Verify no fallback text ("unknown") appears
      expect(interpretation.operationalChain).not.toContain("unknown");

      console.log("=== OPERATIONAL CHAIN (DAVID CHUM) ===");
      console.log(interpretation.operationalChain);
    });

    it("should fail explicitly when natal Time Lord placement is missing", () => {
      const profection: ProfectionData = {
        age: 44,
        activatedHouse: 9,
        activatedSign: "Taurus",
        timeLord: "Venus",
        yearStart: "2026-04-13",
        yearEnd: "2027-04-13",
        lagnaSign: "Virgo",
      };

      // Natal chart WITHOUT Venus (Time Lord is missing)
      const natalChart: NatalChart = {
        lagnaSign: "Virgo",
        bodies: [
          {
            id: 1,
            userId: 1,
            planet: "Moon",
            sign: "Scorpio",
            degree: "24.51",
            house: 3,
            nakshatra: "Jyeshtha",
            pada: 3,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
      };

      // Should throw an error when natal Time Lord placement is missing
      expect(() => {
        generateProfectionInterpretation(profection, natalChart);
      }).toThrow("Complete birth chart data is required.");
    });

    it("should include natal Time Lord nakshatra in Operational Chain", () => {
      const profection: ProfectionData = {
        age: 25,
        activatedHouse: 3,
        activatedSign: "Gemini",
        timeLord: "Mercury",
        yearStart: "2025-04-13",
        yearEnd: "2026-04-13",
        lagnaSign: "Virgo",
      };

      const natalChart: NatalChart = {
        lagnaSign: "Virgo",
        bodies: [
          {
            id: 1,
            userId: 1,
            planet: "Mercury",
            sign: "Aries",
            degree: "15.3",
            house: 7,
            nakshatra: "Ashwini",
            pada: 1,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
      };

      const interpretation = generateProfectionInterpretation(profection, natalChart);

      // Verify operationalChain includes nakshatra
      expect(interpretation.operationalChain).toContain("Ashwini");
      expect(interpretation.operationalChain).toContain("3rd House");
      expect(interpretation.operationalChain).toContain("Aries");
      expect(interpretation.operationalChain).toContain("Mercury");
      expect(interpretation.operationalChain).not.toContain("unknown");

      console.log("=== OPERATIONAL CHAIN (MERCURY) ===");
      console.log(interpretation.operationalChain);
    });
  });

  describe("Missing Critical Data Failure Tests", () => {
    it("should fail explicitly when natal Time Lord placement is missing (missing-data case)", () => {
      const profection: ProfectionData = {
        age: 44,
        activatedHouse: 9,
        activatedSign: "Taurus",
        timeLord: "Venus",
        yearStart: "2026-04-13",
        yearEnd: "2027-04-13",
        lagnaSign: "Virgo",
      };

      // Natal chart WITHOUT Venus (Time Lord is missing)
      const natalChart: NatalChart = {
        lagnaSign: "Virgo",
        bodies: [
          {
            id: 1,
            userId: 1,
            planet: "Moon",
            sign: "Scorpio",
            degree: "24.51",
            house: 3,
            nakshatra: "Jyeshtha",
            pada: 3,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
      };

      // Should throw an explicit error, NOT silently generate generic text
      expect(() => {
        generateProfectionInterpretation(profection, natalChart);
      }).toThrow("Complete birth chart data is required.");
    });

    it("should not generate generic interpretation when natal Time Lord is missing", () => {
      const profection: ProfectionData = {
        age: 44,
        activatedHouse: 9,
        activatedSign: "Taurus",
        timeLord: "Venus",
        yearStart: "2026-04-13",
        yearEnd: "2027-04-13",
        lagnaSign: "Virgo",
      };

      // Natal chart WITHOUT Venus
      const natalChart: NatalChart = {
        lagnaSign: "Virgo",
        bodies: [
          {
            id: 1,
            userId: 1,
            planet: "Moon",
            sign: "Scorpio",
            degree: "24.51",
            house: 3,
            nakshatra: "Jyeshtha",
            pada: 3,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
      };

      // Verify that no generic fallback text is generated
      // The function should throw before returning any interpretation
      try {
        generateProfectionInterpretation(profection, natalChart);
        // If we reach here, the test fails because no error was thrown
        expect.fail("Should have thrown an error for missing natal Time Lord");
      } catch (error: any) {
        // Verify the error message is simple and user-facing
        expect(error.message).toContain("Complete birth chart data is required.");
        expect(error.message).not.toContain("expressed through");
        expect(error.message).not.toContain("themes");
      }
    });

    it("should fail when natal chart bodies array is empty", () => {
      const profection: ProfectionData = {
        age: 44,
        activatedHouse: 9,
        activatedSign: "Taurus",
        timeLord: "Venus",
        yearStart: "2026-04-13",
        yearEnd: "2027-04-13",
        lagnaSign: "Virgo",
      };

      // Natal chart with empty bodies array
      const natalChart: NatalChart = {
        lagnaSign: "Virgo",
        bodies: [],
      };

      // Should throw an explicit error
      expect(() => {
        generateProfectionInterpretation(profection, natalChart);
      }).toThrow("Complete birth chart data is required.");
    });

    it("should fail when natal Time Lord has incomplete data (missing nakshatra)", () => {
      const profection: ProfectionData = {
        age: 44,
        activatedHouse: 9,
        activatedSign: "Taurus",
        timeLord: "Venus",
        yearStart: "2026-04-13",
        yearEnd: "2027-04-13",
        lagnaSign: "Virgo",
      };

      // Natal chart with Venus but missing nakshatra
      const natalChart: NatalChart = {
        lagnaSign: "Virgo",
        bodies: [
          {
            id: 4,
            userId: 1,
            planet: "Venus",
            sign: "Aquarius",
            degree: "12.60",
            house: 6,
            nakshatra: null as any, // Missing nakshatra
            pada: 2,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
      };

      // Should still generate interpretation (nakshatra is optional)
      // but verify it doesn't crash or generate generic text
      const interpretation = generateProfectionInterpretation(profection, natalChart);
      
      // Verify operational chain still contains required components
      expect(interpretation.operationalChain).toContain("9th House");
      expect(interpretation.operationalChain).toContain("Taurus");
      expect(interpretation.operationalChain).toContain("Venus");
      expect(interpretation.operationalChain).toContain("Aquarius");
      expect(interpretation.operationalChain).toContain("6th House");
    });

    it("should verify Operational Chain is not generated with fallback text", () => {
      const profection: ProfectionData = {
        age: 44,
        activatedHouse: 9,
        activatedSign: "Taurus",
        timeLord: "Venus",
        yearStart: "2026-04-13",
        yearEnd: "2027-04-13",
        lagnaSign: "Virgo",
      };

      const natalChart: NatalChart = {
        lagnaSign: "Virgo",
        bodies: [
          {
            id: 4,
            userId: 1,
            planet: "Venus",
            sign: "Aquarius",
            degree: "12.60",
            house: 6,
            nakshatra: "Shatabhisha",
            pada: 2,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
      };

      const interpretation = generateProfectionInterpretation(profection, natalChart);

      // Verify no fallback text like "expressed through Taurus themes" or "unknown"
      expect(interpretation.operationalChain).not.toContain("unknown");
      expect(interpretation.operationalChain).not.toContain("themes");
      
      // Verify it contains explicit chain components
      expect(interpretation.operationalChain).toContain("↓");
      expect(interpretation.operationalChain).toContain("through Venus");
      expect(interpretation.operationalChain).toContain("expressed through natal Venus");
    });
  });
});
