import { describe, it, expect } from "vitest";
import { scoreTasks, currentStateScore } from "./task-scorer";
import type { Task } from "../drizzle/schema";

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 1,
    userId: 1,
    title: "Test task",
    mode: "Build",
    priority: "Medium",
    isPinned: false,
    isCompleted: false,
    completedAt: null,
    dueDate: null,
    wealthFlow: false,
    projectId: null,
    cognitiveLoad: "Medium",
    physicalLoad: "Low",
    creativeRequired: false,
    socialRequired: false,
    emotionalLoad: "Low",
    createdAt: new Date("2026-06-01"),
    updatedAt: new Date("2026-06-01"),
    ...overrides,
  } as Task;
}

const TODAY = "2026-06-05";

const NEUTRAL_STATE = {
  physicalEnergy: 3,
  mentalClarity: 3,
  emotionalStability: 3,
  creativeFlow: 3,
  motivation: 3,
};

// ── Existing scoreTasks tests ────────────────────────────────────────────────

describe("scoreTasks", () => {
  it("filters out completed tasks", () => {
    const tasks = [
      makeTask({ id: 1, isCompleted: false }),
      makeTask({ id: 2, isCompleted: true }),
    ];
    const result = scoreTasks(tasks, { todayMode: "Build", todayDate: TODAY });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(1);
  });

  it("adds +1000 and 'Pinned for today' reason for pinned tasks", () => {
    const tasks = [makeTask({ isPinned: true })];
    const result = scoreTasks(tasks, { todayMode: "Build", todayDate: TODAY });
    expect(result[0].score).toBeGreaterThanOrEqual(1000);
    expect(result[0].reasons).toContain("Pinned for today");
  });

  it("adds +500 and overdue reason for past-due tasks", () => {
    const tasks = [makeTask({ dueDate: "2026-06-01" })]; // 4 days ago
    const result = scoreTasks(tasks, { todayMode: "Build", todayDate: TODAY });
    expect(result[0].score).toBeGreaterThanOrEqual(500);
    expect(result[0].reasons.some((r) => r.startsWith("Overdue"))).toBe(true);
  });

  it("adds +300 and 'Due today' reason for tasks due today", () => {
    const tasks = [makeTask({ dueDate: TODAY })];
    const result = scoreTasks(tasks, { todayMode: "Build", todayDate: TODAY });
    expect(result[0].score).toBeGreaterThanOrEqual(300);
    expect(result[0].reasons).toContain("Due today");
  });

  it("adds +200 and 'Wealth flow task' reason for wealthFlow tasks", () => {
    const tasks = [makeTask({ wealthFlow: true } as any)];
    const result = scoreTasks(tasks, { todayMode: "Build", todayDate: TODAY });
    expect(result[0].score).toBeGreaterThanOrEqual(200);
    expect(result[0].reasons).toContain("Wealth flow task");
  });

  it("adds +150 for High priority and +75 for Medium priority", () => {
    const high = makeTask({ id: 1, priority: "High" });
    const medium = makeTask({ id: 2, priority: "Medium" });
    const low = makeTask({ id: 3, priority: "Low" });
    const result = scoreTasks([high, medium, low], { todayMode: "Build", todayDate: TODAY });
    const scores = Object.fromEntries(result.map((t) => [t.id, t.score]));
    expect(scores[1]).toBeGreaterThan(scores[2]);
    expect(scores[2]).toBeGreaterThan(scores[3]);
  });

  it("adds +100 and mode alignment reason when task mode matches today mode", () => {
    const tasks = [makeTask({ mode: "Restraint" })];
    const result = scoreTasks(tasks, { todayMode: "Restraint", todayDate: TODAY });
    expect(result[0].score).toBeGreaterThanOrEqual(100);
    expect(result[0].reasons).toContain("Aligned with Restraint mode");
  });

  it("returns tasks sorted by score descending", () => {
    const tasks = [
      makeTask({ id: 1, priority: "Low" }),
      makeTask({ id: 2, priority: "High" }),
      makeTask({ id: 3, priority: "Medium" }),
    ];
    const result = scoreTasks(tasks, { todayMode: "Build", todayDate: TODAY });
    expect(result[0].id).toBe(2); // High first
    expect(result[1].id).toBe(3); // Medium second
    expect(result[2].id).toBe(1); // Low last
  });
});

