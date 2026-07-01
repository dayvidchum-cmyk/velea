/**
 * CURRENT SKY — the "all planets, right now" foundation layer.
 *
 * Computes every planet's live sidereal position, motion (retrograde), the
 * houses it transits from THIS profile's Lagna, the conjunctions it makes to the
 * native's natal points, the nearest retrograde/direct STATIONS, and the nearest
 * eclipses. Pure data — no interpretation, no UI, no engine wiring yet. This is
 * the reliable signal the Golden Moment layer (and anything else) will read from.
 *
 * Positions/speeds come from the same Swiss Ephemeris setup as the stored natal
 * chart (getSiderealLongitudesWithSpeed), so orbs against natal points are
 * apples-to-apples with the existing transit-pressure layer.
 */

import type { AstrologySubject } from "../astrology-subject";
import { getSiderealLongitudesWithSpeed } from "../vedic/natal-chart-engine";

const ZODIAC = [
  "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
  "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces",
];

const NAKSHATRAS = [
  "Ashwini", "Bharani", "Krittika", "Rohini", "Mrigashira", "Ardra", "Punarvasu",
  "Pushya", "Ashlesha", "Magha", "Purva Phalguni", "Uttara Phalguni", "Hasta",
  "Chitra", "Swati", "Vishakha", "Anuradha", "Jyeshtha", "Mula", "Purva Ashadha",
  "Uttara Ashadha", "Shravana", "Dhanishtha", "Satabhisha", "Purva Bhadrapada",
  "Uttara Bhadrapada", "Revati",
];

// All nine grahas, slow → relevant for the "stage". Sun/Moon never retrograde;
// Rahu/Ketu are always retrograde (mean nodes) and never station.
const ALL_PLANETS = ["Sun", "Moon", "Mercury", "Venus", "Mars", "Jupiter", "Saturn", "Rahu", "Ketu"];
const STATIONERS = ["Mercury", "Venus", "Mars", "Jupiter", "Saturn"];

const HIT_ORB = 4; // degrees, conjunction to a natal point (matches narrative input-builder)
const DAY_MS = 86_400_000;

export interface SkyStation {
  type: "turns retrograde" | "turns direct";
  date: string;
  daysAway: number;
}

export interface SkyPlanet {
  planet: string;
  longitude: number;
  sign: string;
  degreeInSign: number;
  nakshatra: string;
  house: number | null; // whole-sign house from this profile's Lagna
  speed: number; // deg/day; negative = retrograde
  isRetrograde: boolean;
  station: SkyStation | null; // nearest upcoming station (or recent), if any
  hits: { natalPoint: string; orb: number }[]; // conjunctions to natal points
}

export interface CurrentSky {
  computedAt: string;
  planets: SkyPlanet[];
  retrogrades: string[]; // convenience: planets currently retrograde
  eclipses: { type: "solar" | "lunar"; date: string; daysAway: number }[];
}

const norm360 = (x: number) => ((x % 360) + 360) % 360;

function angularSeparation(a: number, b: number): number {
  let d = Math.abs(norm360(a - b));
  if (d > 180) d = 360 - d;
  return d;
}

function natalPointsFromSubject(subject: AstrologySubject): { point: string; longitude: number }[] {
  const pts: { point: string; longitude: number }[] = [];
  for (const b of subject.natalBodies ?? []) {
    if (b.longitude != null && b.longitude !== "") {
      const lon = parseFloat(b.longitude);
      if (!Number.isNaN(lon)) pts.push({ point: b.planet, longitude: norm360(lon) });
    }
  }
  if (subject.lagnaSign && subject.ascendantDegree != null && subject.ascendantDegree !== "") {
    const idx = ZODIAC.indexOf(subject.lagnaSign);
    const deg = parseFloat(subject.ascendantDegree);
    if (idx >= 0 && !Number.isNaN(deg)) pts.push({ point: "Lagna", longitude: norm360(idx * 30 + deg) });
  }
  return pts;
}

/** Binary-search the instant a planet's longitude-speed crosses zero between t0 and t1. */
async function bisectStation(planet: string, t0: Date, t1: Date): Promise<Date> {
  let lo = t0.getTime();
  let hi = t1.getTime();
  const speedAt = async (ms: number) =>
    (await getSiderealLongitudesWithSpeed(new Date(ms), [planet]))[planet]?.speed ?? 0;
  let sLo = await speedAt(lo);
  for (let i = 0; i < 16; i++) {
    const mid = (lo + hi) / 2;
    const sMid = await speedAt(mid);
    if (Math.sign(sMid) === Math.sign(sLo)) { lo = mid; sLo = sMid; } else { hi = mid; }
  }
  return new Date((lo + hi) / 2);
}

