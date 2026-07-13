/**
 * RETROGRADE PHASE — graded rx state for the narrative (David 2026-07-13: "fine-tune the strength of
 * the rx by day … same idea as pre-shadow and retroshade"). Instead of a binary retrograde flag, the
 * prose learns WHERE a planet sits in its retrograde arc and how intense it is:
 *
 *   direct → PRE-SHADOW → (station retrograde) → RETROGRADE / STATIONING → (station direct) → RETROSHADE → direct
 *
 * strength (0..1) = fractional depth into the planet's own retrograde shadow band [lonD, lonR]:
 *   0 at the shadow edges, ramping to 1.0 across the true retrograde. This is a READ-LAYER signal
 *   only — the day-mode cap uses true retrograde + station core (see interpreter.ts), never this.
 */
import { planetLongitudeSpeed } from "../birthchart/calculator.js";

export type RxPhase = "direct" | "pre-shadow" | "stationing" | "retrograde" | "retroshade";
export interface RxState {
  retrograde: boolean;   // TRUE retrograde right now (speed < 0)
  speed: number;         // deg/day at noon UT
  phase: RxPhase;
  strength: number;      // 0..1 shadow-band depth (read-layer intensity)
}

function addDays(iso: string, n: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + n));
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}-${String(dt.getUTCDate()).padStart(2, "0")}`;
}

const STATION_EPS = 0.15; // deg/day — |speed| under this reads as stationing (the intense turning point)

/**
 * Mercury's rx state on `dateStr`. Scans a bounded window around the date (Mercury's whole
 * shadow-to-shadow arc is ~65 days, so ±48 catches the relevant episode's edges), unwraps the
 * longitude, finds the covering retrograde episode, and classifies the day within it.
 */
export async function mercuryRxState(dateStr: string): Promise<RxState> {
  const SPAN = 48;
  const dates: string[] = [];
  for (let i = -SPAN; i <= SPAN; i++) dates.push(addDays(dateStr, i));
  const raw: number[] = [];
  for (const d of dates) raw.push((await planetLongitudeSpeed("mercury", d)).longitude);

  // Unwrap to continuous cumulative longitude (retrograde daily steps are well under 180°).
  let off = 0; const cum: number[] = [];
  for (let i = 0; i < raw.length; i++) {
    if (i > 0) { const diff = raw[i] - raw[i - 1]; if (diff < -180) off += 360; else if (diff > 180) off -= 360; }
    cum.push(raw[i] + off);
  }
  const center = SPAN; // index of dateStr
  const speed = cum[center] - cum[center - 1];
  const daySpeed = (await planetLongitudeSpeed("mercury", dateStr)).speed;

  // Find each retrograde episode in the window; classify the center day if it falls inside one.
  const spd = cum.map((v, i) => (i === 0 ? 0 : v - cum[i - 1]));
  for (let i = 1; i < spd.length; i++) {
    if (spd[i - 1] >= 0 && spd[i] < 0) {                          // station retrograde at i
      const stationR = i, lonR = cum[i];
      let stationD = -1;
      for (let j = i + 1; j < spd.length; j++) { if (spd[j - 1] < 0 && spd[j] >= 0) { stationD = j; break; } }
      if (stationD < 0) continue;
      const lonD = cum[stationD];
      let preStart = stationR; while (preStart > 0 && cum[preStart - 1] >= lonD) preStart--;
      let postEnd = stationD; while (postEnd < cum.length - 1 && cum[postEnd + 1] <= lonR) postEnd++;
      if (center < preStart || center > postEnd) continue;         // not this episode
      const band = lonR - lonD || 1;
      const strength = Math.max(0, Math.min(1,
        center >= stationR && center <= stationD ? 1
          : center < stationR ? (cum[center] - lonD) / band
            : (lonR - cum[center]) / band));
      const retro = daySpeed < 0;
      const stationing = Math.abs(daySpeed) < STATION_EPS;
      const phase: RxPhase =
        stationing ? "stationing"
          : retro ? "retrograde"
            : center < stationR ? "pre-shadow"
              : "retroshade";
      return { retrograde: retro, speed: daySpeed, phase, strength };
    }
  }
  // No episode covers the day → plain direct.
  return { retrograde: daySpeed < 0, speed: daySpeed, phase: "direct", strength: 0 };
}

const ZOD = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"];
const signOfLon = (lon: number) => ZOD[Math.floor((((lon % 360) + 360) % 360) / 30)];

export interface MercuryRxCycle {
  preShadowStart: string;
  stationRetro: { date: string; lon: number; sign: string };
  stationDirect: { date: string; lon: number; sign: string };
  retroshadeEnd: string;
  phaseNow: "approaching" | "pre-shadow" | "retrograde" | "retroshade";
  daysToStationRetro: number;   // from `dateStr` (negative once past)
  retroStartLon: number;        // station-retrograde longitude (band top)
  retroEndLon: number;          // station-direct longitude (band bottom)
  crossesSigns: boolean;        // does Mercury back over a sign boundary during the rx?
}

/**
 * The Mercury retrograde CYCLE relevant to `dateStr` — the whole arc (pre-shadow → station R →
 * retrograde → station D → retroshade) for the episode that is currently active OR approaching within
 * ~45 days. Returns null when no cycle is in range (Mercury clear). The period-reading analog of
 * nextEclipseSeason: raw astronomy only; the chart mapping (houses/hits) happens in the input-builder.
 */
export async function mercuryRxCycle(dateStr: string, lookaheadDays = 45): Promise<MercuryRxCycle | null> {
  const BACK = 25, FWD = 135;
  const dates: string[] = [];
  for (let i = -BACK; i <= FWD; i++) dates.push(addDays(dateStr, i));
  const raw: number[] = [];
  for (const d of dates) raw.push((await planetLongitudeSpeed("mercury", d)).longitude);
  let off = 0; const cum: number[] = [];
  for (let i = 0; i < raw.length; i++) {
    if (i > 0) { const diff = raw[i] - raw[i - 1]; if (diff < -180) off += 360; else if (diff > 180) off -= 360; }
    cum.push(raw[i] + off);
  }
  const spd = cum.map((v, i) => (i === 0 ? 0 : v - cum[i - 1]));
  const idxOf = (iso: string) => dates.indexOf(iso);
  const todayIdx = BACK;

  for (let i = 1; i < spd.length; i++) {
    if (spd[i - 1] >= 0 && spd[i] < 0) {                          // station retrograde
      const stationR = i, lonR = cum[i];
      let stationD = -1;
      for (let j = i + 1; j < spd.length; j++) { if (spd[j - 1] < 0 && spd[j] >= 0) { stationD = j; break; } }
      if (stationD < 0) continue;
      const lonD = cum[stationD];
      let preStart = stationR; while (preStart > 0 && cum[preStart - 1] >= lonD) preStart--;
      let postEnd = stationD; while (postEnd < cum.length - 1 && cum[postEnd + 1] <= lonR) postEnd++;

      // In range if the cycle hasn't fully cleared and its build is within the lookahead window.
      const retroshadeEnd = dates[postEnd];
      const preShadowStart = dates[preStart];
      if (retroshadeEnd < dateStr) continue;                      // already over
      if (preShadowStart > addDays(dateStr, lookaheadDays)) return null; // too far out — nothing to read yet

      const phaseNow: MercuryRxCycle["phaseNow"] =
        todayIdx < preStart ? "approaching"
          : todayIdx < stationR ? "pre-shadow"
            : todayIdx <= stationD ? "retrograde"
              : "retroshade";
      return {
        preShadowStart,
        stationRetro: { date: dates[stationR], lon: ((lonR % 360) + 360) % 360, sign: signOfLon(lonR) },
        stationDirect: { date: dates[stationD], lon: ((lonD % 360) + 360) % 360, sign: signOfLon(lonD) },
        retroshadeEnd,
        phaseNow,
        daysToStationRetro: stationR - todayIdx,
        retroStartLon: ((lonR % 360) + 360) % 360,
        retroEndLon: ((lonD % 360) + 360) % 360,
        crossesSigns: signOfLon(lonR) !== signOfLon(lonD),
      };
    }
  }
  return null;
}
