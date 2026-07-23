/**
 * Vimshottari Dasha Calculator
 *
 * Calculates the full 120-year Vimshottari dasha timeline for a given birth.
 * The Moon's nakshatra at birth determines the starting dasha planet and the
 * elapsed fraction of that dasha already consumed at birth.
 *
 * Sequence: Ketu(7) → Venus(20) → Sun(6) → Moon(10) → Mars(7) →
 *           Rahu(18) → Jupiter(16) → Saturn(19) → Mercury(17) = 120 years
 */

// ── CONSTANTS ──────────────────────────────────────────────────────────────

const NAKSHATRA_SPAN = 13.333333; // degrees per nakshatra (13°20')

/** 27 Nakshatras in sidereal order (0° Aries = start of Ashwini) — the single canonical table. */
import { NAK27 as NAKSHATRAS } from "./vedic/nakshatra-names.js";

/** Vedic zodiac signs in sidereal order */
const VEDIC_SIGNS = [
  "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
  "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces",
];

/**
 * Each nakshatra's ruling planet (dasha lord) in the Vimshottari system.
 * Nakshatras 0-26 map to their dasha lords.
 */
const NAKSHATRA_DASHA_LORD: Record<string, string> = {
  "Ashwini":          "Ketu",
  "Bharani":          "Venus",
  "Krittika":         "Sun",
  "Rohini":           "Moon",
  "Mrigashira":       "Mars",
  "Ardra":            "Rahu",
  "Punarvasu":        "Jupiter",
  "Pushya":           "Saturn",
  "Ashlesha":         "Mercury",
  "Magha":            "Ketu",
  "Purva Phalguni":   "Venus",
  "Uttara Phalguni":  "Sun",
  "Hasta":            "Moon",
  "Chitra":           "Mars",
  "Swati":            "Rahu",
  "Vishakha":         "Jupiter",
  "Anuradha":         "Saturn",
  "Jyeshtha":         "Mercury",
  "Mula":             "Ketu",
  "Purva Ashadha":    "Venus",
  "Uttara Ashadha":   "Sun",
  "Shravana":         "Moon",
  "Dhanishtha":       "Mars",
  "Shatabhisha":      "Rahu",
  "Purva Bhadrapada": "Jupiter",
  "Uttara Bhadrapada":"Saturn",
  "Revati":           "Mercury",
};

/** Vimshottari dasha sequence with durations in years */
const DASHA_SEQUENCE: { planet: string; years: number }[] = [
  { planet: "Ketu",    years: 7  },
  { planet: "Venus",   years: 20 },
  { planet: "Sun",     years: 6  },
  { planet: "Moon",    years: 10 },
  { planet: "Mars",    years: 7  },
  { planet: "Rahu",    years: 18 },
  { planet: "Jupiter", years: 16 },
  { planet: "Saturn",  years: 19 },
  { planet: "Mercury", years: 17 },
];

// ── TYPES ──────────────────────────────────────────────────────────────────

export interface DashaEntry {
  mahadasha: string;
  antardasha: string;
  startDate: string;   // YYYY-MM-DD
  endDate: string;     // YYYY-MM-DD
  startAge: string;    // e.g. "38y 4m 14d"
  duration: string;    // e.g. "19m 0d"
  isCurrent: boolean;
}

export interface DashaTimeline {
  entries: DashaEntry[];
  currentMahadasha: string | null;
  currentAntardasha: string | null;
  moonNakshatra: string;
  startingDashaLord: string;
}

// ── HELPERS ────────────────────────────────────────────────────────────────

/**
 * Add fractional years to a Date, returning a new Date.
 * Uses millisecond arithmetic for precision.
 */
function addYears(date: Date, years: number): Date {
  const MS_PER_YEAR = 365.25 * 24 * 60 * 60 * 1000;
  return new Date(date.getTime() + years * MS_PER_YEAR);
}

/**
 * Format a Date as YYYY-MM-DD string.
 */
function toDateString(date: Date): string {
  // audit LOW: the dates here are UTC-constructed (new Date(birth + "T00:00:00Z") advanced by ms),
  // so read them back in UTC. A no-op on the UTC prod server; correct if the server TZ ever changes
  // (local getters would otherwise shift the boundary by up to a day and disagree with dasha-tree).
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Format a duration in years as "Xm Yd" (months and days).
 * Uses approximate month = 30.4375 days.
 */
function formatDuration(years: number): string {
  const totalDays = Math.round(years * 365.25);
  const months = Math.floor(totalDays / 30.4375);
  const days = Math.round(totalDays - months * 30.4375);
  return `${months}m ${days}d`;
}

/**
 * Format the age at a given date relative to birth date.
 * Returns e.g. "38y 4m 14d" or "birth" if same day.
 */
function formatAge(birthDate: Date, targetDate: Date): string {
  const diffMs = targetDate.getTime() - birthDate.getTime();
  if (diffMs <= 0) return "birth";
  const totalDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));
  const years = Math.floor(totalDays / 365.25);
  const remainingDays = totalDays - Math.floor(years * 365.25);
  const months = Math.floor(remainingDays / 30.4375);
  const days = Math.round(remainingDays - months * 30.4375);
  return `${years}y ${months}m ${days}d`;
}

