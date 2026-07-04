// Assembles the five-block Narrative input (natal / profection / dasha / transits
// / panchang) for a profile + date. Promoted from server/scripts/narrative-input.ts.
import { getDb } from "../db.js";
import { profiles, profileNatalBodies } from "../../drizzle/schema.js";
import { eq } from "drizzle-orm";
import { calculateProfectionYear } from "../profection/calculator.js";
import { calculateDashaTimeline } from "../dasha-calculator.js";
import { getSiderealLongitudes } from "../vedic/natal-chart-engine.js";
import { calcPanchang } from "../panchang/astronomy.js";
import { interpretPanchang } from "../panchang/interpreter.js";

const ZODIAC = ["Aries","Taurus","Gemini","Cancer","Leo","Virgo","Libra","Scorpio","Sagittarius","Capricorn","Aquarius","Pisces"];
const SIGN_RULERS: Record<string,string> = { Aries:"Mars",Taurus:"Venus",Gemini:"Mercury",Cancer:"Moon",Leo:"Sun",Virgo:"Mercury",Libra:"Venus",Scorpio:"Mars",Sagittarius:"Jupiter",Capricorn:"Saturn",Aquarius:"Saturn",Pisces:"Jupiter" };
const DIGN: Record<string,{ex:string;de:string;own:string[]}> = { Sun:{ex:"Aries",de:"Libra",own:["Leo"]},Moon:{ex:"Taurus",de:"Scorpio",own:["Cancer"]},Mars:{ex:"Capricorn",de:"Cancer",own:["Aries","Scorpio"]},Mercury:{ex:"Virgo",de:"Pisces",own:["Gemini","Virgo"]},Jupiter:{ex:"Cancer",de:"Capricorn",own:["Sagittarius","Pisces"]},Venus:{ex:"Pisces",de:"Virgo",own:["Taurus","Libra"]},Saturn:{ex:"Libra",de:"Aries",own:["Capricorn","Aquarius"]} };

const dignity = (p: string, s: string) => { const d = DIGN[p]; if (!d) return "—"; if (s === d.ex) return "Exalted"; if (s === d.de) return "Debilitated"; if (d.own.includes(s)) return "Own"; return "Neutral"; };
const signFromLon = (l: number) => ZODIAC[Math.floor(l / 30) % 12];
const WATER = ["Cancer", "Scorpio", "Pisces"], FIRE = ["Aries", "Leo", "Sagittarius"];
// Where a placement sits BY DEGREE colors how it expresses. The clean middle of a sign
// gives full, textbook rulership; the thresholds bend it. early/late = sign sandhi
// (nascent vs overripe). gandanta = the karmic water→fire knots — last 3°20' of a water
// sign or first 3°20' of the next fire sign (Cancer→Leo, Scorpio→Sag, Pisces→Aries) —
// the most charged threshold of all. This is deterministic chart-math: the engine reads
// the flag and interprets it; it never computes or invents it.
const degOf = (b: any) => (b && b.degree != null && !isNaN(parseFloat(b.degree)) ? +parseFloat(b.degree).toFixed(1) : null);
const threshold = (sign: string, deg: number | null) => {
  if (deg == null || isNaN(deg)) return null;
  const i = ZODIAC.indexOf(sign);
  if (WATER.includes(sign) && deg >= 26.6667) return `gandanta:${sign}->${ZODIAC[(i + 1) % 12]}`;
  if (FIRE.includes(sign) && deg <= 3.3333) return `gandanta:${ZODIAC[(i + 11) % 12]}->${sign}`;
  if (deg <= 3) return "early";
  if (deg >= 27) return "late";
  return null;
};
const houseFromLagna = (s: string, lag: string) => ((ZODIAC.indexOf(s) - ZODIAC.indexOf(lag) + 12) % 12) + 1;
const rulesHouses = (p: string, lag: string) => ZODIAC.filter((s) => SIGN_RULERS[s] === p).map((s) => houseFromLagna(s, lag));
const utcOffsetFromLon = (lon: number) => Math.round(lon / 15);

