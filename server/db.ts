import crypto from "node:crypto";
import { and, asc, desc, eq, isNull, or } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, checkIns, panchang, projects, projectNotes, reflections, sessions, subtasks, systemPrompts, tasks, users, natalBodies, narrativeCache, type User } from "../drizzle/schema";
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

export async function createUserWithPassword(data: { email: string; name?: string; passwordHash: string; role?: "user" | "admin" }) {
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

/** Resolve a session token to its user, deleting it if expired. */
export async function getUserBySessionToken(token: string): Promise<User | null> {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(sessions).where(eq(sessions.token, token)).limit(1);
  const session = rows[0];
  if (!session) return null;
  if (session.expiresAt.getTime() < Date.now()) {
    await db.delete(sessions).where(eq(sessions.token, token));
    return null;
  }
  return (await getUserById(session.userId)) ?? null;
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
}) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const [result] = await db.insert(tasks).values(data).$returningId();
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
    title: string;
    mode: "Restraint" | "Build" | "Selective" | "Action";
    priority: "High" | "Medium" | "Low";
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
    .set(data)
    .where(and(eq(tasks.id, id), eq(tasks.userId, userId)));
}

export async function deleteTask(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  // Cascade delete subtasks first
  await db.delete(subtasks).where(and(eq(subtasks.taskId, id), eq(subtasks.userId, userId)));
  await db.delete(tasks).where(and(eq(tasks.id, id), eq(tasks.userId, userId)));
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
export async function getNarrativeCache(profileId: number, surface: string, cacheDate: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(narrativeCache)
    .where(and(eq(narrativeCache.profileId, profileId), eq(narrativeCache.surface, surface), eq(narrativeCache.cacheDate, cacheDate)))
    .limit(1);
  return result[0];
}

export async function upsertNarrativeCache(profileId: number, surface: string, cacheDate: string, inputHash: string, model: string, content: string) {
  const db = await getDb();
  if (!db) return;
  await db
    .insert(narrativeCache)
    .values({ profileId, surface, cacheDate, inputHash, model, content, generatedAt: new Date() })
    .onDuplicateKeyUpdate({ set: { inputHash, model, content, generatedAt: new Date() } });
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
