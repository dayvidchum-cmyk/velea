import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc.js";
import { getDeepReadCached, getChapterCached, getDayReadCached, getCastCached, markProfileUncapped } from "./service.js";
import { buildNarrativeInput } from "./input-builder.js";
import { readingProse } from "./daily-surface.js";
import { setNarrativeLock, isNarrativeLocked, getUserById, listNarrativeReadings } from "../db.js";
import { assertOwnsProfile } from "../routers/profiles.js";
import { getTimezoneOffset } from "../panchang/tz-offset.js";
import { rateLimit } from "../_core/rateLimit.js";

// The day-mode's location basis now comes from the ONE resolver (panchang/resolve-day-sky.ts),
// the same source the hero's panchang reads — which is what stops the hero and the day card
// naming different modes on one day. The old local dayLocFromUser derivation is gone.
import { resolveDaySkyForProfileId } from "../panchang/resolve-day-sky.js";

const todayUTC = () => new Date().toISOString().split("T")[0];

const inputSchema = z.object({
  profileId: z.number(),
  date: z.string().optional(),
  refresh: z.boolean().optional(),
  // Present only on the "update to the moment" tap → hora-aware, ephemeral read.
  nowMs: z.number().optional(),
  // Admin-only "stage + guests" deepened read (the current-sky upsell preview).
  deepened: z.boolean().optional(),
});

type GenCtx = { user: { id?: number; role?: string | null; email?: string | null }; req: Parameters<typeof rateLimit>[0] };

// The free daily reads (glance/dayRead/cast/chapter) are meant for the viewer's TODAY. Their
// `date` param is otherwise unbounded — a scripted caller could walk history, each distinct date
// a fresh billed LLM generation, draining the capped Anthropic wallet (a denial-of-quality: once
// dry, EVERY user's read drops to static fallback). This is the guard for that whole class of
// generation-triggering procedures.
//
// The window is the viewer's LOCAL yesterday+today when their timezone is stored (exact), else a
// wide UTC ±day fallback. Beyond it = pick-a-date territory — entitled (specialReadings/admin)
// only, rate-limited; everyone else gets a locked shape. Cache still means each honored date
// generates at most once.
function withinDailyWindow(date: string, tz?: string | null): boolean {
  const d = Date.parse(date + "T00:00:00Z");
  if (Number.isNaN(d)) return false;
  const day = 24 * 60 * 60 * 1000;
  // AUDIT M1 (2026-07-18): the old blanket [UTC today-2, today+1] window "covered every timezone's
  // yesterday+today" — but it ALSO granted tomorrow (and, in a western evening, day-after-tomorrow
  // local) to free users: future sight, which the time-gate doctrine sells. With the viewer's stored
  // timezone we clamp EXACTLY to their local yesterday+today. Without one, the wide window remains
  // (never lock a legit today out on a guess).
  if (tz) {
    try {
      const offset = getTimezoneOffset(tz, new Date()); // hours
      const localNow = Date.now() + offset * 3600000;
      const localToday = Math.floor(localNow / day) * day;
      return d >= localToday - day - 1000 && d <= localToday + 1000;
    } catch { /* bad tz string — fall through to the wide window */ }
  }
  const t = Date.parse(todayUTC() + "T00:00:00Z");
  return d >= t - 2 * day - 1000 && d <= t + day + 1000;
}

// Returns the date to read, or null = "blocked" (deeper history/future for a non-entitled user).
// null → the caller returns a locked/unavailable shape: we NEVER silently serve today's read under
// another date's header (a wrong-content, data-accuracy bug), and we never generate a fresh billed
// read for a walked date (the wallet drain). Deeper dates are the pick-a-date premium.
async function guardedDate(ctx: GenCtx, profileId: number, requested: string | undefined): Promise<string | null> {
  // audit MEDIUM-6: an admin opening any daily surface marks their profile uncapped for the rest
  // of the process — so QA'ing prose across many surfaces/dates never trips the paying-user cap.
  if (ctx.user.role === "admin" && Number.isFinite(profileId)) markProfileUncapped(profileId);
  const today = todayUTC();
  const date = requested ?? today;
  const viewer = ctx.user.id != null ? await getUserById(ctx.user.id) : null;
  if (withinDailyWindow(date, viewer?.locationTimezone)) return date;
  const { hasFeature } = await import("../feature-flags.js");
  const canPickDate = ctx.user.role === "admin" || (await hasFeature(ctx.user as any, "specialReadings"));
  if (!canPickDate) return null; // deeper history = premium: locked, not silently-today
  // audit LOW-13: over the pick-a-date limit, degrade to the graceful lock (null) instead of
  // letting rateLimit's throw propagate as a hard error toast.
  try { rateLimit(ctx.req, "narrative-pickdate", { max: 40, windowMs: 15 * 60 * 1000 }); } catch { return null; }
  return date;
}

