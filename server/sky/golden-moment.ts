/**
 * GOLDEN MOMENT — the universal/collective layer (INTERNAL name; never surfaced
 * to users by that name — see references/velea-universal-vs-chart-internal.md).
 *
 * Pure derivation: turns the raw current sky (server/sky/current-sky.ts) into a
 * ranked list of Signals. It does NOT touch the day mode, the ranking, or the
 * narrative — those wire it in later (Phase 3). See references/golden-moment-spec.md.
 *
 * First principle: the Moon is the day trigger; these slow-planet signals are the
 * STAGE. They modulate (rank + qualifier lean + advisory), never override.
 *
 * Decisions locked 2026-06-30:
 *  - Base mode never changes; a signal may only lean the QUALIFIER.
 *  - Scope: Jupiter/Saturn/nodes as the slow stage, PLUS Mercury/Venus/Mars when
 *    retrograde, PLUS eclipses.
 *  - Eclipse window: |daysAway| <= 10.
 */

import type { TaskMode } from "../../shared/types";
import type { Task } from "../../drizzle/schema";
import type { CurrentSky } from "./current-sky";
import { PLANET_KEYWORDS } from "../layers/time-lord-theme";

export type SignalKind = "retrograde" | "station" | "natal-hit" | "lit-house" | "eclipse";
export type SignalDirection = "favor" | "caution";
export type QualifierLean = "review" | "caution" | "expand" | "consolidate" | "release";

export interface GoldenMomentSignal {
  kind: SignalKind;
  planet?: string;
  natalPoint?: string;
  house?: number | null;
  eclipseType?: "solar" | "lunar";
  daysAway?: number;
  direction: SignalDirection;
  /** Life area / planet nature the signal speaks to. */
  domain: string;
  /** Magnitude 0..1 — Phase 3 ranking aggregates these into a [0.7,1.4] multiplier. */
  weight: number;
  /** Task modes this signal favors / dampens (for the soft ranking multiplier). */
  favorModes: TaskMode[];
  opposeModes: TaskMode[];
  /** How it may nudge the day's qualifier (never the base mode). */
  qualifierLean: QualifierLean | null;
  /** One-line, practical, non-alarming read. */
  summary: string;
}

const ORD = ["", "1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th", "9th", "10th", "11th", "12th"];
const HOUSE_TITLE: Record<number, string> = {
  1: "self", 2: "money & voice", 3: "communication", 4: "home & roots", 5: "creativity & children",
  6: "work, service & health", 7: "partnership", 8: "transformation & depth", 9: "belief & fortune",
  10: "career & standing", 11: "gains & network", 12: "release & retreat",
};

// Planet nature → the domain it speaks to and the modes its FORWARD motion favors.
const PLANET_INFO: Record<string, { domain: string; forwardFavor: TaskMode[] }> = {
  Sun: { domain: "authority and visibility", forwardFavor: ["Action"] },
  Mercury: { domain: "communication, contracts, and details", forwardFavor: ["Action", "Selective"] },
  Venus: { domain: "love, money, and value", forwardFavor: ["Selective", "Build"] },
  Mars: { domain: "drive and initiative", forwardFavor: ["Action"] },
  Jupiter: { domain: "growth, learning, and opportunity", forwardFavor: ["Action", "Build"] },
  Saturn: { domain: "structure, discipline, and limits", forwardFavor: ["Build", "Restraint"] },
  Rahu: { domain: "ambition and new hunger", forwardFavor: ["Action", "Selective"] },
  Ketu: { domain: "release and letting go", forwardFavor: ["Restraint"] },
};

// Planets whose retrograde is a caution signal (nodes are always retrograde, so excluded).
const RETRO_ELIGIBLE = new Set(["Mercury", "Venus", "Mars", "Jupiter", "Saturn"]);
// The genuinely slow movers, used for natal-hit and lit-house signals.
const SLOW = new Set(["Jupiter", "Saturn", "Rahu", "Ketu"]);
// Chart-defining natal points worth a hit signal (matches the transit-pressure layer).
const CORE_POINTS = new Set(["Sun", "Moon", "Lagna"]);

