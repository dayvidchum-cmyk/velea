/**
 * AVASHTAS — the planetary-state engine (Vol II Ch.3 + Ch.10).
 *
 * Three layers, three different questions:
 *   BALAADI    (Ch.3, p.253)  — how RIPE is this planet's karma? Degree-band in sign:
 *                               infant/adolescent/adult/old/dead. Odd signs run forward,
 *                               even signs reversed.
 *   JAGRADAADI (Ch.10, p.338) — how much POWER does the planet have? Own dignity:
 *                               awake (exalt/moola/own) = full impact, sleepy
 *                               (friend/neutral sign) = half, asleep (enemy/debilitation)
 *                               = little to none. Applied BOTH to an afflicting planet
 *                               (how hard it bites) and the afflicted (how much it bears).
 *   LAJJITAADI (Ch.10, p.336) — what STATE is the planet in, from the company it keeps?
 *                               Six states, more than one can hold at once. This is the
 *                               canonical backing for "no fixed benefic/malefic — judge by
 *                               live condition".
 *
 * Conjunction = same sign; aspect = graha drishti by sign (aspects.ts) — K&F read these
 * whole-sign throughout. Friendships are the NATURAL table (canon/planetary-friendships.json,
 * verified verbatim against Ch.10 pp.335-336: the Moon has no enemies).
 *
 * Pure: longitudes in, states out. No ephemeris, no interpretation, no UI.
 */

import { GRAHAS, type Graha, SIGN_RULER, planetDignity } from "./dignity";
import { signIndexOf, signName, type VargaCode, vargaSignOf } from "./vargas";
import { grahaAspectsSign, beneficMap } from "./aspects";
import friendshipsJson from "./canon/planetary-friendships.json";

const NAT = (friendshipsJson as {
  friendships: Record<Graha, { friends: Graha[]; neutral: Graha[]; enemies: Graha[] }>;
}).friendships;

const norm = (x: number) => ((x % 360) + 360) % 360;
const degInSign = (lon: number) => norm(lon) - signIndexOf(lon) * 30;
/** 0-based even index = odd sign (Aries=1st…). */
const isOddSign = (s: number) => s % 2 === 0;

// ── BALAADI (Ch.3, p.253) ─────────────────────────────────────────────────────────────────

export type BalaadiState = "bala" | "kumara" | "yuva" | "vriddha" | "mrita";
export const BALAADI_ENGLISH: Record<BalaadiState, string> = {
  bala: "infant", kumara: "adolescent", yuva: "adult", vriddha: "old", mrita: "dead",
};

/** 6° bands: odd signs run Bala→Mrita, even signs reversed. */
export function balaadi(lon: number): BalaadiState {
  const band = Math.min(4, Math.floor(degInSign(lon) / 6));
  const order: BalaadiState[] = ["bala", "kumara", "yuva", "vriddha", "mrita"];
  return isOddSign(signIndexOf(lon)) ? order[band] : order[4 - band];
}

// ── JAGRADAADI (Ch.10, p.338) ─────────────────────────────────────────────────────────────

export type JagradaadiState = "jagrat" | "svapna" | "sushupti";
export const JAGRADAADI_IMPACT: Record<JagradaadiState, "full" | "half" | "little"> = {
  jagrat: "full", svapna: "half", sushupti: "little",
};

/** Natural relation of `planet` toward the LORD of a sign (the Ch.10 friendship table). */
function relationToSignLord(planet: Graha, signIdx: number): "own" | "friend" | "neutral" | "enemy" {
  const lord = SIGN_RULER[signName(signIdx)];
  if (lord === planet) return "own";
  const t = NAT[planet];
  if (t.friends.includes(lord)) return "friend";
  if (t.enemies.includes(lord)) return "enemy";
  return "neutral";
}

/**
 * Jagradaadi by SIGN (works in any varga, where only the sign is known).
 * Awake: exaltation / moolatrikona-sign / own. Sleepy: friend or neutral sign.
 * Asleep: enemy or debilitation sign. (Moolatrikona is a degree-range only in D1;
 * by sign it collapses into "own" — the sign is owned by the planet in every case.)
 */
export function jagradaadiInSign(planet: Graha, signIdx: number): JagradaadiState {
  const dig = signDignity(planet, signIdx);
  if (dig === "exalted" || dig === "own") return "jagrat";
  if (dig === "debilitated" || dig === "enemy") return "sushupti";
  return "svapna";
}

export type SignDignity = "exalted" | "own" | "friend" | "neutral" | "enemy" | "debilitated";

/** Sign-level dignity (no degrees — usable in vargas). */
export function signDignity(planet: Graha, signIdx: number): SignDignity {
  // Exaltation/debilitation signs from the same canon constants dignity.ts uses.
  const d = planetDignity(planet, signIdx * 30 + 15);
  if (d === "exalted") return "exalted";
  if (d === "debilitated") return "debilitated";
  if (d === "own" || d === "moolatrikona") return "own";
  const rel = relationToSignLord(planet, signIdx);
  if (rel === "own") return "own";
  return rel;
}

