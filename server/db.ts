import crypto from "node:crypto";
import { and, asc, desc, eq, gte, isNull, lt, ne, or, inArray, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, checkIns, horoscopes, panchang, profiles, profileNatalBodies, profectionYears, projects, projectNotes, reflections, sessions, subtasks, systemPrompts, tasks, timeLordTransits, users, natalBodies, narrativeCache, waitlist, referralCodes, referralRedemptions, profileResearch, profileDashaPeriods, profileConvergence, pushSubscriptions, type User } from "../drizzle/schema";
import { DAILY_SURFACES, PINNED_SURFACES, pickDailyRows } from "./narrative/daily-surface";
import { ENV } from "./_core/env";
import { hashPassword, verifyPassword } from "./_core/password";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ── USERS ────────────────────────────────────────────────────

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;

  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};

  const textFields = ["name", "email", "loginMethod"] as const;
  for (const field of textFields) {
    const value = user[field];
    if (value === undefined) continue;
    const normalized = value ?? null;
    values[field] = normalized;
    updateSet[field] = normalized;
  }

  if (user.lastSignedIn !== undefined) {
    values.lastSignedIn = user.lastSignedIn;
    updateSet.lastSignedIn = user.lastSignedIn;
  }
  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = "admin";
    updateSet.role = "admin";
  }

  if (!values.lastSignedIn) values.lastSignedIn = new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();

  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return result[0];
}

export async function createUserWithPassword(data: { email: string; name?: string; passwordHash: string; role?: "user" | "admin" | "tester" }) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const [result] = await db.insert(users).values({ email: data.email, name: data.name, passwordHash: data.passwordHash, role: data.role || "user", loginMethod: "email", createdAt: new Date(), updatedAt: new Date() }).$returningId();
  return result;
}

export async function updateUserPasswordHash(userId: number, passwordHash: string): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.update(users).set({ passwordHash, updatedAt: new Date() }).where(eq(users.id, userId));
}

export async function verifyLogin(email: string, password: string) {
  const user = await getUserByEmail(email);
  if (!user || !user.passwordHash) return null;
  const isValid = await verifyPassword(password, user.passwordHash);
  if (!isValid) return null;
  return user;
}

// ── Sessions (DB-backed random tokens) ──────────────────────────────────────

/** Create a session and return its unguessable token (store this in the cookie). */
export async function createSession(userId: number, ttlMs: number): Promise<string> {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");
  const token = crypto.randomBytes(32).toString("hex"); // 256-bit, 64 hex chars
  const expiresAt = new Date(Date.now() + ttlMs);
  await db.insert(sessions).values({ token, userId, expiresAt, createdAt: new Date() });
  return token;
}

/** How long a session lives from its LAST USE. The window is the same 7 days it always was; what
 *  changed in v811 is that it now counts from activity rather than from login. */
export const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
/** Only re-stamp once the session is past halfway, so an active user costs one write a day, not one
 *  per request. Returned to the caller so it can re-issue the cookie on the same schedule. */
const SESSION_SLIDE_AFTER_MS = SESSION_TTL_MS / 2;

/** Resolve a session token to its user, deleting it if expired.
 *  SLIDING RENEWAL (v811): the TTL was fixed at login and never extended, so a session died exactly
 *  seven days after sign-in no matter how much the person used the app. On day 8 the installed PWA
 *  opened on the marketing site — whose "unlisted app" design means there is deliberately no login
 *  link — and the only way back in was to know to type /login. A daily user was being logged out
 *  weekly by a timer that never noticed them.
 *  @returns `slid` true when the expiry was just extended, so the caller can refresh the cookie too:
 *           sliding the row alone would still leave the BROWSER dropping the cookie on day 7. */
export async function getUserBySessionToken(token: string): Promise<{ user: User; slid: boolean } | null> {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(sessions).where(eq(sessions.token, token)).limit(1);
  const session = rows[0];
  if (!session) return null;
  const now = Date.now();
  if (session.expiresAt.getTime() < now) {
    await db.delete(sessions).where(eq(sessions.token, token));
    return null;
  }
  const user = await getUserById(session.userId);
  if (!user) return null;
  let slid = false;
  if (session.expiresAt.getTime() - now < SESSION_SLIDE_AFTER_MS) {
    try {
      await db.update(sessions).set({ expiresAt: new Date(now + SESSION_TTL_MS) }).where(eq(sessions.token, token));
      slid = true;
    } catch { /* a failed slide must never cost a valid session — the old expiry still stands */ }
  }
  return { user, slid };
}

/** Delete a single session (logout). */
export async function deleteSession(token: string): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.delete(sessions).where(eq(sessions.token, token));
}

/** Delete all sessions for a user (logout everywhere / password change). */
export async function deleteAllSessionsForUser(userId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.delete(sessions).where(eq(sessions.userId, userId));
}

/**
 * Delete a user and EVERYTHING keyed to them, in one place — because the userId columns
 * have no DB-level foreign keys / cascade, so a bare row-delete (e.g. in the Railway UI)
 * orphans their profiles, sessions, check-ins, etc. Order matters: profile-scoped children
 * (keyed by profileId) go first, then every userId-keyed table, then any OTHER user's
 * reference profile that was linked to this user is unlinked, then the user row itself.
 */
