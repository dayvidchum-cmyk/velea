/**
 * VARSHAPHALA — ROAD A (David 2026-07-16: "A then B").
 *
 * The K&F-NATIVE year seat: everything here is buildable from the ingested canon —
 * the SOLAR RETURN chart (the year's own sky, cast for the instant the Sun returns to
 * its natal longitude, at the native's CURRENT residence) read with the Tajika aspect
 * machinery the books DO teach (Vol II Ch.14: the five aspects with orbs; Ithasala =
 * applying → it forms; Easarapha = separating → it completes/passes). Deliberately NOT
 * built: the year-lord election, Muntha, Sahams, month-lords — those are Tajika-corpus
 * material K&F never teach; ROAD B adds them when David sources the Charak text.
 *
 * Orbs: the classical deeptāṁśa (planet half-orbs); a pair's orb = the mean of the two.
 * Rahu/Ketu are EXCLUDED from Tajika aspects (canon: "not included in Tajika yogas").
 */
import { getSiderealLongitudesWithSpeed } from "./natal-chart-engine.js";
import { ascendantAt } from "../birthchart/calculator.js";

const PLANETS = ["Sun", "Moon", "Mercury", "Venus", "Mars", "Jupiter", "Saturn"] as const;
const ZODIAC = ["Aries","Taurus","Gemini","Cancer","Leo","Virgo","Libra","Scorpio","Sagittarius","Capricorn","Aquarius","Pisces"];
const SIGN_RULERS: Record<string, string> = {
  Aries: "Mars", Taurus: "Venus", Gemini: "Mercury", Cancer: "Moon", Leo: "Sun", Virgo: "Mercury",
  Libra: "Venus", Scorpio: "Mars", Sagittarius: "Jupiter", Capricorn: "Saturn", Aquarius: "Saturn", Pisces: "Jupiter",
};
/** Classical deeptāṁśa half-orbs (degrees). */
const DEEPTAMSA: Record<string, number> = { Sun: 15, Moon: 12, Mars: 8, Mercury: 7, Jupiter: 9, Venus: 7, Saturn: 9 };
const ASPECTS = [
  { angle: 0, name: "conjunction" },
  { angle: 60, name: "sextile" },
  { angle: 90, name: "square" },
  { angle: 120, name: "trine" },
  { angle: 180, name: "opposition" },
] as const;

const norm = (x: number) => ((x % 360) + 360) % 360;

export interface TajikaAspect {
  a: string; b: string;
  aspect: string;
  /** Ithasala (applying — it FORMS this year) or Easarapha (separating — it completes). */
  kind: "ithasala" | "easarapha";
  orbDeg: number;
  housesInvolved: { planet: string; house: number }[];
}

export interface Varshaphala {
  _how: string;
  returnMoment: string;             // ISO instant of the solar return
  castAt: { lat: number; lon: number; source: "current" | "birth" | "fallback" };
  lagna: { sign: string; lord: string };
  lagnaLord: { planet: string; sign: string; house: number; retrograde: boolean };
  moon: { sign: string; house: number };
  planetsByHouse: Record<number, string[]>;
  tajika: TajikaAspect[];
}

const memo = new Map<string, Varshaphala | null>();

/** Find the instant (±1 min) the Sun returns to natalSunLon, near the given birthday date. */
async function findReturnInstant(natalSunLon: number, birthdayIso: string): Promise<number | null> {
  const target = norm(natalSunLon);
  const sunAt = async (ms: number) => {
    const p = await getSiderealLongitudesWithSpeed(new Date(ms), ["Sun"]);
    return norm(p.Sun?.longitude ?? 0);
  };
  const signedDiff = (lon: number) => ((lon - target + 540) % 360) - 180; // <0 before, >0 after
  // Bracket the crossing across ±3 days around the civil birthday.
  const center = Date.parse(birthdayIso + "T12:00:00Z");
  let lo = center - 3 * 86_400_000;
  let dLo = signedDiff(await sunAt(lo));
  let hi = lo;
  let found = false;
  for (let i = 1; i <= 12; i++) { // 12 half-day steps = 6 days
    hi = lo + i * 43_200_000;
    const dHi = signedDiff(await sunAt(hi));
    if (dLo <= 0 && dHi >= 0) { lo = hi - 43_200_000; found = true; break; }
    dLo = dHi;
  }
  if (!found) return null;
  for (let i = 0; i < 20; i++) { // bisect to <1 min
    const mid = (lo + hi) / 2;
    if (signedDiff(await sunAt(mid)) < 0) lo = mid; else hi = mid;
  }
  return Math.round((lo + hi) / 2);
}

