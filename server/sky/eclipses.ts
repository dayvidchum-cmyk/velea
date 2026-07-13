/**
 * ECLIPSES — find the real solar/lunar eclipses in a date range (Velea's sidereal frame), and map
 * each to a chart: which whole-sign house it falls in, its house from the natal Moon, its dispositor
 * (the sign lord whose condition it borrows), and which natal points it conjoins or opposes (an
 * eclipse activates its whole axis). Powers the Eclipse Season reading (server/narrative).
 *
 * Promoted from the one-off scripts upcoming-eclipses.ts + eclipse-natal-hits.ts — same math, now a
 * reusable, tested module. Ephemeris-backed (getSiderealLongitudesWithSpeed); the pure chart-mapping
 * helpers are unit-testable without it.
 */
import { getSiderealLongitudesWithSpeed } from "../vedic/natal-chart-engine.js";

const ZOD = ["Aries","Taurus","Gemini","Cancer","Leo","Virgo","Libra","Scorpio","Sagittarius","Capricorn","Aquarius","Pisces"];
const DAY = 86400000;
const norm = (x: number) => ((x % 360) + 360) % 360;
const diffTo = (x: number, t: number) => { let d = norm(x) - t; if (d > 180) d -= 360; if (d < -180) d += 360; return d; };
const sep = (a: number, b: number) => { const d = norm(a - b); return Math.min(d, 360 - d); };

// Concise life-area keywords per whole-sign house — fed to the eclipse-season prompt so it names
// the CONCRETE life-content the eclipse lands on (the proof-is-in-specifics law), never a bare number.
export const HOUSE_KEYWORDS: Record<number, string> = {
  1: "the self, body, vitality, how you meet life",
  2: "money, what you own and earn, your word, family",
  3: "siblings & close circle, courage, effort, short trips, the hands and skill",
  4: "home, land, roots, the mother, inner rest",
  5: "creativity, children, romance, what you make, speculation",
  6: "work, service, health, debts, enemies, the daily grind",
  7: "the partner, marriage, one-on-one, open dealings and clients",
  8: "shared resources, upheaval, the hidden, intimacy, what is merged",
  9: "meaning, belief, teaching, publishing, long journeys, the father",
  10: "career, public standing, reputation, the work with your name on it",
  11: "gains, income, networks, allies, the wider circle, hopes",
  12: "release, retreat, loss, foreign lands, rest, what dissolves",
};

export const SIGN_RULER: Record<string, string> = {
  Aries:"Mars",Taurus:"Venus",Gemini:"Mercury",Cancer:"Moon",Leo:"Sun",Virgo:"Mercury",
  Libra:"Venus",Scorpio:"Mars",Sagittarius:"Jupiter",Capricorn:"Saturn",Aquarius:"Saturn",Pisces:"Jupiter",
};

export type Eclipse = {
  date: string;          // YYYY-MM-DD (UTC) of the exact syzygy
  dateMs: number;
  type: "solar" | "lunar";
  eclLon: number;        // sidereal longitude of the eclipse POINT (solar = Sun≈Moon; lunar = the Moon)
  sign: string;
  degInSign: number;
  nodeDistDeg: number;   // Sun–node axis distance at the eclipse (smaller = more central/deep)
};

// Solar eclipses happen at the new moon near a node (≤~18° off axis); lunar at the full moon (≤~12°).
const TARGETS = [{ t: 0, type: "solar" as const, limit: 18 }, { t: 180, type: "lunar" as const, limit: 12 }];

async function sample(ms: number) {
  const p = await getSiderealLongitudesWithSpeed(new Date(ms), ["Sun", "Moon", "Rahu"]);
  return { sun: p.Sun?.longitude ?? 0, moon: p.Moon?.longitude ?? 0, rahu: p.Rahu?.longitude ?? 0 };
}

// Bisect to the exact instant the Moon–Sun elongation equals `target` (0 = new, 180 = full).
async function bisect(lo: number, hi: number, target: number) {
  let a = lo, b = hi;
  let da = diffTo(norm((await sample(a)).moon - (await sample(a)).sun), target);
  for (let i = 0; i < 22; i++) {
    const mid = (a + b) / 2;
    const s = await sample(mid);
    const dm = diffTo(norm(s.moon - s.sun), target);
    if (Math.sign(dm) === Math.sign(da)) { a = mid; da = dm; } else b = mid;
  }
  return (a + b) / 2;
}