export async function deleteUserCascade(userId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");

  // 1. Children keyed by profileId (not userId): collect this user's profile ids first.
  const userProfiles = await db.select({ id: profiles.id }).from(profiles).where(eq(profiles.userId, userId));
  const profileIds = userProfiles.map((p) => p.id);
  if (profileIds.length) {
    await db.delete(profileNatalBodies).where(inArray(profileNatalBodies.profileId, profileIds));
    await db.delete(narrativeCache).where(inArray(narrativeCache.profileId, profileIds));
    // audit MEDIUM-10: these four profileId-keyed tables were orphaned on every cascade — the
    // biggest, profileDashaPeriods, is ~66-75k rows PER profile. Delete them too so account churn
    // (the friend-onboarding create → repair → deleteUserCascade path) doesn't strand DB bloat.
    await db.delete(horoscopes).where(inArray(horoscopes.profileId, profileIds));
    await db.delete(profileResearch).where(inArray(profileResearch.profileId, profileIds));
    await db.delete(profileDashaPeriods).where(inArray(profileDashaPeriods.profileId, profileIds));
    await db.delete(profileConvergence).where(inArray(profileConvergence.profileId, profileIds));
  }

  // 2. Every table keyed by userId.
  await db.delete(profiles).where(eq(profiles.userId, userId));
  await db.delete(sessions).where(eq(sessions.userId, userId));
  await db.delete(tasks).where(eq(tasks.userId, userId));
  await db.delete(subtasks).where(eq(subtasks.userId, userId));
  await db.delete(reflections).where(eq(reflections.userId, userId));
  await db.delete(natalBodies).where(eq(natalBodies.userId, userId));
  await db.delete(profectionYears).where(eq(profectionYears.userId, userId));
  await db.delete(timeLordTransits).where(eq(timeLordTransits.userId, userId));
  await db.delete(projects).where(eq(projects.userId, userId));
  await db.delete(projectNotes).where(eq(projectNotes.userId, userId));
  await db.delete(checkIns).where(eq(checkIns.userId, userId));
  await db.delete(pushSubscriptions).where(eq(pushSubscriptions.userId, userId)); // AUDIT #4: was stranded on delete

  // 3. Clear links on OTHER users' (e.g. the admin's) reference profiles that pointed here.
  await db.update(profiles).set({ linkedUserId: null }).where(eq(profiles.linkedUserId, userId));

  // 4. Finally the user row.
  await db.delete(users).where(eq(users.id, userId));
}

/** Force-logout EVERY user (used after a breaking build change). Optionally keep one
 *  token alive so the admin who triggered it stays signed in. Returns the count cleared. */
export async function deleteAllSessions(exceptToken?: string): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const rows = await db.select({ token: sessions.token }).from(sessions);
  const cleared = rows.filter((r) => r.token !== exceptToken).length;
  if (exceptToken) await db.delete(sessions).where(ne(sessions.token, exceptToken));
  else await db.delete(sessions);
  return cleared;
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result[0];
}

export async function updateUserBirthChart(
  userId: number,
  chart: {
    lagnaSign?: string | null;
    sunHouse?: number | null;
    moonHouse?: number | null;
    marsHouse?: number | null;
    mercuryHouse?: number | null;
    jupiterHouse?: number | null;
    venusHouse?: number | null;
    saturnHouse?: number | null;
    rahuHouse?: number | null;
    ketuHouse?: number | null;
    ascendantDegree?: string | null;
    mcLongitude?: string | null;
    birthDate?: string | null;
    birthTime?: string | null;
    birthLocationCity?: string | null;
    birthLocationLat?: string | null;
    birthLocationLon?: string | null;
    birthTimezone?: string | null;
  }
) {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set(chart).where(eq(users.id, userId));
}

export async function updateUserLocation(
  userId: number,
  location: { city: string; lat: string; lon: string; timezone: string }
) {
  const db = await getDb();
  if (!db) return;
  await db
    .update(users)
    .set({
      locationCity: location.city,
      locationLat: location.lat,
      locationLon: location.lon,
      locationTimezone: location.timezone,
    })
    .where(eq(users.id, userId));
}

// ── TASKS ────────────────────────────────────────────────────

export async function getTasksByUser(userId: number, profileId?: number | null) {
  const db = await getDb();
  if (!db) return [];
  // profileId=null → owner tasks (profileId IS NULL); profileId=number → profile tasks
  const profileFilter = profileId != null
    ? eq(tasks.profileId, profileId)
    : isNull(tasks.profileId);
  const taskRows = await db
    .select({
      id: tasks.id,
      userId: tasks.userId,
      profileId: tasks.profileId,
      title: tasks.title,
      mode: tasks.mode,
      priority: tasks.priority,
      intent: tasks.intent,
      isPinned: tasks.isPinned,
      isCompleted: tasks.isCompleted,
      completedAt: tasks.completedAt,
      dueDate: tasks.dueDate,
      wealthFlow: tasks.wealthFlow,
      projectId: tasks.projectId,
      cognitiveLoad: tasks.cognitiveLoad,
      physicalLoad: tasks.physicalLoad,
      creativeRequired: tasks.creativeRequired,
      socialRequired: tasks.socialRequired,
      emotionalLoad: tasks.emotionalLoad,
      snoozedUntil: tasks.snoozedUntil,
      notes: tasks.notes,
      recurrence: tasks.recurrence,
      lifeAreas: tasks.lifeAreas,
      isNewVenture: tasks.isNewVenture,
      completionPct: tasks.completionPct,
      effortSize: tasks.effortSize,
      circle: tasks.circle,
    circles: tasks.circles,
      createdAt: tasks.createdAt,
      updatedAt: tasks.updatedAt,
      projectName: projects.name,
    })
    .from(tasks)
    .leftJoin(projects, eq(tasks.projectId, projects.id))
    .where(and(eq(tasks.userId, userId), profileFilter))
    .orderBy(desc(tasks.isPinned), asc(tasks.isCompleted), desc(tasks.createdAt));

  if (taskRows.length === 0) return taskRows.map((t) => ({ ...t, subtaskTotal: 0, subtaskCompleted: 0 }));

  const taskIds = taskRows.map((t) => t.id);
  const counts = await getSubtaskCountsByTasks(taskIds, userId);

  return taskRows.map((t) => ({
    ...t,
    subtaskTotal: counts[t.id]?.total ?? 0,
    subtaskCompleted: counts[t.id]?.completed ?? 0,
  }));
}

export async function getPinnedTasksForToday(userId: number, _mode: string, profileId?: number | null) {
  const db = await getDb();
  if (!db) return [];
  // Pinned tasks stay under "Pinned for Now" regardless of the day's mode —
  // pinning is an explicit user choice that shouldn't be hidden by a mode shift.
  const profileFilter = profileId != null ? eq(tasks.profileId, profileId) : isNull(tasks.profileId);
  const rows = await db
    .select()
    .from(tasks)
    .where(and(eq(tasks.userId, userId), profileFilter, eq(tasks.isPinned, true)))
    .orderBy(asc(tasks.isCompleted), desc(tasks.priority), desc(tasks.createdAt))
    .limit(10);
  const now = Date.now();
  return rows.filter((t) => !t.snoozedUntil || t.snoozedUntil <= now);
}

