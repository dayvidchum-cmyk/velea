/**
 * Tests for the profiles router and resolveAstrologySubject helper.
 * These tests verify the core profile CRUD logic and the active-profile
 * resolution that drives all astrology calculations.
 *
 * Architecture (post-consolidation):
 * - All birth data lives in the profiles table only.
 * - resolveAstrologySubject reads: active profile → owner profile → null.
 * - The users table birth fields are legacy and no longer read.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mock DB ───────────────────────────────────────────────────────────────────

const mockProfiles: any[] = [];
const mockProfileBodies: any[] = [];
let nextId = 1;

const mockDb = {
  select: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  limit: vi.fn().mockImplementation(async () => []),
  orderBy: vi.fn().mockImplementation(async () => mockProfiles),
  insert: vi.fn().mockImplementation(() => ({
    values: vi.fn().mockImplementation(async (data: any) => {
      const row = { id: nextId++, ...data };
      mockProfiles.push(row);
      return [{ insertId: row.id }];
    }),
  })),
  update: vi.fn().mockReturnThis(),
  set: vi.fn().mockReturnThis(),
  delete: vi.fn().mockReturnThis(),
};

vi.mock("../server/db", () => ({
  getDb: vi.fn().mockResolvedValue(mockDb),
  getUserById: vi.fn().mockResolvedValue(null),
  getNatalBodiesByUser: vi.fn().mockResolvedValue([]),
}));

vi.mock("../drizzle/schema", () => ({
  profiles: { userId: "userId", isActive: "isActive", isOwner: "isOwner", archivedAt: "archivedAt", id: "id" },
  profileNatalBodies: { profileId: "profileId", planet: "planet" },
  users: {},
  natalBodies: {},
}));

// ── resolveAstrologySubject tests ─────────────────────────────────────────────

describe("resolveAstrologySubject", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mockDb.limit to return empty by default
    mockDb.limit.mockImplementation(async () => []);
  });

  it("returns null when no profiles exist with birth data", async () => {
    // Both active profile and owner profile queries return empty
    mockDb.limit.mockImplementation(async () => []);

    const { resolveAstrologySubject } = await import("./astrology-subject");
    const result = await resolveAstrologySubject(1);
    expect(result).toBeNull();
  });

  it("returns owner profile data when owner profile has birth data and no active profile", async () => {
    const ownerProfile = {
      id: 1,
      userId: 1,
      name: "David",
      birthDate: "1982-04-13",
      birthTime: "17:20",
      birthLocationCity: "Morong",
      birthLocationLat: "14.6760",
      birthLocationLon: "120.4820",
      birthTimezone: "Asia/Manila",
      lagnaSign: "Virgo",
      sunHouse: 8, moonHouse: 3, marsHouse: 7, mercuryHouse: 8,
      jupiterHouse: 5, venusHouse: 9, saturnHouse: 6, rahuHouse: 4, ketuHouse: 10,
      ascendantDegree: "17.09",
      isActive: false,
      isOwner: true,
      archivedAt: null,
    };

    // First call (getActiveProfile — active=true) returns empty
    // Second call (owner profile — isOwner=true) returns ownerProfile
    let callCount = 0;
    mockDb.limit.mockImplementation(async () => {
      callCount++;
      if (callCount === 1) return []; // no active profile
      return [ownerProfile];          // owner profile
    });
    // getProfileNatalBodies also calls limit
    mockDb.orderBy.mockImplementation(async () => []);

    const { resolveAstrologySubject } = await import("./astrology-subject");
    const result = await resolveAstrologySubject(1);
    expect(result).not.toBeNull();
    expect(result!.birthDate).toBe("1982-04-13");
    expect(result!.lagnaSign).toBe("Virgo");
    // getActiveProfile now falls back to the owner chart itself (the blank-reading fix),
    // so the subject resolves via the active-profile path and is labeled "profile". The
    // label is informational pass-through (nothing branches on it).
    expect(result!.source).toBe("profile");
  });

  it("returns active profile data when an active profile is set", async () => {
    const activeProfile = {
      id: 2,
      userId: 1,
      name: "Lang",
      birthDate: "1989-11-18",
      birthTime: "17:32",
      birthLocationCity: "Boston",
      birthLocationLat: "42.3601",
      birthLocationLon: "-71.0589",
      birthTimezone: "America/New_York",
      lagnaSign: "Taurus",
      sunHouse: 7, moonHouse: 3, marsHouse: 6, mercuryHouse: 7,
      jupiterHouse: 11, venusHouse: 6, saturnHouse: 5, rahuHouse: 9, ketuHouse: 3,
      ascendantDegree: "12.45",
      isActive: true,
      isOwner: false,
      archivedAt: null,
    };

    // First call (getActiveProfile) returns the active profile
    mockDb.limit.mockImplementation(async () => [activeProfile]);
    mockDb.orderBy.mockImplementation(async () => []);

    const { resolveAstrologySubject } = await import("./astrology-subject");
    const result = await resolveAstrologySubject(1);
    expect(result).not.toBeNull();
    expect(result!.birthDate).toBe("1989-11-18");
    expect(result!.lagnaSign).toBe("Taurus");
    expect(result!.source).toBe("profile");
    expect(result!.profileId).toBe(2);
  });
});

// ── Dasha calculator integration ──────────────────────────────────────────────

describe("calculateDashaTimeline with correct Moon longitude", () => {
  it("produces Moon-Saturn as current antardasha for April 13 1982 birth", async () => {
    const { calculateDashaTimeline } = await import("./dasha-calculator");

    // Moon longitude 235.394335° = Scorpio 25.39° = Jyeshtha nakshatra
    const result = calculateDashaTimeline(
      "1982-04-13", // birthDate as YYYY-MM-DD
      "Jyeshtha",  // moonNakshatra
      "Scorpio",   // moonSign
      "25.394335", // moonDegree
      "2026-06-24", // today
      "235.394335" // moonLongitude (full sidereal)
    );

    expect(result).not.toBeNull();
    if (!result) return;

    // Starting dasha should be Mercury
    expect(result.entries[0].mahadasha).toBe("Mercury");

    // Current antardasha should be Moon-Saturn
    expect(result.currentMahadasha).toBe("Moon");
    expect(result.currentAntardasha).toBe("Saturn");
  });

  it("Moon-Saturn antardasha runs from approximately May 2025 to Dec 2026", async () => {
    const { calculateDashaTimeline } = await import("./dasha-calculator");

    const result = calculateDashaTimeline(
      "1982-04-13",
      "Jyeshtha",
      "Scorpio",
      "25.394335",
      "2026-06-24",
      "235.394335"
    );

    if (!result) return;

    // Find the Moon-Saturn antardasha entry
    const saturnEntry = result.entries.find(
      (e: any) => e.mahadasha === "Moon" && e.antardasha === "Saturn"
    );
    expect(saturnEntry).toBeDefined();

    // Start should be around May 2025
    const start = new Date(saturnEntry!.startDate);
    expect(start.getFullYear()).toBe(2025);
    expect(start.getMonth()).toBeGreaterThanOrEqual(3); // April or later

    // End should be around Dec 2026
    const end = new Date(saturnEntry!.endDate);
    expect(end.getFullYear()).toBe(2026);
  });
});
