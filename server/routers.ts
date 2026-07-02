import { z } from "zod";
import { eq } from "drizzle-orm";
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
  getProjectStats,
  getProjectInsights,
  getRecommendedNextTask,
  getProjectNote,
  upsertProjectNote,
  snoozeTask,
  unsnoozeTask,
  getTaskById,
} from "./db";
import { getDayField, dayModeToTaskMode } from "./panchang/service.js";
import { NAKSHATRA_MODIFIERS, TITHI_PHASE_MODIFIER, STRONG_RESTRAINT_TITHIS, STRONG_RESTRAINT_ADDITIONAL_MODIFIER, FIELD_CONDITION_MODIFIERS, SELECTIVE_BIAS_STRENGTH, FLEX_RESOLUTION, CONFIDENCE_CONFIG, HOUSE_TO_BASE_MODE } from "./panchang/modifier-config.js";
import { calculateFinalMode } from "./panchang/interpreter.js";
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
import { profilesRouter } from "./routers/profiles.js";
import { timeLordTransitRouter } from "./profection/transit-router.js";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { users, profiles } from "../drizzle/schema";
import { hashPassword, verifyPassword } from "./_core/password";
import { TRPCError } from "@trpc/server";

const TaskModeEnum = z.enum(["Restraint", "Build", "Selective", "Action"]);
const PriorityEnum = z.enum(["High", "Medium", "Low"]);
const RecurrenceEnum = z.enum(["none", "daily", "weekly", "biweekly", "monthly", "yearly"]);

/** Advance a due date to the next occurrence. Overdue tasks roll from today so
 *  occurrences don't pile up in the past. Null base starts from today. */
function nextDueDate(base: string | null, recurrence: string): string {
  const today = new Date().toISOString().split("T")[0];
  const start = base && base >= today ? base : today;
  const d = new Date(start + "T00:00:00Z");
  switch (recurrence) {
    case "daily": d.setUTCDate(d.getUTCDate() + 1); break;
    case "weekly": d.setUTCDate(d.getUTCDate() + 7); break;
    case "biweekly": d.setUTCDate(d.getUTCDate() + 14); break;
    case "monthly": d.setUTCMonth(d.getUTCMonth() + 1); break;
    case "yearly": d.setUTCFullYear(d.getUTCFullYear() + 1); break;
    default: d.setUTCDate(d.getUTCDate() + 1);
  }
  return d.toISOString().split("T")[0];
}

