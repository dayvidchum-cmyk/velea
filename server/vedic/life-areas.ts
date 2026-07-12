/**
 * LIFE AREAS — the "pick a life area" routing for the horoscope, straight from David's method
 * source: Kurczak & Fish, *Art & Science of Vedic Astrology* Vol II, Appendix IV (the varga
 * definition pages 367–374 + the abbreviated per-house analysis loop, p390).
 *
 * A life area is read by routing to its topical VARGA (the divisional chart that magnifies it),
 * its PRIMARY HOUSE, and its KARAKA(S) — then reading that house + its lord + its karakas BOTH in
 * the Rasi (D1) AND in the varga (the deep lens). This module is pure data + pure chart-math: it
 * takes natal longitudes and today's transits in, and returns a deterministic "lens" the narrative
 * prompt reads. No LLM, no interpretation — the same discipline as vargas.ts.
 *
 * The routing table is HIS book, not a guess (see memory: velea-varga-life-area-method). A few
 * rows where the book diverges from common practice are flagged for David to confirm.
 */
import { vargaSignOf, signIndexOf, signName, SIGN_RULER, type VargaCode } from "./vargas.js";
import { dignityLabel } from "../panchang/dignity.js";

const ZOD = ["Aries","Taurus","Gemini","Cancer","Leo","Virgo","Libra","Scorpio","Sagittarius","Capricorn","Aquarius","Pisces"];

export type LifeAreaKey =
  | "self" | "money" | "siblings" | "home" | "children"
  | "love" | "career" | "health" | "parents" | "purpose";

export type Karaka = { planet: string; role: "primary" | "secondary"; signifies: string };

export type LifeArea = {
  key: LifeAreaKey;
  /** User-facing chip label. */
  label: string;
  /** The divisional chart that magnifies this area. */
  varga: VargaCode;
  /** The house (1–12, whole-sign from the lagna) that owns this area in the Rasi. */
  primaryHouse: number;
  /** What this area covers, in plain nouns (drawn from the varga's definition page). */
  domain: string;
  /** Primary + secondary significators, each with WHAT it signifies for this area (per the book). */
  karakas: Karaka[];
  /** How each planet reads WHEN FOUND in this varga — the book's per-planet significations. Fed to
   *  the prompt as concrete specifics ("the proof is in the specifics") to translate a live planet. */
  planetInVarga: Partial<Record<string, string>>;
  /** Set when this row diverges from common practice — surfaced for David to confirm, never silent. */
  note?: string;
};

