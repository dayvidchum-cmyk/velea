/**
 * THE RANKED SOLAR YEAR — moved here (2026-07-20) from routers.ts, where it was private to the
 * calendar. It is the ONE source of the year's crown days, and the READING needs the same answer:
 * with it living in the router, the reading had to compute its own crown, and the two definitions
 * drifted until they no longer overlapped at all (see v778).
 *
 * The move is verbatim apart from lifting the profile/user lookup out to the caller, so the
 * reading (which already holds the profile) does not repeat it. The month calendar's wrapper in
 * routers.ts still resolves the ACTIVE profile exactly as before.
 *
 * Cost: the 366-day walk measures at ~0.1s (the ephemeris calls are memoised), and the result is
 * cached in-process on the natal inputs — so putting it on the reading path is not a latency risk.
 */
import { resolveDaySky, localToday } from "../panchang/resolve-day-sky.js";
import { getTimezoneOffset } from "../panchang/tz-offset.js";
import { NAK27 as NAK } from "@shared/nakshatra-names";


// In-memory cache for the ranked solar year — the walk computes 366 day-stars.
// Keyed on the natal inputs themselves (profile, year, birth date, janma star, natal Moon sign),
// so a birth-data edit misses the cache; everything else is almanac-stable for the year.
const yearRankCache = new Map<string, any>();

/** Drop every cached year for a profile — called when its chart is recomputed, so a corrected
 *  birth time can never keep serving crown days from the chart it replaced. */
export function invalidateRankedYear(profileId: number): void {
  for (const k of Array.from(yearRankCache.keys())) {
    if (k.startsWith(`${profileId}|`)) yearRankCache.delete(k);
  }
}

/**
 * The ONE ranked solar year (birthday → birthday) for a user's active profile — the single
 * source behind the month calendar's marks AND the /year overview, so they can never tell
 * two stories (David: "one calendar", "i want the marks to reflect the calendar").
 * yearOffset: 0 = the solar year containing today, ±1 = neighbours. Cached in-memory.
 */
