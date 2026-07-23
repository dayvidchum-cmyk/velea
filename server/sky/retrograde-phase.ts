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

// The "stationing" (near-motionless) threshold is PER-PLANET (David 2026-07-23, generalizing): a
// flat 0.15°/day works for Mercury (mean ~1.4°/day) but Saturn barely exceeds 0.13°/day EVER, so a
// flat threshold reads it as forever-stationing. Each is ~10% of the planet's mean daily motion —
// the near-motionless turn scaled to how fast that planet ever moves. A first curve; tune by looking.
const STATION_EPS_BY: Record<RxPlanet, number> = {
  mercury: 0.15, venus: 0.12, mars: 0.06, jupiter: 0.012, saturn: 0.006,
};
// Symmetric scan span per planet — large enough to reach BOTH stations of the episode covering the
// day (a slow planet's retrograde proper alone runs months). More ephemeris calls for the outers;
// deterministic + memoised, and the wiring step computes it only where it earns its keep.
const RX_STATE_SPAN: Record<RxPlanet, number> = {
  mercury: 48, venus: 90, mars: 150, jupiter: 180, saturn: 200,
};

/**
 * ONE planet's retrograde STATE on `dateStr` — phase (direct / pre-shadow / stationing / retrograde
 * / retroshade) + strength (0..1 depth into the shadow band; 1 across the retrograde proper).
 * David 2026-07-23, generalizing Mercury to all five ("every non-Mercury retrograde was flat true;
 * a planet at its station is the most charged state in the sky"). Scans a per-planet window, unwraps
 * longitude, finds the covering retrograde episode, classifies the day within it. Raw astronomy only.
 */
export async function planetRxState(planet: RxPlanet, dateStr: string): Promise<RxState> {
  const SPAN = RX_STATE_SPAN[planet];
  const eps = STATION_EPS_BY[planet];
  const dates: string[] = [];
  for (let i = -SPAN; i <= SPAN; i++) dates.push(addDays(dateStr, i));
  const raw: number[] = [];
  for (const d of dates) raw.push((await planetLongitudeSpeed(planet, d)).longitude);

  // Unwrap to continuous cumulative longitude (retrograde daily steps are well under 180°).
  let off = 0; const cum: number[] = [];
  for (let i = 0; i < raw.length; i++) {
    if (i > 0) { const diff = raw[i] - raw[i - 1]; if (diff < -180) off += 360; else if (diff > 180) off -= 360; }
    cum.push(raw[i] + off);
  }
  const center = SPAN; // index of dateStr
  const daySpeed = (await planetLongitudeSpeed(planet, dateStr)).speed;

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
      const stationing = Math.abs(daySpeed) < eps;
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

/** Mercury's rx state — the original caller; now a thin wrapper over the general function. */
export async function mercuryRxState(dateStr: string): Promise<RxState> {
  return planetRxState("mercury", dateStr);
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
 * ONE PLANET'S retrograde CYCLE relevant to `dateStr` — the whole arc (pre-shadow → station R →
 * retrograde → station D → retroshade) for the episode active OR approaching within the planet's
 * lookahead. Generalized from Mercury (David 2026-07-16: "we have mercury done") — same sweep,
 * per-planet windows sized to each planet's shadow-to-shadow span. Raw astronomy only; the chart
 * mapping happens in the input-builder.
 */
export type RxPlanet = "mercury" | "venus" | "mars" | "jupiter" | "saturn";
const RX_WINDOWS: Record<RxPlanet, { back: number; fwd: number; lookahead: number }> = {
  mercury: { back: 25, fwd: 135, lookahead: 45 },
  venus:   { back: 60, fwd: 280, lookahead: 60 },
  mars:    { back: 100, fwd: 360, lookahead: 75 },
  jupiter: { back: 140, fwd: 430, lookahead: 90 },
  saturn:  { back: 160, fwd: 470, lookahead: 90 },
};
export type PlanetRxCycle = MercuryRxCycle & { planet: RxPlanet };

export async function planetRxCycle(planet: RxPlanet, dateStr: string): Promise<PlanetRxCycle | null> {
  const { back: BACK, fwd: FWD, lookahead } = RX_WINDOWS[planet];
  const dates: string[] = [];
  for (let i = -BACK; i <= FWD; i++) dates.push(addDays(dateStr, i));
  const raw: number[] = [];
  for (const d of dates) raw.push((await planetLongitudeSpeed(planet, d)).longitude);
  let off = 0; const cum: number[] = [];
  for (let i = 0; i < raw.length; i++) {
    if (i > 0) { const diff = raw[i] - raw[i - 1]; if (diff < -180) off += 360; else if (diff > 180) off -= 360; }
    cum.push(raw[i] + off);
  }
  const spd = cum.map((v, i) => (i === 0 ? 0 : v - cum[i - 1]));
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

      const retroshadeEnd = dates[postEnd];
      const preShadowStart = dates[preStart];
      if (retroshadeEnd < dateStr) continue;                      // already over
      if (preShadowStart > addDays(dateStr, lookahead)) return null; // too far out — nothing to read yet

      const phaseNow: MercuryRxCycle["phaseNow"] =
        todayIdx < preStart ? "approaching"
          : todayIdx < stationR ? "pre-shadow"
            : todayIdx <= stationD ? "retrograde"
              : "retroshade";
      return {
        planet,
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

/** Mercury's cycle — the original entry point, now a delegate. */
export async function mercuryRxCycle(dateStr: string): Promise<MercuryRxCycle | null> {
  return planetRxCycle("mercury", dateStr);
}
