import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc.js";
import { getGlanceCached, getDeepReadCached, getChapterCached, getDayReadCached, getCastCached } from "./service.js";
import { buildNarrativeInput } from "./input-builder.js";
import { setNarrativeLock, isNarrativeLocked, getUserById, listNarrativeReadings } from "../db.js";
import { assertOwnsProfile } from "../routers/profiles.js";
import { getTimezoneOffset } from "../panchang/tz-offset.js";
import { rateLimit } from "../_core/rateLimit.js";

// The day-mode's location basis — the viewer's stored location + real tz, matching the hero's
// panchang (panchang.today / byDate). undefined → getDayField uses its built-in default. Keeping
// these in lock-step is what stops the hero and the day card naming different modes on one day.
function dayLocFromUser(u: { locationLat?: string | null; locationLon?: string | null; locationTimezone?: string | null } | null | undefined, dateStr?: string): { lat: number; lon: number; utcOffset: number } | undefined {
  if (u?.locationLat && u?.locationLon && u?.locationTimezone) {
    // Offset for the READING's date, not `now` (audit L5): a pick-a-date reading across a DST
    // transition otherwise took now's offset → the wrong sunrise/tithi for that date.
    const at = dateStr ? new Date(dateStr + "T12:00:00Z") : new Date();
    return { lat: parseFloat(u.locationLat), lon: parseFloat(u.locationLon), utcOffset: getTimezoneOffset(u.locationTimezone, at) };
  }
  return undefined;
}

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
// ±1 UTC day is the "today" window: every timezone's local today lands within today±1 UTC, so a
// legit `localToday` request is always honored regardless of tz (no midnight off-by-one). Any
// date beyond that is pick-a-date territory — allowed only for the entitled (specialReadings /
// admin) and rate-limited; everyone else is clamped to today, so at most a handful of day-keys
// per profile can ever generate. Cache still means each honored date generates at most once.
function withinDailyWindow(date: string): boolean {
  const d = Date.parse(date + "T00:00:00Z");
  if (Number.isNaN(d)) return false;
  const t = Date.parse(todayUTC() + "T00:00:00Z");
  return Math.abs(d - t) <= 24 * 60 * 60 * 1000 + 1000;
}

