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
import { interpretPanchang, getNakshatraModifier, getTithiPacing, moonSignToHouse, composeInstructionFromParts, calculateFinalMode, applyWeatherGate, applyFieldKarana, generateQualifier, HOUSE_MODE, type DayField, type DayMode, type FinalMode } from './interpreter.js';
import { getPanchangByDate, upsertPanchang } from '../db.js';

// Sign name → index (must match SIGN_INDEX in interpreter.ts)
const SIGN_ORDER = ['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'];

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

// HOUSE_MODE is imported from interpreter.js (the one canonical map — audit H9).

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
export function finishDayMode(opts: {
  baseMode: import("./interpreter.js").DayMode;
  baseModeAfterSign?: import("./interpreter.js").DayMode | null; // when the Moon crosses SIGNS mid-day
  signTransitionTime?: string | null;
  tithi: string; paksha: "Shukla" | "Krishna";
  karanaName: string | null;
  sunriseNak: string; transitionTime: string | null; afterNak: string | null; sunriseLocal: string | null;
  dateStr: string; utcOffset: number;
}) {
  const readFor = (baseMode: import("./interpreter.js").DayMode, nak: string) => {
    const mr = calculateFinalMode(baseMode, nak, opts.tithi, opts.paksha);
    const adj = applyFieldKarana(mr.finalMode, mr.fieldCondition, opts.karanaName);
    return { modeReason: mr, mode: adj.mode, stepReasons: adj.reasons };
  };

  // The day as a TIMELINE (David's literal-switch school, extended to signs): the star
  // and the sign are step functions; each boundary starts a new segment. Today reads
  // the segment we are IN; other dates read the majority configuration; and EVERY
  // boundary that flips the MODE is told to the user — communication is the contract.
  const sr = parse12hLocal(opts.sunriseLocal) ?? 0;
  const minsFromSunrise = (t: string | null | undefined) => {
    const m = parse12hLocal(t);
    return m == null ? null : ((m - sr) + 1440) % 1440;
  };
  type Boundary = { at: number; label: string; kind: "star" | "sign" };
  const boundaries: Boundary[] = [];
  const starAt = minsFromSunrise(opts.transitionTime);
  if (starAt != null && opts.afterNak) boundaries.push({ at: starAt, label: opts.transitionTime!, kind: "star" });
  const signAt = minsFromSunrise(opts.signTransitionTime);
  if (signAt != null && opts.baseModeAfterSign) boundaries.push({ at: signAt, label: opts.signTransitionTime!, kind: "sign" });
  boundaries.sort((x, y) => x.at - y.at);

  // Config at a given minutes-from-sunrise
  const configAt = (m: number) => {
    let nak = opts.sunriseNak, base = opts.baseMode;
    for (const b of boundaries) {
      if (m >= b.at) {
        if (b.kind === "star" && opts.afterNak) nak = opts.afterNak;
        if (b.kind === "sign" && opts.baseModeAfterSign) base = opts.baseModeAfterSign;
      }
    }
    return { nak, base };
  };

  // THE DAY'S OWN MINUTE — the configuration ruling the MAJORITY of the vedic day, computed for
  // every date including today. This is the day-scale reading: it pairs with `houseActivated`
  // (the ruling house) and with the majority star, and it does not move as the clock moves.
  // The moment-scale `readMinute` below is a different question with a different answer, and
  // v789 proved that letting one field answer both is how a verdict ends up with two clocks.
  const majNakMin = starAt != null && starAt <= 720 && opts.afterNak ? 1441 : 0;
  const majSignMin = signAt != null && signAt <= 720 && opts.baseModeAfterSign ? 1441 : 0;
  const majorityMinute = Math.max(majNakMin, majSignMin, 0) > 0 ? 1441 : 0;

  // Which moment rules this read?
  const nowUtcMs = Date.now();
  const local = new Date(nowUtcMs + opts.utcOffset * 3600_000);
  const localDate = `${local.getUTCFullYear()}-${String(local.getUTCMonth() + 1).padStart(2, "0")}-${String(local.getUTCDate()).padStart(2, "0")}`;
  let readMinute: number;
  if (localDate === opts.dateStr) {
    // NOW — but pre-sunrise minutes belong to YESTERDAY's vedic day. The old wraparound
    // modulo mapped 1:33 AM to minute ~1216 of TODAY's table, asserting tonight's
    // boundaries ~21h early (David caught it live: "Build moves to Selective at 10:59 PM
    // — so why is Selective showing?"). Before sunrise, read the day's OPENING config;
    // the turn notes still announce what's ahead.
    const nowMin = local.getUTCHours() * 60 + local.getUTCMinutes();
    readMinute = nowMin < sr ? 0 : nowMin - sr;
  } else {
    // Majority configuration: the sign/star ruling more than half the vedic day.
    // (1441 = after all boundaries when the after-half rules; 0 = sunrise config.
    //  If only one of the two flips majority, evaluating at 1441 still applies both
    //  boundaries — acceptable: past mid-day both new configs rule the working day.)
    readMinute = majorityMinute;
  }
  const cfg = configAt(readMinute);
  const active = readFor(cfg.base, cfg.nak);

  // The notes: every boundary whose crossing CHANGES the mode gets a sentence.
  const sentences: string[] = [];
  for (const b of boundaries) {
    const before = readFor(configAt(b.at - 1).base, configAt(b.at - 1).nak).mode;
    const after = readFor(configAt(b.at).base, configAt(b.at).nak).mode;
    if (before !== after) sentences.push(`The day turns at ${b.label} — ${before} gives way to ${after}.`);
  }
  const turnsAtNote = sentences.length ? sentences.join(" ") : null;

  // The day-scale answer, always computed, never dependent on when the read happens.
  const dayCfg = configAt(majorityMinute);
  const dayActive = readFor(dayCfg.base, dayCfg.nak);
  return {
    ...active, activeNakshatra: cfg.nak, turnsAtNote,
    dayMode: dayActive.mode,
    dayModeReason: dayActive.modeReason,
    dayStepReasons: dayActive.stepReasons,
    dayNakshatra: dayCfg.nak,
  };
}

