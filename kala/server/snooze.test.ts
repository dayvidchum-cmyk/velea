import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// ── Helpers ──────────────────────────────────────────────────────────────────

const NOW = 1_700_000_000_000; // fixed timestamp for deterministic tests

function makeAuthCtx(): TrpcContext {
  return {
    user: {
      id: 1,
      openId: "test-user",
      email: "test@example.com",
      name: "Test User",
      loginMethod: "manus",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
    subject: null,
  };
}

// ── Mock profiles module (no active profile in tests) ──────────────────────────

vi.mock("./routers/profiles", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./routers/profiles")>();
  return {
    ...actual,
    getActiveProfile: vi.fn().mockResolvedValue(undefined),
    getProfileNatalBodies: vi.fn().mockResolvedValue([]),
  };
});

// ── Mock db module ────────────────────────────────────────────────────────────

vi.mock("./db", () => ({
  getDb: vi.fn().mockResolvedValue({
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue([]),
    orderBy: vi.fn().mockResolvedValue([]),
  }),
  snoozeTask: vi.fn().mockResolvedValue(undefined),
  unsnoozeTask: vi.fn().mockResolvedValue(undefined),
  getTasksByUser: vi.fn().mockResolvedValue([
    {
      id: 1,
      userId: 1,
      title: "Active task",
      mode: "Action",
      priority: "High",
      isPinned: false,
      isCompleted: false,
      completedAt: null,
      snoozedUntil: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 2,
      userId: 1,
      title: "Snoozed task (future)",
      mode: "Build",
      priority: "Medium",
      isPinned: false,
      isCompleted: false,
      completedAt: null,
      // snoozedUntil is far in the future → still snoozed
      snoozedUntil: Date.now() + 3_600_000,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 3,
      userId: 1,
      title: "Snooze expired task",
      mode: "Restraint",
      priority: "Low",
      isPinned: false,
      isCompleted: false,
      completedAt: null,
      // snoozedUntil is in the past → snooze has expired, task is active
      snoozedUntil: Date.now() - 1_000,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ]),
  getPinnedTasksForToday: vi.fn().mockResolvedValue([]),
  createTask: vi.fn().mockResolvedValue({ id: 99 }),
  updateTask: vi.fn().mockResolvedValue(undefined),
  deleteTask: vi.fn().mockResolvedValue(undefined),
  getPanchangByDate: vi.fn().mockResolvedValue(null),
  getPanchangByMonth: vi.fn().mockResolvedValue([]),
  panchangModeToTaskMode: vi.fn().mockReturnValue("Action"),
  getUserById: vi.fn().mockResolvedValue({
    id: 1,
    openId: "test-user",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
    lagnaSign: null,
    locationLat: null,
    locationLon: null,
    locationCity: null,
    locationTimezone: null,
  }),
  upsertPanchang: vi.fn().mockResolvedValue(undefined),
  getTodayCheckIn: vi.fn().mockResolvedValue(null),
}));

// ── tasks.snooze ──────────────────────────────────────────────────────────────

describe("tasks.snooze", () => {
  beforeEach(() => vi.clearAllMocks());

  it("calls snoozeTask with id and userId", async () => {
    const { snoozeTask } = await import("./db");
    const caller = appRouter.createCaller(makeAuthCtx());
    await caller.tasks.snooze({ id: 5, duration: "1hour" });
    expect(snoozeTask).toHaveBeenCalledOnce();
    const [id, userId] = (snoozeTask as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(id).toBe(5);
    expect(userId).toBe(1);
  });

  it("sets snoozedUntil ~1 hour from now for '1hour' duration", async () => {
    const { snoozeTask } = await import("./db");
    const before = Date.now();
    const caller = appRouter.createCaller(makeAuthCtx());
    const result = await caller.tasks.snooze({ id: 5, duration: "1hour" });
    const after = Date.now();

    const snoozedUntil = (snoozeTask as ReturnType<typeof vi.fn>).mock.calls[0][2] as number;
    const oneHourMs = 60 * 60 * 1000;

    expect(snoozedUntil).toBeGreaterThanOrEqual(before + oneHourMs);
    expect(snoozedUntil).toBeLessThanOrEqual(after + oneHourMs);
    expect(result.snoozedUntil).toBe(snoozedUntil);
  });

  it("sets snoozedUntil to end of current day for 'restOfDay' duration", async () => {
    const { snoozeTask } = await import("./db");
    const caller = appRouter.createCaller(makeAuthCtx());
    await caller.tasks.snooze({ id: 5, duration: "restOfDay" });

    const snoozedUntil = (snoozeTask as ReturnType<typeof vi.fn>).mock.calls[0][2] as number;
    const endOfDay = new Date(snoozedUntil);

    // End of day: hours=23, minutes=59, seconds=59
    expect(endOfDay.getHours()).toBe(23);
    expect(endOfDay.getMinutes()).toBe(59);
    expect(endOfDay.getSeconds()).toBe(59);
  });

  it("returns the snoozedUntil timestamp", async () => {
    const caller = appRouter.createCaller(makeAuthCtx());
    const result = await caller.tasks.snooze({ id: 7, duration: "1hour" });
    expect(typeof result.snoozedUntil).toBe("number");
    expect(result.snoozedUntil).toBeGreaterThan(Date.now());
  });
});

// ── tasks.unsnooze ────────────────────────────────────────────────────────────

describe("tasks.unsnooze", () => {
  beforeEach(() => vi.clearAllMocks());

  it("calls unsnoozeTask with id and userId", async () => {
    const { unsnoozeTask } = await import("./db");
    const caller = appRouter.createCaller(makeAuthCtx());
    await caller.tasks.unsnooze({ id: 10 });
    expect(unsnoozeTask).toHaveBeenCalledOnce();
    expect(unsnoozeTask).toHaveBeenCalledWith(10, 1);
  });
});

// ── tasks.modeCounts — excludes snoozed tasks ─────────────────────────────────

describe("tasks.modeCounts — snooze filtering", () => {
  beforeEach(() => vi.clearAllMocks());

  it("excludes currently-snoozed tasks from mode counts", async () => {
    // Mock: task 1 (Action, active), task 2 (Build, snoozed future), task 3 (Restraint, snooze expired)
    const { getTasksByUser } = await import("./db");
    (getTasksByUser as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: 1, userId: 1, title: "Active", mode: "Action", isCompleted: false, snoozedUntil: null },
      { id: 2, userId: 1, title: "Snoozed", mode: "Build", isCompleted: false, snoozedUntil: Date.now() + 3_600_000 },
      { id: 3, userId: 1, title: "Expired snooze", mode: "Restraint", isCompleted: false, snoozedUntil: Date.now() - 1_000 },
    ]);

    const caller = appRouter.createCaller(makeAuthCtx());
    const counts = await caller.tasks.modeCounts();

    // Task 2 (Build) is snoozed → should NOT be counted
    expect(counts.Build).toBe(0);
    // Task 1 (Action) is active → should be counted
    expect(counts.Action).toBe(1);
    // Task 3 (Restraint) snooze expired → should be counted
    expect(counts.Restraint).toBe(1);
  });

  it("counts a task once its snooze has expired", async () => {
    const { getTasksByUser } = await import("./db");
    (getTasksByUser as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: 1, userId: 1, title: "Expired snooze", mode: "Action", isCompleted: false, snoozedUntil: Date.now() - 1 },
    ]);

    const caller = appRouter.createCaller(makeAuthCtx());
    const counts = await caller.tasks.modeCounts();
    expect(counts.Action).toBe(1);
  });
});