// How a slow planet's conjunction to a core natal point reads.
const HIT_CONFIG: Record<string, {
  direction: SignalDirection; favor: TaskMode[]; oppose: TaskMode[]; lean: QualifierLean | null; read: string;
}> = {
  Saturn: { direction: "caution", favor: ["Build", "Restraint"], oppose: ["Action"], lean: "consolidate", read: "a season of pressure and consolidation — go slow and honor limits" },
  Jupiter: { direction: "favor", favor: ["Action", "Build"], oppose: [], lean: "expand", read: "an opening to grow — room to say yes" },
  Rahu: { direction: "caution", favor: ["Action", "Selective"], oppose: ["Restraint"], lean: null, read: "amplified drive and restlessness — aim it deliberately" },
  Ketu: { direction: "caution", favor: ["Restraint"], oppose: ["Action"], lean: "release", read: "a pull to detach and let go" },
};

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/**
 * Derive the Golden Moment signals for a computed sky. `litHouses` are the houses
 * considered emphasized this year (typically [1, 10, activatedProfectionHouse]);
 * defaults to [1, 10] when the caller doesn't supply the profection house.
 */
export function computeGoldenMoment(
  sky: CurrentSky,
  opts?: { litHouses?: number[] },
): GoldenMomentSignal[] {
  const lit = new Set(opts?.litHouses ?? [1, 10]);
  const out: GoldenMomentSignal[] = [];

  for (const p of sky.planets) {
    const info = PLANET_INFO[p.planet];
    if (!info) continue;

    // ── Retrograde (caution: review over push) ──
    if (RETRO_ELIGIBLE.has(p.planet) && p.isRetrograde) {
      out.push({
        kind: "retrograde", planet: p.planet, direction: "caution", domain: info.domain,
        weight: 0.5, favorModes: ["Build", "Selective"], opposeModes: info.forwardFavor,
        qualifierLean: "review",
        summary: `${p.planet} retrograde — favor reviewing and revisiting ${info.domain} over pushing it forward.`,
      });
    }

    // ── Station (the loudest days of a retro cycle) ──
    if (p.station && Math.abs(p.station.daysAway) <= 3) {
      out.push({
        kind: "station", planet: p.planet, daysAway: p.station.daysAway, direction: "caution", domain: info.domain,
        weight: 0.7, favorModes: ["Build", "Selective"], opposeModes: info.forwardFavor,
        qualifierLean: "review",
        summary: `${p.planet} ${p.station.type} ${p.station.daysAway <= 0 ? "just now" : `in ${p.station.daysAway} days`} — its themes (${info.domain}) are especially loud.`,
      });
    }

    // ── Slow-planet signals: natal hits + lit house ──
    if (SLOW.has(p.planet)) {
      for (const h of p.hits) {
        if (!CORE_POINTS.has(h.natalPoint)) continue;
        const cfg = HIT_CONFIG[p.planet];
        const tight = h.orb <= 1;
        out.push({
          kind: "natal-hit", planet: p.planet, natalPoint: h.natalPoint, direction: cfg.direction, domain: info.domain,
          weight: tight ? 0.9 : 0.6, favorModes: cfg.favor, opposeModes: cfg.oppose, qualifierLean: cfg.lean,
          summary: `${p.planet} is on your natal ${h.natalPoint} (${h.orb}°) — ${cfg.read}.`,
        });
      }
      if (p.house != null && lit.has(p.house)) {
        out.push({
          kind: "lit-house", planet: p.planet, house: p.house, direction: "favor", domain: info.domain,
          weight: 0.4, favorModes: info.forwardFavor, opposeModes: [], qualifierLean: null,
          summary: `${p.planet} is moving through your ${ORD[p.house]} house (${HOUSE_TITLE[p.house]}) — that area is emphasized this season.`,
        });
      }
    }
  }

  // ── Eclipses (universal; caution near beginnings, favor release) ──
  for (const e of sky.eclipses) {
    if (Math.abs(e.daysAway) > 10) continue;
    const closeness = 1 - Math.min(Math.abs(e.daysAway), 10) / 10; // 0..1
    out.push({
      kind: "eclipse", eclipseType: e.type, daysAway: e.daysAway, direction: "caution",
      domain: e.type === "solar" ? "beginnings" : "culminations and release",
      weight: 0.5 + 0.4 * closeness,
      favorModes: ["Restraint", "Build"], opposeModes: ["Action"], qualifierLean: "caution",
      summary: `${cap(e.type)} eclipse ${e.daysAway <= 0 ? "just passed" : `in ${e.daysAway} days`} — hold major beginnings; favor finishing and release.`,
    });
  }

  out.sort((a, b) => b.weight - a.weight);
  return out;
}