export async function createTask(data: {
  userId: number;
  profileId?: number | null;
  title: string;
  mode: "Restraint" | "Build" | "Selective" | "Action";
  priority: "High" | "Medium" | "Low";
  intent?: "want" | "need";
  isPinned: boolean;
  dueDate?: string | null;
  wealthFlow?: boolean;
  projectId?: number | null;
  cognitiveLoad?: "Low" | "Medium" | "High" | null;
  physicalLoad?: "Low" | "Medium" | "High" | null;
  creativeRequired?: boolean | null;
  socialRequired?: boolean | null;
  emotionalLoad?: "Low" | "Medium" | "High" | null;
  notes?: string | null;
  recurrence?: "none" | "daily" | "weekly" | "biweekly" | "monthly" | "yearly";
  lifeAreas?: string | null;
  completionPct?: number | null;
  effortSize?: "quick" | "sitting" | "long" | null;
  circle?: "life_partner" | "husband" | "wife" | "boyfriend" | "girlfriend" | "lover" | "situationship" | "children" | "mother" | "father" | "family" | "pets" | "self" | "inner_circle" | "friends" | "acquaintances" | "boss" | "business_partner" | "mentors" | "mentees" | "coworkers" | "clients" | "helpers" | "institutions" | "powerful" | "followers" | "everyone_else" | "enemies" | null;
  circles?: string[] | null;
}) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const payload: any = { ...data, circles: data.circles ? JSON.stringify(data.circles) : null };
  const [result] = await db.insert(tasks).values(payload).$returningId();
  return result;
}

export async function getTaskById(id: number, userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(tasks).where(and(eq(tasks.id, id), eq(tasks.userId, userId))).limit(1);
  return rows[0];
}

export async function updateTask(
  id: number,
  userId: number,
  data: Partial<{
    circles?: string[] | null;
    title: string;
    mode: "Restraint" | "Build" | "Selective" | "Action";
    priority: "High" | "Medium" | "Low";
    intent: "want" | "need";
    isPinned: boolean;
    isCompleted: boolean;
    completedAt: Date | null;
    dueDate: string | null;
    wealthFlow: boolean;
    projectId: number | null;
    cognitiveLoad: "Low" | "Medium" | "High" | null;
    physicalLoad: "Low" | "Medium" | "High" | null;
    creativeRequired: boolean | null;
    socialRequired: boolean | null;
    emotionalLoad: "Low" | "Medium" | "High" | null;
    notes: string | null;
    recurrence: "none" | "daily" | "weekly" | "biweekly" | "monthly" | "yearly";
    lifeAreas: string | null;
  }>
) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db
    .update(tasks)
    .set({ ...data, ...(((data as any).circles !== undefined) ? { circles: (data as any).circles ? JSON.stringify((data as any).circles) : null } : {}) } as any)
    .where(and(eq(tasks.id, id), eq(tasks.userId, userId)));
}

export async function deleteTask(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  // Cascade delete subtasks first
  await db.delete(subtasks).where(and(eq(subtasks.taskId, id), eq(subtasks.userId, userId)));
  await db.delete(tasks).where(and(eq(tasks.id, id), eq(tasks.userId, userId)));
}

/** Purge all completed tasks (and their subtasks) for a user/profile. Returns count removed. */
export async function deleteCompletedTasks(userId: number, profileId?: number | null): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const profileFilter = profileId != null ? eq(tasks.profileId, profileId) : isNull(tasks.profileId);
  const rows = await db
    .select({ id: tasks.id })
    .from(tasks)
    .where(and(eq(tasks.userId, userId), profileFilter, eq(tasks.isCompleted, true)));
  if (rows.length === 0) return 0;
  const ids = rows.map((r) => r.id);
  await db.delete(subtasks).where(and(eq(subtasks.userId, userId), inArray(subtasks.taskId, ids)));
  await db.delete(tasks).where(and(eq(tasks.userId, userId), inArray(tasks.id, ids)));
  return ids.length;
}

export async function snoozeTask(id: number, userId: number, snoozedUntil: number) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.update(tasks).set({ snoozedUntil }).where(and(eq(tasks.id, id), eq(tasks.userId, userId)));
}

export async function unsnoozeTask(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.update(tasks).set({ snoozedUntil: null }).where(and(eq(tasks.id, id), eq(tasks.userId, userId)));
}

// ── PANCHANG ─────────────────────────────────────────────────

export async function upsertPanchang(data: {
  date: string;
  display: string;
  sunrise: string;
  moonSign: string;
  moonLongitude: string;
  houseActivated: number;
  nakshatra: string;
  nakshatraPada: number;
  tithi: string;
  tithiPaksha: string;
  mode: string;
  instruction: string;
}) {
  const db = await getDb();
  if (!db) throw new Error('DB unavailable');
  await db
    .insert(panchang)
    .values({ ...data, calculatedAt: new Date() } as any)
    .onDuplicateKeyUpdate({
      set: {
        sunrise: data.sunrise,
        moonSign: data.moonSign,
        moonLongitude: data.moonLongitude,
        houseActivated: data.houseActivated,
        nakshatra: data.nakshatra,
        nakshatraPada: data.nakshatraPada,
        tithi: data.tithi,
        tithiPaksha: data.tithiPaksha,
        mode: data.mode,
        instruction: data.instruction,
        calculatedAt: new Date(),
      } as any,
    });
}

export async function getPanchangByDate(date: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(panchang).where(eq(panchang.date, date)).limit(1);
  return result[0];
}

export async function getPanchangByMonth(yearMonth: string) {
  // yearMonth = "2026-05"
  const db = await getDb();
  if (!db) return [];
  const result = await db.select().from(panchang);
  return result.filter((r) => r.date.startsWith(yearMonth));
}

// ── HELPERS ──────────────────────────────────────────────────

export function panchangModeToTaskMode(mode: string): string {
  const map: Record<string, string> = {
    ACTION: "Action",
    BUILD: "Build",
    RESTRAINT: "Restraint",
    "SELECTIVE ACTION": "Selective",
    // Direct mode names from interpreter
    Action: "Action",
    Build: "Build",
    Restraint: "Restraint",
    Selective: "Selective",
    Flex: "Build",
    // Legacy
    Activate: "Action",
    ACTIVATE: "Action",
  };
  return map[mode] ?? "Build";
}

