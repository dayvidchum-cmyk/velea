/**
 * GOLDEN HOUR — the fusion of the two intraday layers (Hora × Pañcapakṣi / Time Master).
 *
 * A moment is "golden" when BOTH agree:
 *   1. The bird (Pañcapakṣi) is favorable — its current yama quality is golden or good
 *      (Succeed / Energize / Action; Action counts only in Krishna paksha).
 *   2. The hora lord is favorable by LIVE CONDITION — not debilitated and not combust.
 *      Retrograde NEVER disqualifies (it is the "re-" flavor: rework/redo/reassess).
 *      Neutral/enemy dignity still opens the gate; strong dignity only gets mentioned.
 *
 * When golden, the hora lord NAMES what it is golden for: the natal houses it rules from
 * the lagna + the house it occupies natally. Its live transit house colors it further.
 *
 * Fully deterministic (dignity tables + ephemeris), no LLM. Pure decision helpers
 * (gateFromInputs, housesRuledFromLagna) are exported for the proof test.
 */
import { computeHoras } from "../panchang/hora.js";
import { computeMasterMode } from "./compute.js";
import { dignityTier, signsRuledBy, SIGNS } from "../panchang/dignity.js";
import { combustion } from "../panchang/affliction.js";
import { getSiderealLongitudesWithSpeed } from "../vedic/natal-chart-engine.js";
import type { Paksha } from "./tables.js";

const norm360 = (x: number) => ((x % 360) + 360) % 360;

/** The gate, as pure logic: bird favorable ∧ hora-lord favorable (not debilitated, not combust). */
export function gateFromInputs(quality: string, tier: string | null, combust: boolean) {
  const birdFavorable = quality === "golden" || quality === "good";
  const lordFavorable = tier !== "debilitated" && !combust;
  return { birdFavorable, lordFavorable, isGolden: birdFavorable && lordFavorable };
}

/** Whole-sign houses a planet rules, counted from the lagna sign. */
export function housesRuledFromLagna(lagnaSign: string, planet: string): number[] {
  const l = SIGNS.indexOf(lagnaSign);
  if (l < 0) return [];
  return signsRuledBy(planet)
    .map((s) => ((SIGNS.indexOf(s) - l + 12) % 12) + 1)
    .sort((a, b) => a - b);
}

/** Whole-sign house of a longitude from a lagna longitude (matches getPlanetHouse). */
function houseFromLagna(lagnaLon: number, lon: number): number {
  return Math.floor(norm360(lon - lagnaLon) / 30) + 1;
}

export interface GoldenHour {
  isGolden: boolean;
  horaLord: string;
  category: string;        // the bird's current activity category
  birdFavorable: boolean;
  lordFavorable: boolean;
  dignity: string;         // live transit dignity tier
  combust: boolean;
  retrograde: boolean;
  transitSign: string;
  rulesHouses: number[];   // natal houses the lord rules from the lagna
  occupiesHouse: number | null; // natal house the lord sits in
  transitHouse: number;    // house the lord is transiting now
  nextGoldenMs: number | null;    // start of the next golden window today (null = none left)
  nextGoldenEndMs: number | null; // end of that window
  nextGoldenPeakMs: number | null;    // strongest apahara sub-window inside that golden window
  nextGoldenPeakEndMs: number | null;
  subNow: { bird: string; activity: string; relation: string; power: number; endMs: number } | null; // the apahara live right now
  untilMs: number;         // end of the current hora
}

/**
 * Shared per-day context — the hora sequence, the bird's activity, live planet conditions,
 * and the golden predicate. Both the live "golden now" read (computeGoldenHour) and the
 * per-hora "plan ahead" flags (computeGoldenHoras) build on this, so the DEFINITION of
 * golden (bird favorable ∧ hora-lord favorable) lives in exactly one place.
 */
