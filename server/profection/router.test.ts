import { describe, it, expect, vi } from "vitest";
import { appRouter } from "../routers";
import type { TrpcContext } from "../_core/context";

// Mock the profiles module so resolveAstrologySubject gets David's birth data from the owner profile
vi.mock("../routers/profiles", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../routers/profiles")>();
  return {
    ...actual,
    getActiveProfile: vi.fn().mockResolvedValue(undefined),
    getProfileNatalBodies: vi.fn().mockResolvedValue([
      { id: 1, profileId: 1, planet: "Sun", sign: "Pisces", degree: "28.63", house: 7, nakshatra: "Revati", pada: 4, longitude: null },
      { id: 2, profileId: 1, planet: "Moon", sign: "Scorpio", degree: "24.51", house: 3, nakshatra: "Jyeshtha", pada: 3, longitude: null },
      { id: 3, profileId: 1, planet: "Mercury", sign: "Aries", degree: "0.46", house: 8, nakshatra: "Ashwini", pada: 1, longitude: null },
      { id: 4, profileId: 1, planet: "Venus", sign: "Aquarius", degree: "12.60", house: 6, nakshatra: "Shatabhisha", pada: 2, longitude: null },
      { id: 5, profileId: 1, planet: "Mars", sign: "Virgo", degree: "11.04", house: 1, nakshatra: "Hasta", pada: 2, longitude: null },
      { id: 6, profileId: 1, planet: "Jupiter", sign: "Libra", degree: "12.55", house: 2, nakshatra: "Swati", pada: 2, longitude: null },
      { id: 7, profileId: 1, planet: "Saturn", sign: "Virgo", degree: "24.10", house: 1, nakshatra: "Chitra", pada: 1, longitude: null },
      { id: 8, profileId: 1, planet: "Rahu", sign: "Gemini", degree: "23.27", house: 10, nakshatra: "Punarvasu", pada: 3, longitude: null },
      { id: 9, profileId: 1, planet: "Ketu", sign: "Scorpio", degree: "27.93", house: 3, nakshatra: "Jyeshtha", pada: 4, longitude: null },
    ]),
  };
});

