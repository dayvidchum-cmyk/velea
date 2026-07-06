/**
 * Timezone → whole-hour UTC offset, DST-correct. Shared by the panchang router (the hero's
 * day-mode) and the narrative pipeline (the day-card read) so BOTH derive "today's mode" from
 * the same location basis — otherwise the two can name different modes on the same day.
 */

export function getTimezoneOffset(timezone: string, date: Date): number {
  try {
    // Use Intl to get the offset: format a date in UTC and in the target TZ, then compare.
    // Reliable across DST transitions.
    const utcStr = date.toLocaleString("en-US", { timeZone: "UTC", hour12: false,
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit" });
    const tzStr = date.toLocaleString("en-US", { timeZone: timezone, hour12: false,
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit" });
    const utcMs = new Date(utcStr).getTime();
    const tzMs = new Date(tzStr).getTime();
    return Math.round((tzMs - utcMs) / 3600000);
  } catch {
    return getBostonOffset(date); // safe fallback
  }
}

export function getBostonOffset(date: Date): number {
  // EDT: 2nd Sunday in March → 1st Sunday in November = -4; EST otherwise = -5
  const year = date.getUTCFullYear();
  const edtStart = nthSundayUTC(year, 3, 2);
  const edtEnd = nthSundayUTC(year, 11, 1);
  return date >= edtStart && date < edtEnd ? -4 : -5;
}

export function nthSundayUTC(year: number, month: number, n: number): Date {
  const d = new Date(Date.UTC(year, month - 1, 1));
  const dow = d.getUTCDay();
  const firstSunday = dow === 0 ? 1 : 8 - dow;
  return new Date(Date.UTC(year, month - 1, firstSunday + (n - 1) * 7));
}
