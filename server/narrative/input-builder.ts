// Assembles the five-block Narrative input (natal / profection / dasha / transits
// / panchang) for a profile + date. Promoted from server/scripts/narrative-input.ts.
import { getDb } from "../db.js";
import { profiles, profileNatalBodies, users } from "../../drizzle/schema.js";
import { dayFrameReading, type DayFrameReading } from "../vedic/day-frame.js";
import { readingProse } from "./daily-surface.js";
import { eq } from "drizzle-orm";
import { calculateProfectionYear } from "../profection/calculator.js";
import { calculateDashaTimeline, currentPratyantardasha, pratyantardashaList } from "../dasha-calculator.js";
import { getSiderealLongitudes } from "../vedic/natal-chart-engine.js";
import { computeDashaJourney } from "../sky/arc.js";
import { calcPanchang } from "../panchang/astronomy.js";
import { interpretPanchang } from "../panchang/interpreter.js";
import { getDayField, gateDayField } from "../panchang/service.js";
import { combustion, nodalAffliction, eclipseNear, eclipseSeason } from "../panchang/affliction.js";
import { strength, dignityLabel, signLordOf } from "../panchang/dignity.js";
import { crownDay } from "../panchang/crown.js";
import { resolveDaySky, DEFAULT_SKY } from "../panchang/resolve-day-sky.js";
import { natalDignities } from "../vedic/dignity.js";
import { buildLifeAreaLens, type LifeAreaKey } from "../vedic/life-areas.js";
import { buildKnots, type NatalPlanet } from "../vedic/knots.js";
import { findEclipses, nextEclipseSeason, eclipseChartContext, HOUSE_KEYWORDS } from "../sky/eclipses.js";
import { mercuryRxState, mercuryRxCycle , planetRxCycle } from "../sky/retrograde-phase.js";
import { monthEvents } from "../sky/month-events.js";

const ZODIAC = ["Aries","Taurus","Gemini","Cancer","Leo","Virgo","Libra","Scorpio","Sagittarius","Capricorn","Aquarius","Pisces"];
const NAK27 = ["Ashwini","Bharani","Krittika","Rohini","Mrigashira","Ardra","Punarvasu","Pushya","Ashlesha","Magha","Purva Phalguni","Uttara Phalguni","Hasta","Chitra","Swati","Vishakha","Anuradha","Jyeshtha","Mula","Purva Ashadha","Uttara Ashadha","Shravana","Dhanishtha","Shatabhisha","Purva Bhadrapada","Uttara Bhadrapada","Revati"];
const SIGN_RULERS: Record<string,string> = { Aries:"Mars",Taurus:"Venus",Gemini:"Mercury",Cancer:"Moon",Leo:"Sun",Virgo:"Mercury",Libra:"Venus",Scorpio:"Mars",Sagittarius:"Jupiter",Capricorn:"Saturn",Aquarius:"Saturn",Pisces:"Jupiter" };
const DIGN: Record<string,{ex:string;de:string;own:string[]}> = { Sun:{ex:"Aries",de:"Libra",own:["Leo"]},Moon:{ex:"Taurus",de:"Scorpio",own:["Cancer"]},Mars:{ex:"Capricorn",de:"Cancer",own:["Aries","Scorpio"]},Mercury:{ex:"Virgo",de:"Pisces",own:["Gemini","Virgo"]},Jupiter:{ex:"Cancer",de:"Capricorn",own:["Sagittarius","Pisces"]},Venus:{ex:"Pisces",de:"Virgo",own:["Taurus","Libra"]},Saturn:{ex:"Libra",de:"Aries",own:["Capricorn","Aquarius"]} };

// Single source of truth: the full classical tier ladder (adds Moolatrikona/Friend/Enemy
// to the old Exalted/Debilitated/Own/Neutral). degInSign sharpens moolatrikona.
const dignity = (p: string, s: string, degInSign?: number) => dignityLabel(p, s, degInSign);
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

const PLANETS = ["Sun","Moon","Mars","Mercury","Jupiter","Venus","Saturn","Rahu","Ketu"];

export type NarrativeInput = Awaited<ReturnType<typeof buildNarrativeInput>>;

// Short-TTL memo: deepRead and currentTransits both build the same input on one
// page load (~50 ephemeris calls + panchang each). For a given (profile, date) the
// result is deterministic, so reuse it briefly instead of recomputing per request.
const INPUT_CACHE = new Map<string, { at: number; value: any }>();
const INPUT_TTL_MS = 5 * 60 * 1000;

// `dayLoc` is REQUIRED (resolve-day-sky): the optional-with-fallback era meant every caller
// that forgot it silently produced a Boston-sky reading — the audits' whole divergence class.
export async function buildNarrativeInput(profileId: number, dateStr: string, opts: { nowMs?: number; lat?: number; lon?: number; slowOnly?: boolean; dayLoc: { lat: number; lon: number; utcOffset: number }; lifeArea?: LifeAreaKey; areaFocus?: { key: string; label: string; houses: number[]; karaka: string; blurb: string }; eclipseArc?: boolean; mercuryRxArc?: boolean; rxArcPlanet?: "venus" | "mars" | "jupiter" | "saturn"; monthArc?: boolean }) {
  // Moment reads (opts.nowMs, from the "update to the moment" tap) carry the CURRENT
  // hora — a per-moment value — so they bypass the per-(profile,date) memo entirely,
  // keeping the daily input (and its cache) hora-free. lat/lon are the user's CURRENT
  // location (hora is "this hour where you are"), not the birth place.
  if (opts.nowMs != null) return buildNarrativeInputUncached(profileId, dateStr, opts);
  // slowOnly = the STAGE input (yearly chapter, no fast/daily layers). Memoized under a
  // separate key so the stage and full inputs never overwrite each other.
  const slow = !!opts.slowOnly;
  const dl = opts.dayLoc;
  // dayLoc is part of the memo key: the day-mode depends on the viewer's location, so two
  // locations must not share a memoized input (mirrors the hero's location-aware panchang).
  const locKey = `${dl.lat},${dl.lon},${dl.utcOffset}`;
  // lifeArea is part of the key: a Career lens and a Money lens are different inputs, so two
  // life areas must never share a memoized input (they'd produce the same reading otherwise).
  const areaKey = `${opts.lifeArea ?? "none"}${opts.areaFocus ? ":" + opts.areaFocus.key : ""}`;
  const eclKey = opts.eclipseArc ? "ecl" : "no";
  const merKey = opts.rxArcPlanet ? `rx-${opts.rxArcPlanet}` : opts.mercuryRxArc ? "mrx" : "no";
  const monKey = opts.monthArc ? "mon" : "no";
  const key = `${profileId}|${dateStr}|${slow ? "stage" : "full"}|${locKey}|${areaKey}|${eclKey}|${merKey}|${monKey}`;
  const cached = INPUT_CACHE.get(key);
  if (cached && Date.now() - cached.at < INPUT_TTL_MS) return cached.value;
  const value = await buildNarrativeInputUncached(profileId, dateStr, { slowOnly: slow, dayLoc: dl, lifeArea: opts.lifeArea, areaFocus: opts.areaFocus, eclipseArc: opts.eclipseArc, mercuryRxArc: opts.mercuryRxArc, rxArcPlanet: opts.rxArcPlanet, monthArc: opts.monthArc });
  INPUT_CACHE.set(key, { at: Date.now(), value });
  // Evict expired entries (audit L21): they were TTL-checked on read but never deleted, so the
  // memo grew unbounded between deploys (~50-100KB per (profile,date,variant)). Cheap amortized
  // sweep, only when the map gets large.
  if (INPUT_CACHE.size > 200) {
    const cutoff = Date.now() - INPUT_TTL_MS;
    INPUT_CACHE.forEach((v, k) => { if (v.at < cutoff) INPUT_CACHE.delete(k); });
  }
  return value;
}

/** Drop memoized inputs for a profile (call after its chart changes). */
export function invalidateNarrativeInput(profileId: number) {
  for (const key of Array.from(INPUT_CACHE.keys())) {
    if (key.startsWith(`${profileId}|`)) INPUT_CACHE.delete(key);
  }
}