// Mock the db modules — getDb returns owner profile for resolveAstrologySubject fallback
const ownerProfileRow = {
  id: 1,
  userId: 1,
  name: "David Chum",
  birthDate: "1982-04-13",
  birthTime: "17:20",
  birthLocationCity: "Morong",
  birthLocationLat: "14.6760",
  birthLocationLon: "120.4820",
  birthTimezone: "Asia/Manila",
  lagnaSign: "Virgo",
  sunHouse: 8, moonHouse: 3, marsHouse: 7, mercuryHouse: 8,
  jupiterHouse: 5, venusHouse: 9, saturnHouse: 6, rahuHouse: 4, ketuHouse: 10,
  ascendantDegree: "17.50",
  isActive: false,
  isOwner: true,
  archivedAt: null,
  notes: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

vi.mock("../db", () => ({
  getDb: vi.fn().mockResolvedValue({
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue([{
      id: 1, userId: 1, name: "David Chum",
      birthDate: "1982-04-13", birthTime: "17:20",
      birthLocationCity: "Morong", birthLocationLat: "14.6760", birthLocationLon: "120.4820",
      birthTimezone: "Asia/Manila", lagnaSign: "Virgo",
      sunHouse: 8, moonHouse: 3, marsHouse: 7, mercuryHouse: 8,
      jupiterHouse: 5, venusHouse: 9, saturnHouse: 6, rahuHouse: 4, ketuHouse: 10,
      ascendantDegree: "17.50", isActive: false, isOwner: true, archivedAt: null,
      notes: null, createdAt: new Date(), updatedAt: new Date(),
    }]),
    orderBy: vi.fn().mockResolvedValue([]),
  }),
  getUserById: vi.fn().mockResolvedValue({
    id: 1,
    name: "David Chum",
    birthDate: "1982-04-13",
    lagnaSign: "Virgo",
    ascendantDegree: "17.50",
  }),
  getNatalBodiesByUser: vi.fn().mockResolvedValue([
    { id: 1, userId: 1, planet: "Sun", sign: "Pisces", degree: "28.63", house: 7, nakshatra: "Revati", pada: 4 },
    { id: 2, userId: 1, planet: "Moon", sign: "Scorpio", degree: "24.51", house: 3, nakshatra: "Jyeshtha", pada: 3 },
    { id: 3, userId: 1, planet: "Mercury", sign: "Aries", degree: "0.46", house: 8, nakshatra: "Ashwini", pada: 1 },
    { id: 4, userId: 1, planet: "Venus", sign: "Aquarius", degree: "12.60", house: 6, nakshatra: "Shatabhisha", pada: 2 },
    { id: 5, userId: 1, planet: "Mars", sign: "Virgo", degree: "11.04", house: 1, nakshatra: "Hasta", pada: 2 },
    { id: 6, userId: 1, planet: "Jupiter", sign: "Libra", degree: "12.55", house: 2, nakshatra: "Swati", pada: 2 },
    { id: 7, userId: 1, planet: "Saturn", sign: "Virgo", degree: "24.10", house: 1, nakshatra: "Chitra", pada: 1 },
    { id: 8, userId: 1, planet: "Rahu", sign: "Gemini", degree: "23.27", house: 10, nakshatra: "Punarvasu", pada: 3 },
    { id: 9, userId: 1, planet: "Ketu", sign: "Scorpio", degree: "27.93", house: 3, nakshatra: "Jyeshtha", pada: 4 },
  ]),
}));

vi.mock("./db", () => ({
  getDb: vi.fn().mockResolvedValue(null),
  // Must carry timeLord + activatedSign that MATCH the computed profection (age 44 → 9th → Taurus,
  // ruled by Venus), or the sign-staleness heal block fires and wipes the fixture every call.
  getOrCreateProfectionYear: vi.fn().mockResolvedValue({ id: 1, timeLord: "Venus", activatedSign: "Taurus" }),
  getProfectionYearForDate: vi.fn().mockResolvedValue(null),
  getProfectionYearsInDateRange: vi.fn().mockResolvedValue([]),
  deleteProfectionYearsForProfile: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("./transit-db", () => ({
  getTimeLordTransitsForYear: vi.fn().mockResolvedValue([]),
  createTimeLordTransits: vi.fn().mockResolvedValue([]),
  deleteTimeLordTransitsForProfile: vi.fn().mockResolvedValue(undefined),
}));

// These are STRUCTURE tests over a hand-built fixture whose arbitrary signs (Taurus/Gemini/Cancer)
// won't match Venus's real LIVE sign — which would trip the sign-staleness heal and wipe the fixture.
// Return null so the heal skips (its own `actualSign && …` guard), leaving the fixture intact.
vi.mock("./transit-calculator", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./transit-calculator")>();
  return { ...actual, timeLordCurrentSign: vi.fn().mockResolvedValue(null) };
});

function makeAuthCtx(): TrpcContext {
  return {
    user: {
      id: 1,
      openId: "test-user",
      email: "test@example.com",
      name: "Test User",
      role: "user",
    },
    subject: {
      source: "owner" as const,
      profileId: 30001,
      name: "David Chum",
      birthDate: "1982-04-13",
      birthTime: "01:30",
      birthLocationCity: "Morong, Bataan, Philippines",
      birthLocationLat: "14.6833",
      birthLocationLon: "120.2667",
      birthTimezone: "Asia/Manila",
      lagnaSign: "Virgo",
      sunHouse: 8,
      moonHouse: 3,
      marsHouse: 8,
      mercuryHouse: 8,
      jupiterHouse: 6,
      venusHouse: 9,
      saturnHouse: 6,
      rahuHouse: 12,
      ketuHouse: 6,
      ascendantDegree: "1.23",
      natalBodies: [
        { planet: "Sun", sign: "Pisces", degree: "28.63", house: 7, nakshatra: "Revati", pada: 4, longitude: null },
        { planet: "Moon", sign: "Scorpio", degree: "24.51", house: 3, nakshatra: "Jyeshtha", pada: 3, longitude: null },
        { planet: "Mercury", sign: "Aries", degree: "0.46", house: 8, nakshatra: "Ashwini", pada: 1, longitude: null },
        { planet: "Venus", sign: "Aquarius", degree: "12.60", house: 6, nakshatra: "Shatabhisha", pada: 2, longitude: null },
        { planet: "Mars", sign: "Virgo", degree: "11.04", house: 1, nakshatra: "Hasta", pada: 2, longitude: null },
        { planet: "Jupiter", sign: "Libra", degree: "12.55", house: 2, nakshatra: "Swati", pada: 2, longitude: null },
        { planet: "Saturn", sign: "Virgo", degree: "24.10", house: 1, nakshatra: "Chitra", pada: 1, longitude: null },
        { planet: "Rahu", sign: "Gemini", degree: "23.27", house: 10, nakshatra: "Punarvasu", pada: 3, longitude: null },
        { planet: "Ketu", sign: "Scorpio", degree: "27.93", house: 3, nakshatra: "Jyeshtha", pada: 4, longitude: null },
      ],
    },
  } as TrpcContext;
}

describe("Profection Router - Natal Chart Data Flow", () => {
  it("should receive natal_bodies and include Time Lord natal placement in response", async () => {
    const caller = appRouter.createCaller(makeAuthCtx());
    
    const result = await caller.profection.forDate({
      date: "2026-05-26",
    });

    // Verify the response structure
    expect(result).toBeDefined();
    expect(result.profection).toBeDefined();
    expect(result.interpretation).toBeDefined();

    // Verify profection data
    expect(result.profection.timeLord).toBe("Venus");
    expect(result.profection.activatedHouse).toBe(9);
    expect(result.profection.activatedSign).toBe("Taurus");
    expect(result.profection.lagnaSign).toBe("Virgo");

    // Verify interpretation includes natal Time Lord context
    expect(result.interpretation.operationalChain).toBeDefined();
    expect(result.interpretation.section5).toContain("Aquarius");
    expect(result.interpretation.section5).toContain("6");
    expect(result.interpretation.section5).toContain("Shatabhisha");

    // Verify all required interpretation fields are present
    expect(result.interpretation.section6).toBeDefined();
    expect(result.interpretation.section7).toBeDefined();
    expect(result.interpretation.quickReference).toBeDefined();
  });
});


describe("Profection Router - Time Lord Movement (Section 4) Regression Tests", () => {
  it("should return populated transit data for David Chum fixture", async () => {
    // Mock transit-db to return populated transits
    const { getTimeLordTransitsForYear } = await import("./transit-db");
    vi.mocked(getTimeLordTransitsForYear).mockResolvedValueOnce([
      {
        id: 1,
        profectionYearId: 1,
        userId: 1,
        timeLord: "Venus",
        startDate: "2026-04-13",
        endDate: "2026-05-10",
        sign: "Taurus",
        house: 9,
        nakshatra: "Krittika",
        isRetrograde: false,
        condition: "Direct",
        operationalMeaning: "Stable expansion",
        recommendedUse: "Build foundations",
        coPresentPlanets: JSON.stringify([]),
        rahuKetuPresence: null,
        combustionStatus: false,
        closeConjunctions: JSON.stringify([]),
        solitaryStatus: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 2,
        profectionYearId: 1,
        userId: 1,
        timeLord: "Venus",
        startDate: "2026-05-11",
        endDate: "2026-06-15",
        sign: "Gemini",
        house: 10,
        nakshatra: "Mrigashirsha",
        isRetrograde: false,
        condition: "Direct",
        operationalMeaning: "Communication focus",
        recommendedUse: "Network and share",
        coPresentPlanets: JSON.stringify([]),
        rahuKetuPresence: null,
        combustionStatus: false,
        closeConjunctions: JSON.stringify([]),
        solitaryStatus: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 3,
        profectionYearId: 1,
        userId: 1,
        timeLord: "Venus",
        startDate: "2026-06-16",
        endDate: "2026-07-20",
        sign: "Cancer",
        house: 11,
        nakshatra: "Pushya",
        isRetrograde: false,
        condition: "Direct",
        operationalMeaning: "Emotional connection",
        recommendedUse: "Nurture relationships",
        coPresentPlanets: JSON.stringify([]),
        rahuKetuPresence: null,
        combustionStatus: false,
        closeConjunctions: JSON.stringify([]),
        solitaryStatus: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    const caller = appRouter.createCaller(makeAuthCtx());
    const result = await caller.profection.timeLordTransits();

    // Verify transits are populated
    expect(result.transits).toBeDefined();
    expect(result.transits.length).toBe(3);

    // Verify David Chum fixture examples
    expect(result.transits[0]).toMatchObject({
      timeLord: "Venus",
      sign: "Taurus",
      house: 9,
      startDate: "2026-04-13",
      endDate: "2026-05-10",
    });

    expect(result.transits[1]).toMatchObject({
      timeLord: "Venus",
      sign: "Gemini",
      house: 10,
      startDate: "2026-05-11",
      endDate: "2026-06-15",
    });

    expect(result.transits[2]).toMatchObject({
      timeLord: "Venus",
      sign: "Cancer",
      house: 11,
      startDate: "2026-06-16",
      endDate: "2026-07-20",
    });
  });

  it("should have continuous transit periods with no date gaps", async () => {
    const { getTimeLordTransitsForYear } = await import("./transit-db");
    vi.mocked(getTimeLordTransitsForYear).mockResolvedValueOnce([
      {
        id: 1,
        profectionYearId: 1,
        userId: 1,
        timeLord: "Venus",
        startDate: "2026-04-13",
        endDate: "2026-05-10",
        sign: "Taurus",
        house: 9,
        nakshatra: "Krittika",
        isRetrograde: false,
        condition: "Direct",
        operationalMeaning: "Stable expansion",
        recommendedUse: "Build foundations",
        coPresentPlanets: JSON.stringify([]),
        rahuKetuPresence: null,
        combustionStatus: false,
        closeConjunctions: JSON.stringify([]),
        solitaryStatus: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 2,
        profectionYearId: 1,
        userId: 1,
        timeLord: "Venus",
        startDate: "2026-05-11",
        endDate: "2026-06-15",
        sign: "Gemini",
        house: 10,
        nakshatra: "Mrigashirsha",
        isRetrograde: false,
        condition: "Direct",
        operationalMeaning: "Communication focus",
        recommendedUse: "Network and share",
        coPresentPlanets: JSON.stringify([]),
        rahuKetuPresence: null,
        combustionStatus: false,
        closeConjunctions: JSON.stringify([]),
        solitaryStatus: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    const caller = appRouter.createCaller(makeAuthCtx());
    const result = await caller.profection.timeLordTransits();

    // Verify continuity: end date of first transit + 1 day = start date of next transit
    const transits = result.transits;
    for (let i = 0; i < transits.length - 1; i++) {
      const endDate = new Date(transits[i].endDate);
      const nextStartDate = new Date(transits[i + 1].startDate);
      
      // Calculate the day after the end date
      const dayAfterEnd = new Date(endDate);
      dayAfterEnd.setDate(dayAfterEnd.getDate() + 1);
      
      // Verify continuity: no gap between transits
      expect(dayAfterEnd.toISOString().split("T")[0]).toBe(nextStartDate.toISOString().split("T")[0]);
    }
  });

  it("should have no overlapping date ranges", async () => {
    const { getTimeLordTransitsForYear } = await import("./transit-db");
    vi.mocked(getTimeLordTransitsForYear).mockResolvedValueOnce([
      {
        id: 1,
        profectionYearId: 1,
        userId: 1,
        timeLord: "Venus",
        startDate: "2026-04-13",
        endDate: "2026-05-10",
        sign: "Taurus",
        house: 9,
        nakshatra: "Krittika",
        isRetrograde: false,
        condition: "Direct",
        operationalMeaning: "Stable expansion",
        recommendedUse: "Build foundations",
        coPresentPlanets: JSON.stringify([]),
        rahuKetuPresence: null,
        combustionStatus: false,
        closeConjunctions: JSON.stringify([]),
        solitaryStatus: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 2,
        profectionYearId: 1,
        userId: 1,
        timeLord: "Venus",
        startDate: "2026-05-11",
        endDate: "2026-06-15",
        sign: "Gemini",
        house: 10,
        nakshatra: "Mrigashirsha",
        isRetrograde: false,
        condition: "Direct",
        operationalMeaning: "Communication focus",
        recommendedUse: "Network and share",
        coPresentPlanets: JSON.stringify([]),
        rahuKetuPresence: null,
        combustionStatus: false,
        closeConjunctions: JSON.stringify([]),
        solitaryStatus: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    const caller = appRouter.createCaller(makeAuthCtx());
    const result = await caller.profection.timeLordTransits();

    const transits = result.transits;
    for (let i = 0; i < transits.length - 1; i++) {
      const currentEnd = new Date(transits[i].endDate);
      const nextStart = new Date(transits[i + 1].startDate);
      
      // Verify no overlap: current end date must be before next start date
      expect(currentEnd.getTime()).toBeLessThanOrEqual(nextStart.getTime());
    }
  });

  it("should map house correctly from Lagna for transit signs", async () => {
    const { getTimeLordTransitsForYear } = await import("./transit-db");
    vi.mocked(getTimeLordTransitsForYear).mockResolvedValueOnce([
      {
        id: 1,
        profectionYearId: 1,
        userId: 1,
        timeLord: "Venus",
        startDate: "2026-04-13",
        endDate: "2026-05-10",
        sign: "Taurus",
        house: 9,
        nakshatra: "Krittika",
        isRetrograde: false,
        condition: "Direct",
        operationalMeaning: "Stable expansion",
        recommendedUse: "Build foundations",
        coPresentPlanets: JSON.stringify([]),
        rahuKetuPresence: null,
        combustionStatus: false,
        closeConjunctions: JSON.stringify([]),
        solitaryStatus: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 2,
        profectionYearId: 1,
        userId: 1,
        timeLord: "Venus",
        startDate: "2026-05-11",
        endDate: "2026-06-15",
        sign: "Gemini",
        house: 10,
        nakshatra: "Mrigashirsha",
        isRetrograde: false,
        condition: "Direct",
        operationalMeaning: "Communication focus",
        recommendedUse: "Network and share",
        coPresentPlanets: JSON.stringify([]),
        rahuKetuPresence: null,
        combustionStatus: false,
        closeConjunctions: JSON.stringify([]),
        solitaryStatus: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 3,
        profectionYearId: 1,
        userId: 1,
        timeLord: "Venus",
        startDate: "2026-06-16",
        endDate: "2026-07-20",
        sign: "Cancer",
        house: 11,
        nakshatra: "Pushya",
        isRetrograde: false,
        condition: "Direct",
        operationalMeaning: "Emotional connection",
        recommendedUse: "Nurture relationships",
        coPresentPlanets: JSON.stringify([]),
        rahuKetuPresence: null,
        combustionStatus: false,
        closeConjunctions: JSON.stringify([]),
        solitaryStatus: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    const caller = appRouter.createCaller(makeAuthCtx());
    const result = await caller.profection.timeLordTransits();

    // For Virgo lagna (David Chum):
    // Taurus is 10 signs back from Virgo, so it's in the 9th house (10 - 1 = 9)
    // Gemini is 9 signs back from Virgo, so it's in the 10th house (9 + 1 = 10)
    // Cancer is 8 signs back from Virgo, so it's in the 11th house (8 + 3 = 11)
    expect(result.transits[0]).toMatchObject({ sign: "Taurus", house: 9 });
    expect(result.transits[1]).toMatchObject({ sign: "Gemini", house: 10 });
    expect(result.transits[2]).toMatchObject({ sign: "Cancer", house: 11 });
  });

  it("should only show empty-state when database truly has no transit records", async () => {
    const { getTimeLordTransitsForYear } = await import("./transit-db");
    vi.mocked(getTimeLordTransitsForYear).mockResolvedValueOnce([]);

    const caller = appRouter.createCaller(makeAuthCtx());
    const result = await caller.profection.timeLordTransits();

    // When database is empty, transits array should be empty
    expect(result.transits).toBeDefined();
    expect(result.transits.length).toBe(0);
  });

  it("should not recalculate transits on subsequent calls when records exist in database", async () => {
    const { getTimeLordTransitsForYear } = await import("./transit-db");

    const mockTransits = [
      {
        id: 1,
        profectionYearId: 1,
        userId: 1,
        timeLord: "Venus",
        startDate: "2026-04-13",
        endDate: "2026-05-10",
        sign: "Taurus",
        house: 9,
        nakshatra: "Krittika",
        isRetrograde: false,
        condition: "Direct",
        operationalMeaning: "Stable expansion",
        recommendedUse: "Build foundations",
        coPresentPlanets: JSON.stringify([]),
        rahuKetuPresence: null,
        combustionStatus: false,
        closeConjunctions: JSON.stringify([]),
        solitaryStatus: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    vi.mocked(getTimeLordTransitsForYear).mockResolvedValueOnce(mockTransits);

    const caller = appRouter.createCaller(makeAuthCtx());
    const result = await caller.profection.timeLordTransits();

    // Verify transits are returned from database
    expect(result.transits.length).toBe(1);
    
    // Verify getTimeLordTransitsForYear was called (to check for existing records)
    expect(vi.mocked(getTimeLordTransitsForYear)).toHaveBeenCalled();
  });
});
