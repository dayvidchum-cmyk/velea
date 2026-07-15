/**
 * HOUSE RESEARCH — Appendix IV Steps 1–14, fired for all 12 houses, as ONE deterministic
 * research object computed at profile creation and stored.
 *
 * David's law (2026-07-14, directive #1): "when a Velea user profile is created it must
 * also store accurate data from an accurate and thorough research of every house in the
 * natal chart — lord's dignity, Shadbala, placement, who it's with, graha/rashi aspects
 * and what those aspecters rule, bhava yogas, Lajjitaadi and Balaadi avashtas, then the
 * house's own varga and karaka."
 *
 * This is the tradition's RESEARCH phase (K&F Appendix IV; canon/METHOD.md): gather every
 * house's facts once; convergence and voicing happen downstream. The engine locates —
 * the LLM only voices. Nothing here interprets.
 *
 * Per-planet facts (dignity, Shadbala, avashtas) are stored ONCE in `planets`; houses
 * reference planets by name — no duplication, and the whole object stays compact enough
 * to feed a prompt filter directly.
 *
 * Bhava-yoga keys (`L{house}H{placement}`) index canon/house-lord-combinations.json
 * (144/144 complete) — the stored research carries the KEY, the prose stays in canon.
 *
 * Pure: chart numbers in, research JSON out. No ephemeris, no DB, no interpretation.
 */

import { GRAHAS, type Graha, SIGN_RULER, dignityOf, type PlanetDignity } from "./dignity";
import { signIndexOf, signName, type VargaCode } from "./vargas";
import {
  beneficMap, grahaAspectsOnSign, rashiAspectsOnSign, grahaAspectsSign,
  type AspectOnSign,
} from "./aspects";
import {
  avashtasOf, vargaState, balaadi,
  type PlanetAvashtas, type BalaadiState, type JagradaadiState, type SignDignity,
} from "./avashtas";
import { shadbala, type PlanetShadbala, type ShadbalaContext } from "./shadbala";
import { vargaSignOf } from "./vargas";

export const RESEARCH_ENGINE_VERSION = "research-v1";

// ── Appendix IV per-house varga + karaka routing (pp.665-675 + the per-varga tables) ─────
// house → the varga its step reads, and the karaka planet(s) checked there. The 11th's
// varga is question-dependent ("the varga that relates to the type of gain"), so its
// stored check stays on D1 with Jupiter (the house karaka).
const HOUSE_VARGA: Record<number, { varga: VargaCode; karakas: Graha[] } | null> = {
  1: null, // Step 1 reads the lagna itself; anchors carry it
  2: { varga: "D2", karakas: ["Moon"] },
  3: { varga: "D3", karakas: ["Mars"] },
  4: { varga: "D4", karakas: ["Mercury"] },
  5: { varga: "D7", karakas: ["Jupiter"] },
  6: { varga: "D30", karakas: ["Sun"] },
  7: { varga: "D7", karakas: ["Venus", "Jupiter"] },
  8: { varga: "D20", karakas: ["Jupiter", "Venus"] },
  9: { varga: "D9", karakas: ["Venus", "Jupiter"] },
  10: { varga: "D10", karakas: ["Saturn", "Sun"] },
  11: { varga: "D1", karakas: ["Jupiter"] },
  12: { varga: "D12", karakas: [] }, // Rahu/Ketu — handled as node placements below
};

export interface ResearchInput {
  /** Sidereal longitudes for the 9 grahas (Rahu/Ketu required for nodes + Lajjita). */
  lonBy: Record<string, number>;
  /** deg/day per graha — enables Chesta. */
  speedBy?: Partial<Record<Graha, number>>;
  /** Declinations (deg, north positive) — enables Ayana. */
  declBy?: Partial<Record<Graha, number>>;
  /** Degree-true ascendant (or the Moon's longitude on a Chandra chart). */
  lagnaLon: number;
  /** Real sidereal MC; null on a no-time chart. */
  mcLon: number | null;
  /** Exact birth instant (UTC ms); null when only a date is known. */
  birthUtcMs: number | null;
  latitude: number;
  longitude: number;
  /** How house 1 is framed. */
  basis: "ascendant" | "ascendant_approx" | "chandra";
}

