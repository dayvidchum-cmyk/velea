import { z } from "zod";
import { CIRCLES } from "../shared/task-circle.js";
import { and, eq } from "drizzle-orm";
import { parse as parseCookie } from "cookie";
import { COOKIE_NAME } from "@shared/const";
import {
  createTask,
  createSubtask,
  deleteTask,
  deleteCompletedTasks,
  deleteSubtask,
  getAllSystemPrompts,
  getPanchangByDate,
  getPanchangByMonth,
  getPinnedTasksForToday,
  getSubtasksByTask,
  getTasksByUser,
  getReflectionByDate,
  getReflectionsByUser,
  toggleSubtask,
  upsertReflection,
  upsertSystemPrompt,
  panchangModeToTaskMode,
  updateTask,
  getUserById,
  updateUserLocation,
  updateUserBirthChart,
  upsertNatalBody,
  getDb,
  getProjectsByUser,
  getAllProjectsByUser,
  createProject,
  setProjectLifeAreas,
  renameProject,
  archiveProject,
  unarchiveProject,
  deleteProject,
  getTodayCheckIn,
  getCheckInAveragesForMonth,
  createCheckIn,
  getUserByEmail,
  createUserWithPassword,
  updateUserPasswordHash,
  verifyLogin,
  createSession,
  deleteSession,
  deleteAllSessionsForUser,
  deleteUserCascade,
  deleteAllSessions,
  getProjectStats,
  getProjectInsights,
  getRecommendedNextTask,
  getProjectNote,
  upsertProjectNote,
  snoozeTask,
  unsnoozeTask,
  getTaskById,
  getReferralCode,
  redeemReferralCode,
  listReferralActivity,
} from "./db";
import { getDayField, dayModeToTaskMode } from "./panchang/service.js";
import { getTimezoneOffset, getBostonOffset } from "./panchang/tz-offset.js";
import { NAKSHATRA_MODIFIERS, TITHI_PHASE_MODIFIER, STRONG_RESTRAINT_TITHIS, STRONG_RESTRAINT_ADDITIONAL_MODIFIER, FIELD_CONDITION_MODIFIERS, SELECTIVE_BIAS_STRENGTH, FLEX_RESOLUTION, CONFIDENCE_CONFIG, HOUSE_TO_BASE_MODE } from "./panchang/modifier-config.js";
import { calculateFinalMode } from "./panchang/interpreter.js";

/** Personal-weather rating (crown layer) + interaction MODE for a subject on a date — null when
 *  anchors are missing. The rating feeds the weather gate; the mode is David's two-lens precision
 *  base mode, which supersedes getDayField's Moon-only house mode for a charted native. */
async function subjectPersonalDay(
  subject: { profileId: number; lagnaSign: string | null } | null | undefined,
  dateStr: string,
): Promise<{ rating: string | null; mode: import("./panchang/interpreter.js").FinalMode | null }> {
  try {
    if (!subject?.lagnaSign) return { rating: null, mode: null };
    const { getProfileNatalBodies } = await import("./routers/profiles.js");
    const { anchorsFromBodies, personalDayForDate } = await import("./panchang/crown.js");
    const bodies = await getProfileNatalBodies(subject.profileId);
    const anchors = anchorsFromBodies(bodies as any, subject.lagnaSign);
    if (!anchors) return { rating: null, mode: null };
    const day = await personalDayForDate(anchors, dateStr);
    return { rating: day?.rating ?? null, mode: day?.mode ?? null };
  } catch { return { rating: null, mode: null }; }
}

/** Rating-only convenience for callers that don't set the mode. */
async function subjectPersonalRating(subject: { profileId: number; lagnaSign: string | null } | null | undefined, dateStr: string): Promise<string | null> {
  return (await subjectPersonalDay(subject, dateStr)).rating;
}

import { generateTimeLordInfluence } from "./panchang/time-lord-influence.js";
import { scoreTasks } from "./task-scorer.js";
import { parseLifeAreas } from "@shared/life-areas";
import { getCurrentLayers } from "./layers/index.js";
import { getCurrentSky, computeGoldenDays } from "./sky/current-sky.js";
import { computeGoldenMoment, computeVerdict } from "./sky/golden-moment.js";
import { calculateProfectionYear } from "./profection/calculator.js";
import { rateLimit } from "./_core/rateLimit.js";
import { timezoneForCoords } from "./geo/timezone.js";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { profectionRouter } from "./profection/router.js";
import { narrativeRouter } from "./narrative/router.js";
import { dashaRouter } from "./routers/dasha.js";
import { arcRouter } from "./routers/arc.js";
import { profilesRouter } from "./routers/profiles.js";
import { timeLordTransitRouter } from "./profection/transit-router.js";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { users, profiles, profileNatalBodies } from "../drizzle/schema";
import { hashPassword, verifyPassword } from "./_core/password";
import { TRPCError } from "@trpc/server";
// Bundled canon (2026-07-18): the yoga nameplates' source — a static import so esbuild
// ships it inside dist (a runtime readFileSync path silently missed in prod).
import canonYogasJson from "./vedic/canon/yogas.json";

// Time Master (Pancha Pakshi) entitlement — the private feature flag. Today this is an allowlist
// (David = user 2); later it becomes a per-user backend toggle. One source of truth so the data
// endpoints AND the `access` check (which drives the locked/unlocked UI) can never disagree.
// Entitled to Time Master + Hora: admins, testers (Lang, Lisa, and new test users), plus the original
// bootstrap IDs as a safety net. Role is the scalable path — mark a user "tester" and they're in.
const MASTER_MODE_USER_IDS = [1, 2];
const hasMasterMode = (user: { id: number; role?: string | null }) =>
  user.role === "admin" || user.role === "tester" || MASTER_MODE_USER_IDS.includes(user.id);

// Horoscope is a stricter, still-locked tier. Testers do NOT get it by default — David hasn't
// unlocked it for them (unlike Time Master/Hora, which the tester role deliberately grants). New
// premium features stay LOCKED for testers until he explicitly opens them. Only admins + the
// bootstrap allowlist. To hand Horoscope to testers later, add `user.role === "tester"` here.
// The premium reading layer: the old hard allowlist STILL wins, and the switchboard's
// "specialReadings" flag can now open it to testers/everyone (David 2026-07-16).
const hasHoroscope = async (user: { id: number; role?: string | null; email?: string | null }): Promise<boolean> => {
  if (user.role === "admin" || MASTER_MODE_USER_IDS.includes(user.id)) return true;
  const { hasFeature } = await import("./feature-flags.js");
  return hasFeature(user, "specialReadings");
};

const TaskModeEnum = z.enum(["Restraint", "Build", "Selective", "Action"]);
const PriorityEnum = z.enum(["High", "Medium", "Low"]);
const RecurrenceEnum = z.enum(["none", "daily", "weekly", "biweekly", "monthly", "yearly"]);

/** Advance a due date to the next occurrence. Overdue tasks roll from today so
 *  occurrences don't pile up in the past. Null base starts from today. */
function nextDueDate(base: string | null, recurrence: string): string {
  const today = new Date().toISOString().split("T")[0];
  const start = base && base >= today ? base : today;
  const d = new Date(start + "T00:00:00Z");
  // Month/year overflow clamp (audit L9): setUTCMonth on the 31st rolled a task due Jan 31
  // into Mar 3 (Feb has no 31st), skipping February; Feb 29 yearly rolled into Mar 1. When the
  // day changes, JS overflowed — setUTCDate(0) snaps back to the intended month's last day.
  const clampOverflow = (dayBefore: number) => { if (d.getUTCDate() !== dayBefore) d.setUTCDate(0); };
  switch (recurrence) {
    case "daily": d.setUTCDate(d.getUTCDate() + 1); break;
    case "weekly": d.setUTCDate(d.getUTCDate() + 7); break;
    case "biweekly": d.setUTCDate(d.getUTCDate() + 14); break;
    case "monthly": { const day = d.getUTCDate(); d.setUTCMonth(d.getUTCMonth() + 1); clampOverflow(day); break; }
    case "yearly": { const day = d.getUTCDate(); d.setUTCFullYear(d.getUTCFullYear() + 1); clampOverflow(day); break; }
    default: d.setUTCDate(d.getUTCDate() + 1);
  }
  return d.toISOString().split("T")[0];
}

// In-memory cache for the ranked solar year — the walk computes 366 day-stars.
// Keyed on the natal inputs themselves (profile, year, birth date, janma star, natal Moon sign),
// so a birth-data edit misses the cache; everything else is almanac-stable for the year.
const yearRankCache = new Map<string, any>();

/**
 * The ONE ranked solar year (birthday → birthday) for a user's active profile — the single
 * source behind the month calendar's marks AND the /year overview, so they can never tell
 * two stories (David: "one calendar", "i want the marks to reflect the calendar").
 * yearOffset: 0 = the solar year containing today, ±1 = neighbours. Cached in-memory.
 */