async function buildNarrativeInputUncached(profileId: number, dateStr: string, moment: { nowMs?: number; lat?: number; lon?: number; slowOnly?: boolean; dayLoc: { lat: number; lon: number; utcOffset: number }; lifeArea?: LifeAreaKey; areaFocus?: { key: string; label: string; houses: number[]; karaka: string; blurb: string }; eclipseArc?: boolean; mercuryRxArc?: boolean; rxArcPlanet?: "venus" | "mars" | "jupiter" | "saturn"; monthArc?: boolean }) {
  const db = await getDb();
  if (!db) throw new Error("database unavailable");
  const prows = await db.select().from(profiles).where(eq(profiles.id, profileId)).limit(1);
  const p = prows[0];
  if (!p) throw new Error(`profile ${profileId} not found`);
  if (!p.lagnaSign || !p.birthDate) throw new Error(`profile ${profileId} has no birth chart`);
  // DAY-FRAME voice reading is GATED to admins during rollout — only an admin owner's read carries
  // input.reading; every other user's input is byte-for-byte unchanged (the prompt's reading block
  // is inert when input.reading is absent). Reversible: flip the gate, no schema/prompt churn.
  const owner = await db.select({ role: users.role }).from(users).where(eq(users.id, p.userId)).limit(1);
  const ownerIsAdmin = owner[0]?.role === "admin";
  let bodies = await db.select().from(profileNatalBodies).where(eq(profileNatalBodies.profileId, p.id));
  // Self-heal also when the MOON is missing, not only when the set is fully empty (audit M3):
  // a PARTIAL bodies set (interrupted recompute / failed migration) passed the length check,
  // then `moon.nakshatra` below threw TypeError → every surface returned available:false with
  // no signal. A missing Moon is as unusable as an empty chart, so it triggers the same repair.
  const hasMoon = (bs: typeof bodies) => bs.some((b) => b.planet === "Moon");
  if ((!bodies.length || !hasMoon(bodies)) && p.birthDate) {
    // SELF-HEAL: a profile with birth data but no per-planet natal bodies (e.g. a friend login
    // created before createProfileUser computed the full chart). Recompute once from the stored
    // birth data, then re-fetch — so a blank chart repairs itself on first read, no admin step.
    // recomputeProfileChart writes the bodies BEFORE it warms any read, so this can't recurse.
    try {
      const { recomputeProfileChart } = await import("../routers/profiles.js");
      await recomputeProfileChart(p.userId, p.id, {
        birthDate: p.birthDate,
        birthTime: p.birthTime,
        birthTimeApprox: (p as any).lagnaBasis === "ascendant_approx",
        birthLocationCity: p.birthLocationCity ?? "",
        birthLocationLat: p.birthLocationLat,
        birthLocationLon: p.birthLocationLon,
        birthTimezone: p.birthTimezone,
      });
      bodies = await db.select().from(profileNatalBodies).where(eq(profileNatalBodies.profileId, p.id));
    } catch (healErr) {
      console.warn(`[narrative] self-heal recompute failed for profile ${p.id}:`, healErr);
    }
  }
  if (!bodies.length) throw new Error(`profile ${profileId} has no natal bodies`);
  // Clean, explicit error instead of a raw TypeError deep in the builder (audit M3).
  if (!hasMoon(bodies)) throw new Error(`profile ${profileId} natal bodies missing the Moon (partial chart)`);

  const lagna = p.lagnaSign;
  // Birth place for the NATAL layer only (the chart's own, fixed sky). A profile with no birth
  // location falls to the app default — resolve-day-sky owns those coordinates.
  const lat = p.birthLocationLat ? parseFloat(p.birthLocationLat) : DEFAULT_SKY.lat;
  const lon = p.birthLocationLon ? parseFloat(p.birthLocationLon) : DEFAULT_SKY.lon;
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
  // Neecha-bhanga-aware dignity for the whole natal chart, computed ONCE. A debilitated
  // planet whose fall is CANCELLED is not weak — it's hard-won strength (the fall-then-rise,
  // a raja-yoga signature). Dignity and cancellation must travel together (raw debilitation
  // is a trap). The flat dignityLabel can't know this — cancellation needs the whole chart.
  const lagnaLonForDig = ZODIAC.indexOf(lagna) * 30 + (p.ascendantDegree != null && !isNaN(parseFloat(p.ascendantDegree)) ? parseFloat(p.ascendantDegree) : 0);
  let natDig: Record<string, any> = {};
  try { natDig = natalDignities(lonAll as any, lagnaLonForDig); } catch { natDig = {}; }
  const cancelledOf = (planet: string) => !!natDig[planet]?.neechaBhanga?.cancelled;
  const hardWonOf = (planet: string) => !!natDig[planet]?.debilitated && cancelledOf(planet);
  const nat = (b: any) => (b ? { sign: b.sign, house: b.house, nakshatra: b.nakshatra, degree: degOf(b), threshold: threshold(b.sign, degOf(b)), dignity: dignity(b.planet, b.sign, degOf(b) ?? undefined), cancelledDebilitation: cancelledOf(b.planet), hardWon: hardWonOf(b.planet), retrograde: !!b.isRetrograde, conjunct: conjunctOf(b.planet) } : null);

  const lagnaDeg = p.ascendantDegree != null && !isNaN(parseFloat(p.ascendantDegree)) ? +parseFloat(p.ascendantDegree).toFixed(1) : null;
  const natal = {
    lagna,
    // TRUE when the person gave no birth time: the lagna is the Moon's sign (Chandra lagna), not
    // the physical rising sign — the prompt must not read body/appearance from the 1st (see prompt).
    moonFramed: p.lagnaBasis === "chandra",
    lagnaDegree: lagnaDeg,
    lagnaThreshold: threshold(lagna, lagnaDeg),
    planets: PLANETS.map((n) => {
      const b = byPlanet[n];
      return b ? { name: n, sign: b.sign, house: b.house, nakshatra: b.nakshatra, pada: b.pada, degree: degOf(b), threshold: threshold(b.sign, degOf(b)), dignity: dignity(n, b.sign, degOf(b) ?? undefined), cancelledDebilitation: cancelledOf(n), hardWon: hardWonOf(n), retrograde: !!b.isRetrograde, rulesHouses: rulesHouses(n, lagna), conjunct: conjunctOf(n) } : null;
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
    // THE MOON IS COUNTED TWICE guard: when the year lord IS the Moon, the Moon is ALSO the
    // daily trigger (panchang.activatedHouse). The transiting-Moon "chapter" below would then
    // collapse onto the day itself — the fastest body posing as the slow season. Flagged so the
    // prompt keeps the Moon as trigger only and takes the slow chapter from the natal Moon's
    // standing need + the daśā lords (David: "it's counted twice because it moves the most").
    timeLordIsMoon: pf.timeLord === "Moon",
  };

  const moon = byPlanet["Moon"];
  const tl = calculateDashaTimeline(p.birthDate, moon.nakshatra || "", moon.sign, moon.degree, dateStr, moon.longitude);
  let cur: any = tl.entries.find((e: any) => e.isCurrent);
  // AUTHORITATIVE current lords from the STORED dasha tree (data-path audit #1): the daily
  // calculateDashaTimeline anchors the maha at MIDNIGHT-UTC of the birth DATE, while the stored
  // tree (dasha-tree.ts) anchors at the TRUE birth instant (utcBirthIso). On a sub-period
  // boundary day the two name different running lords — so the Today read could contradict the
  // Chapter reader / tense anchor / convergence, which all read the tree. The tree is the single
  // source of truth: overwrite cur's lords + antar span here so EVERY downstream use of `cur`
  // (dasha layer, pratyantar, the natal-condition lens, the cast roles) reads the truth. Legacy
  // profiles without a stored tree fall back to the daily calc.
  try {
    const { getDashaChainAt } = await import("../vedic/research-store.js");
    const chain: any[] = await getDashaChainAt(profileId, new Date(dateStr + "T12:00:00Z"));
    const cm = chain.find((r) => r.level === 1);
    const ca = chain.find((r) => r.level === 2);
    if (cm && ca) {
      const iso = (d: any) => (d instanceof Date ? d : new Date(d)).toISOString().slice(0, 10);
      cur = { ...(cur ?? {}), mahadasha: cm.maha, antardasha: ca.antar, startDate: iso(ca.startAt), endDate: iso(ca.endAt), isCurrent: true };
    }
  } catch { /* no stored tree (legacy profile) — keep the daily-calc cur */ }
  // Slow daśā layers (the chapter): mahā (years) + antar (months). pratyantar (days–weeks)
  // is a FAST layer, added below only for the deepened read.
  const dashaBase = cur
    ? {
        mahaDasha: { lord: cur.mahadasha, natal: nat(byPlanet[cur.mahadasha]), rulesHouses: rulesHouses(cur.mahadasha, lagna) },
        antarDasha: { lord: cur.antardasha, natal: nat(byPlanet[cur.antardasha]), rulesHouses: rulesHouses(cur.antardasha, lagna) },
      }
    : null;

  // The dasha JOURNEY — the road behind (mahādaśās lived) → current mahā+antar → next antar.
  // A slow layer (turns on dasha timescales), so it rides the stable read too. Trimmed to
  // lord/age/house/rules (no dates) — the prompt weaves continuity, never a timeline.
  const natalHouseByPlanet = Object.fromEntries(
    bodies.filter((b) => b.house != null).map((b) => [b.planet, b.house as number]),
  ) as Record<string, number>;
  const journey = computeDashaJourney(
    { birthDate: p.birthDate, moonNakshatra: moon.nakshatra || "", moonSign: moon.sign, moonDegree: String(moon.degree ?? "0"), moonLongitude: moon.longitude != null ? String(moon.longitude) : null, lagnaSign: lagna, natalHouseByPlanet },
    dateStr,
  );
  const trimP = (x: any) => (x ? { lord: x.lord, ageStart: x.ageStart, ageEnd: x.ageEnd, sits: x.natalHouse, rules: x.rulesHouses } : null);
  // computeDashaJourney still runs the midnight-UTC calc, so its current lords must be
  // realigned to the tree-authoritative `cur` (data-path audit #1) — otherwise, on a boundary
  // day, arc.journey.currentAntar and dasha.antarDasha would name DIFFERENT current lords
  // inside one input (a self-contradiction). Ages come from the calc journey (approximate, no
  // date shown); house/rules recompute for the authoritative lord. pastMahas/nextAntar (the
  // same sequence in both engines) keep the calc's structure.
  const curJourney = (jx: any, lord: string | undefined) => (lord
    ? { lord, ageStart: jx?.ageStart ?? null, ageEnd: jx?.ageEnd ?? null, sits: natalHouseByPlanet[lord] ?? null, rules: rulesHouses(lord, lagna) }
    : trimP(jx));
  const arc = {
    journey: {
      pastMahas: journey.pastMahas.map(trimP),
      currentMaha: curJourney(journey.currentMaha, cur?.mahadasha),
      currentAntar: curJourney(journey.currentAntar, cur?.antardasha),
      nextAntar: trimP(journey.nextAntar),
    },
  };

  const natalRetrogradeCount = (natal.planets as any[]).filter(
    (pl) => pl && pl.retrograde && pl.name !== "Rahu" && pl.name !== "Ketu",
  ).length;

  // STAGE read (slow-only): the stable yearly chapter — profection + mahā/antar daśā +
  // natal. Excludes every fast/daily layer (date, pratyantar, transits, panchang, eclipse,
  // hora, humanTime, timeLordTransit) so the cache hash — and thus the prose — only turns
  // when the chapter turns. The deepened ("stage + guests") read passes the full input.
  const praty = cur ? currentPratyantardasha(cur.antardasha, cur.startDate, cur.endDate, dateStr) : null;
  const dasha = cur
    ? { ...dashaBase, pratyantarDasha: praty ? { lord: praty.lord, natal: nat(byPlanet[praty.lord]), rulesHouses: rulesHouses(praty.lord, lagna) } : null }
    : null;

  // ── THE LORDS' TRUE CONDITION — the stored both-volumes research, FILTERED to the day ──
  // David (2026-07-15): "Do it. Repoint." The reading now knows each running period-lord's
  // RESEARCHED natal condition (research-v2: Shadbala strength, Vimshopak expression,
  // avashtas, cusp-true house, standing yogas, Gulika) instead of only its seat. Lens law:
  // only the day's lords + the chart anchors travel — never the whole research object
  // (a dump would recreate the founding wound). Best-effort: a failure here never blocks
  // the read; the prose simply falls back to the pre-repoint inputs.
  let natalCondition: any = null;
  // Hoisted so the life-area lens can read the SAME stored-research conditions the
  // House Reader speaks from (audit 2026-07-16: the paid lens read flat dignity while
  // the free reader read Shadbala/avashtas/neecha-bhanga — shallower AND contradictable).
  let condOfStored: ((g: string) => any) | null = null;
  try {
    const { getStoredResearch, storeNatalResearch, storeDashaTree, storeConvergence } = await import("../vedic/research-store.js");
    let research = await getStoredResearch(p.id);
    if (!research && p.birthDate && p.birthLocationLat && p.birthLocationLon) {
      // One-time backfill for profiles that predate the store: compute a fresh chart (full
      // speeds/declinations/MC — the store's honest inputs) and store all three layers,
      // WITHOUT recomputeProfileChart's cache-cascade side-effects. Runs once, then never.
      const { calculateBirthChart } = await import("../birthchart/calculator.js");
      const basis = ((p as any).lagnaBasis === "chandra" ? "chandra"
        : (p as any).lagnaBasis === "ascendant_approx" ? "ascendant_approx" : "ascendant") as "chandra" | "ascendant_approx" | "ascendant";
      const chart: any = await calculateBirthChart(
        p.birthDate, p.birthTime || "12:00",
        parseFloat(p.birthLocationLat), parseFloat(p.birthLocationLon), p.birthTimezone || "UTC",
        { lagnaBasis: basis === "chandra" ? "chandra" : "ascendant" },
      );
      const bodiesIn: Record<string, { longitude: number; longitudeSpeed?: number; declination?: number }> = {};
      for (const [nm, d] of Object.entries({ Sun: chart.sun, Moon: chart.moon, Mars: chart.mars, Mercury: chart.mercury, Jupiter: chart.jupiter, Venus: chart.venus, Saturn: chart.saturn, Rahu: chart.rahu, Ketu: chart.ketu })) {
        bodiesIn[nm] = { longitude: (d as any).longitude, longitudeSpeed: (d as any).longitudeSpeed, declination: (d as any).declination };
      }
      const storeInput = {
        profileId: p.id, bodies: bodiesIn, lagnaLon: chart.lagna.longitude,
        mcLon: basis !== "chandra" && chart.mc?.longitude != null ? chart.mc.longitude : null,
        utcBirthIso: chart.utcBirthIso,
        latitude: parseFloat(p.birthLocationLat), longitude: parseFloat(p.birthLocationLon), basis,
      };
      const status = await storeNatalResearch(storeInput);
      await storeDashaTree(storeInput, status);
      await storeConvergence(storeInput, status);
      research = await getStoredResearch(p.id);
    }
    if (research) {
      const chainLords = Array.from(new Set([cur?.mahadasha, cur?.antardasha, praty?.lord].filter(Boolean))) as string[];
      const LAJJ_EN: Record<string, string> = {
        mudita: "delighted", kshudita: "starved", kshobhita: "agitated",
        trishita: "left thirsty", lajjita: "shamed", garvita: "proud",
      };
      const condOf = (g: string) => {
        const pr = (research!.planets as any)[g];
        if (!pr) return { planet: g, note: "a node — carries the axis it sits on", house: byPlanet[g]?.house ?? null };
        const ratio = pr.shadbala?.ratio;
        const strength = ratio == null ? "unmeasured"
          : ratio >= 1.15 ? "strong — can deliver what it promises"
          : ratio <= 0.85 ? "thin — delivers with struggle" : "steady";
        const vim = pr.vimshopak?.points?.shodasha ?? null;
        const expression = vim == null ? null
          : vim >= 12.5 ? "shows its better face" : vim <= 7.5 ? "tends to show its harder face" : "mixed expression";
        const states: string[] = [];
        if (pr.avashtas?.jagradaadi === "jagrat") states.push("awake (full capacity)");
        else if (pr.avashtas?.jagradaadi === "svapna") states.push("sleepy (half capacity)");
        else if (pr.avashtas?.jagradaadi === "sushupti") states.push("asleep (needs its friends to act)");
        for (const h of pr.avashtas?.lajjitaadi ?? []) {
          states.push(`${LAJJ_EN[h.state] ?? h.state}${h.by?.length ? ` by ${h.by.join(" and ")}` : ""}`);
        }
        if (pr.deepthaadi?.includes("vikala")) states.push("combust — burnt close to the Sun, agency reduced");
        if (pr.deepthaadi?.includes("nipeedita")) states.push("in a planetary war");
        const trueHouse = research!.bhavaChalit?.placements?.[g];
        return {
          planet: g,
          seat: `${pr.sign}, house ${pr.house}${pr.retrograde ? ", retrograde" : ""}`,
          dignity: `${pr.dignity?.state}${pr.dignity?.neechaBhanga?.cancelled ? " (fall CANCELLED — hard-won strength, not weakness)" : ""}`,
          strength,
          ...(expression ? { expression } : {}),
          states,
          ...(trueHouse?.shifted ? { trueHouse: `the cusp-true chart moves it into house ${trueHouse.bhava} — read it THERE` } : {}),
        };
      };
      condOfStored = condOf;
      const standingYogas = (research.yogas ?? [])
        .filter((y: any) => y.frames.length >= 2 || y.inNavamsha).slice(0, 4)
        .map((y: any) => ({ name: y.name, note: y.inNavamsha ? "held strongly — repeats in the marriage/dharma chart" : `holds from ${y.frames.length} vantages` }));
      natalCondition = {
        _how: "the engine's stored research of this chart (both volumes) — trust it over inference; translate it, never surface a term",
        lords: (moment?.slowOnly
          ? Array.from(new Set([cur?.mahadasha, cur?.antardasha].filter(Boolean))) as string[]
          : chainLords).map(condOf),
        atmakaraka: {
          planet: research.anchors.atmakaraka.planet,
          karakamsha: research.charaKarakas?.karakamsha ?? research.anchors.atmakaraka.navamsaSign,
        },
        ...(research.upagrahas?.kalavelas?.gulika ? { gulikaHouse: research.upagrahas.kalavelas.gulika.house } : {}),
        ...(standingYogas.length ? { standingYogas } : {}),
      };
    }
  } catch (rcErr) {
    console.warn("[narrative] natalCondition unavailable (read continues without):", rcErr);
  }

  // Anchor the transit snapshot at the VIEWER's local noon (data-path audit #2), not a fixed
  // noon-UTC. The panchang (nakshatra, mode, activatedHouse) is computed at the viewer's
  // SUNRISE; a fixed-UTC Moon (fast, ~0.55°/hr) could sit in a DIFFERENT sign than the panchang
  // implies for a far-from-UTC viewer on a boundary day — a self-contradiction inside one input.
  // Local noon centers the snapshot on the viewer's day, consistent with the panchang and with
  // the crown/dayFilter Moon derived from this same sample. utcOffset is DST-correct (H10).
  const noon = new Date(Date.parse(dateStr + "T12:00:00Z") - (moment?.dayLoc ? moment.dayLoc.utcOffset * 3600000 : 0));
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
    // Layer-4 planetary conditions: combustion (too near the Sun) and nodal affliction
    // (gripped by Rahu/Ketu) — both weaken the planet's significations. Deterministic.
    const comb = combustion(n, lonp, a["Sun"], retro);
    const nod = nodalAffliction(n, lonp, a["Rahu"], retro);
    // Layer-4 strength: essential dignity of the CURRENT sign, minus live affliction.
    const lord = signLordOf(sign);
    const lordLon = lord ? a[lord] : undefined;
    const str = strength(n, sign, lonp % 30, { combust: !!comb?.combust, nodal: !!(nod && nod.afflicted), lonDeg: lonp, lordSign: lordLon !== undefined ? signFromLon(lordLon) : undefined });
    // Spotlight: a transiting planet whose LIVE condition earns a solo beat in the scene —
    // exalted / debilitated / own-sign dignity, combust, or tight (≤2°) on a natal point.
    // The prompt gives these an "aria"; everything else stays ensemble. Deterministic (DIGN).
    const dg = DIGN[n];
    const spotlightReason = dg?.ex === sign ? "exalted" : dg?.de === sign ? "debilitated"
      : comb?.combust ? "combust" : dg?.own.includes(sign) ? "own sign"
      : (orb <= 2 && hit) ? `tight on natal ${hit}` : null;
    return { planet: n, sign, houseFromLagna: houseFromLagna(sign, lagna), retrograde: retro, combust: comb ? comb.combust : null, nodal: nod && nod.afflicted ? { node: nod.node, orbDeg: nod.orbDeg } : null, strength: str ? { tier: str.tier, label: str.label, score: str.score, uccha: str.uccha, maitri: str.maitri } : null, hitsNatalPoint: orb <= 4 ? hit : null, orbDeg: orb <= 4 ? +orb.toFixed(1) : null, spotlight: !!spotlightReason, spotlightReason };
  }).filter(Boolean);

  // PERSONAL APEX — the crown day. The only fully-personal day signal: computed from the SAME
  // crownDay() the calendar uses (birth star + natal Moon), so the reading's crown always agrees
  // with the calendar's crown badge. Moon-based, so it works for no-birth-time (Chandra) profiles.
  const moonBody: any = byPlanet["Moon"];
  const birthNakIdx = NAK27.findIndex((n) => n.toLowerCase() === String(moonBody?.nakshatra ?? "").toLowerCase());
  const natalMoonSignIdx = ZODIAC.indexOf(moonBody?.sign ?? "");
  const lagnaSignIdx = ZODIAC.indexOf(lagna);
  let personalApex: { isCrown: boolean; tara: string; taraFavorable: boolean; chandraHouse: number; chandraFavorable: boolean } | null = null;
  let personalTara: { taraNum: number; cycle: number; quality: string; favorable: boolean } | null = null;
  let personalRating: string | null = null;
  // The interaction MODE — computed by the SAME personalDayForDate the hero uses, so the prose and
  // the hero can never name different modes (a debilitated split we just fixed for the day mode).
  let interactionMode: import("../panchang/interpreter.js").FinalMode | null = null;
  if (birthNakIdx >= 0 && natalMoonSignIdx >= 0 && lagnaSignIdx >= 0 && a["Sun"] != null && a["Moon"] != null) {
    const si = (l: number) => Math.floor((((l % 360) + 360) % 360) / 30);
    const T: Record<string, number> = Object.fromEntries(PLANETS.filter((n) => a[n] != null).map((n) => [n, si(a[n]!)]));
    const { natalAshtakavarga, personalDayForDate } = await import("../panchang/crown.js");
    // AUDIT #4 (HIGH): the crown/tara majority-star must come from the SAME sky the day-star,
    // mode, and dayFilter use — the viewer's day-location — not the Boston default. Computing it
    // from Boston split personalTara/personalApex off from panchang.nakshatra on star-boundary
    // days for located users (the "Selective vs Restrained Build" class the v742 fix closed one
    // call site down). personalDayForDate already threads dayLoc; this crownDay path did not.
    const dl = moment.dayLoc;
    const { majorityDayMoon } = await import("../panchang/crown.js");
    const { starIdx: majIdx, signIdx: majSignIdx } = await majorityDayMoon(dateStr, dl.lat, dl.lon, dl.utcOffset);
    // Same natal Ashtakavarga the calendar uses, from the natal bodies — keeps the reading's crown
    // in lockstep with the calendar's crown badge (both AV-refined).
    const natalSignIdx: Record<string, number> = {};
    for (const [n, b] of Object.entries(byPlanet)) { const i = ZODIAC.indexOf((b as any)?.sign ?? ""); if (i >= 0) natalSignIdx[n] = i; }
    const natalAv = natalAshtakavarga(natalSignIdx, lagnaSignIdx);
    const cd = crownDay({ birthNakIdx, natalMoonSignIdx, lagnaSignIdx, sunLon: a["Sun"], moonLon: a["Moon"], transitSignByPlanet: T, dayNakIdxOverride: majIdx ?? undefined, dayMoonSignIdxOverride: majSignIdx ?? undefined, ashtakavarga: natalAv });
    personalRating = cd.rating;
    personalTara = cd.tarabala;

    // THE CROWN IS THE CALENDAR'S CROWN (2026-07-20). This used to be crownDay's own threshold —
    // a different definition from the calendar's, and measurably a much looser one: it fired on
    // 30-54 days a year (8-15% of them) while the prompt told the model it meant "one of their
    // RARE personal peak days", and it agreed with the calendar's twelve on ZERO days (v778).
    // WHAT THE BOOKS SAY (David asked, 2026-07-20): METHOD.md Step 0 — a DAY is judged by Tara Bala
    // + Chandra Bala, the personal pair; and the muhurta canon's own veto note says "the native's
    // tara standing OVERRIDES the collective". The collective limbs classify what KIND of day it
    // is, never how high it goes, and there is no canonical rule that a rough collective sky
    // cancels a personal peak — the only stated interaction runs the other way. That is David's
    // split exactly: golden = the collective sky, crown = the personal apex. So crownDay's extra
    // universal/transit gates were Velea inventions on top of the canon, and the crown now comes
    // from the one ranked year the calendar draws its marks from. One calendar, one crown.
    // FAIL-SAFE: if the ranked year is unavailable for any reason, isCrown is FALSE, never a guess
    // — the prompt's rule is "when isCrown is false, say NOTHING about crowns", so a failure costs
    // a silence, never a wrong claim of a peak.
    let isCrownDay = false;
    try {
      const { rankedSolarYearForProfile } = await import("../vedic/ranked-year.js");
      const { getUserById: getUC } = await import("../db.js");
      const uC = (p as any).userId ? await getUC((p as any).userId) : null;
      // The date may sit in the previous/next solar year (the calendar walks ±1 the same way).
      for (const off of [0, -1, 1]) {
        const yr = await rankedSolarYearForProfile(p, uC, off);
        if (!yr?.summary?.topDates) continue;
        if (dateStr >= yr.yearStart && dateStr < yr.yearEnd) {
          isCrownDay = yr.summary.topDates.includes(dateStr);
          break;
        }
      }
    } catch (cErr) {
      console.warn("[narrative] ranked year unavailable — crown reported as false, never guessed:", cErr);
    }

    personalApex = {
      isCrown: isCrownDay,
      tara: cd.tarabala.name,
      taraFavorable: cd.tarabala.favorable,
      chandraHouse: cd.chandrabala.house,
      chandraFavorable: cd.chandrabala.favorable,
    };
    // Interaction mode off the same anchors + the viewer's day-location, so the mode reflects the
    // day as lived WHERE THE BODY IS (Seoul vs home), not a fixed noon-UTC reference (David).
    interactionMode = (await personalDayForDate({ birthNakIdx, natalMoonSignIdx, lagnaSignIdx, ashtakavarga: natalAv }, dateStr, moment.dayLoc))?.mode ?? null;
  }
  (natal as any).personalApex = personalApex;

  // Day-mode from the SAME source as the hero (panchang.today / panchang.byDate → getDayField):
  // the viewer's current/stored location + real tz (moment.dayLoc), else getDayField's built-in
  // location default. Computing this from the BIRTH chart's lat/lon (as before) let the hero and
  // the read name different modes on the same day — the root of the "Selective vs Restrained
  // Build" split. Fall back to the birth-loc panchang only if getDayField yields nothing.
  const field = gateDayField(
    (await getDayField(dateStr, false, moment.dayLoc, lagna, personalRating, interactionMode)) ??
      // Last-resort fallback (getDayField returned null): same resolved day-sky, direct calc.
      interpretPanchang(
        await calcPanchang(dateStr, moment.dayLoc.lat, moment.dayLoc.lon, moment.dayLoc.utcOffset),
        lagna
      ),
    personalRating,
    interactionMode
  );
  // Hora (planetary hour) is deliberately NOT fed to the day reading. Per David: the day-card prose
  // must NEVER synthesize all the way to the current hour ("this Jupiter hour is good…"). The hora
  // belongs to the Time Master / Hora cards, not the day narrative. Kept null so the prompt's own
  // rule ("when hora is absent, say nothing of hours") holds for every read, moment or daily.
  const hora: { lord: string; tone: string; phase: string; good: string } | null = null;

  // Eclipse, read by its PHASE across the whole season (deterministic). eclipseNear gives the tight
  // ±7-day peak (with a SIGNED daysAway); eclipseSeason gives the broader ~5-week window and whether
  // the Sun is still approaching the nodal axis (building) or has passed it (aftermath). Combined so
  // the read turns the corner: a build before, the sacred pause at peak, the clearing/unfolding after
  // — instead of one flat "be careful." null only when the Sun is well clear of the axis.
  const ecl = eclipseNear(a["Sun"], a["Moon"], a["Rahu"]);
  const eclSeason = eclipseSeason(a["Sun"], a["Rahu"]);
  let eclipse:
    | { type: "solar" | "lunar" | null; phase: "building" | "peak" | "aftermath"; daysAway: number | null; orbDeg: number; node: "Rahu" | "Ketu" }
    | null = null;
  if (ecl.type) {
    // At the tight peak: the sign of daysAway says upcoming (build), the day itself (peak), or just
    // past (already clearing) — so even inside the fortnight the read turns after the eclipse passes.
    const phase = ecl.daysToSyzygy > 1 ? "building" : ecl.daysToSyzygy < -1.5 ? "aftermath" : "peak";
    eclipse = { type: ecl.type, phase, daysAway: ecl.daysToSyzygy, orbDeg: ecl.sunNodeOrbDeg, node: eclSeason.node };
  } else if (eclSeason.inSeason) {
    // In the season's tails (beyond the tight orb): building on the approach, aftermath on the way out.
    eclipse = { type: null, phase: eclSeason.side === "leaving" ? "aftermath" : "building", daysAway: null, orbDeg: eclSeason.sunAxisOrbDeg, node: eclSeason.node };
  }

  const panchang = {
    // THE DAY'S MODE, NOT THE MINUTE'S (v794). field.finalMode is evaluated at the current segment
    // for today, while activatedHouse below is always the day's RULING house — so pairing them fed
    // the model a house that did not match its mode on the ~21% of days the Moon changes sign, the
    // same "two clocks in one verdict" class v789 closed inside the engine and left open here.
    // dayFinalMode is the identical computation taken at the majority configuration, so it agrees
    // with activatedHouse AND with the majority nakshatra a few lines down, and it does not move as
    // the clock does — the hero and the timeline still read finalMode.
    mode: field.dayFinalMode ?? field.finalMode,
    qualifier: field.dayQualifier ?? field.qualifier,
    activatedHouse: field.houseActivated,
    // tithi is now BARE both paths (data-path audit #3); paksha travels EXPLICITLY so the LLM
    // always gets the waxing(Shukla)/waning(Krishna) direction — it was only ever embedded in
    // the cached tithi's prefix and absent entirely on freshly-computed days.
    // THE READING READS THE DAY'S MAJORITY STAR (David 2026-07-18: "fine-tune H5 to only
    // regenerate if the new star is the majority of the day"). field.nakshatra is the DOMINANT
    // star (rules most of the vedic day) — day-stable, unlike the live-minute activeNakshatra.
    // So the dayFilter (built from this) no longer flips at every mid-day transition; it changes
    // only when the majority changes, day to day. A brief minority star late in the day no longer
    // regenerates (and re-bills) the read. The hero still shows the live "turns at…" moment; the
    // READING is about the day's ruling character. turnsAtNote still tells the model it turns.
    nakshatra: field.nakshatra ?? (field as any).activeNakshatra, tithi: field.tithi, paksha: (field as any).tithiPaksha ?? null,
    karana: field.karana ? { name: field.karana.name, quality: field.karana.quality, vishti: field.karana.name === "Vishti" } : null,
    // The literal mid-day turn and the field/karana containment reasons — the DAY-scale
    // particulars the read must spend its words on.
    turnsAtNote: (field as any).turnsAtNote ?? null,
    modeStepReasons: (field as any).modeStepReasons ?? [],
    weatherGated: (field as any).weatherGated ?? false,
    hora,
    eclipse,
    asOf: dateStr,
  };

  // ── THE DAY'S CHARACTER (input.dayFilter) — the classical filter that replaced the four
  // modes (David 2026-07-15: "eliminate my 4 modes and replace with how the books would
  // filter each day"). Computed from the same panchang facts the read already carries; the
  // Sun/Moon noon longitudes give the tithi number. Collective here — the personal layer
  // (weather gate / caution) already travels via panchang.weatherGated + the knots.
  let dayFilterBlock: any = null;
  try {
    const { dayFilter } = await import("../vedic/day-filter.js");
    // ONE SOURCE FOR THE DAY'S TITHI (2026-07-19 audit). This used to recompute the tithi from the
    // Sun/Moon longitudes sampled at LOCAL NOON, while the calendar/hero used the MAJORITY-of-day
    // tithi (astro.tithiIndex + 1). Two derivations of one quantity: a 60-day probe measured them
    // landing in DIFFERENT tithi FAMILIES on 9 of 60 days — e.g. 2026-08-01, where the hero read
    // rikta ("start nothing") while the reading beneath it was generated from jaya ("bold moves
    // land well"). The nakshatra directly above was already moved to the day-stable majority for
    // exactly this reason; the tithi was left behind.
    //
    // The majority tithi is already on this input as panchang.tithi + paksha, so derive the number
    // from it rather than resampling the sky. Name+paksha is a bijection over the 30 tithis
    // (index 14 resolves to Purnima in Shukla, Amavasya in Krishna). If a name ever fails to
    // match, fall back to the noon computation — a wrong family is bad, no reading is worse.
    const sunLon = a.Sun, moonLon = a.Moon;
    const noonTithiNumber = Math.floor(((((moonLon - sunLon) % 360) + 360) % 360) / 12) + 1;
    const tithiNumber = ((): number => {
      const TITHI_NAMES = [
        "pratipada", "dwitiya", "tritiya", "chaturthi", "panchami",
        "shashthi", "saptami", "ashtami", "navami", "dashami",
        "ekadashi", "dwadashi", "trayodashi", "chaturdashi",
      ];
      const raw = String(panchang.tithi ?? "").trim().toLowerCase()
        .replace(/^(shukla|krishna)\s+/, "");           // one service path prefixes the paksha
      const inPaksha = raw === "purnima" || raw === "amavasya" ? 14 : TITHI_NAMES.indexOf(raw);
      if (inPaksha < 0) return noonTithiNumber;
      const krishna = String((panchang as any).paksha ?? "").toLowerCase() === "krishna";
      return (krishna ? inPaksha + 15 : inPaksha) + 1;   // 1..30, same contract as the calendar
    })();
    const WEEKDAY_LORD_7 = ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn"];
    const c = dayFilter({
      nakshatra: String(panchang.nakshatra ?? ""),
      tithiNumber,
      varaLord: WEEKDAY_LORD_7[new Date(dateStr + "T12:00:00Z").getUTCDay()],
      vishti: !!panchang.karana?.vishti,
      dateSeed: dateStr,
      // Mercury reaches the read via input.mercuryRx; the rx law gates movement, not character.
      // The PERSONAL tara now reaches the filter (David's 7/29: the prose cheered travel on
      // his obstacle-star day) — the sentence carries the personal turn, supports empty out.
      tara: personalTara as any,
    });
    dayFilterBlock = {
      headline: c.headline, sentence: c.sentence,
      supports: c.supports, avoid: c.avoid, vetoes: c.vetoes,
      varaColors: c.varaColors,
      ...(personalTara?.quality === "bad" ? {
        personalStance: "THIS RULES THE DAY: the native's own day-star meets this day as an obstacle. However bright the collective day reads, do NOT recommend its outward supports (travel, launches, trade, beginnings) to this native — the guidance is containment: finish, tend, keep it small. The world can run with this day; this native doesn't.",
      } : {}),
    };
    // The retired mode vocabulary leaves the model's sight entirely (David's screenshot,
    // 2026-07-15: the prose echoed "A Corrective Build day"). A model can't echo words it
    // never receives; the old mode-conjugation prompt blocks go inert with the fields absent.
    (panchang as any).mode = undefined;
    (panchang as any).qualifier = undefined;
    (panchang as any).modeStepReasons = undefined;
  } catch { /* the read proceeds without the filter */ }

  // THE NODAL AXIS — the incarnational spine (Simone's fix, piece 2 of the Moon
  // double-count spec): Rahu's house = the REACH (hunger, new territory), Ketu's = the
  // RELEASE (done-with, dissolving). Computed for every chart; carried only when a
  // running lord sits on a pole or a node IS a running lord — then the axis IS the
  // chapter and the read must move along it, never collapse into mood.
  let nodalAxis: any = null;
  try {
    const rahuB: any = byPlanet["Rahu"], ketuB: any = byPlanet["Ketu"];
    if (rahuB?.sign && ketuB?.sign) {
      const rulersN = [
        { role: "Time Lord", lord: pf.timeLord },
        ...(cur ? [{ role: "mahadasha", lord: cur.mahadasha }, { role: "antardasha", lord: cur.antardasha }] : []),
      ];
      const signOf = (lord: string) => (byPlanet[lord] as any)?.sign;
      const lordsOnPoles = rulersN
        .filter((r) => r.lord && r.lord !== "Rahu" && r.lord !== "Ketu")
        .map((r) => ({
          ...r,
          pole: signOf(r.lord) === rahuB.sign ? "REACH — sits with Rahu (the hunger pole)"
            : signOf(r.lord) === ketuB.sign ? "RELEASE — sits with Ketu (the done-with pole)" : null,
        }))
        .filter((r) => r.pole);
      const nodalDashaLords = rulersN.filter((r) => r.lord === "Rahu" || r.lord === "Ketu").map((r) => ({ role: r.role, node: r.lord }));
      if (lordsOnPoles.length || nodalDashaLords.length) {
        nodalAxis = {
          _how: "THE SPINE: the day's/year's events are MOVEMENT along this axis — away from the release pole's rooms, toward the reach pole's rooms. Name the concrete rooms. A read that collapses this into mood/feelings/rest is WRONG.",
          reach: { node: "Rahu", sign: rahuB.sign, house: rahuB.house ?? null },
          release: { node: "Ketu", sign: ketuB.sign, house: ketuB.house ?? null },
          lordsOnPoles,
          nodalDashaLords,
        };
      }
    }
  } catch { /* the spine is optional, never fatal */ }



  if (moment?.slowOnly) {
    // THE YEAR READ EATS PROPERLY (David 2026-07-16: "is the prose for Your Year being
    // fed?"): the stage now carries the lords' TRUE condition (maha+antar only — the
    // pratyantar is fast and would churn the chapter cache) and THE YEAR'S WINDOWS from
    // stored convergence, anchored to the profection year so the hash stays chapter-stable.
    let yearWindows: any = null;
    try {
      const { getDb } = await import("../db.js");
      const { profileConvergence } = await import("../../drizzle/schema.js");
      const { eq: eqW } = await import("drizzle-orm");
      const dbW = await getDb();
      if (dbW && p.birthDate) {
        const [, bm, bd] = String(p.birthDate).split("-").map(Number);
        const dy = Number(dateStr.slice(0, 4));
        const dMD = dateStr.slice(5);
        const startYear = dMD >= `${String(bm).padStart(2, "0")}-${String(bd).padStart(2, "0")}` ? dy : dy - 1;
        const y0 = Date.parse(`${startYear}-${String(bm).padStart(2, "0")}-${String(bd).padStart(2, "0")}T00:00:00Z`);
        const y1 = y0 + 366 * 86400000;
        const rows = await dbW.select().from(profileConvergence).where(eqW(profileConvergence.profileId, p.id));
        const spans = rows
          .map((r: any) => ({ s: new Date(r.startAt).getTime(), e: new Date(r.endAt).getTime(), themes: JSON.parse(r.themes ?? "{}") }))
          .filter((r: any) => r.e > y0 && r.s < y1)
          .sort((a: any, b: any) => a.s - b.s);
        const byTheme: Record<string, Array<{ from: string; to: string }>> = {};
        for (const th of Array.from(new Set(spans.flatMap((sp: any) => Object.keys(sp.themes).filter((k) => sp.themes[k]?.lit))))) {
          let openW: { s: number; e: number } | null = null;
          const out: Array<{ from: string; to: string }> = [];
          for (const sp of spans) {
            const lit = sp.themes[th as string]?.lit;
            if (lit && !openW) openW = { s: sp.s, e: sp.e };
            else if (lit && openW) openW.e = sp.e;
            else if (!lit && openW) { out.push({ from: new Date(openW.s).toISOString().slice(0, 10), to: new Date(openW.e).toISOString().slice(0, 10) }); openW = null; }
          }
          if (openW) out.push({ from: new Date(openW.s).toISOString().slice(0, 10), to: new Date(openW.e).toISOString().slice(0, 10) });
          if (out.length) byTheme[th as string] = out;
        }
        if (Object.keys(byTheme).length) yearWindows = byTheme;
      }
    } catch { /* the year read proceeds without windows */ }
    // THE YEAR'S OWN CHART (Varshaphala — road A, David: "A then B"): the solar return
    // cast at the CURRENT residence + Tajika aspects. Deterministic, memoized per year.
    let varshaphala: any = null;
    try {
      if (lonAll["Sun"] != null && p.birthDate) {
        const [, bmV, bdV] = String(p.birthDate).split("-").map(Number);
        const dyV = Number(dateStr.slice(0, 4));
        const mdV = dateStr.slice(5);
        const syV = mdV >= `${String(bmV).padStart(2, "0")}-${String(bdV).padStart(2, "0")}` ? dyV : dyV - 1;
        const yearStartIso = `${syV}-${String(bmV).padStart(2, "0")}-${String(bdV).padStart(2, "0")}`;
        const { getUserById: getUV } = await import("../db.js");
        const uV = (p as any).userId ? await getUV((p as any).userId) : null;
        // The solar return is cast at the CURRENT residence — same precedence as every day-layer.
        const skyV = await resolveDaySky({ user: uV, profile: p, profileId: p.id, dateStr: yearStartIso });
        const { computeVarshaphala } = await import("../vedic/varshaphala.js");
        varshaphala = await computeVarshaphala({
          profileKey: `${p.id}|${yearStartIso}|${skyV.lat.toFixed(2)},${skyV.lon.toFixed(2)}`,
          natalSunLon: lonAll["Sun"], yearStart: yearStartIso, lat: skyV.lat, lon: skyV.lon, locSource: (skyV.source === "default" ? "fallback" : skyV.source) as any,
        });
      }
    } catch (vErr) { console.warn("[narrative] varshaphala unavailable (year read continues):", vErr); }

    return { subject: { profileId: p.id }, natal, natalRetrogradeCount, profection, dasha: dashaBase, arc, ...(natalCondition ? { natalCondition } : {}), ...(yearWindows ? { yearWindows } : {}), ...(nodalAxis ? { nodalAxis } : {}), ...(varshaphala ? { varshaphala } : {}) } as any;
  }

  // RECENT READS — the last 3 days of prose, so the model can see what it already said and is
  // FORBIDDEN from re-saying. Root cause of the wallpaper era (2026-07-10): no memory of
  // yesterday → the same year-lord essay and the same "finish, don't open a new front"
  // directive, four days running.
  // 2026-07-20: this read the "glance" surface, which was RETIRED from Today — so for every user
  // who never pinned a day, the history was ALWAYS EMPTY and the anti-repetition guard had been
  // silently off since the retirement. Read the live surface (day_read) and fall back to the old
  // one for the days that predate the switch.
  const recentReads: Array<{ date: string; narrative: string }> = [];
  try {
    const { getNarrativeCache } = await import("../db.js");
    for (let i = 1; i <= 3; i++) {
      const d = new Date(dateStr + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() - i);
      const ds = d.toISOString().slice(0, 10);
      const row = (await getNarrativeCache(p.id, "day_read", ds)) ?? (await getNarrativeCache(p.id, "glance", ds));
      if (row?.content) {
        try {
          // glance = {narrative}; day_read = {scene, story, tilt, …} — the story IS the read.
          const prose = readingProse(JSON.parse(row.content));
          if (prose) recentReads.push({ date: ds, narrative: prose.slice(0, 700) });
        } catch { recentReads.push({ date: ds, narrative: String(row.content).slice(0, 700) }); }
      }
    }
  } catch { /* no cache access — model simply gets no history */ }

  // KILLED (David, 2026-07-13): the Monday-to-Friday / work-week / weekend framing. Dharma is
  // identity, not a 9-to-5 ([[velea-dharma-is-identity-not-work]]); for David — and testers living
  // one continuous head-down build — the "re-entry into the work-week" frame is simply false. The day
  // is framed by the CHART and the season's natural tide, never the calendar week. Only season survives.

  // Universal seasonal layer (hemisphere-aware). Culture-specific holidays require a
  // future profile `culture` field; only near-universal markers are inferred here.
  const md = (+dateStr.slice(5, 7)) * 100 + (+dateStr.slice(8, 10));
  const northSeason = md >= 321 && md < 621 ? "spring" : md >= 621 && md < 922 ? "summer" : md >= 922 && md < 1221 ? "autumn" : "winter";
  const flip: Record<string, string> = { spring: "autumn", summer: "winter", autumn: "spring", winter: "summer" };
  // Hemisphere follows the BODY: the viewer's day-location when known, birth latitude only as
  // the best guess when no location is stored. (A Sydney-born user wintering in Boston was
  // reading "summer" — the reading disagreeing with the world outside the window.)
  const season = moment.dayLoc.lat >= 0 ? northSeason : flip[northSeason];
  const nearTurn = [321, 621, 922, 1221].some((t) => Math.abs(md - t) <= 6) ? "near a seasonal turn (solstice/equinox)" : null;

  const humanTime = { season, nearSeasonalTurn: nearTurn };

  // The year lord's CURRENT transit house is the active medium-term chapter (weeks),
  // distinct from the Moon's daily trigger. Surfaced first-class so the engine can
  // name its concrete life-area instead of losing it in the raw transit list.
  // EXCEPT when the year lord is the Moon: the transiting Moon IS the daily trigger, so a
  // "Moon chapter" would double-count the fastest body as a slow season. Null it — the slow
  // chapter for a Moon year comes from the natal Moon's standing + the daśā lords, not this.
  const tlt = pf.timeLord === "Moon" ? null : (transits.find((t: any) => t.planet === pf.timeLord) || null);
  const timeLordTransit = tlt
    ? { planet: pf.timeLord, currentSign: tlt.sign, currentHouse: tlt.houseFromLagna, retrograde: tlt.retrograde, hitsNatalPoint: tlt.hitsNatalPoint, orbDeg: tlt.orbDeg,
        // The Time Lord's LIVE condition, not just its house — its dignity RIGHT NOW decides
        // how loudly the chapter's protagonist speaks (see the prompt's spotlight rule).
        condition: tlt.strength, combust: tlt.combust, spotlight: tlt.spotlight, spotlightReason: tlt.spotlightReason }
    : null;

  // ── THE MERIDIAN — the dharma axis, the SPINE every read hangs off (David's law) ──
  // MC = the public calling / the reach; IC = the roots / the release. We surface the axis
  // signs + lords, any NATAL planet sitting on an angle (a node on the meridian makes this axis
  // the person's whole spine), and — load-bearing — which of TODAY's ruling lords (profection
  // Time Lord, mahā/antar daśā) sit on the reach pole vs the release pole. That last piece is what
  // stops the prose flattening a lord into "mood": when the Moon rules a year AND sits on the IC
  // release pole while Rahu runs the MC reach pole, the story is reach-vs-release, never weather.
  // Timed charts only — a no-birth-time (Chandra) chart has no real meridian (mcLongitude absent).
  let meridianAxis: any = null;
  let meridianOnAxis: string[] = [];   // planets sitting in the MC/IC SIGN — the dharma axis, for knots
  {
    const mcLonM = (p as any).mcLongitude != null ? parseFloat((p as any).mcLongitude) : NaN;
    if (!Number.isNaN(mcLonM) && lagnaSignIdx >= 0) {
      const norm = (x: number) => ((x % 360) + 360) % 360;
      const sep = (x: number, y: number) => Math.abs(((norm(x) - norm(y) + 540) % 360) - 180);
      const mcL = norm(mcLonM), icL = norm(mcL + 180);
      const mcIdx = Math.floor(mcL / 30), icIdx = (mcIdx + 6) % 12;
      const houseOfSign = (idx: number) => ((idx - lagnaSignIdx + 12) % 12) + 1;
      const mcSign = ZODIAC[mcIdx], icSign = ZODIAC[icIdx];
      // natal planets within 8° of an angle — a node here is the loudest signal
      const onAngle = (angLon: number) =>
        Object.entries(natalLon)
          .filter(([, v]) => sep(v as number, angLon) <= 8)
          .map(([k, v]) => ({ planet: k, orbDeg: +sep(v as number, angLon).toFixed(1) }))
          .sort((x, y) => x.orbDeg - y.orbDeg);
      const mcOn = onAngle(mcL), icOn = onAngle(icL);
      // planets in the MC or IC SIGN (by whole sign) — "on the meridian" for the knot detector
      meridianOnAxis = PLANETS.filter((n) => { const s = (byPlanet[n] as any)?.sign; return s === mcSign || s === icSign; });
      // which of the day's ruling lords sit on a pole, by natal sign (reach = MC sign, release = IC sign)
      const poleOf = (lord: string) => {
        const b: any = byPlanet[lord];
        if (!b?.sign) return null;
        if (b.sign === mcSign) return "reach (the MC / public calling)";
        if (b.sign === icSign) return "release (the IC / roots)";
        return null;
      };
      const rulers = [
        { role: "Time Lord", lord: pf.timeLord },
        ...(cur ? [{ role: "mahadasha", lord: cur.mahadasha }, { role: "antardasha", lord: cur.antardasha }] : []),
      ];
      const lordsOnAxis = rulers.map((r) => ({ ...r, pole: poleOf(r.lord) })).filter((r) => r.pole);
      meridianAxis = {
        mc: { sign: mcSign, house: houseOfSign(mcIdx), lord: SIGN_RULERS[mcSign], onAngle: mcOn },
        ic: { sign: icSign, house: houseOfSign(icIdx), lord: SIGN_RULERS[icSign], onAngle: icOn },
        // TRUE when a node sits on the meridian → the nodal (reach/release) axis IS the dharma axis
        nodesOnAxis: [...mcOn, ...icOn].some((o) => o.planet === "Rahu" || o.planet === "Ketu"),
        // e.g. [{role:"mahadasha",lord:"Rahu",pole:"reach…"},{role:"antardasha",lord:"Moon",pole:"release…"}]
        lordsOnAxis,
      };
    }
  }

  // KNOTS — the life-event convergence detector (server/vedic/knots.ts, canon-fed). Deterministic,
  // no API. Flags the themes (marriage/children/career/identity/…) whose running period-lords CONVERGE
  // (Appendix IV Step 15), separating the dasha CHAPTER (standing: the promise, true for the sub-period)
  // from a DATED event (only a MOVING trigger — a slow transit landing on the ruler — dates it; a static
  // natal conjunction never does), ranking the dated event above the diffuse backdrop, and folding the
  // 10th-cluster into whatever it truly cashes out as (Simone: career/identity fold into the marriage).
  // Fed to the prompt so the LLM reaches for the real event instead of defaulting to "work". Only lit knots carried.
  const knotNatal: Record<string, NatalPlanet> = Object.fromEntries(
    (natal.planets as any[]).filter(Boolean).map((pl) => [pl.name, { sign: pl.sign, house: pl.house ?? null, rulesHouses: pl.rulesHouses ?? [], dignity: pl.dignity } as NatalPlanet]),
  );
  const SLOW_TRANSITS = new Set(["Mars", "Jupiter", "Saturn", "Rahu", "Ketu"]);
  const knotsResult = buildKnots({
    natal: knotNatal,
    dashaLords: { maha: (dasha as any)?.mahaDasha?.lord ?? null, antar: (dasha as any)?.antarDasha?.lord ?? null, praty: (dasha as any)?.pratyantarDasha?.lord ?? null },
    timeLord: pf.timeLord,
    transitsHitting: (transits as any[]).map((t) => ({ planet: t.planet, hitsNatalPoint: t.hitsNatalPoint ?? null, houseFromLagna: t.houseFromLagna ?? null, slow: SLOW_TRANSITS.has(t.planet) })),
    meridianOnAxis,
    partnerGender: null,
  });
  // THE OPEN WINDOWS (David 2026-07-15: "how would someone like Simone wake up… and get a
  // hint she may be engaged by the end of the day"): the STORED Step-15 convergence
  // timeline — natal promise + dasha + transit agreeing — carries which life-themes stand
  // LIT today. The live knots above see today's sky; the stored windows see the LIFE.
  let openWindows: Array<{ theme: string; convergence: number; runsUntil: string }> | null = null;
  try {
    const { getDb } = await import("../db.js");
    const { profileConvergence } = await import("../../drizzle/schema.js");
    const { eq: eqOp2 } = await import("drizzle-orm");
    const db2 = await getDb();
    if (db2) {
      const rows = await db2.select().from(profileConvergence).where(eqOp2(profileConvergence.profileId, p.id));
      const dayMs = Date.parse(dateStr + "T12:00:00Z");
      const span = rows.find((r: any) => new Date(r.startAt).getTime() <= dayMs && dayMs < new Date(r.endAt).getTime());
      if (span) {
        const themes = JSON.parse((span as any).themes ?? "{}");
        const lit = Object.entries(themes).filter(([, t]: any) => t?.lit);
        if (lit.length) {
          openWindows = lit.map(([theme, t]: any) => ({
            theme,
            convergence: t.convergence ?? 1,
            runsUntil: new Date((span as any).endAt).toISOString().slice(0, 10),
          }));
        }
      }
    }
  } catch { /* no stored timeline — the live knots still speak */ }

  // Carry only the lit knots, trimmed for the prompt (drop internal scaffolding).
  const knots = knotsResult.lit.length
    ? knotsResult.lit.map((k) => ({ theme: k.theme, label: k.label, tier: k.tier, houses: k.houses, why: k.signals.map((s) => s.text), ...(k.folds?.length ? { folds: k.folds } : {}), ...(k.comboProse ? { canon: k.comboProse } : {}) }))
    : undefined;

  // DAY-FRAME READING (admin-gated) — the tried-and-true day read the engine PRODUCES (Lens Router's
  // day frame → the Moon: tilt · arena · condition-in-varga · chapter · timing), for the voice model
  // to RENDER rather than synthesize. Deterministic (server/vedic/day-frame.ts). Absent → prompt's
  // reading block is inert and the read is generated exactly as before.
  let reading: DayFrameReading | undefined;
  if (ownerIsAdmin && a["Moon"] != null && birthNakIdx >= 0 && natalMoonSignIdx >= 0) {
    const natalByPlanet = Object.fromEntries(
      (natal.planets as any[]).filter(Boolean).map((pl) => [pl.name, { sign: pl.sign, house: pl.house ?? null, dignity: pl.dignity, rulesHouses: pl.rulesHouses ?? [], ...(pl.cancelledDebilitation ? { cancelledDebilitation: true, hardWon: pl.hardWon ?? true } : {}) }]),
    );
    try {
      reading = dayFrameReading({
        natalLon: lonAll, ascLon: lagnaLonForDig, lagnaSign: lagna, natalByPlanet,
        birthNakIdx, natalMoonSignIdx,
        dayMoonLon: a["Moon"], dayNakIdx: Math.floor((((a["Moon"] % 360) + 360) % 360) / (360 / 27)),
        transits: transits as any, dasha: dasha as any,
      });
    } catch (e) { console.warn(`[narrative] day-frame reading failed for profile ${p.id}:`, e); }
  }

  // LIFE-AREA LENS — the horoscope's "pick a life area" varga-deep block. Present ONLY when a
  // life area was requested (the Today/glance reads never carry it). Deterministic: routes the area
  // to its varga + primary house + karakas (life-areas.ts, from Kurczak & Fish Appendix IV), reads
  // the house lord + karakas BOTH natally and in the varga, and marks how TODAY's transits + dashas
  // light the area up — so the reading points at THAT area on THAT date (David's spec).
  let lifeAreaLens: ReturnType<typeof buildLifeAreaLens> | undefined;
  if (moment?.lifeArea) {
    const natalByPlanet = Object.fromEntries(
      (natal.planets as any[]).filter(Boolean).map((pl) => [pl.name, { sign: pl.sign, house: pl.house ?? null, dignity: pl.dignity, rulesHouses: pl.rulesHouses ?? [] }]),
    );
    lifeAreaLens = buildLifeAreaLens({
      area: moment.lifeArea,
      lonByPlanet: lonAll,
      ascLon: lagnaLonForDig,
      lagnaSign: lagna,
      natalByPlanet,
      transits: transits as any,
      dasha: dasha as any,
    });
    // THE FOCUS (life-area shelves, 2026-07-16): when the user asked about a PRECISE
    // seat ("shared & inherited", not just "money"), the lens carries it — the prompt
    // must aim every paragraph at this seat.
    if (lifeAreaLens && moment?.areaFocus) (lifeAreaLens as any).focus = moment.areaFocus;
    // THE DEPTH GRAFT: the area's carriers (house lord + karakas) get their stored
    // both-volumes condition — Shadbala strength, avashtas, combustion, neecha-bhanga —
    // so the paid lens is never shallower than the free House Reader.
    if (lifeAreaLens && condOfStored) {
      const carriers = Array.from(new Set([
        (lifeAreaLens as any).rasi?.houseLord,
        (lifeAreaLens as any).vargaChart?.houseLord,
        ...(((lifeAreaLens as any).karakas ?? []).map((k: any) => k.planet)),
      ].filter(Boolean))) as string[];
      (lifeAreaLens as any).storedConditions = {
        _how: "the stored research's TRUE condition of this area's carriers — deeper than the flat dignity fields above; when they disagree, trust THIS",
        carriers: carriers.map(condOfStored),
      };
    }
  }

  // ECLIPSE SEASON ARC — the "how will this eclipse season affect me" period read. Present ONLY when
  // requested. Finds the next eclipse season (the cluster of solar/lunar eclipses ahead), and for each
  // eclipse maps WHICH house of THIS chart it lands in (+ its opposite, since an eclipse lights the
  // whole axis), its dispositor's natal condition, and any natal points it hits — so the read is about
  // the person's actual houses, not a generic "eclipses are intense." Deterministic (sky/eclipses.ts).
  let eclipseSeasonArc: any | undefined;
  if (moment?.eclipseArc) {
    const todayMs = Date.parse(dateStr + "T00:00:00Z");
    const season = nextEclipseSeason(await findEclipses(todayMs, 100));
    if (season.length) {
      const natByName = Object.fromEntries((natal.planets as any[]).filter(Boolean).map((pl) => [pl.name, pl]));
      const moonLon = lonAll["Moon"] ?? 0;
      const eclipses = season.map((e) => {
        const ctx = eclipseChartContext(e.eclLon, lagnaLonForDig, moonLon, lonAll);
        const oppHouse = ((ctx.wholeSignHouse + 5) % 12) + 1; // +6 houses (the axis's other end), wrapped
        const disp = natByName[ctx.dispositor];
        return {
          date: e.date, daysAway: Math.round((e.dateMs - todayMs) / 86400000), type: e.type,
          sign: e.sign, degInSign: e.degInSign, nodeDist: e.nodeDistDeg,
          house: ctx.wholeSignHouse, houseGloss: HOUSE_KEYWORDS[ctx.wholeSignHouse],
          oppositeHouse: oppHouse, oppositeHouseGloss: HOUSE_KEYWORDS[oppHouse],
          houseFromMoon: ctx.houseFromMoon,
          dispositor: disp ? { planet: ctx.dispositor, natalHouse: disp.house, dignity: disp.dignity, rulesHouses: disp.rulesHouses } : { planet: ctx.dispositor },
          hits: ctx.hits,
        };
      });
      const windowEnd = new Date(season[season.length - 1].dateMs + 21 * 86400000).toISOString().slice(0, 10);
      eclipseSeasonArc = { today: dateStr, windowEnd, count: season.length, eclipses };
    }
  }

  // MERCURY RETROGRADE ARC — the "how will this Mercury retrograde affect me" period read. Present ONLY
  // when requested and a cycle is active/approaching. Maps the retrograde SPAN into THIS chart: which
  // house(s) Mercury reviews (it lands on the sign it stations in, and may back-cross into a prior
  // sign/house), the sign lord whose condition colours the review, and any natal points Mercury
  // retrogrades back over (a direct personal re-visit). Deterministic (sky/retrograde-phase.ts).
  let mercuryRxArc: any | undefined;
  let planetRxArc: any | undefined;
  if (moment?.mercuryRxArc || moment?.rxArcPlanet) {
    const rxPlanet = moment?.rxArcPlanet ?? "mercury";
    const cyc = await planetRxCycle(rxPlanet as any, dateStr);
    if (cyc) {
      const norm = (x: number) => ((x % 360) + 360) % 360;
      const sep = (a: number, b: number) => { const d = Math.abs(norm(a) - norm(b)); return Math.min(d, 360 - d); };
      const natByName = Object.fromEntries((natal.planets as any[]).filter(Boolean).map((pl) => [pl.name, pl]));
      const houseR = houseFromLagna(cyc.stationRetro.sign, lagna);
      const houseD = houseFromLagna(cyc.stationDirect.sign, lagna);
      const dispName = (sign: string) => SIGN_RULERS[sign];
      const dispOf = (sign: string) => {
        const n = dispName(sign); const d = natByName[n];
        return d ? { planet: n, natalHouse: d.house, dignity: d.dignity, rulesHouses: d.rulesHouses } : { planet: n };
      };
      // Natal points Mercury retrogrades back over — inside the band [retroEndLon, retroStartLon] or
      // within 4° of a station point. A tight hit is a direct personal re-visit.
      let lo = cyc.retroEndLon, hi = cyc.retroStartLon;
      const hits = Object.entries(lonAll).map(([point, lon]) => {
        let L = lo, H = hi, x = norm(lon); if (H < L) { H += 360; if (x < L) x += 360; }
        const inBand = x >= L && x <= H;
        return { point, orbDeg: inBand ? 0 : +Math.min(sep(lon, lo), sep(lon, hi)).toFixed(1), inBand };
      }).filter((h) => h.inBand || h.orbDeg <= 4).sort((a, b) => a.orbDeg - b.orbDeg)
        .map((h) => ({ point: h.point, orbDeg: h.orbDeg }));
      // What each slow planet RE-EXAMINES when it backs up — the review's character.
      const REVIEW_CHARACTER: Record<string, string> = {
        mercury: "re-checks words, dealings, plans, and the details signed too fast",
        venus: "re-evaluates love, worth, pleasure, and what you find beautiful",
        mars: "recalibrates drive, effort, anger, and where you spend force",
        jupiter: "reviews beliefs, growth, teachers, and what you keep saying yes to",
        saturn: "re-audits structures, duties, commitments, and what deserves to keep standing",
      };
      const capName = rxPlanet.charAt(0).toUpperCase() + rxPlanet.slice(1);
      const selfNat = natByName[capName];
      const arcObj = {
        planet: capName, reviewCharacter: REVIEW_CHARACTER[rxPlanet],
        selfSeat: selfNat ? { natalHouse: selfNat.house, sign: selfNat.sign, dignity: selfNat.dignity, rulesHouses: selfNat.rulesHouses ?? [] } : null,
        today: dateStr, phaseNow: cyc.phaseNow,
        preShadowStart: cyc.preShadowStart, stationRetroDate: cyc.stationRetro.date,
        stationDirectDate: cyc.stationDirect.date, retroshadeEnd: cyc.retroshadeEnd,
        daysToStationRetro: cyc.daysToStationRetro, crossesSigns: cyc.crossesSigns,
        house: houseR, houseGloss: HOUSE_KEYWORDS[houseR],
        ...(cyc.crossesSigns && houseD !== houseR ? { house2: houseD, houseGloss2: HOUSE_KEYWORDS[houseD] } : {}),
        dispositor: dispOf(cyc.stationRetro.sign),
        ...(cyc.crossesSigns && dispName(cyc.stationDirect.sign) !== dispName(cyc.stationRetro.sign)
          ? { dispositor2: dispOf(cyc.stationDirect.sign) } : {}),
        hits,
      };
      if (rxPlanet === "mercury") mercuryRxArc = arcObj; else planetRxArc = arcObj;
    }
  }

  // MONTH ARC — the calendar month's big beats (lunations, ingresses, stations, eclipses, personal
  // hits), each mapped into THIS chart's houses. Present ONLY when requested. Feeds the Monthly period
  // reading, which reads them as the month's scenes/characters/conversations against the SAME layered
  // input (Time Lord/dasha/profection/natal) a day read uses — expanded to the month. (sky/month-events.ts)
  let monthArc: any | undefined;
  if (moment?.monthArc) {
    const natalPoints: Record<string, number> = { ...lonAll, Asc: lagnaLonForDig };
    // Include the Meridian axis so a transit sitting on the natal Midheaven (the calling) or IC (the
    // roots/home) that month lands as a personal beat (David). Timed charts only — a no-birth-time
    // (Chandra) chart has no real meridian, so mcLongitude is absent and we skip it.
    const mcLon = (p as any).mcLongitude != null ? parseFloat((p as any).mcLongitude) : NaN;
    if (!Number.isNaN(mcLon)) {
      natalPoints.MC = ((mcLon % 360) + 360) % 360;
      natalPoints.IC = (natalPoints.MC + 180) % 360;
    }
    const scan = await monthEvents(dateStr, natalPoints, lagna);

    // THE STAGE'S MOVING PARTS — the dasha SUB-PERIODS (pratyantar hand-offs) that fall in the month,
    // dated. This is David's gold-standard "Sub-periods: Mars Jun 17–Jul 20, Rahu Jul 20–Oct 15" — the
    // Time Lord's own turns inside the month, the environment shifting under the dated events.
    const subPeriods: { lord: string; startDate: string; endDate: string; rulesHouses: number[] }[] = [];
    if (cur?.startDate && cur?.endDate) {
      // Every pratyantar that OVERLAPS the month (starts before month-end AND ends after month-start).
      for (const pp of pratyantardashaList(cur.antardasha, cur.startDate, cur.endDate)) {
        if (pp.startDate <= scan.monthEnd && pp.endDate > scan.monthStart) {
          subPeriods.push({ lord: pp.lord, startDate: pp.startDate, endDate: pp.endDate, rulesHouses: rulesHouses(pp.lord, lagna) });
        }
      }
    }
    monthArc = { month: scan.month, monthStart: scan.monthStart, monthEnd: scan.monthEnd, subPeriods, events: scan.events };
  }

  // Mercury's graded retrograde phase (David: not a binary flag — name the pre-shadow / stationing /
  // deep retrograde / retroshade). Attached ONLY when Mercury is NOT plain-direct, so direct days keep
  // their input hash unchanged (no needless read regeneration — only the ~monthly shadow window busts).
  const merRx = await mercuryRxState(dateStr);
  const mercuryRx = merRx.phase !== "direct"
    ? { phase: merRx.phase, strength: +merRx.strength.toFixed(2), retrograde: merRx.retrograde }
    : null;

  // Name is intentionally omitted so the model writes in second person ("you").
  // Natal retrograde count (excluding the nodes, which are always retrograde) —
  // a retrograde-heavy chart carries the "old soul" reading (see prompt).
  return { subject: { profileId: p.id }, date: dateStr, natal, natalRetrogradeCount, profection, dasha, transits, panchang, recentReads, humanTime, timeLordTransit, arc, ...(natalCondition ? { natalCondition } : {}), ...(dayFilterBlock ? { dayFilter: dayFilterBlock } : {}), ...(meridianAxis ? { meridianAxis } : {}), ...(nodalAxis ? { nodalAxis } : {}), ...(knots ? { knots } : {}), ...(openWindows ? { openWindows } : {}), ...(reading ? { reading } : {}), ...(mercuryRx ? { mercuryRx } : {}), ...(lifeAreaLens ? { lifeAreaLens } : {}), ...(eclipseSeasonArc ? { eclipseSeasonArc } : {}), ...(mercuryRxArc ? { mercuryRxArc } : {}), ...(planetRxArc ? { planetRxArc } : {}), ...(monthArc ? { monthArc } : {}) };
}
