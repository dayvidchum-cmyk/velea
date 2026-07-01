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
import type { TaskMode } from "../shared/types";
import type { CurrentLayers, TransitingPlanet } from "./layers/types";
import { themeMatchesTask } from "./layers/time-lord-theme";
import { goldenMomentEffect, type GoldenMomentSignal } from "./sky/golden-moment";
import { housesForAreas, matchedAreaLabels, parseLifeAreas } from "../shared/life-areas";

export type PersonalEnergy = "Low" | "Medium" | "High";

/**
 * Layer 3 transit → task-mode effect map (Conflict-Q3 confirmed):
 *   Saturn favors Restraint/Build, opposes Action.
 *   Rahu   favors Action/Selective, opposes Restraint.
 *   Ketu   favors Restraint,        opposes Action.
 * Favored → ×1.1 (and a positive bubble). Opposed → ×0.85 (no bubble shown).
 */
const TRANSIT_MODE_EFFECT: Record<TransitingPlanet, { favor: TaskMode[]; oppose: TaskMode[] }> = {
  Saturn: { favor: ["Restraint", "Build"], oppose: ["Action"] },
  Rahu: { favor: ["Action", "Selective"], oppose: ["Restraint"] },
  Ketu: { favor: ["Restraint"], oppose: ["Action"] },
};

/**
 * Compute the layer multiplier applied to a task's SOFT subscore, plus the
 * positive-only disclosure bubbles (max 3). Layers never touch the additive
 * floors (pinned/overdue/due-today). Returns multiplier 1 + no bubbles when
 * layers are absent (graceful degradation).
 */