// ── LAJJITAADI (Ch.10, pp.336-338) ────────────────────────────────────────────────────────

export type LajjitaadiState =
  | "lajjita"    // ashamed
  | "garvita"    // proud
  | "kshudita"   // starved
  | "trishita"   // thirsty
  | "mudita"     // delighted
  | "kshobhita"; // agitated

export interface LajjitaadiHit {
  state: LajjitaadiState;
  /** The planet(s) causing the state (empty for garvita — it's the planet's own dignity). */
  by: Graha[];
  /** How the actor reaches the planet: conjunction (same sign) or graha aspect. */
  via: "conjunction" | "aspect" | "sign" | "dignity";
  /** Jagradaadi of the strongest actor — how hard the state bites (p.339). */
  actorJagradaadi: JagradaadiState | null;
}

export interface PlanetAvashtas {
  planet: Graha;
  balaadi: BalaadiState;
  jagradaadi: JagradaadiState;
  lajjitaadi: LajjitaadiHit[];
}

const CRUEL = new Set<Graha>(["Mars", "Saturn", "Sun"]); // + waning Moon, handled below
const WATER_SIGNS = new Set([3, 7, 11]); // Cancer, Scorpio, Pisces

function isFriendOf(planet: Graha, other: Graha): boolean {
  return NAT[planet].friends.includes(other);
}
function isEnemyOf(planet: Graha, other: Graha): boolean {
  return NAT[planet].enemies.includes(other);
}

/**
 * All six Lajjitaadi states for one planet. `lonBy` must include Rahu/Ketu longitudes for
 * the Lajjita node rule. `moonBright` = the Moon counted benefic (8th bright tithi → 8th
 * dark, Ch.8 p.312); a dark Moon is a cruel planet for Kshobhita.
 */
export function lajjitaadiOf(
  planet: Graha,
  lonBy: Record<string, number>,
  moonBright: boolean,
): LajjitaadiHit[] {
  const hits: LajjitaadiHit[] = [];
  const pSign = signIndexOf(lonBy[planet]);
  const inSign = (g: string) => signIndexOf(lonBy[g]) === pSign;
  const conjunct = (g: Graha) => g !== planet && inSign(g);
  const aspecting = (g: Graha) =>
    g !== planet && grahaAspectsSign(g, signIndexOf(lonBy[g]), pSign);
  const actorJag = (gs: Graha[]): JagradaadiState | null => {
    if (!gs.length) return null;
    // Strongest actor decides the bite (p.339): jagrat > svapna > sushupti.
    const rank: JagradaadiState[] = ["jagrat", "svapna", "sushupti"];
    return gs.map((g) => jagradaadiInSign(g, signIndexOf(lonBy[g])))
      .sort((a, b) => rank.indexOf(a) - rank.indexOf(b))[0];
  };

  // #2 Garvita — exaltation or moolatrikona (degree-true, D1). (p.336)
  const dig = planetDignity(planet, lonBy[planet]);
  if (dig === "exalted" || dig === "moolatrikona") {
    hits.push({ state: "garvita", by: [], via: "dignity", actorJagradaadi: null });
  }

  // #1 Lajjita — in the 5th house conjunct Sun/Saturn/Mars, OR with a node AND Sun/Saturn/Mars.
  // The 5th-house arm needs the house, which the caller owns — exposed via lajjitaFifthHouse().
  const withNode = inSign("Rahu") || inSign("Ketu");
  const shamers = (["Sun", "Saturn", "Mars"] as Graha[]).filter((g) => conjunct(g));
  if (withNode && shamers.length) {
    hits.push({ state: "lajjita", by: shamers, via: "conjunction", actorJagradaadi: actorJag(shamers) });
  }

  // #3 Kshudita — enemy sign, OR conjunct an enemy, OR aspected by an enemy, OR conjunct Saturn.
  const starvedBySign = signDignity(planet, pSign) === "enemy";
  const starverConj = GRAHAS.filter((g) => g !== planet && conjunct(g) && (isEnemyOf(planet, g) || g === "Saturn"));
  const starverAsp = GRAHAS.filter((g) => g !== planet && !starverConj.includes(g) && aspecting(g) && isEnemyOf(planet, g));
  if (starvedBySign || starverConj.length || starverAsp.length) {
    const starvers = [...starverConj, ...starverAsp];
    hits.push({
      state: "kshudita", by: starvers,
      via: starverConj.length ? "conjunction" : starverAsp.length ? "aspect" : "sign",
      actorJagradaadi: actorJag(starvers),
    });
  }

  // #4 Trishita — in a water sign, aspected by an enemy, and NOT influenced by any auspicious
  // planet (benefic conjunction or aspect). (p.337) The benefic set is the chart-specific one
  // (Ch.8 p.312): Jupiter, Venus, the bright Moon, and UNAFFLICTED Mercury.
  if (WATER_SIGNS.has(pSign)) {
    const enemyAspecters = GRAHAS.filter((g) => g !== planet && aspecting(g) && isEnemyOf(planet, g));
    if (enemyAspecters.length) {
      const { benefic } = beneficMap(lonBy);
      const helped = GRAHAS.some((b) => b !== planet && benefic[b] && (conjunct(b) || aspecting(b)));
      if (!helped) {
        hits.push({ state: "trishita", by: enemyAspecters, via: "aspect", actorJagradaadi: actorJag(enemyAspecters) });
      }
    }
  }

  // #5 Mudita — friend's sign, OR conjunct a friend (excluding Saturn), OR aspected by a
  // natural friend, OR conjunct Jupiter.
  const delightedBySign = signDignity(planet, pSign) === "friend";
  const delighterConj = GRAHAS.filter((g) =>
    g !== planet && conjunct(g) && ((isFriendOf(planet, g) && g !== "Saturn") || g === "Jupiter"));
  const delighterAsp = GRAHAS.filter((g) =>
    g !== planet && !delighterConj.includes(g) && aspecting(g) && isFriendOf(planet, g));
  if (delightedBySign || delighterConj.length || delighterAsp.length) {
    const delighters = [...delighterConj, ...delighterAsp];
    hits.push({
      state: "mudita", by: delighters,
      via: delighterConj.length ? "conjunction" : delighterAsp.length ? "aspect" : "sign",
      actorJagradaadi: actorJag(delighters),
    });
  }

  // #6 Kshobhita — joined by the Sun, OR aspected by an enemy that is also cruel
  // (Mars, Saturn, Sun, waning Moon).
  const agitators: Graha[] = [];
  if (conjunct("Sun")) agitators.push("Sun");
  for (const g of GRAHAS) {
    if (g === planet) continue;
    const cruel = CRUEL.has(g) || (g === "Moon" && !moonBright);
    if (cruel && isEnemyOf(planet, g) && aspecting(g)) agitators.push(g);
  }
  if (agitators.length) {
    hits.push({
      state: "kshobhita", by: Array.from(new Set(agitators)),
      via: "aspect", actorJagradaadi: actorJag(agitators),
    });
  }

  return hits;
}

