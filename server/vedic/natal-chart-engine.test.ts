import { describe, it, expect } from "vitest";
import { calculateNatalChart } from "./natal-chart-engine";

describe("LAYER 1: Vedic Natal Chart Engine", () => {
  it("should calculate natal chart for user birth data (4/13/1982 5:20 PM Merong Bataan)", async () => {
    // User's birth data:
    // Date: April 13, 1982
    // Time: 5:20 PM (17:20) local time
    // Location: Merong, Bataan, Philippines
    // Coordinates: approximately 14.6°N, 120.6°E
    // Timezone: UTC+8 (Philippine Time)

    const chart = await calculateNatalChart(
      "1982-04-13", // Birth date
      "17:20:00", // Birth time (5:20 PM)
      14.6, // Latitude (North)
      120.6, // Longitude (East)
      8 // Timezone offset from UTC (+8)
    );

    // Verify Lagna is calculated (should be a valid sign)
    const validSigns = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"];
    expect(validSigns).toContain(chart.lagna.sign);
    expect(chart.lagna.degree).toBeGreaterThan(0);
    expect(chart.lagna.degree).toBeLessThan(30);

    // Verify all planets are calculated
    expect(chart.planets.sun).toBeDefined();
    expect(chart.planets.moon).toBeDefined();
    expect(chart.planets.mercury).toBeDefined();
    expect(chart.planets.venus).toBeDefined();
    expect(chart.planets.mars).toBeDefined();
    expect(chart.planets.jupiter).toBeDefined();
    expect(chart.planets.saturn).toBeDefined();
    expect(chart.planets.rahu).toBeDefined();
    expect(chart.planets.ketu).toBeDefined();

    // Verify Moon has nakshatra and pada
    expect(chart.planets.moon.nakshatra).toBeDefined();
    expect(chart.planets.moon.pada).toBeGreaterThanOrEqual(1);
    expect(chart.planets.moon.pada).toBeLessThanOrEqual(4);

    // Verify all planets have required fields
    for (const [name, planet] of Object.entries(chart.planets)) {
      expect(planet.name).toBeDefined();
      expect(planet.sign).toBeDefined();
      expect(planet.degree).toBeGreaterThanOrEqual(0);
      expect(planet.degree).toBeLessThan(30);
      expect(planet.house).toBeGreaterThanOrEqual(1);
      expect(planet.house).toBeLessThanOrEqual(12);
    }

    // Verify houses are calculated
    expect(chart.houses).toHaveLength(12);
    for (let i = 0; i < 12; i++) {
      expect(chart.houses[i].number).toBe(i + 1);
      expect(chart.houses[i].sign).toBeDefined();
      expect(chart.houses[i].degree).toBeGreaterThanOrEqual(0);
      expect(chart.houses[i].degree).toBeLessThan(360);
    }

    // Verify Venus house is calculated (will be used for profection year)
    const venusHouse = chart.planets.venus.house;
    expect(venusHouse).toBeGreaterThanOrEqual(1);
    expect(venusHouse).toBeLessThanOrEqual(12);

    console.log("✓ Birth chart calculated successfully");
    console.log(`  Lagna: ${chart.lagna.sign} ${chart.lagna.degree}°`);
    console.log(`  Venus: ${chart.planets.venus.sign} ${chart.planets.venus.degree}° (House ${venusHouse})`);
    console.log(`  Moon: ${chart.planets.moon.sign} ${chart.planets.moon.degree}° ${chart.planets.moon.nakshatra} pada ${chart.planets.moon.pada}`);
  });

  it("should have all 12 houses in Whole Sign system", async () => {
    const chart = await calculateNatalChart(
      "1982-04-13",
      "17:20:00",
      14.6,
      120.6,
      8
    );

    // Verify Whole Sign house system: each house is 30° wide
    for (let i = 0; i < 12; i++) {
      const currentHouse = chart.houses[i];
      const nextHouse = chart.houses[(i + 1) % 12];

      // Each house should be exactly 30° wide (or close due to rounding)
      let diff = nextHouse.degree - currentHouse.degree;
      if (diff < 0) diff += 360;

      // Allow small rounding differences
      expect(Math.abs(diff - 30)).toBeLessThan(1);
    }
  });

  it("should calculate nakshatra correctly for Moon", async () => {
    const chart = await calculateNatalChart(
      "1982-04-13",
      "17:20:00",
      14.6,
      120.6,
      8
    );

    const moon = chart.planets.moon;

    // Verify nakshatra is one of the 27 nakshatras
    const validNakshatras = [
      "Ashwini",
      "Bharani",
      "Krittika",
      "Rohini",
      "Mrigashira",
      "Ardra",
      "Punarvasu",
      "Pushya",
      "Ashlesha",
      "Magha",
      "Purva Phalguni",
      "Uttara Phalguni",
      "Hasta",
      "Chitra",
      "Swati",
      "Vishakha",
      "Anuradha",
      "Jyeshtha",
      "Mula",
      "Purva Ashadha",
      "Uttara Ashadha",
      "Shravana",
      "Dhanishtha",
      "Shatabhisha",
      "Purva Bhadrapada",
      "Uttara Bhadrapada",
      "Revati",
    ];

    expect(validNakshatras).toContain(moon.nakshatra);
  });

  it("should handle different timezones correctly", async () => {
    // Same birth moment, different timezone representation
    // 5:20 PM UTC+8 = 9:20 AM UTC

    const chart1 = await calculateNatalChart(
      "1982-04-13",
      "17:20:00",
      14.6,
      120.6,
      8 // UTC+8
    );

    const chart2 = await calculateNatalChart(
      "1982-04-13",
      "09:20:00",
      14.6,
      120.6,
      0 // UTC
    );

    // Both should produce identical results
    expect(chart1.lagna.sign).toBe(chart2.lagna.sign);
    expect(Math.abs(chart1.lagna.degree - chart2.lagna.degree)).toBeLessThan(0.1);

    for (const planetName of [
      "sun",
      "moon",
      "mercury",
      "venus",
      "mars",
      "jupiter",
      "saturn",
      "rahu",
      "ketu",
    ]) {
      expect(chart1.planets[planetName].sign).toBe(
        chart2.planets[planetName].sign
      );
      expect(
        Math.abs(
          chart1.planets[planetName].degree - chart2.planets[planetName].degree
        )
      ).toBeLessThan(0.1);
    }
  });
});
