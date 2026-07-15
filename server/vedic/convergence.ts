/**
 * CONVERGENCE TIMELINE — Appendix IV Step 15, precomputed for the whole life.
 *
 * David's directive #3 (2026-07-15): "when a Velea user profile is created it must store
 * convergence data." This is the join of directives #1 and #2: the research says what each
 * planet touches in THIS chart; the dasha tree says when each planet rules time; convergence
 * is where they agree — "when the MahaDasha lord and sub-cycle lords indicate similar events,
 * predict that event; the more sub-cycles that agree, the better the probability."
 *
 * ONE LAW, NOT TWO: the tie definition (a period-lord counts only when ACTIVELY tied — in the
 * theme's house, conjunct its lord, or aspecting its lord; never bare title) lives in
 * knots.ts buildKnots (the v430 rebuild, Simone-validated). This module does not re-implement
 * it — it CALLS buildKnots once per distinct (maha, antar, pratyantar) lord-triple and maps
 * the dasha spans onto the results. At most 729 distinct triples exist; the whole timeline
 * computes in milliseconds.
 *
 * WHAT IS STORED IS BIRTH-STABLE. The stored `lit` is the STANDING rule only
 * (maha-tied ∧ convergence ≥ 2). The event-tier arm (a dated slow-transit landing on the
 * ruler) depends on the moving sky and stays a runtime overlay — storing it would fake a
 * dated event for entire multi-year spans, the exact un-dated founding wound v430 fixed.
 *
 * Pure: chart numbers in, spans out. No ephemeris, no DB, no interpretation.
 */

import { buildKnots, type KnotTheme, type NatalPlanet } from "./knots";
import { dashaTree } from "./dasha-tree";
import { GRAHAS, type Graha, SIGN_RULER, planetDignity } from "./dignity";
import { signIndexOf, signName } from "./vargas";

export const CONVERGENCE_ENGINE_VERSION = "convergence-v1";

/** Per-theme convergence inside one pratyantar span (compact — only themes with a tie). */
export interface ThemeConvergence {
  /** Distinct period-lords (maha/antar/praty) actively tied to the theme. */
  convergence: number;
  /** The maha lord itself is one of them — Step 15 reads outward from the maha. */
  mahaTied: boolean;
  /** The standing rule: mahaTied ∧ convergence ≥ 2. Event-tier needs a live transit (runtime). */
  lit: boolean;
  /** Which period-lords are tied (deduped planet names). */
  lords: string[];
}

export interface ConvergenceSpan {
  maha: string;
  antar: string;
  pratyantar: string;
  startMs: number;
  endMs: number;
  /** Only themes with convergence ≥ 1 — quiet themes are omitted, quiet spans have {}. */
  themes: Partial<Record<KnotTheme, ThemeConvergence>>;
}

export interface ConvergenceInput {
  /** Sidereal longitudes for the 9 grahas (nodes required — they run dashas). */
  lonBy: Record<string, number>;
  /** Degree-true lagna (or Moon longitude on a Chandra chart). */
  lagnaLon: number;
  /** Exact birth instant (UTC ms) — the dasha clock. */
  birthUtcMs: number;
}

const ALL_BODIES = [...GRAHAS, "Rahu", "Ketu"];

/** The natal map buildKnots consumes, from raw longitudes (whole-sign, same frame as research). */
export function natalMapOf(lonBy: Record<string, number>, lagnaLon: number): Record<string, NatalPlanet> {
  const lagnaSignIdx = signIndexOf(lagnaLon);
  const rulesBy: Record<string, number[]> = Object.fromEntries(ALL_BODIES.map((p) => [p, []]));
  for (let h = 1; h <= 12; h++) {
    rulesBy[SIGN_RULER[signName((lagnaSignIdx + h - 1) % 12)]]?.push(h);
  }
  const out: Record<string, NatalPlanet> = {};
  for (const p of ALL_BODIES) {
    const lon = lonBy[p];
    if (lon == null) continue;
    out[p] = {
      house: ((signIndexOf(lon) - lagnaSignIdx + 12) % 12) + 1,
      sign: signName(signIndexOf(lon)),
      rulesHouses: rulesBy[p] ?? [],
      dignity: (GRAHAS as string[]).includes(p) ? planetDignity(p as Graha, lon) : undefined,
    };
  }
  return out;
}

/**
 * The full convergence timeline: one entry per pratyantar span, birth → age 120.
 * Level 3 is the Step-15 grain — the convergence law counts exactly maha/antar/praty
 * (deeper levels never tally; see knots.ts and velea-moon-double-count-fix).
 */
export function computeConvergenceTimeline(input: ConvergenceInput): ConvergenceSpan[] {
  const natal = natalMapOf(input.lonBy, input.lagnaLon);
  const spans = dashaTree(input.birthUtcMs, input.lonBy.Moon, 3).filter((p) => p.level === 3);

  // One buildKnots call per DISTINCT lord-triple; spans sharing a triple share the result.
  const cache = new Map<string, Partial<Record<KnotTheme, ThemeConvergence>>>();
  const themesFor = (maha: string, antar: string, praty: string) => {
    const key = `${maha}|${antar}|${praty}`;
    let themes = cache.get(key);
    if (!themes) {
      const { all } = buildKnots({
        natal,
        dashaLords: { maha, antar, praty },
        // Runtime-only reinforcers stay off: timelord (different system — never tallies),
        // transits (the dated event arm), meridian/yogas (prose reinforcers).
      });
      themes = {};
      for (const k of all) {
        if (k.convergence >= 1) {
          themes[k.theme] = {
            convergence: k.convergence,
            mahaTied: k.mahaTied,
            lit: k.lit,
            lords: k.activeLords,
          };
        }
      }
      cache.set(key, themes);
    }
    return themes;
  };

  return spans.map((s) => ({
    maha: s.lords[0],
    antar: s.lords[1],
    pratyantar: s.lords[2],
    startMs: s.startMs,
    endMs: s.endMs,
    themes: themesFor(s.lords[0], s.lords[1], s.lords[2]),
  }));
}
