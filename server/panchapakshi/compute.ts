import { calculateBirthChart } from "../birthchart/calculator.js";
import { getBird, pakshaFromSunMoon, BIRDS, type Bird, type Paksha } from "./tables.js";
import { computeYamas } from "./yamas.js";
import { BIRD_MAIN_SEQUENCES } from "./sequences.js";
import { ACTIVITIES, ACTIVITY_LABEL, quality, type Activity, type Quality } from "./activities.js";

/**
 * Master Mode — the single-track Pancha Pakshi timeline: your bird's main activity in
 * each of the day's ten yamas → a golden/red category. Your bird is fixed from birth
 * (nakshatra + birth paksha); the daily sequence keys off the query day's weekday +
 * that day's paksha (JHora semantics). Validated against the user's app (Boston, Owl).
 */

export type MasterPeriod = {
  startMs: number;
  endMs: number;
  phase: "day" | "night";
  activity: Activity;
  category: string;   // Succeed / Energize / Action / Restore / Caution
  quality: Quality;
};

export type MasterModeRead = {
  bird: Bird;
  birthPaksha: Paksha;
  dayPaksha: Paksha;   // the query day's paksha (drives the sequence)
  weekday: number;     // 0=Sunday
  periods: MasterPeriod[];
};

export async function computeMasterMode(opts: {
  birthNakshatra: string;
  birthPaksha: Paksha;
  lat: number;
  lon: number;
  year: number;
  month: number;  // 1-12
  day: number;
}): Promise<MasterModeRead | null> {
  const bird = getBird(opts.birthNakshatra, opts.birthPaksha);
  if (!bird) return null;
  const birdIdx = BIRDS.indexOf(bird);

  const weekday = new Date(Date.UTC(opts.year, opts.month - 1, opts.day)).getUTCDay(); // 0=Sun

  // The query day's paksha (waxing/waning today) — drives the sequence, not birth paksha.
  const dateStr = `${opts.year}-${String(opts.month).padStart(2, "0")}-${String(opts.day).padStart(2, "0")}`;
  const transit: any = await calculateBirthChart(dateStr, "12:00", 0, 0, "UTC");
  const dayPaksha = pakshaFromSunMoon(transit.sun.longitude, transit.moon.longitude);
  const pakshaIdx = dayPaksha === "Shukla" ? 0 : 1;

  const yamas = computeYamas(opts.year, opts.month, opts.day, opts.lat, opts.lon);
  const periods: MasterPeriod[] = yamas.map((y) => {
    const phaseIdx = y.phase === "day" ? 0 : 1;
    const yamaInPhase = y.index % 5;
    const actIdx = BIRD_MAIN_SEQUENCES[weekday][pakshaIdx][phaseIdx][birdIdx][yamaInPhase];
    const activity = ACTIVITIES[actIdx];
    return {
      startMs: y.startMs,
      endMs: y.endMs,
      phase: y.phase,
      activity,
      category: ACTIVITY_LABEL[activity],
      quality: quality(activity, dayPaksha),
    };
  });

  return { bird, birthPaksha: opts.birthPaksha, dayPaksha, weekday, periods };
}
