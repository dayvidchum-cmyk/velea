/**
 * Pancha Pakshi — the day/night yama division. The 24h from sunrise splits into TEN
 * periods (yamas): five equal parts of the daytime (sunrise→sunset) and five of the
 * night (sunset→next sunrise). Every timing window in the system is built on these
 * boundaries. VALIDATED to the minute against the user's reference app for Boston,
 * Jul 2 2026 (sunrise 5:11 / sunset 8:24 → all ten boundaries matched).
 */

// NOAA sunrise/sunset as a UT Julian Day. Mirrors server/panchang/astronomy.ts so the
// two agree; kept local to keep this module self-contained.
function sunTimesJD(year: number, month: number, day: number, lat: number, lon: number): { rise: number; set: number } {
  const a = Math.floor((14 - month) / 12), y = year + 4800 - a, m = month + 12 * a - 3;
  const jdn = day + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) - 32045;
  const n = jdn - 2451545.0;
  const Jstar = n - lon / 360.0;
  const M = (357.5291 + 0.98560028 * Jstar) % 360, Mr = (M * Math.PI) / 180;
  const C = 1.9148 * Math.sin(Mr) + 0.02 * Math.sin(2 * Mr) + 0.0003 * Math.sin(3 * Mr);
  const lam = (M + C + 180 + 102.9372) % 360, lamR = (lam * Math.PI) / 180;
  const Jtr = 2451545.0 + Jstar + 0.0053 * Math.sin(Mr) - 0.0069 * Math.sin(2 * lamR);
  const sinDec = Math.sin(lamR) * Math.sin((23.4397 * Math.PI) / 180), dec = Math.asin(sinDec);
  const latR = (lat * Math.PI) / 180;
  const cosO = (Math.sin((-0.833 * Math.PI) / 180) - Math.sin(latR) * sinDec) / (Math.cos(latR) * Math.cos(dec));
  const omega = (Math.acos(Math.max(-1, Math.min(1, cosO))) * 180) / Math.PI;
  return { rise: Jtr - omega / 360, set: Jtr + omega / 360 };
}

const jdToMs = (jd: number) => (jd - 2440587.5) * 86400000;

export type Yama = {
  index: number;          // 0..9 (0-4 = day, 5-9 = night)
  phase: "day" | "night";
  startMs: number;        // epoch ms (UTC)
  endMs: number;
};

/**
 * The ten yamas for a given civil date at a location. `date` is the local calendar day
 * whose SUNRISE begins the sequence. Returns epoch-ms boundaries (format with the
 * profile's timezone downstream).
 */
export function computeYamas(year: number, month: number, day: number, lat: number, lon: number): Yama[] {
  const today = sunTimesJD(year, month, day, lat, lon);
  // Next civil day for the night's closing sunrise.
  const d = new Date(Date.UTC(year, month - 1, day + 1));
  const next = sunTimesJD(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate(), lat, lon);

  const sunrise = jdToMs(today.rise), sunset = jdToMs(today.set), nextSunrise = jdToMs(next.rise);
  const dayLen = (sunset - sunrise) / 5, nightLen = (nextSunrise - sunset) / 5;

  const yamas: Yama[] = [];
  for (let i = 0; i < 5; i++) yamas.push({ index: i, phase: "day", startMs: sunrise + dayLen * i, endMs: sunrise + dayLen * (i + 1) });
  for (let i = 0; i < 5; i++) yamas.push({ index: 5 + i, phase: "night", startMs: sunset + nightLen * i, endMs: sunset + nightLen * (i + 1) });
  return yamas;
}
