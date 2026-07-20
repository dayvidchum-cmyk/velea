/**
 * NATAL DIGNITY + NEECHA BHANGA — the strength/condition of a natal planet by sign, and (critically)
 * whether a debilitation is CANCELLED.
 *
 * Why this exists: Velea's Moon layers (Tara Bala, Chandra Bala, the mode's Chandra lens) read the
 * Moon's POSITION but never its DIGNITY — so a debilitated Moon and an exalted one score identically.
 * That's a real blind spot (it produced a wrong eclipse read on David's own chart). But raw
 * debilitation is a TRAP: a cancelled debilitation (neecha bhanga) is the fall-then-rise signature,
 * often a raja yoga — scoring it as "weak" is worse than ignoring dignity entirely. So dignity and
 * cancellation MUST travel together. This module is the primitive; consumers decide how to weight it.
 *
 * Pure: sidereal longitudes in, dignity out. No ephemeris, no interpretation, no UI.
 */

export type Graha = "Sun" | "Moon" | "Mars" | "Mercury" | "Jupiter" | "Venus" | "Saturn";
export const GRAHAS: Graha[] = ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn"];

const ZOD = ["Aries","Taurus","Gemini","Cancer","Leo","Virgo","Libra","Scorpio","Sagittarius","Capricorn","Aquarius","Pisces"];
export const SIGN_RULER: Record<string, Graha> = {
  Aries:"Mars",Taurus:"Venus",Gemini:"Mercury",Cancer:"Moon",Leo:"Sun",Virgo:"Mercury",
  Libra:"Venus",Scorpio:"Mars",Sagittarius:"Jupiter",Capricorn:"Saturn",Aquarius:"Saturn",Pisces:"Jupiter",
};
// Exaltation sign + deep-exaltation degree (debilitation is the same degree in the opposite sign).
const EXALT: Record<Graha, { sign: string; deg: number }> = {
  Sun:{sign:"Aries",deg:10}, Moon:{sign:"Taurus",deg:3}, Mars:{sign:"Capricorn",deg:28}, Mercury:{sign:"Virgo",deg:15},
  Jupiter:{sign:"Cancer",deg:5}, Venus:{sign:"Pisces",deg:27}, Saturn:{sign:"Libra",deg:20},
};
const OPPOSITE: Record<string,string> = Object.fromEntries(ZOD.map((s,i)=>[s, ZOD[(i+6)%12]]));
const OWN: Record<Graha,string[]> = {
  Sun:["Leo"],Moon:["Cancer"],Mars:["Aries","Scorpio"],Mercury:["Gemini","Virgo"],
  Jupiter:["Sagittarius","Pisces"],Venus:["Taurus","Libra"],Saturn:["Capricorn","Aquarius"],
};
// Moolatrikona sign + degree range.
const MOOLA: Record<Graha,{sign:string;from:number;to:number}> = {
  Sun:{sign:"Leo",from:0,to:20}, Moon:{sign:"Taurus",from:3,to:30}, Mars:{sign:"Aries",from:0,to:12},
  Mercury:{sign:"Virgo",from:15,to:20}, Jupiter:{sign:"Sagittarius",from:0,to:10}, Venus:{sign:"Libra",from:0,to:15}, Saturn:{sign:"Aquarius",from:0,to:20},
};
// The planet that gets EXALTED in each sign (inverse of EXALT) — used by a neecha-bhanga condition.
const EXALTS_IN: Record<string, Graha> = Object.fromEntries((Object.entries(EXALT) as [Graha,{sign:string}][]) .map(([g,e])=>[e.sign,g]));

const norm = (x:number)=>((x%360)+360)%360;
export const signIndex = (lon:number)=>Math.floor(norm(lon)/30);
const signName = (lon:number)=>ZOD[signIndex(lon)];
const degInSign = (lon:number)=>norm(lon)-signIndex(lon)*30;
const houseFrom = (refSignIdx:number, lon:number)=>((signIndex(lon)-refSignIdx+12)%12)+1;
const KENDRA = new Set([1,4,7,10]);
/** Vedic graha aspect: everyone the 7th; Mars +4/+8, Jupiter +5/+9, Saturn +3/+10. */
function aspectsHouse(planet:Graha, houseAway:number){
  if (houseAway===7) return true;
  if (planet==="Mars") return houseAway===4||houseAway===8;
  if (planet==="Jupiter") return houseAway===5||houseAway===9;
  if (planet==="Saturn") return houseAway===3||houseAway===10;
  return false;
}

export type DignityState = "exalted" | "moolatrikona" | "own" | "great friend" | "friend" | "neutral" | "debilitated";

export interface PlanetDignity {
  planet: Graha;
  sign: string;
  /** Coarse dignity by sign (own/exalt/debil/moolatrikona; friendship left "neutral" unless own/mt). */
  state: DignityState;
  /** For exalted/debilitated: 0..15 — how close to the deep point (0 = exact, higher = shallower). */
  fromDeep: number | null;
  debilitated: boolean;
  /** Populated only when debilitated: the cancellation verdict. */
  neechaBhanga: NeechaBhanga | null;
}

export interface NeechaBhanga {
  cancelled: boolean;
  /** Human-readable conditions that fired. */
  reasons: string[];
  /** How many classical conditions are met (more = stronger cancellation; ≥1 cancels, ≥2 is solid). */
  count: number;
}

/** Coarse sign-dignity for a planet at a longitude. */
export function planetDignity(planet: Graha, lon: number): DignityState {
  const sign = signName(lon), d = degInSign(lon);
  if (sign === EXALT[planet].sign) return "exalted";
  if (OPPOSITE[EXALT[planet].sign] === sign) return "debilitated";
  const mt = MOOLA[planet];
  if (mt.sign === sign && d >= mt.from && d < mt.to) return "moolatrikona";
  if (OWN[planet].includes(sign)) return "own";
  return "neutral";
}

