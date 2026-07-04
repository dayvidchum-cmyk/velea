/**
 * HORA — the planetary hour. The intraday layer: "is this particular hour good,
 * within today's focus?" (David's framework). It MODIFIES timing within the day;
 * it does not set or flip the day's mode.
 *
 * Lord sequence (unambiguous):
 *   • The day (sunrise → next sunrise) holds 24 horas.
 *   • The FIRST hora at sunrise is ruled by the WEEKDAY LORD
 *     (Sun→Sun, Mon→Moon, Tue→Mars, Wed→Mercury, Thu→Jupiter, Fri→Venus, Sat→Saturn).
 *   • Each subsequent hora follows the CHALDEAN order:
 *     Saturn → Jupiter → Mars → Sun → Venus → Mercury → Moon (repeating).
 *   Because 24 ≡ 3 (mod 7), the next sunrise's first hora advances 3 in the
 *   Chaldean order — which reproduces the weekday sequence exactly (proven).
 *
 * Timing convention (CHOSEN — flag for David): DAY/NIGHT SPLIT, matching the
 * existing Pancha Pakshi yama system — daytime (sunrise→sunset) ÷ 12 and nighttime
 * (sunset→next sunrise) ÷ 12, so day-horas and night-horas differ in length. (The
 * alternative is 24 equal parts of sunrise→sunrise; a one-line switch if a
 * reference panchang uses that instead.)
 *
 * Deterministic; sunrise/sunset reuse the validated `sunTimesJD` from yamas.ts.
 */
import { sunTimesJD } from "../panchapakshi/yamas.js";

export type Planet = "Sun" | "Moon" | "Mars" | "Mercury" | "Jupiter" | "Venus" | "Saturn";

// Chaldean order — the hora sequence.
export const CHALDEAN: Planet[] = ["Saturn", "Jupiter", "Mars", "Sun", "Venus", "Mercury", "Moon"];
// Weekday lord, indexed by JS getUTCDay() (0 = Sunday … 6 = Saturday).
export const WEEKDAY_LORD: Planet[] = ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn"];

// Broad benefic/neutral/malefic tone of each hora lord (for the "is this hour
// favorable" read). Exposed, not wired into any mode logic.
export const HORA_TONE: Record<Planet, { tone: "benefic" | "neutral" | "malefic"; good: string }> = {
  Jupiter: { tone: "benefic", good: "growth, learning, money matters, anything you want to expand" },
  Venus: { tone: "benefic", good: "relationships, art, money, comfort, negotiation" },
  Mercury: { tone: "benefic", good: "communication, writing, trade, quick tasks, study" },
  Moon: { tone: "neutral", good: "care, home, emotional work, the public, fluid tasks" },
  Sun: { tone: "neutral", good: "authority, visibility, health, dealing with those in charge" },
  Mars: { tone: "malefic", good: "hard effort, competition, cutting, surgery — not gentleness" },
  Saturn: { tone: "malefic", good: "discipline, endings, structure, slow patient labor — not launches" },
};

const jdToMs = (jd: number) => (jd - 2440587.5) * 86400000;

export interface Hora {
  index: number;        // 0..23 from sunrise
  lord: Planet;
  phase: "day" | "night";
  tone: "benefic" | "neutral" | "malefic";
  startMs: number;      // epoch ms (UTC)
  endMs: number;
}

/**
 * The 24 horas for the civil date whose SUNRISE begins the sequence.
 * Day = 12 horas over sunrise→sunset; night = 12 over sunset→next sunrise.
 */
export function computeHoras(year: number, month: number, day: number, lat: number, lon: number): Hora[] {
  const today = sunTimesJD(year, month, day, lat, lon);
  const d = new Date(Date.UTC(year, month - 1, day + 1));
  const next = sunTimesJD(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate(), lat, lon);

  const sunrise = jdToMs(today.rise), sunset = jdToMs(today.set), nextSunrise = jdToMs(next.rise);
  const dayLen = (sunset - sunrise) / 12, nightLen = (nextSunrise - sunset) / 12;

  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  const startIdx = CHALDEAN.indexOf(WEEKDAY_LORD[weekday]); // Chaldean position of the first hora's lord

  const horas: Hora[] = [];
  for (let k = 0; k < 24; k++) {
    const lord = CHALDEAN[(startIdx + k) % 7];
    const phase: "day" | "night" = k < 12 ? "day" : "night";
    const start = k < 12 ? sunrise + dayLen * k : sunset + nightLen * (k - 12);
    const end = k < 12 ? sunrise + dayLen * (k + 1) : sunset + nightLen * (k - 12 + 1);
    horas.push({ index: k, lord, phase, tone: HORA_TONE[lord].tone, startMs: start, endMs: end });
  }
  return horas;
}

/** The hora active at epoch-ms `nowMs`, or null if outside this date's window. */
export function horaAt(horas: Hora[], nowMs: number): Hora | null {
  return horas.find((h) => nowMs >= h.startMs && nowMs < h.endMs) ?? null;
}