// ── THE REGISTRY (Appendix IV). Order = the chip order shown to the user. ─────────────────────
export const LIFE_AREAS: Record<LifeAreaKey, LifeArea> = {
  self: {
    key: "self", label: "Self & Body", varga: "D1", primaryHouse: 1,
    domain: "the self, the body and its vitality, how you meet life, your path and physique",
    karakas: [{ planet: "Sun", role: "primary", signifies: "the body and the sense of self" }],
    planetInVarga: {
      Sun: "self, body, health, vitality, authority, immune and skeletal system",
      Moon: "sense of self, ego, face, the nature of the heart, popularity, blood",
      Mars: "personal character and integrity, exercise, nerves, the fire in the body",
      Mercury: "cognizance, speech, relatives, business partners, skin, the senses",
      Jupiter: "opportunities, wealth, children, wisdom, the endocrine and reproductive systems",
      Venus: "genetic strength, recuperative ability, food, sexual fluids, the digestive system",
      Saturn: "servants, longevity, illness, the muscular system, connective tissue",
      Rahu: "medical and addictive drugs, technology, cheats and liars",
      Ketu: "robbers, epidemics, what is already dissolving",
    },
  },
  money: {
    key: "money", label: "Money", varga: "D2", primaryHouse: 2,
    domain: "wealth, income, what you own, the ability to meet responsibilities, early security",
    karakas: [
      { planet: "Moon", role: "primary", signifies: "the sense of fulfillment, feeling wealthy" },
      { planet: "Jupiter", role: "secondary", signifies: "tangible wealth and the feeling of being wealthy" },
      { planet: "Mars", role: "secondary", signifies: "overcoming difficulties in meeting responsibilities" },
    ],
    planetInVarga: {
      Sun: "a consistent approach to meeting responsibilities and maintaining wealth",
      Moon: "satisfaction, the ability to feel wealthy",
      Mars: "gold, gems, mineral wealth, the capacity to achieve",
      Mercury: "speculative investments, commerce, trade, capital gains, money itself",
      Jupiter: "wealth, banks, other people's money, inheritance, income, tangible money in the bank",
      Venus: "wealth from jewelry and art, prosperity",
      Saturn: "debts, expenses",
      Rahu: "unrealized wealth, financial confusion, confusion of responsibilities",
      Ketu: "stolen or slipping wealth",
    },
  },
  siblings: {
    key: "siblings", label: "Siblings & Courage", varga: "D3", primaryHouse: 3,
    domain: "siblings, courage and initiative, effort, skill and the hands, short trips",
    karakas: [
      { planet: "Mars", role: "primary", signifies: "siblings and the strength and integrity of your views" },
      { planet: "Venus", role: "secondary", signifies: "the diplomacy needed to accomplish goals, managing conflict" },
      { planet: "Ketu", role: "secondary", signifies: "the growth possible from conflict, debate, and interaction" },
    ],
    planetInVarga: {
      Sun: "medals, trophies, awards", Moon: "popularity with peers",
      Mars: "teammates, siblings, weapons, courage",
      Mercury: "travel, pilgrimages, commuting, experiences while traveling",
      Jupiter: "the enjoyment and wisdom of siblings", Venus: "manners, etiquette, graciousness, entertainment",
      Saturn: "the elder sibling", Rahu: "conflicts with peers and siblings", Ketu: "the results of conflicts with peers and siblings",
    },
  },
  home: {
    key: "home", label: "Home & Property", varga: "D4", primaryHouse: 4,
    domain: "the home, land and real estate, well-being, your fair share and fortune, roots",
    karakas: [
      { planet: "Mercury", role: "primary", signifies: "how much of your fair share you receive, the feeling of fortune" },
      { planet: "Moon", role: "secondary", signifies: "self-image, how receptive you are to good fortune" },
      { planet: "Sun", role: "secondary", signifies: "the confidence to do what brings greater fortune" },
      { planet: "Saturn", role: "secondary", signifies: "the hard work needed to gain greater fortune" },
    ],
    planetInVarga: {
      Sun: "palaces, kingdoms, consistency of fortune, wealth from gold",
      Moon: "the ability to accept fortune, wealth from silver and pearls",
      Mars: "neighbors, real estate, property, land, buildings, homes, wealth from the earth",
      Mercury: "your fair share, the ability to manage assets", Jupiter: "orchards, the wisdom to manage assets",
      Venus: "pools, wells, lakes, ponds", Saturn: "the work that destiny dictates",
      Rahu: "the unconscious, wasted wealth", Ketu: "the results of past actions on affluence, wealth from energy sources",
    },
  },
  children: {
    key: "children", label: "Children & Creativity", varga: "D7", primaryHouse: 5,
    domain: "children, conception, and creative capacity — the offspring of body and of hands",
    karakas: [
      { planet: "Jupiter", role: "primary", signifies: "healthy children and your capacity to contribute to the greater good" },
      { planet: "Sun", role: "secondary", signifies: "the energy behind creativity and whether it lasts" },
      { planet: "Mercury", role: "secondary", signifies: "managing creative energy and communicating with children" },
    ],
    planetInVarga: {
      Sun: "creative spirit, inspiration toward creativity", Moon: "the capacity to receive and sustain creative inspiration",
      Mars: "the logical ability to apply creative principles, morals imparted to children",
      Mercury: "managing children's affairs", Jupiter: "children, contributions lasting after death",
      Venus: "enjoyment of intimacy, genetics passed to offspring", Saturn: "enduring the hardship of raising children, completing creative processes",
      Rahu: "desires, cravings, innovation", Ketu: "creativity as a spiritual experience, frustration",
    },
  },
  love: {
    key: "love", label: "Love & Marriage", varga: "D9", primaryHouse: 7,
    domain: "the spouse and partnership, marriage, romance, and devotion to the shared path",
    karakas: [
      { planet: "Venus", role: "primary", signifies: "a marriage on lasting principles and the well-being of the spouse" },
      { planet: "Jupiter", role: "secondary", signifies: "how a partner embodies the ideal, and the merit that manifests a helpful one" },
      { planet: "Mars", role: "secondary", signifies: "learning from compromise, dealing with the problems that arise" },
    ],
    planetInVarga: {
      Sun: "sva dharma, consistency on the path, intelligently managing the marriage",
      Moon: "adaptability and the ability to nurture the marriage, the perceived role",
      Mars: "compromise, in-laws, community, good judgment on the path",
      Mercury: "the ability to relate, friendliness, playfulness, communicating within relationship",
      Jupiter: "the husband, joy and a sense of purpose on the path, the benefit of counsel",
      Venus: "the wife, romance, in-laws, decisions that lead to higher fulfillment, comfort from marriage, diplomacy, fairness",
      Saturn: "bearing burdens along the path, enduring troubles, the survival capacity of the marriage",
      Rahu: "doubts, confusion, wasted efforts, misunderstandings, secrets, trust",
      Ketu: "instabilities, inconsistencies, criticalness",
    },
  },
  career: {
    key: "career", label: "Career & Status", varga: "D10", primaryHouse: 10,
    domain: "career, livelihood, power and position, status, achievement, daily obligations",
    karakas: [
      { planet: "Saturn", role: "primary", signifies: "the capacity to do the hard things that attain greatness, and to appreciate them" },
      { planet: "Sun", role: "secondary", signifies: "the status gained from doing great deeds" },
    ],
    planetInVarga: {
      Sun: "titles, status, power, government service, achievement, authority, confidence",
      Moon: "visibility, popularity", Mars: "commander, overseer, general",
      Mercury: "the capacity to manage power and authority", Jupiter: "the enjoyment of authority and power",
      Venus: "diplomatic capacity", Saturn: "the ability to work hard, staying power, a fall from position",
      Rahu: "originality, authority or power with foreigners and foreign affairs", Ketu: "your critics",
    },
  },
  health: {
    key: "health", label: "Health & Vitality", varga: "D30", primaryHouse: 6,
    domain: "health and illness, the body's upkeep and depletion, obstacles, enemies, daily friction",
    karakas: [
      { planet: "Sun", role: "primary", signifies: "the body's vitality and constitution" },
      { planet: "Mars", role: "secondary", signifies: "the energy to overcome illness and resistance" },
    ],
    // D30 per-planet page was beyond the scanned excerpt; left thin on purpose (verify with David).
    planetInVarga: {},
    note: "D30 planet-signification page wasn't in the scanned excerpt — planetInVarga left empty until confirmed. Karaka = Sun (per the 6th-house step); Mars added as the energy to overcome.",
  },
  parents: {
    key: "parents", label: "Parents & Roots", varga: "D12", primaryHouse: 12,
    domain: "parents, heredity and ancestry, and the karma carried in from before this life",
    karakas: [
      { planet: "Rahu", role: "primary", signifies: "the strength of your maternal ancestry" },
      { planet: "Ketu", role: "primary", signifies: "the strength of your paternal ancestry" },
    ],
    planetInVarga: {
      Sun: "the father and his influence", Moon: "the mother", Mars: "the mother",
      Mercury: "maternal aunts and uncles", Jupiter: "paternal grandparents, joy derived from ancestors",
      Venus: "maternal grandparents, the father, comfort derived from ancestors",
      Saturn: "obligations from ancestors and past lives", Rahu: "maternal ancestry", Ketu: "paternal ancestry",
    },
  },
  purpose: {
    key: "purpose", label: "Purpose & Dharma", varga: "D9", primaryHouse: 9,
    domain: "meaning, belief and dharma, teachers and teaching, the life path and what you live by",
    karakas: [
      { planet: "Jupiter", role: "primary", signifies: "joy and a sense of purpose on the path, the benefit of counsel and faith" },
      { planet: "Venus", role: "secondary", signifies: "devotion to the path and decisions that lead to higher fulfillment" },
    ],
    planetInVarga: {
      Sun: "sva dharma, consistency and intelligent management of the path",
      Moon: "adaptability on the path, the perceived role", Mars: "good judgment and compromise on the path, community",
      Mercury: "the ability to relate and communicate the path", Jupiter: "joy on the path, a sense of purpose, feeling part of something bigger",
      Venus: "decisions that lead to higher fulfillment, devotion, fairness", Saturn: "bearing burdens and enduring troubles along the path",
      Rahu: "doubts, confusion, wasted efforts, secrets", Ketu: "instabilities, inconsistencies, a critical detachment",
    },
    // David's call: the book fuses marriage and dharma in D9 (marriage as the knot that opens the
    // path); Velea keeps them SEPARATE. Purpose is dharma ONLY — meaning, belief, teaching, the path.
    // Spouse/marriage lives entirely in "Love & Marriage" (D9/7th). Same varga, different house, no bleed.
  },
};

