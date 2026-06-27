import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mock the db module ──────────────────────────────────────────────────────

vi.mock("./db", () => ({
  getTodayCheckIn: vi.fn(),
  createCheckIn: vi.fn(),
}));

import { getTodayCheckIn, createCheckIn } from "./db";

// ── Helpers ─────────────────────────────────────────────────────────────────

function makeCtx(userId = 42) {
  return { user: { id: userId, role: "user" as const } };
}

const VALID_INPUT = {
  physicalEnergy: 4,
  mentalClarity: 1,
  emotionalStability: 5,
  creativeFlow: 5,
  motivation: 3,
};

// ── Tests ────────────────────────────────────────────────────────────────────

describe("checkIn.today procedure (unit)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null when no check-in exists for today", async () => {
    vi.mocked(getTodayCheckIn).mockResolvedValue(undefined);
    const result = await getTodayCheckIn(42);
    expect(result).toBeUndefined();
  });

  it("returns the check-in row when one exists", async () => {
    const row = {
      id: 1,
      userId: 42,
      ...VALID_INPUT,
      recordedAt: new Date(),
      createdAt: new Date(),
    };
    vi.mocked(getTodayCheckIn).mockResolvedValue(row);
    const result = await getTodayCheckIn(42);
    expect(result).toEqual(row);
  });

  it("calls getTodayCheckIn with the correct userId", async () => {
    vi.mocked(getTodayCheckIn).mockResolvedValue(undefined);
    await getTodayCheckIn(99);
    expect(getTodayCheckIn).toHaveBeenCalledWith(99);
  });
});

describe("checkIn.create procedure (unit)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls createCheckIn with userId merged from context", async () => {
    vi.mocked(createCheckIn).mockResolvedValue({ id: 7 });
    const ctx = makeCtx(42);
    await createCheckIn({ userId: ctx.user.id, ...VALID_INPUT });
    expect(createCheckIn).toHaveBeenCalledWith({
      userId: 42,
      physicalEnergy: 4,
      mentalClarity: 1,
      emotionalStability: 5,
      creativeFlow: 5,
      motivation: 3,
    });
  });

  it("returns the inserted id", async () => {
    vi.mocked(createCheckIn).mockResolvedValue({ id: 7 });
    const result = await createCheckIn({ userId: 42, ...VALID_INPUT });
    expect(result).toEqual({ id: 7 });
  });

  it("propagates DB errors", async () => {
    vi.mocked(createCheckIn).mockRejectedValue(new Error("DB unavailable"));
    await expect(createCheckIn({ userId: 42, ...VALID_INPUT })).rejects.toThrow(
      "DB unavailable"
    );
  });
});

// ── Interpretation logic tests ───────────────────────────────────────────────

describe("check-in interpretation logic", () => {
  function interpret(scores: Record<string, number>) {
    const values = Object.values(scores);
    const max = Math.max(...values);
    const min = Math.min(...values);
    const labels: Record<string, string> = {
      physicalEnergy: "Physical Energy",
      mentalClarity: "Mental Clarity",
      emotionalStability: "Emotional Stability",
      creativeFlow: "Creative Flow",
      motivation: "Motivation",
    };
    const assets = Object.entries(scores)
      .filter(([, v]) => v === max && v >= 4)
      .map(([k]) => labels[k]);
    const constraints = Object.entries(scores)
      .filter(([, v]) => v === min && v <= 2)
      .map(([k]) => labels[k]);
    return { assets, constraints };
  }

  it("identifies assets (score >= 4 and equals max)", () => {
    const { assets } = interpret(VALID_INPUT);
    expect(assets).toContain("Emotional Stability");
    expect(assets).toContain("Creative Flow");
    expect(assets).not.toContain("Mental Clarity");
  });

  it("identifies constraints (score <= 2 and equals min)", () => {
    const { constraints } = interpret(VALID_INPUT);
    expect(constraints).toContain("Mental Clarity");
    expect(constraints).not.toContain("Physical Energy");
  });

  it("returns no assets when all scores are 3", () => {
    const { assets } = interpret({
      physicalEnergy: 3,
      mentalClarity: 3,
      emotionalStability: 3,
      creativeFlow: 3,
      motivation: 3,
    });
    expect(assets).toHaveLength(0);
  });

  it("returns no constraints when all scores are 3", () => {
    const { constraints } = interpret({
      physicalEnergy: 3,
      mentalClarity: 3,
      emotionalStability: 3,
      creativeFlow: 3,
      motivation: 3,
    });
    expect(constraints).toHaveLength(0);
  });

  it("returns no assets when max is 3 even if it equals max", () => {
    const { assets } = interpret({
      physicalEnergy: 2,
      mentalClarity: 3,
      emotionalStability: 3,
      creativeFlow: 2,
      motivation: 2,
    });
    expect(assets).toHaveLength(0);
  });

  it("handles all-5 scores — assets include all dimensions, no constraints", () => {
    const { assets, constraints } = interpret({
      physicalEnergy: 5,
      mentalClarity: 5,
      emotionalStability: 5,
      creativeFlow: 5,
      motivation: 5,
    });
    expect(assets).toHaveLength(5);
    expect(constraints).toHaveLength(0);
  });

  it("handles all-1 scores — constraints include all dimensions, no assets", () => {
    const { assets, constraints } = interpret({
      physicalEnergy: 1,
      mentalClarity: 1,
      emotionalStability: 1,
      creativeFlow: 1,
      motivation: 1,
    });
    expect(assets).toHaveLength(0);
    expect(constraints).toHaveLength(5);
  });
});