export async function computeVarshaphala(args: {
  profileKey: string;               // memo identity (profileId|yearStart|locKey)
  natalSunLon: number;
  yearStart: string;                // the profection-year birthday (YYYY-MM-DD)
  lat: number; lon: number;
  locSource: "current" | "birth" | "fallback";
}): Promise<Varshaphala | null> {
  const hit = memo.get(args.profileKey);
  if (hit !== undefined) return hit;

  const instant = await findReturnInstant(args.natalSunLon, args.yearStart);
  if (!instant) { memo.set(args.profileKey, null); return null; }

  const when = new Date(instant);
  const pos = await getSiderealLongitudesWithSpeed(when, [...PLANETS]);
  const ascLon = await ascendantAt(instant, args.lat, args.lon);
  const lagIdx = Math.floor(norm(ascLon) / 30);
  const lagnaSign = ZODIAC[lagIdx];
  const houseOf = (lonDeg: number) => ((Math.floor(norm(lonDeg) / 30) - lagIdx + 12) % 12) + 1;

  const planetsByHouse: Record<number, string[]> = {};
  const seat: Record<string, { lon: number; speed: number; sign: string; house: number; retro: boolean }> = {};
  for (const pl of PLANETS) {
    const d = pos[pl];
    if (!d) continue;
    const house = houseOf(d.longitude);
    seat[pl] = { lon: norm(d.longitude), speed: d.speed ?? 0, sign: ZODIAC[Math.floor(norm(d.longitude) / 30)], house, retro: (d.speed ?? 0) < 0 };
    (planetsByHouse[house] ??= []).push(pl);
  }

  // Tajika aspects: within the pair's mean deeptāṁśa of an exact angle; the FASTER
  // planet applying (closing on exactness) = Ithasala; separating = Easarapha.
  const tajika: TajikaAspect[] = [];
  for (let i = 0; i < PLANETS.length; i++) {
    for (let j = i + 1; j < PLANETS.length; j++) {
      const A = PLANETS[i], B = PLANETS[j];
      const a = seat[A], b = seat[B];
      if (!a || !b) continue;
      const sep = Math.abs(((a.lon - b.lon + 540) % 360) - 180); // 0..180
      for (const asp of ASPECTS) {
        const orb = (DEEPTAMSA[A] + DEEPTAMSA[B]) / 2;
        const delta = Math.abs(sep - asp.angle);
        if (delta > orb) continue;
        // Applying? Nudge time forward: does the separation move TOWARD exactness?
        const dtHours = 6;
        const aLon2 = norm(a.lon + (a.speed * dtHours) / 24);
        const bLon2 = norm(b.lon + (b.speed * dtHours) / 24);
        const sep2 = Math.abs(((aLon2 - bLon2 + 540) % 360) - 180);
        const applying = Math.abs(sep2 - asp.angle) < delta;
        tajika.push({
          a: A, b: B, aspect: asp.name,
          kind: applying ? "ithasala" : "easarapha",
          orbDeg: +delta.toFixed(1),
          housesInvolved: [{ planet: A, house: a.house }, { planet: B, house: b.house }],
        });
        break; // one aspect per pair (the nearest matched angle)
      }
    }
  }
  // The loudest first: tighter orbs speak louder; Ithasala (the forming) before the passing.
  tajika.sort((x, y) => (x.kind === y.kind ? x.orbDeg - y.orbDeg : x.kind === "ithasala" ? -1 : 1));

  const lagnaLord = SIGN_RULERS[lagnaSign];
  const ll = seat[lagnaLord];
  const result: Varshaphala = {
    _how: "THE YEAR'S OWN CHART (Varshaphala, K&F-native road A): the sky at the instant the Sun returned to its birth degree, cast where the native lives now. The year's ascendant is the year's stage; its lord's seat is the year's anchor. Ithasala pairs = what FORMS this year (the faster planet still applying); Easarapha = what completes or passes. Translate — never surface these terms.",
    returnMoment: when.toISOString(),
    castAt: { lat: args.lat, lon: args.lon, source: args.locSource },
    lagna: { sign: lagnaSign, lord: lagnaLord },
    lagnaLord: ll ? { planet: lagnaLord, sign: ll.sign, house: ll.house, retrograde: ll.retro } : { planet: lagnaLord, sign: "", house: 0, retrograde: false },
    moon: seat.Moon ? { sign: seat.Moon.sign, house: seat.Moon.house } : { sign: "", house: 0 },
    planetsByHouse,
    tajika: tajika.slice(0, 6),
  };
  memo.set(args.profileKey, result);
  return result;
}
