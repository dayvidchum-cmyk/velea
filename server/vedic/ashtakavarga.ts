/**
 * ASHTAKAVARGA — the personal transit-grader.
 *
 * For each of the seven grahas (Sun…Saturn; the nodes take no part in classical Parashari
 * Ashtakavarga) we build a Bhinnashtakavarga (BAV): a distribution of BINDUS (benefic points)
 * across the twelve signs. A bindu says "when this planet occupies this sign, it does the native
 * good." Summing the seven BAVs sign-by-sign gives the Sarvashtakavarga (SAV) — the overall
 * benefic weather of each sign for this person.
 *
 * Its use is transit judgment (gochara): a planet transiting a sign where it holds many bindus is
 * a well-supported transit; few bindus, a thin one. That is the precision Velea wants — it turns
 * "Mars is in your 10th" (generic) into "a 6-bindu Mars in your 10th" (strong, for you).
 *
 * The bindus come from the classical benefic-place tables (Brihat Parashara Hora Shastra): for
 * contributor planet P, reference point R (the 7 grahas + the Lagna = the "eight" of Ashtaka),
 * P earns a bindu in each listed house counted FROM R's sign. The per-planet totals are fixed
 * invariants (Sun 48, Moon 49, Mars 39, Mercury 54, Jupiter 56, Venus 52, Saturn 39 → SAV 337);
 * BINDU_TOTALS + the tests guard every table row against transcription error.
 *
 * Sign-based by definition (bindus live on rasis). House attribution of a transit is a separate,
 * Bhava-Chalit question — see bhava-chalit.ts. A transit's read = (bindus of the sign it's in) ×
 * (the chalit bhava it activates).
 *
 * Pure math: natal sign indices in, bindu grids out. No ephemeris, no interpretation.
 */

export type Graha = "Sun" | "Moon" | "Mars" | "Mercury" | "Jupiter" | "Venus" | "Saturn";
export type RefPoint = Graha | "Lagna";

export const GRAHAS: Graha[] = ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn"];
export const REF_POINTS: RefPoint[] = [...GRAHAS, "Lagna"];

/** Fixed per-planet BAV totals (BPHS). SAV = their sum = 337. A tripwire against table errors. */
export const BINDU_TOTALS: Record<Graha, number> = {
  Sun: 48, Moon: 49, Mars: 39, Mercury: 54, Jupiter: 56, Venus: 52, Saturn: 39,
};
export const SARVA_TOTAL = 337;

/**
 * BENEFIC-PLACE TABLES (BPHS). BINDU_TABLE[P][R] = the houses (counted from R's sign, R's sign = 1)
 * in which contributor P earns a bindu. Do NOT edit a row without re-checking BINDU_TOTALS.
 */
export const BINDU_TABLE: Record<Graha, Record<RefPoint, number[]>> = {
  Sun: {
    Sun: [1, 2, 4, 7, 8, 9, 10, 11],
    Moon: [3, 6, 10, 11],
    Mars: [1, 2, 4, 7, 8, 9, 10, 11],
    Mercury: [3, 5, 6, 9, 10, 11, 12],
    Jupiter: [5, 6, 9, 11],
    Venus: [6, 7, 12],
    Saturn: [1, 2, 4, 7, 8, 9, 10, 11],
    Lagna: [3, 4, 6, 10, 11, 12],
  },
  Moon: {
    Sun: [3, 6, 7, 8, 10, 11],
    Moon: [1, 3, 6, 7, 10, 11],
    Mars: [2, 3, 5, 6, 9, 10, 11],
    Mercury: [1, 3, 4, 5, 7, 8, 10, 11],
    Jupiter: [1, 4, 7, 8, 10, 11, 12],
    Venus: [3, 4, 5, 7, 9, 10, 11],
    Saturn: [3, 5, 6, 11],
    Lagna: [3, 6, 10, 11],
  },
  Mars: {
    Sun: [3, 5, 6, 10, 11],
    Moon: [3, 6, 11],
    Mars: [1, 2, 4, 7, 8, 10, 11],
    Mercury: [3, 5, 6, 11],
    Jupiter: [6, 10, 11, 12],
    Venus: [6, 8, 11, 12],
    Saturn: [1, 4, 7, 8, 9, 10, 11],
    Lagna: [1, 3, 6, 10, 11],
  },
  Mercury: {
    Sun: [5, 6, 9, 11, 12],
    Moon: [2, 4, 6, 8, 10, 11],
    Mars: [1, 2, 4, 7, 8, 9, 10, 11],
    Mercury: [1, 3, 5, 6, 9, 10, 11, 12],
    Jupiter: [6, 8, 11, 12],
    Venus: [1, 2, 3, 4, 5, 8, 9, 11],
    Saturn: [1, 2, 4, 7, 8, 9, 10, 11],
    Lagna: [1, 2, 4, 6, 8, 10, 11],
  },
  Jupiter: {
    Sun: [1, 2, 3, 4, 7, 8, 9, 10, 11],
    Moon: [2, 5, 7, 9, 11],
    Mars: [1, 2, 4, 7, 8, 10, 11],
    Mercury: [1, 2, 4, 5, 6, 9, 10, 11],
    Jupiter: [1, 2, 3, 4, 7, 8, 10, 11],
    Venus: [2, 5, 6, 9, 10, 11],
    Saturn: [3, 5, 6, 12],
    Lagna: [1, 2, 4, 5, 6, 7, 9, 10, 11],
  },
  Venus: {
    Sun: [8, 11, 12],
    Moon: [1, 2, 3, 4, 5, 8, 9, 11, 12],
    Mars: [3, 5, 6, 9, 11, 12],
    Mercury: [3, 5, 6, 9, 11],
    Jupiter: [5, 8, 9, 10, 11],
    Venus: [1, 2, 3, 4, 5, 8, 9, 10, 11],
    Saturn: [3, 4, 5, 8, 9, 10, 11],
    Lagna: [1, 2, 3, 4, 5, 8, 9, 11],
  },
  Saturn: {
    Sun: [1, 2, 4, 7, 8, 10, 11],
    Moon: [3, 6, 11],
    Mars: [3, 5, 6, 10, 11, 12],
    Mercury: [6, 8, 9, 10, 11, 12],
    Jupiter: [5, 6, 11, 12],
    Venus: [6, 11, 12],
    Saturn: [3, 5, 6, 11],
    Lagna: [1, 3, 4, 6, 10, 11],
  },
};

