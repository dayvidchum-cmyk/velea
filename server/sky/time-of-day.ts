// Time-of-day bucket for the celestial (Stage) artwork. The sky images come in
// dawn / day / dusk / night variants; here we pick which one matches the viewer's
// CURRENT hour against the REAL sunrise/sunset at their location — so the shell
// breathes with the actual sky rather than a fixed symbolic order.
//
// Reuses the validated sunrise/sunset solver (sunTimesJD, same one hora/yamas use).

import { sunTimesJD } from "../panchapakshi/yamas.js";

export type TimeOfDay = "dawn" | "day" | "dusk" | "night";

const jdToMs = (jd: number) => (jd - 2440587.5) * 86400000;
const H = 60 * 60 * 1000;

/**
 * Bucket a moment into dawn / day / dusk / night at a location.
 *   dawn  = the ~90-min window bracketing sunrise (sunrise ±45m)
 *   dusk  = the ~90-min window bracketing sunset  (sunset  ±45m)
 *   day   = between dawn and dusk
 *   night = everything else
 * Location defaults to Boston (the app default) when unknown.
 */
export function timeOfDayAt(nowMs: number, lat = 42.3601, lon = -71.0589): TimeOfDay {
  const d = new Date(nowMs);
  const { rise, set } = sunTimesJD(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate(), lat, lon);
  const riseMs = jdToMs(rise);
  const setMs = jdToMs(set);

  if (nowMs >= riseMs - 0.75 * H && nowMs < riseMs + 0.75 * H) return "dawn";
  if (nowMs >= riseMs + 0.75 * H && nowMs < setMs - 0.75 * H) return "day";
  if (nowMs >= setMs - 0.75 * H && nowMs < setMs + 0.75 * H) return "dusk";
  return "night";
}

/** Insert the time-of-day suffix into a celestial filename: "x.jpg" → "x-night.jpg". */
export function withTimeOfDay(image: string, tod: TimeOfDay): string {
  return image.replace(/\.(jpg|jpeg|png|webp)$/i, `-${tod}.$1`);
}
