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
  "Uttara Ashadha", "Shravana", "Dhanishtha", "Shatabhisha", "Purva Bhadrapada",
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

// ── Month sky marks: Mercury's course + eclipse days (calendar labels) ────────
// David (2026-07-11): Mercury rx "really fucks with modern human life" — he follows the
// ENTIRE course, and the ±3 days around each station are the worst. Deterministic scan:
// retro span, exact station dates, station windows, eclipse days for a visible month.
const MONTH_MARKS_CACHE = new Map<string, { at: number; value: MonthSkyMarks }>();
const MONTH_MARKS_TTL_MS = 12 * 60 * 60 * 1000;

export type RetroPlanet = "Mercury" | "Venus" | "Mars" | "Jupiter" | "Saturn";

export interface PlanetRetroMarks {
  planet: RetroPlanet;
  retroDays: string[];                                  // every date the planet is retrograde
  stations: { date: string; type: "turns retrograde" | "turns direct" }[];
  windowDays: string[];                                 // ±3 days around each station (the roughest stretch)
  // Degree-exact shadow (retroshade) zones — the planet re-treading the exact degrees it
  // will retrograde over. Pre-shadow: direct, from crossing the future DIRECT-station degree
  // up to the retrograde station. Post-shadow: direct, from the direct station up to
  // re-crossing the RETROGRADE-station degree. Both lie OUTSIDE the retro span.
  // FAST planets (Mercury/Venus/Mars) expose the full spans; SLOW planets (Jupiter/Saturn)
  // leave these empty and mark only the boundary days below (their shadows run months long).
  preShadowDays: string[];
  postShadowDays: string[];
  shadowEnterDays: string[];                            // the single day each shadow OPENS (all planets)
  shadowExitDays: string[];                             // the single day each shadow CLOSES (all planets)
}

// Retrograde-capable planets, by speed class. FAST = full shadow spans; SLOW = enter/leave
// signals only (a 4-month Jupiter/Saturn shadow painted whole would swamp the calendar).
const RETRO_PLANETS: { planet: RetroPlanet; cls: "fast" | "slow" }[] = [
  { planet: "Mercury", cls: "fast" },
  { planet: "Venus", cls: "fast" },
  { planet: "Mars", cls: "fast" },
  { planet: "Jupiter", cls: "slow" },
  { planet: "Saturn", cls: "slow" },
];

export interface MonthSkyMarks {
  retro: PlanetRetroMarks[];                             // one entry per planet with any event this month
  eclipses: { date: string; type: "solar" | "lunar" }[];
}