export function layerEffect(
  task: Task,
  layers: CurrentLayers | null | undefined
): { multiplier: number; bubbles: string[] } {
  if (!layers) return { multiplier: 1, bubbles: [] };

  let multiplier = 1;
  const bubbles: string[] = [];
  const seen = new Set<string>();
  const addBubble = (label: string) => {
    if (!seen.has(label)) { seen.add(label); bubbles.push(label); }
  };

  // Layer 2 — Time Lord theme alignment
  if (layers.timeLordPeriod && themeMatchesTask(layers.timeLordPeriod, task)) {
    multiplier *= 1.2;
    addBubble(`${layers.timeLordPeriod.mahaDasha} theme`);
  }

  // Layer 3 — Transit pressure (compounds per active transit)
  const mode = task.mode as TaskMode;
  for (const t of layers.transits.active) {
    const effect = TRANSIT_MODE_EFFECT[t.transitingPlanet];
    if (!effect) continue;
    if (effect.favor.includes(mode)) {
      multiplier *= 1.1;
      addBubble(`${t.transitingPlanet} pressure`);
    } else if (effect.oppose.includes(mode)) {
      multiplier *= 0.85; // no bubble — we never disclose why something ranked lower
    }
  }

  return { multiplier, bubbles: bubbles.slice(0, 3) };
}

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
  /** Positive-only layer disclosure chips (max 3), e.g. "Venus theme", "Saturn pressure". */
  layerBubbles: string[];
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
    /** Pressure layers — multiply only the soft subscore; never the floors. */
    layers?: CurrentLayers | null;
    /** The day's domain house(s) — the activated house from the panchang. */
    dayHouses?: number[];
    /** projectId → the project's life-area keys. */
    projectAreas?: Map<number, string[]>;
    /** Golden Moment signals — slow-planet weather; a bounded soft multiplier. */
    goldenSignals?: GoldenMomentSignal[] | null;
    /** Optional global tilt from the daily verdict (opt-in setting). 1 = no effect. */
    verdictBias?: number;
  }
): ScoredTask[] {
  const { todayMode, todayDate, personalEnergy, currentState, layers, dayHouses, projectAreas, goldenSignals } = opts;
  const verdictBias = opts.verdictBias ?? 1;
  const dayHouseSet = new Set(dayHouses ?? []);
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
      // Untouchable additive floors — layers can never demote these.
      let floor = 0;
      // Soft, discretionary subscore — the only part layer multipliers scale.
      let soft = 0;
      const reasons: string[] = [];

      // 1. Pinned (floor)
      if (task.isPinned) {
        floor += 1000;
        reasons.push("Pinned for today");
      }

      // 2. Overdue / 3. Due today (floor)
      if (task.dueDate) {
        // Compare as YYYY-MM-DD strings to avoid timezone issues
        const todayStr = todayDate;
        const dueStr = task.dueDate.split('T')[0];

        if (dueStr < todayStr) {
          const due = new Date(dueStr);
          const todayDate2 = new Date(todayStr);
          const diffDays = Math.floor(
            (todayDate2.getTime() - due.getTime()) / (1000 * 60 * 60 * 24)
          );
          floor += 500;
          reasons.push(`Overdue by ${diffDays} day${diffDays > 1 ? "s" : ""}`);
        } else if (dueStr === todayStr) {
          floor += 300;
          reasons.push("Due today");
        }
      }

      // 4. Wealth Flow (soft)
      if ((task as any).wealthFlow) {
        soft += 75;
        reasons.push("Wealth flow task");
      }

      // 5. Priority (soft)
      if (task.priority === "High") {
        soft += 150;
        reasons.push("High priority");
      } else if (task.priority === "Medium") {
        soft += 75;
        reasons.push("Medium priority");
      }

      // 6. Mode alignment (soft) — the strongest discretionary signal.
      if (task.mode === todayMode) {
        soft += 200;
        reasons.push(`Aligned with ${todayMode} mode`);
      }

      // 7. Current State Fit — computed here for reasons; applied as a dominant
      // OVERRIDE band below (not a soft nudge).
      const cs = currentState ? currentStateScore(task, currentState) : null;
      if (cs) reasons.push(...cs.reasons);

      // 8. Personal energy bonus (soft, legacy)
      if (personalEnergy === "High" && task.priority === "High") {
        soft += 50;
        reasons.push("Matches high energy");
      } else if (personalEnergy === "Low" && task.priority === "Low") {
        soft += 50;
        reasons.push("Matches low energy");
      }

      // 9. Task age (soft, max 30 points)
      const ageMs = today.getTime() - new Date(task.createdAt).getTime();
      const ageDays = Math.min(30, Math.floor(ageMs / (1000 * 60 * 60 * 24)));
      if (ageDays > 0) {
        soft += ageDays;
        if (ageDays >= 7) {
          reasons.push(`In queue ${ageDays} days`);
        }
      }

      // 10. Domain alignment (soft) — the day's activated house surfaces tasks
      // whose OWN life areas map to it ("the song"). Weighted comparably to a
      // strong day-mode match so aligned work rises in "Why now?".
      if (dayHouseSet.size > 0) {
        const keys = parseLifeAreas((task as any).lifeAreas ?? null);
        if (keys.length > 0) {
          const taskHouses = housesForAreas(keys);
          if (taskHouses.some((h) => dayHouseSet.has(h))) {
            soft += 120;
            const labels = matchedAreaLabels(Array.from(dayHouseSet), keys);
            if (labels.length > 0) {
              reasons.push(`Today's ${labels[0]} focus`);
            }
          }
        }
      }

      // Pressure layers + Golden Moment scale ONLY the soft subscore; floors preserved.
      const { multiplier, bubbles } = layerEffect(task, layers);
      const gm = goldenMomentEffect(task, goldenSignals);
      // Current State OVERRIDE: a dominant discretionary band (×10) so how you feel
      // outweighs the other soft signals (priority, domain, age…). Hard floors
      // (pinned/overdue/due-today) remain a strict tier above it via the sort below.
      const csBand = cs ? cs.delta * 10 : 0;
      const disc = csBand + soft * multiplier * gm.multiplier * verdictBias;
      const score = floor + disc;

      return { ...task, score, reasons, layerBubbles: [...bubbles, ...gm.bubbles].slice(0, 3), _floor: floor, _disc: disc };
    })
    // Floors are a strict tier; within a tier, Current State fit dominates ordering.
    .sort((a, b) => (b._floor - a._floor) || (b._disc - a._disc))
    .map(({ _floor, _disc, ...t }) => t);
}