export async function getDayField(
  dateStr: string,
  forceRecalc = false,
  // REQUIRED — the resolved day-sky (see panchang/resolve-day-sky.ts). Optional-with-a-Boston-
  // default was the latent-divergence class: every caller that forgot it silently read Boston's
  // sky. Now an omission is a compile error, not a far-from-UTC user's wrong day.
  locationOverride: { lat: number; lon: number; utcOffset: number },
  lagnaOverride?: string,
  personalRating?: string | null,
  interactionMode?: FinalMode | null
): Promise<DayField | null> {
  // Check cache first
  if (!forceRecalc) {
    const cached = await getPanchangByDate(dateStr);
    if (cached && cached.calculatedAt) {
      // Return cached result as DayField.
      // Mode is ALWAYS re-derived from current rules so interpretation changes
      // are reflected without recalculating astronomy.
      // ── THE SHARED-ROW FIX (2026-07-19 audit) ────────────────────────────────────────────
      // The `panchang` table is keyed on DATE ALONE — no location column — so the row is written
      // by whoever opens that date FIRST, at THEIR coordinates. This branch already recomputes the
      // sunrise star, the transitions and the karana for the CALLER's location, but it used to keep
      // serving the stored dominant nakshatra, tithi, paksha and Moon sign. Those are precisely the
      // fields that decide the day's CLASSICAL NATURE (input-builder feeds panchang.nakshatra
      // straight into the muhurta day filter) and the activated house — so a Boston-written row set
      // the day's character for a Seoul reader, and froze it into their paid reading.
      //
      // The location-correct values were already being computed here and discarded. Now they are
      // preferred whenever the recompute succeeds; the cached values remain the fallback if it
      // throws, which is strictly better than today. No schema change, no migration — a proper
      // location-keyed cache row is still the real fix and is David's hand to run.
      let astro: Awaited<ReturnType<typeof calcPanchang>> | null = null;
      try {
        astro = await calcPanchang(dateStr, locationOverride.lat, locationOverride.lon, locationOverride.utcOffset);
      } catch {
        // Non-fatal: fall back to the stored row below. A degraded read beats no read.
      }

      const cachedPaksha = ((astro?.tithiPaksha as 'Shukla' | 'Krishna' | undefined)
        ?? (cached.tithiPaksha as 'Shukla' | 'Krishna') ?? 'Shukla');
      // The DB stores tithi WITH a paksha prefix ("Shukla Dvitiya"); the fresh-calc path returns
      // it BARE ("Dvitiya"). Normalize to bare here (data-path audit #3) so the tithi handed to
      // every consumer — and to the LLM — is shape-consistent regardless of cache state; paksha
      // travels separately in cachedPaksha.
      const cachedTithi = (astro?.tithi ?? cached.tithi ?? "").replace(/^(Shukla|Krishna)\s+/, "");
      const dominantNak = astro?.nakshatra ?? cached.nakshatra;
      const effMoonSign = (astro as any)?.moonSign ?? cached.moonSign;
      const nakshatraModifier = getNakshatraModifier(dominantNak);
      const tithiPacing = getTithiPacing(cachedTithi, cachedPaksha);

      // Re-derive house from Moon sign + active lagna (profile or user's own)
      // Using cached.houseActivated would give the wrong house if the profile's
      // lagna differs from the owner's lagna that was used when the row was stored.
      let house = cached.houseActivated ?? 1;
      if (lagnaOverride && effMoonSign) {
        const moonIdx = SIGN_ORDER.indexOf(effMoonSign);
        if (moonIdx !== -1) {
          try { house = moonSignToHouse(moonIdx, lagnaOverride); } catch { /* unknown lagna — keep cached */ }
        }
      }
      // THE TIMELINE OPENS AT SUNRISE (2026-07-20). `house` above is now the day's RULING sign
      // (majority, per David's ruling) — right for the day's house and for chandrabala. But
      // baseMode is the OPENING configuration of the intraday timeline, which then applies the
      // sign/star boundaries in order; deriving it from the ruling sign would make the day open in
      // the sign it only reaches at midday and then "flip" to itself. The timeline already picks
      // the majority-ruling mode on its own (configAt evaluates past the boundaries when the
      // after-half rules), so this must stay the sunrise config. Getting this backwards is the
      // "Build moves to Selective at 10:59 PM — so why is Selective showing?" bug.
      const sunriseSign = (astro as any)?.moonSignAtSunrise ?? effMoonSign;
      let houseAtSunrise = house;
      if (lagnaOverride && sunriseSign) {
        const srIdx = SIGN_ORDER.indexOf(sunriseSign);
        if (srIdx !== -1) {
          try { houseAtSunrise = moonSignToHouse(srIdx, lagnaOverride); } catch { /* keep */ }
        }
      }
      // TWO FIELDS, same as interpretPanchang (see there for why): the DAY's base mode comes
      // from the RULING house so it agrees with `house` above wherever the day is explained;
      // the timeline OPENS at sunrise and walks the boundaries forward from there.
      const baseMode = HOUSE_MODE[house] ?? 'Selective';
      const baseModeAtSunrise = HOUSE_MODE[houseAtSunrise] ?? baseMode;

      // Astronomy first (transitions + karana feed the mode now, not just the display).
      const utcOffset = locationOverride.utcOffset;
      let nakshatraAtSunrise = cached.nakshatra;
      let nakshatraTransitionTime: string | null = null;
      let nakshatraAfterTransition: string | null = null;
      let sunriseLocal: string | null = cached.sunrise ?? null;
      let signTransitionTime: string | null = null;
      let moonSignAfterTransition: string | null = null;
      let karana: DayField['karana'] = null;
      if (astro) {
        nakshatraAtSunrise = astro.nakshatraAtSunrise;
        nakshatraTransitionTime = astro.nakshatraTransitionTime;
        nakshatraAfterTransition = astro.nakshatraAfterTransition;
        signTransitionTime = (astro as any).signTransitionTime ?? null;
        moonSignAfterTransition = (astro as any).moonSignAfterTransition ?? null;
        sunriseLocal = astro.sunriseLocal ?? sunriseLocal;
        karana = karanaFromLongitudes(astro.sunLongitude, astro.moonLongitude);
      }

      // If the Moon crosses SIGNS this vedic day, the house — and so the base mode — flips too.
      let baseModeAfterSign: import("./interpreter.js").DayMode | null = null;
      if (moonSignAfterTransition && lagnaOverride) {
        const idx = SIGN_ORDER.indexOf(moonSignAfterTransition);
        if (idx !== -1) {
          try { baseModeAfterSign = HOUSE_MODE[moonSignToHouse(idx, lagnaOverride)] ?? null; } catch { /* keep null */ }
        }
      }

      // Literal star+sign switch + field/karana steps — the mode the day is ACTUALLY in.
      const fin = finishDayMode({
        baseMode: baseModeAtSunrise, baseModeAfterSign, signTransitionTime,
        tithi: cachedTithi, paksha: cachedPaksha, karanaName: karana?.name ?? null,
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
        tithi: cachedTithi,
        tithiPaksha: cachedPaksha,
        karana,
        sunriseLocal: cached.sunrise,
        mode: finalMode,
        baseMode,
        baseModeAtSunrise,
        finalMode,
        // The day-scale mode and its qualifier, computed at the majority configuration. The
        // narrative reads THESE; the hero and the timeline read finalMode/qualifier above.
        dayFinalMode: fin.dayMode,
        dayModeReason: fin.dayModeReason,
        dayQualifier: fin.dayStepReasons.length
          ? generateQualifier(fin.dayMode, fin.dayNakshatra, cachedTithi, cachedPaksha)
          : fin.dayModeReason.qualifier,
        qualifier: fin.stepReasons.length ? generateQualifier(finalMode, fin.activeNakshatra, cachedTithi, cachedPaksha) : modeReason.qualifier,
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
      }, personalRating, interactionMode);
    }
  }

  // Calculate fresh
  try {
    const utcOffset = locationOverride.utcOffset;
    const astro = await calcPanchang(dateStr, locationOverride.lat, locationOverride.lon, utcOffset);
    // lagnaOverride is required for house-based mode calculation.
    // If not provided, fall back to a neutral lagna that produces a generic result.
    const lagna = lagnaOverride ?? 'Aries';
    const field = interpretPanchang(astro, lagna);
    // Preserve null lagnaSign in the returned field when no user lagna is set
    if (!lagnaOverride) (field as any).lagnaSign = null;
    // Literal star switch + field/karana steps (same finisher as the cached path).
    {
      let baseModeAfterSign: import("./interpreter.js").DayMode | null = null;
      const afterSign = (astro as any).moonSignAfterTransition as string | null;
      if (afterSign && lagnaOverride) {
        const idx = SIGN_ORDER.indexOf(afterSign);
        if (idx !== -1) {
          try { baseModeAfterSign = HOUSE_MODE[moonSignToHouse(idx, lagnaOverride)] ?? null; } catch { /* keep null */ }
        }
      }
      const fin = finishDayMode({
        // The timeline OPENS at sunrise (field.baseModeAtSunrise); field.baseMode is the day's
        // ruling mode and is what the UI explains. See interpreter.ts for why these are two fields.
        baseMode: (field as any).baseModeAtSunrise ?? field.baseMode, baseModeAfterSign, signTransitionTime: (astro as any).signTransitionTime ?? null,
        tithi: field.tithi, paksha: field.tithiPaksha, karanaName: field.karana?.name ?? null,
        sunriseNak: astro.nakshatraAtSunrise, transitionTime: astro.nakshatraTransitionTime,
        afterNak: astro.nakshatraAfterTransition, sunriseLocal: astro.sunriseLocal ?? field.sunriseLocal ?? null,
        dateStr, utcOffset,
      });
      field.mode = fin.mode;
      field.finalMode = fin.mode;
      field.modeReason = fin.modeReason;
      // The day-scale pair, same finisher, evaluated at the majority configuration.
      field.dayFinalMode = fin.dayMode;
      field.dayModeReason = fin.dayModeReason;
      field.dayQualifier = fin.dayStepReasons.length
        ? generateQualifier(fin.dayMode, fin.dayNakshatra, field.tithi, field.tithiPaksha)
        : fin.dayModeReason.qualifier;
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

    return gateDayField(field, personalRating, interactionMode);
  } catch (err) {
    console.error('[Panchang] Calculation failed for', dateStr, err);
    return null;
  }
}

/** Apply the personal-weather gate to a computed DayField (see interpreter.applyWeatherGate).
 *  The qualifier keeps the original mode visible ("Contained Action") so the ledger stays honest.
 *
 *  `interactionMode` (David's two-lens precision model, 2026-07-12) is the authoritative base mode
 *  for a native WITH a birth chart — it supersedes the internal Moon-only house mode. When present
 *  it rewrites finalMode + qualifier + instruction BEFORE the weather gate, and clears the mid-day
 *  turn note (the interaction mode is a single whole-day verdict). Absent (no chart) → the Moon-only
 *  pipeline stands unchanged. */
export function gateDayField(field: DayField, personalRating?: string | null, interactionMode?: FinalMode | null): DayField {
  if (interactionMode && interactionMode !== field.finalMode) {
    const nak = field.activeNakshatra ?? field.nakshatra;
    const nakMod = getNakshatraModifier(nak);
    field = {
      ...field,
      mode: interactionMode,
      finalMode: interactionMode,
      baseMode: interactionMode,
      // A single whole-day verdict supersedes BOTH scales — otherwise the narrative would keep
      // reading the Moon-only day mode while the hero shows the interaction mode.
      dayFinalMode: interactionMode,
      dayQualifier: generateQualifier(interactionMode, nak, field.tithi, field.tithiPaksha),
      qualifier: generateQualifier(interactionMode, nak, field.tithi, field.tithiPaksha),
      nakshatraModifier: nakMod,
      instruction: composeInstructionFromParts(interactionMode, nakMod),
      turnsAtNote: null,
      modeStepReasons: [],
    };
  }
  const gate = applyWeatherGate(field.finalMode, personalRating);
  if (!gate.gated) return { ...field, weatherGated: false, weatherGateReason: null };
  // A contained day is contained ALL day, so the gate must reach the day-scale mode too — one
  // rule, both scales (the Personal Weather Gate law). Gated independently because the day mode
  // and the moment mode can differ; each is contained from its own starting point.
  const dayBase = field.dayFinalMode ?? field.finalMode;
  const dayGate = applyWeatherGate(dayBase, personalRating);
  return {
    ...field,
    mode: gate.finalMode,
    finalMode: gate.finalMode,
    dayFinalMode: dayGate.gated ? dayGate.finalMode : dayBase,
    dayQualifier: dayGate.gated ? `Contained ${dayBase}` : (field.dayQualifier ?? field.qualifier),
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