/**
 * Reconstruct the full sidereal longitude (0-360°) from a sign name and
 * degree-within-sign value. This is the inverse of getLongitudeSign().
 */
function reconstructSiderealLongitude(sign: string, degreeInSign: number): number {
  const signIndex = VEDIC_SIGNS.indexOf(sign);
  if (signIndex === -1) {
    throw new Error(`Unknown sign: ${sign}`);
  }
  return signIndex * 30 + degreeInSign;
}

/**
 * Get the degree of the Moon within its nakshatra (0 to 13.333°) from
 * the full sidereal longitude.
 */
function getDegreeInNakshatra(siderealLongitude: number): number {
  return siderealLongitude % NAKSHATRA_SPAN;
}

// ── MAIN CALCULATOR ────────────────────────────────────────────────────────

/**
 * Calculate the full Vimshottari dasha timeline for a user.
 *
 * @param birthDate       Birth date in YYYY-MM-DD format
 * @param moonNakshatra   The Moon's nakshatra name at birth (e.g. "Jyeshtha")
 * @param moonSign        The Moon's zodiac sign at birth (e.g. "Scorpio")
 * @param moonDegree      The Moon's degree within its sign (0-30), stored as string in DB
 * @param today           Today's date in YYYY-MM-DD format (for isCurrent flag)
 * @param moonLongitude   Optional: full sidereal longitude (0-360°) for higher precision.
 *                        When provided, this is used directly instead of reconstructing
 *                        from sign+degree, which avoids any rounding loss.
 * @returns               Full dasha timeline with current period flagged
 */
export function calculateDashaTimeline(
  birthDate: string,
  moonNakshatra: string,
  moonSign: string,
  moonDegree: string,
  today: string,
  moonLongitude?: string | null
): DashaTimeline {
  const birth = new Date(birthDate + "T00:00:00Z");
  const todayDate = new Date(today + "T00:00:00Z");

  // ── Step 1: Determine starting dasha lord from Moon's nakshatra ──────────
  const startingLord = NAKSHATRA_DASHA_LORD[moonNakshatra];
  if (!startingLord) {
    throw new Error(`Unknown nakshatra: ${moonNakshatra}`);
  }

  // ── Step 2: Calculate elapsed fraction of starting dasha at birth ────────
  // Prefer the stored full sidereal longitude for maximum precision.
  // Fall back to reconstructing from sign + degree-within-sign if not available.
  let siderealLongitude: number;
  if (moonLongitude && moonLongitude.trim() !== '') {
    siderealLongitude = parseFloat(moonLongitude);
  } else {
    const degreeInSign = parseFloat(moonDegree);
    siderealLongitude = reconstructSiderealLongitude(moonSign, degreeInSign);
  }
  const degreeInNakshatra = getDegreeInNakshatra(siderealLongitude);
  const elapsedFraction = degreeInNakshatra / NAKSHATRA_SPAN; // 0.0 to 1.0

  // Find the starting dasha in the sequence
  const startingIndex = DASHA_SEQUENCE.findIndex(d => d.planet === startingLord);
  if (startingIndex === -1) {
    throw new Error(`Starting lord not in sequence: ${startingLord}`);
  }

  const startingDasha = DASHA_SEQUENCE[startingIndex];

  // ── Step 3: Build the full timeline ─────────────────────────────────────
  const entries: DashaEntry[] = [];

  // THE BIRTH MAHA IS BACK-DATED (audit 2026-07-17, H7). The old code tiled the birth
  // maha's antars INTO remainingYears starting at the maha lord from the birth date, so a
  // native still inside their first mahadasha got the WRONG current antar — and it disagreed
  // with the stored dasha tree (dasha-tree.ts) that the tense anchor reads, so the running
  // sub-chapter was voiced in past tense (the ghost). The classical method (matching
  // dasha-tree): the birth maha's notional start predates birth by its elapsed fraction, its
  // antars tile the FULL maha, and birth simply falls inside. Subsequent mahas are unchanged
  // (notionalStart + fullYears == birth + remainingYears, so maha 2+ start identically).
  const firstMahaYears = startingDasha.years;
  let mahaStart = addYears(birth, -(elapsedFraction * firstMahaYears));

  // Walk through all 9 mahadashas starting from the starting lord
  for (let i = 0; i < 9; i++) {
    const mahaIndex = (startingIndex + i) % 9;
    const maha = DASHA_SEQUENCE[mahaIndex];

    // Every maha uses its FULL duration; the birth maha's pre-birth portion is clipped below.
    const mahaYears = maha.years;
    const mahaEnd = addYears(mahaStart, mahaYears);

    // ── Step 4: Calculate antardashas within this mahadasha ─────────────
    // Antardasha sequence starts with the mahadasha lord itself.
    const antarStart = mahaIndex;
    let antarDate = mahaStart;

    for (let j = 0; j < 9; j++) {
      const antarIndex = (antarStart + j) % 9;
      const antar = DASHA_SEQUENCE[antarIndex];

      // Antardasha duration = (antardasha_years / 120) * FULL mahadasha_years.
      const antarYears = (antar.years / 120) * mahaYears;
      const antarEnd = addYears(antarDate, antarYears);

      // Skip antars that fully precede birth — they never happened for this native.
      if (antarEnd > birth) {
        // Display start clips to birth; isCurrent uses the TRUE (unclipped) span so the
        // running antar of a birth-maha native is detected correctly.
        const displayStart = antarDate < birth ? birth : antarDate;
        const trueStartStr = toDateString(antarDate);
        const endStr = toDateString(antarEnd);
        const isCurrent = today >= trueStartStr && today < endStr;

        entries.push({
          mahadasha: maha.planet,
          antardasha: antar.planet,
          startDate: toDateString(displayStart),
          endDate: endStr,
          startAge: formatAge(birth, displayStart),
          duration: formatDuration(antarYears),
          isCurrent,
        });
      }

      antarDate = antarEnd;
    }

    mahaStart = mahaEnd;
  }

  // ── Step 5: Find current period ─────────────────────────────────────────
  const currentEntry = entries.find(e => e.isCurrent);

  return {
    entries,
    currentMahadasha: currentEntry?.mahadasha ?? null,
    currentAntardasha: currentEntry?.antardasha ?? null,
    moonNakshatra,
    startingDashaLord: startingLord,
  };
}