const PLANETS = ["Sun","Moon","Mars","Mercury","Jupiter","Venus","Saturn","Rahu","Ketu"];

export type NarrativeInput = Awaited<ReturnType<typeof buildNarrativeInput>>;

// Short-TTL memo: deepRead and currentTransits both build the same input on one
// page load (~50 ephemeris calls + panchang each). For a given (profile, date) the
// result is deterministic, so reuse it briefly instead of recomputing per request.
const INPUT_CACHE = new Map<string, { at: number; value: any }>();
const INPUT_TTL_MS = 5 * 60 * 1000;

export async function buildNarrativeInput(profileId: number, dateStr: string, opts?: { nowMs?: number; lat?: number; lon?: number }) {
  // Moment reads (opts.nowMs, from the "update to the moment" tap) carry the CURRENT
  // hora — a per-moment value — so they bypass the per-(profile,date) memo entirely,
  // keeping the daily input (and its cache) hora-free. lat/lon are the user's CURRENT
  // location (hora is "this hour where you are"), not the birth place.
  if (opts?.nowMs != null) return buildNarrativeInputUncached(profileId, dateStr, opts);
  const key = `${profileId}|${dateStr}`;
  const cached = INPUT_CACHE.get(key);
  if (cached && Date.now() - cached.at < INPUT_TTL_MS) return cached.value;
  const value = await buildNarrativeInputUncached(profileId, dateStr);
  INPUT_CACHE.set(key, { at: Date.now(), value });
  return value;
}

/** Drop memoized inputs for a profile (call after its chart changes). */
export function invalidateNarrativeInput(profileId: number) {
  for (const key of Array.from(INPUT_CACHE.keys())) {
    if (key.startsWith(`${profileId}|`)) INPUT_CACHE.delete(key);
  }
}