export const LIFE_AREA_ORDER: LifeAreaKey[] = [
  "self", "money", "career", "love", "health", "home", "children", "purpose", "siblings", "parents",
];

export function isLifeAreaKey(x: unknown): x is LifeAreaKey {
  return typeof x === "string" && x in LIFE_AREAS;
}

// ── THE LENS ──────────────────────────────────────────────────────────────────────────────────
// Deterministic. Given the natal longitudes + today's transits + the current dasha lords, compute
// the varga-deep picture of ONE life area, pointed at this date. Everything below is chart-math the
// engine already trusts (whole-sign houses, vargaSignOf, dignityLabel) — no interpretation.

type PlanetState = {
  planet: string;
  natalSign: string; natalHouse: number | null; natalDignity: string; rulesHouses: number[];
  vargaSign: string; vargaHouse: number; vargaDignity: string;
};

export type LifeAreaLens = {
  area: LifeAreaKey; label: string; varga: VargaCode; domain: string;
  primaryHouse: number;
  // The Rasi (D1) picture: the house sign, who rules it and where that ruler stands, who sits in it.
  rasi: {
    houseSign: string; houseLord: string;
    houseLordState: PlanetState | null;
    occupants: string[];               // planets tenanting the primary house natally
  };
  // The varga (deep lens) picture: its lagna, the primary house's sign in the varga, who rules & sits.
  vargaChart: {
    lagnaSign: string; houseSign: string; houseLord: string;
    occupants: string[];               // planets tenanting the primary house IN the varga
  };
  // The house lord + karakas, each shown BOTH natally and in the varga (the book's core comparison).
  houseLord: PlanetState | null;
  karakas: Array<Karaka & { state: PlanetState | null }>;
  // How TODAY lights the area up: transiting planets touching the house sign / lord / karakas, and
  // whether the current dasha lords bear on the area (rule the house, sit in it, or are a karaka).
  activation: {
    transitsOnArea: Array<{ planet: string; via: string; sign: string; retrograde: boolean; combust: boolean | null; spotlight: boolean; spotlightReason: string | null }>;
    dashaBearing: Array<{ level: "maha" | "antar" | "pratyantar"; lord: string; how: string }>;
  };
  // The book's per-planet significations for this varga — reference for the prompt to translate a
  // live planet into concrete life-content. Empty for D30 until confirmed.
  planetInVarga: Partial<Record<string, string>>;
  note?: string;
};