async function rankedSolarYearFor(userId: number, yearOffset: number): Promise<any | null> {
  const { getActiveProfile, getProfileNatalBodies } = await import("./routers/profiles.js");
  const profile = await getActiveProfile(userId);
  if (!profile || !(profile as any).birthDate) return null;
  const bodies = await getProfileNatalBodies(profile.id);
  const NAK = ["Ashwini","Bharani","Krittika","Rohini","Mrigashira","Ardra","Punarvasu","Pushya","Ashlesha","Magha","Purva Phalguni","Uttara Phalguni","Hasta","Chitra","Swati","Vishakha","Anuradha","Jyeshtha","Mula","Purva Ashadha","Uttara Ashadha","Shravana","Dhanishtha","Shatabhisha","Purva Bhadrapada","Uttara Bhadrapada","Revati"];
  const ZOD = ["Aries","Taurus","Gemini","Cancer","Leo","Virgo","Libra","Scorpio","Sagittarius","Capricorn","Aquarius","Pisces"];
  const moonBody = bodies.find((b: any) => b.planet === "Moon");
  const birthNakIdx = NAK.findIndex((n) => n.toLowerCase() === String(moonBody?.nakshatra ?? "").toLowerCase());
  const natalMoonSignIdx = ZOD.indexOf(moonBody?.sign ?? "");
  if (birthNakIdx < 0 || natalMoonSignIdx < 0) return null;

  // Solar year containing today (or offset by whole years): most recent birthday → next.
  const p2 = (n: number) => String(n).padStart(2, "0");
  const [, bm, bd] = String((profile as any).birthDate).split("-").map(Number);
  const today = new Date();
  let startYear = today.getUTCFullYear();
  if (today.getUTCMonth() + 1 < bm || (today.getUTCMonth() + 1 === bm && today.getUTCDate() < bd)) startYear -= 1;
  startYear += yearOffset;
  const yearStart = `${startYear}-${p2(bm)}-${p2(bd)}`;
  const yearEnd = `${startYear + 1}-${p2(bm)}-${p2(bd)}`;

  // LOCATION-TRUE ALMANAC (David 2026-07-16 "do it"): the panchang belongs to a PLACE —
  // the day walk runs at the user's STORED current location (the chip's stable choice,
  // never live GPS wobble), falling back to Boston. DST-aware offsets per date.
  const { getUserById: getU } = await import("./db.js");
  const u = await getU(userId);
  const hasLoc = !!(u?.locationLat && u?.locationLon && u?.locationTimezone);
  const locLat = hasLoc ? parseFloat(u!.locationLat!) : 42.3601;
  const locLon = hasLoc ? parseFloat(u!.locationLon!) : -71.0589;
  const locTz = hasLoc ? u!.locationTimezone! : null;
  const { getTimezoneOffset } = await import("./panchang/tz-offset.js");
  const { getBostonUtcOffset: bosOff } = await import("./panchang/service.js");
  const offsetFor = (date: string) => locTz ? getTimezoneOffset(locTz, new Date(date + "T12:00:00Z")) : bosOff(date);
  // Rounded to ~1km so a re-geocode of the same town never busts the year (time-stable law).
  const locKey = `${locLat.toFixed(2)},${locLon.toFixed(2)},${locTz ?? "boston"}`;

  // Key includes the natal inputs — a birth-data edit changes them and misses the cache.
  const cacheKey = `${profile.id}|${yearStart}|${(profile as any).birthDate}|${birthNakIdx}|${natalMoonSignIdx}|${locKey}|yr-v9`;
  const cached = yearRankCache.get(cacheKey);
  if (cached) return cached;

  // The day walk: ONE calcPanchang per day supplies the majority star (the month view's law),
  // the Moon sign, the tithi, and the karana — everything the ranking AND the day filter need.
  const { majorityStarFromAstro } = await import("./panchang/crown.js");
  const { calcPanchang } = await import("./panchang/astronomy.js");
  const { getBostonUtcOffset } = await import("./panchang/service.js");
  const { karanaFromLongitudes } = await import("./panchang/karana.js");
  const { localToUtc, planetLongitudeSpeed } = await import("./birthchart/calculator.js");
  const NAKSPAN = 360 / 27;
  const NAK27 = NAK;
  const WEEKDAY_LORD_7 = ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn"];
  const days: Array<{ date: string; dayNakIdx: number; dayMoonSignIdx: number; nakshatra: string; tithiNumber: number; vishti: boolean; varaLord: string }> = [];
  for (let ms = Date.parse(yearStart + "T00:00:00Z"); ms < Date.parse(yearEnd + "T00:00:00Z"); ms += 86400000) {
    const date = new Date(ms).toISOString().slice(0, 10);
    try {
      const astro: any = await calcPanchang(date, locLat, locLon, offsetFor(date));
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
  const { getDb } = await import("./db.js");
  const { profileConvergence } = await import("../drizzle/schema.js");
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
    const { computeConvergenceTimeline } = await import("./vedic/convergence.js");
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

  const { rankYear } = await import("./vedic/year-rank.js");
  const { dayFilter, movementOf, cappedSentence, MOVEMENT_WORD } = await import("./vedic/day-filter.js");
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
  yearRankCache.set(cacheKey, result);
  return result;
}


// The viewer's stored current location (the LocationChip's write) — Master Mode's clock
// must tick where the USER is, not where the server's default is (David set Phnom Penh,
// nothing changed — the chip wrote, the clock never read). Boston only as last resort.
async function userLatLon(userId: number): Promise<{ lat: number; lon: number } | null> {
  try {
    const { getUserById } = await import("./db.js");
    const u = await getUserById(userId);
    if (u?.locationLat && u?.locationLon) return { lat: parseFloat(u.locationLat), lon: parseFloat(u.locationLon) };
  } catch { /* fall through */ }
  return null;
}

export const appRouter = router({
  system: systemRouter,
  profiles: profilesRouter,

  // REFERRALS — tester codes (David's spec 2026-07-10): referrer earns 1 free month per
  // successful referral, new user gets 10% off the first month. One redemption per
  // PERSON — the birth-data fingerprint is the identity, not the email. Billing hooks
  // (the actual credit + discount) land with Stripe; until then redemptions accrue as
  // "pending" and the admin view is the ledger.
  referrals: router({
    validate: publicProcedure
      .input(z.object({ code: z.string().min(2).max(32) }))
      .query(async ({ input, ctx }) => {
        // Throttle code enumeration (audit M4) — public, was unlimited.
        rateLimit(ctx.req, "referral-validate", { max: 30, windowMs: 15 * 60 * 1000 });
        const row = await getReferralCode(input.code);
        return row && row.active
          ? { valid: true as const, discountPct: row.newUserDiscountPct, ownerName: row.ownerName }
          : { valid: false as const };
      }),
    redeem: publicProcedure
      .input(z.object({
        code: z.string().min(2).max(32),
        email: z.string().email().max(320),
        name: z.string().min(1).max(128),
        birthDate: z.string().min(4).max(16),
        birthTime: z.string().max(16).nullable().optional(),
        birthLocation: z.string().max(255).nullable().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        // Throttle redemption-row spam (audit M4) — public, was unlimited.
        rateLimit(ctx.req, "referral-redeem", { max: 10, windowMs: 15 * 60 * 1000 });
        return redeemReferralCode({ ...input, userId: ctx.user?.id ?? null });
      }),
    adminActivity: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN", message: "Admins only" });
      return listReferralActivity();
    }),
  }),

  auth: router({
    me: publicProcedure.query((opts) => {
      // audit HIGH-2: never ship credential material to the browser. Strip passwordHash/openId
      // from the raw users row before it leaves the server (login/register already do this).
      const u = opts.ctx.user;
      if (!u) return null;
      const { passwordHash: _p, openId: _o, ...safe } = u as any;
      return safe;
    }),
    login: publicProcedure
      .input(z.object({ email: z.string().email(), password: z.string().min(6) }))
      .mutation(async ({ ctx, input }) => {
        // Throttle online password brute force (audit 2026-07-17, H2 — login had no limit
        // while register did). Per-IP sliding window; 10/15min is well clear of a forgetful
        // real user but stops network-speed guessing. bcrypt already slows each attempt.
        rateLimit(ctx.req, "login", { max: 10, windowMs: 15 * 60 * 1000 });
        // Normalize email so it matches the lowercased form stored at registration.
        const email = input.email.trim().toLowerCase();
        const user = await verifyLogin(email, input.password);
        if (!user) throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid email or password" });
        const SESSION_TTL = 7 * 24 * 60 * 60 * 1000;
        const token = await createSession(user.id, SESSION_TTL);
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, token, { ...cookieOptions, maxAge: SESSION_TTL });
        return { id: user.id, email: user.email, name: user.name, role: user.role };
      }),

    register: publicProcedure
      .input(
        z.object({
          email: z.string().email().max(320),
          password: z.string().min(8, "Password must be at least 8 characters").max(128),
          name: z.string().trim().min(1).max(120).optional(),
          inviteCode: z.string().min(1).max(120),
        })
      )
      .mutation(async ({ ctx, input }) => {
        rateLimit(ctx.req, "register", { max: 5, windowMs: 15 * 60 * 1000 });

        // Private beta: registration is invite-only. Set SIGNUP_INVITE_CODE in the env to
        // rotate; the default below is the shareable code baked in until then.
        const VALID_INVITE = process.env.SIGNUP_INVITE_CODE || "velea-0f585f1d";
        if (input.inviteCode.trim() !== VALID_INVITE) {
          throw new TRPCError({ code: "FORBIDDEN", message: "That invite code isn't valid. Ask for a current invite link." });
        }

        const email = input.email.trim().toLowerCase();
        const existing = await getUserByEmail(email);
        if (existing) {
          throw new TRPCError({ code: "CONFLICT", message: "An account with this email already exists." });
        }

        const passwordHash = await hashPassword(input.password);
        let newUserId: number;
        try {
          const created = await createUserWithPassword({ email, name: input.name, passwordHash, role: "user" });
          newUserId = (created as any).id ?? (created as any);
        } catch (e: any) {
          if (/duplicate|unique/i.test(String(e?.message ?? e))) {
            throw new TRPCError({ code: "CONFLICT", message: "An account with this email already exists." });
          }
          throw e;
        }

        // Auto-login: issue a session + cookie (same as login).
        const SESSION_TTL = 7 * 24 * 60 * 60 * 1000;
        const token = await createSession(newUserId, SESSION_TTL);
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, token, { ...cookieOptions, maxAge: SESSION_TTL });

        return { id: newUserId, email, name: input.name ?? null, role: "user" as const };
      }),
    createTestUser: protectedProcedure
      .input(z.object({ email: z.string().email(), password: z.string().min(6), name: z.string().optional() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN", message: "Only admins can create users" });
        const existing = await getUserByEmail(input.email);
        if (existing) throw new TRPCError({ code: "BAD_REQUEST", message: "Email already in use" });
        const passwordHash = await hashPassword(input.password);
        // Test users are testers by default → Time Master + Hora are unlocked for them out of the box.
        const userId = await createUserWithPassword({ email: input.email, name: input.name, passwordHash, role: "tester" });
        return { id: userId, email: input.email, name: input.name };
      }),
    // Admin: list all users (id, name, email, role) for the Users page — so testers can be seen + set.
    listUsers: protectedProcedure
      .query(async ({ ctx }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN", message: "Admins only" });
        const db = await getDb();
        if (!db) return [];
        const rows = await db.select({ id: users.id, name: users.name, email: users.email, role: users.role }).from(users).orderBy(users.id);
        return rows;
      }),
    // Admin: set a user's role — used to mark Lang/Lisa (and future testers) as "tester".
    setUserRole: protectedProcedure
      .input(z.object({ userId: z.number().int(), role: z.enum(["user", "admin", "tester"]) }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN", message: "Admins only" });
        if (input.userId === ctx.user.id && input.role !== "admin") {
          throw new TRPCError({ code: "BAD_REQUEST", message: "You can't remove your own admin role." });
        }
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
        await db.update(users).set({ role: input.role, updatedAt: new Date() }).where(eq(users.id, input.userId));
        return { id: input.userId, role: input.role };
      }),
    // Admin: delete a user AND all their data cleanly (profiles, sessions, check-ins, etc.).
    // Use this instead of a bare row-delete in the DB UI, which orphans everything (no FK cascade).
    deleteUser: protectedProcedure
      .input(z.object({ userId: z.number().int() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN", message: "Admins only" });
        if (input.userId === ctx.user.id) throw new TRPCError({ code: "BAD_REQUEST", message: "You can't delete your own account here." });
        await deleteUserCascade(input.userId);
        return { deleted: input.userId };
      }),
    // Admin: recompute a user's owner chart from its stored birth data — populates the per-planet
    // natal bodies + profection/transits. Repairs profiles created before createProfileUser computed
    // the full chart (e.g. Lisa's blank reading).
    recomputeUserChart: protectedProcedure
      .input(z.object({ userId: z.number().int() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN", message: "Admins only" });
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
        const rows = await db.select().from(profiles).where(and(eq(profiles.userId, input.userId), eq(profiles.isOwner, true))).limit(1);
        const owner = rows[0];
        if (!owner) throw new TRPCError({ code: "NOT_FOUND", message: "User has no owner profile" });
        if (!owner.birthDate) throw new TRPCError({ code: "BAD_REQUEST", message: "Owner profile has no birth date to compute from" });
        const { recomputeProfileChart } = await import('./routers/profiles.js');
        await recomputeProfileChart(input.userId, owner.id, {
          birthDate: owner.birthDate,
          birthTime: owner.birthTime,
          birthTimeApprox: (owner as any).lagnaBasis === "ascendant_approx",
          birthLocationCity: owner.birthLocationCity ?? "",
          birthLocationLat: owner.birthLocationLat,
          birthLocationLon: owner.birthLocationLon,
          birthTimezone: owner.birthTimezone,
        });
        return { recomputed: input.userId, profileId: owner.id };
      }),
    // Admin: repair EVERY owner profile that has birth data but no natal bodies (the blank-reading
    // state). One click before sending tester logins. Idempotent — skips profiles already computed.
    repairAllCharts: protectedProcedure
      .mutation(async ({ ctx }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN", message: "Admins only" });
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
        const owners = await db.select().from(profiles).where(eq(profiles.isOwner, true));
        const { recomputeProfileChart } = await import('./routers/profiles.js');
        let repaired = 0, skipped = 0, failed = 0;
        for (const owner of owners) {
          if (!owner.birthDate) { skipped++; continue; }
          const has = await db.select({ id: profileNatalBodies.id }).from(profileNatalBodies).where(eq(profileNatalBodies.profileId, owner.id)).limit(1);
          if (has.length) { skipped++; continue; } // already computed
          try {
            await recomputeProfileChart(owner.userId, owner.id, {
              birthDate: owner.birthDate,
              birthTime: owner.birthTime,
              birthTimeApprox: (owner as any).lagnaBasis === "ascendant_approx",
              birthLocationCity: owner.birthLocationCity ?? "",
              birthLocationLat: owner.birthLocationLat,
              birthLocationLon: owner.birthLocationLon,
              birthTimezone: owner.birthTimezone,
            });
            repaired++;
          } catch { failed++; }
        }
        return { repaired, skipped, failed, total: owners.length };
      }),
    // Admin: probe the LLM with a tiny live call → reports whether the Anthropic key is set and
    // working, or the exact API error (bad key / billing cap / etc.). Diagnoses blank readings.
    llmStatus: protectedProcedure
      .mutation(async ({ ctx }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN", message: "Admins only" });
        const { probeLLM } = await import("./narrative/generate.js");
        return probeLLM();
      }),
    // Admin: the black box — verbatim messages from every narrative-generation failure since
    // the last deploy. Pairs with llmStatus: probe green + errors here = the bug is ours.
    llmRecentErrors: protectedProcedure
      .mutation(async ({ ctx }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN", message: "Admins only" });
        const { getRecentGenErrors } = await import("./narrative/generate.js");
        return { errors: getRecentGenErrors() };
      }),
    // Admin: run a specific user's ACTUAL day reading end-to-end (build input → generate) and report
    // the exact failure point. Diagnoses a per-user blank when the global LLM probe is green.
    testReadingForUser: protectedProcedure
      .input(z.object({ userId: z.number().int() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN", message: "Admins only" });
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
        const rows = await db.select().from(profiles).where(and(eq(profiles.userId, input.userId), eq(profiles.isOwner, true))).limit(1);
        const owner = rows[0];
        if (!owner) return { ok: false, stage: "no owner profile", error: "This user has no owner profile." };
        const today = new Date().toISOString().split("T")[0];
        try {
          const { buildNarrativeInput } = await import("./narrative/input-builder.js");
          const built = await buildNarrativeInput(owner.id, today);
          try {
            const { generateGlance } = await import("./narrative/generate.js");
            const glance = await generateGlance(built as any);
            return { ok: !!glance, stage: glance ? "generated OK" : "input built fine, but generateGlance returned null (model refused/incomplete for this input)", error: null };
          } catch (genErr: any) {
            return { ok: false, stage: "generateGlance threw", error: genErr?.message ?? String(genErr) };
          }
        } catch (inErr: any) {
          return { ok: false, stage: "buildNarrativeInput threw", error: inErr?.message ?? String(inErr) };
        }
      }),
    createProfileUser: protectedProcedure
      .input(z.object({ profileId: z.number().int(), email: z.string().email(), password: z.string().min(6) }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN", message: "Admins only" });
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

        const existing = await getUserByEmail(input.email);
        if (existing) throw new TRPCError({ code: "BAD_REQUEST", message: "Email already in use" });

        // Find the reference profile (must belong to this admin)
        const refProfiles = await db.select().from(profiles).where(eq(profiles.id, input.profileId)).limit(1);
        const refProfile = refProfiles[0];
        if (!refProfile || refProfile.userId !== ctx.user.id)
          throw new TRPCError({ code: "NOT_FOUND", message: "Profile not found" });
        if (refProfile.isOwner)
          throw new TRPCError({ code: "BAD_REQUEST", message: "Cannot create login for your own chart" });
        // A reference profile can back only ONE login. Refusing an already-linked profile
        // prevents making a second account for the same person (the root of the Lisa/Simone
        // mix-up). Delete the existing user (which unlinks it) before re-issuing a login.
        if (refProfile.linkedUserId)
          throw new TRPCError({ code: "BAD_REQUEST", message: `This profile already has a login (user #${refProfile.linkedUserId}). Delete that user first, then re-create.` });

        // Create the user account
        const passwordHash = await hashPassword(input.password);
        const newUserResult = await createUserWithPassword({
          email: input.email,
          name: refProfile.name,
          passwordHash,
          role: "user",
        });
        const newUserId = (newUserResult as any).id ?? (newUserResult as any);

        // Create their owner "My Chart" profile with the reference's birth data.
        const [ins] = await db.insert(profiles).values({
          userId: newUserId,
          name: refProfile.name,
          birthDate: refProfile.birthDate ?? null,
          birthTime: refProfile.birthTime ?? null,
          birthLocationCity: refProfile.birthLocationCity ?? null,
          birthLocationLat: refProfile.birthLocationLat ?? null,
          birthLocationLon: refProfile.birthLocationLon ?? null,
          birthTimezone: refProfile.birthTimezone ?? null,
          lagnaBasis: (refProfile as any).lagnaBasis ?? "ascendant",
          isOwner: true,
          isActive: true, // a new user's own chart is their active profile — else the client fires no reading (blank)
        }).$returningId();
        const newProfileId = (ins as any).id;

        // Compute the FULL chart — houses AND the per-planet natal bodies, plus profection/transit
        // precompute and warmed reads. Copying only the house columns (as before) left the profile
        // with NO natal bodies, and the narrative engine throws "no natal bodies" → the day card and
        // year read never load. This is the exact bug that left Lisa's reading blank.
        if (refProfile.birthDate) {
          const { recomputeProfileChart } = await import('./routers/profiles.js');
          await recomputeProfileChart(newUserId, newProfileId, {
            birthDate: refProfile.birthDate,
            birthTime: refProfile.birthTime,
            birthTimeApprox: (refProfile as any).lagnaBasis === "ascendant_approx",
            birthLocationCity: refProfile.birthLocationCity ?? "",
            birthLocationLat: refProfile.birthLocationLat,
            birthLocationLon: refProfile.birthLocationLon,
            birthTimezone: refProfile.birthTimezone,
          });
        }

        // Mark the reference profile as linked
        await db.update(profiles).set({ linkedUserId: newUserId }).where(eq(profiles.id, input.profileId));

        return { userId: newUserId, email: input.email };
      }),

    logout: publicProcedure.mutation(async ({ ctx }) => {
      // Revoke the server-side session, then clear the cookie.
      const token = parseCookie(ctx.req.headers.cookie ?? "")[COOKIE_NAME];
      if (token) await deleteSession(token);
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),

    changePassword: protectedProcedure
      .input(z.object({
        currentPassword: z.string().min(1),
        newPassword: z.string().min(8, "Password must be at least 8 characters"),
      }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user.passwordHash) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "This account has no password set." });
        }
        const valid = await verifyPassword(input.currentPassword, ctx.user.passwordHash);
        if (!valid) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "Current password is incorrect." });
        }
        if (input.newPassword === input.currentPassword) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "New password must be different." });
        }

        // Update the hash, then revoke every existing session (logout everywhere)…
        const newHash = await hashPassword(input.newPassword);
        await updateUserPasswordHash(ctx.user.id, newHash);
        await deleteAllSessionsForUser(ctx.user.id);

        // …and issue a fresh session so the current device stays signed in.
        const SESSION_TTL = 7 * 24 * 60 * 60 * 1000;
        const token = await createSession(ctx.user.id, SESSION_TTL);
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, token, { ...cookieOptions, maxAge: SESSION_TTL });
        return { success: true } as const;
      }),

    // Revoke every session for this user, then keep the current device signed in.
    logoutOtherSessions: protectedProcedure.mutation(async ({ ctx }) => {
      await deleteAllSessionsForUser(ctx.user.id);
      const SESSION_TTL = 7 * 24 * 60 * 60 * 1000;
      const token = await createSession(ctx.user.id, SESSION_TTL);
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.cookie(COOKIE_NAME, token, { ...cookieOptions, maxAge: SESSION_TTL });
      return { success: true } as const;
    }),

    // ADMIN ONLY — force-logout EVERY user after a breaking build change. Clears the
    // whole sessions table except the caller's own token, so everyone else drops to
    // the login screen on their next request while this device stays signed in.
    forceLogoutAllUsers: protectedProcedure.mutation(async ({ ctx }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN", message: "Admins only" });
      const myToken = parseCookie(ctx.req.headers.cookie ?? "")[COOKIE_NAME];
      const count = await deleteAllSessions(myToken);
      return { count } as const;
    }),
  }),

  // ── TASKS ──────────────────────────────────────────────────
  tasks: router({
    list: protectedProcedure
      .input(z.object({ mode: TaskModeEnum.optional() }).optional())
      .query(async ({ ctx, input }) => {
        const subject = ctx.subject;
        const profileId = subject?.profileId ?? null;
        const tasks = await getTasksByUser(ctx.user.id, profileId);
        if (!input?.mode) return tasks;
        return tasks.filter((t) => t.mode === input.mode);
      }),

    create: protectedProcedure
      .input(
        z.object({
          title: z.string().min(1).max(512),
          mode: TaskModeEnum,
          priority: PriorityEnum,
          intent: z.enum(["want", "need"]).default("need"),
          isPinned: z.boolean().default(false),
          dueDate: z.string().nullable().optional(),
          wealthFlow: z.boolean().default(false),
          projectId: z.number().int().nullable().optional(),
          cognitiveLoad: z.enum(["Low", "Medium", "High"]).nullable().optional(),
          physicalLoad: z.enum(["Low", "Medium", "High"]).nullable().optional(),
          creativeRequired: z.boolean().nullable().optional(),
          socialRequired: z.boolean().nullable().optional(),
          emotionalLoad: z.enum(["Low", "Medium", "High"]).nullable().optional(),
          notes: z.string().nullable().optional(),
          recurrence: RecurrenceEnum.optional(),
          lifeAreas: z.array(z.string()).optional(),
          isNewVenture: z.boolean().nullable().optional(),
          completionPct: z.number().int().min(0).max(100).nullable().optional(),
          effortSize: z.enum(["quick", "sitting", "long"]).nullable().optional(),
          circle: z.enum(CIRCLES).nullable().optional(),
          circles: z.array(z.enum(CIRCLES)).max(8).nullable().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const subject = ctx.subject;
        const profileId = subject?.profileId ?? null;
        return createTask({
          userId: ctx.user.id,
          profileId,
          title: input.title,
          mode: input.mode,
          priority: input.priority,
          intent: input.intent,
          isPinned: input.isPinned,
          dueDate: input.dueDate,
          wealthFlow: input.wealthFlow,
          projectId: input.projectId ?? null,
          cognitiveLoad: input.cognitiveLoad ?? null,
          physicalLoad: input.physicalLoad ?? null,
          creativeRequired: input.creativeRequired ?? null,
          socialRequired: input.socialRequired ?? null,
          emotionalLoad: input.emotionalLoad ?? null,
          notes: input.notes ?? null,
          recurrence: input.recurrence ?? "none",
          lifeAreas: input.lifeAreas && input.lifeAreas.length ? JSON.stringify(input.lifeAreas) : null,
          completionPct: input.completionPct ?? null,
          effortSize: input.effortSize ?? null,
          circle: input.circle ?? null,
          circles: input.circles ?? null,
        });
      }),

    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          title: z.string().min(1).max(512).optional(),
          mode: TaskModeEnum.optional(),
          priority: PriorityEnum.optional(),
          intent: z.enum(["want", "need"]).optional(),
          isPinned: z.boolean().optional(),
          isCompleted: z.boolean().optional(),
          dueDate: z.string().nullable().optional(),
          wealthFlow: z.boolean().optional(),
          projectId: z.number().int().nullable().optional(),
          cognitiveLoad: z.enum(["Low", "Medium", "High"]).nullable().optional(),
          physicalLoad: z.enum(["Low", "Medium", "High"]).nullable().optional(),
          creativeRequired: z.boolean().nullable().optional(),
          socialRequired: z.boolean().nullable().optional(),
          emotionalLoad: z.enum(["Low", "Medium", "High"]).nullable().optional(),
          notes: z.string().nullable().optional(),
          recurrence: RecurrenceEnum.optional(),
          lifeAreas: z.array(z.string()).optional(),
          isNewVenture: z.boolean().nullable().optional(),
          completionPct: z.number().int().min(0).max(100).nullable().optional(),
          effortSize: z.enum(["quick", "sitting", "long"]).nullable().optional(),
          circle: z.enum(CIRCLES).nullable().optional(),
          circles: z.array(z.enum(CIRCLES)).max(8).nullable().optional(),
          // When provided and isPinned=true, the task's mode is set to this value.
          // Ignored when isPinned is false or undefined.
          dayMode: TaskModeEnum.optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { dayMode, lifeAreas, ...rest } = input;
        // Auto-assign current day mode when pinning
        const effectiveMode =
          rest.isPinned === true && dayMode ? dayMode : rest.mode;
        // lifeAreas is stored as a JSON string; only touch it when provided.
        const areaPatch =
          lifeAreas !== undefined ? { lifeAreas: JSON.stringify(lifeAreas) } : {};

        // Recurring roll-forward: completing a recurring task advances its due
        // date to the next occurrence and keeps it active instead of done.
        if (rest.isCompleted === true) {
          const existing = await getTaskById(rest.id, ctx.user.id);
          const recurrence = (rest.recurrence ?? existing?.recurrence ?? "none") as string;
          if (existing && recurrence !== "none") {
            const base = rest.dueDate ?? existing.dueDate ?? null;
            return updateTask(rest.id, ctx.user.id, {
              ...rest,
              ...areaPatch,
              mode: effectiveMode,
              isCompleted: false,
              completedAt: null,
              dueDate: nextDueDate(base, recurrence),
            });
          }
        }

        return updateTask(rest.id, ctx.user.id, { ...rest, ...areaPatch, mode: effectiveMode });
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        return deleteTask(input.id, ctx.user.id);
      }),

    purgeCompleted: protectedProcedure
      .mutation(async ({ ctx }) => {
        const profileId = ctx.subject?.profileId ?? null;
        const removed = await deleteCompletedTasks(ctx.user.id, profileId);
        return { removed };
      }),

    snooze: protectedProcedure
      .input(z.object({ id: z.number(), duration: z.enum(["1hour", "restOfDay"]) }))
      .mutation(async ({ ctx, input }) => {
        const now = Date.now();
        let snoozedUntil: number;
        if (input.duration === "1hour") {
          snoozedUntil = now + 60 * 60 * 1000;
        } else {
          // Rest of day — midnight in user's local timezone
          // We use end of current UTC day as approximation; frontend can pass exact midnight if needed
          const tomorrow = new Date();
          tomorrow.setHours(23, 59, 59, 999);
          snoozedUntil = tomorrow.getTime();
        }
        await snoozeTask(input.id, ctx.user.id, snoozedUntil);
        return { snoozedUntil };
      }),

    unsnooze: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await unsnoozeTask(input.id, ctx.user.id);
      }),

    modeCounts: protectedProcedure.query(async ({ ctx }) => {
      const subject = ctx.subject;
      const profileId = subject?.profileId ?? null;
      const tasks = await getTasksByUser(ctx.user.id, profileId);
      const now = Date.now();
      const active = tasks.filter((t) => !t.snoozedUntil || t.snoozedUntil <= now);
      return {
        Restraint: active.filter((t) => t.mode === "Restraint" && !t.isCompleted).length,
        Build: active.filter((t) => t.mode === "Build" && !t.isCompleted).length,
        Selective: active.filter((t) => t.mode === "Selective" && !t.isCompleted).length,
        Action: active.filter((t) => t.mode === "Action" && !t.isCompleted).length,
      };
    }),

    pinnedForToday: protectedProcedure
      .input(z.object({ mode: z.string() }))
      .query(async ({ ctx, input }) => {
        const subject = ctx.subject;
        const profileId = subject?.profileId ?? null;
        return getPinnedTasksForToday(ctx.user.id, input.mode, profileId);
      }),

    rankedForToday: protectedProcedure
      .input(
        z.object({
          todayMode: z.string(),
          todayDate: z.string(), // YYYY-MM-DD
          todayHouse: z.number().optional(), // the day's domain (activated house)
          verdictShapesRanking: z.boolean().default(false), // opt-in: verdict tilts order
          meridianLift: z.boolean().default(false), // opt-in: MC/IC chapter lifts its pole's areas
          supportedKinds: z.array(z.string()).optional(), // the handshake — today's supported kinds
        })
      )
      .query(async ({ ctx, input }) => {
        const subject = ctx.subject;
        const profileId = subject?.profileId ?? null;
        const [allTasksRaw, checkIn, projectRows] = await Promise.all([
          getTasksByUser(ctx.user.id, profileId),
          getTodayCheckIn(ctx.user.id, profileId),
          getProjectsByUser(ctx.user.id, profileId),
        ]);
        // Exclude snoozed tasks from ranking
        const now = Date.now();
        const allTasks = allTasksRaw.filter((t) => !t.snoozedUntil || t.snoozedUntil <= now);
        // Pressure layers feed the soft subscore (cached 5 min per profile).
        const layers = subject ? await getCurrentLayers(subject) : null;
        // Golden Moment (slow-planet weather) — a bounded soft multiplier (cached 30 min).
        let goldenSignals = null;
        if (subject) {
          try {
            const sky = await getCurrentSky(subject);
            const litHouses = Array.from(new Set([1, 10, ...(input.todayHouse != null ? [input.todayHouse] : [])]));
            goldenSignals = computeGoldenMoment(sky, { litHouses });
          } catch { /* degrade to no golden-moment effect */ }
        }
        // Opt-in: let the daily verdict globally tilt the soft score (Go all in lifts
        // discretionary work; Hold recedes it toward the pinned/overdue floors).
        let verdictBias = 1;
        if (input.verdictShapesRanking && goldenSignals) {
          const avg = checkIn
            ? (checkIn.physicalEnergy + checkIn.mentalClarity + checkIn.emotionalStability + checkIn.creativeFlow + checkIn.motivation) / 5
            : null;
          const v = computeVerdict(goldenSignals, avg);
          verdictBias = v.universalLevel === "favorable" ? 1.15 : v.universalLevel === "unfavorable" ? 0.85 : 1;
        }
        // Map each project to its life-area keys so the day's domain can surface
        // thematically-matching tasks.
        const projectAreas = new Map<number, string[]>(
          projectRows.map((p) => [p.id, parseLifeAreas((p as any).lifeAreas)])
        );

        // Meridian lift (opt-in): while a SLOW planet activates the MC/IC, lift the
        // pole's life-areas — MC → vocation (house 10), IC → home/roots (house 4).
        let meridianHouses: number[] | undefined;
        if (input.meridianLift && subject) {
          try {
            const { getActiveProfile, getProfileNatalBodies } = await import("./routers/profiles.js");
            const profile = await getActiveProfile(ctx.user.id);
            if (profile && (profile as any).mcLongitude) {
              const bodies = await getProfileNatalBodies(profile.id);
              const hb: Record<string, number | null> = {};
              for (const b of bodies) hb[b.planet] = b.house ?? null;
              const { computeMeridianRead } = await import("./meridian/activations.js");
              const read = await computeMeridianRead(parseFloat((profile as any).mcLongitude), hb);
              const poles = new Set(read.hits.filter((h) => h.slow).map((h) => h.pole));
              const houses: number[] = [];
              if (poles.has("MC")) houses.push(10);
              if (poles.has("IC")) houses.push(4);
              if (houses.length) meridianHouses = houses;
            }
          } catch { /* degrade to no meridian lift */ }
        }

        // THE SECOND HANDSHAKE (the nine circles): which life-theme windows are OPEN today —
        // tasks touching a circle whose rooms are lit rise in the ranking.
        let openThemes: string[] = [];
        if (profileId) {
          try {
            const dbT = await getDb();
            if (dbT) {
              const { profileConvergence } = await import("../drizzle/schema.js");
              const rowsT = await dbT.select().from(profileConvergence).where(eq(profileConvergence.profileId, profileId));
              const { mergeThemeWindows } = await import("./vedic/windows.js");
              openThemes = Array.from(new Set(
                mergeThemeWindows(rowsT as any)
                  .filter((w) => w.from <= input.todayDate && w.to >= input.todayDate && (w.peak ?? 0) >= 2)
                  .map((w) => w.theme),
              ));
            }
          } catch { /* no circle lift */ }
        }
        return scoreTasks(allTasks, {
          todayMode: input.todayMode,
          todayDate: input.todayDate,
          supportedKinds: input.supportedKinds,
          openThemes,
          dayHouses: input.todayHouse != null ? [input.todayHouse] : [],
          meridianHouses,
          projectAreas,
          layers,
          goldenSignals,
          verdictBias,
          currentState: checkIn
            ? {
                physicalEnergy: checkIn.physicalEnergy,
                mentalClarity: checkIn.mentalClarity,
                emotionalStability: checkIn.emotionalStability,
                creativeFlow: checkIn.creativeFlow,
                motivation: checkIn.motivation,
              }
            : null,
        });
      }),

    dueList: protectedProcedure
      .input(z.object({ startDate: z.string(), endDate: z.string() }).optional())
      .query(async ({ ctx, input }) => {
        const subject = ctx.subject;
        const profileId = subject?.profileId ?? null;
        const tasksRaw = await getTasksByUser(ctx.user.id, profileId);
        const now = Date.now();
        const tasks = tasksRaw.filter((t) => !t.snoozedUntil || t.snoozedUntil <= now);
        if (!input) return tasks.filter((t) => t.dueDate);
        return tasks.filter(
          (t) =>
            t.dueDate &&
            t.dueDate >= input.startDate &&
            t.dueDate <= input.endDate
        );
      }),
  }),

  // ── SETTINGS ────────────────────────────────────────────────
  settings: router({
    // ── Guided-tour state (server-side; survives iOS PWA localStorage clears) ──
    getTourState: protectedProcedure.query(async ({ ctx }) => {
      const user = await getUserById(ctx.user.id);
      let state = { seen: [] as string[], enabled: true, welcomeShows: 0 };
      try { if ((user as any)?.tourState) state = { ...state, ...JSON.parse((user as any).tourState) }; } catch { /* ignore */ }
      return state;
    }),
    markTourSeen: protectedProcedure
      .input(z.object({ key: z.string().max(64) }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb(); if (!db) return { ok: false };
        const user = await getUserById(ctx.user.id);
        let state = { seen: [] as string[], enabled: true, welcomeShows: 0 };
        try { if ((user as any)?.tourState) state = { ...state, ...JSON.parse((user as any).tourState) }; } catch { /* ignore */ }
        if (!state.seen.includes(input.key)) state.seen.push(input.key);
        await db.update(users).set({ tourState: JSON.stringify(state) }).where(eq(users.id, ctx.user.id));
        return { ok: true };
      }),
    setToursEnabled: protectedProcedure
      .input(z.object({ enabled: z.boolean() }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb(); if (!db) return { ok: false };
        const user = await getUserById(ctx.user.id);
        let state = { seen: [] as string[], enabled: true, welcomeShows: 0 };
        try { if ((user as any)?.tourState) state = { ...state, ...JSON.parse((user as any).tourState) }; } catch { /* ignore */ }
        state.enabled = input.enabled;
        await db.update(users).set({ tourState: JSON.stringify(state) }).where(eq(users.id, ctx.user.id));
        return { ok: true };
      }),
    // The first-run welcome is capped at 2 lifetime SHOWS per user (server-side, so it
    // survives logout and new devices — localStorage/seen-on-dismiss re-fired forever).
    // Client calls this once per app-open while the welcome is visible; the gate is
    // welcomeShows < 2, evaluated at load, so the current session's welcome stays put.
    bumpWelcomeShows: protectedProcedure.mutation(async ({ ctx }) => {
      const db = await getDb(); if (!db) return { ok: false, welcomeShows: 0 };
      const user = await getUserById(ctx.user.id);
      let state = { seen: [] as string[], enabled: true, welcomeShows: 0 };
      try { if ((user as any)?.tourState) state = { ...state, ...JSON.parse((user as any).tourState) }; } catch { /* ignore */ }
      state.welcomeShows = (state.welcomeShows ?? 0) + 1;
      await db.update(users).set({ tourState: JSON.stringify(state) }).where(eq(users.id, ctx.user.id));
      return { ok: true, welcomeShows: state.welcomeShows };
    }),
    resetTours: protectedProcedure.mutation(async ({ ctx }) => {
      const db = await getDb(); if (!db) return { ok: false };
      await db.update(users).set({ tourState: JSON.stringify({ seen: [], enabled: true, welcomeShows: 0 }) }).where(eq(users.id, ctx.user.id));
      return { ok: true };
    }),

    getLocation: protectedProcedure.query(async ({ ctx }) => {
      const user = await getUserById(ctx.user.id);
      if (!user) return null;
      return {
        city: user.locationCity ?? null,
        lat: user.locationLat ?? null,
        lon: user.locationLon ?? null,
        timezone: user.locationTimezone ?? null,
      };
    }),

    // Resolve the IANA timezone for a coordinate (offline, no key). Used to
    // auto-fill the birth timezone once a location is geocoded.
    resolveTimezone: protectedProcedure
      .input(z.object({ lat: z.string(), lon: z.string() }))
      .query(({ input }) => {
        const tz = timezoneForCoords(parseFloat(input.lat), parseFloat(input.lon));
        return { timezone: tz };
      }),

    setLocation: protectedProcedure
      .input(
        z.object({
          city: z.string().min(1).max(128),
          lat: z.string(),
          lon: z.string(),
          timezone: z.string(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        await updateUserLocation(ctx.user.id, input);
        return { success: true };
      }),

    getBirthChart: protectedProcedure.query(async ({ ctx }) => {
      // Always read from the active profile (or owner profile) — single source of truth
      const subject = ctx.subject;
      if (!subject) return null;

      return {
        birthDate: subject.birthDate ?? null,
        birthTime: subject.birthTime ?? null,
        birthLocationCity: subject.birthLocationCity ?? null,
        birthLocationLat: subject.birthLocationLat ?? null,
        birthLocationLon: subject.birthLocationLon ?? null,
        birthTimezone: subject.birthTimezone ?? null,
        // Drives the client's 24h edit lock + "change again in Xh" copy.
        birthDataUpdatedAt: subject.birthDataUpdatedAt ? new Date(subject.birthDataUpdatedAt).toISOString() : null,
        lagnaSign: subject.lagnaSign ?? null,
        ascendantDegree: subject.ascendantDegree ?? null,
        sunHouse: subject.sunHouse ?? null,
        moonHouse: subject.moonHouse ?? null,
        marsHouse: subject.marsHouse ?? null,
        mercuryHouse: subject.mercuryHouse ?? null,
        jupiterHouse: subject.jupiterHouse ?? null,
        venusHouse: subject.venusHouse ?? null,
        saturnHouse: subject.saturnHouse ?? null,
        rahuHouse: subject.rahuHouse ?? null,
        ketuHouse: subject.ketuHouse ?? null,
        // Natal body rows for debug panel
        natalBodies: subject.natalBodies ?? [],
      };
    }),

    setBirthChart: protectedProcedure
      .input(
        z.object({
          lagnaSign: z.string().max(32).nullable().optional(),
          sunHouse: z.number().int().min(1).max(12).nullable().optional(),
          moonHouse: z.number().int().min(1).max(12).nullable().optional(),
          marsHouse: z.number().int().min(1).max(12).nullable().optional(),
          mercuryHouse: z.number().int().min(1).max(12).nullable().optional(),
          jupiterHouse: z.number().int().min(1).max(12).nullable().optional(),
          venusHouse: z.number().int().min(1).max(12).nullable().optional(),
          saturnHouse: z.number().int().min(1).max(12).nullable().optional(),
          rahuHouse: z.number().int().min(1).max(12).nullable().optional(),
          ketuHouse: z.number().int().min(1).max(12).nullable().optional(),
          ascendantDegree: z.string().max(16).nullable().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        await updateUserBirthChart(ctx.user.id, input);
        return { success: true };
      }),

    calculateBirthChart: protectedProcedure
      .input(
        z.object({
          birthDate: z.string(),
          birthTime: z.string(),
          birthLocationCity: z.string(),
          birthLocationLat: z.string().optional(),
          birthLocationLon: z.string().optional(),
          birthTimezone: z.string().optional(), // IANA timezone e.g. "Asia/Manila"
        })
      )
      .mutation(async ({ ctx, input }) => {
        try {
          // Import the calculator
          const { calculateBirthChart: computeChart } = await import('./birthchart/calculator.js');

          // Parse latitude and longitude
          const lat = input.birthLocationLat ? parseFloat(input.birthLocationLat) : 0;
          const lon = input.birthLocationLon ? parseFloat(input.birthLocationLon) : 0;

          // Use the user-supplied timezone. Fall back to UTC only if not provided.
          // The client should always supply this from the timezone picker.
          const timezone = input.birthTimezone || 'UTC';

          // Calculate the birth chart
          const chart = await computeChart(
            input.birthDate,
            input.birthTime,
            lat,
            lon,
            timezone
          );

          // Enforce the 24h birth-data edit cooldown BEFORE any writes (anti-hijack).
          const { getActiveProfile: getActiveForLock, birthDataChanged, assertBirthDataCooldown } = await import('./routers/profiles.js');
          const activeForLock = await getActiveForLock(ctx.user.id);
          const birthChanged = !activeForLock || birthDataChanged(activeForLock, {
            birthDate: input.birthDate,
            birthTime: input.birthTime,
            birthLocationCity: input.birthLocationCity,
            birthLocationLat: input.birthLocationLat || null,
            birthLocationLon: input.birthLocationLon || null,
            birthTimezone: timezone,
          });
          assertBirthDataCooldown({ isAdmin: ctx.user.role === "admin", changed: birthChanged, lastChangedAt: (activeForLock as any)?.birthDataUpdatedAt });

          // Store all birth data and chart results in a single update
          await updateUserBirthChart(ctx.user.id, {
            // Birth input data
            birthDate: input.birthDate,
            birthTime: input.birthTime,
            birthLocationCity: input.birthLocationCity,
            birthLocationLat: input.birthLocationLat || null,
            birthLocationLon: input.birthLocationLon || null,
            birthTimezone: timezone,
            // Calculated chart data
            lagnaSign: chart.lagna.sign,
            sunHouse: chart.sun.house,
            moonHouse: chart.moon.house,
            marsHouse: chart.mars.house,
            mercuryHouse: chart.mercury.house,
            jupiterHouse: chart.jupiter.house,
            venusHouse: chart.venus.house,
            saturnHouse: chart.saturn.house,
            rahuHouse: chart.rahu.house,
            ketuHouse: chart.ketu.house,
            ascendantDegree: chart.lagna.degree.toFixed(2),
            mcLongitude: chart.mc?.longitude != null ? String(chart.mc.longitude.toFixed(4)) : null,
          });

          // Store complete natal body data for all 9 planets
          const planetData = [
            { name: 'Sun', data: chart.sun },
            { name: 'Moon', data: chart.moon },
            { name: 'Mercury', data: chart.mercury },
            { name: 'Venus', data: chart.venus },
            { name: 'Mars', data: chart.mars },
            { name: 'Jupiter', data: chart.jupiter },
            { name: 'Saturn', data: chart.saturn },
            { name: 'Rahu', data: chart.rahu },
            { name: 'Ketu', data: chart.ketu },
          ];

          for (const planet of planetData) {
            await upsertNatalBody(ctx.user.id, planet.name, {
              sign: planet.data.sign,
              degree: planet.data.degree.toFixed(6),
              house: planet.data.house,
              nakshatra: planet.data.nakshatra || null,
              pada: planet.data.pada || null,
              // Store full sidereal longitude for accurate dasha calculations
              longitude: planet.data.longitude != null ? planet.data.longitude.toFixed(6) : null,
            });
          }

          // Cascade: clear stale profection year and time lord transit rows.
          // They will be regenerated on-demand with the new natal data.
          try {
            const { deleteAllProfectionYearsForUser } = await import('./profection/db.js');
            const { deleteAllTimeLordTransitsForUser } = await import('./profection/transit-db.js');
            await deleteAllTimeLordTransitsForUser(ctx.user.id);
            await deleteAllProfectionYearsForUser(ctx.user.id);
          } catch (cascadeErr) {
            // Non-fatal: log but don't block the chart save
            console.warn('[Birth Chart] Cascade clear failed:', cascadeErr);
          }

          // Sync the user's ACTIVE PROFILE too. The app displays the chart from the
          // profile (profile_natal_bodies), not the user row — so without this, an
          // edited birth chart (location/timezone included) never actually shows.
          try {
            const { getActiveProfile, upsertProfileNatalBody } = await import('./routers/profiles.js');
            const activeProfile = await getActiveProfile(ctx.user.id);
            const pdb = await getDb();
            if (activeProfile && pdb) {
              await pdb.update(profiles).set({
                birthDate: input.birthDate,
                birthTime: input.birthTime,
                birthLocationCity: input.birthLocationCity,
                birthLocationLat: input.birthLocationLat || null,
                birthLocationLon: input.birthLocationLon || null,
                birthTimezone: timezone,
                ...(birthChanged ? { birthDataUpdatedAt: new Date() } : {}), // start/refresh the 24h lock
                lagnaSign: chart.lagna.sign,
                sunHouse: chart.sun.house,
                moonHouse: chart.moon.house,
                marsHouse: chart.mars.house,
                mercuryHouse: chart.mercury.house,
                jupiterHouse: chart.jupiter.house,
                venusHouse: chart.venus.house,
                saturnHouse: chart.saturn.house,
                rahuHouse: chart.rahu.house,
                ketuHouse: chart.ketu.house,
                ascendantDegree: chart.lagna.degree.toFixed(2),
                mcLongitude: chart.mc?.longitude != null ? String(chart.mc.longitude.toFixed(4)) : null,
              }).where(eq(profiles.id, activeProfile.id));
              for (const planet of planetData) {
                await upsertProfileNatalBody(activeProfile.id, planet.name, {
                  sign: planet.data.sign,
                  degree: planet.data.degree.toFixed(6),
                  house: planet.data.house,
                  nakshatra: planet.data.nakshatra || null,
                  pada: planet.data.pada || null,
                  longitude: planet.data.longitude != null ? planet.data.longitude.toFixed(6) : null,
                });
              }

              // David's directives (2026-07-14): every chart compute stores the full canon
              // research + the entire Vimshottari system. This legacy settings path is the
              // MAIN owner flow (BirthChartSheet) and does not go through recomputeProfileChart,
              // so it must store them itself. Best-effort: a failure never blocks the save.
              try {
                const { storeNatalResearch, storeDashaTree, storeConvergence } = await import('./vedic/research-store.js');
                const bodies: Record<string, { longitude: number; longitudeSpeed?: number; declination?: number }> = {};
                for (const planet of planetData) {
                  bodies[planet.name] = {
                    longitude: planet.data.longitude,
                    longitudeSpeed: (planet.data as any).longitudeSpeed,
                    declination: (planet.data as any).declination,
                  };
                }
                const storeInput = {
                  profileId: activeProfile.id,
                  bodies,
                  lagnaLon: chart.lagna.longitude,
                  mcLon: chart.mc?.longitude ?? null,
                  utcBirthIso: (chart as any).utcBirthIso,
                  latitude: input.birthLocationLat ? parseFloat(input.birthLocationLat) : 0,
                  longitude: input.birthLocationLon ? parseFloat(input.birthLocationLon) : 0,
                  basis: "ascendant" as const, // this path requires an exact birth time
                };
                const researchStatus = await storeNatalResearch(storeInput);
                await storeDashaTree(storeInput, researchStatus);
                await storeConvergence(storeInput, researchStatus);
              } catch (researchErr) {
                console.warn('[Birth Chart] Research/dasha store failed (chart itself saved):', researchErr);
              }
            }
          } catch (profileSyncErr) {
            console.warn('[Birth Chart] Profile sync failed:', profileSyncErr);
          }

          return { success: true, chart };
        } catch (error) {
          console.error('[Birth Chart] Calculation failed:', error);
          throw new Error(`Failed to calculate birth chart: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }),
  }),

  // ── PANCHANG ───────────────────────────────────────────────
    panchang: router({
    /**
     * Pressure layers for the active profile (Time Lord theme + transit pressure).
     * Feeds Aligned-For-Now ranking; not surfaced as its own card. Cached 5 min
     * per profile. Layer 1 (Panchapakshi) is intentionally absent for now.
     */
    currentLayers: protectedProcedure.query(async ({ ctx }) => {
      if (!ctx.subject) {
        return {
          timeLordPeriod: null,
          transits: { active: [] },
          computedAt: new Date().toISOString(),
        };
      }
      return getCurrentLayers(ctx.subject);
    }),

    today: publicProcedure.query(async (opts) => {
      // Use user's stored location for timing; use active profile lagna for interpretation
      const now = new Date();
      let dateStr: string;
      let lat: number;
      let lon: number;
      let utcOffset: number;
      const user = opts.ctx.user ? await getUserById(opts.ctx.user.id) : null;
      if (user?.locationLat && user?.locationLon && user?.locationTimezone) {
        lat = parseFloat(user.locationLat);
        lon = parseFloat(user.locationLon);
        utcOffset = getTimezoneOffset(user.locationTimezone, now);
        const localDate = new Date(now.getTime() + utcOffset * 60 * 60 * 1000);
        dateStr = localDate.toISOString().split('T')[0];
      } else {
        const bostonOffset = getBostonOffset(now);
        const bostonDate = new Date(now.getTime() + bostonOffset * 60 * 60 * 1000);
        dateStr = bostonDate.toISOString().split('T')[0];
        lat = 42.3601;
        lon = -71.0589;
        utcOffset = bostonOffset;
      }
      // Use active profile (or owner profile) lagna — single source of truth
      const lagnaSign = opts.ctx.subject?.lagnaSign ?? undefined;
      const pd = await subjectPersonalDay(opts.ctx.subject, dateStr);
      return getDayField(dateStr, false, { lat, lon, utcOffset }, lagnaSign, pd.rating, pd.mode);
    }),

    byDate: publicProcedure
      .input(z.object({ date: z.string() }))
      .query(async (opts) => {
        const user = opts.ctx.user ? await getUserById(opts.ctx.user.id) : null;
        let locationOverride: { lat: number; lon: number; utcOffset: number } | undefined;
        if (user?.locationLat && user?.locationLon && user?.locationTimezone) {
          // audit MEDIUM-8: offset for the READING's date, not `now` — else a browsed date in a
          // different DST regime got a time-string shifted by the DST delta (Dec viewer opening July).
          const at = new Date(opts.input.date + "T12:00:00Z");
          locationOverride = {
            lat: parseFloat(user.locationLat),
            lon: parseFloat(user.locationLon),
            utcOffset: getTimezoneOffset(user.locationTimezone, at),
          };
        }
        // Use active profile (or owner profile) lagna — single source of truth
        const lagnaOverride = opts.ctx.subject?.lagnaSign ?? undefined;
        const pd = await subjectPersonalDay(opts.ctx.subject, opts.input.date);
        return getDayField(opts.input.date, false, locationOverride, lagnaOverride, pd.rating, pd.mode);
      }),

    byMonth: publicProcedure
      .input(z.object({ yearMonth: z.string() }))
      .query(async (opts) => {
        const user = opts.ctx.user ? await getUserById(opts.ctx.user.id) : null;
        // audit MEDIUM-8: offset is computed PER-DAY (below), not once at `now` — so a month that
        // spans a DST transition, or a month browsed from another DST regime, gets correct times.
        const loc = (user?.locationLat && user?.locationLon && user?.locationTimezone)
          ? { lat: parseFloat(user.locationLat), lon: parseFloat(user.locationLon), tz: user.locationTimezone }
          : null;
        // Use active profile (or owner profile) lagna — single source of truth
        const lagnaOverride = opts.ctx.subject?.lagnaSign ?? undefined;
        const [year, month] = opts.input.yearMonth.split('-').map(Number);
        const daysInMonth = new Date(year, month, 0).getDate();
        const results = [];
        for (let d = 1; d <= daysInMonth; d++) {
          const dateStr = `${year}-${String(month).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
          const locationOverride = loc
            ? { lat: loc.lat, lon: loc.lon, utcOffset: getTimezoneOffset(loc.tz, new Date(dateStr + "T12:00:00Z")) }
            : undefined;
          const field = await getDayField(dateStr, false, locationOverride, lagnaOverride);
          if (field) results.push(field);
        }
        return results;
      }),

    recalculate: publicProcedure
      .input(z.object({ date: z.string() }))
      .mutation(async ({ input }) => {
        const field = await getDayField(input.date, true);
        return field;
      }),

    /**
     * Time Lord Influence — Advisory Layer (Experimental)
     * Returns Best Uses Today and Avoid Today based on mode + qualifier + Time Lord chain.
     * Does NOT change the mode. Purely advisory.
     */
        timeLordInfluence: protectedProcedure
      .input(z.object({ date: z.string().optional() }))
      .query(async ({ ctx, input }) => {
        // Use active profile birth data for interpretation; user location for timing
        const subject = ctx.subject;
        if (!subject?.birthDate || !subject?.lagnaSign) {
          return null; // Not enough data to compute
        }
        const user = await getUserById(ctx.user.id);
        // Get today's panchang
        const now = new Date();
        let dateStr = input?.date ?? now.toISOString().split('T')[0];
        let locationOverride: { lat: number; lon: number; utcOffset: number } | undefined;
        if (user?.locationLat && user?.locationLon && user?.locationTimezone) {
          const utcOffset = getTimezoneOffset(user.locationTimezone, now);
          if (!input?.date) {
            const localDate = new Date(now.getTime() + utcOffset * 60 * 60 * 1000);
            dateStr = localDate.toISOString().split('T')[0];
          }
          locationOverride = { lat: parseFloat(user.locationLat), lon: parseFloat(user.locationLon), utcOffset };
        }
        const pd = await subjectPersonalDay(subject, dateStr);
        const dayField = await getDayField(dateStr, false, locationOverride, subject.lagnaSign, pd.rating, pd.mode);
        if (!dayField) return null;
        // Get current profection year Time Lord data from active profile
        const { calculateProfectionYear } = await import('./profection/calculator.js');
        const profection = calculateProfectionYear(subject.birthDate, dateStr, subject.lagnaSign);
        const natalBodies = subject.natalBodies;
        const timeLordBody = natalBodies.find(b => b.planet === profection.timeLord);

        const influence = generateTimeLordInfluence({
          finalMode: dayField.mode as import('../shared/types.js').TaskMode,
          qualifier: dayField.qualifier ?? '',
          timeLord: profection.timeLord,
          natalSign: timeLordBody?.sign ?? 'Unknown',
          natalNakshatra: timeLordBody?.nakshatra ?? null,
          natalHouse: timeLordBody?.house ?? 6,
          activatedHouse: profection.activatedHouse,
          activatedSign: profection.activatedSign,
        });

        // Include qualifier-specific question for Today page
        const { getQualifierStyle } = await import('./panchang/qualifier-styles.js');
        const qualStyle = getQualifierStyle(
          dayField.qualifier ?? '',
          dayField.mode
        );

        return {
          ...influence,
          date: dateStr,
          finalMode: dayField.mode,
          qualifier: dayField.qualifier ?? null,
          baseMode: dayField.baseMode ?? null,
          questionForToday: qualStyle.questionForToday,
          decisionStyle: qualStyle.decisionStyle,
          emphasis: qualStyle.emphasis,
          // Profection context for reminder text
          timeLord: profection.timeLord,
          activatedHouse: profection.activatedHouse,
          activatedSign: profection.activatedSign,
          houseThemes: profection.houseThemes,
          planetaryThemes: profection.planetaryThemes,
        };
      }),

    /**
     * WHY THIS TODAY — the "why" destination behind the hero. Answers "why is
     * today shaped this way for ME" by stacking the three deterministic layers:
     *   1. SKY  — the day's raw quality (nakshatra / tithi), same for everyone.
     *   2. FILTER — how that sky lands on THIS chart: tārabala (day-star from the
     *      native's birth-star), chandrabala (transit Moon's house from natal Moon),
     *      the year's Time Lord + current dasha, and benefic/malefic transit pressure.
     * (The third layer — your check-in state — is folded in client-side.)
     * All chart math, free, auditable, never hallucinated.
     */
    whyToday: protectedProcedure
      .input(z.object({ date: z.string().optional() }))
      .query(async ({ ctx, input }) => {
        const subject = ctx.subject;
        if (!subject?.birthDate || !subject?.lagnaSign) return null;

        // Resolve the local date (user's stored location, else the app default).
        const user = await getUserById(ctx.user.id);
        const now = new Date();
        let dateStr = input?.date ?? now.toISOString().split("T")[0];
        let locationOverride: { lat: number; lon: number; utcOffset: number } | undefined;
        if (user?.locationLat && user?.locationLon && user?.locationTimezone) {
          const utcOffset = getTimezoneOffset(user.locationTimezone, now);
          if (!input?.date) {
            const localDate = new Date(now.getTime() + utcOffset * 60 * 60 * 1000);
            dateStr = localDate.toISOString().split("T")[0];
          }
          locationOverride = { lat: parseFloat(user.locationLat), lon: parseFloat(user.locationLon), utcOffset };
        }

        const pd = await subjectPersonalDay(subject, dateStr);
        const dayField = await getDayField(dateStr, false, locationOverride, subject.lagnaSign, pd.rating, pd.mode);
        if (!dayField) return null;

        const ZOD = ["Aries","Taurus","Gemini","Cancer","Leo","Virgo","Libra","Scorpio","Sagittarius","Capricorn","Aquarius","Pisces"];
        const NAK = ["Ashwini","Bharani","Krittika","Rohini","Mrigashira","Ardra","Punarvasu","Pushya","Ashlesha","Magha","Purva Phalguni","Uttara Phalguni","Hasta","Chitra","Swati","Vishakha","Anuradha","Jyeshtha","Mula","Purva Ashadha","Uttara Ashadha","Shravana","Dhanishtha","Shatabhisha","Purva Bhadrapada","Uttara Bhadrapada","Revati"];
        const ORD = ["","1st","2nd","3rd","4th","5th","6th","7th","8th","9th","10th","11th","12th"];

        const moon = subject.natalBodies.find((b) => b.planet === "Moon");
        const birthNakIdx = NAK.findIndex((n) => n.toLowerCase() === String(moon?.nakshatra ?? "").toLowerCase());
        const natalMoonSignIdx = ZOD.indexOf(moon?.sign ?? "");
        const lagnaSignIdx = ZOD.indexOf(subject.lagnaSign);
        if (birthNakIdx < 0 || natalMoonSignIdx < 0 || lagnaSignIdx < 0) return null;

        // The day's transit longitudes → sign indices (noon UTC, like Crown Days).
        const { calculateBirthChart } = await import("./birthchart/calculator.js");
        const { dayQuality } = await import("./panchang/auspiciousness.js");
        const { tarabala, chandrabala, transitScore } = await import("./panchang/crown.js");
        const ch: any = await calculateBirthChart(dateStr, "12:00", 0, 0, "UTC");
        const si = (lon: number) => Math.floor((((lon % 360) + 360) % 360) / 30);
        const T: Record<string, number> = {
          Sun: si(ch.sun.longitude), Moon: si(ch.moon.longitude), Mars: si(ch.mars.longitude),
          Mercury: si(ch.mercury.longitude), Jupiter: si(ch.jupiter.longitude), Venus: si(ch.venus.longitude),
          Saturn: si(ch.saturn.longitude), Rahu: si(ch.rahu.longitude), Ketu: si(ch.ketu.longitude),
        };

        const dq = dayQuality(ch.sun.longitude, ch.moon.longitude, 2);
        const { majorityDayStarIdx } = await import("./panchang/crown.js");
        const dayNakIdx = (await majorityDayStarIdx(dateStr)) ?? dq.nakshatra; // majority-of-day star (David 2026-07-09)
        const dayMoonSignIdx = si(ch.moon.longitude);
        const tb = tarabala(birthNakIdx, dayNakIdx);
        const cb = chandrabala(natalMoonSignIdx, dayMoonSignIdx);
        const ts = transitScore({ transitSignByPlanet: T, natalMoonSignIdx, lagnaSignIdx, dayTithi: dq.tithi });

        // Year's Time Lord (the chapter) + current dasha (the long season).
        const { calculateProfectionYear } = await import("./profection/calculator.js");
        const profection = calculateProfectionYear(subject.birthDate, dateStr, subject.lagnaSign);
        let dasha: { maha: string; antar: string } | null = null;
        try {
          const { calculateDashaTimeline } = await import("./dasha-calculator.js");
          const tl = calculateDashaTimeline(subject.birthDate, moon?.nakshatra ?? "", moon?.sign ?? "", moon?.degree ?? "0", dateStr, moon?.longitude ?? null);
          const cur = tl.entries.find((e) => e.isCurrent);
          if (cur) dasha = { maha: cur.mahadasha, antar: cur.antardasha };
        } catch { /* dasha optional */ }

        const skyQuality: "clean" | "mixed" | "rough" = dq.score >= 1 ? "clean" : dq.score <= -1 ? "rough" : "mixed";
        const skyLine =
          skyQuality === "clean"
            ? `A clean day in the sky — ${dayField.nakshatra} carries it well.`
            : skyQuality === "rough"
            ? `A rougher day in the sky — ${dayField.nakshatra} runs against the grain.`
            : `A middling day in the sky — ${dayField.nakshatra}, neither lift nor drag.`;

        return {
          date: dateStr,
          mode: dayField.mode,
          qualifier: dayField.qualifier ?? null,
          sky: {
            nakshatra: dayField.nakshatra,
            tithi: typeof dayField.tithi === "string" ? dayField.tithi : `${dayField.tithiPaksha} ${dayField.tithi}`,
            moonSign: dayField.moonSign,
            karana: dayField.karana
              ? { name: dayField.karana.name, altName: dayField.karana.altName ?? null, quality: dayField.karana.quality, vishti: dayField.karana.name === "Vishti" }
              : null,
            quality: skyQuality,
            line: skyLine,
          },
          chart: {
            house: dayField.houseActivated,          // Moon's house from your lagna today
            tara: { name: tb.name, favorable: tb.favorable, quality: tb.quality },
            chandra: { house: cb.house, houseLabel: ORD[cb.house], favorable: cb.favorable, quality: cb.quality },
            timeLord: { lord: profection.timeLord, house: profection.activatedHouse, houseLabel: ORD[profection.activatedHouse] },
            dasha,
            support: ts.support,
            affliction: ts.affliction,
          },
        };
      }),
  }),

  // ── SYSTEM PROMPTS ─────────────────────────────────────────
  systemPrompts: router({
    // ADMIN-ONLY (audit 2026-07-17, C3): these were plain protectedProcedure. The
    // feature_flags row lives in this table, so any logged-in user could upsert it to
    // unlock every premium surface for everyone, and list leaked the tester allowlist.
    // Client-side admin routing is no defense against direct tRPC calls.
    list: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN", message: "Admins only" });
      return getAllSystemPrompts();
    }),

    upsert: protectedProcedure
      .input(
        z.object({
          key: z.string().min(1).max(64),
          title: z.string().min(1).max(128),
          content: z.string().max(20000),
        })
      )
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN", message: "Admins only" });
        await upsertSystemPrompt(input.key, input.title, input.content);
        return { success: true };
      }),
  }),

  // ── SUBTASKS ───────────────────────────────────────────────
  subtasks: router({
    list: protectedProcedure
      .input(z.object({ taskId: z.number() }))
      .query(async ({ ctx, input }) => {
        return getSubtasksByTask(input.taskId, ctx.user.id);
      }),

    create: protectedProcedure
      .input(z.object({ taskId: z.number(), title: z.string().min(1).max(512) }))
      .mutation(async ({ ctx, input }) => {
        // Verify the parent task belongs to the caller (audit L6) — the ownership assert every
        // other task endpoint has was missing here, so a subtask could be attached to another
        // user's task id (orphan-write pollution).
        const parent = await getTaskById(input.taskId, ctx.user.id);
        if (!parent) throw new TRPCError({ code: "NOT_FOUND", message: "Task not found" });
        const result = await createSubtask({ taskId: input.taskId, userId: ctx.user.id, title: input.title });
        return result;
      }),

    // THE BREAKDOWN DOOR (neurodivergent-UX roadmap #2): one explicit tap on a task → 3-7 tiny
    // plain steps land as subtasks. Door Law (never auto-fires), ownership-checked, rate-limited;
    // ~300-token call, so cheap — but still metered.
    decompose: protectedProcedure
      .input(z.object({ taskId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        rateLimit(ctx.req, "task-decompose", { max: 20, windowMs: 15 * 60 * 1000 });
        const parent = await getTaskById(input.taskId, ctx.user.id);
        if (!parent) throw new TRPCError({ code: "NOT_FOUND", message: "Task not found" });
        const existing = await getSubtasksByTask(input.taskId, ctx.user.id);
        if (existing.length > 0) return { created: 0 }; // never overwrite hand-made steps
        const { generateTaskSteps, hasAnthropicKey } = await import("./narrative/generate.js");
        if (!hasAnthropicKey()) return { created: 0 };
        const steps = await generateTaskSteps(parent.title, (parent as any).notes ?? null);
        if (!steps) return { created: 0 };
        for (const title of steps) await createSubtask({ taskId: input.taskId, userId: ctx.user.id, title });
        return { created: steps.length };
      }),

    toggle: protectedProcedure
      .input(z.object({ id: z.number(), isCompleted: z.boolean() }))
      .mutation(async ({ ctx, input }) => {
        await toggleSubtask(input.id, ctx.user.id, input.isCompleted);
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await deleteSubtask(input.id, ctx.user.id);
        return { success: true };
      }),
  }),

  // ── PROJECTS ─────────────────────────────────────────────
  projects: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      const subject = ctx.subject;
      const profileId = subject?.profileId ?? null;
      const rows = await getProjectsByUser(ctx.user.id, profileId);
      return rows.map((p) => ({ ...p, lifeAreas: parseLifeAreas((p as any).lifeAreas) }));
    }),

    listAll: protectedProcedure.query(async ({ ctx }) => {
      const subject = ctx.subject;
      const profileId = subject?.profileId ?? null;
      const rows = await getAllProjectsByUser(ctx.user.id, profileId);
      return rows.map((p) => ({ ...p, lifeAreas: parseLifeAreas((p as any).lifeAreas) }));
    }),

    create: protectedProcedure
      .input(z.object({ name: z.string().min(1).max(256), lifeAreas: z.array(z.string()).optional() }))
      .mutation(async ({ ctx, input }) => {
        const subject = ctx.subject;
        const profileId = subject?.profileId ?? null;
        return createProject(ctx.user.id, input.name, profileId, input.lifeAreas ?? []);
      }),

    setLifeAreas: protectedProcedure
      .input(z.object({ id: z.number(), lifeAreas: z.array(z.string()) }))
      .mutation(async ({ ctx, input }) => {
        const subject = ctx.subject;
        const profileId = subject?.profileId ?? null;
        await setProjectLifeAreas(input.id, ctx.user.id, input.lifeAreas, profileId);
        return { success: true };
      }),

    rename: protectedProcedure
      .input(z.object({ id: z.number(), name: z.string().min(1).max(256) }))
      .mutation(async ({ ctx, input }) => {
        await renameProject(input.id, ctx.user.id, input.name);
        return { success: true };
      }),

    archive: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await archiveProject(input.id, ctx.user.id);
        return { success: true };
      }),

    unarchive: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await unarchiveProject(input.id, ctx.user.id);
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await deleteProject(input.id, ctx.user.id);
        return { success: true };
      }),

    stats: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ ctx, input }) => {
        const subject = ctx.subject;
        const profileId = subject?.profileId ?? null;
        return getProjectStats(input.projectId, ctx.user.id, profileId);
      }),

    insights: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ ctx, input }) => {
        const subject = ctx.subject;
        const profileId = subject?.profileId ?? null;
        return getProjectInsights(input.projectId, ctx.user.id, profileId);
      }),

    recommendedNextTask: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ ctx, input }) => {
        const subject = ctx.subject;
        const profileId = subject?.profileId ?? null;
        return getRecommendedNextTask(input.projectId, ctx.user.id, profileId);
      }),

    getNote: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ ctx, input }) => {
        return getProjectNote(input.projectId, ctx.user.id);
      }),

    upsertNote: protectedProcedure
      .input(z.object({ projectId: z.number(), content: z.string() }))
      .mutation(async ({ ctx, input }) => {
        await upsertProjectNote(input.projectId, ctx.user.id, input.content);
        return { success: true };
      }),
  }),

  // ── REFLECTIONS ────────────────────────────────────────────
  reflections: router({
    get: protectedProcedure
      .input(z.object({ date: z.string() }))
      .query(async ({ ctx, input }) => {
        const subject = ctx.subject;
        const profileId = subject?.profileId ?? null;
        return getReflectionByDate(ctx.user.id, input.date, profileId);
      }),

    history: protectedProcedure
      .input(z.object({ limit: z.number().int().min(1).max(365).default(60) }).optional())
      .query(async ({ ctx, input }) => {
        const subject = ctx.subject;
        const profileId = subject?.profileId ?? null;
        return getReflectionsByUser(ctx.user.id, input?.limit ?? 60, profileId);
      }),

    upsert: protectedProcedure
      .input(z.object({ date: z.string(), content: z.string().max(4000) }))
      .mutation(async ({ ctx, input }) => {
        const subject = ctx.subject;
        const profileId = subject?.profileId ?? null;
        await upsertReflection(ctx.user.id, input.date, input.content, profileId);
        return { success: true };
      }),
  }),

  // ── PROFECTION YEARS ───────────────────────────────────────
  profection: profectionRouter,
  timeLordTransit: timeLordTransitRouter,

  // ── MERIDIAN (MC/IC axis: which grahas are activating your voice axis now) ──
  meridian: router({
    current: protectedProcedure.query(async ({ ctx }) => {
      const { getActiveProfile, getProfileNatalBodies } = await import("./routers/profiles.js");
      const profile = await getActiveProfile(ctx.user.id);
      if (!profile || !(profile as any).mcLongitude) return null;
      const bodies = await getProfileNatalBodies(profile.id);
      const natalHouseByPlanet: Record<string, number | null> = {};
      let moon: any = null;
      for (const b of bodies) { natalHouseByPlanet[b.planet] = b.house ?? null; if (b.planet === "Moon") moon = b; }
      const mcLon = parseFloat((profile as any).mcLongitude);
      const { computeMeridianRead, computeMeridianArc } = await import("./meridian/activations.js");
      const read = await computeMeridianRead(mcLon, natalHouseByPlanet);
      const chapters = await computeMeridianArc(mcLon, natalHouseByPlanet);

      // Overlay the antardasha (sub-lord) at each chapter's open/peak/close — the
      // karmic thread that sets the stage, carries it, and shows the lesson.
      if (moon?.nakshatra && (profile as any).birthDate) {
        try {
          const { calculateDashaTimeline } = await import("./dasha-calculator.js");
          const today = new Date().toISOString().slice(0, 10);
          const tl = calculateDashaTimeline(
            String((profile as any).birthDate).slice(0, 10),
            moon.nakshatra, moon.sign, String(moon.degree), today, moon.longitude ?? null,
          );
          const adAt = (iso?: string) => iso ? (tl.entries.find((e) => e.startDate <= iso && iso <= e.endDate)?.antardasha ?? null) : null;
          for (const ch of chapters) {
            ch.antardasha = { open: adAt(ch.enterDateISO) ?? "?", carry: adAt(ch.peakDateISO) ?? "?", close: adAt(ch.exitDateISO) ?? "?" };
          }
        } catch { /* dasha overlay is best-effort */ }
      }
      return { ...read, chapters };
    }),
  }),

  // ── CROWN DAYS — the personal macro layer: which days are YOURS this month ──
  crown: router({
    /** THE calendar's marks — crown octagrams and caution rings — now sourced from the SAME
     *  ranked solar year as everything else (David 2026-07-15: "this is the crown day calendar"
     *  → "one calendar" → "i want the marks to reflect the calendar"). The old crownDay
     *  composite (an invented scoring blend flagged in REBUILD_MAP) is retired from this
     *  surface: a CROWN is one of the year's twelve crowning days; a CAUTION is a loss-star
     *  day at full force. `why` speaks plain lived language — never the machinery. */
    forMonth: protectedProcedure
      .input(z.object({ year: z.number().int(), month: z.number().int().min(1).max(12) }))
      .query(async ({ ctx, input }) => {
        const { getActiveProfile } = await import("./routers/profiles.js");
        const profile = await getActiveProfile(ctx.user.id);
        if (!profile || !(profile as any).lagnaSign || !(profile as any).birthDate) return null;
        const ZOD = ["Aries","Taurus","Gemini","Cancer","Leo","Virgo","Libra","Scorpio","Sagittarius","Capricorn","Aquarius","Pisces"];
        const lagnaSignIdx = ZOD.indexOf((profile as any).lagnaSign);
        if (lagnaSignIdx < 0) return null;

        // Which solar year (birthday→birthday) each viewed date belongs to, relative to today's.
        const [, bm, bd] = String((profile as any).birthDate).split("-").map(Number);
        const solarStartYear = (y: number, m: number, d: number) =>
          (m < bm || (m === bm && d < bd)) ? y - 1 : y;
        const today = new Date();
        const todaySolar = solarStartYear(today.getUTCFullYear(), today.getUTCMonth() + 1, today.getUTCDate());

        const { applyWeatherGate } = await import("./panchang/interpreter.js");
        const { dayFilter, movementOf, cappedSentence, MOVEMENT_WORD } = await import("./vedic/day-filter.js");
        const { planetLongitudeSpeed } = await import("./birthchart/calculator.js");
        const p2 = (n: number) => String(n).padStart(2, "0");
        const daysInMonth = new Date(Date.UTC(input.year, input.month, 0)).getUTCDate();

        // The month can straddle two solar years (the birthday month) — fetch both, cached.
        const offsets = new Set<number>();
        for (const d of [1, daysInMonth]) offsets.add(solarStartYear(input.year, input.month, d) - todaySolar);
        const years = new Map<number, any>();
        for (const off of Array.from(offsets)) {
          if (Math.abs(off) <= 1) years.set(off, await rankedSolarYearFor(ctx.user.id, off));
        }

        const days: any[] = [];
        for (let d = 1; d <= daysInMonth; d++) {
          const date = `${input.year}-${p2(input.month)}-${p2(d)}`;
          const off = solarStartYear(input.year, input.month, d) - todaySolar;
          const yr = years.get(off);
          const day = yr?.days?.find((x: any) => x.date === date);
          if (!day) { days.push({ date, rating: "neutral", why: "" }); continue; }

          const isCrown = yr.summary.topDates.includes(date);
          const isQuiet = day.tara.taraNum === 7 && day.tara.cycle === 1 && day.tara.quality === "bad";
          const rating = isCrown ? "crown" : isQuiet ? "caution" : "neutral";
          const openLine = day.plain.windows.length ? ` Open now: ${day.plain.windows.join(", ")}.` : "";
          const why = isCrown
            ? `A ${day.plain.day.toLowerCase()} day — ${day.plain.feel}, and ${day.plain.moon}. One of the twelve crowning days of your year.${openLine}`
            : isQuiet
            ? "A loss day at full force — nothing forward, nothing new. Contain."
            : "";

          // THE DAY CHARACTER — the classical filter that replaced the four modes (David
          // 2026-07-15: "eliminate my 4 modes"). The invented interactionBaseMode is retired
          // from this surface; the task machinery runs on the documented bridge underneath.
          let mode: string | undefined;
          let character: any = undefined;
          try {
            const merc = await planetLongitudeSpeed("mercury", date, 12);
            const c = dayFilter({
              nakshatra: day.nakshatra ?? "",
              tithiNumber: day.tithiNumber ?? 1,
              varaLord: day.varaLord ?? "Sun",
              vishti: !!day.vishti,
              tara: day.tara,
            });
            // THE SIX MOVEMENTS (David 2026-07-15). Mercury gates the movement per the
            // SHIPPED rx law (interpreter.ts): retrograde caps Action at Build unless a
            // strong Moon (favorable tara AND chandra) punches through off the station core.
            const mv = movementOf(c, day.tara, isCrown, {
              mercuryRetro: merc.speed < 0,
              mercuryNearStation: Math.abs(merc.speed) < 0.15,
              chandraFavorable: !!day.chandra?.favorable,
            });
            // When the rx cap held a GO day at Build, the sentence holds it too.
            const capped = mv === "build" && merc.speed < 0 && day.tara.quality === "good"
              && (c.nature === "movable" || c.nature === "swift");
            if (capped) (c as any).sentence = cappedSentence(c.nature, c.headline);
            // Build days confess their depth (David 2026-07-15): the rung under the word.
            // deep = the great-friend rungs (9/8) · mid = the other favorable rungs · thin =
            // the softened/own-star ground. Shades come from the hero card's own gradient.
            // thin = the own-star ground (tender, personal); leaning = softened-HOSTILE ground
            // (the Builds that almost lean Restraint — David 2026-07-15, rose-ochre days).
            // David 2026-07-16: the rung-depth methodology extends to Selective and Action.
            // The apex (Golden) and the lowest point (Caution) stay flat — one color, one word.
            const depth = (mv === "build" || mv === "selective" || mv === "action")
              ? (day.tara.quality === "good"
                  ? (day.tara.taraNum >= 8 ? "deep" : "mid")
                  : day.tara.taraNum === 1 ? "thin" : "leaning")
              : undefined;
            character = {
              supportedKinds: (c as any).supportedKinds,
              nature: c.nature, family: c.family, headline: c.headline, sentence: c.sentence,
              supports: c.supports, avoid: c.avoid, vetoes: c.vetoes, contained: c.contained,
              movement: mv, movementWord: MOVEMENT_WORD[mv],
              ...(depth ? { depth } : {}),
              ...(depth && mv === "build" ? { buildDepth: depth } : {}),
            };
            // Task machinery bridge: four of the six ARE the task tags; golden covers anything,
            // caution is a hard stop. The weather gate stays as the final clamp.
            const taskMode = mv === "golden" ? "Action" : mv === "caution" ? "Restraint" : MOVEMENT_WORD[mv];
            mode = applyWeatherGate(taskMode as any, rating).finalMode;
          } catch { /* character optional — the day still marks and ranks */ }
          // The rung — so the month calendar can wear the SAME ladder tints as the year view
          // (David 2026-07-16: "I want the 2 calendars to blend into one").
          const rung = { num: day.tara.taraNum, quality: day.tara.quality };
          // Prosperity day = SAMPAT TARA (David 2026-07-15: "one of these literally said
          // prosperity — Sampat"): the 2nd rung of his ladder, wealth/prosperity by name,
          // ~every 9 days. (The old wealth-CONVERGENCE definition pointed at 2056 — retired.)
          const prosperity = day.tara?.taraNum === 2;
          // Moon-phase marks (David 2026-07-16): Purnima = full, Amavasya = new.
          const moonPhase = day.tithiNumber === 15 ? "full" : day.tithiNumber === 30 ? "new" : undefined;
          // Achievement day = SADHAKA TARA (rung 6, "the accomplisher" — David picked ✓):
          // the day for landing an aim — ship it, submit it, finish it.
          const achievement = day.tara?.taraNum === 6;
          days.push({ date, rating, why, mode, character, rung, ...(prosperity ? { prosperity } : {}), ...(achievement ? { achievement } : {}), ...(moonPhase ? { moonPhase } : {}) });
        }
        return { days };
      }),

    /** The full ranked solar year (the /year overview) — same source as forMonth. ADMIN v1. */
    forYear: protectedProcedure
      .input(z.object({ yearOffset: z.number().int().min(-1).max(1).default(0) }).optional())
      .query(async ({ ctx, input }) => {
        const { hasFeature } = await import("./feature-flags.js");
        if (!(await hasFeature(ctx.user, "yearPage"))) throw new TRPCError({ code: "FORBIDDEN", message: "Not available yet." });
        return rankedSolarYearFor(ctx.user.id, input?.yearOffset ?? 0);
      }),


    /** Natal dignity of each graha for the active profile — WITH neecha-bhanga cancellation, so a
     *  debilitated-but-cancelled planet is never read as flatly weak (David 2026-07-12). */
    dignities: protectedProcedure.query(async ({ ctx }) => {
      const { getActiveProfile, getProfileNatalBodies } = await import("./routers/profiles.js");
      const profile = await getActiveProfile(ctx.user.id);
      if (!profile || !(profile as any).lagnaSign) return null;
      const { natalDignities, GRAHAS } = await import("./vedic/dignity.js");
      const ZOD = ["Aries","Taurus","Gemini","Cancer","Leo","Virgo","Libra","Scorpio","Sagittarius","Capricorn","Aquarius","Pisces"];
      const lagIdx = ZOD.indexOf((profile as any).lagnaSign);
      if (lagIdx < 0) return null;
      const bodies = await getProfileNatalBodies(profile.id);
      const lonBy: Record<string, number> = {};
      for (const g of GRAHAS) {
        const b = bodies.find((x: any) => x.planet === g);
        const lon = b && (b as any).longitude != null ? parseFloat(String((b as any).longitude)) : NaN;
        if (Number.isNaN(lon)) return null; // incomplete chart → no partial verdict
        lonBy[g] = lon;
      }
      return natalDignities(lonBy as any, lagIdx * 30);
    }),
  }),

  // ── MASTER MODE (Pancha Pakshi hourly timing) — GATED to an allowlist (private) ──
  // THE LIFE ATLAS (David 2026-07-16): every life-theme window from the stored 120-year
  // convergence — dated, weighted (BIG KARMIC KNOTS), and VOICED per theme. Gated.
  atlas: router({
    // THE THIRST GATE (David 2026-07-16, "make it and gate it — keep them thirsty"):
    // every signed-in user sees the REAL themes with REAL counts from their own stored
    // timeline; the DATES and the voiced reading stay behind the veil until the flag opens.
    windows: protectedProcedure.query(async ({ ctx }) => {
      const { hasFeature } = await import("./feature-flags.js");
      const entitled = await hasFeature(ctx.user, "lifeAtlas");
      const { getActiveProfile } = await import("./routers/profiles.js");
      const profile = await getActiveProfile(ctx.user.id);
      if (!profile) return { available: false, entitled, themes: [] as any[] };
      const db = await getDb();
      if (!db) return { available: false, entitled, themes: [] as any[] };
      const { profileConvergence } = await import("../drizzle/schema.js");
      const rows = await db.select().from(profileConvergence).where(eq(profileConvergence.profileId, profile.id));
      const { mergeThemeWindows } = await import("./vedic/windows.js");
      const wins = mergeThemeWindows(rows as any);
      const LABELS: Record<string, string> = {
        marriage: "Marriage & union", children: "Children & creations", career: "Career & vocation",
        identity: "How you're received", fame: "Recognition", wealth: "Wealth & income",
        siblings: "Inner circle", parents: "Parents & roots", home: "Home & land", health: "Health & vitality",
      };
      const byTheme = new Map<string, any[]>();
      for (const w of wins) {
        if (!byTheme.has(w.theme)) byTheme.set(w.theme, []);
        byTheme.get(w.theme)!.push({ from: w.from, to: w.to, bigKnot: w.bigKnot, era: w.era, peak: w.peak });
      }
      return {
        available: true,
        entitled,
        themes: Array.from(byTheme.entries())
          .sort((a, b) => (a[1][0]?.from ?? "").localeCompare(b[1][0]?.from ?? ""))
          .map(([theme, windows]) => ({
            theme,
            label: LABELS[theme] ?? theme,
            windowCount: windows.length,
            knotCount: windows.filter((w) => w.bigKnot).length,
            eraCount: windows.filter((w) => w.era).length,
            // THE LOOSENED VEIL (David 2026-07-16): the DATES show for everyone — each
            // dateline is a door; the READINGS behind them stay entitled-only.
            windows,
          })),
      };
    }),
    windowRead: protectedProcedure
      .input(z.object({ theme: z.string().min(2).max(20), from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), refresh: z.boolean().optional() }))
      .query(async ({ ctx, input }) => {
        const { hasFeature } = await import("./feature-flags.js");
        if (!(await hasFeature(ctx.user, "lifeAtlas"))) return { available: false as const, locked: true as const, read: null, generatedAt: null, cached: false };
        const { getActiveProfile } = await import("./routers/profiles.js");
        const profile = await getActiveProfile(ctx.user.id);
        if (!profile) return { available: false as const, locked: false as const, read: null, generatedAt: null, cached: false };
        const LABELS: Record<string, string> = {
          marriage: "Marriage & union", children: "Children & creations", career: "Career & vocation",
          identity: "How you're received", fame: "Recognition", wealth: "Wealth & income",
          siblings: "Inner circle", parents: "Parents & roots", home: "Home & land", health: "Health & vitality",
        };
        const { getWindowReadCached } = await import("./narrative/service.js");
        return getWindowReadCached(profile.id, input.theme, LABELS[input.theme] ?? input.theme, input.from, input.refresh ?? false);
      }),
    themeRead: protectedProcedure
      .input(z.object({ theme: z.string().min(2).max(20), refresh: z.boolean().optional(), peek: z.boolean().optional() }))
      .query(async ({ ctx, input }) => {
        const { hasFeature } = await import("./feature-flags.js");
        if (!(await hasFeature(ctx.user, "lifeAtlas"))) return { available: false, read: null, windows: [], generatedAt: null, cached: false } as const;
        const { getActiveProfile } = await import("./routers/profiles.js");
        const profile = await getActiveProfile(ctx.user.id);
        if (!profile) return { available: false, read: null, windows: [], generatedAt: null, cached: false } as const;
        const LABELS: Record<string, string> = {
          marriage: "Marriage & union", children: "Children & creations", career: "Career & vocation",
          identity: "How you're received", fame: "Recognition", wealth: "Wealth & income",
          siblings: "Inner circle", parents: "Parents & roots", home: "Home & land", health: "Health & vitality",
        };
        const { getAtlasReadCached } = await import("./narrative/service.js");
        return await getAtlasReadCached(profile.id, input.theme, LABELS[input.theme] ?? input.theme, input.refresh ?? false, input.peek ?? false);
      }),
  }),

  // THE COMBINED READING — two charts, one read (David blessed 2026-07-16). Rides the
  // multi-profile seam; both profiles must belong to the caller; directional currents never fold.
  combined: router({
    read: protectedProcedure
      .input(z.object({ otherProfileId: z.number(), relation: z.enum(["love", "work", "friend", "parent", "child", "sibling"]), refresh: z.boolean().optional() }))
      .mutation(async ({ ctx, input }) => {
        if (!(await hasHoroscope(ctx.user))) return { available: false as const, locked: true as const };
        const { getActiveProfile, getProfileNatalBodies } = await import("./routers/profiles.js");
        const a = await getActiveProfile(ctx.user.id);
        if (!a) return { available: false as const, locked: false as const };
        const db = await getDb();
        if (!db) return { available: false as const, locked: false as const };
        const { profiles: profilesTable } = await import("../drizzle/schema.js");
        const { and: andW, eq: eqW } = await import("drizzle-orm");
        const [b] = await db.select().from(profilesTable).where(andW(eqW(profilesTable.id, input.otherProfileId), eqW(profilesTable.userId, ctx.user.id)));
        if (!b || b.id === a.id) return { available: false as const, locked: false as const };

        const SIGNS_Z = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"];
        const houseFrom = (sign: string, lagna: string) => ((SIGNS_Z.indexOf(sign) - SIGNS_Z.indexOf(lagna) + 12) % 12) + 1;
        const load = async (prof: any) => {
          const bodies: any[] = await getProfileNatalBodies(prof.id);
          const moon = bodies.find((x) => x.planet === "Moon");
          const mars = bodies.find((x) => x.planet === "Mars");
          return { prof, bodies, moon, mars };
        };
        const A = await load(a), B = await load(b);
        if (!A.moon || !B.moon || !a.lagnaSign || !b.lagnaSign) return { available: false as const, locked: false as const };

        const { computeMelana } = await import("./vedic/melana.js");
        // Canon context (Jyeshtha, renewed — 2026-07-17): padas unlock the nāḍī exceptions,
        // signs unlock the full kuja rule (Lagna+Moon+Venus, with cancellations).
        const conj = (side: any) => {
          const jup = side.bodies.find((x: any) => x.planet === "Jupiter");
          const moon = side.moon;
          return !!(side.mars && ((jup && jup.sign === side.mars.sign) || (moon && moon.sign === side.mars.sign)));
        };
        const venusA = A.bodies.find((x: any) => x.planet === "Venus"), venusB = B.bodies.find((x: any) => x.planet === "Venus");
        const melana = computeMelana({
          nakA: A.moon.nakshatra, nakB: B.moon.nakshatra,
          moonSignA: A.moon.sign, moonSignB: B.moon.sign,
          padaA: (A.moon as any).nakshatraPada ?? null, padaB: (B.moon as any).nakshatraPada ?? null,
          lagnaSignA: a.lagnaSign, lagnaSignB: b.lagnaSign,
          marsSignA: A.mars?.sign ?? null, marsSignB: B.mars?.sign ?? null,
          venusSignA: venusA?.sign ?? null, venusSignB: venusB?.sign ?? null,
          marsConjA: conj(A), marsConjB: conj(B),
        });
        const overlayOf = (fromB: any[], toLagna: string) => fromB.map((x) => ({ planet: x.planet, sign: x.sign, landsInHouse: houseFrom(x.sign, toLagna) }));
        // THE TWO CLOCKS — each side's running lords + where each sits in the OTHER chart.
        const { calculateDashaTimeline } = await import("./dasha-calculator.js");
        const today = new Date().toISOString().slice(0, 10);
        const clockOf = (side: any, otherLagna: string) => {
          try {
            const tl = calculateDashaTimeline(side.prof.birthDate, side.moon?.nakshatra || "", side.moon?.sign ?? "", String(side.moon?.degree ?? ""), today, side.moon?.longitude != null ? String(side.moon.longitude) : null);
            const cur: any = tl.entries.find((e: any) => e.isCurrent);
            if (!cur) return null;
            const seat = (lord: string) => {
              const pb = side.bodies.find((x: any) => x.planet === lord);
              return pb ? { lord, sign: pb.sign, sitsInOthersHouse: houseFrom(pb.sign, otherLagna) } : { lord };
            };
            return { maha: seat(cur.mahadasha), antar: seat(cur.antardasha), until: cur.endDate };
          } catch { return null; }
        };
        const RELATION_LENS: Record<string, number[]> = { love: [7, 5], work: [10, 6], friend: [11], parent: [4, 9], child: [5], sibling: [3] };
        const inputObj = {
          relation: input.relation, lensHouses: RELATION_LENS[input.relation],
          a: { name: a.name, lagna: a.lagnaSign, moonSign: A.moon.sign, moonNakshatra: A.moon.nakshatra },
          b: { name: b.name, lagna: b.lagnaSign, moonSign: B.moon.sign, moonNakshatra: B.moon.nakshatra },
          melana,
          overlay: { aInB: overlayOf(A.bodies, b.lagnaSign), bInA: overlayOf(B.bodies, a.lagnaSign) },
          concurrence: { a: clockOf(A, b.lagnaSign), b: clockOf(B, a.lagnaSign) },
        };
        const { getCombinedReadCached } = await import("./narrative/service.js");
        const res = await getCombinedReadCached(a.id, `pair-${b.id}-${input.relation}`, inputObj, input.refresh ?? false);
        return { ...res, locked: false as const, melana, names: { a: a.name, b: b.name } };
      }),
  }),

  // FEATURE FLAGS — the tester switchboard (David 2026-07-16). Buttons live in Settings
  // (admin section); audiences: admins | testers | everyone; testers = email allowlist.
  features: router({
    mine: protectedProcedure.query(async ({ ctx }) => {
      const { FEATURE_DEFS, hasFeature } = await import("./feature-flags.js");
      const keys = Object.keys(FEATURE_DEFS) as (keyof typeof FEATURE_DEFS)[];
      const entries = await Promise.all(keys.map(async (k) => [k, await hasFeature(ctx.user, k)] as const));
      return Object.fromEntries(entries) as Record<string, boolean>;
    }),
    all: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      const { getFlags, FEATURE_DEFS } = await import("./feature-flags.js");
      return { flags: await getFlags(), defs: FEATURE_DEFS };
    }),
    set: protectedProcedure
      .input(z.object({
        features: z.record(z.string(), z.enum(["admins", "testers", "everyone"])).optional(),
        testers: z.array(z.string().email()).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        const { getFlags, saveFlags } = await import("./feature-flags.js");
        const cur = await getFlags();
        await saveFlags({
          features: { ...cur.features, ...(input.features as any ?? {}) },
          testers: input.testers ?? cur.testers,
        });
        return { ok: true };
      }),
  }),

  masterMode: router({
    // Entitlement check — drives the locked/unlocked UI. Public to every signed-in user (they all
    // SEE the feature), but `entitled` is false unless it's turned on for them, which shows the lock.
    access: protectedProcedure.query(({ ctx }) => ({ entitled: hasMasterMode(ctx.user) })),
    today: protectedProcedure
      .input(z.object({ date: z.string(), lat: z.number().optional(), lon: z.number().optional(), nowMs: z.number().optional() }))
      .query(async ({ ctx, input }) => {
        // Private feature flag: only these users see Time Master (David = user 2).
        if (!hasMasterMode(ctx.user)) return null;

        const { getActiveProfile, getProfileNatalBodies } = await import("./routers/profiles.js");
        const profile = await getActiveProfile(ctx.user.id);
        if (!profile) return null;
        const bodies = await getProfileNatalBodies(profile.id);
        let moonNak: string | null = null, sunLon: number | null = null, moonLon: number | null = null;
        const natal: Record<string, { house: number | null; longitude: number | null }> = {};
        for (const b of bodies) {
          natal[b.planet] = {
            house: (b as any).house ?? null,
            longitude: (b as any).longitude != null ? parseFloat((b as any).longitude) : null,
          };
          if (b.planet === "Moon") { moonNak = b.nakshatra ?? null; moonLon = (b as any).longitude != null ? parseFloat((b as any).longitude) : null; }
          if (b.planet === "Sun") sunLon = (b as any).longitude != null ? parseFloat((b as any).longitude) : null;
        }
        if (!moonNak || sunLon == null || moonLon == null) return null;

        const { pakshaFromSunMoon } = await import("./panchapakshi/tables.js");
        const birthPaksha = pakshaFromSunMoon(sunLon, moonLon);
        const [y, m, d] = input.date.split("-").map(Number);
        const stored = await userLatLon(ctx.user.id);
        const lat = input.lat ?? stored?.lat ?? 42.3601, lon = input.lon ?? stored?.lon ?? -71.0589;
        const { computeMasterMode } = await import("./panchapakshi/compute.js");
        const master = await computeMasterMode({ birthNakshatra: moonNak, birthPaksha, lat, lon, year: y, month: m, day: d });
        if (!master) return null;

        // Golden hour: fuse the current hora with the bird (Hora × Pañcapakṣi). Best-effort —
        // needs the lagna; if it isn't set the card just shows the plain Now block.
        let goldenNow = null;
        try {
          const lagnaSign = (profile as any).lagnaSign;
          if (lagnaSign) {
            const { computeGoldenHour } = await import("./panchapakshi/golden-hour.js");
            goldenNow = await computeGoldenHour({
              year: y, month: m, day: d, nowMs: input.nowMs ?? Date.now(), lat, lon,
              birthNakshatra: moonNak, birthPaksha,
              lagnaSign, ascendantDegree: (profile as any).ascendantDegree ?? null, natal,
            });
          }
        } catch { goldenNow = null; }

        return { ...master, goldenNow };
      }),

    /**
     * HORA — the planetary hour (intraday layer, next to Master Mode). Same gating.
     * Returns the 24-hora timeline (epoch ms) for the window that CONTAINS now, so
     * the client can always highlight the current hora. Deterministic; proven by
     * server/scripts/hora-check.ts.
     */
    hora: protectedProcedure
      .input(z.object({ date: z.string(), lat: z.number().optional(), lon: z.number().optional(), nowMs: z.number().optional() }))
      .query(async ({ ctx, input }) => {
        if (!hasMasterMode(ctx.user)) return null;

        const { computeHoras, HORA_TONE } = await import("./panchang/hora.js");
        const stored = await userLatLon(ctx.user.id);
        const lat = input.lat ?? stored?.lat ?? 42.3601, lon = input.lon ?? stored?.lon ?? -71.0589;
        const now = input.nowMs ?? Date.now();
        let [y, m, d] = input.date.split("-").map(Number);
        let horas = computeHoras(y, m, d, lat, lon);
        // Before today's sunrise → the active window belongs to the previous civil day.
        if (now < horas[0].startMs) {
          const prev = new Date(Date.UTC(y, m - 1, d - 1));
          horas = computeHoras(prev.getUTCFullYear(), prev.getUTCMonth() + 1, prev.getUTCDate(), lat, lon);
        }

        // Golden-hour flags per hora — the "plan ahead" signal in the list. Best-effort: needs the
        // user's bird (birth Moon nakshatra + paksha). If unavailable, the list omits the marks.
        // computeGoldenHoras rebuilds the SAME hora window (same nowMs/date/loc), so index aligns.
        const goldenByIndex = new Map<number, { goldenStartMs: number | null; goldenEndMs: number | null }>();
        try {
          const { getActiveProfile, getProfileNatalBodies } = await import("./routers/profiles.js");
          const profile = await getActiveProfile(ctx.user.id);
          if (profile) {
            const bodies = await getProfileNatalBodies(profile.id);
            let moonNak: string | null = null, sunLon: number | null = null, moonLon: number | null = null;
            for (const b of bodies) {
              if (b.planet === "Moon") { moonNak = b.nakshatra ?? null; moonLon = (b as any).longitude != null ? parseFloat((b as any).longitude) : null; }
              if (b.planet === "Sun") sunLon = (b as any).longitude != null ? parseFloat((b as any).longitude) : null;
            }
            if (moonNak && sunLon != null && moonLon != null) {
              const { pakshaFromSunMoon } = await import("./panchapakshi/tables.js");
              const { computeGoldenHoras } = await import("./panchapakshi/golden-hour.js");
              const flags = await computeGoldenHoras({
                year: y, month: m, day: d, nowMs: now, lat, lon,
                birthNakshatra: moonNak, birthPaksha: pakshaFromSunMoon(sunLon, moonLon),
              });
              for (const f of flags) if (f.isGolden) goldenByIndex.set(f.index, { goldenStartMs: f.goldenStartMs, goldenEndMs: f.goldenEndMs });
            }
          }
        } catch { /* golden flags are optional; fall back to a plain hora list */ }

        return {
          horas: horas.map((h) => {
            const g = goldenByIndex.get(h.index);
            return {
              index: h.index, lord: h.lord, phase: h.phase, tone: h.tone,
              good: HORA_TONE[h.lord].good, startMs: h.startMs, endMs: h.endMs,
              isGolden: !!g, goldenStartMs: g?.goldenStartMs ?? null, goldenEndMs: g?.goldenEndMs ?? null,
            };
          }),
        };
      }),
  }),

  // ── HOROSCOPE (the "pick a date" premium reading) — GATED (same lock as Master Mode) ──
  // Pick any date → a date-specific deep read is generated once and FROZEN as an immutable
  // "purchased" snapshot (in the horoscopes table), with the user's own notes under it. The
  // calendar scrolls back through every date they've revealed. Same allowlist as Time Master.
  horoscope: router({
    // Drives the lock UI — public to every signed-in user, entitled only off the allowlist.
    access: protectedProcedure.query(async ({ ctx }) => ({ entitled: await hasHoroscope(ctx.user) })),
    /** THE CHART'S YOGAS — the list is FREE (thirst: real names, real strength), the
     *  readings are premium. From the stored both-volumes research. */
    yogasList: protectedProcedure.query(async ({ ctx }) => {
      const { getActiveProfile } = await import("./routers/profiles.js");
      const profile = await getActiveProfile(ctx.user.id);
      if (!profile) return { available: false as const, yogas: [] as any[] };
      const { getStoredResearch } = await import("./vedic/research-store.js");
      const research: any = await getStoredResearch(profile.id);
      // THE NAMEPLATE (David 2026-07-17: "Those yoga names might as well be written in
      // Arabic or Sanskrit or Khmer") — every locked door gets a plain-language line:
      // the canon's own "result" + the type in lived words. Free tier; the READING stays gated.
      // 2026-07-18 fix: the canon was loaded via readFileSync from a path that doesn't
      // exist in the prod bundle (and the root is {yogas: []}, not an array) — glosses
      // never shipped. Now BUNDLED via static import, so the nameplate can't go missing.
      const canonYogas: any[] = (canonYogasJson as any)?.yogas ?? [];
      const TYPE_WORD: Record<string, string> = {
        raja: "a royal combination", dhana: "a wealth combination", mahapurusha: "a great-person mark",
        nabhasa: "a sky-pattern", chandra: "a moon-born gift", lunar: "a moon-side gift",
        solar: "a sun-side companion", "lunar-affliction": "a moon left unaccompanied",
        benefic: "a gentle blessing", "benefic-enclosure": "protected on both sides",
        "malefic-enclosure": "pressed on both sides", "benefic-kendra": "a blessing at the pillars",
        "malefic-kendra": "a testing seat at the pillars", exchange: "two lords trade houses",
        parivartana: "two lords trade houses", fortune: "a fortune mark",
        "nodal-affliction": "a serpent knot", intellect: "a mind-brightening pair",
        reversal: "strength born of trouble", vipreet: "strength born of trouble",
        learning: "a learning gift", progeny: "a children-and-legacy mark",
        protective: "a guarding mark", renunciation: "a letting-go mark",
        arishta: "a hardship knot", "arishta-bhanga": "a hardship undone", affliction: "a hardship knot",
      };
      const yogas = (research?.yogas ?? []).map((y: any) => {
        const c = (canonYogas ?? []).find((cy: any) => cy.name === y.name || cy.name.startsWith(y.name + " "));
        return {
          name: y.name, type: y.type, vantages: y.frames?.length ?? 1, repeatsInNavamsha: !!y.inNavamsha,
          kind: TYPE_WORD[y.type] ?? TYPE_WORD[c?.type] ?? null,
          gloss: c?.result ?? null,
        };
      });
      // THE FREE TASTE (David 2026-07-16: "the user pics") — the yoga this profile has
      // already opened un-entitled (recorded by its cached read; null = pick still open).
      const { listYogaReadKeys } = await import("./db.js");
      const { yogaDateKey } = await import("./narrative/service.js");
      const tasted = await listYogaReadKeys(profile.id);
      // Map the tasted cache-key slug back to the yoga's DISPLAY name — the client compares
      // freePick against display names (audit H4: this returned the raw slug, never matched).
      const tastedKey = tasted.find((k) => k.startsWith("yoga-")) ?? null;
      const freePick = tastedKey ? ((yogas.find((y: any) => yogaDateKey(y.name) === tastedKey)?.name) ?? null) : null;
      return { available: true as const, yogas, freePick };
    }),
    yogaRead: protectedProcedure
      .input(z.object({ name: z.string().min(2).max(64), refresh: z.boolean().optional() }))
      .query(async ({ ctx, input }) => {
        const { getActiveProfile } = await import("./routers/profiles.js");
        const profile = await getActiveProfile(ctx.user.id);
        if (!profile) return { available: false as const, locked: false as const, read: null, generatedAt: null, cached: false };
        // THE FREE TASTE: un-entitled, each profile opens ONE yoga of their choosing —
        // the pick is the cached read itself (re-readable forever); every other yoga gates.
        if (!(await hasHoroscope(ctx.user))) {
          const { listYogaReadKeys } = await import("./db.js");
          const { yogaDateKey } = await import("./narrative/service.js");
          const tasted = (await listYogaReadKeys(profile.id)).filter((k) => k.startsWith("yoga-"));
          // Compare on the SLUGGED key both sides (audit H4) — raw-name vs slug never matched,
          // so the free pick locked itself after one view.
          const isMyPick = tasted.includes(yogaDateKey(input.name));
          const pickStillOpen = tasted.length === 0;
          if (!isMyPick && !pickStillOpen) return { available: false as const, locked: true as const, read: null, generatedAt: null, cached: false };
          if (input.refresh) return { available: false as const, locked: true as const, read: null, generatedAt: null, cached: false };
        }
        const { getYogaReadCached } = await import("./narrative/service.js");
        return getYogaReadCached(profile.id, input.name, input.refresh ?? false);
      }),


    // Every date the active profile has purchased, newest first (calendar marks + scroll-back).
    list: protectedProcedure.query(async ({ ctx }) => {
      if (!(await hasHoroscope(ctx.user))) return null;
      const { getActiveProfile } = await import("./routers/profiles.js");
      const profile = await getActiveProfile(ctx.user.id);
      if (!profile) return [];
      const { listHoroscopes } = await import("./db.js");
      const rows = await listHoroscopes(profile.id, 200);
      return rows.map((r) => {
        let snippet = "";
        // Day-read snapshots lead with `scene` (a prose string); legacy year-read snapshots with coreTheme.synthesis.
        try { const c = JSON.parse(r.content); snippet = String(c?.scene ?? c?.coreTheme?.synthesis ?? "").replace(/\s+/g, " ").trim().slice(0, 160); } catch { /* keep empty */ }
        return { date: r.readingDate, lifeArea: r.lifeArea ?? "day", createdAt: r.createdAt, snippet, hasNotes: !!(r.notes && r.notes.trim()) };
      });
    }),

    // The frozen reading + notes for one date + life area (null if not yet purchased). lifeArea
    // defaults to 'day' so a legacy whole-day snapshot still resolves.
    get: protectedProcedure.input(z.object({ date: z.string(), lifeArea: z.string().default("day") })).query(async ({ ctx, input }) => {
      if (!(await hasHoroscope(ctx.user))) return null;
      const { getActiveProfile } = await import("./routers/profiles.js");
      const profile = await getActiveProfile(ctx.user.id);
      if (!profile) return null;
      const { getHoroscope } = await import("./db.js");
      const row = await getHoroscope(profile.id, input.date, input.lifeArea);
      if (!row) return { exists: false as const };
      let read: any = null; try { read = JSON.parse(row.content); } catch { /* corrupt snapshot */ }
      return { exists: true as const, date: row.readingDate, lifeArea: row.lifeArea ?? "day", read, notes: row.notes ?? "", createdAt: row.createdAt };
    }),

    // Reveal ("purchase") a date + LIFE AREA: return the existing snapshot, or generate the
    // area's varga-deep reading for that date once and freeze it. One LLM call only on first
    // reveal of each (date, area). Each area is its own purchase (eclipse×Career ≠ eclipse×Money).
    reveal: protectedProcedure.input(z.object({ date: z.string(), lifeArea: z.string() })).mutation(async ({ ctx, input }) => {
      if (!(await hasHoroscope(ctx.user))) return null;
      const { isLifeAreaKey } = await import("./vedic/life-areas.js");
      const { resolveArea } = await import("../shared/life-area-shelves.js");
      // Parent areas (legacy keys) still read whole; sub-areas resolve to parent + FOCUS.
      const resolved = isLifeAreaKey(input.lifeArea)
        ? { parent: input.lifeArea, focus: undefined as any }
        : (() => { const r = resolveArea(input.lifeArea); return r && isLifeAreaKey(r.parent) ? { parent: r.parent, focus: r.focus } : null; })();
      if (!resolved) return { available: false as const };
      const { getActiveProfile } = await import("./routers/profiles.js");
      const profile = await getActiveProfile(ctx.user.id);
      if (!profile) return { available: false as const };
      const { getHoroscope, insertHoroscope, getUserById } = await import("./db.js");

      // Already purchased → return the immutable snapshot, never regenerate.
      const existing = await getHoroscope(profile.id, input.date, input.lifeArea);
      if (existing) {
        let read: any = null; try { read = JSON.parse(existing.content); } catch { /* corrupt */ }
        return { available: true as const, date: existing.readingDate, lifeArea: input.lifeArea, read, notes: existing.notes ?? "", cached: true };
      }

      // The varga-deep reading for THIS life area on THIS date: the area's house + lord + karakas
      // read both natally and in its topical varga, pointed at how the date's sky activates it.
      const u = await getUserById(ctx.user.id);
      const { getTimezoneOffset } = await import("./panchang/tz-offset.js");
      const dayLoc = (u?.locationLat && u?.locationLon && u?.locationTimezone)
        ? { lat: parseFloat(u.locationLat), lon: parseFloat(u.locationLon), utcOffset: getTimezoneOffset(u.locationTimezone, new Date()) }
        : undefined;
      const { getLifeAreaRead } = await import("./narrative/service.js");
      const res = await getLifeAreaRead(profile.id, input.date, resolved.parent as any, dayLoc, resolved.focus);
      if (!res.available || !res.read) return { available: false as const };

      const { PROMPT_VERSION, MODEL } = await import("./narrative/prompts.js");
      await insertHoroscope({ userId: ctx.user.id, profileId: profile.id, readingDate: input.date, lifeArea: input.lifeArea, promptVersion: PROMPT_VERSION, model: MODEL, content: JSON.stringify(res.read) });
      return { available: true as const, date: input.date, lifeArea: input.lifeArea, read: res.read, notes: "", cached: false };
    }),

    // THE ECLIPSE SEASON reading — the whole double-eclipse arc (build → resets → aftermath) for the
    // CURRENT/upcoming season, read for this chart's houses. Lazy (a mutation, fires on tap) and cached
    // by season in narrative_cache, so re-tapping the same season is free (no re-charge). Returns
    // unavailable when there's no eclipse season in range or the key is off.
    eclipseSeason: protectedProcedure.mutation(async ({ ctx }) => {
      if (!(await hasHoroscope(ctx.user))) return { available: false as const };
      const { getActiveProfile } = await import("./routers/profiles.js");
      const profile = await getActiveProfile(ctx.user.id);
      if (!profile) return { available: false as const };
      const { getUserById } = await import("./db.js");
      const u = await getUserById(ctx.user.id);
      const { getTimezoneOffset } = await import("./panchang/tz-offset.js");
      const dayLoc = (u?.locationLat && u?.locationLon && u?.locationTimezone)
        ? { lat: parseFloat(u.locationLat), lon: parseFloat(u.locationLon), utcOffset: getTimezoneOffset(u.locationTimezone, new Date()) }
        : undefined;
      const { getEclipseSeasonCached } = await import("./narrative/service.js");
      const today = new Date().toISOString().slice(0, 10);
      return await getEclipseSeasonCached(profile.id, today, false, dayLoc);
    }),

    // Read-only: is there ALREADY a saved eclipse-season reading for the current season? Never
    // generates — lets the card show "already read" + the archive list it, with no charge.
    eclipseSeasonSaved: protectedProcedure.query(async ({ ctx }) => {
      if (!(await hasHoroscope(ctx.user))) return { available: false as const, read: null, season: null, generatedAt: null, cached: false };
      const { getActiveProfile } = await import("./routers/profiles.js");
      const profile = await getActiveProfile(ctx.user.id);
      if (!profile) return { available: false as const, read: null, season: null, generatedAt: null, cached: false };
      const { getUserById } = await import("./db.js");
      const u = await getUserById(ctx.user.id);
      const { getTimezoneOffset } = await import("./panchang/tz-offset.js");
      const dayLoc = (u?.locationLat && u?.locationLon && u?.locationTimezone)
        ? { lat: parseFloat(u.locationLat), lon: parseFloat(u.locationLon), utcOffset: getTimezoneOffset(u.locationTimezone, new Date()) }
        : undefined;
      const { peekEclipseSeasonCached } = await import("./narrative/service.js");
      const today = new Date().toISOString().slice(0, 10);
      return await peekEclipseSeasonCached(profile.id, today, dayLoc);
    }),

    // THE MERCURY RETROGRADE — the whole-cycle arc reading (pre-shadow → review → retroshade) for the
    // active/approaching Mercury rx, read for this chart's house(s). Generates + caches per cycle;
    // unavailable when Mercury is clear (no cycle in range).
    planetRx: protectedProcedure.input(z.object({ planet: z.enum(["venus", "mars", "jupiter", "saturn"]) })).mutation(async ({ ctx, input }) => {
      if (!(await hasHoroscope(ctx.user))) return { available: false as const };
      const { getActiveProfile } = await import("./routers/profiles.js");
      const profile = await getActiveProfile(ctx.user.id);
      if (!profile) return { available: false as const };
      const { getUserById } = await import("./db.js");
      const u = await getUserById(ctx.user.id);
      const { getTimezoneOffset } = await import("./panchang/tz-offset.js");
      const dayLoc = (u?.locationLat && u?.locationLon && u?.locationTimezone)
        ? { lat: parseFloat(u.locationLat), lon: parseFloat(u.locationLon), utcOffset: getTimezoneOffset(u.locationTimezone, new Date()) }
        : undefined;
      const { getPlanetRxCached } = await import("./narrative/service.js");
      const today = new Date().toISOString().slice(0, 10);
      return await getPlanetRxCached(profile.id, input.planet, today, false, dayLoc);
    }),

    // PEEK — read-only: the slow-review state for a planet WITHOUT generating (Door Law). The card
    // peeks all four on expand (cheap), then generates one only when its door is tapped (planetRx).
    planetRxPeek: protectedProcedure.input(z.object({ planet: z.enum(["venus", "mars", "jupiter", "saturn"]) })).mutation(async ({ ctx, input }) => {
      if (!(await hasHoroscope(ctx.user))) return { available: false as const };
      const { getActiveProfile } = await import("./routers/profiles.js");
      const profile = await getActiveProfile(ctx.user.id);
      if (!profile) return { available: false as const };
      const { getUserById } = await import("./db.js");
      const u = await getUserById(ctx.user.id);
      const { getTimezoneOffset } = await import("./panchang/tz-offset.js");
      const dayLoc = (u?.locationLat && u?.locationLon && u?.locationTimezone)
        ? { lat: parseFloat(u.locationLat), lon: parseFloat(u.locationLon), utcOffset: getTimezoneOffset(u.locationTimezone, new Date()) }
        : undefined;
      const { peekPlanetRxCached } = await import("./narrative/service.js");
      const today = new Date().toISOString().slice(0, 10);
      return await peekPlanetRxCached(profile.id, input.planet, today, dayLoc);
    }),

    mercuryRx: protectedProcedure.mutation(async ({ ctx }) => {
      if (!(await hasHoroscope(ctx.user))) return { available: false as const };
      const { getActiveProfile } = await import("./routers/profiles.js");
      const profile = await getActiveProfile(ctx.user.id);
      if (!profile) return { available: false as const };
      const { getUserById } = await import("./db.js");
      const u = await getUserById(ctx.user.id);
      const { getTimezoneOffset } = await import("./panchang/tz-offset.js");
      const dayLoc = (u?.locationLat && u?.locationLon && u?.locationTimezone)
        ? { lat: parseFloat(u.locationLat), lon: parseFloat(u.locationLon), utcOffset: getTimezoneOffset(u.locationTimezone, new Date()) }
        : undefined;
      const { getMercuryRxCached } = await import("./narrative/service.js");
      const today = new Date().toISOString().slice(0, 10);
      return await getMercuryRxCached(profile.id, today, false, dayLoc);
    }),

    // Read-only: is there ALREADY a saved Mercury-rx reading for the current cycle? Never generates.
    mercuryRxSaved: protectedProcedure.query(async ({ ctx }) => {
      if (!(await hasHoroscope(ctx.user))) return { available: false as const, read: null, cycle: null, generatedAt: null, cached: false };
      const { getActiveProfile } = await import("./routers/profiles.js");
      const profile = await getActiveProfile(ctx.user.id);
      if (!profile) return { available: false as const, read: null, cycle: null, generatedAt: null, cached: false };
      const { getUserById } = await import("./db.js");
      const u = await getUserById(ctx.user.id);
      const { getTimezoneOffset } = await import("./panchang/tz-offset.js");
      const dayLoc = (u?.locationLat && u?.locationLon && u?.locationTimezone)
        ? { lat: parseFloat(u.locationLat), lon: parseFloat(u.locationLon), utcOffset: getTimezoneOffset(u.locationTimezone, new Date()) }
        : undefined;
      const { peekMercuryRxCached } = await import("./narrative/service.js");
      const today = new Date().toISOString().slice(0, 10);
      return await peekMercuryRxCached(profile.id, today, dayLoc);
    }),

    // THE MONTH — the full layered read expanded to the whole month (scenes/characters/conversations/
    // arcs, spined on the Time Lord). Generates + caches per month. A subscriber core benefit (for now
    // gated to the horoscope entitlement until subscription billing lands).
    month: protectedProcedure.mutation(async ({ ctx }) => {
      if (!(await hasHoroscope(ctx.user))) return { available: false as const };
      const { getActiveProfile } = await import("./routers/profiles.js");
      const profile = await getActiveProfile(ctx.user.id);
      if (!profile) return { available: false as const };
      const { getUserById } = await import("./db.js");
      const u = await getUserById(ctx.user.id);
      const { getTimezoneOffset } = await import("./panchang/tz-offset.js");
      const dayLoc = (u?.locationLat && u?.locationLon && u?.locationTimezone)
        ? { lat: parseFloat(u.locationLat), lon: parseFloat(u.locationLon), utcOffset: getTimezoneOffset(u.locationTimezone, new Date()) }
        : undefined;
      const { getMonthCached } = await import("./narrative/service.js");
      const today = new Date().toISOString().slice(0, 10);
      return await getMonthCached(profile.id, today, false, dayLoc);
    }),

    // Read-only: is there ALREADY a saved reading for the current month? Never generates.
    monthSaved: protectedProcedure.query(async ({ ctx }) => {
      if (!(await hasHoroscope(ctx.user))) return { available: false as const, read: null, month: null, generatedAt: null, cached: false };
      const { getActiveProfile } = await import("./routers/profiles.js");
      const profile = await getActiveProfile(ctx.user.id);
      if (!profile) return { available: false as const, read: null, month: null, generatedAt: null, cached: false };
      const { peekMonthCached } = await import("./narrative/service.js");
      const today = new Date().toISOString().slice(0, 10);
      return await peekMonthCached(profile.id, today);
    }),

    // Save the user's notes under a purchased horoscope (per date + area).
    saveNotes: protectedProcedure.input(z.object({ date: z.string(), lifeArea: z.string().default("day"), notes: z.string().max(20000) })).mutation(async ({ ctx, input }) => {
      if (!(await hasHoroscope(ctx.user))) return null;
      const { getActiveProfile } = await import("./routers/profiles.js");
      const profile = await getActiveProfile(ctx.user.id);
      if (!profile) return { saved: false as const };
      const { updateHoroscopeNotes } = await import("./db.js");
      const saved = await updateHoroscopeNotes(profile.id, input.date, input.lifeArea, input.notes);
      return { saved };
    }),
  }),

  // ── CELESTIAL (tonight's moon phase / eclipse → shell-ocean artwork) — GATED ──
  celestial: router({
    today: protectedProcedure.query(async ({ ctx }) => {
      // Public: everyone sees tonight's real moon phase / eclipse artwork. (Master Mode
      // stays gated; this is just the shared sky.)
      const dateStr = new Date().toISOString().slice(0, 10);
      // Time-of-day for the Stage artwork — the viewer's current hour vs their real sunrise/sunset,
      // so each celestial image resolves to its dawn/day/dusk/night variant (client picks + falls back).
      const { timeOfDayAt } = await import("./sky/time-of-day.js");
      const _loc = ctx.user as any;
      const timeOfDay = timeOfDayAt(
        Date.now(),
        _loc?.locationLat ? parseFloat(_loc.locationLat) : 42.3601,
        _loc?.locationLon ? parseFloat(_loc.locationLon) : -71.0589,
      );
      // THIS MOMENT's sky — not noon-of-date. The Stage is live; anchor it to now.
      const { getSiderealLongitudesWithSpeed } = await import("./vedic/natal-chart-engine.js");
      const posNow = await getSiderealLongitudesWithSpeed(new Date(), ["Sun", "Moon"]);
      const ZODIAC = ["Aries","Taurus","Gemini","Cancer","Leo","Virgo","Libra","Scorpio","Sagittarius","Capricorn","Aquarius","Pisces"];
      const moonLonNow = ((posNow.Moon?.longitude ?? 0) % 360 + 360) % 360;
      const sunLonNow = ((posNow.Sun?.longitude ?? 0) % 360 + 360) % 360;
      const elong = ((moonLonNow - sunLonNow) % 360 + 360) % 360;
      // The four cardinal phases are INSTANTS — they own only a narrow window (~±1 day)
      // around their exact moment. The long spans between belong to crescent/gibbous.
      // (Rounding to the nearest instant kept "Last Quarter" on the Stage for ±1.8 days.)
      const nearPhase = (center: number, halfWidth: number) =>
        Math.abs(((elong - center + 540) % 360) - 180) <= halfWidth;
      const phase =
        nearPhase(0, 12)   ? { name: "New Moon", image: "new-moon.jpg" } :
        nearPhase(90, 9)   ? { name: "First Quarter", image: "first-quarter.jpg" } :
        nearPhase(180, 12) ? { name: "Full Moon", image: "full-moon.jpg" } :
        nearPhase(270, 9)  ? { name: "Last Quarter", image: "last-quarter.jpg" } :
        elong < 90  ? { name: "Waxing Crescent", image: "waxing-crescent.jpg" } :
        elong < 180 ? { name: "Waxing Gibbous", image: "waxing-gibbous.jpg" } :
        elong < 270 ? { name: "Waning Gibbous", image: "waning-gibbous.jpg" } :
                      { name: "Waning Crescent", image: "waning-crescent.jpg" };

      // Moon's current sign + the house it's transiting for THIS chart (personalized).
      const moonSign: string = ZODIAC[Math.floor(moonLonNow / 30)];
      let moonHouse: number | null = null;
      if (ctx.subject?.lagnaSign) {
        const li = ZODIAC.indexOf(ctx.subject.lagnaSign), mi = ZODIAC.indexOf(moonSign);
        if (li >= 0 && mi >= 0) moonHouse = ((mi - li + 12) % 12) + 1;
      }
      // Where in the cycle — days to the next Full and New (elongation moves ~12.19°/day).
      const RATE = 12.19048;
      const daysToFull = Math.max(0, Math.round((elong < 180 ? 180 - elong : 540 - elong) / RATE));
      const daysToNew = Math.max(0, Math.round((360 - elong) / RATE));

      const base = { moonSign, moonHouse, daysToFull, daysToNew };

      // Station-cycle heroes — a planet (with artwork) in a notable retrograde-cycle phase,
      // co-equal to the moon in The Stage. Approximate phase from days-to/from the nearest
      // station. Scalable: add a planet's art to STATION_ART and it surfaces automatically.
      const STATION_ART: Record<string, Record<string, string>> = {
        Mercury: {
          "preshadow-1": "mercury-preshadow-1.jpg", "preshadow-2": "mercury-preshadow-2.jpg",
          "preshadow-3": "mercury-preshadow-3.jpg",
          "retrograde-1": "mercury-rx-1.jpg", "retrograde-2": "mercury-rx-2.jpg",
          "direct-1": "mercury-direct-1.jpg",
        },
      };
      const STATION_COPY: Record<string, { title: string; note: string }> = {
        "preshadow-1": { title: "{P} enters its shadow", note: "The retrograde zone opens — what you begin now you'll likely revisit, so leave room to revise." },
        "preshadow-2": { title: "{P}'s shadow deepens", note: "The turn is coming. Tie off what you don't want reopened; keep the rest flexible." },
        "preshadow-3": { title: "{P} in deep shadow", note: "The station is near — back up, double-check, confirm. Loose ends are surfacing on purpose." },
        "retrograde-1": { title: "{P} turns retrograde", note: "The light turns inward. Not a curse — a review begins: revisit and refine, don't launch." },
        "retrograde-2": { title: "{P} retrograde", note: "Deep in the review — the past resurfaces to be reconnected and finished. Hold big launches while the ground is re-walked." },
        "direct-1": { title: "{P} stations direct", note: "The turn. Clarity returns, but slowly — let momentum rebuild before you floor it." },
      };
      const phaseOf = (p: any): string | null => {
        if (p.isRetrograde) {
          // rx-1 bookends the review: the first week after it turns retrograde, and the final
          // week before it turns direct. rx-2 owns the MIDDLE of the retrograde.
          const st = p.station;
          if (st?.type === "turns retrograde") return st.daysAway >= -7 ? "retrograde-1" : "retrograde-2";
          if (st?.type === "turns direct") return st.daysAway <= 7 ? "retrograde-1" : "retrograde-2";
          return "retrograde-2";
        }
        const st = p.station;
        if (!st) return null;
        if (st.type === "turns retrograde" && st.daysAway > 0)
          return st.daysAway <= 5 ? "preshadow-3" : st.daysAway <= 10 ? "preshadow-2" : st.daysAway <= 16 ? "preshadow-1" : null;
        if (st.type === "turns direct" && st.daysAway <= 0)
          return "direct-1"; // single post-turn card (direct-2 "stations direct" art retired)
        return null;
      };

      // An eclipse today, or a planet mid retrograde-cycle, is "what else is happening" with the moon.
      let mercuryRetro = false;
      let stations: any[] = [];
      try {
        if (ctx.subject) {
          const { getCurrentSky } = await import("./sky/current-sky.js");
          const sky = await getCurrentSky(ctx.subject);
          stations = (sky.planets ?? []).map((p: any) => {
            if (!STATION_ART[p.planet]) return null;
            const ph = phaseOf(p);
            const image = ph ? STATION_ART[p.planet][ph] : null;
            if (!ph || !image) return null;
            const c = STATION_COPY[ph];
            // The course line — David: the rx card "has become wallpaper." The note is the
            // doctrine; this line is the CLOCK, and it changes every day. His law: the ±3
            // days around each station are the worst of the cycle — say so when we're in one.
            const st = p.station;
            let courseLine: string | null = null;
            if (st) {
              const d = st.daysAway;
              // rx-1 entering (just turned retrograde) counts days INTO the review; rx-1 closing
              // (turn approaching) counts DOWN to the turn.
              if (ph === "retrograde-1" && st.type === "turns retrograde") courseLine = d >= -3 ? `Day ${Math.max(1, -d + 1)} of the review — still inside the station window, the roughest stretch of the cycle.` : `Day ${-d + 1} of the review.`;
              else if (ph === "retrograde-1" && st.type === "turns direct") courseLine = d <= 3 ? (d <= 0 ? `The turn is here.` : `${d} day${d === 1 ? "" : "s"} to the turn — station window, the roughest stretch of the cycle.`) : `${d} days to the turn.`;
              else if (ph === "retrograde-2") courseLine = st.type === "turns direct" ? `${d} days to the turn.` : `Day ${-d + 1} of the review.`;
              else if (ph === "preshadow-3" && st.type === "turns retrograde") courseLine = d <= 3 ? `Station in ${d} day${d === 1 ? "" : "s"} — the rough window is open.` : `Station in ${d} days.`;
              else if (ph === "preshadow-2" && st.type === "turns retrograde") courseLine = `Station in ${d} days.`;
              else if (ph === "direct-1" && st.type === "turns direct") courseLine = -d <= 3 ? `Turned ${-d === 0 ? "today" : `${-d} day${-d === 1 ? "" : "s"} ago`} — still in the station window; let it settle.` : `Turned ${-d} days ago — momentum rebuilding.`;
            }
            // The rx-1 phase bookends the review (first week AND last week). The copy was
            // written for the opening; in the CLOSING week the title must speak to the
            // coming turn (David's 7/16 card said "Mercury turns retrograde" mid-review).
            const closing = ph === "retrograde-1" && st?.type === "turns direct";
            const title = (closing ? "{P} nears the turn" : c.title).replace("{P}", p.planet);
            const note = closing
              ? "The review's last stretch — finish the revisions, tie off what you reopened. Clarity is days away; don't start a new launch before the turn."
              : c.note;
            return { planet: p.planet, phase: ph, image, title, note, courseLine, sign: p.sign, house: p.house };
          }).filter(Boolean);
          const ecl = (sky.eclipses ?? []).find((e) => e.daysAway === 0);
          if (ecl?.type === "lunar") return { name: "Lunar Eclipse", image: "lunar-eclipse.jpg", isEvent: true, isEclipse: true, mercuryRetro: false, timeOfDay, stations, ...base };
          if (ecl?.type === "solar") return { name: "Solar Eclipse", image: "solar-eclipse.jpg", isEvent: true, isEclipse: true, mercuryRetro: false, timeOfDay, stations, ...base };
          mercuryRetro = (sky.retrogrades ?? []).includes("Mercury");
        }
      } catch { /* degrade gracefully */ }

      const isEvent = phase.name === "Full Moon" || phase.name === "New Moon";
      return { name: phase.name, image: phase.image, isEvent, isEclipse: false, mercuryRetro, timeOfDay, stations, ...base };
    }),
  }),

  // ── CURRENT SKY (all planets now: positions, retro, stations, eclipses) ──
  sky: router({
    /** Calendar labels for a month: Mercury's course (retro span, stations, ±3-day
     *  station windows) + eclipse days. Collective sky — same for every chart. */
    monthMarks: protectedProcedure
      .input(z.object({ yearMonth: z.string().regex(/^\d{4}-\d{2}$/) }))
      .query(async ({ input }) => {
        const { monthSkyMarks } = await import("./sky/current-sky.js");
        return monthSkyMarks(input.yearMonth);
      }),
    /** Station days + ±3-day windows across a whole span (the /year tiles' planet
     *  glyphs) — one sweep, collective sky, cached 12h. */
    yearMarks: protectedProcedure
      .input(z.object({ from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }))
      .query(async ({ input }) => {
        // Span guard (audit 2026-07-16): the sweep costs one ephemeris call PER DAY, and the
        // cache is keyed by the exact range — an unbounded span is a CPU hole. The legit
        // client asks for one solar year (~366 days); allow a little slack, refuse the rest.
        const spanDays = (Date.parse(input.to) - Date.parse(input.from)) / 86_400_000;
        if (!(spanDays >= 0 && spanDays <= 400)) throw new TRPCError({ code: "BAD_REQUEST", message: "Range must be 0–400 days." });
        const { yearStationMarks } = await import("./sky/current-sky.js");
        return yearStationMarks(input.from, input.to);
      }),
    /** Live sky for the active profile: every planet's position/motion, the houses
     *  it transits from this Lagna, hits to natal points, stations, eclipses. */
    current: protectedProcedure.query(async ({ ctx }) => {
      if (!ctx.subject) return null;
      return getCurrentSky(ctx.subject);
    }),

    /** The "Golden Moment" stage — derived signals for display (read-only). The
     *  slow-planet weather read against this chart. Moon/day-mode stay primary. */
    stage: protectedProcedure.query(async ({ ctx }) => {
      if (!ctx.subject) return null;
      const sky = await getCurrentSky(ctx.subject);
      // Lit houses = the profection-activated house plus the angular 1st/10th.
      let litHouses = [1, 10];
      if (ctx.subject.birthDate && ctx.subject.lagnaSign) {
        try {
          const today = new Date().toISOString().split("T")[0];
          const prof = calculateProfectionYear(ctx.subject.birthDate, today, ctx.subject.lagnaSign);
          litHouses = Array.from(new Set([1, 10, prof.activatedHouse]));
        } catch { /* fall back to [1, 10] */ }
      }
      const signals = computeGoldenMoment(sky, { litHouses });
      // The verdict fuses these universal signals with the personal Check-In.
      const profileId = ctx.subject.profileId ?? null;
      const ci = await getTodayCheckIn(ctx.user.id, profileId);
      const checkInAvg = ci
        ? (ci.physicalEnergy + ci.mentalClarity + ci.emotionalStability + ci.creativeFlow + ci.motivation) / 5
        : null;
      const verdict = computeVerdict(signals, checkInAvg);
      // Personal layer: which house each retrograde is transiting for THIS chart (free
      // lookup — SkyPlanet already carries the whole-sign house from the lagna).
      const retrogradesDetail = sky.retrogrades.map((name) => {
        const p = sky.planets.find((sp) => sp.planet === name);
        return { planet: name, sign: p?.sign ?? null, house: p?.house ?? null };
      });
      return { computedAt: sky.computedAt, signals, retrogrades: sky.retrogrades, retrogradesDetail, eclipses: sky.eclipses, verdict };
    }),

    /**
     * Golden-moment days in a month. `potential` = universal signal favorable (the
     * weather); `confirmed` = today/past potential days where the check-in (acting as
     * Panchapakshi, the individual signal) also averages favorable. The calendar shows
     * a light moon for potential and a solid moon for confirmed.
     */
    goldenDays: protectedProcedure
      .input(z.object({ yearMonth: z.string() }))
      .query(async ({ ctx, input }): Promise<{ potential: string[]; confirmed: string[] }> => {
        const today = new Date().toISOString().split("T")[0];
        // Potential = collective panchang day-quality (no chart needed).
        const potential = await computeGoldenDays(input.yearMonth);
        // Confirm today/past potential days where the check-in (Panchapakshi) aligns.
        const checkInAvgByDate = await getCheckInAveragesForMonth(ctx.user.id, ctx.subject?.profileId ?? null, input.yearMonth);
        const confirmed = potential.filter(
          (d) => d <= today && checkInAvgByDate[d] != null && checkInAvgByDate[d] >= 3.7,
        );
        return { potential, confirmed };
      }),
  }),

  // ── NARRATIVE (LLM Glance + Deep Read) ────────────────────
  narrative: narrativeRouter,

  // ── DASHA TIMELINE ────────────────────────────────────────
  dasha: dashaRouter,
  arc: arcRouter,


  // ── CHECK-IN ──────────────────────────────────────────────
  checkIn: router({
    /** Return today's most recent check-in (or null if none yet). */
    today: protectedProcedure.query(async ({ ctx }) => {
      const subject = ctx.subject;
      const profileId = subject?.profileId ?? null;
      const row = await getTodayCheckIn(ctx.user.id, profileId);
      return row ?? null;
    }),

    /** Record a new check-in snapshot. All five dimensions required (1-5). */
    create: protectedProcedure
      .input(
        z.object({
          physicalEnergy: z.number().int().min(1).max(5),
          mentalClarity: z.number().int().min(1).max(5),
          emotionalStability: z.number().int().min(1).max(5),
          creativeFlow: z.number().int().min(1).max(5),
          motivation: z.number().int().min(1).max(5),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const subject = ctx.subject;
        const profileId = subject?.profileId ?? null;
        const result = await createCheckIn({ userId: ctx.user.id, profileId, ...input });
        return result;
      }),
  }),
  // ── DIAGNOSTICS ────────────────────────────────────────────
  diagnostics: router({
    /** Full modifier breakdown for a single day */
    day: publicProcedure
      .input(z.object({ date: z.string() }))
      .query(async (opts) => {
        const user = opts.ctx.user ? await getUserById(opts.ctx.user.id) : null;
        let locationOverride: { lat: number; lon: number; utcOffset: number } | undefined;
        if (user?.locationLat && user?.locationLon && user?.locationTimezone) {
          const now = new Date();
          locationOverride = {
            lat: parseFloat(user.locationLat),
            lon: parseFloat(user.locationLon),
            utcOffset: getTimezoneOffset(user.locationTimezone, now),
          };
        }
        let lagnaOverride = user?.lagnaSign ?? undefined;
        if (opts.ctx.user) {
          const subject = opts.ctx.subject;
          if (subject?.lagnaSign) lagnaOverride = subject.lagnaSign;
        }
        const pd2 = await subjectPersonalDay(opts.ctx.subject, opts.input.date);
        const field = await getDayField(opts.input.date, false, locationOverride, lagnaOverride, pd2.rating, pd2.mode);
        if (!field) return null;

        // Calculate confidence
        const mr = field.modeReason;
        const rawScore = mr.baseScore + mr.nakshatraModifier + mr.tithiModifier + mr.fieldModifier;
        const distance = Math.abs(rawScore - mr.finalScore);
        const modifiers = [mr.nakshatraModifier, mr.tithiModifier, mr.fieldModifier];
        const finalDirection = mr.finalScore - mr.baseScore;
        const agreement = modifiers.filter(m => {
          if (finalDirection > 0) return m > 0;
          if (finalDirection < 0) return m < 0;
          return m === 0;
        }).length;
        const confidence = Math.max(
          CONFIDENCE_CONFIG.min,
          Math.min(CONFIDENCE_CONFIG.max,
            CONFIDENCE_CONFIG.baseConfidence + (agreement * CONFIDENCE_CONFIG.agreementBonus) - (distance * CONFIDENCE_CONFIG.distancePenalty)
          )
        );

        return {
          date: field.date,
          moonSign: field.moonSign,
          house: field.houseActivated,
          baseMode: mr.baseMode,
          baseScore: mr.baseScore,
          nakshatra: {
            name: field.nakshatra,
            modifier: mr.nakshatraModifier,
            reason: mr.nakshatraReason,
          },
          tithi: {
            name: field.tithi,
            paksha: field.tithiPaksha,
            modifier: mr.tithiModifier,
            reason: mr.tithiReason,
          },
          fieldCondition: {
            condition: mr.fieldCondition,
            modifier: mr.fieldModifier,
            reason: mr.fieldReason,
          },
          totalScore: mr.finalScore,
          rawScore,
          finalMode: mr.finalMode,
          confidence: Math.round(confidence),
        };
      }),

    /** Full modifier breakdown for a date range */
    range: protectedProcedure
      .input(z.object({ startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }))
      .query(async (opts) => {
        // audit MEDIUM-5: was public + unbounded — a 2000→2100 range meant ~36,500 synchronous
        // ephemeris computations in one request. Now auth-required and span-capped (below).
        const user = opts.ctx.user ? await getUserById(opts.ctx.user.id) : null;
        let locationOverride: { lat: number; lon: number; utcOffset: number } | undefined;
        if (user?.locationLat && user?.locationLon && user?.locationTimezone) {
          const now = new Date();
          locationOverride = {
            lat: parseFloat(user.locationLat),
            lon: parseFloat(user.locationLon),
            utcOffset: getTimezoneOffset(user.locationTimezone, now),
          };
        }
                let lagnaOverride = user?.lagnaSign ?? undefined;
        if (opts.ctx.user) {
          const subject = opts.ctx.subject;
          if (subject?.lagnaSign) lagnaOverride = subject.lagnaSign;
        }
        const start = new Date(opts.input.startDate);
        const end = new Date(opts.input.endDate);
        if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start || (end.getTime() - start.getTime()) / 86400000 > 92) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Range must be valid and at most 92 days." });
        }
        const results = [];
        const current = new Date(start);
        while (current <= end) {
          const dateStr = current.toISOString().split('T')[0];
          const field = await getDayField(dateStr, false, locationOverride, lagnaOverride);
          if (field) {
            const mr = field.modeReason;
            const rawScore = mr.baseScore + mr.nakshatraModifier + mr.tithiModifier + mr.fieldModifier;
            const distance = Math.abs(rawScore - mr.finalScore);
            const modifiers = [mr.nakshatraModifier, mr.tithiModifier, mr.fieldModifier];
            const finalDirection = mr.finalScore - mr.baseScore;
            const agreement = modifiers.filter(m => {
              if (finalDirection > 0) return m > 0;
              if (finalDirection < 0) return m < 0;
              return m === 0;
            }).length;
            const confidence = Math.max(
              CONFIDENCE_CONFIG.min,
              Math.min(CONFIDENCE_CONFIG.max,
                CONFIDENCE_CONFIG.baseConfidence + (agreement * CONFIDENCE_CONFIG.agreementBonus) - (distance * CONFIDENCE_CONFIG.distancePenalty)
              )
            );
            results.push({
              date: field.date,
              moonSign: field.moonSign,
              house: field.houseActivated,
              baseMode: mr.baseMode,
              baseScore: mr.baseScore,
              nakshatraName: field.nakshatra,
              nakshatraModifier: mr.nakshatraModifier,
              tithiName: field.tithi,
              tithiPaksha: field.tithiPaksha,
              tithiModifier: mr.tithiModifier,
              fieldCondition: mr.fieldCondition,
              fieldModifier: mr.fieldModifier,
              totalScore: mr.finalScore,
              rawScore,
              finalMode: mr.finalMode,
              confidence: Math.round(confidence),
            });
          }
          current.setDate(current.getDate() + 1);
        }
        return results;
      }),

    /** Return all modifier configuration values */
    config: publicProcedure.query(() => {
      return {
        houseToBaseMode: HOUSE_TO_BASE_MODE,
        nakshatraModifiers: NAKSHATRA_MODIFIERS,
        tithiPhaseModifier: TITHI_PHASE_MODIFIER,
        strongRestraintTithis: STRONG_RESTRAINT_TITHIS,
        strongRestraintAdditionalModifier: STRONG_RESTRAINT_ADDITIONAL_MODIFIER,
        fieldConditionModifiers: FIELD_CONDITION_MODIFIERS,
        selectiveBiasStrength: SELECTIVE_BIAS_STRENGTH,
        flexResolution: FLEX_RESOLUTION,
        confidenceConfig: CONFIDENCE_CONFIG,
      };
    }),
  }),
});

export type AppRouter = typeof appRouter;

// Timezone helpers moved to ./panchang/tz-offset.js (shared with the narrative pipeline so the
// hero and the day card derive the day-mode from the same location basis).