export function taskModeToPanchang(mode: string): string {
  const map: Record<string, string> = {
    Action: "ACTION",
    Build: "BUILD",
    Restraint: "RESTRAINT",
    Selective: "SELECTIVE ACTION",
  };
  return map[mode] ?? "BUILD";
}

// ── REFLECTIONS ───────────────────────────────────────────

export async function getReflectionsByUser(userId: number, limit = 60, profileId?: number | null) {
  const db = await getDb();
  if (!db) return [];
  const profileFilter = profileId != null ? eq(reflections.profileId, profileId) : isNull(reflections.profileId);
  return db
    .select()
    .from(reflections)
    .where(and(eq(reflections.userId, userId), profileFilter))
    .orderBy(desc(reflections.date))
    .limit(limit);
}

export async function getReflectionByDate(userId: number, date: string, profileId?: number | null) {
  const db = await getDb();
  if (!db) return undefined;
  const profileFilter = profileId != null ? eq(reflections.profileId, profileId) : isNull(reflections.profileId);
  const result = await db
    .select()
    .from(reflections)
    .where(and(eq(reflections.userId, userId), eq(reflections.date, date), profileFilter))
    .limit(1);
  return result[0];
}

export async function upsertReflection(userId: number, date: string, content: string, profileId?: number | null) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const existing = await getReflectionByDate(userId, date, profileId);
  const profileFilter = profileId != null ? eq(reflections.profileId, profileId) : isNull(reflections.profileId);
  if (existing) {
    await db
      .update(reflections)
      .set({ content })
      .where(and(eq(reflections.userId, userId), eq(reflections.date, date), profileFilter));
  } else {
    await db.insert(reflections).values({ userId, date, content, profileId: profileId ?? null });
  }
}

// ── SYSTEM PROMPTS ────────────────────────────────────────────

export async function getAllSystemPrompts() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(systemPrompts).orderBy(asc(systemPrompts.key));
}

export async function getSystemPromptByKey(key: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(systemPrompts).where(eq(systemPrompts.key, key)).limit(1);
  return result[0];
}

// ===== NARRATIVE CACHE (LLM Glance / Deep Read) =====
/** The yoga_read cache keys this profile holds — the FREE TASTE mechanic (David 2026-07-16:
 *  "the user pics"): an un-entitled user's first opened yoga IS their pick, recorded by the
 *  cached read itself; no schema, self-enforcing, re-readable forever. */
export async function listYogaReadKeys(profileId: number): Promise<string[]> {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.select({ cacheDate: narrativeCache.cacheDate })
    .from(narrativeCache)
    .where(and(eq(narrativeCache.profileId, profileId), eq(narrativeCache.surface, "yoga_read")));
  return rows.map((r) => r.cacheDate);
}

/**
 * THE HELD ROWS — readings that were GENERATED AND PAID FOR but could not be written to the
 * database.
 *
 * The 2026-07-17 outage law says a cache-write failure must never kill a generated reading: the
 * read is served anyway. But `upsertNarrativeCache` swallowed the error and returned void, so
 * nothing downstream knew the row had not landed — and the next tap regenerated the identical
 * reading and BILLED FOR IT AGAIN. During that outage (cacheDate VARCHAR(10) rejecting the new
 * longer keys) that was every tap, of every surface, indefinitely.
 *
 * A failed write now parks the row here, and getNarrativeCache serves it exactly like a database
 * row. It cannot go stale or serve the wrong thing: every caller already compares `inputHash`, so
 * a held row that no longer matches simply misses, the same as a database row that no longer
 * matches. It is per-process and lost on restart — which is correct, this is a shock absorber for
 * a broken table, not a second cache. Capped, drop-oldest.
 */
type HeldRow = { profileId: number; surface: string; cacheDate: string; inputHash: string; model: string; content: string; generatedAt: Date; locked: boolean; held: true };
const heldRows = new Map<string, HeldRow>();
const HELD_MAX = 60;
const heldKey = (profileId: number, surface: string, cacheDate: string) => `${profileId}|${surface}|${cacheDate}`;

/** How many paid readings are currently held because the table would not take them. 0 is healthy;
 *  anything else means narrative_cache is rejecting writes and should be looked at. */
export function heldNarrativeCount(): number {
  return heldRows.size;
}

export async function getNarrativeCache(profileId: number, surface: string, cacheDate: string) {
  const db = await getDb();
  const held = heldRows.get(heldKey(profileId, surface, cacheDate));
  if (!db) return held; // no database at all — a held row is better than nothing
  const result = await db
    .select()
    .from(narrativeCache)
    .where(and(eq(narrativeCache.profileId, profileId), eq(narrativeCache.surface, surface), eq(narrativeCache.cacheDate, cacheDate)))
    .orderBy(desc(narrativeCache.id))
    .limit(1);
  // A real row wins; the held row covers exactly the case where the write never landed.
  return (result[0] as any) ?? held;
}

/** Most recent cached read for a profile+surface, regardless of date. The STAGE read is
 *  date-independent, so this lets it reuse identical prose across days (only regenerating
 *  when the input hash changes — i.e. the yearly chapter actually turns). */
export async function getLatestNarrativeCache(profileId: number, surface: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(narrativeCache)
    .where(and(eq(narrativeCache.profileId, profileId), eq(narrativeCache.surface, surface)))
    .orderBy(desc(narrativeCache.id))
    .limit(1);
  return result[0];
}

// Count of NEW narrative generations for a profile since UTC midnight — the durable signal for
// the daily generation cap (the "invisible fairness limit"). Survives restarts and counts the
// distinct surface+date reads minted today, which is exactly the binge-cost surface. Refresh/
// ephemeral-moment events are counted in-process on top of this (see service.ts guardedGen).
export async function countGenerationsToday(profileId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const start = new Date(new Date().toISOString().slice(0, 10) + "T00:00:00.000Z");
  const rows = await db
    .select({ n: sql<number>`count(*)` })
    .from(narrativeCache)
    .where(and(eq(narrativeCache.profileId, profileId), gte(narrativeCache.generatedAt, start)));
  return Number(rows[0]?.n ?? 0);
}

/** @returns true if the row actually landed in the table; false if it is only being HELD
 *  in-process (see heldRows). Callers may ignore it — the reading is served either way — but a
 *  `false` means this reading will not survive a restart and is not in the archive. */
