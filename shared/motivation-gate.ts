/**
 * THE LOW-DRIVE GATE — whole-check-in aware (David 2026-07-22, audit #15).
 *
 * Low motivation removes demanding tasks from "Aligned for today" so a drained day isn't
 * a wall of hard work. But motivation is not read alone: David's weighting law says the
 * mental and emotional axes OUTWEIGH physical ([[velea-checkin-weighting]]). So when those
 * two heavy faculties are strong, the native is CAPABLE — low drive is cushioned and the
 * demanding tasks stay reachable. The gate fires only when you're both low on drive AND
 * not otherwise resourced.
 *
 * One definition, imported by BOTH the server scorer (currentStateScore) and the client
 * Aligned filter (Planner) so the two can never drift.
 */
export interface MotivationGateState {
  mentalClarity: number;      // 1-5
  emotionalStability: number; // 1-5
  motivation: number;         // 1-5
}

/** Strong on the two heavy axes → the native can carry demanding work despite low drive. */
export function isCapable(s: MotivationGateState): boolean {
  return s.mentalClarity >= 4 && s.emotionalStability >= 4;
}

/** The low-drive removal/penalty fires only when drive is low AND you're not capable. */
export function lowMotivationGateActive(s: MotivationGateState): boolean {
  return s.motivation <= 2 && !isCapable(s);
}
