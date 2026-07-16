import {
  bigint,
  boolean,
  datetime,
  index,
  int,
  mediumtext,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  tinyint,
  unique,
  varchar,
} from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }).unique(),
  passwordHash: varchar("passwordHash", { length: 255 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin", "tester"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn"),
  // Location settings for panchang calculation
  locationCity: varchar("locationCity", { length: 128 }),
  locationLat: varchar("locationLat", { length: 24 }),
  locationLon: varchar("locationLon", { length: 24 }),
  locationTimezone: varchar("locationTimezone", { length: 64 }),
  // Birth date — required for profection year calculations
  birthDate: varchar("birthDate", { length: 10 }), // YYYY-MM-DD
  birthTime: varchar("birthTime", { length: 8 }), // HH:mm format
  birthLocationCity: varchar("birthLocationCity", { length: 128 }),
  birthLocationLat: varchar("birthLocationLat", { length: 24 }),
  birthLocationLon: varchar("birthLocationLon", { length: 24 }),
  birthTimezone: varchar("birthTimezone", { length: 64 }), // IANA timezone e.g. "Asia/Manila"
  // Birth chart — Vedic natal chart placements
  // lagnaSign: the ascendant sign (e.g. "Virgo")
  // Each planet stores its house number (1-12) from the lagna
  lagnaSign: varchar("lagnaSign", { length: 32 }),
  sunHouse: int("sunHouse"),
  moonHouse: int("moonHouse"),
  marsHouse: int("marsHouse"),
  mercuryHouse: int("mercuryHouse"),
  jupiterHouse: int("jupiterHouse"),
  venusHouse: int("venusHouse"),
  saturnHouse: int("saturnHouse"),
  rahuHouse: int("rahuHouse"),
  ketuHouse: int("ketuHouse"),
  ascendantDegree: varchar("ascendantDegree", { length: 16 }), // optional precise degree
  // Sidereal Midheaven longitude (0–360°). The Western meridian axis Vedic drops;
  // IC = (mc + 180). Feeds the Meridian / Long-Arc layer.
  mcLongitude: varchar("mcLongitude", { length: 24 }),
  // Guided-tour state (JSON): { seen: string[], enabled: boolean }. Server-side so it
  // survives across devices and iOS PWA localStorage clears (the reason it re-fired).
  tourState: text("tourState"),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Server-side sessions. The cookie holds an unguessable random token that maps
 * to a userId here — never the raw user id — so sessions can't be forged and
 * can be revoked (logout / logout-all).
 */
export const sessions = mysqlTable("sessions", {
  token: varchar("token", { length: 64 }).primaryKey(),
  userId: int("userId").notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Session = typeof sessions.$inferSelect;
export type InsertSession = typeof sessions.$inferInsert;

/**
 * Tasks — the core reminders-style task list.
 * Mode values match the exact labels used throughout the app.
 */
export const tasks = mysqlTable("tasks", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  profileId: int("profileId"), // null = owner's own tasks; set when created under a profile
  title: varchar("title", { length: 512 }).notNull(),
  mode: mysqlEnum("mode", ["Restraint", "Build", "Selective", "Action"]).notNull().default("Build"),
  priority: mysqlEnum("priority", ["High", "Medium", "Low"]).notNull().default("Medium"),
  intent: mysqlEnum("intent", ["want", "need"]).notNull().default("need"), // want vs need — a ranking filter layer
  isPinned: boolean("isPinned").notNull().default(false),
  isCompleted: boolean("isCompleted").notNull().default(false),
  completedAt: timestamp("completedAt"),
  dueDate: varchar("dueDate", { length: 10 }), // YYYY-MM-DD, optional
  wealthFlow: boolean("wealthFlow").notNull().default(false), // Does this task directly improve revenue/cash flow?
  isNewVenture: boolean("isNewVenture"), // David's law: Action owns the NEW. true = initiating something new to the story; false = already in motion; null = undeclared (title heuristics apply)
  projectId: int("projectId"), // FK → projects.id (optional)
  // Current State metadata — lightweight optional tags for task selection scoring.
  // All default to Neutral/No so existing tasks continue working without change.
  cognitiveLoad: mysqlEnum("cognitiveLoad", ["Low", "Medium", "High"]).default("Medium"),
  physicalLoad: mysqlEnum("physicalLoad", ["Low", "Medium", "High"]).default("Low"),
  creativeRequired: boolean("creativeRequired").default(false),
  socialRequired: boolean("socialRequired").default(false),
  emotionalLoad: mysqlEnum("emotionalLoad", ["Low", "Medium", "High"]).default("Low"),
  snoozedUntil: bigint("snoozedUntil", { mode: "number" }), // Unix ms timestamp — task hidden until this time
  // Task progress (David 2026-07-15). completionPct = user-set % for tasks WITHOUT
  // subtasks (with subtasks the % is DERIVED and this is ignored). effortSize = how much
  // of a day the task asks for; feeds the scorer (quick fits a low tank, long needs room).
  completionPct: int("completionPct"),
  effortSize: mysqlEnum("effortSize", ["quick", "sitting", "long"]),
  // WHO the task touches (David's nine circles, 2026-07-16) — maps to life-theme rooms
  // so open windows lift matching tasks. Column added by hand (add-task-circle-column.ts).
  circle: mysqlEnum("circle", ["life_partner", "family", "best_friends", "inner_circle", "friends", "coworkers", "clients", "self", "everyone_else"]),
  notes: text("notes"), // Optional free-text notes, context, or links
  // Recurrence — when set, completing the task rolls its due date forward to the
  // next occurrence and keeps it active instead of marking it done.
  recurrence: mysqlEnum("recurrence", ["none", "daily", "weekly", "biweekly", "monthly", "yearly"]).notNull().default("none"),
  // Life-area tags (JSON array of LIFE_AREA keys, e.g. ["self_care","money"]). Maps
  // to houses via shared/life-areas.ts so the day's domain ("song") can surface a
  // task and the year's domain ("party") can highlight it. Nullable/additive.
  lifeAreas: text("lifeAreas"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Task = typeof tasks.$inferSelect;
export type InsertTask = typeof tasks.$inferInsert;

/**
 * Panchang — daily Vedic almanac data auto-calculated by the Swiss Ephemeris engine.
 * Mode values match The Read's DayMode type.
 */
export const panchang = mysqlTable("panchang", {
  id: int("id").autoincrement().primaryKey(),
  date: varchar("date", { length: 10 }).notNull().unique(), // YYYY-MM-DD
  display: varchar("display", { length: 32 }).notNull(),
  sunrise: varchar("sunrise", { length: 16 }).notNull(),
  moonSign: varchar("moonSign", { length: 64 }).notNull(),
  moonLongitude: varchar("moonLongitude", { length: 32 }).notNull().default("0"),
  houseActivated: int("houseActivated").notNull().default(1),
  nakshatra: varchar("nakshatra", { length: 64 }).notNull(),
  nakshatraPada: int("nakshatraPada").notNull().default(1),
  tithi: varchar("tithi", { length: 64 }).notNull(),
  tithiPaksha: varchar("tithiPaksha", { length: 16 }).notNull().default("Shukla"),
  mode: varchar("mode", { length: 32 }).notNull().default("Build"),
  instruction: text("instruction").notNull(),
  calculatedAt: timestamp("calculatedAt").defaultNow(),
});

export type Panchang = typeof panchang.$inferSelect;
export type InsertPanchang = typeof panchang.$inferInsert;

/**
 * Reflections — per-day journal entries ("What happened on X date?")
 */
export const reflections = mysqlTable("reflections", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  profileId: int("profileId"), // null = owner's own reflections
  date: varchar("date", { length: 10 }).notNull(), // YYYY-MM-DD
  content: text("content").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Reflection = typeof reflections.$inferSelect;
export type InsertReflection = typeof reflections.$inferInsert;

/**
 * SystemPrompts — editable content blocks for AI/logic context.
 * key is a unique slug (e.g. "mode_logic"), content is the full text.
 */
export const systemPrompts = mysqlTable("system_prompts", {
  id: int("id").autoincrement().primaryKey(),
  key: varchar("key", { length: 64 }).notNull().unique(),
  title: varchar("title", { length: 128 }).notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type SystemPrompt = typeof systemPrompts.$inferSelect;
export type InsertSystemPrompt = typeof systemPrompts.$inferInsert;

/**
 * Subtasks — checklist items nested under a parent task.
 */
export const subtasks = mysqlTable("subtasks", {
  id: int("id").autoincrement().primaryKey(),
  taskId: int("taskId").notNull(), // FK → tasks.id
  userId: int("userId").notNull(),
  profileId: int("profileId"), // null = owner's own subtasks
  title: varchar("title", { length: 512 }).notNull(),
  isCompleted: boolean("isCompleted").notNull().default(false),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Subtask = typeof subtasks.$inferSelect;
export type InsertSubtask = typeof subtasks.$inferInsert;

/**
 * Natal Bodies — complete natal chart planet data for each user.
 * Stores sign, degree, house, nakshatra, and pada for all 9 planets.
 * One record per planet per user.
 */
export const natalBodies = mysqlTable("natal_bodies", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  planet: varchar("planet", { length: 32 }).notNull(), // "Sun", "Moon", "Mercury", etc.
  sign: varchar("sign", { length: 32 }).notNull(), // e.g. "Virgo"
  degree: varchar("degree", { length: 16 }).notNull(), // e.g. "15.5"
  house: int("house").notNull(), // 1-12 from Lagna
  nakshatra: varchar("nakshatra", { length: 64 }), // e.g. "Shatabhisha"
  pada: int("pada"), // 1-4
  longitude: varchar("longitude", { length: 20 }), // full sidereal longitude e.g. "234.511128"
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type NatalBody = typeof natalBodies.$inferSelect;
export type InsertNatalBody = typeof natalBodies.$inferInsert;

/**
 * Profection Years — annual context layer for the planner.
 * Stores the activated house, sign, Time Lord, and year range for each profection year.
 */
export const profectionYears = mysqlTable("profection_years", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  profileId: int("profileId"), // null = owner's own profection years
  age: int("age").notNull(), // Age at start of profection year
  activatedHouse: int("activatedHouse").notNull(), // 1-12
  activatedSign: varchar("activatedSign", { length: 32 }).notNull(), // e.g. "Cancer"
  timeLord: varchar("timeLord", { length: 32 }).notNull(), // e.g. "Moon"
  yearStart: varchar("yearStart", { length: 10 }).notNull(), // YYYY-MM-DD (birthday)
  yearEnd: varchar("yearEnd", { length: 10 }).notNull(), // YYYY-MM-DD (next birthday - 1 day)
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ProfectionYear = typeof profectionYears.$inferSelect;
export type InsertProfectionYear = typeof profectionYears.$inferInsert;

/**
 * Time Lord Transits — monthly/periodic movement of the Time Lord through signs and houses.
 * Tracks the Time Lord's journey during the profection year.
 */
export const timeLordTransits = mysqlTable("time_lord_transits", {
  id: int("id").autoincrement().primaryKey(),
  profectionYearId: int("profectionYearId").notNull(),
  userId: int("userId").notNull(),
  profileId: int("profileId"), // null = owner's own transits
  timeLord: varchar("timeLord", { length: 32 }).notNull(),
  startDate: varchar("startDate", { length: 10 }).notNull(),
  endDate: varchar("endDate", { length: 10 }).notNull(),
  sign: varchar("sign", { length: 32 }).notNull(),
  house: int("house").notNull(),
  nakshatra: varchar("nakshatra", { length: 64 }),
  isRetrograde: boolean("isRetrograde").notNull().default(false),
  condition: text("condition").notNull(),
  operationalMeaning: text("operationalMeaning").notNull(),
  recommendedUse: text("recommendedUse").notNull(),
  // Secondary transit conditions
  coPresentPlanets: text("coPresentPlanets"), // JSON array of planet names in same sign
  rahuKetuPresence: varchar("rahuKetuPresence", { length: 32 }), // "Rahu", "Ketu", "Both", or null
  combustionStatus: boolean("combustionStatus").notNull().default(false),
  closeConjunctions: text("closeConjunctions"), // JSON array of planets within 4 orb
  solitaryStatus: boolean("solitaryStatus").notNull().default(false),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type TimeLordTransit = typeof timeLordTransits.$inferSelect;
export type InsertTimeLordTransit = typeof timeLordTransits.$inferInsert;

/**
 * Projects — grouping layer for tasks.
 * A project contains many tasks. Tasks may optionally belong to one project.
 */
export const projects = mysqlTable("projects", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  profileId: int("profileId"), // null = owner's own projects
  name: varchar("name", { length: 256 }).notNull(),
  // Life-area tags (JSON array of LIFE_AREA keys, e.g. ["self_care","money"]). Maps to
  // houses via shared/life-areas.ts so the day's astrological domain can surface this
  // project's tasks in "Why now?". Nullable/additive.
  lifeAreas: text("lifeAreas"),
  archivedAt: timestamp("archivedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Project = typeof projects.$inferSelect;
export type InsertProject = typeof projects.$inferInsert;

/**
 * Project Notes — optional project-level notes and metadata.
 * Stores project goals, ideas, reference notes, and project direction.
 */
export const projectNotes = mysqlTable("project_notes", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(),
  userId: int("userId").notNull(),
  profileId: int("profileId"), // null = owner's own notes
  content: text("content"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ProjectNote = typeof projectNotes.$inferSelect;
export type InsertProjectNote = typeof projectNotes.$inferInsert;

/**
 * CheckIns — user's current state assessment across 5 dimensions.
 * Each row is a single check-in snapshot recorded at a specific moment.
 * Version 1: observational only — does not affect task ranking or mode.
 */
export const checkIns = mysqlTable("check_ins", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  profileId: int("profileId"), // null = owner's own check-ins
  physicalEnergy: int("physicalEnergy").notNull(), // 1-5
  mentalClarity: int("mentalClarity").notNull(), // 1-5
  emotionalStability: int("emotionalStability").notNull(), // 1-5
  creativeFlow: int("creativeFlow").notNull(), // 1-5
  motivation: int("motivation").notNull(), // 1-5
  recordedAt: timestamp("recordedAt").defaultNow().notNull(), // exact moment of submission
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type CheckIn = typeof checkIns.$inferSelect;
export type InsertCheckIn = typeof checkIns.$inferInsert;

/**
 * Profiles — named astrological subjects (e.g. "David", "Mom", "Client A").
 * Each user can have multiple profiles. One profile per user is marked active.
 * All astrology calculations use the active profile's birth data.
 */
export const profiles = mysqlTable("profiles", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 128 }).notNull(), // e.g. "David", "Mom"
  birthDate: varchar("birthDate", { length: 10 }), // YYYY-MM-DD
  birthTime: varchar("birthTime", { length: 8 }), // HH:mm — null when the exact time is unknown
  // Approximate time-of-day bucket when the exact birthTime is unknown ("morning"|"afternoon"|
  // "evening"|"night"). Only picks a representative time so the Moon's SIGN resolves; a no-time
  // profile is always read as Chandra lagna, never reframed to an ascendant chart.
  birthTimeOfDay: varchar("birthTimeOfDay", { length: 16 }),
  // How house 1 is framed: "ascendant" (exact birth time) or "chandra" (Moon's sign = 1st house).
  lagnaBasis: varchar("lagnaBasis", { length: 16 }).default("ascendant"),
  birthLocationCity: varchar("birthLocationCity", { length: 128 }),
  birthLocationLat: varchar("birthLocationLat", { length: 24 }),
  birthLocationLon: varchar("birthLocationLon", { length: 24 }),
  birthTimezone: varchar("birthTimezone", { length: 64 }),
  // Last time the BIRTH DATA actually changed (not any edit) — drives the 24h edit
  // cooldown that stops profile "hijacking" (swapping to a friend's data and back).
  birthDataUpdatedAt: timestamp("birthDataUpdatedAt"),
  notes: text("notes"),
  isOwner: boolean("isOwner").notNull().default(false), // true = this is the owner's own chart ("My Chart")
  isActive: boolean("isActive").notNull().default(false),
  // Calculated natal chart fields (mirrors users table)
  lagnaSign: varchar("lagnaSign", { length: 32 }),
  sunHouse: int("sunHouse"),
  moonHouse: int("moonHouse"),
  marsHouse: int("marsHouse"),
  mercuryHouse: int("mercuryHouse"),
  jupiterHouse: int("jupiterHouse"),
  venusHouse: int("venusHouse"),
  saturnHouse: int("saturnHouse"),
  rahuHouse: int("rahuHouse"),
  ketuHouse: int("ketuHouse"),
  ascendantDegree: varchar("ascendantDegree", { length: 16 }),
  mcLongitude: varchar("mcLongitude", { length: 24 }), // sidereal Midheaven (Meridian layer)
  archivedAt: timestamp("archivedAt"),
  linkedUserId: int("linkedUserId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Profile = typeof profiles.$inferSelect;
export type InsertProfile = typeof profiles.$inferInsert;

/**
 * Profile Natal Bodies — natal chart planet data keyed to a profile (not userId).
 * Mirrors natalBodies but belongs to a profile instead of a user.
 */
export const profileNatalBodies = mysqlTable("profile_natal_bodies", {
  id: int("id").autoincrement().primaryKey(),
  profileId: int("profileId").notNull(),
  planet: varchar("planet", { length: 32 }).notNull(),
  sign: varchar("sign", { length: 32 }).notNull(),
  degree: varchar("degree", { length: 16 }).notNull(),
  house: int("house").notNull(),
  nakshatra: varchar("nakshatra", { length: 64 }),
  pada: int("pada"),
  longitude: varchar("longitude", { length: 20 }),
  isRetrograde: boolean("isRetrograde").default(false),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ProfileNatalBody = typeof profileNatalBodies.$inferSelect;
export type InsertProfileNatalBody = typeof profileNatalBodies.$inferInsert;

/**
 * Cache for LLM-generated narrative surfaces (Glance + Deep Read).
 * Keyed per (profile, surface, date); inputHash refreshes on recompute changes.
 * Created via direct SQL (CREATE TABLE narrative_cache) — not drizzle-kit push.
 */
export const narrativeCache = mysqlTable("narrative_cache", {
  id: int("id").autoincrement().primaryKey(),
  profileId: int("profileId").notNull(),
  surface: varchar("surface", { length: 16 }).notNull(), // 'glance' | 'deep'
  cacheDate: varchar("cacheDate", { length: 10 }).notNull(), // YYYY-MM-DD the content is for
  inputHash: varchar("inputHash", { length: 64 }).notNull(),
  model: varchar("model", { length: 48 }).notNull(),
  content: text("content").notNull(), // glance: plain string; deep: JSON
  generatedAt: timestamp("generatedAt").defaultNow().notNull(),
  locked: boolean("locked").notNull().default(false), // pinned — return as-is regardless of prompt/input hash
}, (t) => ({
  // One cached read per profile+surface+date, so upsert dedupes (no duplicate rows).
  uniqRead: unique("uniq_read").on(t.profileId, t.surface, t.cacheDate),
}));

export type NarrativeCacheRow = typeof narrativeCache.$inferSelect;

/**
 * HOROSCOPES — the "pick a date" premium reading. Distinct from narrative_cache: this is an
 * IMMUTABLE, purchased snapshot. When a user reveals a date, we generate the date-specific deep
 * read (the "stage + guests" full input) and freeze its JSON here so it never drifts when the
 * prompt version or chart input changes. `notes` is the user's own reflection under the reading.
 * Keyed per (profile, readingDate) so re-revealing a date returns the same purchased read.
 * Created via direct SQL (CREATE TABLE horoscopes) in prod — not drizzle-kit push.
 */
export const horoscopes = mysqlTable("horoscopes", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  profileId: int("profileId").notNull(),
  readingDate: varchar("readingDate", { length: 10 }).notNull(), // YYYY-MM-DD the reading is for
  // The life area this reading is FOR (money/career/love/…; life-areas.ts keys). 'day' = a legacy
  // whole-day snapshot from before the life-area feature. Part of the unique key so each
  // (profile, date, area) is its own immutable purchase — eclipse×Career and eclipse×Money coexist.
  lifeArea: varchar("lifeArea", { length: 16 }).notNull().default("day"),
  promptVersion: varchar("promptVersion", { length: 64 }).notNull(), // frozen at purchase time
  model: varchar("model", { length: 48 }).notNull(),
  content: text("content").notNull(), // the DeepRead JSON snapshot — immutable once written
  notes: text("notes"), // user's own notes under the reading (nullable)
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (t) => ({
  // One purchased horoscope per profile+date+area, so a re-reveal returns the same snapshot.
  uniqHoroscope: unique("uniq_horoscope").on(t.profileId, t.readingDate, t.lifeArea),
}));

export type Horoscope = typeof horoscopes.$inferSelect;
export type InsertHoroscope = typeof horoscopes.$inferInsert;

// ── WAITLIST (velealor.com landing) ──────────────────────────
// Public email capture from the marketing page. No FK to users — signups
// predate accounts. Unique email so repeat submits dedupe server-side.
export const waitlist = mysqlTable("waitlist", {
  id: int("id").autoincrement().primaryKey(),
  email: varchar("email", { length: 320 }).unique().notNull(),
  source: varchar("source", { length: 64 }).default("landing").notNull(),
  referralCode: varchar("referralCode", { length: 64 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type WaitlistRow = typeof waitlist.$inferSelect;

// REFERRAL PROGRAM (2026-07-10, David's spec): per-tester codes. Referrer earns ONE
// FREE MONTH per successful referral (account credit); the new user gets 10% off the
// first month. One redemption per PERSON — identity is the birth-data fingerprint
// (identityKey), not the email: emails are free to change, birth data isn't.
export const referralCodes = mysqlTable("referralCodes", {
  id: int("id").autoincrement().primaryKey(),
  code: varchar("code", { length: 32 }).unique().notNull(),
  ownerName: varchar("ownerName", { length: 64 }).notNull(),
  ownerUserId: int("ownerUserId"),
  newUserDiscountPct: int("newUserDiscountPct").default(10).notNull(),
  referrerRewardMonths: int("referrerRewardMonths").default(1).notNull(),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const referralRedemptions = mysqlTable("referralRedemptions", {
  id: int("id").autoincrement().primaryKey(),
  codeId: int("codeId").notNull(),
  email: varchar("email", { length: 320 }).unique().notNull(),
  name: varchar("name", { length: 128 }).notNull(),
  birthDate: varchar("birthDate", { length: 16 }),
  birthTime: varchar("birthTime", { length: 16 }),
  birthLocation: varchar("birthLocation", { length: 255 }),
  identityKey: varchar("identityKey", { length: 64 }).unique().notNull(), // sha256 of the birth-data fingerprint
  userId: int("userId"),
  // pending (recorded) → qualified (first month paid → referrer credit due) → credited
  status: varchar("status", { length: 16 }).default("pending").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  qualifiedAt: timestamp("qualifiedAt"),
});

export type ReferralCodeRow = typeof referralCodes.$inferSelect;
export type ReferralRedemptionRow = typeof referralRedemptions.$inferSelect;

/**
 * Profile Research — the full 12-house canon research object (Appendix IV Steps 1–14),
 * computed once at profile creation / birth-data change and stored (David's directive #1,
 * 2026-07-14). One row per profile; `research` is the NatalResearch JSON from
 * server/vedic/house-research.ts. inputHash = sha256 of the birth inputs + engine version,
 * so an unchanged recompute is a no-op and a birth-data edit always replaces.
 * Created via manual migration (server/scripts/create-research-tables.ts) — never
 * drizzle-kit push.
 */
export const profileResearch = mysqlTable("profile_research", {
  id: int("id").autoincrement().primaryKey(),
  profileId: int("profileId").notNull().unique(),
  engineVersion: varchar("engineVersion", { length: 32 }).notNull(),
  inputHash: varchar("inputHash", { length: 64 }).notNull(),
  research: mediumtext("research").notNull(), // NatalResearch JSON (~40-80KB)
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ProfileResearchRow = typeof profileResearch.$inferSelect;

/**
 * Profile Dasha Periods — the ENTIRE Vimshottari system birth→120y, every level
 * (David's directive #2, 2026-07-14): maha(1)/antar(2)/pratyantar(3)/sookshma(4)/prana(5).
 * DATETIME(3) so the deep levels (a prana averages ~18h) keep the exact birth-instant
 * precision. Honesty gate: no-time (Chandra) profiles store levels 1–3 only — a noon
 * placeholder cannot support hour-grain periods. Timed profiles store all five
 * (~66-75k rows: the base cycle plus the second-cycle continuation to age 120). Query shape: WHERE profileId=? AND level=? AND startAt<=? AND endAt>?.
 * Created via manual migration (server/scripts/create-research-tables.ts).
 */
export const profileDashaPeriods = mysqlTable("profile_dasha_periods", {
  id: int("id").autoincrement().primaryKey(),
  profileId: int("profileId").notNull(),
  level: tinyint("level").notNull(), // 1=maha … 5=prana
  maha: varchar("maha", { length: 8 }).notNull(),
  antar: varchar("antar", { length: 8 }),
  pratyantar: varchar("pratyantar", { length: 8 }),
  sookshma: varchar("sookshma", { length: 8 }),
  prana: varchar("prana", { length: 8 }),
  startAt: datetime("startAt", { fsp: 3 }).notNull(),
  endAt: datetime("endAt", { fsp: 3 }).notNull(),
}, (t) => [
  index("idx_dasha_lookup").on(t.profileId, t.level, t.startAt),
]);

export type ProfileDashaPeriodRow = typeof profileDashaPeriods.$inferSelect;

/**
 * Profile Convergence — Appendix IV Step 15 precomputed for the whole life (David's
 * directive #3, 2026-07-15). One row per pratyantar span birth→120y (~700-800 rows);
 * `themes` = compact JSON of only the themes with ≥1 actively-tied period-lord
 * ({ marriage: { convergence, mahaTied, lit, lords } … }). `lit` is the STANDING rule
 * (mahaTied ∧ conv≥2) — the dated event-tier arm needs the live sky and stays runtime
 * (see server/vedic/convergence.ts). Tie law lives in knots.ts buildKnots — one law.
 * Created via manual migration (server/scripts/create-research-tables.ts).
 */
export const profileConvergence = mysqlTable("profile_convergence", {
  id: int("id").autoincrement().primaryKey(),
  profileId: int("profileId").notNull(),
  maha: varchar("maha", { length: 8 }).notNull(),
  antar: varchar("antar", { length: 8 }).notNull(),
  pratyantar: varchar("pratyantar", { length: 8 }).notNull(),
  startAt: datetime("startAt", { fsp: 3 }).notNull(),
  endAt: datetime("endAt", { fsp: 3 }).notNull(),
  themes: text("themes").notNull(), // JSON, only tied themes; "{}" for quiet spans
}, (t) => [
  index("idx_convergence_lookup").on(t.profileId, t.startAt),
]);

export type ProfileConvergenceRow = typeof profileConvergence.$inferSelect;
