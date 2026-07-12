/**
 * DAY-READ SIGNALS — the deterministic precision layer for the "pick a date" horoscope (Step 4).
 *
 * The year deep-read is forbidden from talking about the day (SCOPE: THIS IS THE YEAR). This
 * assembles the OTHER thing: the SELECTED date's actual sky read against the native's chart, with
 * the precision engine on top — Bhava Chalit houses, Ashtakavarga grading, Tara/Chandra Bala.
 *
 * The model (David's): protagonist = the native's core (Lagna + Moon + Sun). Setting = the day's
 * transits. Every transit passes two filters — the native's lens (its chalit house + AV bindus +
 * whether it touches a natal point) and the collective sky (its own live condition: retro/combust/
 * dignity). The Moon is the day's TRIGGER (tara + chandra + the house it lights). One dasha line is
 * the arc. No time lord as subject.
 *
 * Pure-ish: birth data + a date in, structured signals out. No prose, no LLM.
 */
import { calculateBirthChart } from "../birthchart/calculator.js";
import { computeBhavaCusps, placeInBhava } from "../vedic/bhava-chalit.js";
import { ashtakavargaFromLongitudes, transitStrength, signOf, type Graha } from "../vedic/ashtakavarga.js";
import { dignityOf } from "../vedic/dignity.js";
import { tarabala, chandrabala, crownDay, type CrownRating } from "../panchang/crown.js";
import { calculateDashaTimeline, currentPratyantardasha } from "../dasha-calculator.js";

const ZOD = ["Aries","Taurus","Gemini","Cancer","Leo","Virgo","Libra","Scorpio","Sagittarius","Capricorn","Aquarius","Pisces"];
const NAK = ["Ashwini","Bharani","Krittika","Rohini","Mrigashira","Ardra","Punarvasu","Pushya","Ashlesha","Magha","Purva Phalguni","Uttara Phalguni","Hasta","Chitra","Swati","Vishakha","Anuradha","Jyeshtha","Mula","Purva Ashadha","Uttara Ashadha","Shravana","Dhanishtha","Shatabhisha","Purva Bhadrapada","Uttara Bhadrapada","Revati"];
const GRAHAS: Graha[] = ["Sun","Moon","Mars","Mercury","Jupiter","Venus","Saturn"];
// Transit "cast" — fast movers first (they carry the day), then slow + nodes.
const CAST = ["Sun","Mercury","Venus","Mars","Jupiter","Saturn","Rahu","Ketu"];

// Exaltation / debilitation / own signs (rasi dignity) — the collective-sky condition of a transit.
const DIGN: Record<string, { ex: string; de: string; own: string[] }> = {
  Sun: { ex: "Aries", de: "Libra", own: ["Leo"] },
  Moon: { ex: "Taurus", de: "Scorpio", own: ["Cancer"] },
  Mars: { ex: "Capricorn", de: "Cancer", own: ["Aries", "Scorpio"] },
  Mercury: { ex: "Virgo", de: "Pisces", own: ["Gemini", "Virgo"] },
  Jupiter: { ex: "Cancer", de: "Capricorn", own: ["Sagittarius", "Pisces"] },
  Venus: { ex: "Pisces", de: "Virgo", own: ["Taurus", "Libra"] },
  Saturn: { ex: "Libra", de: "Aries", own: ["Capricorn", "Aquarius"] },
};
function dignityOf(planet: string, sign: string): string | null {
  const d = DIGN[planet];
  if (!d) return null;
  if (sign === d.ex) return "exalted";
  if (sign === d.de) return "debilitated";
  if (d.own.includes(sign)) return "own sign";
  return null;
}

const norm = (x: number) => ((x % 360) + 360) % 360;
const nakIdx = (name: string) => NAK.findIndex((n) => n.toLowerCase() === String(name).toLowerCase());
/** Smallest separation between two longitudes, 0..180. */
const sep = (a: number, b: number) => { const d = norm(a - b); return Math.min(d, 360 - d); };

export interface DayReadSignals {
  date: string;
  rating: CrownRating;
  moon: {
    sign: string; nakshatra: string;
    chalitHouse: number; wholeSignHouse: number; shifted: boolean;
    tara: { num: number; name: string; quality: string; favorable: boolean };
    chandra: { house: number; quality: string; favorable: boolean };
    /** The natal Moon's DIGNITY — so the read never calls a debilitated-but-cancelled Moon "weak".
     *  hardWon = debilitated AND neecha-bhanga cancelled (the fall-then-rise; carry it as its own
     *  flavor, not a deficit). */
    dignity: { state: string; debilitated: boolean; cancelled: boolean; hardWon: boolean };
  };
  transits: Array<{
    planet: string; sign: string;
    chalitHouse: number; wholeSignHouse: number; shifted: boolean;
    fromMoon: number; fromSun: number; // Tripada gochar — the house counted from the natal Moon / Sun
    retrograde: boolean; combust: boolean; dignity: string | null;
    av: { bhinna: number; sarva: number; support: "high" | "neutral" | "low" } | null;
    hitsNatal: { planet: string; orbDeg: number } | null;
  }>;
  arc: { mahadasha: string; antardasha: string; pratyantar: string | null };
}

export interface BirthInput { birthDate: string; birthTime: string; lat: number; lon: number; tz: string; }

const AV_BASELINE = 337 / 12;
const support = (sarva: number): "high" | "neutral" | "low" =>
  sarva >= AV_BASELINE + 2 ? "high" : sarva <= AV_BASELINE - 4 ? "low" : "neutral";

