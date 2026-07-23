/**
 * ASPECT STRENGTH — drishti as a lived state (David's ruling, 2026-07-23: aspects = option A).
 *
 * THE DOCTRINE (METHOD.md, "the shape-of-the-phenomenon law"): "Whenever a classical rule collapses a
 * naturally continuous phenomenon into a binary, compute the underlying state first. The binary remains
 * available for canonical fidelity, but the narrative is driven by the state." Aspect strength is
 * inherently a gradient — how strongly one body actually gazes on another — so it earns a continuum, not
 * a yes/no. We do NOT invent that continuum: `sputaDrishti` (shadbala.ts, p.315) already computes it in
 * virupas (0–60, peaking 60 at the 7th / 180°, with the special-aspect bumps built into the curve). This
 * module only RESOLVES that classical number into a lived state the narrative can speak, plus the
 * direction of travel.
 *
 * David ruled AGAINST the two alternatives: (b) the BPHS ¼–½–¾–full bins (categorical — just four bins,
 * kept only as a strictly-textual fallback), and (c) orb-tightness on whole-sign aspects (mixes two
 * ontologies — the aspect exists by whole-sign geometry but its strength would come from degree geometry).
 *
 * FORMING vs SEPARATING (David: "approaching = building, separating = releasing") is read straight off the
 * continuous curve: the influence is FORMING if its drishti strength is rising as the aspecter moves, and
 * SEPARATING if it is falling. This needs no separate "exact-angle" model (sputa drishti has several peaks,
 * so a single exact angle is ill-defined) and it handles retrograde motion for free (negative speed).
 *
 * The narrative receives ONLY { state, trend } (+ the target). It never learns the engine used sputa
 * drishti — same contract as combustion's Solar Relationship.
 */

import { sputaDrishti } from "./shadbala.js";

const norm = (x: number) => ((x % 360) + 360) % 360;

/** The lived Influence state — the resolved band of a drishti's strength. */
export type InfluenceState = "weak" | "growing" | "moderate" | "strong" | "dominant";

/** Whether the gaze is building toward or releasing from the native. */
export type InfluenceTrend = "forming" | "separating" | "steady";

export interface AspectInfluence {
  /** Raw classical drishti in virupas (0–60), kept for canonical fidelity + tuning. */
  virupas: number;
  /** The lived state the narrative speaks. */
  state: InfluenceState;
  /** Building (rising strength) vs releasing (falling) vs holding. */
  trend: InfluenceTrend;
}

/**
 * FIRST CURVE — the virupa→state bands (David tunes by looking, as he did combustion's thresholds).
 * An even split of the 0–60 virupa range into five states; the floor below `weak` is "no aspect".
 * These are the ONLY judgement in the module — everything else is the classical curve. Tunable via
 * `server/scripts/aspect-scan.ts`.
 */
export const INFLUENCE_BANDS: ReadonlyArray<{ min: number; state: InfluenceState }> = [
  { min: 48, state: "dominant" },
  { min: 36, state: "strong" },
  { min: 24, state: "moderate" },
  { min: 12, state: "growing" },
  { min: 4, state: "weak" },
];

/** Virupas below this don't register as an aspect at all (the curve tail). */
export const INFLUENCE_FLOOR = 4;

/** Resolve a raw drishti (virupas, 0–60) to a lived state, or null below the floor. */
export function resolveInfluenceState(virupas: number): InfluenceState | null {
  if (virupas < INFLUENCE_FLOOR) return null;
  for (const b of INFLUENCE_BANDS) if (virupas >= b.min) return b.state;
  return null;
}

/**
 * The drishti one body casts on a fixed target, resolved to a lived state + its direction of travel.
 *
 * @param aspecterLon  the aspecting body's longitude (the transit)
 * @param aspecterSpeed the aspecter's longitude speed (deg/day; negative if retrograde) — sets the trend
 * @param targetLon    the target longitude (a natal point: lagna, Moon, a natal planet)
 * @returns the resolved influence, or null if no meaningful gaze (below the floor)
 */
export function aspectInfluence(
  aspecterLon: number,
  aspecterSpeed: number,
  targetLon: number,
): AspectInfluence | null {
  const arc = norm(targetLon - aspecterLon);
  const virupas = sputaDrishti(arc);
  const state = resolveInfluenceState(virupas);
  if (state == null) return null;

  // Direction of travel: compare the drishti a short step ahead along the aspecter's real motion.
  // Rising strength = forming (building), falling = separating (releasing). Retrograde falls out of
  // the sign of `aspecterSpeed` with no special case.
  const arcAhead = norm(targetLon - (aspecterLon + aspecterSpeed));
  const virupasAhead = sputaDrishti(arcAhead);
  const trend: InfluenceTrend =
    virupasAhead > virupas + 0.05 ? "forming" : virupasAhead < virupas - 0.05 ? "separating" : "steady";

  return { virupas: +virupas.toFixed(1), state, trend };
}