async function buildNarrativeInputUncached(profileId: number, dateStr: string, moment?: { nowMs?: number; lat?: number; lon?: number }) {
  const db = await getDb();
  if (!db) throw new Error("database unavailable");
  const prows = await db.select().from(profiles).where(eq(profiles.id, profileId)).limit(1);
  const p = prows[0];
  if (!p) throw new Error(`profile ${profileId} not found`);
  if (!p.lagnaSign || !p.birthDate) throw new Error(`profile ${profileId} has no birth chart`);
  const bodies = await db.select().from(profileNatalBodies).where(eq(profileNatalBodies.profileId, p.id));
  if (!bodies.length) throw new Error(`profile ${profileId} has no natal bodies`);

  const lagna = p.lagnaSign;
  const lat = parseFloat(p.birthLocationLat || "42.36");
  const lon = parseFloat(p.birthLocationLon || "-71.06");
  const byPlanet = Object.fromEntries(bodies.map((b) => [b.planet, b]));
  // Natal conjunctions: planets within 10° of each other (a planet + a node is the
  // loudest — e.g. Moon conjunct Ketu). Surfaced so the read fuses them instead of
  // reading each placement in isolation.
  const lonAll: Record<string, number> = {};
  for (const x of bodies) if (x.longitude != null && x.longitude !== "") { const v = parseFloat(x.longitude); if (!Number.isNaN(v)) lonAll[x.planet] = ((v % 360) + 360) % 360; }
  const conjunctOf = (name: string) => {
    const base = lonAll[name];
    if (base === undefined) return [] as { name: string; orb: number }[];
    const out: { name: string; orb: number }[] = [];
    for (const [k, v] of Object.entries(lonAll)) {
      if (k === name) continue;
      const o = Math.abs(((base - v + 540) % 360) - 180);
      if (o <= 10) out.push({ name: k, orb: +o.toFixed(1) });
    }
    return out.sort((a, b) => a.orb - b.orb);
  };
  const nat = (b: any) => (b ? { sign: b.sign, house: b.house, nakshatra: b.nakshatra, degree: degOf(b), threshold: threshold(b.sign, degOf(b)), dignity: dignity(b.planet, b.sign), retrograde: !!b.isRetrograde, conjunct: conjunctOf(b.planet) } : null);

  const lagnaDeg = p.ascendantDegree != null && !isNaN(parseFloat(p.ascendantDegree)) ? +parseFloat(p.ascendantDegree).toFixed(1) : null;
  const natal = {
    lagna,
    lagnaDegree: lagnaDeg,
    lagnaThreshold: threshold(lagna, lagnaDeg),
    planets: PLANETS.map((n) => {
      const b = byPlanet[n];
      return b ? { name: n, sign: b.sign, house: b.house, nakshatra: b.nakshatra, pada: b.pada, degree: degOf(b), threshold: threshold(b.sign, degOf(b)), dignity: dignity(n, b.sign), retrograde: !!b.isRetrograde, rulesHouses: rulesHouses(n, lagna), conjunct: conjunctOf(n) } : null;
    }).filter(Boolean),
  };

  const pf = calculateProfectionYear(p.birthDate, dateStr, lagna);
  const tlb = byPlanet[pf.timeLord];
  const profection = {
    age: pf.age, activatedHouse: pf.activatedHouse, activatedSign: pf.activatedSign,
    timeLord: pf.timeLord, timeLordNatal: nat(tlb), timeLordRulesHouses: rulesHouses(pf.timeLord, lagna),
    // "The Time Lord comes home" — the year lord natally sits in the very house the
    // year activates, and/or in the activated sign. A strong repetition / return.
    timeLordReturnsHome: tlb ? tlb.house === pf.activatedHouse : false,
    timeLordInActivatedSign: tlb ? tlb.sign === pf.activatedSign : false,
  };

  const moon = byPlanet["Moon"];
  const tl = calculateDashaTimeline(p.birthDate, moon.nakshatra || "", moon.sign, moon.degree, dateStr, moon.longitude);
  const cur = tl.entries.find((e: any) => e.isCurrent);
  const dasha = cur
    ? { mahaDasha: { lord: cur.mahadasha, natal: nat(byPlanet[cur.mahadasha]), rulesHouses: rulesHouses(cur.mahadasha, lagna) }, antarDasha: { lord: cur.antardasha, natal: nat(byPlanet[cur.antardasha]), rulesHouses: rulesHouses(cur.antardasha, lagna) } }
    : null;

  const noon = new Date(dateStr + "T12:00:00Z");
  const soon = new Date(noon.getTime() + 86400000);
  const a = await getSiderealLongitudes(noon, PLANETS);
  const b = await getSiderealLongitudes(soon, PLANETS);
  const natalLon: Record<string, number> = {};
  for (const x of bodies) if (x.longitude) natalLon[x.planet] = parseFloat(x.longitude);
  const transits = PLANETS.map((n) => {
    const lonp = a[n];
    if (lonp === undefined) return null;
    const sign = signFromLon(lonp);
    const retro = n === "Rahu" || n === "Ketu" ? true : b[n] !== undefined && ((((b[n] - lonp + 540) % 360) - 180) < 0);
    let hit: string | null = null, orb = 99;
    for (const [k, v] of Object.entries(natalLon)) { const o = Math.abs(((lonp - v + 540) % 360) - 180); if (o < orb) { orb = o; hit = k; } }
    return { planet: n, sign, houseFromLagna: houseFromLagna(sign, lagna), retrograde: retro, combust: null, hitsNatalPoint: orb <= 4 ? hit : null, orbDeg: orb <= 4 ? +orb.toFixed(1) : null };
  }).filter(Boolean);

  const astro = await calcPanchang(dateStr, lat, lon, utcOffsetFromLon(lon));
  const field = interpretPanchang(astro, lagna);
  // Current hora — ONLY on moment reads (nowMs present). Location-approximated by the
  // profile's birth lat/lon, consistent with the panchang above.
  let hora: { lord: string; tone: string; phase: string; good: string } | null = null;
  if (moment?.nowMs != null) {
    const nowMs = moment.nowMs;
    const hlat = moment.lat ?? lat, hlon = moment.lon ?? lon; // current location, not birth
    const { computeHoras, horaAt, HORA_TONE } = await import("../panchang/hora.js");
    const [hy, hm, hd] = dateStr.split("-").map(Number);
    let hs = computeHoras(hy, hm, hd, hlat, hlon);
    if (nowMs < hs[0].startMs) {
      const pv = new Date(Date.UTC(hy, hm - 1, hd - 1));
      hs = computeHoras(pv.getUTCFullYear(), pv.getUTCMonth() + 1, pv.getUTCDate(), hlat, hlon);
    }
    const cur = horaAt(hs, nowMs);
    if (cur) hora = { lord: cur.lord, tone: cur.tone, phase: cur.phase, good: HORA_TONE[cur.lord].good };
  }

  const panchang = {
    mode: field.finalMode, qualifier: field.qualifier, activatedHouse: field.houseActivated,
    nakshatra: field.nakshatra, tithi: field.tithi,
    karana: field.karana ? { name: field.karana.name, quality: field.karana.quality, vishti: field.karana.name === "Vishti" } : null,
    hora,
    asOf: dateStr,
  };

  // Ordinary human time — how a person actually frames "today" (Monday, weekend),
  // independent of the sidereal sky. Often resonates with the chart's themes.
  const DOW = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const dowIdx = new Date(dateStr + "T12:00:00Z").getUTCDay();
  const dayOfWeek = DOW[dowIdx];
  const isWeekend = dowIdx === 0 || dowIdx === 6;
  const weekFrame =
    dowIdx === 1 ? "Monday — the weekend has just ended; re-entry into the work-week"
    : dowIdx === 2 ? "Tuesday — early in the work-week, finding its rhythm"
    : dowIdx === 3 ? "Wednesday — midweek, the middle of the work-week"
    : dowIdx === 4 ? "Thursday — the back half of the work-week, the weekend coming into view"
    : dowIdx === 5 ? "Friday — the work-week is closing; the weekend is ahead"
    : dowIdx === 6 ? "Saturday — the weekend: rest, home, family, errands"
    : "Sunday — the weekend's close; rest, with the work-week resuming tomorrow";

  // Universal seasonal layer (hemisphere-aware). Culture-specific holidays require a
  // future profile `culture` field; only near-universal markers are inferred here.
  const md = (+dateStr.slice(5, 7)) * 100 + (+dateStr.slice(8, 10));
  const northSeason = md >= 321 && md < 621 ? "spring" : md >= 621 && md < 922 ? "summer" : md >= 922 && md < 1221 ? "autumn" : "winter";
  const flip: Record<string, string> = { spring: "autumn", summer: "winter", autumn: "spring", winter: "summer" };
  const season = lat >= 0 ? northSeason : flip[northSeason];
  const nearTurn = [321, 621, 922, 1221].some((t) => Math.abs(md - t) <= 6) ? "near a seasonal turn (solstice/equinox)" : null;

  const humanTime = { dayOfWeek, isWeekend, weekFrame, season, nearSeasonalTurn: nearTurn };

  // The year lord's CURRENT transit house is the active medium-term chapter (weeks),
  // distinct from the Moon's daily trigger. Surfaced first-class so the engine can
  // name its concrete life-area instead of losing it in the raw transit list.
  const tlt = transits.find((t: any) => t.planet === pf.timeLord) || null;
  const timeLordTransit = tlt
    ? { planet: pf.timeLord, currentSign: tlt.sign, currentHouse: tlt.houseFromLagna, retrograde: tlt.retrograde, hitsNatalPoint: tlt.hitsNatalPoint, orbDeg: tlt.orbDeg }
    : null;

  // Name is intentionally omitted so the model writes in second person ("you").
  // Natal retrograde count (excluding the nodes, which are always retrograde) —
  // a retrograde-heavy chart carries the "old soul" reading (see prompt).
  const natalRetrogradeCount = (natal.planets as any[]).filter(
    (pl) => pl && pl.retrograde && pl.name !== "Rahu" && pl.name !== "Ketu",
  ).length;

  return { subject: { profileId: p.id }, date: dateStr, natal, natalRetrogradeCount, profection, dasha, transits, panchang, humanTime, timeLordTransit };
}
