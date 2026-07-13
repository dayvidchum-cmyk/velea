/**
 * MONTH EVENTS — the deterministic "big beats" of a calendar month for one chart, feeding the Monthly
 * period reading (David: "same as a single day, but expanded to the month — the interactions"). One
 * cheap scan pulls the month's SCENES so a single prompt can synthesize them, instead of 30 day-reads.
 *
 * Scenes extracted (each mapped into THIS chart's houses):
 *   - lunations: New Moon (seed) + Full Moon (culmination), in the life-area they fall on
 *   - ingresses: a planet crossing into a new sign → a new life-area lit
 *   - stations:  a planet turning retrograde or direct → a hinge in its arena
 *   - eclipses:  any eclipse inside the month (reuses sky/eclipses.ts)
 *   - hits:      a transiting personal planet crossing exactly over a natal point (a personal beat)
 *
 * The Time Lord / dasha backdrop + any dasha hand-off are added by the input-builder (which already
 * has the timeline). Pure ephemeris; no LLM.
 */
import { planetLongitudeSpeed } from "../birthchart/calculator.js";
import { findEclipses } from "./eclipses.js";
import { HOUSE_KEYWORDS } from "./eclipses.js";

const ZOD = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"];
const norm = (x: number) => ((x % 360) + 360) % 360;
const signIdx = (lon: number) => Math.floor(norm(lon) / 30);
const signName = (lon: number) => ZOD[signIdx(lon)];
// signed separation in (-180, 180]
const sep180 = (a: number, b: number) => { let d = norm(a - b); if (d > 180) d -= 360; return d; };

// Slow scenes come from the transiting planets; the Moon is only used for the lunation phase.
const SCAN_PLANETS = ["sun", "mercury", "venus", "mars", "jupiter", "saturn"] as const;
const STATION_PLANETS = ["mercury", "venus", "mars", "jupiter", "saturn"] as const;
const HIT_PLANETS = ["sun", "mercury", "venus", "mars"] as const; // the fast, personal "event" markers

export type MonthEvent =
  | { kind: "newmoon" | "fullmoon"; date: string; house: number; houseGloss: string }
  | { kind: "ingress"; date: string; planet: string; sign: string; house: number; houseGloss: string }
  | { kind: "station"; date: string; planet: string; direction: "retrograde" | "direct"; sign: string; house: number; houseGloss: string }
  | { kind: "eclipse"; date: string; type: string; sign: string; house: number; houseGloss: string }
  | { kind: "hit"; date: string; planet: string; natalPoint: string; house: number; houseGloss: string };

export interface MonthScan {
  month: string;       // "YYYY-MM"
  monthStart: string;  // "YYYY-MM-01"
  monthEnd: string;    // last day
  events: MonthEvent[];
}

function daysInMonth(y: number, m: number) { return new Date(Date.UTC(y, m, 0)).getUTCDate(); }
function iso(y: number, m: number, d: number) { return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`; }

/**
 * Scan the calendar month CONTAINING `dateStr` and return its big beats, mapped into the chart whose
 * natal longitudes + lagna sign are given. `natalLonByPoint` maps a point name (Sun, Moon, …, Asc) to
 * its sidereal longitude.
 */
export async function monthEvents(dateStr: string, natalLonByPoint: Record<string, number>, lagnaSign: string): Promise<MonthScan> {
  const [Y, M] = dateStr.split("-").map(Number);
  const dim = daysInMonth(Y, M);
  const lagnaIdx = Math.max(0, ZOD.indexOf(lagnaSign));
  const houseOf = (lon: number) => ((signIdx(lon) - lagnaIdx + 12) % 12) + 1;
  const withHouse = (lon: number) => { const h = houseOf(lon); return { house: h, houseGloss: HOUSE_KEYWORDS[h] }; };

  // Sample every day of the month (+ the last day of the prior month, to catch a day-1 change).
  const dates: string[] = [];
  for (let d = 0; d <= dim; d++) { const dt = new Date(Date.UTC(Y, M - 1, d)); dates.push(iso(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate())); }
  const lon: Record<string, number[]> = {}; const spd: Record<string, number[]> = {};
  for (const p of [...SCAN_PLANETS, "moon"]) { lon[p] = []; spd[p] = []; }
  for (const date of dates) {
    for (const p of [...SCAN_PLANETS, "moon"]) { const r = await planetLongitudeSpeed(p, date); lon[p].push(r.longitude); spd[p].push(r.speed); }
  }

  const events: MonthEvent[] = [];
  const inMonth = (i: number) => i >= 1; // index 0 is the prior-month anchor day

  for (let i = 1; i < dates.length; i++) {
    if (!inMonth(i)) continue;
    const date = dates[i];

    // Lunations — Sun→Moon elongation.
    const e0 = norm(lon.moon[i - 1] - lon.sun[i - 1]);
    const e1 = norm(lon.moon[i] - lon.sun[i]);
    if (e0 > 300 && e1 < 60) events.push({ kind: "newmoon", date, ...withHouse(lon.moon[i]) });
    if (e0 < 180 && e1 >= 180) events.push({ kind: "fullmoon", date, ...withHouse(lon.moon[i]) });

    for (const p of SCAN_PLANETS) {
      // Ingress — sign change.
      if (signIdx(lon[p][i]) !== signIdx(lon[p][i - 1])) {
        events.push({ kind: "ingress", date, planet: cap(p), sign: signName(lon[p][i]), ...withHouse(lon[p][i]) });
      }
    }
    for (const p of STATION_PLANETS) {
      // Station — speed sign flip.
      if ((spd[p][i - 1] >= 0) !== (spd[p][i] >= 0)) {
        events.push({ kind: "station", date, planet: cap(p), direction: spd[p][i] < 0 ? "retrograde" : "direct", sign: signName(lon[p][i]), ...withHouse(lon[p][i]) });
      }
    }
    for (const p of HIT_PLANETS) {
      // Hit — exact conjunction (the signed gap to a natal point crosses 0).
      for (const [point, nlon] of Object.entries(natalLonByPoint)) {
        if (point === "Rahu" || point === "Ketu") continue;
        const g0 = sep180(lon[p][i - 1], nlon), g1 = sep180(lon[p][i], nlon);
        if (g0 !== 0 && g1 !== 0 && (g0 < 0) !== (g1 < 0) && Math.abs(g0) < 20 && Math.abs(g1) < 20) {
          events.push({ kind: "hit", date, planet: cap(p), natalPoint: point, ...withHouse(lon[p][i]) });
        }
      }
    }
  }

  // Eclipses inside the month (reuse the dedicated engine; it bisects the exact date).
  const monthStartMs = Date.parse(iso(Y, M, 1) + "T00:00:00Z");
  const ecl = await findEclipses(monthStartMs, dim);
  for (const e of ecl) {
    if (e.date.slice(0, 7) !== dateStr.slice(0, 7)) continue;
    events.push({ kind: "eclipse", date: e.date, type: e.type, sign: e.sign, ...withHouse(e.eclLon) });
  }

  events.sort((a, b) => a.date.localeCompare(b.date));
  return { month: dateStr.slice(0, 7), monthStart: iso(Y, M, 1), monthEnd: iso(Y, M, dim), events };
}

function cap(p: string) { return p.charAt(0).toUpperCase() + p.slice(1); }