async function buildDayContext(opts: {
  year: number; month: number; day: number; nowMs: number;
  lat: number; lon: number; birthNakshatra: string; birthPaksha: Paksha;
}) {
  const { year, month, day, nowMs, lat, lon } = opts;

  // 1. The hora sequence for the active window (before today's sunrise → yesterday's).
  let horas = computeHoras(year, month, day, lat, lon);
  if (nowMs < horas[0].startMs) {
    const prev = new Date(Date.UTC(year, month - 1, day - 1));
    horas = computeHoras(prev.getUTCFullYear(), prev.getUTCMonth() + 1, prev.getUTCDate(), lat, lon);
  }

  // 2. The bird's activity across the day — quality at any instant. Same pre-sunrise rule as
  //    the horas above: before today's sunrise we are still inside YESTERDAY's bird day, so
  //    fall back to yesterday's table (otherwise qualityAt(now) finds nothing → "avoid" and
  //    the header wrongly reports no golden window during a live pre-dawn Veleal'or).
  let master = await computeMasterMode({
    birthNakshatra: opts.birthNakshatra, birthPaksha: opts.birthPaksha,
    lat, lon, year, month, day,
  });
  let periods = master?.periods ?? [];
  if (periods.length && nowMs < periods[0].startMs) {
    const prev = new Date(Date.UTC(year, month - 1, day - 1));
    master = await computeMasterMode({
      birthNakshatra: opts.birthNakshatra, birthPaksha: opts.birthPaksha,
      lat, lon, year: prev.getUTCFullYear(), month: prev.getUTCMonth() + 1, day: prev.getUTCDate(),
    });
    periods = master?.periods ?? [];
  }
  const qualityAt = (ms: number) => periods.find((p) => ms >= p.startMs && ms < p.endMs)?.quality ?? "avoid";
  const birdFavorableAt = (ms: number) => { const q = qualityAt(ms); return q === "golden" || q === "good"; };

  // 3. Live condition of every classical planet in ONE ephemeris batch (dignity + combustion
  //    are effectively stable across a single day, so we reuse them when scanning forward).
  const HORA_PLANETS = ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn"];
  const pos = await getSiderealLongitudesWithSpeed(new Date(nowMs), HORA_PLANETS);
  const sunLon = norm360(pos.Sun?.longitude ?? 0);
  const condOf = (planet: string) => {
    const lon2 = norm360(pos[planet]?.longitude ?? 0);
    const retro = (pos[planet]?.speed ?? 0) < 0;
    const sign = SIGNS[Math.floor(lon2 / 30)];
    const tier = dignityTier(planet, sign, lon2 % 30);
    // retrograde is flavor, never a strike; only debilitation or combustion closes the gate.
    const combust = planet === "Sun" ? false : !!combustion(planet, lon2, sunLon, retro)?.combust;
    return { lon: lon2, sign, retro, tier, combust, favorable: tier !== "debilitated" && !combust };
  };

  // The golden predicate: a hora exists AND its lord is favorable AND the bird is favorable.
  const goldenAt = (ms: number) => {
    const h = horas.find((x) => ms >= x.startMs && ms < x.endMs);
    return !!h && birdFavorableAt(ms) && condOf(h.lord).favorable;
  };

  return { horas, periods, qualityAt, birdFavorableAt, condOf, sunLon, goldenAt };
}

