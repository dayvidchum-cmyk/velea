import { calculateBirthChart } from "./calculator";

const testData = {
  birthDate: "1982-04-13",
  birthTime: "17:20",
  latitude: 14.7667,
  longitude: 120.8167,
  timezone: "UTC+8",
};

console.log("\n" + "=".repeat(80));
console.log("VEDIC NATAL CHART VALIDATION - DAVID CHUM");
console.log("=".repeat(80));

console.log("\n1. BIRTH DATA USED");
console.log("-".repeat(80));
console.log(`Date: ${testData.birthDate}`);
console.log(`Local Birth Time: ${testData.birthTime}`);
console.log(`Timezone: ${testData.timezone}`);
console.log(`Location: Morong, Bataan, Philippines`);
console.log(`Coordinates: ${testData.latitude}°N, ${testData.longitude}°E`);

const [hour, minute] = testData.birthTime.split(":").map(Number);
const tzOffset = 8;
const utcHour = hour - tzOffset;
console.log(`UTC Birth Time: ${String(utcHour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`);

(async () => {
  try {
    const chart = await calculateBirthChart(
      testData.birthDate,
      testData.birthTime,
      testData.latitude,
      testData.longitude,
      testData.timezone
    );

    console.log("\n2. CORE NATAL CHART");
    console.log("-".repeat(80));
    console.log(`Lagna Sign: ${chart.lagna.sign}`);
    console.log(`Lagna Degree: ${chart.lagna.degree.toFixed(2)}°`);
    console.log(`Moon Sign: ${chart.moon.sign}`);
    console.log(`Moon Degree: ${chart.moon.degree.toFixed(2)}°`);
    console.log(`Moon Nakshatra: ${chart.moon.nakshatra}`);
    console.log(`Moon Pada: ${chart.moon.pada}`);
    console.log(`Moon House: ${chart.moon.house}`);

    console.log("\n3. PLANETARY PLACEMENTS");
    console.log("-".repeat(80));

    const planets = [
      { name: "Sun", data: chart.sun },
      { name: "Moon", data: chart.moon },
      { name: "Mercury", data: chart.mercury },
      { name: "Venus", data: chart.venus },
      { name: "Mars", data: chart.mars },
      { name: "Jupiter", data: chart.jupiter },
      { name: "Saturn", data: chart.saturn },
      { name: "Rahu", data: chart.rahu },
      { name: "Ketu", data: chart.ketu },
    ];

    planets.forEach(({ name, data }) => {
      console.log(`\n${name}:`);
      console.log(`  Sign: ${data.sign}`);
      console.log(`  Degree: ${data.degree.toFixed(2)}°`);
      console.log(`  House: ${data.house}`);
      if ('nakshatra' in data) {
        console.log(`  Nakshatra: ${(data as any).nakshatra}`);
        console.log(`  Pada: ${(data as any).pada}`);
      }
    });

    console.log("\n4. VALIDATION TARGETS");
    console.log("-".repeat(80));

    const targets = [
      { name: "Lagna", expected: "Virgo", actual: chart.lagna.sign, match: chart.lagna.sign === "Virgo" },
      { name: "Venus Sign", expected: "Aquarius", actual: chart.venus.sign, match: chart.venus.sign === "Aquarius" },
      { name: "Venus House", expected: "6", actual: String(chart.venus.house), match: chart.venus.house === 6 },
      { name: "Venus Nakshatra", expected: "Shatabhisha", actual: chart.venus.nakshatra || "N/A", match: (chart.venus as any).nakshatra === "Shatabhisha" },
      { name: "Moon Nakshatra", expected: "Jyeshtha", actual: chart.moon.nakshatra, match: chart.moon.nakshatra === "Jyeshtha" },
    ];

    let allMatch = true;
    targets.forEach(({ name, expected, actual, match }) => {
      const status = match ? "✓ PASS" : "✗ FAIL";
      console.log(`${status} | ${name}: expected "${expected}", got "${actual}"`);
      if (!match) allMatch = false;
    });

    console.log("\n" + "=".repeat(80));
    if (allMatch) {
      console.log("✓ ALL VALIDATION TARGETS PASSED - PHASE 1 COMPLETE");
    } else {
      console.log("✗ VALIDATION FAILED - STOP EXECUTION");
    }
    console.log("=".repeat(80) + "\n");
  } catch (error) {
    console.error("\n✗ CALCULATION ERROR:");
    console.error(error);
    console.log("=".repeat(80) + "\n");
  }
})();