export interface Ashtakavarga {
  /** Per-planet bindu grid: bhinna[P][signIndex], signIndex 0 = Aries. Each totals BINDU_TOTALS[P]. */
  bhinna: Record<Graha, number[]>;
  /** Combined grid: sarva[signIndex], sum of the seven BAVs. Totals SARVA_TOTAL (337). */
  sarva: number[];
}

const norm12 = (i: number) => ((i % 12) + 12) % 12;
export const signOf = (siderealLon: number) => Math.floor((((siderealLon % 360) + 360) % 360) / 30);

/**
 * Build the full Ashtakavarga from the natal sign of each reference point.
 * @param refSign  sign index (0–11) of each of the 7 grahas + the Lagna
 */
export function computeAshtakavarga(refSign: Record<RefPoint, number>): Ashtakavarga {
  const bhinna = {} as Record<Graha, number[]>;
  const sarva = new Array(12).fill(0);

  for (const p of GRAHAS) {
    const grid = new Array(12).fill(0);
    for (const r of REF_POINTS) {
      const base = norm12(refSign[r]);
      for (const house of BINDU_TABLE[p][r]) {
        grid[norm12(base + house - 1)] += 1; // house counted from R's sign, R's sign = house 1
      }
    }
    bhinna[p] = grid;
    for (let s = 0; s < 12; s++) sarva[s] += grid[s];
  }
  return { bhinna, sarva };
}

/** Convenience: derive the reference signs from sidereal longitudes, then compute. */
export function ashtakavargaFromLongitudes(
  planetLon: Record<Graha, number>,
  lagnaLon: number,
): Ashtakavarga {
  const refSign = { Lagna: signOf(lagnaLon) } as Record<RefPoint, number>;
  for (const p of GRAHAS) refSign[p] = signOf(planetLon[p]);
  return computeAshtakavarga(refSign);
}

/** Bindus a given planet holds in a sign (its own BAV) — the strength of THAT planet transiting there. */
export const bhinnaBindu = (av: Ashtakavarga, planet: Graha, signIndex: number) =>
  av.bhinna[planet][norm12(signIndex)];

/** Combined bindus in a sign (SAV) — the sign's overall benefic weather for the native. */
export const sarvaBindu = (av: Ashtakavarga, signIndex: number) => av.sarva[norm12(signIndex)];

/**
 * Grade a transit: the transiting planet's own bindus in the sign it occupies (0–8), plus the
 * sign's SAV (out of ~28–56 typical). Higher = the sky is more on the native's side there.
 */
export function transitStrength(av: Ashtakavarga, planet: Graha, transitLon: number) {
  const sign = signOf(transitLon);
  return { sign, bhinna: bhinnaBindu(av, planet, sign), sarva: sarvaBindu(av, sign) };
}