// ── Ranking effect (Phase 3b) ────────────────────────────────────────────────
// Turn the signals into a bounded multiplier on a task's SOFT subscore. This is
// how the stage nudges which tasks rise — never touching the mode filter or the
// pinned/overdue/due floors. Two nudges combine: a gentle mode-based one (favors/
// opposes today's mode) and a stronger content-based one (a signal's planet
// domain matching the task's text), so it actually re-orders within a mode.

// Words that read as "beginning" vs "finishing" — used for eclipse windows.
const LAUNCH_WORDS = ["launch", "start", "publish", "announce", "open", "begin", "kickoff", "send", "ship", "post", "pitch"];
const FINISH_WORDS = ["finish", "close", "wrap", "complete", "archive", "cancel", "end", "review", "edit", "revise", "cleanup", "release"];

export function goldenMomentEffect(
  task: Task & { projectName?: string | null },
  signals: GoldenMomentSignal[] | null | undefined,
): { multiplier: number; bubbles: string[] } {
  if (!signals || signals.length === 0) return { multiplier: 1, bubbles: [] };

  const mode = task.mode as TaskMode;
  const raw = `${task.title ?? ""} ${task.projectName ?? ""}`.toLowerCase();
  const words = new Set(raw.split(/[^a-z]+/).filter(Boolean));
  const hasAny = (list: string[]) => list.some((w) => words.has(w) || raw.includes(w));
  const matchesPlanet = (planet: string) =>
    (PLANET_KEYWORDS[planet as keyof typeof PLANET_KEYWORDS] ?? []).some((k) =>
      k.includes(" ") || k.includes("-") ? raw.includes(k) : words.has(k),
    );

  let mult = 1;
  const bubbles: string[] = [];
  const seen = new Set<string>();
  const addBubble = (l: string) => { if (!seen.has(l)) { seen.add(l); bubbles.push(l); } };

  for (const sig of signals) {
    // Gentle mode-based nudge (uniform across a mode; mostly balances vs floors).
    if (sig.favorModes.includes(mode)) mult *= 1 + 0.08 * sig.weight;
    else if (sig.opposeModes.includes(mode)) mult *= 1 - 0.08 * sig.weight;

    // Content-based nudge — what actually re-orders within a mode.
    if (sig.kind === "eclipse") {
      if (hasAny(LAUNCH_WORDS)) mult *= 1 - 0.15 * sig.weight;
      else if (hasAny(FINISH_WORDS)) { mult *= 1 + 0.12 * sig.weight; addBubble("eclipse: finish"); }
    } else if (sig.planet && matchesPlanet(sig.planet)) {
      if (sig.direction === "favor") { mult *= 1 + 0.15 * sig.weight; addBubble(`${sig.planet} favors`); }
      else mult *= 1 - 0.15 * sig.weight; // caution: dampen, no bubble (never disclose why lower)
    }
  }

  mult = Math.max(0.7, Math.min(1.4, mult)); // locked clamp
  return { multiplier: mult, bubbles: bubbles.slice(0, 2) };
}

// ── The verdict: Golden Moment (universal) × Check-In (personal) ─────────────
// Fuses the two signals into one go/hold call, per references/velea-concept.md's
// matrix. INTERNAL machinery — the verdict text is user-facing, the names aren't.