export interface PlanetResearch {
  planet: Graha;
  sign: string;
  house: number;
  degInSign: number;
  retrograde: boolean;
  dignity: PlanetDignity;
  shadbala: {
    rupas: number | null;
    /** rupas ÷ minimum requirement — ≥ 1 = classically strong. */
    ratio: number | null;
    pending: string[];
    sthana: number; dig: number | null; kala: number | null;
    chesta: number | null; naisargika: number; drik: number | null;
  };
  avashtas: PlanetAvashtas;
  /** Planets sharing the sign, with the natural relation from this planet's side. */
  conjunct: { planet: string; relation: "friend" | "neutral" | "enemy" | "node" }[];
}

export interface HouseResearch {
  house: number;
  sign: string;
  /** Grahas + nodes standing in the house. */
  occupants: string[];
  /** Graha aspects on the house sign — who, helping/hurting, and what houses they rule. */
  grahaAspects: (AspectOnSign & { rules: number[] })[];
  /** Rashi aspects on the house sign (Appendix IV asks for these separately). */
  rashiAspects: (AspectOnSign & { rules: number[] })[];
  lord: {
    planet: Graha;
    placedHouse: number;
    placedSign: string;
    /** Bhava-yoga key into canon/house-lord-combinations.json. */
    bhavaYoga: string;
  };
  /** Other lords standing IN this house: their bhava-yoga keys (the reverse direction). */
  bhavaYogasToHouse: string[];
  /** The house's own varga check (Appendix IV): lord + karakas re-read in that varga. */
  vargaCheck: {
    varga: VargaCode;
    lordInVarga: { sign: string; dignity: SignDignity; jagradaadi: JagradaadiState };
    karakas: { planet: Graha; sign: string; dignity: SignDignity; jagradaadi: JagradaadiState }[];
    /** This house counted from the varga lagna: its sign + graha aspects within the varga. */
    bhavaInVarga: { sign: string; grahaAspects: { planet: Graha; helping: boolean }[] };
    /** D12 only: the ancestral nodes' varga signs (Rahu maternal / Ketu paternal). */
    nodes?: { rahuSign: string; ketuSign: string };
  } | null;
}

export interface NatalResearch {
  engineVersion: string;
  basis: ResearchInput["basis"];
  /** Sources the whole research is honest about lacking (no-time charts list dig/kala…). */
  pending: string[];
  anchors: {
    lagna: { sign: string; lord: Graha; lordHouse: number };
    /** K&F Appendix IV Step 2 — the planet with the highest degrees in any sign. */
    atmakaraka: {
      planet: Graha; degInSign: number; navamsaSign: string;
      conjunct: string[]; rashiAspectedBy: string[];
    };
    moon: {
      sign: string; house: number; bright: boolean; balaadi: BalaadiState;
      conjunct: string[]; grahaAspectedBy: string[];
    };
  };
  planets: Record<Graha, PlanetResearch>;
  houses: HouseResearch[];
}

const norm = (x: number) => ((x % 360) + 360) % 360;
const degInSign = (lon: number) => norm(lon) - signIndexOf(lon) * 30;

/** Whole-sign house of a longitude from the lagna sign. */
const houseFrom = (lagnaSignIdx: number, lon: number) =>
  ((signIndexOf(lon) - lagnaSignIdx + 12) % 12) + 1;

/** The houses a planet rules, in this chart (whole-sign). */
function housesRuledBy(planet: Graha, lagnaSignIdx: number): number[] {
  const out: number[] = [];
  for (let h = 1; h <= 12; h++) {
    if (SIGN_RULER[signName((lagnaSignIdx + h - 1) % 12)] === planet) out.push(h);
  }
  return out;
}

