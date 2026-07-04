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
  untilMs: number;         // end of the current hora
}

export async function computeGoldenHour(opts: {
  year: number; month: number; day: number; nowMs: number;
  lat: number; lon: number;
  birthNakshatra: string; birthPaksha: Paksha;
  lagnaSign: string; ascendantDegree?: string | null;
  natal: Record<string, { house: number | null; longitude: number | null }>;
}): Promise<GoldenHour | null> {
  const { year, month, day, nowMs, lat, lon } = opts;

  // 1. The hora active right now (before today's sunrise → yesterday's sequence).
  let horas = computeHoras(year, month, day, lat, lon);
  if (nowMs < horas[0].startMs) {
    const prev = new Date(Date.UTC(year, month - 1, day - 1));
    horas = computeHoras(prev.getUTCFullYear(), prev.getUTCMonth() + 1, prev.getUTCDate(), lat, lon);
  }
  const cur = horas.find((h) => nowMs >= h.startMs && nowMs < h.endMs);
  if (!cur) return null;
  const horaLord = cur.lord;

  // 2. The bird's activity at this moment.
  const master = await computeMasterMode({
    birthNakshatra: opts.birthNakshatra, birthPaksha: opts.birthPaksha,
    lat, lon, year, month, day,
  });
  const period = master?.periods.find((p) => nowMs >= p.startMs && nowMs < p.endMs);
  const category = period?.category ?? "";

  // 3. The hora lord's LIVE condition (transit dignity + combustion; retrograde is flavor).
  const pos = await getSiderealLongitudesWithSpeed(new Date(nowMs), [horaLord, "Sun"]);
  const lordLon = norm360(pos[horaLord]?.longitude ?? 0);
  const sunLon = norm360(pos.Sun?.longitude ?? 0);
  const retrograde = (pos[horaLord]?.speed ?? 0) < 0;
  const transitSign = SIGNS[Math.floor(lordLon / 30)];
  const tier = dignityTier(horaLord, transitSign, lordLon % 30);
  const combust = horaLord === "Sun" ? false : !!combustion(horaLord, lordLon, sunLon, retrograde)?.combust;

  const gate = gateFromInputs(period?.quality ?? "avoid", tier, combust);

  // 4. What it points to for THIS chart + where it is now.
  const lagnaLon = norm360(SIGNS.indexOf(opts.lagnaSign) * 30 + (opts.ascendantDegree ? parseFloat(opts.ascendantDegree) : 0));
  return {
    isGolden: gate.isGolden,
    horaLord, category,
    birdFavorable: gate.birdFavorable,
    lordFavorable: gate.lordFavorable,
    dignity: tier ?? "—", combust, retrograde, transitSign,
    rulesHouses: housesRuledFromLagna(opts.lagnaSign, horaLord),
    occupiesHouse: opts.natal[horaLord]?.house ?? null,
    transitHouse: houseFromLagna(lagnaLon, lordLon),
    untilMs: cur.endMs,
  };
}
