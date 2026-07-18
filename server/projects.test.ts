import { describe, it, expect, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// ── Mock profiles module (no active profile in tests) ──────────────────────────

vi.mock("./routers/profiles", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./routers/profiles")>();
  return {
    ...actual,
    getActiveProfile: vi.fn().mockResolvedValue(undefined),
    getProfileNatalBodies: vi.fn().mockResolvedValue([]),
  };
});

// ── Mock db module ──────────────────────────────────────────────────────────

vi.mock("./db", async (importOriginal) => {
  const original = await importOriginal<typeof import("./db")>();
  return {
    ...original,
    getProjectsByUser: vi.fn().mockResolvedValue([
      { id: 1, userId: 1, name: "Website Redesign", archivedAt: null, createdAt: new Date(), updatedAt: new Date() },
      { id: 2, userId: 1, name: "Marketing Campaign", archivedAt: null, createdAt: new Date(), updatedAt: new Date() },
    ]),
    getAllProjectsByUser: vi.fn().mockResolvedValue([
      { id: 1, userId: 1, name: "Website Redesign", archivedAt: null, createdAt: new Date(), updatedAt: new Date() },
      { id: 2, userId: 1, name: "Marketing Campaign", archivedAt: null, createdAt: new Date(), updatedAt: new Date() },
      { id: 3, userId: 1, name: "Old Project", archivedAt: new Date("2025-01-01"), createdAt: new Date(), updatedAt: new Date() },
    ]),
    createProject: vi.fn().mockResolvedValue({ id: 99, userId: 1, name: "New Project", archivedAt: null, createdAt: new Date(), updatedAt: new Date() }),
    renameProject: vi.fn().mockResolvedValue(undefined),
    archiveProject: vi.fn().mockResolvedValue(undefined),
    unarchiveProject: vi.fn().mockResolvedValue(undefined),
    deleteProject: vi.fn().mockResolvedValue(undefined),
    // Keep existing mocks so other procedures don't break
    getTasksByUser: vi.fn().mockResolvedValue([]),
    getPinnedTasksForToday: vi.fn().mockResolvedValue([]),
    createTask: vi.fn().mockResolvedValue({ id: 99 }),
    updateTask: vi.fn().mockResolvedValue(undefined),
    deleteTask: vi.fn().mockResolvedValue(undefined),
    getPanchangByDate: vi.fn().mockResolvedValue(null),
    getPanchangByMonth: vi.fn().mockResolvedValue([]),
    panchangModeToTaskMode: vi.fn().mockReturnValue("Restraint"),
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
      lagnaSign: "Virgo",
      locationLat: null,
      locationLon: null,
      locationCity: null,
      locationTimezone: null,
    }),
    upsertPanchang: vi.fn().mockResolvedValue(undefined),
    getProjectStats: vi.fn().mockResolvedValue(null),
    getProjectInsights: vi.fn().mockResolvedValue(null),
    getRecommendedNextTask: vi.fn().mockResolvedValue(null),
    getProjectNote: vi.fn().mockResolvedValue(undefined),
    upsertProjectNote: vi.fn().mockResolvedValue(undefined),
  };
});

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

// ── projects.list ───────────────────────────────────────────────────────────

describe("projects.list", () => {
  it("returns only active (non-archived) projects", async () => {
    const caller = appRouter.createCaller(makeAuthCtx());
    const result = await caller.projects.list();
    expect(result).toHaveLength(2);
    expect(result.every((p) => p.archivedAt === null)).toBe(true);
  });

  it("returns projects for the authenticated user", async () => {
    const { getProjectsByUser } = await import("./db");
    const caller = appRouter.createCaller(makeAuthCtx());
    await caller.projects.list();
    expect(getProjectsByUser).toHaveBeenCalledWith(1, null);
  });
});

// ── projects.listAll ────────────────────────────────────────────────────────

describe("projects.listAll", () => {
  it("returns all projects including archived", async () => {
    const caller = appRouter.createCaller(makeAuthCtx());
    const result = await caller.projects.listAll();
    expect(result).toHaveLength(3);
    const archived = result.filter((p) => p.archivedAt !== null);
    expect(archived).toHaveLength(1);
    expect(archived[0].name).toBe("Old Project");
  });
});

