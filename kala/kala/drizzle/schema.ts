import {
  bigint,
  boolean,
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
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
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
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
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

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
  isPinned: boolean("isPinned").notNull().default(false),
  isCompleted: boolean("isCompleted").notNull().default(false),
  completedAt: timestamp("completedAt"),
  dueDate: varchar("dueDate", { length: 10 }), // YYYY-MM-DD, optional
  wealthFlow: boolean("wealthFlow").notNull().default(false), // Does this task directly improve revenue/cash flow?
  projectId: int("projectId"), // FK → projects.id (optional)
  // Current State metadata — lightweight optional tags for task selection scoring.
  // All default to Neutral/No so existing tasks continue working without change.
  cognitiveLoad: mysqlEnum("cognitiveLoad", ["Low", "Medium", "High"]).default("Medium"),
  physicalLoad: mysqlEnum("physicalLoad", ["Low", "Medium", "High"]).default("Low"),
  creativeRequired: boolean("creativeRequired").default(false),
  socialRequired: boolean("socialRequired").default(false),
  emotionalLoad: mysqlEnum("emotionalLoad", ["Low", "Medium", "High"]).default("Low"),
  snoozedUntil: bigint("snoozedUntil", { mode: "number" }), // Unix ms timestamp — task hidden until this time
  notes: text("notes"), // Optional free-text notes, context, or links
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
  birthTime: varchar("birthTime", { length: 8 }), // HH:mm
  birthLocationCity: varchar("birthLocationCity", { length: 128 }),
  birthLocationLat: varchar("birthLocationLat", { length: 24 }),
  birthLocationLon: varchar("birthLocationLon", { length: 24 }),
  birthTimezone: varchar("birthTimezone", { length: 64 }),
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
  archivedAt: timestamp("archivedAt"),
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
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ProfileNatalBody = typeof profileNatalBodies.$inferSelect;
export type InsertProfileNatalBody = typeof profileNatalBodies.$inferInsert;