export type VerdictLevel = "favorable" | "neutral" | "unfavorable";

export interface Verdict {
  call: string;              // headline (Go all in / Hold / Mixed / Proceed with judgment / weather-only)
  summary: string;           // one-line plain read
  universalLevel: VerdictLevel;
  personalLevel: VerdictLevel | "unknown";
  forPersonal: string | null;    // guidance for high-stakes / personal acts
  forCollective: string | null;  // guidance for launches / sends / collective acts
  hasCheckIn: boolean;
}

/** Net universal favorability from the signals (favor − caution, weighted). */
export function universalLevel(signals: GoldenMomentSignal[]): VerdictLevel {
  let net = 0;
  for (const s of signals) net += s.direction === "favor" ? s.weight : -s.weight;
  if (net > 0.4) return "favorable";
  if (net < -0.4) return "unfavorable";
  return "neutral";
}

/** Personal readiness from the Check-In's 5-measure average (null = no check-in). */
export function personalLevel(checkInAvg: number | null): VerdictLevel | "unknown" {
  if (checkInAvg == null) return "unknown";
  if (checkInAvg >= 3.7) return "favorable";
  if (checkInAvg <= 2.3) return "unfavorable";
  return "neutral";
}

export function computeVerdict(signals: GoldenMomentSignal[], checkInAvg: number | null): Verdict {
  const u = universalLevel(signals);
  const p = personalLevel(checkInAvg);
  const hasCheckIn = checkInAvg != null;

  // No check-in → universal-only read (the display adds the "check in for your full call" prompt).
  if (p === "unknown") {
    const call = u === "favorable" ? "The day is with you"
      : u === "unfavorable" ? "Choppy weather"
      : "A neutral day";
    const summary = u === "favorable" ? "The slower planets are supportive — a good backdrop to act on."
      : u === "unfavorable" ? "The backdrop is unsettled — favor review and finishing over new pushes."
      : "No strong weather either way — go by your own read.";
    return { call, summary, universalLevel: u, personalLevel: p, forPersonal: null, forCollective: null, hasCheckIn };
  }

  const both = (a: VerdictLevel) => p === a && u === a;
  if (both("favorable")) {
    return { call: "Go all in", summary: "Inner and outer are aligned — the strongest day to act, launch, and decide.", universalLevel: u, personalLevel: p, forPersonal: "Make the high-stakes call.", forCollective: "Launch and send freely.", hasCheckIn };
  }
  if (both("unfavorable")) {
    return { call: "Hold", summary: "Neither you nor the day is set up to push — repair, rest, or quiet behind-the-scenes work.", universalLevel: u, personalLevel: p, forPersonal: "Postpone anything that matters.", forCollective: "Hold launches and sends.", hasCheckIn };
  }

  // Disagreement (or a neutral axis) → mixed call with the task-type split.
  const personalStrong = p === "favorable";
  const universalStrong = u === "favorable";
  const forPersonal = personalStrong
    ? "You're ready — trust yourself on high-stakes and personal moves."
    : p === "unfavorable"
      ? "Hold high-stakes and personal decisions until you're steadier."
      : "Personal moves: fine if the specific one feels right.";
  const forCollective = universalStrong
    ? "The moment carries it — send what's ready and show up to collective things."
    : u === "unfavorable"
      ? "Hold launches and sends a beat; favor finishing what's moving."
      : "Launches: proceed if already in motion, don't force new ones.";

  const call = (p === "neutral" && u === "neutral") ? "Proceed with judgment" : "Mixed — depends on the act";
  const summary = personalStrong
    ? "You're readier than the day is — lean on your own high-stakes calls, ease off launches."
    : universalStrong
      ? "The day is readier than you are — send what's prepared, hold the high-stakes personal stuff."
      : "A judgment day — no strong push either way; act where it's already moving.";
  return { call, summary, universalLevel: u, personalLevel: p, forPersonal, forCollective, hasCheckIn };
}
