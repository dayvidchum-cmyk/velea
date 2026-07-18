import { describe, expect, it, vi } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock the db module
vi.mock("./db", () => ({
  getTasksByUser: vi.fn().mockResolvedValue([]),
  getPinnedTasksForToday: vi.fn().mockResolvedValue([]),
  createTask: vi.fn().mockResolvedValue({ id: 99 }),
  updateTask: vi.fn().mockResolvedValue(undefined),
  deleteTask: vi.fn().mockResolvedValue(undefined),
  getPanchangByDate: vi.fn().mockResolvedValue(null),
  getPanchangByMonth: vi.fn().mockResolvedValue([]),
  panchangModeToTaskMode: vi.fn().mockReturnValue("Build"),
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
    birthDate: null,
    birthTime: null,
    birthLocationCity: null,
    birthLocationLat: null,
    birthLocationLon: null,
    lagnaSign: null,
    sunHouse: null,
    moonHouse: null,
    marsHouse: null,
    mercuryHouse: null,
    jupiterHouse: null,
    venusHouse: null,
    saturnHouse: null,
    rahuHouse: null,
    ketuHouse: null,
    ascendantDegree: null,
  }),
  updateUserBirthChart: vi.fn().mockResolvedValue(undefined),
  updateUserLocation: vi.fn().mockResolvedValue(undefined),
  upsertPanchang: vi.fn().mockResolvedValue(undefined),
  upsertNatalBody: vi.fn().mockResolvedValue(undefined),
  getNatalBodiesByUser: vi.fn().mockResolvedValue([]),
  getNatalBodyByUserAndPlanet: vi.fn().mockResolvedValue(null),
  getDb: vi.fn().mockResolvedValue((() => {
    // Minimal drizzle-shaped stub: selects resolve empty (no profiles exist in these tests),
    // updates resolve undefined. `where` must be BOTH awaitable (update chain terminal) and
    // chainable (select().from().where().limit()), so it returns a promise with limit/orderBy.
    const emptyResult = () => Object.assign(Promise.resolve([]), {
      limit: async () => [],
      orderBy: async () => [],
    });
    const chain: any = {};
    chain.select = () => chain;
    chain.from = () => chain;
    chain.orderBy = async () => [];
    chain.limit = async () => [];
    chain.where = emptyResult;
    chain.update = () => chain;
    chain.set = () => chain;
    chain.insert = () => chain;
    chain.values = emptyResult;
    chain.delete = () => chain;
    return chain;
  })()),
  getAllSystemPrompts: vi.fn().mockResolvedValue([]),
  getReflectionByDate: vi.fn().mockResolvedValue(null),
  getReflectionsByUser: vi.fn().mockResolvedValue([]),
  upsertReflection: vi.fn().mockResolvedValue(undefined),
  upsertSystemPrompt: vi.fn().mockResolvedValue(undefined),
  getSubtasksByTask: vi.fn().mockResolvedValue([]),
  createSubtask: vi.fn().mockResolvedValue({ id: 1 }),
  toggleSubtask: vi.fn().mockResolvedValue(undefined),
  deleteSubtask: vi.fn().mockResolvedValue(undefined),
}));

// Mock the profection cascade modules so cascade delete doesn't fail in tests
vi.mock("./profection/db.js", () => ({
  deleteAllProfectionYearsForUser: vi.fn().mockResolvedValue(undefined),
  getOrCreateProfectionYear: vi.fn().mockResolvedValue({ id: 1 }),
  getProfectionYearForDate: vi.fn().mockResolvedValue(null),
  getAllProfectionYears: vi.fn().mockResolvedValue([]),
  getProfectionYearsInDateRange: vi.fn().mockResolvedValue([]),
}));

vi.mock("./profection/transit-db.js", () => ({
  deleteAllTimeLordTransitsForUser: vi.fn().mockResolvedValue(undefined),
  createTimeLordTransits: vi.fn().mockResolvedValue(undefined),
  getTimeLordTransitsForYear: vi.fn().mockResolvedValue([]),
  getTimeLordTransitForDate: vi.fn().mockResolvedValue(null),
  deleteTimeLordTransitsForYear: vi.fn().mockResolvedValue(undefined),
}));

// Mock the birthchart calculator
vi.mock("./birthchart/calculator.js", () => ({
  calculateBirthChart: vi.fn().mockResolvedValue({
    lagna: { sign: "Virgo", degree: 15.5 },
    sun: { sign: "Taurus", degree: 10.2, nakshatra: "Krittika", pada: 1, house: 10 },
    moon: { sign: "Cancer", degree: 20.1, nakshatra: "Pushya", pada: 2, house: 12 },
    mars: { sign: "Aries", degree: 5.3, nakshatra: "Ashwini", pada: 1, house: 8 },
    mercury: { sign: "Gemini", degree: 8.7, nakshatra: "Mrigashira", pada: 1, house: 11 },
    venus: { sign: "Leo", degree: 12.4, nakshatra: "Magha", pada: 1, house: 1 },
    jupiter: { sign: "Sagittarius", degree: 18.9, nakshatra: "Mula", pada: 1, house: 5 },
    saturn: { sign: "Capricorn", degree: 25.6, nakshatra: "Uttara Ashadha", pada: 2, house: 6 },
    rahu: { sign: "Libra", degree: 3.2, nakshatra: "Swati", pada: 1, house: 2 },
    ketu: { sign: "Aries", degree: 3.2, nakshatra: "Ashwini", pada: 1, house: 8 },
  }),
}));

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
    subject: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