// ── projects.create ─────────────────────────────────────────────────────────

describe("projects.create", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a project with the given name for the authenticated user", async () => {
    const { createProject } = await import("./db");
    const caller = appRouter.createCaller(makeAuthCtx());
    const result = await caller.projects.create({ name: "New Project" });
    expect(createProject).toHaveBeenCalledWith(1, "New Project", null, []);
    expect(result).toMatchObject({ id: 99, name: "New Project" });
  });

  it("rejects empty project names", async () => {
    const caller = appRouter.createCaller(makeAuthCtx());
    await expect(caller.projects.create({ name: "" })).rejects.toThrow();
  });

  it("rejects names longer than 256 characters", async () => {
    const caller = appRouter.createCaller(makeAuthCtx());
    const longName = "a".repeat(257);
    await expect(caller.projects.create({ name: longName })).rejects.toThrow();
  });
});

// ── projects.rename ─────────────────────────────────────────────────────────

describe("projects.rename", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls renameProject with (id, userId, name)", async () => {
    const { renameProject } = await import("./db");
    const caller = appRouter.createCaller(makeAuthCtx());
    const result = await caller.projects.rename({ id: 1, name: "Updated Name" });
    expect(renameProject).toHaveBeenCalledWith(1, 1, "Updated Name");
    expect(result).toEqual({ success: true });
  });
});

// ── projects.archive ─────────────────────────────────────────────────────────

describe("projects.archive", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls archiveProject with (id, userId)", async () => {
    const { archiveProject } = await import("./db");
    const caller = appRouter.createCaller(makeAuthCtx());
    const result = await caller.projects.archive({ id: 1 });
    expect(archiveProject).toHaveBeenCalledWith(1, 1);
    expect(result).toEqual({ success: true });
  });
});

// ── projects.unarchive ───────────────────────────────────────────────────────

describe("projects.unarchive", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls unarchiveProject with (id, userId)", async () => {
    const { unarchiveProject } = await import("./db");
    const caller = appRouter.createCaller(makeAuthCtx());
    const result = await caller.projects.unarchive({ id: 3 });
    expect(unarchiveProject).toHaveBeenCalledWith(3, 1);
    expect(result).toEqual({ success: true });
  });
});

// ── projects.delete ──────────────────────────────────────────────────────────

describe("projects.delete", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls deleteProject with (id, userId) in correct order", async () => {
    const { deleteProject } = await import("./db");
    const caller = appRouter.createCaller(makeAuthCtx());
    const result = await caller.projects.delete({ id: 2 });
    expect(deleteProject).toHaveBeenCalledWith(2, 1);
    expect(result).toEqual({ success: true });
  });

  it("does NOT call deleteProject with (userId, id) reversed order", async () => {
    const { deleteProject } = await import("./db");
    const caller = appRouter.createCaller(makeAuthCtx());
    await caller.projects.delete({ id: 2 });
    expect(deleteProject).not.toHaveBeenCalledWith(1, 2);
  });
});


// ── projects.stats ──────────────────────────────────────────────────────────

describe("projects.stats", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls getProjectStats with (projectId, userId)", async () => {
    const { getProjectStats } = await import("./db");
    (getProjectStats as any).mockResolvedValueOnce({
      projectId: 1,
      projectName: "Test Project",
      total: 5,
      completed: 2,
      remaining: 3,
      progressPercent: 40,
      active: [],
      completedTasks: [],
      archived: [],
    });

    const caller = appRouter.createCaller(makeAuthCtx());
    const result = await caller.projects.stats({ projectId: 1 });
    expect(getProjectStats).toHaveBeenCalledWith(1, 1, null);
    expect(result?.progressPercent).toBe(40);
  });

  it("returns null for unauthorized project", async () => {
    const { getProjectStats } = await import("./db");
    (getProjectStats as any).mockResolvedValueOnce(null);

    const caller = appRouter.createCaller(makeAuthCtx());
    const result = await caller.projects.stats({ projectId: 99 });
    expect(result).toBeNull();
  });
});

// ── projects.insights ───────────────────────────────────────────────────────