/**
 * Every real solar/lunar eclipse whose exact syzygy falls in [startMs, startMs + daysAhead·day].
 * Steps the elongation in 2-day windows, bisects each new/full crossing, and keeps it only when the
 * Sun is inside the ecliptic limit of the nodal axis. Sorted by date.
 */
export async function findEclipses(startMs: number, daysAhead: number): Promise<Eclipse[]> {
  const out: Eclipse[] = [];
  let prevMs = startMs;
  let prev = await sample(startMs);
  for (let off = 2; off <= daysAhead; off += 2) {
    const ms = startMs + off * DAY;
    const cur = await sample(ms);
    for (const tg of TARGETS) {
      const dPrev = diffTo(norm(prev.moon - prev.sun), tg.t);
      const dCur = diffTo(norm(cur.moon - cur.sun), tg.t);
      if (Math.sign(dPrev) !== Math.sign(dCur) && Math.abs(dPrev) < 90) {
        const exact = await bisect(prevMs, ms, tg.t);
        const at = await sample(exact);
        const nodeDist = Math.min(sep(at.sun, at.rahu), sep(at.sun, at.rahu + 180));
        if (nodeDist <= tg.limit) {
          const eclLon = tg.type === "solar" ? at.sun : at.moon; // lunar point = the Moon (opp the Sun)
          const s = Math.floor(norm(eclLon) / 30);
          out.push({
            date: new Date(exact).toISOString().slice(0, 10), dateMs: exact, type: tg.type,
            eclLon: norm(eclLon), sign: ZOD[s], degInSign: +(norm(eclLon) - s * 30).toFixed(1),
            nodeDistDeg: +nodeDist.toFixed(1),
          });
        }
      }
    }
    prevMs = ms; prev = cur;
  }
  out.sort((a, b) => a.date.localeCompare(b.date));
  return out;
}

/**
 * Group eclipses into SEASONS — clusters within ~40 days of each other (a season holds 1–3 eclipses,
 * usually a solar+lunar pair ~2 weeks apart). Returns the FIRST season at/after refMs (the one the
 * user is heading into). Empty if none in range.
 */
export function nextEclipseSeason(eclipses: Eclipse[]): Eclipse[] {
  if (!eclipses.length) return [];
  const season: Eclipse[] = [eclipses[0]];
  for (let i = 1; i < eclipses.length; i++) {
    if (eclipses[i].dateMs - season[season.length - 1].dateMs <= 40 * DAY) season.push(eclipses[i]);
    else break;
  }
  return season;
}

export type EclipseChartContext = {
  wholeSignHouse: number;       // 1–12 from the lagna
  houseFromMoon: number;        // 1–12 from the natal Moon
  dispositor: string;           // the eclipse sign's lord
  hits: { point: string; orbDeg: number; which: "conj" | "opp" }[]; // natal points on the eclipse axis, tightest first
};

const houseOf = (lon: number, refLon: number) => ((Math.floor(norm(lon) / 30) - Math.floor(norm(refLon) / 30) + 12) % 12) + 1;

/**
 * Map an eclipse point into ONE chart: its whole-sign house, its house from the natal Moon, its
 * dispositor, and every natal point within `orbLimit`° of EITHER end of the eclipse axis (an eclipse
 * lights its whole axis — conjunction and opposition both count). Pure; no ephemeris.
 */
export function eclipseChartContext(
  eclLon: number, lagnaLon: number, moonLon: number,
  natalByPoint: Record<string, number>, orbLimit = 8,
): EclipseChartContext {
  const hits = Object.entries(natalByPoint)
    .map(([point, lon]) => {
      const conj = sep(lon, eclLon), opp = sep(lon, norm(eclLon + 180));
      const tight = Math.min(conj, opp);
      return { point, orbDeg: +tight.toFixed(1), which: (conj <= opp ? "conj" : "opp") as "conj" | "opp" };
    })
    .filter((h) => h.orbDeg <= orbLimit)
    .sort((a, b) => a.orbDeg - b.orbDeg);
  return {
    wholeSignHouse: houseOf(eclLon, lagnaLon),
    houseFromMoon: houseOf(eclLon, moonLon),
    dispositor: SIGN_RULER[ZOD[Math.floor(norm(eclLon) / 30)]],
    hits,
  };
}
