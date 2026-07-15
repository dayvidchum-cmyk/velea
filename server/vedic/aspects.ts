/**
 * ASPECTS — graha drishti + rashi drishti, whole-sign, exactly as K&F read them.
 *
 * GRAHA DRISHTI (Vol I; the Parashari aspects): every planet aspects the 7th sign from
 * itself; Mars additionally the 4th and 8th, Jupiter the 5th and 9th, Saturn the 3rd and
 * 10th. Counted sign-to-sign (whole-sign), 1 = the planet's own sign. Nodes are not
 * aspecters in K&F's natal method (Vol II Ch.14 notes the 5th/9th nodal aspects only as
 * a research question).
 *
 * RASHI DRISHTI (Vol I p.90, from Jaimini/BPHS): every movable sign aspects every fixed
 * sign EXCEPT the adjacent one; every fixed sign aspects every movable sign except the
 * adjacent one; the mutable (dual) signs aspect each other. Appendix IV's per-house
 * protocol asks for both kinds on every bhava.
 *
 * HELPING/HURTING: K&F's benefic set (Ch.8 p.312): Jupiter, Venus, the bright Moon
 * (8th tithi of the bright half → 8th of the dark half), unafflicted Mercury. Malefics:
 * Sun, Mars, Saturn, dark Moon, afflicted Mercury (conjunct a malefic), and the nodes.
 *
 * Pure math. No ephemeris, no interpretation.
 */

import { type Graha, GRAHAS } from "./dignity";
import { signIndexOf } from "./vargas";

const norm = (x: number) => ((x % 360) + 360) % 360;

/** Sign count from `fromSign` to `toSign`, 1-based (own sign = 1, next = 2 …). */
export function signsAway(fromSign: number, toSign: number): number {
  return ((toSign - fromSign + 12) % 12) + 1;
}

/** Does `planet`, sitting in `fromSign`, cast a graha aspect on `toSign`? */
export function grahaAspectsSign(planet: Graha, fromSign: number, toSign: number): boolean {
  const away = signsAway(fromSign, toSign);
  if (away === 7) return true;
  if (planet === "Mars") return away === 4 || away === 8;
  if (planet === "Jupiter") return away === 5 || away === 9;
  if (planet === "Saturn") return away === 3 || away === 10;
  return false;
}

/** Rashi drishti: does `fromSign` aspect `toSign`? (Vol I p.90.) */
export function rashiAspectsSign(fromSign: number, toSign: number): boolean {
  if (fromSign === toSign) return false;
  const mFrom = fromSign % 3; // 0 movable, 1 fixed, 2 dual
  const mTo = toSign % 3;
  if (mFrom === 2 && mTo === 2) return true; // duals aspect each other
  // Movable aspects fixed except the adjacent fixed (the one right after it);
  // fixed aspects movable except the adjacent movable (the one right before it).
  if (mFrom === 0 && mTo === 1) return toSign !== (fromSign + 1) % 12;
  if (mFrom === 1 && mTo === 0) return toSign !== (fromSign + 11) % 12;
  return false;
}

// ── Benefic / malefic classification (Ch.8 p.312) ────────────────────────────────────────

/** Bright Moon: from the 8th tithi of the bright half to the 8th of the dark half —
 *  i.e. Sun→Moon elongation in [90°, 270°). */
export function isMoonBright(sunLon: number, moonLon: number): boolean {
  const elong = norm(moonLon - sunLon);
  return elong >= 90 && elong < 270;
}

/** Mercury is afflicted when conjunct (same sign) a natural malefic. */
export function isMercuryAfflicted(lonBy: Record<string, number>, moonBright: boolean): boolean {
  const mSign = signIndexOf(lonBy.Mercury);
  const malefics: string[] = ["Sun", "Mars", "Saturn", "Rahu", "Ketu", ...(moonBright ? [] : ["Moon"])];
  return malefics.some((g) => lonBy[g] != null && signIndexOf(lonBy[g]) === mSign);
}

export interface BeneficMap {
  /** true = benefic (helping), false = malefic (hurting), for each graha in THIS chart. */
  benefic: Record<Graha, boolean>;
  moonBright: boolean;
  mercuryAfflicted: boolean;
}

/** The chart-specific benefic/malefic split (Moon by paksha, Mercury by association). */
export function beneficMap(lonBy: Record<string, number>): BeneficMap {
  const moonBright = isMoonBright(lonBy.Sun, lonBy.Moon);
  const mercuryAfflicted = isMercuryAfflicted(lonBy, moonBright);
  return {
    benefic: {
      Sun: false, Mars: false, Saturn: false,
      Jupiter: true, Venus: true,
      Moon: moonBright,
      Mercury: !mercuryAfflicted,
    },
    moonBright,
    mercuryAfflicted,
  };
}

// ── Whole-chart aspect queries (the research builder's workhorses) ───────────────────────

export interface AspectOnSign {
  planet: Graha;
  kind: "graha" | "rashi";
  /** true = helping, false = hurting (chart-specific benefic map). */
  helping: boolean;
}

/** Every graha aspect landing on `toSign` from the chart's planets. */
export function grahaAspectsOnSign(
  toSign: number,
  lonBy: Record<string, number>,
  benefic: Record<Graha, boolean>,
): AspectOnSign[] {
  return GRAHAS.filter((g) => grahaAspectsSign(g, signIndexOf(lonBy[g]), toSign)).map((g) => ({
    planet: g, kind: "graha" as const, helping: benefic[g],
  }));
}

/** Every planet rashi-aspecting `toSign` (by the sign it occupies). */
export function rashiAspectsOnSign(
  toSign: number,
  lonBy: Record<string, number>,
  benefic: Record<Graha, boolean>,
): AspectOnSign[] {
  return GRAHAS.filter((g) => rashiAspectsSign(signIndexOf(lonBy[g]), toSign)).map((g) => ({
    planet: g, kind: "rashi" as const, helping: benefic[g],
  }));
}
