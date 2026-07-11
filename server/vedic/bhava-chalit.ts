/**
 * BHAVA CHALIT — the cusp-accurate house chart.
 *
 * Vedic charts default to WHOLE-SIGN houses: the whole rising sign is the 1st house, the next
 * sign the 2nd, and so on (see birthchart/calculator.ts getHouseFromLagna). That's clean, but it
 * ignores the actual degree of the ascendant — a planet at 28° of the sign BEFORE the lagna sign
 * is buried in the 12th by whole-sign, even when the real ascendant at 2° pulls it up onto the
 * horizon (the 1st). On a threshold/cusp chart that single choice changes the whole reading.
 *
 * Bhava Chalit fixes that by placing each planet in the house whose SPAN actually contains its
 * degree. We use the classical SRIPATI (Porphyry) method: the Ascendant is the madhya (centre) of
 * the 1st bhava and the MC the madhya of the 10th; the two intermediate houses in each quadrant
 * are found by trisecting the arc between the angles, so houses are UNEQUAL and reflect the true
 * angularity of the birth. House boundaries (bhava sandhi) are the midpoints between consecutive
 * madhyas; a planet near a sandhi sits in a weak, ambiguous junction.
 *
 * When the MC is unknown (no birth time → Chandra/Moon-framed charts), Bhava Chalit does not
 * apply and callers should stay on whole-sign. If only the ascendant is known we fall back to
 * EQUAL bhava (each house 30°, centred on the ascendant degree — asc as madhya, not as the start).
 *
 * Pure math: sidereal longitudes in, house numbers out. No ephemeris, no interpretation.
 */

/** Degrees within which a point counts as sitting in a bhava sandhi (junction) — weak/ambiguous.
 *  Tunable; the tradition treats the exact junction as the dead zone, a few degrees either side as
 *  weakening. Not dogma — consumers may pass their own threshold. */
export const NEAR_SANDHI_DEG = 2;

export interface BhavaCusps {
  /** The 12 bhava madhyas (house centres), 0-indexed: madhya[0] = house 1. Absolute sidereal deg. */
  madhya: number[];
  /** The 12 house START boundaries (sandhis), 0-indexed: start[0] = the junction that opens house 1. */
  start: number[];
  method: "sripati" | "equal";
}

export interface BhavaPlacement {
  /** Bhava Chalit house, 1–12 — where the degree actually lands. */
  bhava: number;
  /** The whole-sign house, 1–12 — for comparison. */
  wholeSignHouse: number;
  /** True when Bhava Chalit disagrees with whole-sign (the planet moved houses). */
  shifted: boolean;
  /** Signed distance to the bhava madhya, −180..180 (0 = dead centre, the strongest point). */
  degFromMadhya: number;
  /** True when the degree sits within NEAR_SANDHI_DEG of a house junction (weak/mixed). */
  nearSandhi: boolean;
}

const norm = (x: number) => ((x % 360) + 360) % 360;
/** Forward arc a→b, 0..360 (always non-negative). */
const fwd = (a: number, b: number) => norm(b - a);
/** Smallest angular separation between two longitudes, 0..180. */
const sep = (a: number, b: number) => { const d = norm(a - b); return Math.min(d, 360 - d); };

/**
 * Compute the 12 bhava madhyas + start boundaries from the ascendant and (optionally) the MC.
 * Pass mcLon = null (no birth time / unknown meridian) to get the EQUAL-bhava fallback.
 */