const wholeSignHouseOf = (signIdx: number, lagnaIdx: number) => ((signIdx - lagnaIdx + 12) % 12) + 1;
const houseSignIdx = (lagnaIdx: number, house: number) => (lagnaIdx + house - 1) % 12;

export function buildLifeAreaLens(args: {
  area: LifeAreaKey;
  lonByPlanet: Record<string, number>;   // natal sidereal longitudes (0–360)
  ascLon: number;                         // natal ascendant sidereal longitude
  lagnaSign: string;                      // the Rasi lagna sign name
  natalByPlanet: Record<string, { sign: string; house: number | null; dignity: string; rulesHouses: number[] }>;
  transits: Array<{ planet: string; sign: string; houseFromLagna: number; retrograde: boolean; combust: boolean | null; hitsNatalPoint: string | null; spotlight: boolean; spotlightReason: string | null }>;
  dasha: { mahaDasha?: { lord: string } | null; antarDasha?: { lord: string } | null; pratyantarDasha?: { lord: string } | null } | null;
}): LifeAreaLens {
  const A = LIFE_AREAS[args.area];
  const varga = A.varga;
  const lagnaIdx = ZOD.indexOf(args.lagnaSign);

  // Precompute every planet's varga sign + varga house (varga lagna = the varga sign of the ascendant).
  const vargaLagnaIdx = vargaSignOf(args.ascLon, varga);
  const vargaSignIdxOf: Record<string, number> = {};
  const vargaHouseOf: Record<string, number> = {};
  for (const [p, lon] of Object.entries(args.lonByPlanet)) {
    const vi = vargaSignOf(lon, varga);
    vargaSignIdxOf[p] = vi;
    vargaHouseOf[p] = wholeSignHouseOf(vi, vargaLagnaIdx);
  }

  const stateOf = (planet: string): PlanetState | null => {
    const nat = args.natalByPlanet[planet];
    if (nat == null || vargaSignIdxOf[planet] == null) return null;
    const vSign = signName(vargaSignIdxOf[planet]);
    return {
      planet,
      natalSign: nat.sign, natalHouse: nat.house, natalDignity: nat.dignity, rulesHouses: nat.rulesHouses,
      vargaSign: vSign, vargaHouse: vargaHouseOf[planet],
      // Nodes have no essential dignity; dignityLabel returns a neutral label for them.
      vargaDignity: dignityLabel(planet, vSign),
    };
  };

  // ── Rasi (D1) ──
  const rasiHouseSignIdx = houseSignIdx(lagnaIdx, A.primaryHouse);
  const rasiHouseSign = signName(rasiHouseSignIdx);
  const rasiHouseLord = SIGN_RULER[rasiHouseSign];
  const rasiOccupants = Object.entries(args.natalByPlanet).filter(([, n]) => n.house === A.primaryHouse).map(([p]) => p);

  // ── Varga (deep lens) ── the area's primary house SIGN inside the varga, and who rules/sits there.
  const vargaHouseSignIdx = (vargaLagnaIdx + A.primaryHouse - 1) % 12;
  const vargaHouseSign = signName(vargaHouseSignIdx);
  const vargaHouseLord = SIGN_RULER[vargaHouseSign];
  const vargaOccupants = Object.keys(vargaHouseOf).filter((p) => vargaHouseOf[p] === A.primaryHouse);

  // ── Activation (today) ── a transit bears on the area when it sits in the primary-house sign, or
  // touches the house lord or a karaka natally (hitsNatalPoint), or is itself a karaka/house lord.
  const karakaSet = new Set(A.karakas.map((k) => k.planet));
  const areaPlayers = new Set<string>([rasiHouseLord, ...A.karakas.map((k) => k.planet)]);
  const transitsOnArea = args.transits
    .map((t) => {
      const reasons: string[] = [];
      if (t.houseFromLagna === A.primaryHouse) reasons.push(`moving through the ${A.label.toLowerCase()} territory`);
      if (t.hitsNatalPoint && areaPlayers.has(t.hitsNatalPoint)) reasons.push(`landing on ${t.hitsNatalPoint}, a key player here`);
      if (areaPlayers.has(t.planet)) reasons.push(`is itself ${t.planet === rasiHouseLord ? "the ruler of this area" : "a significator of this area"}`);
      if (!reasons.length) return null;
      return { planet: t.planet, via: reasons.join("; "), sign: t.sign, retrograde: t.retrograde, combust: t.combust, spotlight: t.spotlight, spotlightReason: t.spotlightReason };
    })
    .filter(Boolean) as LifeAreaLens["activation"]["transitsOnArea"];

  const dashaBearing: LifeAreaLens["activation"]["dashaBearing"] = [];
  const bearOf = (lord: string | undefined | null): string | null => {
    if (!lord) return null;
    const nat = args.natalByPlanet[lord];
    const hows: string[] = [];
    if (lord === rasiHouseLord) hows.push("rules this area");
    if (karakaSet.has(lord)) hows.push("is a significator of this area");
    if (nat?.house === A.primaryHouse) hows.push("sits in this area natally");
    if (nat?.rulesHouses?.includes(A.primaryHouse)) hows.push("owns this house");
    return hows.length ? hows.join(", ") : null;
  };
  for (const [level, node] of [["maha", args.dasha?.mahaDasha], ["antar", args.dasha?.antarDasha], ["pratyantar", args.dasha?.pratyantarDasha]] as const) {
    const how = bearOf(node?.lord);
    if (how && node?.lord) dashaBearing.push({ level, lord: node.lord, how });
  }

  return {
    area: args.area, label: A.label, varga, domain: A.domain, primaryHouse: A.primaryHouse,
    rasi: { houseSign: rasiHouseSign, houseLord: rasiHouseLord, houseLordState: stateOf(rasiHouseLord), occupants: rasiOccupants },
    vargaChart: { lagnaSign: signName(vargaLagnaIdx), houseSign: vargaHouseSign, houseLord: vargaHouseLord, occupants: vargaOccupants },
    houseLord: stateOf(rasiHouseLord),
    karakas: A.karakas.map((k) => ({ ...k, state: stateOf(k.planet) })),
    activation: { transitsOnArea, dashaBearing },
    planetInVarga: A.planetInVarga,
    note: A.note,
  };
}
