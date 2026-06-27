import SwissEph from 'swisseph-wasm';

const ZODIAC_SIGNS = [
  "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
  "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"
];

const PLANET_NAMES: Record<number, string> = {
  0: "Sun",
  1: "Moon",
  2: "Mercury",
  3: "Venus",
  4: "Mars",
  5: "Jupiter",
  6: "Saturn",
  11: "Rahu",
  12: "Ketu"
};

/**
 * Get sign and degree from sidereal longitude
 */
function getLongitudeSign(siderealLongitude: number): { sign: string; degree: number } {
  const signIndex = Math.floor(siderealLongitude / 30) % 12;
  const degreeInSign = siderealLongitude % 30;
  return {
    sign: ZODIAC_SIGNS[signIndex],
    degree: degreeInSign,
  };
}

/**
 * Calculate house from Lagna using Whole Sign system
 */
function getHouseFromLagna(lagnaLongitude: number, planetLongitude: number): number {
  const lagnaSign = Math.floor(lagnaLongitude / 30);
  const planetSign = Math.floor(planetLongitude / 30);
  let house = (planetSign - lagnaSign + 12) % 12;
  return house + 1;
}

/**
 * Convert calendar date to JD
 */
function dateToJd(date: Date): number {
  const J1970 = 2440588;
  const msPerDay = 86400000;
  return date.getTime() / msPerDay + J1970;
}

/**
 * Format date as YYYY-MM-DD
 */
function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

console.log("\n" + "=".repeat(80));
console.log("SECONDARY TRANSIT CONDITIONS - VENUS TRANSITS");
console.log("=".repeat(80));

(async () => {
  try {
    const se = new SwissEph();
    await se.initSwissEph();

    const lagnaLongitude = 17.28;
    const startDate = new Date(2026, 3, 13);
    const endDate = new Date(2027, 3, 12);

    const VENUS_CODE = 3;
    const SUN_CODE = 0;
    const flags = se.SEFLG_SPEED | se.SEFLG_SIDEREAL;

    // First, collect all transit periods
    let currentDate = new Date(startDate);
    let lastSign = "";
    let lastHouse = 0;
    let lastRetrograde = false;
    let periodStart = new Date(startDate);

    const transits: Array<{
      startDate: Date;
      endDate: Date;
      sign: string;
      house: number;
      retrograde: boolean;
    }> = [];

    while (currentDate <= endDate) {
      const jd = dateToJd(currentDate);
      const calc = se.calc_ut(jd, VENUS_CODE, flags);
      const siderealLongitude = calc[0];
      const speed = calc[3];

      const signData = getLongitudeSign(siderealLongitude);
      const house = getHouseFromLagna(lagnaLongitude, siderealLongitude);
      const isRetrograde = speed < 0;

      if (
        signData.sign !== lastSign ||
        house !== lastHouse ||
        isRetrograde !== lastRetrograde
      ) {
        if (lastSign !== "") {
          transits.push({
            startDate: new Date(periodStart),
            endDate: new Date(currentDate.getTime() - 86400000),
            sign: lastSign,
            house: lastHouse,
            retrograde: lastRetrograde,
          });
        }

        lastSign = signData.sign;
        lastHouse = house;
        lastRetrograde = isRetrograde;
        periodStart = new Date(currentDate);
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    if (lastSign !== "") {
      transits.push({
        startDate: new Date(periodStart),
        endDate: new Date(endDate),
        sign: lastSign,
        house: lastHouse,
        retrograde: lastRetrograde,
      });
    }

    // Now analyze secondary conditions for each transit
    for (const transit of transits) {
      const midDate = new Date(
        (transit.startDate.getTime() + transit.endDate.getTime()) / 2
      );
      const jd = dateToJd(midDate);

      // Get Venus position at midpoint
      const venusCalc = se.calc_ut(jd, VENUS_CODE, flags);
      const venusLongitude = venusCalc[0];
      const venusSignData = getLongitudeSign(venusLongitude);

      // Check co-present planets (same sign)
      const coPresentPlanets: string[] = [];
      const closeConjunctions: Array<{ planet: string; orb: number }> = [];
      let rahuKetuPresence = "";
      let combustStatus = "No";

      const planetsToCheck = [0, 1, 2, 4, 5, 6, 11, 12]; // Sun, Moon, Mercury, Mars, Jupiter, Saturn, Rahu, Ketu

      for (const planetCode of planetsToCheck) {
        const calc = se.calc_ut(jd, planetCode, flags);
        const planetLongitude = calc[0];
        const planetSignData = getLongitudeSign(planetLongitude);

        // Check if in same sign
        if (planetSignData.sign === venusSignData.sign) {
          if (planetCode !== 3) { // Not Venus itself
            coPresentPlanets.push(PLANET_NAMES[planetCode]);
          }
        }

        // Check close conjunctions (within 4 degrees)
        const orb = Math.abs(venusLongitude - planetLongitude);
        const normalizedOrb = orb > 180 ? 360 - orb : orb;
        if (normalizedOrb < 4 && planetCode !== 3) {
          closeConjunctions.push({
            planet: PLANET_NAMES[planetCode],
            orb: normalizedOrb
          });
        }

        // Check Rahu/Ketu presence
        if ((planetCode === 11 || planetCode === 12) && planetSignData.sign === venusSignData.sign) {
          rahuKetuPresence = PLANET_NAMES[planetCode];
        }

        // Check combustion (Sun within 8 degrees)
        if (planetCode === 0) {
          const sunOrb = Math.abs(venusLongitude - planetLongitude);
          const normalizedSunOrb = sunOrb > 180 ? 360 - sunOrb : sunOrb;
          if (normalizedSunOrb < 8) {
            combustStatus = `Yes (${normalizedSunOrb.toFixed(1)}°)`;
          }
        }
      }

      // Determine solitary status
      const solitaryStatus = coPresentPlanets.length === 0 ? "Yes" : "No";

      // Output
      console.log("\n" + "-".repeat(80));
      console.log(`${formatDate(transit.startDate)} – ${formatDate(transit.endDate)}`);
      console.log(`Venus in ${transit.sign}`);
      console.log(`${transit.house}${transit.house === 1 ? "st" : transit.house === 2 ? "nd" : transit.house === 3 ? "rd" : "th"} House from Virgo Lagna`);
      console.log(`${transit.retrograde ? "Retrograde" : "Direct"}`);
      console.log("");
      console.log(`Co-present planets: ${coPresentPlanets.length > 0 ? coPresentPlanets.join(", ") : "None"}`);
      console.log(`Close conjunctions: ${closeConjunctions.length > 0 ? closeConjunctions.map(c => `${c.planet} (${c.orb.toFixed(1)}°)`).join(", ") : "None"}`);
      console.log(`Combust: ${combustStatus}`);
      console.log(`Rahu/Ketu: ${rahuKetuPresence || "None"}`);
      console.log(`Solitary: ${solitaryStatus}`);
    }

    console.log("\n" + "=".repeat(80));
    console.log(`✓ SECONDARY TRANSIT CONDITIONS COMPLETE - ${transits.length} periods analyzed`);
    console.log("=".repeat(80) + "\n");
  } catch (error) {
    console.error("\n✗ CALCULATION ERROR:");
    console.error(error);
    console.log("=".repeat(80) + "\n");
  }
})();
