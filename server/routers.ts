import { z } from "zod";
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

/** Personal-weather rating (crown layer) for a subject on a date — null when anchors are missing.
 *  Feeds the weather gate in getDayField so a personal caution day contains the mode. */
async function subjectPersonalRating(subject: { profileId: number; lagnaSign: string | null } | null | undefined, dateStr: string): Promise<string | null> {
  try {
    if (!subject?.lagnaSign) return null;
    const { getProfileNatalBodies } = await import("./routers/profiles.js");
    const { anchorsFromBodies, personalRatingForDate } = await import("./panchang/crown.js");
    const bodies = await getProfileNatalBodies(subject.profileId);
    const anchors = anchorsFromBodies(bodies as any, subject.lagnaSign);
    if (!anchors) return null;
    return await personalRatingForDate(anchors, dateStr);
  } catch { return null; }
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

// Time Master (Pancha Pakshi) entitlement — the private feature flag. Today this is an allowlist
// (David = user 2); later it becomes a per-user backend toggle. One source of truth so the data
// endpoints AND the `access` check (which drives the locked/unlocked UI) can never disagree.
// Entitled to Time Master + Hora: admins, testers (Lang, Lisa, and new test users), plus the original
// bootstrap IDs as a safety net. Role is the scalable path — mark a user "tester" and they're in.
const MASTER_MODE_USER_IDS = [1, 2];
const hasMasterMode = (user: { id: number; role?: string | null }) =>
  user.role === "admin" || user.role === "tester" || MASTER_MODE_USER_IDS.includes(user.id);

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

  // REFERRALS — tester codes (David's spec 2026-07-10): referrer earns 1 free month per
  // successful referral, new user gets 10% off the first month. One redemption per
  // PERSON — the birth-data fingerprint is the identity, not the email. Billing hooks
  // (the actual credit + discount) land with Stripe; until then redemptions accrue as
  // "pending" and the admin view is the ledger.
  referrals: router({
    validate: publicProcedure
      .input(z.object({ code: z.string().min(2).max(32) }))
      .query(async ({ input }) => {
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
        return redeemReferralCode({ ...input, userId: ctx.user?.id ?? null });
      }),
    adminActivity: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN", message: "Admins only" });
      return listReferralActivity();
    }),
  }),

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
          isNewVenture: z.boolean().nullable().optional(),
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
          meridianLift: z.boolean().default(false), // opt-in: MC/IC chapter lifts its pole's areas
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

        return scoreTasks(allTasks, {
          todayMode: input.todayMode,
          todayDate: input.todayDate,
          personalEnergy: input.personalEnergy,
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
      const pr = await subjectPersonalRating(opts.ctx.subject, dateStr);
      return getDayField(dateStr, false, { lat, lon, utcOffset }, lagnaSign, pr);
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
        const pr = await subjectPersonalRating(opts.ctx.subject, opts.input.date);
        return getDayField(opts.input.date, false, locationOverride, lagnaOverride, pr);
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
        const dayField = await getDayField(dateStr, false, locationOverride, subject.lagnaSign, await subjectPersonalRating(subject, dateStr));
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

        const dayField = await getDayField(dateStr, false, locationOverride, subject.lagnaSign, await subjectPersonalRating(subject, dateStr));
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
    forMonth: protectedProcedure
      .input(z.object({ year: z.number().int(), month: z.number().int().min(1).max(12) }))
      .query(async ({ ctx, input }) => {
        const { getActiveProfile, getProfileNatalBodies } = await import("./routers/profiles.js");
        const profile = await getActiveProfile(ctx.user.id);
        if (!profile || !(profile as any).lagnaSign) return null;
        const bodies = await getProfileNatalBodies(profile.id);
        const NAK = ["Ashwini","Bharani","Krittika","Rohini","Mrigashira","Ardra","Punarvasu","Pushya","Ashlesha","Magha","Purva Phalguni","Uttara Phalguni","Hasta","Chitra","Swati","Vishakha","Anuradha","Jyeshtha","Mula","Purva Ashadha","Uttara Ashadha","Shravana","Dhanishtha","Shatabhisha","Purva Bhadrapada","Uttara Bhadrapada","Revati"];
        const ZOD = ["Aries","Taurus","Gemini","Cancer","Leo","Virgo","Libra","Scorpio","Sagittarius","Capricorn","Aquarius","Pisces"];
        let moonNak: string | null = null, natalMoonSign: string | null = null;
        for (const b of bodies) if (b.planet === "Moon") { moonNak = b.nakshatra ?? null; natalMoonSign = b.sign ?? null; }
        const birthNakIdx = NAK.findIndex((n) => n.toLowerCase() === String(moonNak ?? "").toLowerCase());
        const natalMoonSignIdx = ZOD.indexOf(natalMoonSign ?? "");
        const lagnaSignIdx = ZOD.indexOf((profile as any).lagnaSign);
        if (birthNakIdx < 0 || natalMoonSignIdx < 0 || lagnaSignIdx < 0) return null;

        const { calculateBirthChart } = await import("./birthchart/calculator.js");
        const { crownDay } = await import("./panchang/crown.js");
        const si = (lon: number) => Math.floor((((lon % 360) + 360) % 360) / 30);
        const p2 = (n: number) => String(n).padStart(2, "0");
        const daysInMonth = new Date(Date.UTC(input.year, input.month, 0)).getUTCDate();
        const ORD = ["", "1st","2nd","3rd","4th","5th","6th","7th","8th","9th","10th","11th","12th"];
        const days: any[] = [];
        for (let d = 1; d <= daysInMonth; d++) {
          const date = `${input.year}-${p2(input.month)}-${p2(d)}`;
          try {
            const ch: any = await calculateBirthChart(date, "12:00", 0, 0, "UTC");
            const T: Record<string, number> = { Sun: si(ch.sun.longitude), Moon: si(ch.moon.longitude), Mars: si(ch.mars.longitude), Mercury: si(ch.mercury.longitude), Jupiter: si(ch.jupiter.longitude), Venus: si(ch.venus.longitude), Saturn: si(ch.saturn.longitude), Rahu: si(ch.rahu.longitude), Ketu: si(ch.ketu.longitude) };
            const { majorityDayStarIdx } = await import("./panchang/crown.js");
            const majIdx = await majorityDayStarIdx(date);
            const cd = crownDay({ birthNakIdx, natalMoonSignIdx, lagnaSignIdx, sunLon: ch.sun.longitude, moonLon: ch.moon.longitude, transitSignByPlanet: T, dayNakIdxOverride: majIdx ?? undefined });
            const why = cd.rating === "crown"
              ? `${cd.tarabala.name} tara · Moon in your ${ORD[cd.chandrabala.house]} house · a clean day — one of your strongest this month.`
              : cd.rating === "caution"
              ? `${cd.tarabala.name} tara · Moon in your ${ORD[cd.chandrabala.house]} house — friction; keep the stakes low.`
              : "";
            days.push({ date, rating: cd.rating, why });
          } catch { days.push({ date, rating: "neutral", why: "" }); }
        }
        return { days };
      }),
  }),

  // ── MASTER MODE (Pancha Pakshi hourly timing) — GATED to an allowlist (private) ──
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
        const lat = input.lat ?? 42.3601, lon = input.lon ?? -71.0589;
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
        const lat = input.lat ?? 42.3601, lon = input.lon ?? -71.0589;
        const now = input.nowMs ?? Date.now();
        let [y, m, d] = input.date.split("-").map(Number);
        let horas = computeHoras(y, m, d, lat, lon);
        // Before today's sunrise → the active window belongs to the previous civil day.
        if (now < horas[0].startMs) {
          const prev = new Date(Date.UTC(y, m - 1, d - 1));
          horas = computeHoras(prev.getUTCFullYear(), prev.getUTCMonth() + 1, prev.getUTCDate(), lat, lon);
        }
        return {
          horas: horas.map((h) => ({
            index: h.index, lord: h.lord, phase: h.phase, tone: h.tone,
            good: HORA_TONE[h.lord].good, startMs: h.startMs, endMs: h.endMs,
          })),
        };
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
          "direct-2": "mercury-direct-2.jpg", "direct-1": "mercury-direct-1.jpg",
        },
      };
      const STATION_COPY: Record<string, { title: string; note: string }> = {
        "preshadow-1": { title: "{P} enters its shadow", note: "The retrograde zone opens — what you begin now you'll likely revisit, so leave room to revise." },
        "preshadow-2": { title: "{P}'s shadow deepens", note: "The turn is coming. Tie off what you don't want reopened; keep the rest flexible." },
        "preshadow-3": { title: "{P} in deep shadow", note: "The station is near — back up, double-check, confirm. Loose ends are surfacing on purpose." },
        "retrograde-1": { title: "{P} turns retrograde", note: "The light turns inward. Not a curse — a review begins: revisit and refine, don't launch." },
        "retrograde-2": { title: "{P} retrograde", note: "Deep in the review — the past resurfaces to be reconnected and finished. Hold big launches while the ground is re-walked." },
        "direct-2": { title: "{P} stations direct", note: "The turn. Clarity returns, but slowly — let momentum rebuild before you floor it." },
        "direct-1": { title: "{P} clears its shadow", note: "The review closes — fresh ground again. Now what you start holds." },
      };
      const phaseOf = (p: any): string | null => {
        if (p.isRetrograde) {
          const rst = p.station;
          // "Entering" = the retrograde station just happened (past ~week); deeper in = "stationed".
          return (rst?.type === "turns retrograde" && rst.daysAway <= 0 && rst.daysAway >= -7) ? "retrograde-1" : "retrograde-2";
        }
        const st = p.station;
        if (!st) return null;
        if (st.type === "turns retrograde" && st.daysAway > 0)
          return st.daysAway <= 5 ? "preshadow-3" : st.daysAway <= 10 ? "preshadow-2" : st.daysAway <= 16 ? "preshadow-1" : null;
        if (st.type === "turns direct" && st.daysAway <= 0)
          return st.daysAway >= -7 ? "direct-2" : "direct-1";
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
              if (ph === "retrograde-1") courseLine = d >= -3 ? `Day ${Math.max(1, -d + 1)} of the review — still inside the station window, the roughest stretch of the cycle.` : `Day ${-d + 1} of the review.`;
              else if (ph === "retrograde-2" && st.type === "turns direct") courseLine = d <= 3 ? (d <= 0 ? `The turn is here.` : `${d} day${d === 1 ? "" : "s"} to the turn — station window, the roughest stretch of the cycle.`) : `${d} days to the turn.`;
              else if (ph === "preshadow-3" && st.type === "turns retrograde") courseLine = d <= 3 ? `Station in ${d} day${d === 1 ? "" : "s"} — the rough window is open.` : `Station in ${d} days.`;
              else if (ph === "preshadow-2" && st.type === "turns retrograde") courseLine = `Station in ${d} days.`;
              else if (ph === "direct-2" && st.type === "turns direct") courseLine = -d <= 3 ? `Turned ${-d === 0 ? "today" : `${-d} day${-d === 1 ? "" : "s"} ago`} — still in the station window; let it settle.` : `Turned ${-d} days ago — momentum rebuilding.`;
            }
            return { planet: p.planet, phase: ph, image, title: c.title.replace("{P}", p.planet), note: c.note, courseLine, sign: p.sign, house: p.house };
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
        const field = await getDayField(opts.input.date, false, locationOverride, lagnaOverride, await subjectPersonalRating(opts.ctx.subject, opts.input.date));
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

// Timezone helpers moved to ./panchang/tz-offset.js (shared with the narrative pipeline so the
// hero and the day card derive the day-mode from the same location basis).