/** Delete ONE narrative_cache row. Used by the pick-a-date heal (v823): once a rescued reading has
 *  been frozen into `horoscopes` under its true generating version, the rescue copy has done its
 *  job, and leaving it keeps a second unversioned copy of a paid reading alive indefinitely.
 *  Also drops any in-process held row for the same key, or the next read would resurrect it. */
export async function clearNarrativeCacheRow(profileId: number, surface: string, cacheDate: string): Promise<void> {
  heldRows.delete(heldKey(profileId, surface, cacheDate));
  const db = await getDb();
  if (!db) return;
  try {
    await db.delete(narrativeCache).where(and(
      eq(narrativeCache.profileId, profileId),
      eq(narrativeCache.surface, surface),
      eq(narrativeCache.cacheDate, cacheDate),
    ));
  } catch { /* a rescue row we could not delete is harmless — never fail a served reading for it */ }
}

export async function upsertNarrativeCache(profileId: number, surface: string, cacheDate: string, inputHash: string, model: string, content: string): Promise<boolean> {
  const hold = () => {
    if (heldRows.size >= HELD_MAX) {
      const oldest = heldRows.keys().next().value;
      if (oldest !== undefined) heldRows.delete(oldest);
    }
    heldRows.set(heldKey(profileId, surface, cacheDate), {
      profileId, surface, cacheDate, inputHash, model, content, generatedAt: new Date(), locked: false, held: true,
    });
  };
  const db = await getDb();
  if (!db) { hold(); return false; }
  try {
    // A PINNED READING IS NOT OVERWRITABLE (v802). The pin was enforced only by the READ paths
    // refusing to regenerate — this write, the last line of defence, never looked at the flag. Any
    // path that reached generation for a locked row (a refresh, an admin regenerate, a new surface
    // added without the guard) silently replaced prose the user had explicitly kept. The whole
    // point of a pin is that the words stop moving, so the check belongs where the words are
    // written, not only where they are read.
    const existing = await db
      .select({ locked: narrativeCache.locked })
      .from(narrativeCache)
      .where(and(eq(narrativeCache.profileId, profileId), eq(narrativeCache.surface, surface), eq(narrativeCache.cacheDate, cacheDate)))
      .orderBy(desc(narrativeCache.id))
      .limit(1);
    if (existing[0]?.locked) {
      // The pinned row IS the truth for this key — report success (a row is there) and change
      // nothing. Never hold() here: holding would serve the new prose over the pin on the next read.
      return true;
    }
    await db
      .insert(narrativeCache)
      .values({ profileId, surface, cacheDate, inputHash, model, content, generatedAt: new Date() })
      .onDuplicateKeyUpdate({ set: { inputHash, model, content, generatedAt: new Date() } });
    // It landed — drop any held copy so the table stays the single source.
    heldRows.delete(heldKey(profileId, surface, cacheDate));
    return true;
  } catch (err) {
    // THE 2026-07-17 OUTAGE LAW: a cache-write failure must NEVER kill a generated reading.
    // The read was already produced and billed — serve it; record the write failure in the
    // black box. (This exact path was cacheDate VARCHAR(10) rejecting the new long keys,
    // silently discarding paid generations and regenerating on every tap.)
    // 2026-07-20: and HOLD it in-process, so the next tap serves the reading that was already
    // paid for instead of generating and billing an identical one. The old void return meant a
    // failed save was indistinguishable from a successful one to every caller.
    hold();
    const { recordServerError } = await import("./narrative/generate.js");
    recordServerError(`cacheWrite:${surface}:${cacheDate}`, err);
    return false;
  }
}

/** The archive: every stored daily reading for a profile, newest first (for the Kept Readings
 *  view). Reads BOTH daily surfaces (see daily-surface.ts) — the live day_read plus the retired
 *  glance rows generated before the switch — and keeps one row per date. */
export async function listNarrativeReadings(profileId: number, limit = 120) {
  const db = await getDb();
  if (!db) return [];
  const rows = await db
    .select({ surface: narrativeCache.surface, cacheDate: narrativeCache.cacheDate, generatedAt: narrativeCache.generatedAt, locked: narrativeCache.locked, content: narrativeCache.content })
    .from(narrativeCache)
    .where(and(eq(narrativeCache.profileId, profileId), inArray(narrativeCache.surface, DAILY_SURFACES as unknown as string[])))
    .orderBy(desc(narrativeCache.cacheDate))
    .limit(limit * 2); // both surfaces can hold the same date; dedupe, then trim
  return pickDailyRows(rows, limit);
}

/** Pin/unpin a cached read (one surface) — locked rows never regenerate. */
export async function setNarrativeLock(profileId: number, surface: string, cacheDate: string, locked: boolean) {
  const db = await getDb();
  if (!db) return;
  await db
    .update(narrativeCache)
    .set({ locked })
    .where(and(eq(narrativeCache.profileId, profileId), eq(narrativeCache.surface, surface), eq(narrativeCache.cacheDate, cacheDate)));
}

/**
 * Release every pin on a profile's readings, and report how many were released.
 *
 * Called when the chart is recomputed. A pinned read is served REGARDLESS of its input hash — that
 * is what a pin means — so after a birth-data CORRECTION it would keep showing prose computed from
 * a chart that is no longer the native's, and (since v776) the pin covers the year read too.
 * David's ruling, 2026-07-20: "keep accuracy". So a correction releases the pins and the corrected
 * reading generates on next open.
 *
 * Nothing is deleted here: the rows and their prose stay exactly as they are, and are only replaced
 * if and when that date is opened again. This releases the HOLD, it does not erase the words.
 */
export async function unpinAllNarrative(profileId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const pinned = await db
    .select({ id: narrativeCache.id })
    .from(narrativeCache)
    .where(and(eq(narrativeCache.profileId, profileId), eq(narrativeCache.locked, true)));
  if (!pinned.length) return 0;
  await db.update(narrativeCache).set({ locked: false })
    .where(and(eq(narrativeCache.profileId, profileId), eq(narrativeCache.locked, true)));
  return pinned.length;
}

export async function isNarrativeLocked(profileId: number, cacheDate: string): Promise<boolean> {
  // AUDIT M4 (2026-07-18): the pin locks several surfaces but truth was read from ONE — if only
  // the other row existed (its sibling's generation was dry/capped), the UI said "unpinned" while
  // a read sat invisibly frozen. Any locked row = pinned.
  // 2026-07-20: day_read added FIRST — it is the reading on Today. "glance" stays only so pins
  // taken before the surface was retired still read as pinned.
  for (const surface of PINNED_SURFACES) {
    const row = await getNarrativeCache(profileId, surface, cacheDate);
    if ((row as any)?.locked) return true;
  }
  return false;
}