// Year-sight (the deep six-section year read) is premium per the time-gate doctrine. Its two UI
// surfaces gate on yearPage (Profection) and specialReadings (Horoscope reveal); the endpoint
// itself enforced NEITHER, so a non-admin calling narrative.deepRead directly got a full billed
// year read for free. This is the missing server-side gate — either entitlement (or admin) opens it.
async function canYearSight(user: { role?: string | null; email?: string | null }): Promise<boolean> {
  if (user.role === "admin") return true;
  const { hasFeature } = await import("../feature-flags.js");
  return (await hasFeature(user as any, "yearPage")) || (await hasFeature(user as any, "specialReadings"));
}

export const narrativeRouter = router({
  // One-sentence daily signal for the Today page. Falls back to null on any error.
  // THE GLANCE IS RETIRED (v805). It was the original Today surface; the hero has read `dayRead`
  // since the switch, and a repo-wide grep found ZERO client callers of narrative.glance. What it
  // still was, until this commit, is a LIVE BILLED ENDPOINT any authenticated client could call to
  // generate prose no human would ever see — and the one generation path in the app that could
  // still write `glance` rows. The procedure, getGlanceCached and generateGlance are all gone.
  // What deliberately STAYS: `glance` in DAILY_SURFACES and PINNED_SURFACES, so the legacy rows
  // already in the table keep appearing in Kept Readings and keep honouring their pins. Retiring a
  // surface must not delete what people already saved.

  // Structured six-section + synthesis read for the Profection page.
  deepRead: protectedProcedure.input(inputSchema).query(async ({ ctx, input }) => {
    await assertOwnsProfile(ctx.user.id, input.profileId);
    // Year-sight is premium (time-gate doctrine). Gate the ENDPOINT, not just the UI, so it
    // can't be called around the paywall for a free billed year read.
    if (!(await canYearSight(ctx.user))) return { available: false as const, locked: true as const, read: null, generatedAt: null, cached: false };
    const date = await guardedDate(ctx, input.profileId, input.date);
    if (!date) return { available: false as const, locked: true as const, read: null, generatedAt: null, cached: false };
    // The deepened "stage + guests" read is an admin-only preview of the paid tier — a
    // non-admin can never obtain it, so the fast-tier detail stays behind the upsell.
    const deepened = (input.deepened ?? false) && ctx.user.role === "admin";
    try {
      const dayLoc = await resolveDaySkyForProfileId(input.profileId, date);
      const canForce = ctx.user.role === "admin" || (await (await import("../feature-flags.js")).hasFeature(ctx.user, "momentRefresh")); // audit M2: meter forced regen
      return await getDeepReadCached(input.profileId, date, canForce && (input.refresh ?? false), deepened, dayLoc);
    } catch (e) {
      console.error("[narrative.deepRead]", e);
      return { available: false, read: null, generatedAt: null, cached: false } as const;
    }
  }),

  // THE DAY READ — the metaphor day-read for a specific date (the Today page uses today;
  // the Horoscope reveal uses the picked date). Date-specific; falls back to unavailable
  // (→ static copy) when the key is off. Explains the outer (today's sky), the inner (the
  // self it lands on), and how to move — as interactions.
  dayRead: protectedProcedure.input(inputSchema).query(async ({ ctx, input }) => {
    await assertOwnsProfile(ctx.user.id, input.profileId);
    const date = await guardedDate(ctx, input.profileId, input.date);
    if (!date) return { available: false as const, locked: true as const, read: null, generatedAt: null, cached: false };
    try {
      const dayLoc = await resolveDaySkyForProfileId(input.profileId, date);
      const canForce = ctx.user.role === "admin" || (await (await import("../feature-flags.js")).hasFeature(ctx.user, "momentRefresh")); // audit M2
      return await getDayReadCached(input.profileId, date, canForce && (input.refresh ?? false), dayLoc);
    } catch (e) {
      console.error("[narrative.dayRead]", e);
      return { available: false, read: null, generatedAt: null, cached: false } as const;
    }
  }),

  // THE READ — THE CAST. The layer behind the day-story: today's loud players (each with its
  // condition + lesson) and the background chapter (Moon/Sun/Time Lord/dashas). LAZY — fires
  // only when THE READ is tapped. Falls back to unavailable (→ static copy) when the key is off.
  cast: protectedProcedure.input(inputSchema).query(async ({ ctx, input }) => {
    await assertOwnsProfile(ctx.user.id, input.profileId);
    const date = await guardedDate(ctx, input.profileId, input.date);
    if (!date) return { available: false as const, locked: true as const, cast: null, generatedAt: null, cached: false };
    try {
      const dayLoc = await resolveDaySkyForProfileId(input.profileId, date);
      const canForce = ctx.user.role === "admin" || (await (await import("../feature-flags.js")).hasFeature(ctx.user, "momentRefresh")); // audit M2
      return await getCastCached(input.profileId, date, canForce && (input.refresh ?? false), dayLoc);
    } catch (e) {
      console.error("[narrative.cast]", e);
      return { available: false, cast: null, generatedAt: null, cached: false } as const;
    }
  }),

  // Chapter good-for/avoid bullets — a small, cheap, AUTO-FIRING read (the year lord's
  // transit-house room), split out of the big deep read so it shows on the Chart page
  // without tapping "The Read". Falls back to unavailable on any error.
  // THE HOUSE READER — tap a house on the chart, the stored research speaks. Natal-
  // stable + cached; fires only on explicit open (cost law).
  houseRead: protectedProcedure.input(z.object({ house: z.number().int().min(1).max(12), refresh: z.boolean().optional() })).query(async ({ ctx, input }) => {
    try {
      const { hasFeature } = await import("../feature-flags.js");
      if (!(await hasFeature(ctx.user, "houseReader"))) return { available: false, locked: true, read: null, generatedAt: null, cached: false } as const;
      const { getActiveProfile } = await import("../routers/profiles.js");
      const profile = await getActiveProfile(ctx.user.id);
      if (!profile) return { available: false, read: null, generatedAt: null, cached: false } as const;
      // THE ROOM GATE (David 2026-07-16): three rooms read free — the 1st (the rising
      // self), the Sun's house, and the Moon's house. The other nine wear the lock.
      // Admins bypass; server enforces what the client shows.
      if (ctx.user.role !== "admin") {
        try {
          const { getStoredResearch } = await import("../vedic/research-store.js");
          const research: any = await getStoredResearch(profile.id);
          const houseOf = (planet: string) => (research?.houses ?? []).find((h: any) => (h.occupants ?? []).some((o: any) => (o.planet ?? o) === planet))?.house ?? null;
          const open = new Set([1, houseOf("Sun"), houseOf("Moon")].filter(Boolean));
          if (!open.has(input.house)) return { available: false, locked: true, read: null, generatedAt: null, cached: false } as const;
        } catch (e) {
          // audit M20: a thrown error here is a transient hiccup (DB, missing row), NOT a paywall —
          // return unavailable, not locked, so an owner isn't shown a lock until it clears. v926:
          // but it must NOT be silent — a genuine research-throw was invisible here (the exact class
          // that cost us laps on #7). Record it so it shows in the black box (admin Recent errors).
          const { recordServerError } = await import("./generate.js");
          recordServerError("narrative.houseRead:roomGate", e);
          return { available: false, locked: false, read: null, generatedAt: null, cached: false } as const;
        }
      }
      const { getHouseReadCached } = await import("./service.js");
      // audit LOW: meter forced regen (same class as M2) — only admins may cache-bypass a reader.
      return await getHouseReadCached(profile.id, input.house, ctx.user.role === "admin" && (input.refresh ?? false));
    } catch (e) {
      console.error("[narrative.houseRead]", e);
      return { available: false, read: null, generatedAt: null, cached: false } as const;
    }
  }),

  // THE CHAPTER READER — tap a mahadasha on the timeline, the lord's dossier speaks.
  dashaRead: protectedProcedure.input(z.object({ lord: z.string().min(2).max(12), antar: z.string().min(2).max(12).optional(), span: z.string().optional(), refresh: z.boolean().optional() })).query(async ({ ctx, input }) => {
    try {
      const { hasFeature } = await import("../feature-flags.js");
      if (!(await hasFeature(ctx.user, "chapterReader"))) return { available: false, locked: true, read: null, generatedAt: null, cached: false } as const;
      const { getActiveProfile, getProfileNatalBodies } = await import("../routers/profiles.js");
      const profile = await getActiveProfile(ctx.user.id);
      if (!profile) return { available: false, read: null, generatedAt: null, cached: false } as const;
      // THE CHAPTER GATE (David 2026-07-16): only the RUNNING chapter reads freely —
      // the current mahadasha and antardasha lords. Every other chapter stays locked
      // (the tease). Admins bypass.
      if (ctx.user.role !== "admin") {
        try {
          const bodies = await getProfileNatalBodies(profile.id);
          const moon: any = bodies.find((b: any) => b.planet === "Moon");
          const { calculateDashaTimeline } = await import("../dasha-calculator.js");
          const today = new Date().toISOString().slice(0, 10);
          const tl = calculateDashaTimeline((profile as any).birthDate, moon?.nakshatra || "", moon?.sign ?? "", String(moon?.degree ?? ""), today, moon?.longitude != null ? String(moon.longitude) : null);
          const cur: any = tl.entries.find((e: any) => e.isCurrent);
          // THE PAST READS FREE (time-gate doctrine; David 2026-07-16: "why are past
          // dasha readings gated?") — any chapter that has BEGUN is open; only the
          // future waits behind the gate.
          const begun = new Set(tl.entries.filter((e: any) => e.startDate <= today).map((e: any) => e.mahadasha));
          const allowed = new Set([cur?.mahadasha, cur?.antardasha, ...begun].filter(Boolean));
          if (!allowed.has(input.lord)) return { available: false, locked: true, read: null, generatedAt: null, cached: false } as const;
          // Sub-chapter gate (David 2026-07-16: "only current year and the past are
          // accessible") — within the ACTIVE maha, PAST and CURRENT antars read; FUTURE
          // antars wait locked. The time gate: the past is free, the future is destiny.
          if (input.antar) {
            if (input.lord !== cur?.mahadasha) return { available: false, locked: true, read: null, generatedAt: null, cached: false } as const;
            const inMaha = tl.entries.filter((e: any) => e.mahadasha === input.lord);
            const curIdx = inMaha.findIndex((e: any) => e.isCurrent);
            const askIdx = inMaha.findIndex((e: any) => e.antardasha === input.antar);
            if (askIdx < 0 || curIdx < 0 || askIdx > curIdx) return { available: false, locked: true, read: null, generatedAt: null, cached: false } as const;
          }
        } catch (e) {
          // audit M20: a thrown error here is a transient hiccup, return unavailable not locked (see
          // houseRead:roomGate). v926: record it too, so a real research-throw is never silent.
          const { recordServerError } = await import("./generate.js");
          recordServerError("narrative.dashaRead:chapterGate", e);
          return { available: false, locked: false, read: null, generatedAt: null, cached: false } as const;
        }
      }
      const { getDashaReadCached } = await import("./service.js");
      return await getDashaReadCached(profile.id, input.lord, input.span, ctx.user.role === "admin" && (input.refresh ?? false), input.antar);
    } catch (e) {
      console.error("[narrative.dashaRead]", e);
      return { available: false, read: null, generatedAt: null, cached: false } as const;
    }
  }),

  // ONE WINDOW ON THE YEAR-LORD'S ROAD (David 2026-07-17: "build it") — the TL path's
  // sign-band detail grows its own read. Time gate: BEGUN windows read; future ones wait.
  tlWindowRead: protectedProcedure.input(z.object({ from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), sign: z.string().min(3).max(16), refresh: z.boolean().optional() })).query(async ({ ctx, input }) => {
    try {
      const { hasFeature } = await import("../feature-flags.js");
      if (!(await hasFeature(ctx.user, "chapterReader"))) return { available: false, locked: true, read: null, generatedAt: null, cached: false } as const;
      const { getActiveProfile } = await import("../routers/profiles.js");
      const profile = await getActiveProfile(ctx.user.id);
      if (!profile) return { available: false, locked: false, read: null, generatedAt: null, cached: false } as const;
      const today = new Date().toISOString().slice(0, 10);
      if (ctx.user.role !== "admin" && input.from > today) return { available: false, locked: true, read: null, generatedAt: null, cached: false } as const;
      const { getDb } = await import("../db.js");
      const db = await getDb();
      if (!db) return { available: false, locked: false, read: null, generatedAt: null, cached: false } as const;
      const { timeLordTransits } = await import("../../drizzle/schema.js");
      const { and, eq } = await import("drizzle-orm");
      const rows = await db.select().from(timeLordTransits).where(and(eq(timeLordTransits.userId, ctx.user.id), eq(timeLordTransits.startDate, input.from), eq(timeLordTransits.sign, input.sign)));
      // AUDIT M2 (2026-07-18): the old `?? rows[0]` tail could voice ANOTHER profile's engine data
      // under the active chart (rows are userId-filtered, not profile-filtered) — and then CACHE it
      // under this profile's key forever. Exact profile, then legacy-null rows; nothing else.
      const row: any = rows.find((r: any) => r.profileId === profile.id) ?? rows.find((r: any) => r.profileId == null);
      if (!row) return { available: false, locked: false, read: null, generatedAt: null, cached: false } as const;
      const SIGNS_Z = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"];
      const HOUSE_GLOSS: Record<number, string> = { 1: "the self and the body", 2: "money and livelihood", 3: "the craft and the close circle", 4: "home and roots", 5: "the heart and its creations", 6: "the daily work and health", 7: "partnership", 8: "the shared and the hidden", 9: "belief and the far horizon", 10: "standing in the world", 11: "community and gains", 12: "rest and release" };
      const lagna = (profile as any).lagnaSign as string | null;
      const house = lagna ? ((SIGNS_Z.indexOf(input.sign) - SIGNS_Z.indexOf(lagna) + 12) % 12) + 1 : row.house;
      let cond: any = null;
      try { cond = JSON.parse(row.condition ?? "null"); } catch { cond = row.condition; }
      const tlInput = {
        tlWindow: {
          timeLord: row.timeLord, sign: input.sign, from: row.startDate, to: row.endDate,
          house, houseGloss: HOUSE_GLOSS[house], nakshatra: row.nakshatra,
          retro: !!row.isRetrograde, condition: cond,
          operationalMeaning: row.operationalMeaning, recommendedUse: row.recommendedUse,
        },
      };
      const { getTlWindowReadCached } = await import("./service.js");
      return await getTlWindowReadCached(profile.id, input.from, tlInput, ctx.user.role === "admin" && (input.refresh ?? false), input.sign);
    } catch (e) {
      console.error("[narrative.tlWindowRead]", e);
      return { available: false, locked: false, read: null, generatedAt: null, cached: false } as const;
    }
  }),

  chapter: protectedProcedure.input(inputSchema).query(async ({ ctx, input }) => {
    await assertOwnsProfile(ctx.user.id, input.profileId);
    const date = await guardedDate(ctx, input.profileId, input.date);
    if (!date) return { available: false as const, locked: true as const, chapter: null, generatedAt: null, cached: false };
    try {
      const dayLoc = await resolveDaySkyForProfileId(input.profileId, date);
      return await getChapterCached(input.profileId, date, ctx.user.role === "admin" && (input.refresh ?? false), dayLoc);
    } catch (e) {
      console.error("[narrative.chapter]", e);
      return { available: false, chapter: null, generatedAt: null, cached: false } as const;
    }
  }),

  // Kept Readings archive — every stored daily reading, newest first, with a snippet + pin state.
  list: protectedProcedure.input(z.object({ profileId: z.number(), limit: z.number().int().min(1).max(180).default(120) })).query(async ({ ctx, input }) => {
    await assertOwnsProfile(ctx.user.id, input.profileId);
    const rows = await listNarrativeReadings(input.profileId, input.limit);
    return rows.map((r) => {
      let snippet = "";
      try {
        // A day_read is {scene, story, tilt, closeLine, question} — no `narrative` field, so the old
        // extractor printed the raw JSON blob into the archive. readingProse knows both shapes.
        const n = readingProse(JSON.parse(r.content)) || String(r.content);
        snippet = n.replace(/\s+/g, " ").trim().slice(0, 180);
      } catch {
        snippet = String(r.content).replace(/\s+/g, " ").trim().slice(0, 180);
      }
      return { date: r.cacheDate, generatedAt: r.generatedAt, locked: r.locked, snippet };
    });
  }),

  // Is today's (or a given date's) read pinned/locked?
  lockStatus: protectedProcedure.input(z.object({ profileId: z.number(), date: z.string().optional() })).query(async ({ ctx, input }) => {
    await assertOwnsProfile(ctx.user.id, input.profileId);
    const date = input.date ?? todayUTC();
    try { return { locked: await isNarrativeLocked(input.profileId, date) }; }
    catch { return { locked: false }; }
  }),

  // Pin / unpin the read for a date — a locked read is returned as-is regardless of
  // prompt-version or input changes, so it never regenerates until unpinned.
  setLock: protectedProcedure.input(z.object({ profileId: z.number(), date: z.string().optional(), locked: z.boolean() })).mutation(async ({ ctx, input }) => {
    await assertOwnsProfile(ctx.user.id, input.profileId);
    const date = await guardedDate(ctx, input.profileId, input.date);
    if (!date) return { locked: false }; // can't pin a date outside the free window (premium pick-a-date)
    // Ensure both surfaces exist before locking, so there's a row to pin — with the SAME
    // dayLoc the DISPLAY path used (audit M1). Without it the ensure-exists hashed a
    // no-location (noon-UTC) input, MISSED the user's actual read, regenerated a different
    // one from the wrong-location data, overwrote it, and pinned content they never saw —
    // now a data-accuracy issue, since dayLoc drives the transit Moon (data-path #2).
    if (input.locked) {
      const dayLoc = await resolveDaySkyForProfileId(input.profileId, date);
      // 2026-07-20: this ensure-generate was pointed at "glance" — a surface RETIRED from Today
      // and read by no client. Pinning therefore billed a whole extra generation of prose the user
      // never saw, and pinned THAT, while the reading on screen (day_read) stayed unpinned and free
      // to regenerate. Ensure the read they actually tapped pin under; it is normally already cached
      // (the pin sits directly beneath it), so this costs nothing.
      await getDayReadCached(input.profileId, date, false, dayLoc).catch(() => {});
      // Only ensure-generate the premium year read for the entitled — otherwise a free pin would
      // silently mint a billed deep read around the deepRead gate. The lock rows below are cheap
      // (no generation), so both surfaces still unpin cleanly.
      if (await canYearSight(ctx.user)) await getDeepReadCached(input.profileId, date, false, false, dayLoc).catch(() => {});
    }
    await setNarrativeLock(input.profileId, "day_read", date, input.locked);
    await setNarrativeLock(input.profileId, "deep", date, input.locked);
    // legacy: pins taken before the glance was retired must still UNPIN cleanly.
    await setNarrativeLock(input.profileId, "glance", date, input.locked);
    // audit LOW: report the ACTUAL lock state, not the requested one — if the glance row never
    // existed (its generation hit a dry wallet / cap), the UPDATE was a no-op and the pin didn't
    // take. Reading it back keeps the UI's "Pinned" honest instead of confirming a lock that isn't.
    try { return { locked: await isNarrativeLocked(input.profileId, date) }; }
    catch { return { locked: input.locked }; }
  }),

  // Deterministic (ephemeris) current transits for the CURRENT TRIGGER breakdown.
  // No LLM — pure chart math, so it is free and auditable.
  currentTransits: protectedProcedure.input(inputSchema).query(async ({ ctx, input }) => {
    await assertOwnsProfile(ctx.user.id, input.profileId);
    // AUDIT LOW (2026-07-18): no LLM cost, but an unbounded date walk = ~50 ephemeris calls per
    // date on the single process. Bounded per IP; normal use never notices.
    try { rateLimit(ctx.req, "current-transits", { max: 120, windowMs: 15 * 60 * 1000 }); } catch { return { available: false as const }; }
    const date = input.date ?? todayUTC();
    try {
      // AUDIT #4 (HIGH): thread the SAME dayLoc the reading uses, so The Why popup samples the
      // transit sky at the viewer's local noon — not fixed noon-UTC. Without it a UTC+12 user saw
      // the Moon filed under the wrong house on ~1 day in 5 (the receipts contradicting the read).
      // Sharing dayLoc also shares the in-proc memo with the reading build (no second ephemeris run).
      const dayLoc = await resolveDaySkyForProfileId(input.profileId, date);
      const ni = await buildNarrativeInput(input.profileId, date, { dayLoc });
      return {
        available: true,
        activatedHouse: ni.profection.activatedHouse,
        timeLord: ni.profection.timeLord,
        timeLordTransit: ni.timeLordTransit,
        transits: ni.transits,
      };
    } catch (e) {
      console.error("[narrative.currentTransits]", e);
      return { available: false, activatedHouse: 0, timeLord: "", timeLordTransit: null, transits: [] as any[] };
    }
  }),
});
