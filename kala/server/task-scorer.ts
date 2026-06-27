/**
 * Task Scoring Engine
 *
 * Ranks tasks for the Today card using 8 transparent factors.
 * Each scored task carries a `reasons` array so the UI can show
 * "Why this appeared" without any black-box logic.
 *
 * Factors (higher score = higher priority):
 *  1. Pinned              +1000  — user explicitly chose this for today
 *  2. Overdue             +500   — past due date
 *  3. Due today           +300   — due date is today
 *  4. Wealth Flow         +200   — directly improves revenue/cash flow
 *  5. Priority            +150 / +75 / 0   — High / Medium / Low
 *  6. Mode alignment      +100   — task mode matches today's mode
 *  7. Current State Fit   -60 to +60 — based on today's check-in dimensions
 *  8. Task age            +1 per day since creation (max 30) — surfaces older tasks
 *
 * Current State does NOT override pinned, overdue, or wealth-flow tasks.
 * It only nudges the ranking between otherwise comparable tasks.
 */

import type { Task } from "../drizzle/schema";

export type PersonalEnergy = "Low" | "Medium" | "High";

/** Subset of CheckIn dimensions used by the scorer */
export interface CurrentState {
  physicalEnergy: number;   // 1-5
  mentalClarity: number;    // 1-5
  emotionalStability: number; // 1-5
  creativeFlow: number;     // 1-5
  motivation: number;       // 1-5
}

export interface ScoredTask extends Task {
  score: number;
  reasons: string[];
}

/**
 * Calculate a Current State fit delta for a single task.
 * Returns a value in the range [-60, +60] and populates the reasons array.
 *
 * Rules follow the spec exactly:
 *  - LOW MENTAL CLARITY (1-2): boost low-cognitive tasks, penalise high-cognitive
 *  - HIGH CREATIVE FLOW (4-5): boost creative tasks
 *  - LOW PHYSICAL ENERGY (1-2): penalise physical tasks, boost seated work
 *  - HIGH PHYSICAL ENERGY (4-5): boost physical tasks
 *  - LOW MOTIVATION (1-2): boost small/low-friction tasks, penalise vague/large
 *  - HIGH EMOTIONAL STABILITY (4-5): allow hard conversations / financial review
 *  - LOW EMOTIONAL STABILITY (1-2): penalise emotionally loaded tasks
 *
 * Each rule contributes ±20 points so multiple signals can stack without
 * overwhelming the higher-priority factors (pinned = 1000, overdue = 500).
 */
export function currentStateScore(
  task: Task,
  state: CurrentState
): { delta: number; reasons: string[] } {
  let delta = 0;
  const reasons: string[] = [];

  const cogLoad = task.cognitiveLoad ?? "Medium";
  const physLoad = task.physicalLoad ?? "Low";
  const creative = task.creativeRequired ?? false;
  const social = task.socialRequired ?? false;
  const emoLoad = task.emotionalLoad ?? "Low";

  // ── Mental Clarity ──────────────────────────────────────────
  if (state.mentalClarity <= 2) {
    if (cogLoad === "Low") {
      delta += 20;
      reasons.push("Fits current state: low mental clarity / low decision load");
    } else if (cogLoad === "High") {
      delta -= 20;
      reasons.push("Deprioritised: requires high cognitive load (low mental clarity)");
    }
  }

  // ── Creative Flow ───────────────────────────────────────────
  if (state.creativeFlow >= 4 && creative) {
    delta += 20;
    reasons.push("Fits current state: high creative flow");
  }

  // ── Physical Energy ─────────────────────────────────────────
  if (state.physicalEnergy <= 2) {
    if (physLoad === "High") {
      delta -= 20;
      reasons.push("Deprioritised: physical task (low physical energy)");
    } else if (physLoad === "Low") {
      delta += 10;
      reasons.push("Fits current state: low physical load (low energy)");
    }
  } else if (state.physicalEnergy >= 4) {
    if (physLoad === "High") {
      delta += 20;
      reasons.push("Fits current state: high physical energy");
    }
  }

  // ── Motivation ──────────────────────────────────────────────
  if (state.motivation <= 2) {
    if (cogLoad === "Low" && physLoad === "Low") {
      delta += 15;
      reasons.push("Fits current state: low-friction task (low motivation)");
    } else if (cogLoad === "High" || physLoad === "High") {
      delta -= 15;
      reasons.push("Deprioritised: high-effort task (low motivation)");
    }
  }

  // ── Emotional Stability ─────────────────────────────────────
  if (state.emotionalStability >= 4) {
    if (emoLoad === "High") {
      delta += 15;
      reasons.push("Fits current state: high emotional stability");
    }
  } else if (state.emotionalStability <= 2) {
    if (emoLoad === "High") {
      delta -= 20;
      reasons.push("Deprioritised: emotionally loaded task (low emotional stability)");
    }
  }

  // ── Social capacity (using emotionalStability as proxy) ─────
  // Social tasks are deprioritised when emotional stability is low
  if (state.emotionalStability <= 2 && social) {
    delta -= 15;
    reasons.push("Deprioritised: social task (low social capacity)");
  }

  // Clamp to [-60, +60]
  delta = Math.max(-60, Math.min(60, delta));
  return { delta, reasons };
}