// ── HOROSCOPES (the "pick a date" premium reading — immutable purchased snapshots) ──
// Every helper degrades gracefully: if the horoscopes table doesn't exist yet (pending the
// hand-run prod migration), reads return empty and writes no-op rather than throwing.

/** One purchased horoscope for a profile+date+area, or undefined. */
export async function getHoroscope(profileId: number, readingDate: string, lifeArea = "day") {
  const db = await getDb();
  if (!db) return undefined;
  try {
    const rows = await db
      .select()
      .from(horoscopes)
      .where(and(eq(horoscopes.profileId, profileId), eq(horoscopes.readingDate, readingDate), eq(horoscopes.lifeArea, lifeArea)))
      .limit(1);
    return rows[0];
  } catch (e) {
    console.error("[getHoroscope]", e);
    return undefined;
  }
}

/** Every purchased horoscope for a profile, newest reading-date first (each carries its life area). */
export async function listHoroscopes(profileId: number, limit = 180) {
  const db = await getDb();
  if (!db) return [];
  try {
    return await db
      .select({ readingDate: horoscopes.readingDate, lifeArea: horoscopes.lifeArea, content: horoscopes.content, notes: horoscopes.notes, createdAt: horoscopes.createdAt })
      .from(horoscopes)
      .where(eq(horoscopes.profileId, profileId))
      .orderBy(desc(horoscopes.readingDate))
      .limit(limit);
  } catch (e) {
    console.error("[listHoroscopes]", e);
    return [];
  }
}

/** Freeze a purchased horoscope. No-op if the (profile,date,area) already exists (immutable). */
export async function insertHoroscope(row: { userId: number; profileId: number; readingDate: string; lifeArea: string; promptVersion: string; model: string; content: string }): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  try {
    await db
      .insert(horoscopes)
      .values({ ...row, notes: null })
      // A re-reveal must never overwrite the frozen snapshot — keep the original on conflict.
      .onDuplicateKeyUpdate({ set: { readingDate: row.readingDate } });
    return true;
  } catch (e) {
    console.error("[insertHoroscope]", e);
    return false;
  }
}

/** Update the user's notes under a purchased horoscope (profile+date+area). */
export async function updateHoroscopeNotes(profileId: number, readingDate: string, lifeArea: string, notes: string): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  try {
    await db
      .update(horoscopes)
      .set({ notes })
      .where(and(eq(horoscopes.profileId, profileId), eq(horoscopes.readingDate, readingDate), eq(horoscopes.lifeArea, lifeArea)));
    return true;
  } catch (e) {
    console.error("[updateHoroscopeNotes]", e);
    return false;
  }
}

export async function upsertSystemPrompt(key: string, title: string, content: string) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const existing = await getSystemPromptByKey(key);
  if (existing) {
    await db.update(systemPrompts).set({ title, content }).where(eq(systemPrompts.key, key));
  } else {
    await db.insert(systemPrompts).values({ key, title, content });
  }
}

// ── SUBTASKS ──────────────────────────────────────────────────

export async function getSubtasksByTask(taskId: number, userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(subtasks)
    .where(and(eq(subtasks.taskId, taskId), eq(subtasks.userId, userId)))
    .orderBy(asc(subtasks.createdAt));
}

export async function createSubtask(data: { taskId: number; userId: number; profileId?: number | null; title: string }) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const [result] = await db.insert(subtasks).values(data).$returningId();
  return result;
}

export async function toggleSubtask(id: number, userId: number, isCompleted: boolean) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db
    .update(subtasks)
    .set({ isCompleted })
    .where(and(eq(subtasks.id, id), eq(subtasks.userId, userId)));
}

export async function deleteSubtask(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.delete(subtasks).where(and(eq(subtasks.id, id), eq(subtasks.userId, userId)));
}

export async function getSubtaskCountsByTasks(taskIds: number[], userId: number) {
  if (taskIds.length === 0) return {};
  const db = await getDb();
  if (!db) return {};
  const rows = await db
    .select()
    .from(subtasks)
    .where(and(eq(subtasks.userId, userId)));
  const counts: Record<number, { total: number; completed: number }> = {};
  for (const row of rows) {
    if (!taskIds.includes(row.taskId)) continue;
    if (!counts[row.taskId]) counts[row.taskId] = { total: 0, completed: 0 };
    counts[row.taskId].total++;
    if (row.isCompleted) counts[row.taskId].completed++;
  }
  return counts;
}

// ── PROJECTS ─────────────────────────────────────────────────

export async function getProjectsByUser(userId: number, profileId?: number | null) {
  const db = await getDb();
  if (!db) return [];
  const profileFilter = profileId != null ? eq(projects.profileId, profileId) : isNull(projects.profileId);
  return db
    .select()
    .from(projects)
    .where(and(eq(projects.userId, userId), profileFilter, isNull(projects.archivedAt)))
    .orderBy(asc(projects.createdAt));
}

export async function getAllProjectsByUser(userId: number, profileId?: number | null) {
  const db = await getDb();
  if (!db) return [];
  const profileFilter = profileId != null ? eq(projects.profileId, profileId) : isNull(projects.profileId);
  return db
    .select()
    .from(projects)
    .where(and(eq(projects.userId, userId), profileFilter))
    .orderBy(asc(projects.archivedAt), asc(projects.createdAt));
}

export async function createProject(
  userId: number,
  name: string,
  profileId?: number | null,
  lifeAreas?: string[],
) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const [result] = await db
    .insert(projects)
    .values({ userId, name, profileId: profileId ?? null, lifeAreas: JSON.stringify(lifeAreas ?? []) })
    .$returningId();
  return result;
}

export async function setProjectLifeAreas(
  id: number,
  userId: number,
  lifeAreas: string[],
  profileId?: number | null,
) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const profileFilter = profileId != null ? eq(projects.profileId, profileId) : isNull(projects.profileId);
  await db
    .update(projects)
    .set({ lifeAreas: JSON.stringify(lifeAreas) })
    .where(and(eq(projects.id, id), eq(projects.userId, userId), profileFilter));
}

