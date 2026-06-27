import SwissEph from 'swisseph-wasm';

const ZODIAC_SIGNS = [
  "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
  "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"
];

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
 * Convert JD to calendar date
 */
function jdToDate(jd: number): Date {
  const J1970 = 2440588;
  const msPerDay = 86400000;
  return new Date((jd - J1970) * msPerDay);
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
console.log("TIME LORD MOVEMENT VALIDATION - VENUS TRANSITS");
console.log("=".repeat(80));

console.log("\n1. PROFECTION YEAR RANGE");
console.log("-".repeat(80));
console.log("Start: April 13, 2026");
console.log("End: April 12, 2027");
console.log("Time Lord: Venus");
console.log("Lagna: Virgo (17.28°)");

(async () => {
  try {
    const se = new SwissEph();
    await se.initSwissEph();

    const lagnaLongitude = 17.28;
    const startDate = new Date(2026, 3, 13);
    const endDate = new Date(2027, 3, 12);

    console.log("\n2. VENUS TRANSITS (Daily Tracking)");
    console.log("-".repeat(80));

    const VENUS_CODE = 3;
    const flags = se.SEFLG_SPEED | se.SEFLG_SIDEREAL;

    let currentDate = new Date(startDate);
    let lastSign = "";
    let lastHouse = 0;
    let lastRetrograde = false;
    let periodStart = new Date(startDate);

    const transits: Array<{
      startDate: string;
      endDate: string;
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
            startDate: formatDate(periodStart),
            endDate: formatDate(new Date(currentDate.getTime() - 86400000)),
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
        startDate: formatDate(periodStart),
        endDate: formatDate(endDate),
        sign: lastSign,
        house: lastHouse,
        retrograde: lastRetrograde,
      });
    }

    transits.forEach((transit, index) => {
      const retroStatus = transit.retrograde ? "Retrograde" : "Direct";
      console.log(`\n${index + 1}. ${transit.startDate} – ${transit.endDate}`);
      console.log(`   Venus in ${transit.sign}`);
      console.log(`   House: ${transit.house} from Virgo Lagna`);
      console.log(`   Status: ${retroStatus}`);
    });

    console.log("\n" + "=".repeat(80));
    console.log(`✓ TRANSIT TRACKING COMPLETE - ${transits.length} periods identified`);
    console.log("=".repeat(80) + "\n");
  } catch (error) {
    console.error("\n✗ CALCULATION ERROR:");
    console.error(error);
    console.log("=".repeat(80) + "\n");
  }
})();
