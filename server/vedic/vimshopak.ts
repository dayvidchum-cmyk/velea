/**
 * VIMSHOPAK — the 20-point varga-weighted strength (Vol II Ch.6, pp.297-299).
 *
 * Shadbala says how STRONG a planet is; Vimshopak says how WELL it expresses its benevolent
 * vs malevolent side ("how the planets will behave" — p.297). Each planet is scored across a
 * group of divisional charts; each varga carries a fixed weight and the planet earns a
 * fraction of that weight by its dignity in the varga. Max is always 20.
 *
 * Group weights exactly as printed (p.298-299) with ONE documented correction: the book's
 * Sapta column is row-slipped (it scores the Dasamsa, which its own group definition
 * excludes — the same class of misprint as the "Ruler of the 11h" header). The classical
 * BPHS values restore alignment and the column sums to 20 with the printed membership:
 * D7 2.5, D9 4.5, D12 2.0, D30 1.0.
 *
 * Per-varga dignity fractions: K&F give only the endpoints ("highest when exalted, lowest at
 * fall", p.297) and point to Parashara for detail. The standard BPHS twentieths are used —
 * own/moolatrikona/exaltation 20/20, great friend 18/20, friend 15/20, neutral 10/20,
 * enemy 7/20, great enemy 5/20 — judged against the varga-sign's lord by the compound
 * (panchadha) relationship, the same judge Saptavargaja Bala uses.
 *
 * Pure math. No ephemeris, no interpretation.
 */

import { GRAHAS, type Graha, SIGN_RULER } from "./dignity";
import { type VargaCode, vargaSignOf, signName } from "./vargas";
import { signDignity } from "./avashtas";
import { compoundRelation } from "./shadbala";

export type VimshopakGroup = "shad" | "sapta" | "dasha" | "shodasha";

// Varga weights per group (p.298-299; Sapta column re-aligned as documented above).
const WEIGHTS: Record<VimshopakGroup, Partial<Record<VargaCode, number>>> = {
  shad:     { D1: 6, D2: 2, D3: 4, D9: 5, D12: 2, D30: 1 },
  sapta:    { D1: 5, D2: 2, D3: 3, D7: 2.5, D9: 4.5, D12: 2, D30: 1 },
  dasha:    { D1: 3, D2: 1.5, D3: 1.5, D7: 1.5, D9: 1.5, D10: 1.5, D12: 1.5, D16: 1.5, D30: 1.5, D60: 5 },
  shodasha: {
    D1: 3.5, D2: 1, D3: 1, D4: 0.5, D7: 0.5, D9: 3, D10: 0.5, D12: 0.5,
    D16: 2, D20: 0.5, D24: 0.5, D27: 0.5, D30: 1, D40: 0.5, D45: 0.5, D60: 4,
  },
};

// Parashara's eight-fold classification of the total (p.299).
const CLASSES: Array<{ min: number; name: string; beneficPct: string }> = [
  { min: 17.5, name: "Atipoorna", beneficPct: "87.5-100%" },
  { min: 15.0, name: "Poorna", beneficPct: "75-87.5%" },
  { min: 12.5, name: "Atimadhya", beneficPct: "62.5-75%" },
  { min: 10.0, name: "Madhya", beneficPct: "50-62.5%" },
  { min: 7.5, name: "Swalpa", beneficPct: "37.5-50%" },
  { min: 5.0, name: "Atiswalpa", beneficPct: "25-37.5%" },
  { min: 2.5, name: "Heena", beneficPct: "12.5-25%" },
  { min: 0, name: "Atiheena", beneficPct: "0-12.5%" },
];

/** Dignity fraction (twentieths) in one varga, judged vs the varga-sign's lord. */
function fractionIn(planet: Graha, lon: number, varga: VargaCode, lonBy: Record<Graha, number>): number {
  const vSign = vargaSignOf(lon, varga);
  const dig = signDignity(planet, vSign);
  if (dig === "exalted" || dig === "own") return 1; // own includes moolatrikona at sign level
  if (dig === "debilitated") return 5 / 20; // the floor — "lowest when in its fall"
  const lord = SIGN_RULER[signName(vSign)] as Graha;
  switch (compoundRelation(planet, lord, lonBy)) {
    case "great friend": return 18 / 20;
    case "friend": return 15 / 20;
    case "neutral": return 10 / 20;
    case "enemy": return 7 / 20;
    case "great enemy": return 5 / 20;
  }
}

export interface PlanetVimshopak {
  planet: Graha;
  /** Points per group, each 0..20. */
  points: Record<VimshopakGroup, number>;
  /** Parashara's classification of the SHODASHA (full) score — the complete assessment. */
  classification: string;
  beneficPct: string;
}

export function vimshopak(lonBy: Record<Graha, number>): Record<Graha, PlanetVimshopak> {
  const out = {} as Record<Graha, PlanetVimshopak>;
  for (const g of GRAHAS) {
    const points = {} as Record<VimshopakGroup, number>;
    for (const group of Object.keys(WEIGHTS) as VimshopakGroup[]) {
      let sum = 0;
      for (const [varga, weight] of Object.entries(WEIGHTS[group]) as [VargaCode, number][]) {
        sum += weight * fractionIn(g, lonBy[g], varga, lonBy);
      }
      points[group] = Math.round(sum * 100) / 100;
    }
    const cls = CLASSES.find((c) => points.shodasha >= c.min)!;
    out[g] = { planet: g, points, classification: cls.name, beneficPct: cls.beneficPct };
  }
  return out;
}