export async function renameProject(id: number, userId: number, name: string) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db
    .update(projects)
    .set({ name })
    .where(and(eq(projects.id, id), eq(projects.userId, userId)));
}

export async function archiveProject(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db
    .update(projects)
    .set({ archivedAt: new Date() })
    .where(and(eq(projects.id, id), eq(projects.userId, userId)));
}

export async function unarchiveProject(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db
    .update(projects)
    .set({ archivedAt: null })
    .where(and(eq(projects.id, id), eq(projects.userId, userId)));
}

export async function deleteProject(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  // Unassign tasks from this project before deleting
  await db
    .update(tasks)
    .set({ projectId: null })
    .where(and(eq(tasks.projectId, id), eq(tasks.userId, userId)));
  await db
    .delete(projects)
    .where(and(eq(projects.id, id), eq(projects.userId, userId)));
}

// ── CHECK-INS ─────────────────────────────────────────────────

/**
 * Return the most recent check-in for the given user on today's date (UTC).
 * Returns undefined if no check-in has been recorded today.
 */
export async function getTodayCheckIn(userId: number, profileId?: number | null) {
  const db = await getDb();
  if (!db) return undefined;
  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);
  const profileFilter = profileId != null ? eq(checkIns.profileId, profileId) : isNull(checkIns.profileId);
  const rows = await db
    .select()
    .from(checkIns)
    .where(and(eq(checkIns.userId, userId), profileFilter))
    .orderBy(desc(checkIns.recordedAt))
    .limit(50);
  const todayRows = rows.filter((r) => r.recordedAt >= todayStart);
  return todayRows[0];
}

/**
 * Check-in averages by date (YYYY-MM-DD) for a month — the latest check-in per day,
 * averaged across the five measures (1–5). Powers "confirmed golden" days.
 */
export async function getCheckInAveragesForMonth(
  userId: number,
  profileId: number | null | undefined,
  yearMonth: string, // "YYYY-MM"
): Promise<Record<string, number>> {
  const db = await getDb();
  if (!db) return {};
  const [y, m] = yearMonth.split("-").map(Number);
  if (!y || !m) return {};
  const start = new Date(Date.UTC(y, m - 1, 1));
  const end = new Date(Date.UTC(y, m, 1));
  const profileFilter = profileId != null ? eq(checkIns.profileId, profileId) : isNull(checkIns.profileId);
  const rows = await db
    .select()
    .from(checkIns)
    .where(and(eq(checkIns.userId, userId), profileFilter, gte(checkIns.recordedAt, start), lt(checkIns.recordedAt, end)))
    .orderBy(desc(checkIns.recordedAt));
  const byDate: Record<string, number> = {};
  for (const r of rows) {
    const d = r.recordedAt.toISOString().split("T")[0];
    if (byDate[d] == null) {
      byDate[d] = (r.physicalEnergy + r.mentalClarity + r.emotionalStability + r.creativeFlow + r.motivation) / 5;
    }
  }
  return byDate;
}

/**
 * Insert a new check-in row. recordedAt is set to now() by the DB default.
 */
export async function createCheckIn(data: {
  userId: number;
  profileId?: number | null;
  physicalEnergy: number;
  mentalClarity: number;
  emotionalStability: number;
  creativeFlow: number;
  motivation: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const [result] = await db.insert(checkIns).values(data).$returningId();
  return result;
}

// ── NATAL BODIES ──────────────────────────────────────────────

export async function getNatalBodiesByUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(natalBodies)
    .where(eq(natalBodies.userId, userId))
    .orderBy(asc(natalBodies.planet));
}

export async function getNatalBodyByUserAndPlanet(userId: number, planet: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(natalBodies)
    .where(and(eq(natalBodies.userId, userId), eq(natalBodies.planet, planet)))
    .limit(1);
  return result[0];
}

export async function upsertNatalBody(userId: number, planet: string, data: {
  sign: string;
  degree: string;
  house: number;
  nakshatra?: string | null;
  pada?: number | null;
  longitude?: string | null; // full sidereal longitude e.g. "234.511128"
}) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const existing = await getNatalBodyByUserAndPlanet(userId, planet);
  if (existing) {
    await db
      .update(natalBodies)
      .set(data)
      .where(and(eq(natalBodies.userId, userId), eq(natalBodies.planet, planet)));
  } else {
    await db.insert(natalBodies).values({ userId, planet, ...data });
  }
}

// ── PROJECT NOTES ─────────────────────────────────────────────

export async function getProjectNote(projectId: number, userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(projectNotes)
    .where(and(eq(projectNotes.projectId, projectId), eq(projectNotes.userId, userId)))
    .limit(1);
  return result[0];
}

export async function upsertProjectNote(projectId: number, userId: number, content: string) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const existing = await getProjectNote(projectId, userId);
  if (existing) {
    await db
      .update(projectNotes)
      .set({ content, updatedAt: new Date() })
      .where(and(eq(projectNotes.projectId, projectId), eq(projectNotes.userId, userId)));
  } else {
    await db.insert(projectNotes).values({ projectId, userId, content });
  }
}

// ── PROJECT STATS & INSIGHTS ──────────────────────────────────

/**
 * Get comprehensive statistics for a single project.
 * Returns task counts (total, completed, remaining), progress %, and grouped tasks.
 */
export async function getProjectStats(projectId: number, userId: number, profileId?: number | null) {
  const db = await getDb();
  if (!db) return null;

  const profileFilter = profileId != null ? eq(tasks.profileId, profileId) : isNull(tasks.profileId);
  // Verify project ownership
  const project = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.userId, userId)))
    .limit(1);
  if (!project[0]) return null;

  // Get all tasks for this project scoped to the active profile
  const projectTasks = await db
    .select()
    .from(tasks)
    .where(and(eq(tasks.projectId, projectId), eq(tasks.userId, userId), profileFilter))
    .orderBy(desc(tasks.isPinned), asc(tasks.isCompleted), desc(tasks.createdAt));

  const total = projectTasks.length;
  const completed = projectTasks.filter((t) => t.isCompleted).length;
  const remaining = total - completed;
  const progressPercent = total > 0 ? Math.round((completed / total) * 100) : 0;

  // Group tasks by status
  const active = projectTasks.filter((t) => !t.isCompleted);
  const completedTasks = projectTasks.filter((t) => t.isCompleted);
  const archived: typeof projectTasks = []; // Tasks don't have archivedAt field; this is a placeholder

  return {
    projectId,
    projectName: project[0].name,
    total,
    completed,
    remaining,
    progressPercent,
    active,
    completedTasks,
    archived,
  };
}