/**
 * The 3rd Vimshottari level: the pratyantardasha running on `targetDate` inside a given
 * antardasha span. The antar [start, end) is divided among all 9 planets in Vimshottari
 * order, STARTING FROM THE ANTAR LORD, each getting (years/120) of the span — so the
 * pratyantars tile the antar exactly. Proportions the actual date span (ms), matching the
 * antar's own start/end so there is never drift. Returns null if the date is outside the span.
 */
/**
 * ALL nine pratyantardashas tiling a given antardasha span, in Vimshottari order from the antar lord.
 * Same proportional tiling as currentPratyantardasha, enumerated — so callers can list the sub-periods
 * overlapping a window without walking by date boundary (which is fragile at the day-rounded edges).
 */
export function pratyantardashaList(
  antarLord: string,
  antarStartStr: string,
  antarEndStr: string,
): { lord: string; startDate: string; endDate: string }[] {
  const start = new Date(antarStartStr + "T00:00:00Z").getTime();
  const end = new Date(antarEndStr + "T00:00:00Z").getTime();
  const startIdx = DASHA_SEQUENCE.findIndex((d) => d.planet === antarLord);
  if (Number.isNaN(start) || Number.isNaN(end) || startIdx < 0) return [];
  const span = end - start;
  const out: { lord: string; startDate: string; endDate: string }[] = [];
  let cursor = start;
  for (let k = 0; k < 9; k++) {
    const p = DASHA_SEQUENCE[(startIdx + k) % 9];
    const pEnd = k === 8 ? end : cursor + (p.years / 120) * span;
    out.push({ lord: p.planet, startDate: toDateString(new Date(cursor)), endDate: toDateString(new Date(pEnd)) });
    cursor = pEnd;
  }
  return out;
}

export function currentPratyantardasha(
  antarLord: string,
  antarStartStr: string,
  antarEndStr: string,
  targetDate: string,
): { lord: string; startDate: string; endDate: string } | null {
  const start = new Date(antarStartStr + "T00:00:00Z").getTime();
  const end = new Date(antarEndStr + "T00:00:00Z").getTime();
  const today = new Date(targetDate + "T00:00:00Z").getTime();
  if (Number.isNaN(start) || Number.isNaN(end) || today < start || today >= end) return null;

  const span = end - start;
  const startIdx = DASHA_SEQUENCE.findIndex(d => d.planet === antarLord);
  if (startIdx < 0) return null;

  let cursor = start;
  for (let k = 0; k < 9; k++) {
    const p = DASHA_SEQUENCE[(startIdx + k) % 9];
    const pEnd = k === 8 ? end : cursor + (p.years / 120) * span; // last one snaps to end
    if (today >= cursor && today < pEnd) {
      return { lord: p.planet, startDate: toDateString(new Date(cursor)), endDate: toDateString(new Date(pEnd)) };
    }
    cursor = pEnd;
  }
  return null;
}
