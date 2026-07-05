// Rest gate — the check-in as a REST DECISION, not a task-effort sort key.
//
// Velea's daily read otherwise treats a low check-in as "hand them the gentlest tasks."
// But an all-floor check-in isn't "I want easy tasks" — it's a whole-person "I have nothing
// to spend today." At the floor, the aligned move is rest, not a list. So a floor reading
// trips this gate, which flips the day to Restore — above the collective sky — before any
// task list is built. The five axes each run 1–5 (see check_ins table).

export interface CheckInAxes {
  physicalEnergy: number;
  mentalClarity: number;
  emotionalStability: number;
  creativeFlow: number;
  motivation: number;
}

export interface RestGateResult {
  /** True when the check-in reads as "empty" and the day should flip to Restore. */
  tripped: boolean;
  /** Which trigger fired (for logging / a gentle one-liner), or null if none. */
  reason: string | null;
}

/**
 * Evaluate today's check-in against the floor triggers. Any ONE trips the gate.
 * A missing check-in never trips it (we don't assume rest from silence).
 *
 * Triggers (deliberately a floor BAND, not a literal 1-1-1-1-1 — "empty" is a cluster):
 *   1. Average of the five axes ≤ 1.5      — running near empty across the board
 *   2. physicalEnergy === 1 AND motivation === 1  — no fuel and no drive (can't + won't)
 *   3. 4 or more of the five axes at 1     — broad collapse, even if one thing's okay
 */
export function evaluateRestGate(c: CheckInAxes | null | undefined): RestGateResult {
  if (!c) return { tripped: false, reason: null };

  const axes = [
    c.physicalEnergy,
    c.mentalClarity,
    c.emotionalStability,
    c.creativeFlow,
    c.motivation,
  ];
  // Guard against partial/garbage rows — every axis must be a real 1–5 reading.
  if (axes.some((n) => typeof n !== "number" || Number.isNaN(n))) {
    return { tripped: false, reason: null };
  }

  const avg = axes.reduce((sum, n) => sum + n, 0) / axes.length;
  const atFloor = axes.filter((n) => n === 1).length;

  // 1. Overall empty.
  if (avg <= 1.5) return { tripped: true, reason: "You're running near empty across the board." };
  // 2. No fuel AND no drive — the can't-and-won't floor.
  if (c.physicalEnergy === 1 && c.motivation === 1) {
    return { tripped: true, reason: "No energy and no drive today." };
  }
  // 3. Broad collapse.
  if (atFloor >= 4) return { tripped: true, reason: "Almost everything's at its floor." };

  return { tripped: false, reason: null };
}