export async function computeGoldenHour(opts: {
  year: number; month: number; day: number; nowMs: number;
  lat: number; lon: number;
  birthNakshatra: string; birthPaksha: Paksha;
  lagnaSign: string; ascendantDegree?: string | null;
  natal: Record<string, { house: number | null; longitude: number | null }>;
}): Promise<GoldenHour | null> {
  const { nowMs } = opts;
  const { horas, periods, qualityAt, condOf, goldenAt } = await buildDayContext(opts);

  // The hora active right now.
  const cur = horas.find((h) => nowMs >= h.startMs && nowMs < h.endMs);
  if (!cur) return null;

  const cond = condOf(cur.lord);
  const gate = gateFromInputs(qualityAt(nowMs), cond.tier, cond.combust);

  // 4. The next golden WINDOW still to come today, as a true interval. Golden = bird favorable
  //    ∧ the active hora's lord favorable; both are step functions, so the window edges land on
  //    hora OR yama boundaries. Walk the segments between boundaries and take the first run.
  const bounds = new Set<number>();
  for (const h of horas) { bounds.add(h.startMs); bounds.add(h.endMs); }
  for (const p of periods) { bounds.add(p.startMs); bounds.add(p.endMs); }
  const marks = Array.from(bounds).filter((t) => t > nowMs).sort((a, b) => a - b);
  let nextGoldenMs: number | null = null, nextGoldenEndMs: number | null = null;
  let segStart = nowMs;
  for (const t of marks) {
    if (goldenAt((segStart + t) / 2)) {
      if (nextGoldenMs === null) nextGoldenMs = segStart;
      nextGoldenEndMs = t;
    } else if (nextGoldenMs !== null) {
      break; // the first upcoming golden window has closed
    }
    segStart = t;
  }

  // 4b. APAHARA sharpening (low friction, high accuracy): inside the next golden window,
  //     find the strongest sub-window — highest power wins, Enemy sub-birds are down-ranked
  //     below any non-Enemy at equal power, longer window breaks remaining ties. The header
  //     can then point at the truest minutes instead of the whole yama∩hora span.
  const subsIn = (a: number, b: number) =>
    periods.flatMap((p) => p.sub ?? []).map((sw) => ({ ...sw, startMs: Math.max(sw.startMs, a), endMs: Math.min(sw.endMs, b) }))
      .filter((sw) => sw.endMs > sw.startMs);
  let nextGoldenPeakMs: number | null = null, nextGoldenPeakEndMs: number | null = null;
  if (nextGoldenMs !== null && nextGoldenEndMs !== null) {
    const candidates = subsIn(nextGoldenMs, nextGoldenEndMs);
    candidates.sort((x, y) =>
      (y.power - (y.relation === "Enemy" ? 0.001 : 0)) - (x.power - (x.relation === "Enemy" ? 0.001 : 0)) ||
      (y.endMs - y.startMs) - (x.endMs - x.startMs));
    if (candidates.length) { nextGoldenPeakMs = candidates[0].startMs; nextGoldenPeakEndMs = candidates[0].endMs; }
  }
  const liveSub = periods.flatMap((p) => p.sub ?? []).find((sw) => nowMs >= sw.startMs && nowMs < sw.endMs) ?? null;

  // 5. What it points to for THIS chart + where it is now.
  const lagnaLon = norm360(SIGNS.indexOf(opts.lagnaSign) * 30 + (opts.ascendantDegree ? parseFloat(opts.ascendantDegree) : 0));
  return {
    isGolden: gate.isGolden,
    horaLord: cur.lord,
    category: periods.find((p) => nowMs >= p.startMs && nowMs < p.endMs)?.category ?? "",
    birdFavorable: gate.birdFavorable,
    lordFavorable: gate.lordFavorable,
    dignity: cond.tier ?? "—", combust: cond.combust, retrograde: cond.retro, transitSign: cond.sign,
    rulesHouses: housesRuledFromLagna(opts.lagnaSign, cur.lord),
    occupiesHouse: opts.natal[cur.lord]?.house ?? null,
    transitHouse: houseFromLagna(lagnaLon, cond.lon),
    nextGoldenMs, nextGoldenEndMs,
    nextGoldenPeakMs, nextGoldenPeakEndMs,
    subNow: liveSub ? { bird: liveSub.bird, activity: liveSub.activity, relation: liveSub.relation, power: liveSub.power, endMs: liveSub.endMs } : null,
    untilMs: cur.endMs,
  };
}

export interface GoldenHoraFlag {
  index: number;
  startMs: number;
  endMs: number;
  lord: string;
  isGolden: boolean;         // any golden minutes inside this hora?
  goldenStartMs: number | null; // first golden sub-run within the hora (for a precise mark)
  goldenEndMs: number | null;
}

/**
 * Per-hora golden flags for the whole active window — the Time Master "plan ahead" signal.
 * A hora is golden when its lord is favorable AND the bird is favorable somewhere inside it.
 * The lord's condition is constant across a hora, but the bird quality can flip on a yama
 * boundary MID-hora, so we segment the hora at those boundaries and take the first golden run
 * (returned as goldenStart/End for a precise mark). Same golden definition as computeGoldenHour
 * (shared buildDayContext) — one source of truth for "golden".
 */
export async function computeGoldenHoras(opts: {
  year: number; month: number; day: number; nowMs: number;
  lat: number; lon: number; birthNakshatra: string; birthPaksha: Paksha;
}): Promise<GoldenHoraFlag[]> {
  const { horas, periods, goldenAt } = await buildDayContext(opts);
  // Every yama boundary — the only places the bird quality (and thus golden-ness) can change.
  const yamaBounds = Array.from(new Set(periods.flatMap((p) => [p.startMs, p.endMs]))).sort((a, b) => a - b);

  return horas.map((h) => {
    const edges = [h.startMs, ...yamaBounds.filter((b) => b > h.startMs && b < h.endMs), h.endMs];
    let gStart: number | null = null, gEnd: number | null = null;
    for (let i = 0; i < edges.length - 1; i++) {
      const a = edges[i], b = edges[i + 1];
      if (goldenAt((a + b) / 2)) {
        if (gStart === null) gStart = a;
        gEnd = b;
      } else if (gStart !== null) {
        break; // the first golden run inside this hora has closed
      }
    }
    return { index: h.index, startMs: h.startMs, endMs: h.endMs, lord: h.lord, isGolden: gStart !== null, goldenStartMs: gStart, goldenEndMs: gEnd };
  });
}