export const appRouter = router({
  system: systemRouter,
  profiles: profilesRouter,

  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    login: publicProcedure
      .input(z.object({ email: z.string().email(), password: z.string().min(6) }))
      .mutation(async ({ ctx, input }) => {
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
        })
      )
      .mutation(async ({ ctx, input }) => {
        rateLimit(ctx.req, "register", { max: 5, windowMs: 15 * 60 * 1000 });

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
        const userId = await createUserWithPassword({ email: input.email, name: input.name, passwordHash, role: "user" });
        return { id: userId, email: input.email, name: input.name };
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

        // Create the user account
        const passwordHash = await hashPassword(input.password);
        const newUserResult = await createUserWithPassword({
          email: input.email,
          name: refProfile.name,
          passwordHash,
          role: "user",
        });
        const newUserId = (newUserResult as any).id ?? (newUserResult as any);

        // Create their owner "My Chart" profile, copying birth data from the reference
        await db.insert(profiles).values({
          userId: newUserId,
          name: refProfile.name,
          birthDate: refProfile.birthDate ?? null,
          birthTime: refProfile.birthTime ?? null,
          birthLocationCity: refProfile.birthLocationCity ?? null,
          birthLocationLat: refProfile.birthLocationLat ?? null,
          birthLocationLon: refProfile.birthLocationLon ?? null,
          birthTimezone: refProfile.birthTimezone ?? null,
          isOwner: true,
          isActive: false,
          lagnaSign: refProfile.lagnaSign ?? null,
          sunHouse: refProfile.sunHouse ?? null,
          moonHouse: refProfile.moonHouse ?? null,
          marsHouse: refProfile.marsHouse ?? null,
          mercuryHouse: refProfile.mercuryHouse ?? null,
          jupiterHouse: refProfile.jupiterHouse ?? null,
          venusHouse: refProfile.venusHouse ?? null,
          saturnHouse: refProfile.saturnHouse ?? null,
          rahuHouse: refProfile.rahuHouse ?? null,
          ketuHouse: refProfile.ketuHouse ?? null,
          ascendantDegree: refProfile.ascendantDegree ?? null,
        });

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
          personalEnergy: z.enum(["Low", "Medium", "High"]).default("Medium"),
          todayHouse: z.number().optional(), // the day's domain (activated house)
          verdictShapesRanking: z.boolean().default(false), // opt-in: verdict tilts order
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
        return scoreTasks(allTasks, {
          todayMode: input.todayMode,
          todayDate: input.todayDate,
          personalEnergy: input.personalEnergy,
          dayHouses: input.todayHouse != null ? [input.todayHouse] : [],
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
      let state = { seen: [] as string[], enabled: true };
      try { if ((user as any)?.tourState) state = { ...state, ...JSON.parse((user as any).tourState) }; } catch { /* ignore */ }
      return state;
    }),
    markTourSeen: protectedProcedure
      .input(z.object({ key: z.string().max(64) }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb(); if (!db) return { ok: false };
        const user = await getUserById(ctx.user.id);
        let state = { seen: [] as string[], enabled: true };
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
        let state = { seen: [] as string[], enabled: true };
        try { if ((user as any)?.tourState) state = { ...state, ...JSON.parse((user as any).tourState) }; } catch { /* ignore */ }
        state.enabled = input.enabled;
        await db.update(users).set({ tourState: JSON.stringify(state) }).where(eq(users.id, ctx.user.id));
        return { ok: true };
      }),
    resetTours: protectedProcedure.mutation(async ({ ctx }) => {
      const db = await getDb(); if (!db) return { ok: false };
      await db.update(users).set({ tourState: JSON.stringify({ seen: [], enabled: true }) }).where(eq(users.id, ctx.user.id));
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
      return getDayField(dateStr, false, { lat, lon, utcOffset }, lagnaSign);
    }),

    byDate: publicProcedure
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
        // Use active profile (or owner profile) lagna — single source of truth
        const lagnaOverride = opts.ctx.subject?.lagnaSign ?? undefined;
        return getDayField(opts.input.date, false, locationOverride, lagnaOverride);
      }),

    byMonth: publicProcedure
      .input(z.object({ yearMonth: z.string() }))
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
        // Use active profile (or owner profile) lagna — single source of truth
        const lagnaOverride = opts.ctx.subject?.lagnaSign ?? undefined;
        const [year, month] = opts.input.yearMonth.split('-').map(Number);
        const daysInMonth = new Date(year, month, 0).getDate();
        const results = [];
        for (let d = 1; d <= daysInMonth; d++) {
          const dateStr = `${year}-${String(month).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
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
        const dayField = await getDayField(dateStr, false, locationOverride, subject.lagnaSign);
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
  }),

  // ── SYSTEM PROMPTS ─────────────────────────────────────────
  systemPrompts: router({
    list: protectedProcedure.query(async () => {
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
      .mutation(async ({ input }) => {
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
        const result = await createSubtask({ taskId: input.taskId, userId: ctx.user.id, title: input.title });
        return result;
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

  // ── CURRENT SKY (all planets now: positions, retro, stations, eclipses) ──
  sky: router({
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
      return { computedAt: sky.computedAt, signals, retrogrades: sky.retrogrades, eclipses: sky.eclipses, verdict };
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
        const field = await getDayField(opts.input.date, false, locationOverride, lagnaOverride);
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
    range: publicProcedure
      .input(z.object({ startDate: z.string(), endDate: z.string() }))
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
        const start = new Date(opts.input.startDate);
        const end = new Date(opts.input.endDate);
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

// ─── Timezone helpers ────────────────────────────────────────────────────────

/** Derive numeric UTC offset (hours) for an IANA timezone at a given moment. */
function getTimezoneOffset(timezone: string, date: Date): number {
  try {
    // Use Intl to get the offset: format a date in UTC and in the target TZ,
    // then compare. Reliable across DST transitions.
    const utcStr = date.toLocaleString('en-US', { timeZone: 'UTC', hour12: false,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const tzStr = date.toLocaleString('en-US', { timeZone: timezone, hour12: false,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const utcMs = new Date(utcStr).getTime();
    const tzMs = new Date(tzStr).getTime();
    return Math.round((tzMs - utcMs) / 3600000);
  } catch {
    return getBostonOffset(date); // safe fallback
  }
}

function getBostonOffset(date: Date): number {
  // EDT: 2nd Sunday in March → 1st Sunday in November = -4
  // EST otherwise = -5
  const year = date.getUTCFullYear();
  const edtStart = nthSundayUTC(year, 3, 2);
  const edtEnd = nthSundayUTC(year, 11, 1);
  return date >= edtStart && date < edtEnd ? -4 : -5;
}

function nthSundayUTC(year: number, month: number, n: number): Date {
  const d = new Date(Date.UTC(year, month - 1, 1));
  const dow = d.getUTCDay();
  const firstSunday = dow === 0 ? 1 : 8 - dow;
  return new Date(Date.UTC(year, month - 1, firstSunday + (n - 1) * 7));
}
