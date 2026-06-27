import { describe, it, expect } from "vitest";
import type { Task } from "../../drizzle/schema";
import { layerEffect, scoreTasks } from "../task-scorer";
import type { CurrentLayers } from "./types";

function makeTask(overrides: Partial<Task & { projectName?: string | null }> = {}): Task {
  return {
    id: 1,
    title: "Test task",
    mode: "Action",
    priority: "Medium",
    isPinned: false,
    isCompleted: false,
    dueDate: null,
    createdAt: new Date(),
    snoozedUntil: null,
    projectName: null,
    ...(overrides as any),
  } as any;
}

const layers = (overrides: Partial<CurrentLayers> = {}): CurrentLayers => ({
  timeLordPeriod: null,
  transits: { active: [] },
  computedAt: new Date().toISOString(),
  ...overrides,
});

describe("layerEffect", () => {
  it("returns ×1 and no bubbles when layers are absent", () => {
    const { multiplier, bubbles } = layerEffect(makeTask(), null);
    expect(multiplier).toBe(1);
    expect(bubbles).toEqual([]);
  });

  it("applies ×1.2 and a theme bubble when the theme matches the task", () => {
    const task = makeTask({ title: "Refine the pricing structure", mode: "Build" } as any);
    const { multiplier, bubbles } = layerEffect(task, layers({
      timeLordPeriod: { mahaDasha: "Venus", antarDasha: "Saturn", theme: "refining structure" },
    }));
    expect(multiplier).toBeCloseTo(1.2, 5);
    expect(bubbles).toContain("Venus theme");
  });

  it("favoring transit → ×1.1 and a pressure bubble", () => {
    // Saturn favors Restraint
    const task = makeTask({ mode: "Restraint" } as any);
    const { multiplier, bubbles } = layerEffect(task, layers({
      transits: { active: [{ transitingPlanet: "Saturn", natalPoint: "Sun", orb: 1, severity: "moderate" }] },
    }));
    expect(multiplier).toBeCloseTo(1.1, 5);
    expect(bubbles).toContain("Saturn pressure");
  });

  it("opposing transit → ×0.85 and NO bubble (never disclose negatives)", () => {
    // Saturn opposes Action
    const task = makeTask({ mode: "Action" } as any);
    const { multiplier, bubbles } = layerEffect(task, layers({
      transits: { active: [{ transitingPlanet: "Saturn", natalPoint: "Sun", orb: 1, severity: "moderate" }] },
    }));
    expect(multiplier).toBeCloseTo(0.85, 5);
    expect(bubbles).toEqual([]);
  });

  it("caps bubbles at 3 and dedupes repeats", () => {
    const task = makeTask({ title: "Refine structure", mode: "Restraint" } as any);
    const { bubbles } = layerEffect(task, layers({
      timeLordPeriod: { mahaDasha: "Saturn", antarDasha: "Saturn", theme: "rigorous discipline, endurance" },
      transits: {
        active: [
          { transitingPlanet: "Saturn", natalPoint: "Sun", orb: 1, severity: "moderate" },
          { transitingPlanet: "Saturn", natalPoint: "Moon", orb: 2, severity: "low" },
          { transitingPlanet: "Ketu", natalPoint: "Lagna", orb: 1, severity: "moderate" },
        ],
      },
    }));
    expect(bubbles.length).toBeLessThanOrEqual(3);
    // "Saturn pressure" should appear once despite two Saturn transits
    expect(bubbles.filter((b) => b === "Saturn pressure")).toHaveLength(1);
  });
});

describe("scoreTasks — floors are untouchable by layers (Conflict A)", () => {
  it("a pinned task stays above a non-pinned one even when its layer multiplier is < 1", () => {
    const opts = {
      todayMode: "Action",
      todayDate: new Date().toISOString().split("T")[0],
      personalEnergy: "Medium" as const,
      // Saturn opposes Action → ×0.85 on BOTH tasks' soft subscore
      layers: layers({
        transits: { active: [{ transitingPlanet: "Saturn" as const, natalPoint: "Sun" as const, orb: 1, severity: "moderate" as const }] },
      }),
    };
    const pinned = makeTask({ id: 1, isPinned: true, priority: "Low" } as any);
    const unpinned = makeTask({ id: 2, isPinned: false, priority: "High" } as any);

    const ranked = scoreTasks([unpinned, pinned], opts);
    expect(ranked[0].id).toBe(1); // pinned floor (1000) dominates regardless of multiplier
    expect(ranked[0].score).toBeGreaterThan(1000);
  });

  it("attaches layerBubbles to scored tasks", () => {
    const opts = {
      todayMode: "Restraint",
      todayDate: new Date().toISOString().split("T")[0],
      personalEnergy: "Medium" as const,
      layers: layers({
        transits: { active: [{ transitingPlanet: "Saturn" as const, natalPoint: "Sun" as const, orb: 1, severity: "moderate" as const }] },
      }),
    };
    const task = makeTask({ id: 1, mode: "Restraint" } as any);
    const ranked = scoreTasks([task], opts);
    expect(ranked[0].layerBubbles).toContain("Saturn pressure");
  });
});
