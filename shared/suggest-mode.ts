// Suggests a task's DAY MODE from its own fingerprint — deterministic, no API.
// David's law (2026-07-10): ACTION owns the NEW — initiating, launching, first
// contact, anything without a history. The other three modes all tend what
// already exists: Build constructs it, Selective advances it, Restraint repairs
// and closes it. So the first question is always new-vs-existing, then the
// loads sort the existing.
import type { TaskMode } from "./types";

const NEW_WORDS = /\b(start|begin|launch|create|new|pitch|publish|post|announce|apply|sign\s*up|register|reach\s*out|cold|introduce|kick\s*off|found|open(?!\s*(the|up)?\s*(mail|box|door))|first)\b/i;
const TEND_WORDS = /\b(finish|fix|repair|clean|tidy|close|pay|renew|follow\s*up|continue|review|edit|revise|update|practice|maintain|organi[sz]e|sort|file|reply|respond|schedule|reschedule|cancel|return|declutter|rest)\b/i;

export function suggestTaskMode(input: {
  title: string;
  cognitiveLoad?: string | null;   // Low | Medium | High
  physicalLoad?: string | null;
  emotionalLoad?: string | null;
  creativeRequired?: boolean | null;
  socialRequired?: boolean | null;
  recurrence?: string | null;      // none | daily | ...
  projectId?: number | null;
  /** Declared by the user: true = initiating something NEW to their story; false = already in motion. Outranks title heuristics. */
  isNewVenture?: boolean | null;
}): { mode: TaskMode; reason: string } {
  const t = input.title ?? "";
  const recurring = !!input.recurrence && input.recurrence !== "none";
  const isNew = input.isNewVenture === true
    ? true
    : input.isNewVenture === false
    ? false
    : NEW_WORDS.test(t) && !TEND_WORDS.test(t) && !recurring;

  // The NEW belongs to Action — regardless of loads.
  if (isNew) return { mode: "Action", reason: "starts something new" };

  const high = (v?: string | null) => v === "High";
  const low = (v?: string | null) => v == null || v === "Low";

  // Existing + outward/social → advancing a live thread.
  if (input.socialRequired) return { mode: "Selective", reason: "advances a live conversation" };

  // Existing + heavy cognitive/creative construction → Build.
  if (high(input.cognitiveLoad) || input.creativeRequired) return { mode: "Build", reason: "deep construction on what exists" };

  // Explicit tending/closing language, recurring upkeep, or an all-light task → Restraint.
  if (TEND_WORDS.test(t) || recurring || (low(input.cognitiveLoad) && low(input.physicalLoad) && low(input.emotionalLoad)))
    return { mode: "Restraint", reason: "tends, repairs, or closes" };

  // Middle-weight work on something already in motion.
  return { mode: "Selective", reason: "moves existing work forward" };
}