/** Compute the full 12-house research object for a chart. */
export function computeNatalResearch(input: ResearchInput): NatalResearch {
  const { lonBy, lagnaLon, basis } = input;
  const lagnaSignIdx = signIndexOf(lagnaLon);
  const { benefic, moonBright } = beneficMap(lonBy);

  // Whole-sign house of every body (nodes included).
  const houseOf: Record<string, number> = {};
  for (const g of [...GRAHAS, "Rahu", "Ketu"]) houseOf[g] = houseFrom(lagnaSignIdx, lonBy[g]);

  // Shadbala for all seven — with full context when the birth instant is real.
  const ctx: ShadbalaContext | undefined = input.birthUtcMs != null ? {
    birthUtcMs: input.birthUtcMs,
    latitude: input.latitude,
    longitude: input.longitude,
    mcLon: input.mcLon,
    declBy: input.declBy,
  } : undefined;
  const bala = shadbala(lonBy as Record<Graha, number>, lagnaLon, input.speedBy, ctx);

  // Per-planet research, once.
  const planets = {} as Record<Graha, PlanetResearch>;
  for (const g of GRAHAS) {
    const sb: PlanetShadbala = bala[g];
    const gSign = signIndexOf(lonBy[g]);
    const conjunct = [...GRAHAS.filter((o) => o !== g), "Rahu", "Ketu"]
      .filter((o) => signIndexOf(lonBy[o]) === gSign)
      .map((o) => o === "Rahu" || o === "Ketu"
        ? { planet: o, relation: "node" as const }
        : { planet: o, relation: naturalRelationOf(g, o as Graha) });
    planets[g] = {
      planet: g,
      sign: signName(gSign),
      house: houseOf[g],
      degInSign: Math.round(degInSign(lonBy[g]) * 100) / 100,
      retrograde: (input.speedBy?.[g] ?? 0) < 0,
      dignity: dignityOf(g, lonBy as Record<Graha, number>, lagnaLon),
      shadbala: {
        rupas: sb.sixSourceRupas == null ? null : Math.round(sb.sixSourceRupas * 100) / 100,
        ratio: sb.strengthRatio == null ? null : Math.round(sb.strengthRatio * 100) / 100,
        pending: sb.pending,
        sthana: Math.round(sb.sthanaBala.total * 10) / 10,
        dig: sb.digBala == null ? null : Math.round(sb.digBala * 10) / 10,
        kala: sb.kalaBala?.total == null ? null : Math.round(sb.kalaBala.total * 10) / 10,
        chesta: sb.chestaBala == null ? null : Math.round(sb.chestaBala * 10) / 10,
        naisargika: Math.round(sb.naisargikaBala * 10) / 10,
        drik: sb.drikBala == null ? null : Math.round(sb.drikBala * 10) / 10,
      },
      avashtas: avashtasOf(g, lonBy, houseOf, moonBright),
      conjunct,
    };
  }

  // Anchors (Steps 1–3).
  const lagnaLord = SIGN_RULER[signName(lagnaSignIdx)];
  const akPlanet = GRAHAS.reduce((best, g) =>
    degInSign(lonBy[g]) > degInSign(lonBy[best]) ? g : best, GRAHAS[0]);
  const akSign = signIndexOf(lonBy[akPlanet]);
  const moonSign = signIndexOf(lonBy.Moon);

  const anchors: NatalResearch["anchors"] = {
    lagna: { sign: signName(lagnaSignIdx), lord: lagnaLord, lordHouse: houseOf[lagnaLord] },
    atmakaraka: {
      planet: akPlanet,
      degInSign: Math.round(degInSign(lonBy[akPlanet]) * 100) / 100,
      navamsaSign: signName(vargaSignOf(lonBy[akPlanet], "D9")),
      conjunct: [...GRAHAS, "Rahu", "Ketu"].filter(
        (o) => o !== akPlanet && signIndexOf(lonBy[o]) === akSign),
      rashiAspectedBy: rashiAspectsOnSign(akSign, lonBy, benefic).map((a) => a.planet),
    },
    moon: {
      sign: signName(moonSign),
      house: houseOf.Moon,
      bright: moonBright,
      balaadi: balaadi(lonBy.Moon),
      conjunct: [...GRAHAS.filter((g) => g !== "Moon"), "Rahu", "Ketu"].filter(
        (o) => signIndexOf(lonBy[o]) === moonSign),
      grahaAspectedBy: grahaAspectsOnSign(moonSign, lonBy, benefic)
        .filter((a) => a.planet !== "Moon").map((a) => a.planet),
    },
  };

  // Houses (Steps 4–14, plus Step 1's house framing for the 1st).
  const houses: HouseResearch[] = [];
  for (let h = 1; h <= 12; h++) {
    const hSign = (lagnaSignIdx + h - 1) % 12;
    const lord = SIGN_RULER[signName(hSign)];
    const withRules = (a: AspectOnSign) => ({ ...a, rules: housesRuledBy(a.planet, lagnaSignIdx) });

    // The house's own varga re-read.
    const route = HOUSE_VARGA[h];
    let vargaCheck: HouseResearch["vargaCheck"] = null;
    if (route) {
      const vLagna = vargaSignOf(lagnaLon, route.varga);
      const vBhavaSign = (vLagna + h - 1) % 12;
      const vAspects = GRAHAS
        .filter((g) => grahaAspectsSign(g, vargaSignOf(lonBy[g], route.varga), vBhavaSign))
        .map((g) => ({ planet: g, helping: benefic[g] }));
      vargaCheck = {
        varga: route.varga,
        lordInVarga: vargaState(lord, lonBy[lord], route.varga),
        karakas: route.karakas.map((k) => ({ planet: k, ...vargaState(k, lonBy[k], route.varga) })),
        bhavaInVarga: { sign: signName(vBhavaSign), grahaAspects: vAspects },
        ...(h === 12 ? {
          nodes: {
            rahuSign: signName(vargaSignOf(lonBy.Rahu, route.varga)),
            ketuSign: signName(vargaSignOf(lonBy.Ketu, route.varga)),
          },
        } : {}),
      };
    }

    houses.push({
      house: h,
      sign: signName(hSign),
      occupants: [...GRAHAS, "Rahu", "Ketu"].filter((g) => houseOf[g] === h),
      grahaAspects: grahaAspectsOnSign(hSign, lonBy, benefic).map(withRules),
      rashiAspects: rashiAspectsOnSign(hSign, lonBy, benefic).map(withRules),
      lord: {
        planet: lord,
        placedHouse: houseOf[lord],
        placedSign: planets[lord].sign,
        bhavaYoga: `L${h}H${houseOf[lord]}`,
      },
      bhavaYogasToHouse: Array.from({ length: 12 }, (_, i) => i + 1)
        .filter((k) => k !== h && houseOf[SIGN_RULER[signName((lagnaSignIdx + k - 1) % 12)]] === h)
        .map((k) => `L${k}H${h}`),
      vargaCheck,
    });
  }

  // Honest pending: union of the planets' missing sources.
  const pending = Array.from(new Set(GRAHAS.flatMap((g) => bala[g].pending)));

  return {
    engineVersion: RESEARCH_ENGINE_VERSION,
    basis,
    pending,
    anchors,
    planets,
    houses,
  };
}

// Natural relation from the Ch.10 friendship table (avashtas.ts owns the canon copy;
// re-derived here to keep conjunct entries cheap).
import friendshipsJson from "./canon/planetary-friendships.json";
const NAT = (friendshipsJson as {
  friendships: Record<Graha, { friends: Graha[]; neutral: Graha[]; enemies: Graha[] }>;
}).friendships;
function naturalRelationOf(from: Graha, other: Graha): "friend" | "neutral" | "enemy" {
  const t = NAT[from];
  if (t.friends.includes(other)) return "friend";
  if (t.enemies.includes(other)) return "enemy";
  return "neutral";
}