/** Nearest station per stationing planet within [-12, +60] days of `when`. */
async function detectStations(when: Date): Promise<Record<string, SkyStation>> {
  const out: Record<string, SkyStation> = {};
  const stepDays = 3;
  let prev: { date: Date; speeds: Record<string, { speed: number }> } | null = null;
  for (let off = -12; off <= 60; off += stepDays) {
    const d = new Date(when.getTime() + off * DAY_MS);
    const speeds = await getSiderealLongitudesWithSpeed(d, STATIONERS);
    if (prev) {
      for (const p of STATIONERS) {
        if (out[p]) continue; // keep the nearest one only
        const s0 = prev.speeds[p]?.speed ?? 0;
        const s1 = speeds[p]?.speed ?? 0;
        if (s0 !== 0 && s1 !== 0 && Math.sign(s0) !== Math.sign(s1)) {
          const exact = await bisectStation(p, prev.date, d);
          out[p] = {
            type: s1 < 0 ? "turns retrograde" : "turns direct",
            date: exact.toISOString(),
            daysAway: Math.round((exact.getTime() - when.getTime()) / DAY_MS),
          };
        }
      }
    }
    prev = { date: d, speeds };
  }
  return out;
}

// Signed difference of an angle from a target, in (-180, 180].
function diffTo(angle: number, target: number): number {
  return ((angle - target + 540) % 360) - 180;
}

/**
 * Eclipses, computed geometrically (the WASM ephemeris has no eclipse module).
 * A solar eclipse is a New Moon (Sun–Moon conjunction) and a lunar eclipse is a
 * Full Moon (opposition) that falls close enough to a lunar node. We scan forward
 * for the next New and Full Moon and flag each as an eclipse when the Sun is
 * within the node-proximity limit (≈18° solar / ≈12° lunar — generous, to mark
 * eclipse season). Approximate timing/typing, exact enough to surface "soon."
 */
async function findEclipses(when: Date): Promise<{ type: "solar" | "lunar"; date: string; daysAway: number }[]> {
  const out: { type: "solar" | "lunar"; date: string; daysAway: number }[] = [];
  const start = when.getTime();
  const sample = async (ms: number) => {
    const p = await getSiderealLongitudesWithSpeed(new Date(ms), ["Sun", "Moon", "Rahu"]);
    return { sun: p.Sun?.longitude ?? 0, moon: p.Moon?.longitude ?? 0, rahu: p.Rahu?.longitude ?? 0 };
  };
  const bisectSyzygy = async (lo: number, hi: number, target: number) => {
    let a = lo, b = hi;
    let da = diffTo(norm360((await sample(a)).moon - (await sample(a)).sun), target);
    for (let i = 0; i < 16; i++) {
      const mid = (a + b) / 2;
      const s = await sample(mid);
      const dm = diffTo(norm360(s.moon - s.sun), target);
      if (Math.sign(dm) === Math.sign(da)) { a = mid; da = dm; } else { b = mid; }
    }
    return (a + b) / 2;
  };

  const targets: { target: number; type: "solar" | "lunar"; limit: number; done: boolean }[] = [
    { target: 0, type: "solar", limit: 18, done: false },
    { target: 180, type: "lunar", limit: 12, done: false },
  ];

  let prevMs = start;
  let prev = await sample(start);
  const stepDays = 2;
  for (let off = stepDays; off <= 200 && targets.some((t) => !t.done); off += stepDays) {
    const ms = start + off * DAY_MS;
    const cur = await sample(ms);
    for (const t of targets) {
      if (t.done) continue;
      const dPrev = diffTo(norm360(prev.moon - prev.sun), t.target);
      const dCur = diffTo(norm360(cur.moon - cur.sun), t.target);
      if (Math.sign(dPrev) !== Math.sign(dCur) && Math.abs(dPrev) < 90) {
        const exactMs = await bisectSyzygy(prevMs, ms, t.target);
        const at = await sample(exactMs);
        const nodeDist = Math.min(angularSeparation(at.sun, at.rahu), angularSeparation(at.sun, at.rahu + 180));
        if (nodeDist <= t.limit) {
          out.push({ type: t.type, date: new Date(exactMs).toISOString(), daysAway: Math.round((exactMs - start) / DAY_MS) });
          t.done = true;
        }
        // either way, this syzygy is consumed; keep scanning for the next one of this type
      }
    }
    prev = cur;
    prevMs = ms;
  }
  out.sort((a, b) => a.daysAway - b.daysAway);
  return out;
}

// Light cache: the sky moves slowly, recompute at most every 30 min per profile.
const CACHE = new Map<string, { at: number; value: CurrentSky }>();
const CACHE_TTL_MS = 30 * 60 * 1000;