export async function monthSkyMarks(yearMonth: string): Promise<MonthSkyMarks> {
  const hit = MONTH_MARKS_CACHE.get(yearMonth);
  if (hit && Date.now() - hit.at < MONTH_MARKS_TTL_MS) return hit.value;

  const [y, m] = yearMonth.split("-").map(Number);
  const first = Date.UTC(y, m - 1, 1, 12, 0, 0);
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const iso = (ms: number) => new Date(ms).toISOString().slice(0, 10);

  // Daily speed + longitude for every retrograde planet, one ephemeris call per day.
  // Padded ±245 days: a slow planet's shadow-exit day can sit ~200 days after its
  // retrograde station (retro span ~140d + post-shadow ~60d), and a shadow zone is
  // defined by BOTH of its cycle's stations, so the pad must reach far enough from
  // either month edge to detect those stations and their turning longitudes.
  const RETRO_PAD = 245;
  const planetNames = RETRO_PLANETS.map((p) => p.planet);
  const samples: { ms: number; pos: Record<string, { speed: number; lon: number }> }[] = [];
  for (let off = -RETRO_PAD; off < daysInMonth + RETRO_PAD; off++) {
    const d = new Date(first + off * DAY_MS);
    const pos = await getSiderealLongitudesWithSpeed(d, planetNames);
    const rec: Record<string, { speed: number; lon: number }> = {};
    for (const n of planetNames) rec[n] = { speed: pos[n]?.speed ?? 0, lon: pos[n]?.longitude ?? 0 };
    samples.push({ ms: d.getTime(), pos: rec });
  }

  // Signed angular delta, normalized to (-180, 180].
  const angDiff = (a: number, b: number) => ((a - b + 540) % 360) - 180;
  const inMonth = (ms: number) => iso(ms).startsWith(yearMonth);

  const retro: PlanetRetroMarks[] = [];
  for (const { planet, cls } of RETRO_PLANETS) {
    const speeds = samples.map((s) => ({ ms: s.ms, speed: s.pos[planet].speed, lon: s.pos[planet].lon }));

    const retroDays: string[] = [];
    for (const s of speeds) if (s.speed < 0 && inMonth(s.ms)) retroDays.push(iso(s.ms));

    // Stations with their exact turning longitude — the longitude defines the shadow zone.
    const stationsFull: { ms: number; lon: number; type: "turns retrograde" | "turns direct" }[] = [];
    for (let i = 1; i < speeds.length; i++) {
      const a = speeds[i - 1], b = speeds[i];
      if (a.speed !== 0 && b.speed !== 0 && Math.sign(a.speed) !== Math.sign(b.speed)) {
        const exact = await bisectStation(planet, new Date(a.ms), new Date(b.ms));
        const lonPos = await getSiderealLongitudesWithSpeed(exact, [planet]);
        stationsFull.push({ ms: exact.getTime(), lon: lonPos[planet]?.longitude ?? 0, type: b.speed < 0 ? "turns retrograde" : "turns direct" });
      }
    }
    const stations = stationsFull.filter((s) => inMonth(s.ms)).map((s) => ({ date: iso(s.ms), type: s.type }));

    const windowSet = new Set<string>();
    for (const st of stationsFull) {
      for (let off = -3; off <= 3; off++) {
        const d = iso(st.ms + off * DAY_MS);
        if (d.startsWith(yearMonth)) windowSet.add(d);
      }
    }

    // Degree-exact shadow, per retrograde cycle (retro station → next direct station).
    const preShadowSet = new Set<string>(), postShadowSet = new Set<string>();
    const shadowEnterSet = new Set<string>(), shadowExitSet = new Set<string>();
    const cap = cls === "slow" ? 220 : 50;      // anti-bleed guard; slow cycles sit ~1yr apart
    const sorted = stationsFull.slice().sort((a, b) => a.ms - b.ms);
    for (let i = 0; i < sorted.length; i++) {
      const stR = sorted[i];
      if (stR.type !== "turns retrograde") continue;
      const stD = sorted.slice(i + 1).find((s) => s.type === "turns direct");
      if (!stD) continue;
      const lonDirect = stD.lon;                // pre-shadow OPENS when the direct planet reaches this degree
      const width = angDiff(stR.lon, lonDirect); // retro-station degree sits ~+width ahead of it
      if (width <= 0) continue;                 // guard: unexpected geometry
      const preMs: number[] = [], postMs: number[] = [];
      for (const s of speeds) {
        if (s.speed <= 0) continue;             // shadows are DIRECT motion only
        const o = angDiff(s.lon, lonDirect);
        if (o < -0.05 || o > width + 0.05) continue; // outside the [direct°, retro°] zone
        if (s.ms < stR.ms && s.ms >= stR.ms - cap * DAY_MS) preMs.push(s.ms);
        else if (s.ms > stD.ms && s.ms <= stD.ms + cap * DAY_MS) postMs.push(s.ms);
      }
      // Boundary blips (all planets): the true first pre-day and last post-day of the cycle.
      if (preMs.length) { const enter = Math.min(...preMs); if (inMonth(enter)) shadowEnterSet.add(iso(enter)); }
      if (postMs.length) { const exit = Math.max(...postMs); if (inMonth(exit)) shadowExitSet.add(iso(exit)); }
      // Full spans (fast planets only).
      if (cls === "fast") {
        for (const ms of preMs) if (inMonth(ms)) preShadowSet.add(iso(ms));
        for (const ms of postMs) if (inMonth(ms)) postShadowSet.add(iso(ms));
      }
    }

    if (retroDays.length || stations.length || windowSet.size || preShadowSet.size || postShadowSet.size || shadowEnterSet.size || shadowExitSet.size) {
      retro.push({
        planet,
        retroDays,
        stations,
        windowDays: Array.from(windowSet).sort(),
        preShadowDays: Array.from(preShadowSet).sort(),
        postShadowDays: Array.from(postShadowSet).sort(),
        shadowEnterDays: Array.from(shadowEnterSet).sort(),
        shadowExitDays: Array.from(shadowExitSet).sort(),
      });
    }
  }

  // Eclipse days: scan the month's syzygies (elongation crossing 0/180) and check
  // node proximity — same geometry as findEclipses, swept across the whole month.
  const eclipses: { date: string; type: "solar" | "lunar" }[] = [];
  let prevElong: number | null = null;
  for (let off = 0; off < daysInMonth; off++) {
    const d = new Date(first + off * DAY_MS);
    const pos = await getSiderealLongitudesWithSpeed(d, ["Sun", "Moon", "Rahu"]);
    const sun = ((pos.Sun?.longitude ?? 0) % 360 + 360) % 360;
    const moon = ((pos.Moon?.longitude ?? 0) % 360 + 360) % 360;
    const rahu = ((pos.Rahu?.longitude ?? 0) % 360 + 360) % 360;
    const elong = ((moon - sun) % 360 + 360) % 360;
    if (prevElong != null) {
      const crossedNew = prevElong > 300 && elong < 60;
      const crossedFull = prevElong < 180 && elong >= 180;
      if (crossedNew || crossedFull) {
        const nodeDist = Math.min(Math.abs(diffTo(sun, rahu)), Math.abs(diffTo(sun, (rahu + 180) % 360)));
        const limit = crossedNew ? 18.5 : 12.2;
        if (nodeDist <= limit) eclipses.push({ date: iso(d.getTime()), type: crossedNew ? "solar" : "lunar" });
      }
    }
    prevElong = elong;
  }

  const value: MonthSkyMarks = { retro, eclipses };
  MONTH_MARKS_CACHE.set(yearMonth, { at: Date.now(), value });
  return value;
}