// ── currentStateScore unit tests ─────────────────────────────────────────────

describe("currentStateScore", () => {
  it("returns delta=0 and no reasons for all-neutral state", () => {
    const task = makeTask({ cognitiveLoad: "Medium", physicalLoad: "Low", creativeRequired: false, socialRequired: false, emotionalLoad: "Low" });
    const { delta, reasons } = currentStateScore(task, NEUTRAL_STATE);
    expect(delta).toBe(0);
    expect(reasons).toHaveLength(0);
  });

  it("boosts low-cognitive task when mental clarity is low (1-2)", () => {
    const task = makeTask({ cognitiveLoad: "Low" });
    const state = { ...NEUTRAL_STATE, mentalClarity: 1 };
    const { delta, reasons } = currentStateScore(task, state);
    expect(delta).toBeGreaterThan(0);
    expect(reasons.some((r) => r.includes("low mental clarity"))).toBe(true);
  });

  it("penalises high-cognitive task when mental clarity is low (1-2)", () => {
    const task = makeTask({ cognitiveLoad: "High" });
    const state = { ...NEUTRAL_STATE, mentalClarity: 2 };
    const { delta, reasons } = currentStateScore(task, state);
    expect(delta).toBeLessThan(0);
    expect(reasons.some((r) => r.includes("low mental clarity"))).toBe(true);
  });

  it("boosts creative task when creative flow is high (4-5)", () => {
    const task = makeTask({ creativeRequired: true });
    const state = { ...NEUTRAL_STATE, creativeFlow: 5 };
    const { delta, reasons } = currentStateScore(task, state);
    expect(delta).toBeGreaterThan(0);
    expect(reasons.some((r) => r.includes("high creative flow"))).toBe(true);
  });

  it("does not boost non-creative task even when creative flow is high", () => {
    const task = makeTask({ creativeRequired: false });
    const state = { ...NEUTRAL_STATE, creativeFlow: 5 };
    const { delta, reasons } = currentStateScore(task, state);
    // No creative boost expected
    expect(reasons.some((r) => r.includes("high creative flow"))).toBe(false);
  });

  it("penalises high-physical task when physical energy is low (1-2)", () => {
    const task = makeTask({ physicalLoad: "High" });
    const state = { ...NEUTRAL_STATE, physicalEnergy: 1 };
    const { delta, reasons } = currentStateScore(task, state);
    expect(delta).toBeLessThan(0);
    expect(reasons.some((r) => r.includes("physical task"))).toBe(true);
  });

  it("boosts high-physical task when physical energy is high (4-5)", () => {
    const task = makeTask({ physicalLoad: "High" });
    const state = { ...NEUTRAL_STATE, physicalEnergy: 5 };
    const { delta, reasons } = currentStateScore(task, state);
    expect(delta).toBeGreaterThan(0);
    expect(reasons.some((r) => r.includes("high physical energy"))).toBe(true);
  });

  it("boosts low-friction task when motivation is low (1-2)", () => {
    const task = makeTask({ cognitiveLoad: "Low", physicalLoad: "Low" });
    const state = { ...NEUTRAL_STATE, motivation: 1 };
    const { delta, reasons } = currentStateScore(task, state);
    expect(delta).toBeGreaterThan(0);
    expect(reasons.some((r) => r.includes("low-friction"))).toBe(true);
  });

  it("penalises high-effort task when motivation is low (1-2)", () => {
    const task = makeTask({ cognitiveLoad: "High", physicalLoad: "High" });
    const state = { ...NEUTRAL_STATE, motivation: 2 };
    const { delta, reasons } = currentStateScore(task, state);
    expect(delta).toBeLessThan(0);
    expect(reasons.some((r) => r.includes("Low motivation"))).toBe(true);
  });

  it("allows high-emotional-load task when emotional stability is high (4-5)", () => {
    const task = makeTask({ emotionalLoad: "High" });
    const state = { ...NEUTRAL_STATE, emotionalStability: 5 };
    const { delta, reasons } = currentStateScore(task, state);
    expect(delta).toBeGreaterThan(0);
    expect(reasons.some((r) => r.includes("high emotional stability"))).toBe(true);
  });

  it("penalises high-emotional-load task when emotional stability is low (1-2)", () => {
    const task = makeTask({ emotionalLoad: "High" });
    const state = { ...NEUTRAL_STATE, emotionalStability: 1 };
    const { delta, reasons } = currentStateScore(task, state);
    expect(delta).toBeLessThan(0);
    expect(reasons.some((r) => r.includes("Emotionally heavy"))).toBe(true);
  });

  // ── New rules: motivation master-gate + mental/emotional outweigh physical ──

  it("motivation gate: a demanding task at motivation 1-2 is a hard mismatch", () => {
    const task = makeTask({ cognitiveLoad: "Medium" }); // above pure-low = demanding
    const state = { ...NEUTRAL_STATE, motivation: 1 };
    const { delta, hardMismatch } = currentStateScore(task, state);
    expect(hardMismatch).toBe(true);
    expect(delta).toBeLessThan(0);
  });

  it("motivation gate: a genuinely gentle task survives low motivation", () => {
    const task = makeTask({ cognitiveLoad: "Low", physicalLoad: "Low", emotionalLoad: "Low" });
    const state = { ...NEUTRAL_STATE, motivation: 1 };
    const { delta, hardMismatch } = currentStateScore(task, state);
    expect(hardMismatch).toBe(false);
    expect(delta).toBeGreaterThan(0);
  });

  it("mental clarity 3 (not just 1-2) penalises a high-cognitive task, and it's a hard mismatch", () => {
    const task = makeTask({ cognitiveLoad: "High" });
    const state = { ...NEUTRAL_STATE, mentalClarity: 3 };
    const { delta, hardMismatch } = currentStateScore(task, state);
    expect(delta).toBeLessThan(0);
    expect(hardMismatch).toBe(true);
  });

  it("emotional stability 3 penalises a high-emotional task, and it's a hard mismatch", () => {
    const task = makeTask({ emotionalLoad: "High" });
    const state = { ...NEUTRAL_STATE, emotionalStability: 3 };
    const { delta, hardMismatch } = currentStateScore(task, state);
    expect(delta).toBeLessThan(0);
    expect(hardMismatch).toBe(true);
  });

  it("mental/emotional load outweighs physical (bigger penalty)", () => {
    const highCog = currentStateScore(makeTask({ cognitiveLoad: "High" }), { ...NEUTRAL_STATE, mentalClarity: 2 }).delta;
    const highEmo = currentStateScore(makeTask({ emotionalLoad: "High" }), { ...NEUTRAL_STATE, emotionalStability: 2 }).delta;
    const highPhys = currentStateScore(makeTask({ physicalLoad: "High" }), { ...NEUTRAL_STATE, physicalEnergy: 2 }).delta;
    expect(highCog).toBeLessThan(highPhys); // -32 < -20
    expect(highEmo).toBeLessThan(highPhys);
  });

  it("neutral state produces no hard mismatch", () => {
    const task = makeTask({ cognitiveLoad: "High", emotionalLoad: "High" });
    const { hardMismatch } = currentStateScore(task, { ...NEUTRAL_STATE, mentalClarity: 4, emotionalStability: 4, motivation: 4 });
    expect(hardMismatch).toBe(false);
  });

  it("penalises social task when emotional stability is low (proxy for social capacity)", () => {
    const task = makeTask({ socialRequired: true });
    const state = { ...NEUTRAL_STATE, emotionalStability: 2 };
    const { delta, reasons } = currentStateScore(task, state);
    expect(delta).toBeLessThan(0);
    expect(reasons.some((r) => r.includes("social task"))).toBe(true);
  });

  it("clamps delta to [-60, +60]", () => {
    // Worst case: all signals fire negatively
    const task = makeTask({ cognitiveLoad: "High", physicalLoad: "High", emotionalLoad: "High", socialRequired: true });
    const state = { physicalEnergy: 1, mentalClarity: 1, emotionalStability: 1, creativeFlow: 1, motivation: 1 };
    const { delta } = currentStateScore(task, state);
    expect(delta).toBeGreaterThanOrEqual(-60);
    expect(delta).toBeLessThanOrEqual(60);
  });
});