describe("settings.calculateBirthChart", () => {
  it("calculates birth chart and stores results", async () => {
    const { updateUserBirthChart } = await import("./db");
    const caller = appRouter.createCaller(makeAuthCtx());

    const result = await caller.settings.calculateBirthChart({
      birthDate: "1990-05-15",
      birthTime: "14:30",
      birthLocationCity: "Mumbai",
      birthLocationLat: "19.0760",
      birthLocationLon: "72.8777",
    });

    expect(result.success).toBe(true);
    expect(result.chart).toBeDefined();
    expect(result.chart.lagna.sign).toBe("Virgo");
    expect(result.chart.lagna.degree).toBe(15.5);

    // Verify updateUserBirthChart was called with correct data (includes birth input fields)
    expect(updateUserBirthChart).toHaveBeenCalledWith(1, {
      // Birth input data
      birthDate: "1990-05-15",
      birthTime: "14:30",
      birthLocationCity: "Mumbai",
      birthLocationLat: "19.0760",
      birthLocationLon: "72.8777",
      birthTimezone: "UTC", // falls back to UTC when not provided
      // Calculated chart data
      lagnaSign: "Virgo",
      mcLongitude: null, // MC travels with the chart since the Meridian work (null when unset)
      sunHouse: 10,
      moonHouse: 12,
      marsHouse: 8,
      mercuryHouse: 11,
      jupiterHouse: 5,
      venusHouse: 1,
      saturnHouse: 6,
      rahuHouse: 2,
      ketuHouse: 8,
      ascendantDegree: "15.50",
    });

    // Verify upsertNatalBody was called for each planet
    const { upsertNatalBody } = await import("./db");
    expect(upsertNatalBody).toHaveBeenCalledTimes(9);
    expect(upsertNatalBody).toHaveBeenCalledWith(1, "Venus", {
      sign: "Leo",
      degree: expect.stringMatching(/^12\.4/), // stored with 6 decimal places now
      house: 1,
      nakshatra: "Magha",
      pada: 1,
      longitude: null, // mock calculator doesn't return longitude field
    });
  });

  it("returns chart data with all planetary positions", async () => {
    const caller = appRouter.createCaller(makeAuthCtx());

    const result = await caller.settings.calculateBirthChart({
      birthDate: "1990-05-15",
      birthTime: "14:30",
      birthLocationCity: "Mumbai",
    });

    expect(result.chart.sun).toBeDefined();
    expect(result.chart.sun.sign).toBe("Taurus");
    expect(result.chart.sun.house).toBe(10);
    expect(result.chart.sun.nakshatra).toBe("Krittika");
    expect(result.chart.sun.pada).toBe(1);

    expect(result.chart.moon).toBeDefined();
    expect(result.chart.moon.sign).toBe("Cancer");
    expect(result.chart.moon.nakshatra).toBe("Pushya");
    expect(result.chart.moon.pada).toBe(2);

    expect(result.chart.venus).toBeDefined();
    expect(result.chart.venus.sign).toBe("Leo");
    expect(result.chart.venus.nakshatra).toBe("Magha");
    expect(result.chart.venus.pada).toBe(1);

    expect(result.chart.mars).toBeDefined();
    expect(result.chart.jupiter).toBeDefined();
    expect(result.chart.saturn).toBeDefined();
    expect(result.chart.rahu).toBeDefined();
    expect(result.chart.ketu).toBeDefined();
  });

  it("handles optional coordinates", async () => {
    const caller = appRouter.createCaller(makeAuthCtx());

    const result = await caller.settings.calculateBirthChart({
      birthDate: "1990-05-15",
      birthTime: "14:30",
      birthLocationCity: "Mumbai",
      // No coordinates provided
    });

    expect(result.success).toBe(true);
    expect(result.chart).toBeDefined();
  });
});

describe("settings.getBirthChart", () => {
  it("returns user's birth chart data from ctx.subject", async () => {
    const mockSubject = {
      source: "owner" as const,
      profileId: 1,
      name: "Test User",
      birthDate: "1990-05-15",
      birthTime: "14:30",
      birthLocationCity: "Mumbai",
      birthLocationLat: "19.0760",
      birthLocationLon: "72.8777",
      birthTimezone: "Asia/Kolkata",
      lagnaSign: "Virgo",
      sunHouse: 10,
      moonHouse: 12,
      marsHouse: 8,
      mercuryHouse: 11,
      jupiterHouse: 5,
      venusHouse: 1,
      saturnHouse: 6,
      rahuHouse: 2,
      ketuHouse: 8,
      ascendantDegree: "15.50",
      natalBodies: [],
    };
    const ctx = { ...makeAuthCtx(), subject: mockSubject };
    const caller = appRouter.createCaller(ctx);
    const result = await caller.settings.getBirthChart();

    expect(result).toBeDefined();
    expect(result!.birthDate).toBe("1990-05-15");
    expect(result!.birthTime).toBe("14:30");
    expect(result!.birthLocationCity).toBe("Mumbai");
    expect(result!.lagnaSign).toBe("Virgo");
    expect(result!.sunHouse).toBe(10);
    expect(result!.moonHouse).toBe(12);
  });

  it("returns null when no birth chart is set (subject is null)", async () => {
    const caller = appRouter.createCaller(makeAuthCtx()); // subject: null
    const result = await caller.settings.getBirthChart();
    expect(result).toBeNull();
  });
});
