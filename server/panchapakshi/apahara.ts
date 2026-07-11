import { BIRDS, type Bird, type Paksha } from "./tables.js";
import { ACTIVITIES, ACTIVITY_STRENGTH, type Activity } from "./activities.js";

/**
 * APAHARA — the sub-bird layer inside each yama. Each of the day's ten yamas subdivides
 * into five sub-windows, one per bird, each with its own activity, duration, and a
 * power = (main activity strength) × (sub activity strength).
 *
 * Encoded as LAWS, not copied tables — derived from and proven against the full
 * Astro-Vision corpus David supplied (2026-07-10: three PDFs, 196 detailed charts,
 * 4,900 sub-period rows, ZERO exceptions per law; see server/scripts/apahara-check.ts).
 * Two refinements the summaries get wrong, both corpus-proven:
 *   - the sub-bird rotation DIRECTION changes with paksha+phase (not always forward), and
 *   - the duration split of the 144-minute nominal yama changes with paksha+phase.
 */

export type Relation = "Same" | "Friend" | "Enemy";
export type Effect = "Very Good" | "Good" | "Average" | "Bad" | "Very Bad";

export type Apahara = {
  bird: Bird;
  activity: Activity;
  startMs: number;
  endMs: number;
  relation: Relation;   // sub-bird vs the birth bird, per the day-paksha friendship table
  power: number;        // main strength × sub strength (1.0 … 0.04)
  effect: Effect;
};

// Sub-bird rotation step around the fixed circle Vulture→Owl→Crow→Cock→Peacock,
// starting AT the main bird. [paksha][phase]
const STEP: Record<Paksha, { day: number; night: number }> = {
  Shukla: { day: +1, night: -1 },
  Krishna: { day: -2, night: -1 },
};

// Sub-activity cycle (first sub-activity = the yama's main activity, then follow the
// cycle). Four distinct cycles; Krishna is the reverse of Shukla per phase.
const CYCLE: Record<Paksha, { day: Activity[]; night: Activity[] }> = {
  Shukla: {
    day: ["Ruling", "Sleeping", "Dying", "Eating", "Walking"],
    night: ["Ruling", "Dying", "Walking", "Sleeping", "Eating"],
  },
  Krishna: {
    day: ["Ruling", "Walking", "Eating", "Dying", "Sleeping"],
    night: ["Ruling", "Eating", "Sleeping", "Walking", "Dying"],
  },
};

// Duration of each sub-activity in parts of the nominal 144-minute yama (each row sums
// to 144); scaled to the yama's real length. [paksha][phase][activity]
const DUR: Record<Paksha, { day: Record<Activity, number>; night: Record<Activity, number> }> = {
  Shukla: {
    day: { Ruling: 48, Eating: 30, Walking: 36, Sleeping: 18, Dying: 12 },
    night: { Ruling: 24, Eating: 30, Walking: 30, Sleeping: 24, Dying: 36 },
  },
  Krishna: {
    day: { Ruling: 18, Eating: 48, Walking: 36, Sleeping: 12, Dying: 30 },
    night: { Ruling: 18, Eating: 42, Walking: 42, Sleeping: 18, Dying: 24 },
  },
};

// Bird friendship by paksha (symmetric; remaining birds are enemies). From the corpus
// summary blocks — all five birds × both pakshas agree across sources.
const FRIENDS: Record<Paksha, Record<Bird, Bird[]>> = {
  Shukla: {
    Vulture: ["Peacock", "Owl"], Owl: ["Vulture", "Crow"], Crow: ["Owl", "Cock"],
    Cock: ["Peacock", "Crow"], Peacock: ["Vulture", "Cock"],
  },
  Krishna: {
    Vulture: ["Peacock", "Crow"], Owl: ["Crow", "Cock"], Crow: ["Owl", "Vulture"],
    Cock: ["Peacock", "Owl"], Peacock: ["Vulture", "Cock"],
  },
};

export function birdRelation(subBird: Bird, birthBird: Bird, paksha: Paksha): Relation {
  if (subBird === birthBird) return "Same";
  return FRIENDS[paksha][birthBird].includes(subBird) ? "Friend" : "Enemy";
}

/** Effect word from (relation, power) — corpus-proven mapping, zero ambiguous cells.
 *  Same-bird powers are perfect squares (1, .64, .36, .16, .04); Friend never reaches
 *  Very Bad, Enemy never reaches Very Good. */
export function effectOf(relation: Relation, power: number): Effect {
  const p = Math.round(power * 100) / 100;
  if (relation === "Same") {
    return p >= 1 ? "Very Good" : p >= 0.64 ? "Good" : p >= 0.36 ? "Average" : p >= 0.16 ? "Bad" : "Very Bad";
  }
  if (relation === "Friend") {
    return p >= 0.8 ? "Very Good" : p >= 0.48 ? "Good" : p >= 0.16 ? "Average" : "Bad";
  }
  return p >= 0.8 ? "Good" : p >= 0.4 ? "Average" : p >= 0.32 ? "Bad" : "Very Bad";
}

/**
 * The five sub-windows of one yama. `mainBird` is the chart's birth bird (the yama's
 * protagonist — same bird the main sequences track); `paksha` is the QUERY DAY's paksha.
 * Durations scale to the yama's true span (real sunrise/sunset yamas ≠ 144 min).
 */
export function computeApaharas(opts: {
  mainBird: Bird;
  mainActivity: Activity;
  paksha: Paksha;
  phase: "day" | "night";
  startMs: number;
  endMs: number;
}): Apahara[] {
  const { mainBird, mainActivity, paksha, phase, startMs, endMs } = opts;
  const step = STEP[paksha][phase];
  const cycle = CYCLE[paksha][phase];
  const dur = DUR[paksha][phase];
  const scale = (endMs - startMs) / 144;

  const startBird = BIRDS.indexOf(mainBird);
  const startAct = cycle.indexOf(mainActivity);
  const out: Apahara[] = [];
  let t = startMs;
  for (let i = 0; i < 5; i++) {
    const bird = BIRDS[(startBird + i * step + 25) % 5];
    const activity = cycle[(startAct + i) % 5];
    const minutes = dur[activity];
    const end = i === 4 ? endMs : t + minutes * scale; // last snaps to the yama edge
    const power = Math.round(ACTIVITY_STRENGTH[mainActivity] * ACTIVITY_STRENGTH[activity] * 100) / 100;
    const relation = birdRelation(bird, mainBird, paksha);
    out.push({ bird, activity, startMs: t, endMs: end, relation, power, effect: effectOf(relation, power) });
    t = end;
  }
  return out;
}