// Map raw positions → SkyPlanet[] (shared by the live sky and per-day evaluation).
function buildPlanets(
  positions: Record<string, { longitude: number; speed: number }>,
  natal: { point: string; longitude: number }[],
  lagnaIdx: number,
  stations: Record<string, SkyStation>,
): SkyPlanet[] {
  return ALL_PLANETS.map((p) => {
    const pos = positions[p];
    const longitude = pos?.longitude ?? 0;
    const speed = pos?.speed ?? 0;
    const signIdx = Math.floor(longitude / 30) % 12;
    const isNode = p === "Rahu" || p === "Ketu";
    const isRetrograde = isNode ? true : speed < 0;
    const house = lagnaIdx >= 0 ? ((signIdx - lagnaIdx + 12) % 12) + 1 : null;
    const nakIdx = Math.floor(longitude / (360 / 27)) % 27;
    const hits = natal
      .map((n) => ({ natalPoint: n.point, orb: Math.round(angularSeparation(longitude, n.longitude) * 10) / 10 }))
      .filter((h) => h.orb <= HIT_ORB && h.natalPoint !== p)
      .sort((a, b) => a.orb - b.orb);
    return {
      planet: p,
      longitude: Math.round(longitude * 100) / 100,
      sign: ZODIAC[signIdx],
      degreeInSign: Math.round((longitude % 30) * 100) / 100,
      nakshatra: NAKSHATRAS[nakIdx],
      house,
      speed: Math.round(speed * 1000) / 1000,
      isRetrograde,
      station: stations[p] ?? null,
      hits,
    };
  });
}

export async function getCurrentSky(subject: AstrologySubject, when: Date = new Date()): Promise<CurrentSky> {
  const cacheKey = `${subject.lagnaSign ?? "?"}|${subject.ascendantDegree ?? "?"}|${Math.floor(when.getTime() / CACHE_TTL_MS)}`;
  const cached = CACHE.get(cacheKey);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.value;

  const positions = await getSiderealLongitudesWithSpeed(when, ALL_PLANETS);
  const natal = natalPointsFromSubject(subject);
  const lagnaIdx = subject.lagnaSign ? ZODIAC.indexOf(subject.lagnaSign) : -1;
  const stations = await detectStations(when);
  const eclipses = await findEclipses(when);
  const planets = buildPlanets(positions, natal, lagnaIdx, stations);

  const value: CurrentSky = {
    computedAt: when.toISOString(),
    planets,
    retrogrades: planets.filter((p) => p.isRetrograde).map((p) => p.planet),
    eclipses,
  };
  CACHE.set(cacheKey, { at: Date.now(), value });
  return value;
}

// ── Golden days across a month ───────────────────────────────────────────────
// Which days in a month are "golden" (universal signal favorable). Cheap per-day
// eval: real positions + hits + eclipse windows, skipping the expensive station
// scan (stations are single-day and dominated by the eclipse/retro terms here).
const GOLDEN_DAYS_CACHE = new Map<string, { at: number; value: string[] }>();
const GOLDEN_DAYS_TTL_MS = 6 * 60 * 60 * 1000;
const GOLDEN_NET_THRESHOLD = 0.5; // universal favor surplus -> a "potential golden" day

export async function computeGoldenDays(
  subject: AstrologySubject,
  yearMonth: string, // "YYYY-MM"
  litHouses: number[],
): Promise<string[]> {
  const key = `${subject.lagnaSign ?? "?"}|${yearMonth}`;
  const cached = GOLDEN_DAYS_CACHE.get(key);
  if (cached && Date.now() - cached.at < GOLDEN_DAYS_TTL_MS) return cached.value;

  const { computeGoldenMoment } = await import("./golden-moment.js");
  const [y, m] = yearMonth.split("-").map(Number);
  if (!y || !m) return [];
  const daysInMonth = new Date(y, m, 0).getDate();
  const natal = natalPointsFromSubject(subject);
  const lagnaIdx = subject.lagnaSign ? ZODIAC.indexOf(subject.lagnaSign) : -1;

  // Eclipses whose ±10-day window can touch this month (scan from ~25d before).
  const monthStart = Date.UTC(y, m - 1, 1, 12);
  const eclipses = await findEclipses(new Date(monthStart - 25 * DAY_MS));

  const golden: string[] = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const dayNoon = new Date(Date.UTC(y, m - 1, d, 12));
    const positions = await getSiderealLongitudesWithSpeed(dayNoon, ALL_PLANETS);
    const planets = buildPlanets(positions, natal, lagnaIdx, {});
    const dayEclipses = eclipses
      .map((e) => ({ type: e.type, date: e.date, daysAway: Math.round((new Date(e.date).getTime() - dayNoon.getTime()) / DAY_MS) }))
      .filter((e) => Math.abs(e.daysAway) <= 10);
    const daySky: CurrentSky = {
      computedAt: dayNoon.toISOString(),
      planets,
      retrogrades: planets.filter((p) => p.isRetrograde).map((p) => p.planet),
      eclipses: dayEclipses,
    };
    const signals = computeGoldenMoment(daySky, { litHouses });
    // Universal signal: favor beating caution by a clear margin (net surplus).
    // These are the "potential golden" days; the individual signal (the check-in,
    // acting as Panchapakshi) confirms them in the router where check-in data lives.
    const net = signals.reduce((a, s) => a + (s.direction === "favor" ? s.weight : -s.weight), 0);
    if (net >= GOLDEN_NET_THRESHOLD) {
      golden.push(`${yearMonth}-${String(d).padStart(2, "0")}`);
    }
  }
  GOLDEN_DAYS_CACHE.set(key, { at: Date.now(), value: golden });
  return golden;
}