export function scoreTasks(
  tasks: Task[],
  opts: {
    todayMode: string;       // e.g. "Restraint"
    todayDate: string;       // YYYY-MM-DD
    personalEnergy: PersonalEnergy;
    currentState?: CurrentState | null;
  }
): ScoredTask[] {
  const { todayMode, todayDate, personalEnergy, currentState } = opts;
  const today = new Date(todayDate);

  return tasks
    .filter((t) => {
      if (t.isCompleted) return false;
      // Hard mode filter: only show tasks whose mode matches today's mode
      if (t.mode !== todayMode) return false;
      // Exclude tasks with future due dates from today's ranking
      // (they appear in the Due orb instead)
      if (t.dueDate) {
        const due = new Date(t.dueDate);
        const diffDays = Math.floor(
          (today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24)
        );
        if (diffDays < 0) return false; // Future due date
      }
      return true;
    })
    .map((task) => {
      let score = 0;
      const reasons: string[] = [];

      // 1. Pinned
      if (task.isPinned) {
        score += 1000;
        reasons.push("Pinned for today");
      }

      // 2. Overdue / 3. Due today
      if (task.dueDate) {
        // Compare as YYYY-MM-DD strings to avoid timezone issues
        const todayStr = todayDate;
        const dueStr = task.dueDate.split('T')[0];
        
        if (dueStr < todayStr) {
          // Overdue - calculate days difference
          const due = new Date(dueStr);
          const todayDate2 = new Date(todayStr);
          const diffDays = Math.floor(
            (todayDate2.getTime() - due.getTime()) / (1000 * 60 * 60 * 24)
          );
          score += 500;
          reasons.push(`Overdue by ${diffDays} day${diffDays > 1 ? "s" : ""}`);
        } else if (dueStr === todayStr) {
          score += 300;
          reasons.push("Due today");
        }
      }

      // 4. Wealth Flow
      if ((task as any).wealthFlow) {
        score += 200;
        reasons.push("Wealth flow task");
      }

      // 5. Priority
      if (task.priority === "High") {
        score += 150;
        reasons.push("High priority");
      } else if (task.priority === "Medium") {
        score += 75;
        reasons.push("Medium priority");
      }
      // Low priority adds 0 (no reason label needed)

      // 6. Mode alignment
      if (task.mode === todayMode) {
        score += 100;
        reasons.push(`Aligned with ${todayMode} mode`);
      }

      // 7. Current State Fit
      if (currentState) {
        const { delta, reasons: csReasons } = currentStateScore(task, currentState);
        score += delta;
        reasons.push(...csReasons);
      }

      // 8. Personal energy bonus (legacy — kept for backward compat)
      if (personalEnergy === "High" && task.priority === "High") {
        score += 50;
        reasons.push("Matches high energy");
      } else if (personalEnergy === "Low" && task.priority === "Low") {
        score += 50;
        reasons.push("Matches low energy");
      }

      // 9. Task age (max 30 points)
      const ageMs = today.getTime() - new Date(task.createdAt).getTime();
      const ageDays = Math.min(30, Math.floor(ageMs / (1000 * 60 * 60 * 24)));
      if (ageDays > 0) {
        score += ageDays;
        if (ageDays >= 7) {
          reasons.push(`In queue ${ageDays} days`);
        }
      }

      return { ...task, score, reasons };
    })
    .sort((a, b) => b.score - a.score);
}