export function computeBhavaCusps(ascLon: number, mcLon: number | null): BhavaCusps {
  const asc = norm(ascLon);
  const madhya = new Array<number>(12);

  if (mcLon == null) {
    // Equal bhava — asc is the CENTRE of house 1, each house a clean 30°.
    for (let i = 0; i < 12; i++) madhya[i] = norm(asc + i * 30);
    return finish(madhya, "equal");
  }

  // Sripati (Porphyry) — trisect each quadrant between the angles.
  const mc = norm(mcLon);
  const dsc = norm(asc + 180);
  const ic = norm(mc + 180);
  // Forward order of the angles is asc(1) → ic(4) → dsc(7) → mc(10) → asc, since the MC sits ~a
  // quadrant BEHIND the ascendant in longitude. Each quadrant holds two intermediate madhyas.
  const q1 = fwd(asc, ic); // houses 2,3
  const q2 = fwd(ic, dsc); // houses 5,6
  const q3 = fwd(dsc, mc); // houses 8,9
  const q4 = fwd(mc, asc); // houses 11,12
  madhya[0] = asc;
  madhya[1] = norm(asc + q1 / 3);
  madhya[2] = norm(asc + (2 * q1) / 3);
  madhya[3] = ic;
  madhya[4] = norm(ic + q2 / 3);
  madhya[5] = norm(ic + (2 * q2) / 3);
  madhya[6] = dsc;
  madhya[7] = norm(dsc + q3 / 3);
  madhya[8] = norm(dsc + (2 * q3) / 3);
  madhya[9] = mc;
  madhya[10] = norm(mc + q4 / 3);
  madhya[11] = norm(mc + (2 * q4) / 3);
  return finish(madhya, "sripati");
}

/** House START boundaries = midpoints between consecutive madhyas (the bhava sandhis). */
function finish(madhya: number[], method: "sripati" | "equal"): BhavaCusps {
  const start = new Array<number>(12);
  for (let i = 0; i < 12; i++) {
    const prev = madhya[(i + 11) % 12];
    start[i] = norm(prev + fwd(prev, madhya[i]) / 2);
  }
  return { madhya, start, method };
}

/** The Bhava Chalit house (1–12) a sidereal longitude falls in. */
export function bhavaOf(cusps: BhavaCusps, lon: number): number {
  const L = norm(lon);
  for (let n = 0; n < 12; n++) {
    const a = cusps.start[n];
    const b = cusps.start[(n + 1) % 12];
    if (fwd(a, L) < fwd(a, b)) return n + 1;
  }
  return 12; // unreachable: the 12 spans partition the circle
}

const wholeSignHouseOf = (lagnaLon: number, lon: number) =>
  ((Math.floor(norm(lon) / 30) - Math.floor(norm(lagnaLon) / 30) + 12) % 12) + 1;

/**
 * Full placement of a longitude: its Bhava Chalit house, its whole-sign house, whether the two
 * disagree (the chalit shift), how far it sits from the bhava centre, and whether it's in a sandhi.
 */
export function placeInBhava(
  cusps: BhavaCusps,
  lon: number,
  lagnaLon: number,
  nearSandhiDeg = NEAR_SANDHI_DEG,
): BhavaPlacement {
  const bhava = bhavaOf(cusps, lon);
  const wholeSignHouse = wholeSignHouseOf(lagnaLon, lon);
  const degFromMadhya = ((norm(lon) - cusps.madhya[bhava - 1] + 540) % 360) - 180;
  const ownStart = cusps.start[bhava - 1];
  const nextStart = cusps.start[bhava % 12];
  const nearSandhi = sep(lon, ownStart) <= nearSandhiDeg || sep(lon, nextStart) <= nearSandhiDeg;
  return { bhava, wholeSignHouse, shifted: bhava !== wholeSignHouse, degFromMadhya, nearSandhi };
}

/**
 * Convenience: place every planet of a chart at once.
 * @param ascLon  ascendant sidereal longitude (chart.lagna.longitude for a timed chart)
 * @param mcLon   MC sidereal longitude, or null to fall back to equal bhava
 * @param planets planet name → sidereal longitude
 */
export function bhavaChalitForChart(
  ascLon: number,
  mcLon: number | null,
  planets: Record<string, number>,
): { cusps: BhavaCusps; placements: Record<string, BhavaPlacement> } {
  const cusps = computeBhavaCusps(ascLon, mcLon);
  const placements: Record<string, BhavaPlacement> = {};
  for (const [name, lon] of Object.entries(planets)) {
    placements[name] = placeInBhava(cusps, lon, ascLon);
  }
  return { cusps, placements };
}