describe("projects.insights", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls getProjectInsights with (projectId, userId)", async () => {
    const { getProjectInsights } = await import("./db");
    (getProjectInsights as any).mockResolvedValueOnce({
      projectId: 1,
      commonMode: "Build",
      upcomingDue: [],
      highPriority: [],
      wealthFlow: [],
    });

    const caller = appRouter.createCaller(makeAuthCtx());
    const result = await caller.projects.insights({ projectId: 1 });
    expect(getProjectInsights).toHaveBeenCalledWith(1, 1, null);
    expect(result?.commonMode).toBe("Build");
  });

  it("returns null for unauthorized project", async () => {
    const { getProjectInsights } = await import("./db");
    (getProjectInsights as any).mockResolvedValueOnce(null);

    const caller = appRouter.createCaller(makeAuthCtx());
    const result = await caller.projects.insights({ projectId: 99 });
    expect(result).toBeNull();
  });
});

// ── projects.recommendedNextTask ────────────────────────────────────────────

describe("projects.recommendedNextTask", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls getRecommendedNextTask with (projectId, userId)", async () => {
    const { getRecommendedNextTask } = await import("./db");
    (getRecommendedNextTask as any).mockResolvedValueOnce({
      id: 10,
      userId: 1,
      title: "Next Task",
      mode: "Build",
      priority: "High",
      isPinned: false,
      isCompleted: false,
      completedAt: null,
      dueDate: null,
      wealthFlow: false,
      projectId: 1,
      cognitiveLoad: "Medium",
      physicalLoad: "Low",
      creativeRequired: false,
      socialRequired: false,
      emotionalLoad: "Low",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const caller = appRouter.createCaller(makeAuthCtx());
    const result = await caller.projects.recommendedNextTask({ projectId: 1 });
    expect(getRecommendedNextTask).toHaveBeenCalledWith(1, 1, null);
    expect(result?.title).toBe("Next Task");
  });

  it("returns null for empty project", async () => {
    const { getRecommendedNextTask } = await import("./db");
    (getRecommendedNextTask as any).mockResolvedValueOnce(null);

    const caller = appRouter.createCaller(makeAuthCtx());
    const result = await caller.projects.recommendedNextTask({ projectId: 99 });
    expect(result).toBeNull();
  });
});

// ── projects.getNote ────────────────────────────────────────────────────────

describe("projects.getNote", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls getProjectNote with (projectId, userId)", async () => {
    const { getProjectNote } = await import("./db");
    (getProjectNote as any).mockResolvedValueOnce({
      id: 1,
      projectId: 1,
      userId: 1,
      content: "Project notes",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const caller = appRouter.createCaller(makeAuthCtx());
    const result = await caller.projects.getNote({ projectId: 1 });
    expect(getProjectNote).toHaveBeenCalledWith(1, 1);
    expect(result?.content).toBe("Project notes");
  });

  it("returns undefined if no note exists", async () => {
    const { getProjectNote } = await import("./db");
    (getProjectNote as any).mockResolvedValueOnce(undefined);

    const caller = appRouter.createCaller(makeAuthCtx());
    const result = await caller.projects.getNote({ projectId: 1 });
    expect(result).toBeUndefined();
  });
});

// ── projects.upsertNote ─────────────────────────────────────────────────────

describe("projects.upsertNote", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls upsertProjectNote with (projectId, userId, content)", async () => {
    const { upsertProjectNote } = await import("./db");
    (upsertProjectNote as any).mockResolvedValueOnce(undefined);

    const caller = appRouter.createCaller(makeAuthCtx());
    const result = await caller.projects.upsertNote({ projectId: 1, content: "New notes" });
    expect(upsertProjectNote).toHaveBeenCalledWith(1, 1, "New notes");
    expect(result).toEqual({ success: true });
  });

  it("rejects empty content", async () => {
    const caller = appRouter.createCaller(makeAuthCtx());
    // Empty string should still be allowed (user can clear notes)
    const { upsertProjectNote } = await import("./db");
    (upsertProjectNote as any).mockResolvedValueOnce(undefined);

    const result = await caller.projects.upsertNote({ projectId: 1, content: "" });
    expect(result).toEqual({ success: true });
  });
});