export async function rankedSolarYearForProfile(
  profile: any,
  user: any,
  yearOffset: number,
): Promise<any | null> {
  const { getProfileNatalBodies } = await import("../routers/profiles.js");
  if (!profile || !(profile as any).birthDate) return null;
  const bodies = await getProfileNatalBodies(profile.id);
  const ZOD = ["Aries","Taurus","Gemini","Cancer","Leo","Virgo","Libra","Scorpio","Sagittarius","Capricorn","Aquarius","Pisces"];
  const moonBody = bodies.find((b: any) => b.planet === "Moon");
  const birthNakIdx = NAK.findIndex((n) => n.toLowerCase() === String(moonBody?.nakshatra ?? "").toLowerCase());
  const natalMoonSignIdx = ZOD.indexOf(moonBody?.sign ?? "");
  if (birthNakIdx < 0 || natalMoonSignIdx < 0) return null;

  // Solar year containing today (or offset by whole years): most recent birthday → next.
  const p2 = (n: number) => String(n).padStart(2, "0");
  const [, bm, bd] = String((profile as any).birthDate).split("-").map(Number);
  // Viewer-local date, not server UTC: near the birthday, a UTC boundary hands an east/west-of-UTC
  // user the adjacent solar year's ranking for a few hours. The daily-reading path already probes
  // offsets [0,-1,1] to self-correct, but direct callers (the /year screen) trust this window.
  const [ty, tm, td] = localToday(user, profile).split("-").map(Number);
  let startYear = ty;
  if (tm < bm || (tm === bm && td < bd)) startYear -= 1;
  startYear += yearOffset;
  const yearStart = `${startYear}-${p2(bm)}-${p2(bd)}`;
  const yearEnd = `${startYear + 1}-${p2(bm)}-${p2(bd)}`;

  // LOCATION-TRUE ALMANAC (David 2026-07-16 "do it"): the panchang belongs to a PLACE —
  // the day walk runs at the resolved day-sky (current → birth → default, resolve-day-sky).
  // DST-aware offsets per date via the sky's timezone.
  const u = user;
  // NO profileId here (audit v762): the year walk wants the STABLE place. Passing it let a
  // per-date override that happens to sit on yearStart relocate the entire year's almanac.
  const sky = await resolveDaySky({ user: u, profile, dateStr: yearStart });
  const offsetFor = (date: string) => sky.timezone ? getTimezoneOffset(sky.timezone, new Date(date + "T12:00:00Z")) : sky.utcOffset;
  // Rounded to ~1km so a re-geocode of the same town never busts the year (time-stable law).
  const locKey = `${sky.lat.toFixed(2)},${sky.lon.toFixed(2)},${sky.timezone ?? sky.source}`;

  // Key includes the natal inputs — a birth-data edit changes them and misses the cache.
  // THE KEY MUST CARRY EVERYTHING THE WALK READS (2026-07-20). It carried the birth DATE and the
  // Moon's star/sign — but this function also reads birthTime, lagnaSign and ascendantDegree, via
  // the convergence timeline that supplies the windows and chains feeding the ranking. So a birth
  // TIME correction that left the Moon in the same nakshatra and sign — the common case for a small
  // fix — hit the stale entry and kept serving crown days computed from the pre-correction chart
  // until the process restarted. That matters more since v781, when the reading started taking its
  // crown from here too. Belt and braces: the key now covers them, AND a chart recompute clears the
  // profile's entries outright (invalidateRankedYear, called from recomputeProfileChart).
  const pf = profile as any;
  const cacheKey = `${profile.id}|${yearStart}|${pf.birthDate}|${pf.birthTime ?? "-"}|${pf.birthTimezone ?? "-"}|${pf.lagnaSign ?? "-"}|${pf.ascendantDegree ?? "-"}|${birthNakIdx}|${natalMoonSignIdx}|${locKey}|yr-v10`;
  const cached = yearRankCache.get(cacheKey);
  if (cached) return cached;

  // The day walk: ONE calcPanchang per day supplies the majority star (the month view's law),
  // the Moon sign, the tithi, and the karana — everything the ranking AND the day filter need.
  const { majorityStarFromAstro } = await import("../panchang/crown.js");
  const { calcPanchang } = await import("../panchang/astronomy.js");
  const { karanaFromLongitudes } = await import("../panchang/karana.js");
  const { localToUtc, planetLongitudeSpeed } = await import("../birthchart/calculator.js");
  const NAKSPAN = 360 / 27;
  const NAK27 = NAK;
  const WEEKDAY_LORD_7 = ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn"];
  const days: Array<{ date: string; dayNakIdx: number; dayMoonSignIdx: number; nakshatra: string; tithiNumber: number; vishti: boolean; varaLord: string }> = [];
  for (let ms = Date.parse(yearStart + "T00:00:00Z"); ms < Date.parse(yearEnd + "T00:00:00Z"); ms += 86400000) {
    const date = new Date(ms).toISOString().slice(0, 10);
    try {
      const astro: any = await calcPanchang(date, sky.lat, sky.lon, offsetFor(date));
      const maj = majorityStarFromAstro(astro);
      const dayNakIdx = maj ?? astro.nakshatraIndex ?? Math.floor((((astro.moonLongitude % 360) + 360) % 360) / NAKSPAN);
      const k = karanaFromLongitudes(astro.sunLongitude, astro.moonLongitude);
      const { speed: mercSpeed } = await planetLongitudeSpeed("mercury", date, 12);
      days.push({
        date,
        dayNakIdx,
        dayMoonSignIdx: astro.moonSignIndex,
        nakshatra: NAK27[dayNakIdx] ?? astro.nakshatra,
        tithiNumber: (astro.tithiIndex ?? 0) + 1,
        vishti: k.name === "Vishti",
        varaLord: WEEKDAY_LORD_7[new Date(ms).getUTCDay()],
        mercSpeed,
      } as any);
    } catch {
      // A failed almanac day ranks as its noon frame would — skip rather than fake.
    }
  }

  // Windows + chains from the stored convergence timeline; live-computed when a profile
  // hasn't stored one yet (no empty state on day one).
  const { getDb } = await import("../db.js");
  const { profileConvergence } = await import("../../drizzle/schema.js");
  const { eq: eqOp } = await import("drizzle-orm");
  let spans: Array<{ startMs: number; endMs: number; maha: string; antar: string; pratyantar: string; themes: any }> = [];
  try {
    const db = await getDb();
    const rows = db ? await db.select().from(profileConvergence).where(eqOp(profileConvergence.profileId, profile.id)) : [];
    spans = rows.map((r: any) => ({
      startMs: new Date(r.startAt).getTime(), endMs: new Date(r.endAt).getTime(),
      maha: r.maha, antar: r.antar, pratyantar: r.pratyantar, themes: JSON.parse(r.themes),
    }));
  } catch { /* table may not exist yet — fall through to live compute */ }
  if (!spans.length && moonBody && (moonBody as any).longitude != null && (profile as any).birthTime) {
    const { computeConvergenceTimeline } = await import("./convergence.js");
    const lonBy: Record<string, number> = {};
    for (const b of bodies) if ((b as any).longitude != null) lonBy[b.planet] = parseFloat(String((b as any).longitude));
    const lagIdx = ZOD.indexOf((profile as any).lagnaSign ?? "");
    if (Object.keys(lonBy).length >= 9 && lagIdx >= 0) {
      const birthUtc = localToUtc((profile as any).birthDate, (profile as any).birthTime, (profile as any).birthTimezone || "UTC");
      spans = computeConvergenceTimeline({ lonBy, lagnaLon: lagIdx * 30 + parseFloat((profile as any).ascendantDegree ?? "15"), birthUtcMs: birthUtc.getTime() })
        .map((s) => ({ startMs: s.startMs, endMs: s.endMs, maha: s.maha, antar: s.antar, pratyantar: s.pratyantar, themes: s.themes }));
    }
  }
  // Merge consecutive lit spans per theme into windows (open → close).
  const themesSeen = new Set<string>();
  for (const s of spans) for (const [k, t] of Object.entries(s.themes)) if ((t as any).lit) themesSeen.add(k);
  const windows: Array<{ theme: string; startMs: number; endMs: number }> = [];
  for (const th of Array.from(themesSeen)) {
    let open: { theme: string; startMs: number; endMs: number } | null = null;
    for (const s of spans) {
      const lit = (s.themes as any)[th]?.lit;
      if (lit && !open) open = { theme: th, startMs: s.startMs, endMs: s.endMs };
      else if (lit && open) open.endMs = s.endMs;
      else if (!lit && open) { windows.push(open); open = null; }
    }
    if (open) windows.push(open);
  }
  const chains = spans.map((s) => ({ startMs: s.startMs, endMs: s.endMs, label: `${s.maha}›${s.antar}›${s.pratyantar}` }));

  const { rankYear } = await import("./year-rank.js");
  const { dayFilter, movementOf, cappedSentence, MOVEMENT_WORD } = await import("./day-filter.js");
  const ranked = rankYear({ birthNakIdx, natalMoonSignIdx, days, windows, chains });
  // THE SIX MOVEMENTS on every ranked day (David 2026-07-15) — same law as the month view.
  const mercByDate = new Map(days.map((d: any) => [d.date, d.mercSpeed]));
  const topSet = new Set(ranked.summary.topDates);
  for (const d of ranked.days as any[]) {
    try {
      const merc = mercByDate.get(d.date);
      const c = dayFilter({
        nakshatra: d.nakshatra ?? "", tithiNumber: d.tithiNumber ?? 1,
        varaLord: d.varaLord ?? "Sun", vishti: !!d.vishti, tara: d.tara,
        dateSeed: d.date,
      });
      const mv = movementOf(c, d.tara, topSet.has(d.date), {
        mercuryRetro: merc != null && merc < 0,
        mercuryNearStation: merc != null && Math.abs(merc) < 0.15,
        chandraFavorable: !!d.chandra?.favorable,
      });
      d.movement = mv; d.movementWord = MOVEMENT_WORD[mv];
      // Moon discs for the year popup (same law as the month coins: tithi 15/30 only).
      if (d.tithiNumber === 15) d.moonPhase = "full"; else if (d.tithiNumber === 30) d.moonPhase = "new";
      if (mv === "build" && merc != null && merc < 0 && d.tara.quality === "good" && (c.nature === "movable" || c.nature === "swift")) {
        d.cappedSentence = cappedSentence(c.nature, c.headline);
      }
      if (mv === "build" || mv === "selective" || mv === "action") {
        d.depth = d.tara.quality === "good"
          ? (d.tara.taraNum >= 8 ? "deep" : "mid")
          : d.tara.taraNum === 1 ? "thin" : "leaning";
        if (mv === "build") d.buildDepth = d.depth;
      }
    } catch { /* a day without movement still ranks */ }
  }
  const result = { yearStart, yearEnd, natalMoonSignIdx, birthNakIdx, ...ranked };
  // AUDIT LOW (2026-07-18): unbounded cache of 366-day objects (profile×year×location keys) —
  // slow leak on a long-lived process. Cap with drop-oldest (Map preserves insertion order).
  if (yearRankCache.size >= 40) { const oldest = yearRankCache.keys().next().value; if (oldest !== undefined) yearRankCache.delete(oldest); }
  yearRankCache.set(cacheKey, result);
  return result;
}
