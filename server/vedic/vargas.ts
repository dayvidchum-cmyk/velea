/**
 * VARGAS — divisional (harmonic) charts, the Parashari shodasha-varga set.
 *
 * Each varga Dn splits every 30° sign into n parts and re-maps each part to a sign by a
 * classical rule (BPHS). A varga is a topical LENS: the Navamsa (D9) magnifies marriage and
 * dharma, the Dasamsa (D10) career and public action, the Hora (D2) wealth, and so on. Velea's
 * "tap a topic" feature reads the day THROUGH the varga that governs that topic.
 *
 * Pure math: a sidereal longitude in, a varga sign index (0 = Aries … 11 = Pisces) out. No
 * ephemeris, no interpretation. Every rule below is unit-tested against a hand-computed value —
 * divisional math is unforgiving and a single off-by-one in a "start sign" corrupts the chart.
 */

const norm = (x: number) => ((x % 360) + 360) % 360;
/** Rashi (D1) sign index of a sidereal longitude. 0 = Aries. */
export const signIndexOf = (lon: number) => Math.floor(norm(lon) / 30);
/** Degrees within the current sign, 0–30. */
const degInSign = (lon: number) => norm(lon) - signIndexOf(lon) * 30;
/** A sign is "odd" (Aries, Gemini, Leo…) when its 1-based number is odd → 0-based index is even. */
const isOddSign = (s: number) => s % 2 === 0;

const ZOD = ["Aries","Taurus","Gemini","Cancer","Leo","Virgo","Libra","Scorpio","Sagittarius","Capricorn","Aquarius","Pisces"];
export const signName = (i: number) => ZOD[((i % 12) + 12) % 12];
export const SIGN_RULER: Record<string, string> = {
  Aries:"Mars",Taurus:"Venus",Gemini:"Mercury",Cancer:"Moon",Leo:"Sun",Virgo:"Mercury",
  Libra:"Venus",Scorpio:"Mars",Sagittarius:"Jupiter",Capricorn:"Saturn",Aquarius:"Saturn",Pisces:"Jupiter",
};

// ── D2 · Hora (wealth). Odd sign: 1st half → Leo (Sun's hora), 2nd half → Cancer (Moon's).
//    Even sign: reversed. Only two possible outputs (Leo=4 / Cancer=3). ────────────────────
export function horaSign(lon: number): number {
  const s = signIndexOf(lon), firstHalf = degInSign(lon) < 15;
  return isOddSign(s) ? (firstHalf ? 4 : 3) : (firstHalf ? 3 : 4);
}

// ── D3 · Drekkana (siblings, courage). 10° parts → same sign, 5th (+4), 9th (+8). ─────────
export function drekkanaSign(lon: number): number {
  const s = signIndexOf(lon), part = Math.floor(degInSign(lon) / 10);
  return (s + part * 4) % 12;
}

// ── D4 · Chaturthamsa (home, property, fortune). 7°30' parts → same, 4th, 7th, 10th (+3k). ─
export function chaturthamsaSign(lon: number): number {
  const s = signIndexOf(lon), part = Math.floor(degInSign(lon) / 7.5);
  return (s + part * 3) % 12;
}

// ── D7 · Saptamsa (children, progeny). Odd sign: start from the sign; even: start from the
//    7th; then step forward one sign per part. ~4.2857° parts. ─────────────────────────────
export function saptamsaSign(lon: number): number {
  const s = signIndexOf(lon), part = Math.floor(degInSign(lon) / (30 / 7));
  const start = isOddSign(s) ? s : (s + 6) % 12;
  return (start + part) % 12;
}

// ── D9 · Navamsa (marriage, dharma, inner strength). The continuous 3°20' scheme numbered
//    from Aries — provably identical to the movable/fixed/dual "start sign" rule (tested). ──
export function navamsaSign(lon: number): number {
  return Math.floor(norm(lon) / (30 / 9)) % 12;
}

// ── D10 · Dasamsa (career, public action, karma). Odd sign: start from the sign; even: start
//    from the 9th; then step forward one per 3° part. ──────────────────────────────────────
export function dasamsaSign(lon: number): number {
  const s = signIndexOf(lon), part = Math.floor(degInSign(lon) / 3);
  const start = isOddSign(s) ? s : (s + 8) % 12;
  return (start + part) % 12;
}

// ── D12 · Dwadasamsa (parents, lineage). 2°30' parts, stepping from the sign itself. ───────
export function dwadasamsaSign(lon: number): number {
  const s = signIndexOf(lon), part = Math.floor(degInSign(lon) / 2.5);
  return (s + part) % 12;
}

// ── D30 · Trimsamsa (health, misfortune, character). UNEQUAL parts ruled by the five
//    non-luminary planets. Odd: Mars 0-5 (Aries), Saturn 5-10 (Aquarius), Jupiter 10-18
//    (Sagittarius), Mercury 18-25 (Gemini), Venus 25-30 (Libra). Even: the mirror — Venus 0-5
//    (Taurus), Mercury 5-12 (Virgo), Jupiter 12-20 (Pisces), Saturn 20-25 (Capricorn), Mars
//    25-30 (Scorpio). ───────────────────────────────────────────────────────────────────────
export function trimsamsaSign(lon: number): number {
  const s = signIndexOf(lon), d = degInSign(lon);
  if (isOddSign(s)) {
    if (d < 5) return 0;   // Aries (Mars)
    if (d < 10) return 10; // Aquarius (Saturn)
    if (d < 18) return 8;  // Sagittarius (Jupiter)
    if (d < 25) return 2;  // Gemini (Mercury)
    return 6;              // Libra (Venus)
  }
  if (d < 5) return 1;   // Taurus (Venus)
  if (d < 12) return 5;  // Virgo (Mercury)
  if (d < 20) return 11; // Pisces (Jupiter)
  if (d < 25) return 9;  // Capricorn (Saturn)
  return 7;              // Scorpio (Mars)
}

export type VargaCode = "D1" | "D2" | "D3" | "D4" | "D7" | "D9" | "D10" | "D12" | "D30";

const VARGA_FN: Record<VargaCode, (lon: number) => number> = {
  D1: signIndexOf,
  D2: horaSign,
  D3: drekkanaSign,
  D4: chaturthamsaSign,
  D7: saptamsaSign,
  D9: navamsaSign,
  D10: dasamsaSign,
  D12: dwadasamsaSign,
  D30: trimsamsaSign,
};

/** The varga sign index (0=Aries) of a longitude in the named divisional chart. */
export function vargaSignOf(lon: number, varga: VargaCode): number {
  return VARGA_FN[varga](lon);
}

/** Map every graha's longitude into a varga: returns { planet: signIndex }. */
export function vargaChart(lonBy: Record<string, number>, varga: VargaCode): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [p, lon] of Object.entries(lonBy)) out[p] = vargaSignOf(lon, varga);
  return out;
}
