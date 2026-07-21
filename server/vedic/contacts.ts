/**
 * ADDRESSES AND CONTACTS — every planet keeps its own address; the contact between two of them
 * is its OWN fact, not a property flattened into either one.
 *
 * WHY THIS EXISTS (David, 2026-07-20, on his own chart: "what happens if we let them separate and
 * speak, exist from the parties they are at?").
 *
 * Velea was answering "are these two conjunct?" four different ways at once, each faithful to what
 * it cites, and none of them aware of the others:
 *
 *   avashtas.ts / aspects.ts / crown.ts   conjunction = SAME SIGN     (K&F read whole-sign throughout)
 *   input-builder.ts:170                  natal list  = ORB <= 10 deg
 *   input-builder.ts:421                  transit hit = ORB <= 4 deg
 *   layers/transit-pressure.ts            transit     = ORB <= 3 deg
 *   panchang/affliction.ts                combustion  = per-planet degree limit
 *
 * On his chart the Sun sits at Pisces 29.52 and Mercury at Aries 1.34 — 1.82 apart, the tightest
 * pair in the chart. The prompt is told to read a conjunction as "ONE fused body" and gets them
 * from the 10-degree list; the state engine, the affliction test and the crown layer count by sign
 * and never see each other. So the same two planets are simultaneously fused, combust, unrelated,
 * and in different houses, in production, at the same moment.
 *
 * The fix is not to pick a winner. Forcing one boolean is what created the conflict: each module
 * wanted "conjunct: yes/no" and there is no single honest answer to that question. Report the two
 * facts separately — WHERE each planet is, and HOW FAR APART they are — and every consumer can ask
 * the question it actually needs. Nothing merges, nothing is hidden, no convention has to lose.
 *
 * It matters most exactly where the conventions disagree, and there are two such cases:
 *   THROUGH-THE-WALL  tight orb, different signs — the sign convention says "unrelated"
 *   ACROSS-THE-ROOM   same sign, wide orb        — the sign convention says "fused"
 * Both are named here rather than resolved, because both are true statements about the sky.
 *
 * Pure: longitudes + lagna in, structure out. No ephemeris, no DB, no interpretation.
 */

import { SIGN_RULER } from "./dignity";
import { signIndexOf, signName } from "./vargas";
import { NAK27 } from "../panchang/crown";
import { DASHA_SEQUENCE } from "./dasha-tree";

const norm = (x: number) => ((x % 360) + 360) % 360;
const NAK_SPAN = 360 / 27;

/** Star lord by the Vimshottari order — the same nine, in the same sequence, repeating thrice. */
const nakshatraLord = (nakIdx: number): string => DASHA_SEQUENCE[nakIdx % 9].planet;

export interface Address {
  planet: string;
  sign: string;
  /** Degrees into the sign, 0–30. */
  degInSign: number;
  /** Whole-sign house from the lagna, 1–12. */
  house: number;
  nakshatra: string;
  /** Vimshottari lord of the star it stands in. */
  nakshatraLord: string;
  /** The lord of the sign it is standing in — whose house it is a guest in. */
  host: string;
  /** Where the host itself lives, when the host is one of the bodies given. */
  hostSign: string | null;
  hostHouse: number | null;
  /** True when the planet IS the host — at home, not a guest. */
  ownHouse: boolean;
}

export type ContactKind =
  /** Same sign AND inside the orb — both conventions agree it is a conjunction. */
  | "same-party"
  /** Inside the orb but in different signs — degrees say yes, the sign convention says no. */
  | "through-the-wall"
  /** Same sign but outside the orb — the sign convention says yes, degrees say no. */
  | "across-the-room";

export interface Contact {
  a: string;
  b: string;
  /** Shortest angular separation, 0–180. */
  orbDeg: number;
  sameSign: boolean;
  sameHouse: boolean;
  kind: ContactKind;
  /** FALSE on through-the-wall and across-the-room — the two cases worth naming out loud. */
  conventionsAgree: boolean;
  /** The signs each stands in — so a reader can name the two parties without a second lookup. */
  aSign: string;
  bSign: string;
  aHouse: number;
  bHouse: number;
}

/** Shortest separation between two longitudes, 0–180. */
export function separation(a: number, b: number): number {
  return Math.abs(((norm(a) - norm(b) + 540) % 360) - 180);
}

/** Where one planet stands, in full — its own address, owing nothing to any other planet. */
export function addressOf(planet: string, lonBy: Record<string, number>, lagnaLon: number): Address {
  const lon = norm(lonBy[planet]);
  const si = signIndexOf(lon);
  const sign = signName(si);
  const host = SIGN_RULER[sign];
  const hostLon = lonBy[host] != null ? norm(lonBy[host]) : null;
  const houseOf = (l: number) => ((signIndexOf(l) - signIndexOf(lagnaLon) + 12) % 12) + 1;
  const nakIdx = Math.floor(lon / NAK_SPAN);
  return {
    planet,
    sign,
    degInSign: +(lon - si * 30).toFixed(2),
    house: houseOf(lon),
    nakshatra: NAK27[nakIdx],
    nakshatraLord: nakshatraLord(nakIdx),
    host,
    hostSign: hostLon != null ? signName(signIndexOf(hostLon)) : null,
    hostHouse: hostLon != null ? houseOf(hostLon) : null,
    ownHouse: host === planet,
  };
}

/**
 * Every contact among the given bodies, at the given orb.
 *
 * The orb DEFAULTS to 10 because that is what input-builder.ts:170 already uses for the natal
 * `conjunct` list the prompt reads — this module reports the same pairs that surface today, plus
 * the two disagreement kinds, rather than quietly introducing a different number. Pass your own
 * when a surface needs a tighter one; the orb is a caller's decision, never a hidden default.
 */
export function contactsOf(
  lonBy: Record<string, number>,
  lagnaLon: number,
  opts: { orbDeg?: number; bodies?: string[] } = {},
): Contact[] {
  const orb = opts.orbDeg ?? 10;
  const bodies = opts.bodies ?? Object.keys(lonBy);
  const lagSi = signIndexOf(lagnaLon);
  const houseOf = (l: number) => ((signIndexOf(l) - lagSi + 12) % 12) + 1;
  const out: Contact[] = [];
  for (let i = 0; i < bodies.length; i++) {
    for (let j = i + 1; j < bodies.length; j++) {
      const a = bodies[i], b = bodies[j];
      if (lonBy[a] == null || lonBy[b] == null) continue;
      const la = norm(lonBy[a]), lb = norm(lonBy[b]);
      const sa = signIndexOf(la), sb = signIndexOf(lb);
      const sameSign = sa === sb;
      const orbDeg = separation(la, lb);
      const inOrb = orbDeg <= orb;
      if (!inOrb && !sameSign) continue;             // neither convention calls this a contact
      const kind: ContactKind = sameSign && inOrb ? "same-party"
        : inOrb ? "through-the-wall"
        : "across-the-room";
      out.push({
        a, b,
        orbDeg: +orbDeg.toFixed(2),
        sameSign,
        sameHouse: houseOf(la) === houseOf(lb),
        kind,
        conventionsAgree: kind === "same-party",
        aSign: signName(sa), bSign: signName(sb),
        aHouse: houseOf(la), bHouse: houseOf(lb),
      });
    }
  }
  return out.sort((x, y) => x.orbDeg - y.orbDeg);
}

/** The contacts the two conventions disagree about — the ones worth saying out loud. */
export function disagreements(contacts: Contact[]): Contact[] {
  return contacts.filter((c) => !c.conventionsAgree);
}