/** Assemble the full day-read signal set for a birth chart on a given date (YYYY-MM-DD). */
export async function dayReadSignalsForBirth(birth: BirthInput, date: string): Promise<DayReadSignals> {
  const natal: any = await calculateBirthChart(birth.birthDate, birth.birthTime, birth.lat, birth.lon, birth.tz, { lagnaBasis: "ascendant" });
  // The day's sky at noon UTC — same convention the calendar/crown layer uses.
  const day: any = await calculateBirthChart(date, "12:00", 0, 0, "UTC");

  const ascLon = natal.lagna.longitude as number;
  const mcLon = natal.mc?.longitude ?? null;
  const cusps = computeBhavaCusps(ascLon, mcLon);
  const lagnaSignIdx = signOf(ascLon);

  const natalLon: Record<Graha, number> = {
    Sun: natal.sun.longitude, Moon: natal.moon.longitude, Mars: natal.mars.longitude, Mercury: natal.mercury.longitude,
    Jupiter: natal.jupiter.longitude, Venus: natal.venus.longitude, Saturn: natal.saturn.longitude,
  };
  const av = ashtakavargaFromLongitudes(natalLon, ascLon);

  // Every natal point (incl. nodes) for transit-hit detection.
  const natalPoints: Record<string, number> = { ...natalLon, Rahu: natal.rahu.longitude, Ketu: natal.ketu.longitude, Lagna: ascLon };

  // ── The Moon: the day's TRIGGER ──
  const natalMoonNak = nakIdx(natal.moon.nakshatra);
  const natalMoonSignIdx = signOf(natal.moon.longitude);
  const natalSunSignIdx = signOf(natal.sun.longitude);
  const houseFrom = (refSignIdx: number, lon: number) => ((signOf(lon) - refSignIdx + 12) % 12) + 1;
  const dayMoonNak = nakIdx(day.moon.nakshatra);
  const dayMoonSignIdx = signOf(day.moon.longitude);
  const moonPlace = placeInBhava(cusps, day.moon.longitude, ascLon);
  const tb = tarabala(natalMoonNak, dayMoonNak);
  const cb = chandrabala(natalMoonSignIdx, dayMoonSignIdx);

  // ── The transits: the SETTING, each filtered by the native's lens + its live condition ──
  const daySunLon = day.sun.longitude as number;
  const transits = CAST.map((planet) => {
    const lon = day[planet.toLowerCase()].longitude as number;
    const sign = ZOD[signOf(lon)];
    const place = placeInBhava(cusps, lon, ascLon);
    const isGraha = (GRAHAS as string[]).includes(planet);
    const t = isGraha ? transitStrength(av, planet as Graha, lon) : null;
    const retro = !!day[planet.toLowerCase()].isRetrograde;
    const combust = planet !== "Sun" && sep(lon, daySunLon) < 8;
    // Nearest natal point within 4° (a live contact).
    let hit: { planet: string; orbDeg: number } | null = null;
    for (const [np, nlon] of Object.entries(natalPoints)) {
      const orb = sep(lon, nlon);
      if (orb <= 4 && (!hit || orb < hit.orbDeg)) hit = { planet: np, orbDeg: +orb.toFixed(1) };
    }
    return {
      planet, sign,
      chalitHouse: place.bhava, wholeSignHouse: place.wholeSignHouse, shifted: place.shifted,
      fromMoon: houseFrom(natalMoonSignIdx, lon), fromSun: houseFrom(natalSunSignIdx, lon),
      retrograde: retro, combust, dignity: dignityOf(planet, sign),
      av: t ? { bhinna: t.bhinna, sarva: t.sarva, support: support(t.sarva) } : null,
      hitsNatal: hit,
    };
  });

  // ── The arc: one line, from the operative dasha (down to pratyantar) ──
  const tl = calculateDashaTimeline(birth.birthDate, natal.moon.nakshatra || "", natal.moon.sign, String(natal.moon.degree ?? "0"), date, String(natal.moon.longitude));
  const cur = tl.entries.find((e: any) => e.startDate <= date && date <= e.endDate);
  const praty = cur ? currentPratyantardasha(cur.antardasha, cur.startDate, cur.endDate, date) : null;

  // ── The rating (agrees with the calendar) ──
  const T: Record<string, number> = {};
  for (const p of GRAHAS) T[p] = signOf(day[p.toLowerCase()].longitude);
  const cd = crownDay({
    birthNakIdx: natalMoonNak, natalMoonSignIdx, lagnaSignIdx,
    sunLon: day.sun.longitude, moonLon: day.moon.longitude, transitSignByPlanet: T, ashtakavarga: av,
  });

  return {
    date,
    rating: cd.rating,
    moon: {
      sign: ZOD[dayMoonSignIdx], nakshatra: day.moon.nakshatra,
      chalitHouse: moonPlace.bhava, wholeSignHouse: moonPlace.wholeSignHouse, shifted: moonPlace.shifted,
      tara: { num: tb.taraNum, name: tb.name, quality: tb.quality, favorable: tb.favorable },
      chandra: { house: cb.house, quality: cb.quality, favorable: cb.favorable },
      dignity: (() => {
        const md = dignityOf("Moon", natalLon, ascLon);
        const cancelled = md.neechaBhanga?.cancelled ?? false;
        return { state: md.state, debilitated: md.debilitated, cancelled, hardWon: md.debilitated && cancelled };
      })(),
    },
    transits,
    arc: { mahadasha: cur?.mahadasha ?? "?", antardasha: cur?.antardasha ?? "?", pratyantar: praty?.lord ?? null },
  };
}
