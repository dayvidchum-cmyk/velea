/**
 * PANCHANG SERVICE
 *
 * Orchestrates the two-layer engine:
 *   1. astronomy.ts  → raw sky data (Swiss Ephemeris WASM)
 *   2. interpreter.ts → base mode + modifiers → final mode (Velea rules)
 *
 * Also handles DB caching: calculates once, stores, returns cached on repeat calls.
 */

import { calcPanchang } from './astronomy.js';
import { karanaFromLongitudes } from './karana.js';
import { interpretPanchang, getNakshatraModifier, getTithiPacing, moonSignToHouse, composeInstructionFromParts, calculateFinalMode, applyWeatherGate, applyFieldKarana, generateQualifier, type DayField, type DayMode, type FinalMode } from './interpreter.js';
import { getPanchangByDate, upsertPanchang } from '../db.js';

// Sign name → index (must match SIGN_INDEX in interpreter.ts)
const SIGN_ORDER = ['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'];

// ─── Client config ────────────────────────────────────────────────────────────

/** Boston, MA */
const PLANNER_LAT = 42.3601;
const PLANNER_LON = -71.0589;

/**
 * UTC offset for Boston:
 *   EDT (Mar–Nov) = -4
 *   EST (Nov–Mar) = -5
 * Determined dynamically from the date.
 */
export function getBostonUtcOffset(dateStr: string): number {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  // EDT: 2nd Sunday in March → 1st Sunday in November
  const edtStart = nthSundayOfMonth(y, 3, 2); // 2nd Sunday of March
  const edtEnd = nthSundayOfMonth(y, 11, 1);  // 1st Sunday of November
  return date >= edtStart && date < edtEnd ? -4 : -5;
}

function nthSundayOfMonth(year: number, month: number, n: number): Date {
  const d = new Date(year, month - 1, 1);
  const dayOfWeek = d.getDay(); // 0 = Sunday
  const firstSunday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek;
  return new Date(year, month - 1, firstSunday + (n - 1) * 7);
}

// ─── Display string ───────────────────────────────────────────────────────────