/**
 * Get insights for a project: common modes, upcoming due dates, high priority tasks, wealth flow.
 */
export async function getProjectInsights(projectId: number, userId: number, profileId?: number | null) {
  const db = await getDb();
  if (!db) return null;

  const profileFilter = profileId != null ? eq(tasks.profileId, profileId) : isNull(tasks.profileId);
  // Verify project ownership
  const project = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.userId, userId)))
    .limit(1);
  if (!project[0]) return null;

  // Get all active tasks for this project scoped to the active profile
  const projectTasks = await db
    .select()
    .from(tasks)
    .where(and(eq(tasks.projectId, projectId), eq(tasks.userId, userId), profileFilter, eq(tasks.isCompleted, false)))
    .orderBy(desc(tasks.isPinned), desc(tasks.createdAt));

  // Calculate mode distribution
  const modeCount: Record<string, number> = {};
  for (const task of projectTasks) {
    modeCount[task.mode] = (modeCount[task.mode] ?? 0) + 1;
  }
  const commonMode = Object.entries(modeCount).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  // Find upcoming due dates
  const today = new Date().toISOString().split("T")[0];
  const upcomingDue = projectTasks
    .filter((t) => t.dueDate && t.dueDate >= today)
    .sort((a, b) => (a.dueDate ?? "").localeCompare(b.dueDate ?? ""))
    .slice(0, 5);

  // Find high priority tasks
  const highPriority = projectTasks.filter((t) => t.priority === "High").slice(0, 5);

  // Find wealth flow tasks
  const wealthFlow = projectTasks.filter((t) => t.wealthFlow === true).slice(0, 5);

  return {
    projectId,
    commonMode,
    upcomingDue,
    highPriority,
    wealthFlow,
  };
}

/**
 * Get the recommended next task for a project based on scoring engine.
 * Considers current state, mode alignment, and priority.
 */
export async function getRecommendedNextTask(projectId: number, userId: number, profileId?: number | null) {
  const db = await getDb();
  if (!db) return null;

  const profileFilter = profileId != null ? eq(tasks.profileId, profileId) : isNull(tasks.profileId);
  // Verify project ownership
  const project = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.userId, userId)))
    .limit(1);
  if (!project[0]) return null;

  // Get all active tasks for this project scoped to the active profile
  const projectTasks = await db
    .select()
    .from(tasks)
    .where(and(eq(tasks.projectId, projectId), eq(tasks.userId, userId), profileFilter, eq(tasks.isCompleted, false)))
    .orderBy(desc(tasks.isPinned), desc(tasks.createdAt));

  if (projectTasks.length === 0) return null;

  // Return first unpinned task, or first task if all pinned
  return projectTasks.find((t) => !t.isPinned) ?? projectTasks[0] ?? null;
}

// ── REFERRALS (tester codes: 1 free month per referral / 10% off first month) ──

/** The fraud gate: one redemption per PERSON, where a person = their birth-data
 *  fingerprint. Email/name are stored for audit but deliberately NOT hashed —
 *  they're trivial to vary; a birth chart isn't. */
export function referralIdentityKey(birthDate: string, birthTime?: string | null, birthLocation?: string | null): string {
  const norm = (x?: string | null) => (x ?? "").trim().toLowerCase().replace(/\s+/g, " ");
  return crypto.createHash("sha256").update([norm(birthDate), norm(birthTime), norm(birthLocation)].join("|")).digest("hex");
}

export async function getReferralCode(code: string) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(referralCodes).where(eq(referralCodes.code, code.trim().toUpperCase())).limit(1);
  return rows[0] ?? null;
}

export type RedeemResult = "redeemed" | "invalid_code" | "already_redeemed_person" | "already_redeemed_email";

/** Record a redemption. Uniqueness is enforced by the DB (identityKey + email unique)
 *  so racing submissions can't double-redeem. */
export async function redeemReferralCode(opts: {
  code: string; email: string; name: string;
  birthDate: string; birthTime?: string | null; birthLocation?: string | null;
  userId?: number | null;
}): Promise<{ result: RedeemResult; discountPct?: number; ownerName?: string }> {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const codeRow = await getReferralCode(opts.code);
  if (!codeRow || !codeRow.active) return { result: "invalid_code" };
  const identityKey = referralIdentityKey(opts.birthDate, opts.birthTime, opts.birthLocation);
  try {
    await db.insert(referralRedemptions).values({
      codeId: codeRow.id,
      email: opts.email.trim().toLowerCase(),
      name: opts.name.trim(),
      birthDate: opts.birthDate.trim(),
      birthTime: opts.birthTime?.trim() ?? null,
      birthLocation: opts.birthLocation?.trim() ?? null,
      identityKey,
      userId: opts.userId ?? null,
    });
    return { result: "redeemed", discountPct: codeRow.newUserDiscountPct, ownerName: codeRow.ownerName };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("identityKey")) return { result: "already_redeemed_person" };
    if (msg.includes("Duplicate entry") || msg.includes("ER_DUP_ENTRY")) return { result: "already_redeemed_email" };
    throw err;
  }
}

/** Admin view: every code with its redemptions (pending + qualified counts). */
export async function listReferralActivity() {
  const db = await getDb();
  if (!db) return [];
  const codes = await db.select().from(referralCodes);
  const reds = await db.select().from(referralRedemptions);
  return codes.map((c) => ({
    ...c,
    redemptions: reds.filter((r) => r.codeId === c.id),
    qualifiedCount: reds.filter((r) => r.codeId === c.id && r.status !== "pending").length,
  }));
}

// ── WAITLIST (velealor.com landing) ──────────────────────────

/** Store a landing-page signup. Duplicate emails resolve as success (idempotent). */
export async function addWaitlistSignup(email: string, source: string, referralCode?: string): Promise<"added" | "exists"> {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  try {
    await db.insert(waitlist).values({ email, source, referralCode: referralCode ?? null });
    return "added";
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("Duplicate entry") || msg.includes("ER_DUP_ENTRY")) return "exists";
    throw err;
  }
}