// ── Integration: scoreTasks with currentState ────────────────────────────────

describe("scoreTasks with currentState", () => {
  it("ranks creative task higher than non-creative when creative flow is high", () => {
    const creative = makeTask({ id: 1, creativeRequired: true });
    const plain = makeTask({ id: 2, creativeRequired: false });
    const state = { ...NEUTRAL_STATE, creativeFlow: 5 };
    const result = scoreTasks([plain, creative], {
      todayMode: "Build",
      todayDate: TODAY,
      currentState: state,
    });
    expect(result[0].id).toBe(1); // creative task should rank first
  });

  it("ranks low-cognitive task higher when mental clarity is low", () => {
    const easy = makeTask({ id: 1, cognitiveLoad: "Low" });
    const hard = makeTask({ id: 2, cognitiveLoad: "High" });
    const state = { ...NEUTRAL_STATE, mentalClarity: 1 };
    const result = scoreTasks([hard, easy], {
      todayMode: "Build",
      todayDate: TODAY,
      currentState: state,
    });
    expect(result[0].id).toBe(1); // easy task should rank first
  });

  it("does not change ranking when currentState is null (backward compat)", () => {
    const tasks = [
      makeTask({ id: 1, priority: "High" }),
      makeTask({ id: 2, priority: "Low" }),
    ];
    const withState = scoreTasks(tasks, { todayMode: "Build", todayDate: TODAY, currentState: null });
    const withoutState = scoreTasks(tasks, { todayMode: "Build", todayDate: TODAY });
    expect(withState[0].id).toBe(withoutState[0].id);
    expect(withState[1].id).toBe(withoutState[1].id);
  });

  it("pinned floor breaks the tie when two tasks fit the state equally", () => {
    // Equal state-fit (both low-load, neutral state → csBand 0) → the pinned floor decides.
    const pinned = makeTask({ id: 1, isPinned: true, cognitiveLoad: "Low" });
    const other = makeTask({ id: 2, isPinned: false, cognitiveLoad: "Low" });
    const state = { physicalEnergy: 3, mentalClarity: 3, emotionalStability: 3, creativeFlow: 3, motivation: 3 };
    const result = scoreTasks([other, pinned], { todayMode: "Build", todayDate: TODAY, currentState: state });
    expect(result[0].id).toBe(1); // equal fit → pinned floor wins
  });

  it("current state overrides the pinned floor: a badly-fitting pinned task sinks below a well-fitting one", () => {
    // Matches the engine's design ("Current State is the PRIMARY sort key — it overrides
    // everything, including the floors"). Pinned tasks render in their own section anyway.
    const pinned = makeTask({ id: 1, isPinned: true, cognitiveLoad: "High", emotionalLoad: "High", socialRequired: true });
    const easy = makeTask({ id: 2, isPinned: false, cognitiveLoad: "Low" });
    const state = { physicalEnergy: 1, mentalClarity: 1, emotionalStability: 1, creativeFlow: 1, motivation: 1 };
    const result = scoreTasks([easy, pinned], { todayMode: "Build", todayDate: TODAY, currentState: state });
    expect(result[0].id).toBe(2); // state fit dominates
  });

  it("includes Current State reason strings in scored task reasons", () => {
    const task = makeTask({ creativeRequired: true });
    const state = { ...NEUTRAL_STATE, creativeFlow: 5 };
    const result = scoreTasks([task], {
      todayMode: "Build",
      todayDate: TODAY,
      currentState: state,
    });
    expect(result[0].reasons.some((r) => r.includes("high creative flow"))).toBe(true);
  });
});