async function guardedDate(ctx: GenCtx, requested: string | undefined): Promise<string> {
  const today = todayUTC();
  const date = requested ?? today;
  if (withinDailyWindow(date)) return date;
  const { hasFeature } = await import("../feature-flags.js");
  const canPickDate = ctx.user.role === "admin" || (await hasFeature(ctx.user as any, "specialReadings"));
  if (!canPickDate) return today; // clamp non-entitled to today — the wallet drain is closed here
  rateLimit(ctx.req, "narrative-pickdate", { max: 40, windowMs: 15 * 60 * 1000 }); // entitled: cap the pick-a-date generation surface (defense-in-depth)
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
  glance: protectedProcedure.input(inputSchema).query(async ({ ctx, input }) => {
    await assertOwnsProfile(ctx.user.id, input.profileId);
    const date = await guardedDate(ctx, input.date);
    try {
      const u = await getUserById(ctx.user.id);
      // Day-mode from the viewer's location basis (same as the hero) — so the read and the hero
      // never name different modes on the same day.
      const dayLoc = dayLocFromUser(u, date);
      // METER THE FORCED REGENERATION (audit M2): the "update to the moment" refresh (nowMs) and
      // the refresh flag both force a fresh, un-persisted LLM call. The feature is admin-gated on
      // the client but the server enforced nothing — any user could spam it, an unmetered drain on
      // the capped wallet. Gate both behind the momentRefresh entitlement (admins today).
      const { hasFeature } = await import("../feature-flags.js");
      const canForce = ctx.user.role === "admin" || (await hasFeature(ctx.user, "momentRefresh"));
      // Moment read: attach the user's CURRENT location so the hora is "this hour where
      // you are" (default Boston, matching Master Mode's hora), not the birth place.
      let moment: { nowMs: number; lat?: number; lon?: number } | undefined;
      if (input.nowMs != null && canForce) {
        moment = {
          nowMs: input.nowMs,
          lat: u?.locationLat ? parseFloat(u.locationLat) : 42.3601,
          lon: u?.locationLon ? parseFloat(u.locationLon) : -71.0589,
        };
      }
      return await getGlanceCached(input.profileId, date, canForce && (input.refresh ?? false), moment, dayLoc);
    } catch (e) {
      console.error("[narrative.glance]", e);
      return { available: false, content: null, generatedAt: null, cached: false } as const;
    }
  }),

  // Structured six-section + synthesis read for the Profection page.
  deepRead: protectedProcedure.input(inputSchema).query(async ({ ctx, input }) => {
    await assertOwnsProfile(ctx.user.id, input.profileId);
    // Year-sight is premium (time-gate doctrine). Gate the ENDPOINT, not just the UI, so it
    // can't be called around the paywall for a free billed year read.
    if (!(await canYearSight(ctx.user))) return { available: false as const, locked: true as const, read: null, generatedAt: null, cached: false };
    const date = await guardedDate(ctx, input.date);
    // The deepened "stage + guests" read is an admin-only preview of the paid tier — a
    // non-admin can never obtain it, so the fast-tier detail stays behind the upsell.
    const deepened = (input.deepened ?? false) && ctx.user.role === "admin";
    try {
      const dayLoc = dayLocFromUser(await getUserById(ctx.user.id), date);
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
    const date = await guardedDate(ctx, input.date);
    try {
      const dayLoc = dayLocFromUser(await getUserById(ctx.user.id), date);
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
    const date = await guardedDate(ctx, input.date);
    try {
      const dayLoc = dayLocFromUser(await getUserById(ctx.user.id), date);
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
      if (!(await hasFeature(ctx.user, "houseReader"))) return { available: false, read: null, generatedAt: null, cached: false } as const;
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
        } catch { /* audit M20: a thrown error here is a transient hiccup (DB, missing row), NOT a paywall — return unavailable, not locked, so an owner isn't shown a lock until it clears */ return { available: false, locked: false, read: null, generatedAt: null, cached: false } as const; }
      }
      const { getHouseReadCached } = await import("./service.js");
      return await getHouseReadCached(profile.id, input.house, input.refresh ?? false);
    } catch (e) {
      console.error("[narrative.houseRead]", e);
      return { available: false, read: null, generatedAt: null, cached: false } as const;
    }
  }),

  // THE CHAPTER READER — tap a mahadasha on the timeline, the lord's dossier speaks.
  dashaRead: protectedProcedure.input(z.object({ lord: z.string().min(2).max(12), antar: z.string().min(2).max(12).optional(), span: z.string().optional(), refresh: z.boolean().optional() })).query(async ({ ctx, input }) => {
    try {
      const { hasFeature } = await import("../feature-flags.js");
      if (!(await hasFeature(ctx.user, "chapterReader"))) return { available: false, read: null, generatedAt: null, cached: false } as const;
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
        } catch { /* audit M20: a thrown error here is a transient hiccup (DB, missing row), NOT a paywall — return unavailable, not locked, so an owner isn't shown a lock until it clears */ return { available: false, locked: false, read: null, generatedAt: null, cached: false } as const; }
      }
      const { getDashaReadCached } = await import("./service.js");
      return await getDashaReadCached(profile.id, input.lord, input.span, input.refresh ?? false, input.antar);
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
      const row: any = rows.find((r: any) => r.profileId === profile.id) ?? rows.find((r: any) => r.profileId == null) ?? rows[0];
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
      return await getTlWindowReadCached(profile.id, input.from, tlInput, input.refresh ?? false, input.sign);
    } catch (e) {
      console.error("[narrative.tlWindowRead]", e);
      return { available: false, locked: false, read: null, generatedAt: null, cached: false } as const;
    }
  }),

  chapter: protectedProcedure.input(inputSchema).query(async ({ ctx, input }) => {
    await assertOwnsProfile(ctx.user.id, input.profileId);
    const date = await guardedDate(ctx, input.date);
    try {
      const dayLoc = dayLocFromUser(await getUserById(ctx.user.id), date);
      return await getChapterCached(input.profileId, date, input.refresh ?? false, dayLoc);
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
        const c = JSON.parse(r.content);
        const n = typeof c?.narrative === "string" ? c.narrative : String(r.content);
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
    const date = await guardedDate(ctx, input.date);
    // Ensure both surfaces exist before locking, so there's a row to pin — with the SAME
    // dayLoc the DISPLAY path used (audit M1). Without it the ensure-exists hashed a
    // no-location (noon-UTC) input, MISSED the user's actual read, regenerated a different
    // one from the wrong-location data, overwrote it, and pinned content they never saw —
    // now a data-accuracy issue, since dayLoc drives the transit Moon (data-path #2).
    if (input.locked) {
      const dayLoc = dayLocFromUser(await getUserById(ctx.user.id), date);
      await getGlanceCached(input.profileId, date, false, undefined, dayLoc).catch(() => {});
      // Only ensure-generate the premium year read for the entitled — otherwise a free pin would
      // silently mint a billed deep read around the deepRead gate. The lock rows below are cheap
      // (no generation), so both surfaces still unpin cleanly.
      if (await canYearSight(ctx.user)) await getDeepReadCached(input.profileId, date, false, false, dayLoc).catch(() => {});
    }
    await setNarrativeLock(input.profileId, "glance", date, input.locked);
    await setNarrativeLock(input.profileId, "deep", date, input.locked);
    return { locked: input.locked };
  }),

  // Deterministic (ephemeris) current transits for the CURRENT TRIGGER breakdown.
  // No LLM — pure chart math, so it is free and auditable.
  currentTransits: protectedProcedure.input(inputSchema).query(async ({ ctx, input }) => {
    await assertOwnsProfile(ctx.user.id, input.profileId);
    const date = input.date ?? todayUTC();
    try {
      const ni = await buildNarrativeInput(input.profileId, date);
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