/**
 * The Lajjita 5th-house arm: `planet` sits in the 5th house AND is conjunct Sun/Saturn/Mars.
 * House is the caller's frame (whole-sign from lagna, or a varga lagna) — pass it in.
 */
export function lajjitaFifthHouse(
  planet: Graha,
  house: number,
  lonBy: Record<string, number>,
): LajjitaadiHit | null {
  if (house !== 5) return null;
  const pSign = signIndexOf(lonBy[planet]);
  const shamers = (["Sun", "Saturn", "Mars"] as Graha[]).filter(
    (g) => g !== planet && signIndexOf(lonBy[g]) === pSign,
  );
  if (!shamers.length) return null;
  const rank: JagradaadiState[] = ["jagrat", "svapna", "sushupti"];
  const jag = shamers
    .map((g) => jagradaadiInSign(g, signIndexOf(lonBy[g])))
    .sort((a, b) => rank.indexOf(a) - rank.indexOf(b))[0];
  return { state: "lajjita", by: shamers, via: "conjunction", actorJagradaadi: jag };
}

/**
 * Full avashta read for one planet in the rashi chart.
 * `houseOf` maps each graha to its whole-sign house (for the Lajjita 5th-house arm).
 */
export function avashtasOf(
  planet: Graha,
  lonBy: Record<string, number>,
  houseOf: Record<string, number>,
  moonBright: boolean,
): PlanetAvashtas {
  const lajj = lajjitaadiOf(planet, lonBy, moonBright);
  const fifth = lajjitaFifthHouse(planet, houseOf[planet], lonBy);
  if (fifth && !lajj.some((h) => h.state === "lajjita")) lajj.push(fifth);
  return {
    planet,
    balaadi: balaadi(lonBy[planet]),
    jagradaadi: jagradaadiInSign(planet, signIndexOf(lonBy[planet])),
    lajjitaadi: lajj,
  };
}

/** Avashtas of a planet AS PLACED IN A VARGA — sign-level only (Ch.10 p.338: a planet may be
 *  jagrat in one varga and sushupti in another). */
export function vargaState(planet: Graha, lon: number, varga: VargaCode): {
  sign: string; dignity: SignDignity; jagradaadi: JagradaadiState;
} {
  const s = vargaSignOf(lon, varga);
  return { sign: signName(s), dignity: signDignity(planet, s), jagradaadi: jagradaadiInSign(planet, s) };
}