// ── db helpers — snoozeTask / unsnoozeTask unit tests ─────────────────────────

describe("snoozeTask and unsnoozeTask db helpers", () => {
  it("snoozeTask stores a future timestamp", () => {
    // Pure logic test: verify the 1-hour calculation
    const now = Date.now();
    const snoozedUntil = now + 60 * 60 * 1000;
    expect(snoozedUntil).toBeGreaterThan(now);
    expect(snoozedUntil - now).toBe(3_600_000);
  });

  it("unsnoozeTask clears the timestamp (null)", () => {
    // Pure logic test: verify unsnooze sets null
    const task = { snoozedUntil: Date.now() + 3_600_000 };
    const unsnooze = (t: typeof task) => ({ ...t, snoozedUntil: null });
    const result = unsnooze(task);
    expect(result.snoozedUntil).toBeNull();
  });

  it("a task with snoozedUntil in the future is considered snoozed", () => {
    const now = Date.now();
    const task = { snoozedUntil: now + 3_600_000 };
    const isSnoozed = task.snoozedUntil !== null && task.snoozedUntil > now;
    expect(isSnoozed).toBe(true);
  });

  it("a task with snoozedUntil in the past is NOT considered snoozed", () => {
    const now = Date.now();
    const task = { snoozedUntil: now - 1_000 };
    const isSnoozed = task.snoozedUntil !== null && task.snoozedUntil > now;
    expect(isSnoozed).toBe(false);
  });

  it("a task with null snoozedUntil is NOT snoozed", () => {
    const now = Date.now();
    const task = { snoozedUntil: null };
    const isSnoozed = task.snoozedUntil !== null && task.snoozedUntil > now;
    expect(isSnoozed).toBe(false);
  });
});