/**
 * Neecha-bhanga check for a DEBILITATED planet. Classical Parashari conditions (the commonly-cited
 * set): any ONE cancels; ≥2 is a solid cancellation (the fall-then-rise, often a raja yoga).
 *
 * @param planet   the debilitated planet
 * @param lonBy    every graha's longitude (for locating dispositors/exalt-lords)
 * @param lagnaLon the ascendant longitude (kendra reference)
 */
export function neechaBhanga(planet: Graha, lonBy: Record<Graha, number>, lagnaLon: number): NeechaBhanga {
  const pLon = lonBy[planet];
  const debilSign = signName(pLon);
  const lagIdx = signIndex(lagnaLon);
  const moonIdx = signIndex(lonBy.Moon);
  const inKendra = (lon: number) => KENDRA.has(houseFrom(lagIdx, lon)) || KENDRA.has(houseFrom(moonIdx, lon));
  const reasons: string[] = [];

  // 1. Dispositor of the debilitation sign in a kendra from Asc or Moon.
  const dispositor = SIGN_RULER[debilSign];
  if (dispositor !== planet && inKendra(lonBy[dispositor]))
    reasons.push(`dispositor ${dispositor} (lord of ${debilSign}) in a kendra`);

  // 2. The planet that EXALTS in the debilitation sign, in a kendra from Asc or Moon.
  const exalter = EXALTS_IN[debilSign];
  if (exalter && exalter !== planet && inKendra(lonBy[exalter]))
    reasons.push(`${exalter} (exalts in ${debilSign}) in a kendra`);

  // 3. Lord of the planet's EXALTATION sign, in a kendra from Asc or Moon.
  const exaltLord = SIGN_RULER[EXALT[planet].sign];
  if (exaltLord !== planet && inKendra(lonBy[exaltLord]))
    reasons.push(`${exaltLord} (lord of ${planet}'s exaltation ${EXALT[planet].sign}) in a kendra`);

  // 4. The debilitated planet aspected by its dispositor.
  if (dispositor !== planet) {
    const houseAway = houseFrom(signIndex(lonBy[dispositor]), pLon);
    if (aspectsHouse(dispositor, houseAway)) reasons.push(`aspected by dispositor ${dispositor}`);
  }

  const uniq = Array.from(new Set(reasons));
  return { cancelled: uniq.length > 0, reasons: uniq, count: uniq.length };
}

/** Full dignity (with neecha-bhanga when debilitated) for one planet. */
export function dignityOf(planet: Graha, lonBy: Record<Graha, number>, lagnaLon: number): PlanetDignity {
  const lon = lonBy[planet];
  const state = planetDignity(planet, lon);
  const isExDe = state === "exalted" || state === "debilitated";
  // Exaltation and debilitation share the same degree, in opposite signs (Moon: 3° Taurus / 3° Scorpio).
  const fromDeep = isExDe ? Math.abs(degInSign(lon) - EXALT[planet].deg) : null;
  const debilitated = state === "debilitated";
  return {
    planet, sign: signName(lon), state, fromDeep, debilitated,
    neechaBhanga: debilitated ? neechaBhanga(planet, lonBy, lagnaLon) : null,
  };
}

/** Dignity of all seven grahas for a chart. */
export function natalDignities(lonBy: Record<Graha, number>, lagnaLon: number): Record<Graha, PlanetDignity> {
  return Object.fromEntries(GRAHAS.map((g) => [g, dignityOf(g, lonBy, lagnaLon)])) as Record<Graha, PlanetDignity>;
}

/** THE LABEL THAT CANNOT LIE (v796).
 *
 * David's law: dignity and cancellation ALWAYS travel together — a raw "Debilitated" is a trap. The
 * module header has said so since it was written, and every consumer still read the bare label,
 * because the bare label is what the OTHER dignity module (panchang/dignity.ts, which has no
 * concept of cancellation) produces. So a cancelled fall — the fall-then-rise, often a raja yoga —
 * was classified as strained everywhere it mattered, including on David's own cancelled Moon.
 *
 * This is the one owner for turning a bare tier label into an honest one. It NEVER upgrades a fall
 * to "supported" — that is a weighting decision and belongs to David, not to a helper. It only
 * refuses to call a cancelled debilitation strained, and it hands back the reasons so the prose can
 * say what actually happened. Any other label passes through untouched.
 *
 * @param rawLabel a TIER_LABEL string ("Debilitated", "Exalted", "Own", …) from either dignity module
 */
export const CANCELLED_DEBILITATION_LABEL = "Debilitated (cancelled)";

export function labelWithCancellation(
  planet: string,
  rawLabel: string | null | undefined,
  lonBy: Record<string, number>,
  lagnaLon: number
): { label: string; cancelled: boolean; reasons: string[] } {
  const plain = { label: rawLabel ?? "—", cancelled: false, reasons: [] as string[] };
  if (rawLabel !== "Debilitated") return plain;
  // Nodes and anything outside the seven grahas have no essential dignity and no cancellation rule.
  if (!GRAHAS.includes(planet as Graha)) return plain;
  // A missing longitude means we cannot check — and an UNCHECKED debilitation must stay
  // "Debilitated", never be quietly softened. Silence is not cancellation.
  if (!GRAHAS.every((g) => Number.isFinite(lonBy[g])) || !Number.isFinite(lagnaLon)) return plain;
  const nb = neechaBhanga(planet as Graha, lonBy as Record<Graha, number>, lagnaLon);
  if (!nb.cancelled) return plain;
  return { label: CANCELLED_DEBILITATION_LABEL, cancelled: true, reasons: nb.reasons };
}