// ── Golden days across a month ───────────────────────────────────────────────
// The UNIVERSAL side of a golden moment = panchang day-quality (auspicious tithi +
// nakshatra + yoga), which is COLLECTIVE (same for everyone) and derivable from the
// sidereal Sun & Moon alone. These are the "potential golden" days; the individual
// side (the check-in, acting as Panchapakshi) confirms them per person in the router.
const GOLDEN_DAYS_CACHE = new Map<string, { at: number; value: string[] }>();
const GOLDEN_DAYS_TTL_MS = 12 * 60 * 60 * 1000;

export async function computeGoldenDays(yearMonth: string): Promise<string[]> {
  const cached = GOLDEN_DAYS_CACHE.get(yearMonth);
  if (cached && Date.now() - cached.at < GOLDEN_DAYS_TTL_MS) return cached.value;

  const { dayQuality } = await import("../panchang/auspiciousness.js");
  const [y, m] = yearMonth.split("-").map(Number);
  if (!y || !m) return [];
  const daysInMonth = new Date(y, m, 0).getDate();

  const golden: string[] = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const dayNoon = new Date(Date.UTC(y, m - 1, d, 12));
    const pos = await getSiderealLongitudesWithSpeed(dayNoon, ["Sun", "Moon"]);
    const q = dayQuality(pos.Sun?.longitude ?? 0, pos.Moon?.longitude ?? 0);
    if (q.auspicious) golden.push(`${yearMonth}-${String(d).padStart(2, "0")}`);
  }
  GOLDEN_DAYS_CACHE.set(yearMonth, { at: Date.now(), value: golden });
  return golden;
}