function formatDisplay(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ─── Map new mode names to legacy task mode names ─────────────────────────────

export function dayModeToTaskMode(mode: string): string {
  const map: Record<string, string> = {
    Action: 'Action',
    Build: 'Build',
    Selective: 'Selective',
    Restraint: 'Restraint',
    Flex: 'Build',
    // Legacy uppercase values
    ACTION: 'Action',
    BUILD: 'Build',
    RESTRAINT: 'Restraint',
    'SELECTIVE ACTION': 'Selective',
  };
  return map[mode] ?? 'Build';
}

// ─── House-to-mode mapping (needed for cache re-derivation) ──────────────────

const HOUSE_MODE: Record<number, DayMode> = {
  1: 'Action',
  2: 'Flex',
  3: 'Build',
  4: 'Restraint',
  5: 'Selective',
  6: 'Build',
  7: 'Selective',
  8: 'Restraint',
  9: 'Flex',
  10: 'Action',
  11: 'Action',
  12: 'Restraint',
};

// ─── Main function ────────────────────────────────────────────────────────────

/**
 * Get the day field for a given date.
 * Returns cached DB row if available, otherwise calculates and caches.
 *
 * When returning from cache, the final mode is ALWAYS re-derived from current
 * interpreter rules so that rule changes are reflected without recalculating astronomy.
 *
 * @param dateStr 'YYYY-MM-DD'
 * @param forceRecalc  If true, recalculate even if cached
 * @param locationOverride  User's location (lat, lon, utcOffset) — overrides Boston default
 * @param lagnaOverride  User's birth chart lagna sign — overrides CLIENT_LAGNA default
 */

/** Parse "5:15 AM" → minutes since midnight (null if unparseable). */
function parse12hLocal(t: string | null | undefined): number | null {
  const m = /(\d{1,2}):(\d{2})\s*(AM|PM)/i.exec(String(t ?? ""));
  if (!m) return null;
  let h = parseInt(m[1], 10) % 12;
  if (/pm/i.test(m[3])) h += 12;
  return h * 60 + parseInt(m[2], 10);
}

/** LITERAL STAR SWITCH + ACTIVE FIELD/KARANA (David's rulings 2026-07-09).
 *  Chooses the star that actually rules the read — for TODAY, the star ruling right now
 *  (before the transition = sunrise star, after = the new star); for any other date, the
 *  star ruling the MAJORITY of the day (same school as the knot layer). Recomputes the
 *  mode for that star, applies the field-condition / Vishti-karana steps, and — when the
 *  mid-day star change flips the MODE itself — emits the turn note. */
function finishDayMode(opts: {
  baseMode: import("./interpreter.js").DayMode;
  tithi: string; paksha: "Shukla" | "Krishna";
  karanaName: string | null;
  sunriseNak: string; transitionTime: string | null; afterNak: string | null; sunriseLocal: string | null;
  dateStr: string; utcOffset: number;
}) {
  const readFor = (nak: string) => {
    const mr = calculateFinalMode(opts.baseMode, nak, opts.tithi, opts.paksha);
    const adj = applyFieldKarana(mr.finalMode, mr.fieldCondition, opts.karanaName);
    return { modeReason: mr, mode: adj.mode, stepReasons: adj.reasons };
  };
  const a = readFor(opts.sunriseNak);
  if (!opts.afterNak || !opts.transitionTime) return { ...a, activeNakshatra: opts.sunriseNak, turnsAtNote: null };
  const b = readFor(opts.afterNak);

  // Which star rules this read?
  const nowUtcMs = Date.now();
  const local = new Date(nowUtcMs + opts.utcOffset * 3600_000);
  const localDate = `${local.getUTCFullYear()}-${String(local.getUTCMonth() + 1).padStart(2, "0")}-${String(local.getUTCDate()).padStart(2, "0")}`;
  const tt = parse12hLocal(opts.transitionTime);
  const sr = parse12hLocal(opts.sunriseLocal);
  let useAfter: boolean;
  if (localDate === opts.dateStr && tt != null) {
    const nowMin = local.getUTCHours() * 60 + local.getUTCMinutes();
    useAfter = nowMin >= tt; // TODAY: the star ruling right now
  } else {
    const minsUntil = tt != null && sr != null ? ((tt - sr) + 1440) % 1440 : 1440;
    useAfter = minsUntil <= 720; // other dates: majority-of-day star
  }
  const active = useAfter ? b : a;
  const turnsAtNote = a.mode !== b.mode
    ? `The day turns at ${opts.transitionTime} — ${a.mode} gives way to ${b.mode}.`
    : null;
  return { ...active, activeNakshatra: useAfter ? opts.afterNak : opts.sunriseNak, turnsAtNote };
}

export async function getDayField(
  dateStr: string,
  forceRecalc = false,
  locationOverride?: { lat: number; lon: number; utcOffset: number },
  lagnaOverride?: string,
  personalRating?: string | null
): Promise<DayField | null> {
  // Check cache first
  if (!forceRecalc) {
    const cached = await getPanchangByDate(dateStr);
    if (cached && cached.calculatedAt) {
      // Return cached result as DayField.
      // Mode is ALWAYS re-derived from current rules so interpretation changes
      // are reflected without recalculating astronomy.
      const cachedPaksha = (cached.tithiPaksha as 'Shukla' | 'Krishna') ?? 'Shukla';
      const nakshatraModifier = getNakshatraModifier(cached.nakshatra);
      const tithiPacing = getTithiPacing(cached.tithi, cachedPaksha);

      // Re-derive house from Moon sign + active lagna (profile or user's own)
      // Using cached.houseActivated would give the wrong house if the profile's
      // lagna differs from the owner's lagna that was used when the row was stored.
      let house = cached.houseActivated ?? 1;
      if (lagnaOverride && cached.moonSign) {
        const moonIdx = SIGN_ORDER.indexOf(cached.moonSign);
        if (moonIdx !== -1) {
          try { house = moonSignToHouse(moonIdx, lagnaOverride); } catch { /* unknown lagna — keep cached */ }
        }
      }
      const baseMode = HOUSE_MODE[house] ?? 'Selective';

      // Astronomy first (transitions + karana feed the mode now, not just the display).
      const utcOffset = locationOverride?.utcOffset ?? getBostonUtcOffset(dateStr);
      let nakshatraAtSunrise = cached.nakshatra;
      let nakshatraTransitionTime: string | null = null;
      let nakshatraAfterTransition: string | null = null;
      let sunriseLocal: string | null = cached.sunrise ?? null;
      let karana: DayField['karana'] = null;
      try {
        const lat = locationOverride?.lat ?? PLANNER_LAT;
        const lon = locationOverride?.lon ?? PLANNER_LON;
        const astro = await calcPanchang(dateStr, lat, lon, utcOffset);
        nakshatraAtSunrise = astro.nakshatraAtSunrise;
        nakshatraTransitionTime = astro.nakshatraTransitionTime;
        nakshatraAfterTransition = astro.nakshatraAfterTransition;
        sunriseLocal = astro.sunriseLocal ?? sunriseLocal;
        karana = karanaFromLongitudes(astro.sunLongitude, astro.moonLongitude);
      } catch {
        // Non-fatal: fall back to the cached sunrise star; no switch, no karana step.
      }

      // Literal star switch + field/karana steps — the mode the day is ACTUALLY in.
      const fin = finishDayMode({
        baseMode, tithi: cached.tithi, paksha: cachedPaksha, karanaName: karana?.name ?? null,
        sunriseNak: nakshatraAtSunrise, transitionTime: nakshatraTransitionTime,
        afterNak: nakshatraAfterTransition, sunriseLocal, dateStr, utcOffset,
      });
      const modeReason = fin.modeReason;
      const finalMode = fin.mode;
      const activeNakModifier = getNakshatraModifier(fin.activeNakshatra);
      const instruction = composeInstructionFromParts(finalMode, activeNakModifier);

      return gateDayField({
        date: cached.date,
        dayOfWeek: getDayOfWeek(dateStr),
        moonSign: cached.moonSign,
        houseActivated: house,
        nakshatra: cached.nakshatra,
        nakshatraPada: cached.nakshatraPada ?? 1,
        tithi: cached.tithi,
        tithiPaksha: cachedPaksha,
        karana,
        sunriseLocal: cached.sunrise,
        mode: finalMode,
        baseMode,
        finalMode,
        qualifier: fin.stepReasons.length ? generateQualifier(finalMode, fin.activeNakshatra, cached.tithi, cachedPaksha) : modeReason.qualifier,
        instruction,
        modeReason,
        activeNakshatra: fin.activeNakshatra,
        turnsAtNote: fin.turnsAtNote,
        modeStepReasons: fin.stepReasons,
        nakshatraModifier: activeNakModifier,
        tithiPacing,
        nakshatraAtSunrise,
        nakshatraTransitionTime,
        nakshatraAfterTransition,
        lagnaSign: lagnaOverride ?? null,
      }, personalRating);
    }
  }

  // Calculate fresh
  try {
    const utcOffset = locationOverride?.utcOffset ?? getBostonUtcOffset(dateStr);
    const lat = locationOverride?.lat ?? PLANNER_LAT;
    const lon = locationOverride?.lon ?? PLANNER_LON;
    const astro = await calcPanchang(dateStr, lat, lon, utcOffset);
    // lagnaOverride is required for house-based mode calculation.
    // If not provided, fall back to a neutral lagna that produces a generic result.
    const lagna = lagnaOverride ?? 'Aries';
    const field = interpretPanchang(astro, lagna);
    // Preserve null lagnaSign in the returned field when no user lagna is set
    if (!lagnaOverride) (field as any).lagnaSign = null;
    // Literal star switch + field/karana steps (same finisher as the cached path).
    {
      const fin = finishDayMode({
        baseMode: field.baseMode, tithi: field.tithi, paksha: field.tithiPaksha, karanaName: field.karana?.name ?? null,
        sunriseNak: astro.nakshatraAtSunrise, transitionTime: astro.nakshatraTransitionTime,
        afterNak: astro.nakshatraAfterTransition, sunriseLocal: astro.sunriseLocal ?? field.sunriseLocal ?? null,
        dateStr, utcOffset,
      });
      field.mode = fin.mode;
      field.finalMode = fin.mode;
      field.modeReason = fin.modeReason;
      if (fin.stepReasons.length) field.qualifier = generateQualifier(fin.mode, fin.activeNakshatra, field.tithi, field.tithiPaksha);
      field.nakshatraModifier = getNakshatraModifier(fin.activeNakshatra);
      field.instruction = composeInstructionFromParts(fin.mode, field.nakshatraModifier);
      field.activeNakshatra = fin.activeNakshatra;
      field.turnsAtNote = fin.turnsAtNote;
      field.modeStepReasons = fin.stepReasons;
    }

    // Cache to DB (store the finalMode as mode for backward compat)
    await upsertPanchang({
      date: dateStr,
      display: formatDisplay(dateStr),
      sunrise: field.sunriseLocal,
      moonSign: field.moonSign,
      moonLongitude: astro.moonLongitude.toFixed(4),
      houseActivated: field.houseActivated,
      nakshatra: field.nakshatra,
      nakshatraPada: field.nakshatraPada,
      tithi: `${field.tithiPaksha} ${field.tithi}`,
      tithiPaksha: field.tithiPaksha,
      mode: field.finalMode,
      instruction: field.instruction,
    });

    return gateDayField(field, personalRating);
  } catch (err) {
    console.error('[Panchang] Calculation failed for', dateStr, err);
    return null;
  }
}

/** Apply the personal-weather gate to a computed DayField (see interpreter.applyWeatherGate).
 *  The qualifier keeps the original mode visible ("Contained Action") so the ledger stays honest. */
export function gateDayField(field: DayField, personalRating?: string | null): DayField {
  const gate = applyWeatherGate(field.finalMode, personalRating);
  if (!gate.gated) return { ...field, weatherGated: false, weatherGateReason: null };
  return {
    ...field,
    mode: gate.finalMode,
    finalMode: gate.finalMode,
    qualifier: `Contained ${field.finalMode}`,
    instruction: composeInstructionFromParts(gate.finalMode, field.nakshatraModifier),
    // A contained day is contained ALL day — but the sky still turns, and that is true
    // information. The note survives the gate REWRITTEN: it names the turn while holding
    // the containment, instead of promising an "Action" the gate has already denied.
    turnsAtNote: (() => {
      const m = /turns at (.+?) —/.exec(field.turnsAtNote ?? "");
      return m ? `The sky still turns at ${m[1]} — but today is contained: the turn changes the texture, not the instruction.` : null;
    })(),
    weatherGated: true,
    weatherGateReason: gate.gateReason,
  };
}

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
function getDayOfWeek(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  return DAYS[new Date(y, m - 1, d).getDay()];
}
