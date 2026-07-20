/**
 * NATAL DIGNITY + NEECHA BHANGA — the strength/condition of a natal planet by sign, and (critically)
 * whether a debilitation is CANCELLED.
 *
 * Why this exists: Velea's Moon layers (Tara Bala, Chandra Bala, the mode's Chandra lens) read the
 * Moon's POSITION but never its DIGNITY — so a debilitated Moon and an exalted one score identically.
 * That's a real blind spot (it produced a wrong eclipse read on David's own chart). But raw
 * debilitation is a TRAP: a cancelled debilitation (neecha bhanga) is the fall-then-rise signature,
 * and scoring it as "weak" is worse than ignoring dignity entirely. So dignity and cancellation MUST
 * travel together. This module is the primitive; consumers decide how to weight it.
 *
 * NOT "often a raja yoga" — this header said exactly that until 2026-07-20, which is the conflation
 * David's debilitation doctrine pulls back from: "Neecha Bhanga is not automatically Raja Yoga…
 * Not everyone with Neecha Bhanga experiences extraordinary success." I corrected the same sentence
 * in BASE_PROMPT and in the neechaBhanga docblock and missed it here — the third copy of one wrong
 * claim, which is the argument for stating a doctrine once rather than restating it per file.
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
  /** The planets that FORM the cancellation — the dispositor, the exalter, the exaltation-lord. The
   *  canon's dashaGate rule turns on exactly this list: "a yoga is LATENT until its planets' period
   *  activates it", so a consumer cannot apply that gate without knowing whose period counts. */
  by: Graha[];
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
 * set): any ONE cancels; ≥2 is a solid cancellation.
 *
 * NOT A RAJA YOGA (David's doctrine, 2026-07-20). This comment used to say "≥2 … often a raja
 * yoga", and he is explicit that they are SEPARATE CONCEPTS: "Neecha Bhanga is not automatically
 * Raja Yoga… Not everyone with Neecha Bhanga experiences extraordinary success." Cancellation
 * becomes Raja Yoga only when the cancellation is strong, the planet has functional importance
 * (ruling a trine or angle), the chart overall supports it, and a dasha activates it. This function
 * decides CANCELLATION only, and nothing downstream should read a count of 2 as a promise.
 *
 * @param planet   the debilitated planet
 * @param lonBy    every graha's longitude (for locating dispositors/exalt-lords)
 * @param lagnaLon the ascendant longitude (kendra reference)
 */
export function neechaBhanga(planet: Graha, lonBy: Record<Graha, number>, lagnaLon: number): NeechaBhanga {
  const pLon = lonBy[planet];
  // STEP 1 OF HIS SIX (David's doctrine, 2026-07-20): "Is the planet actually debilitated?"
  // Both existing callers gate on that already — one on `debilitated`, one on the label — so this
  // changes nothing today. It is here because a function named neechaBhanga that happily reports
  // `cancelled: true` for a planet in its OWN SIGN is a footgun waiting for a third caller, and a
  // test I wrote to check his Step 1 found exactly that behaviour.
  if (planetDignity(planet, pLon) !== "debilitated") {
    return { cancelled: false, reasons: [], count: 0, by: [] };
  }
  const debilSign = signName(pLon);
  const lagIdx = signIndex(lagnaLon);
  const moonIdx = signIndex(lonBy.Moon);
  /**
   * "In a kendra" means a kendra from the ascendant OR from the Moon (chandra-lagna) — two
   * reference frames, the standard classical pair.
   *
   * THE TAUTOLOGY THIS GUARDS, found 2026-07-20 by measuring instead of reading. The Moon sits in
   * the 1st house from itself in every chart ever cast, so "is the Moon in a kendra?" answered
   * against the chandra-lagna frame is ALWAYS YES — an identity, not a fact about the chart. Any
   * condition whose subject is the Moon therefore fired 100% of the time:
   *
   *   · condition 1 — Mars debilitated in CANCER: the dispositor IS the Moon, so every Mars-in-
   *     Cancer in the app has been reported "cancelled" regardless of where the Moon actually is.
   *   · condition 3 — Jupiter debilitated in CAPRICORN: its exaltation is Cancer, whose lord is the
   *     Moon. Same tautology, same always-cancelled.
   *   · condition 7 — a debilitated Moon is trivially "itself in a kendra".
   *
   * The first two are shipped bugs that predate condition 7; measuring the new rule is what
   * surfaced them. Passing `who` and dropping the self-frame fixes the whole class in one place
   * rather than patching each condition — and it removes a tautology, which is not a method choice.
   */
  const inKendra = (lon: number, who?: Graha) =>
    KENDRA.has(houseFrom(lagIdx, lon)) || (who !== "Moon" && KENDRA.has(houseFrom(moonIdx, lon)));
  const reasons: string[] = [];
  const by: Graha[] = [];

  // PROVENANCE, researched 2026-07-20 → canon/neecha-bhanga-provenance.md. Read it before touching
  // this list. In short: conditions 1 and 4 are TEXTUAL (Phaladeepika 7.30 and 7.28). Conditions 2
  // and 3 are ONE VERSE under two competing glosses of the same compound — "the lord of the
  // exaltation sign" vs "the planet exalted in that sign" — so firing both double-counts a
  // philological disagreement, and `count` is used ("≥2 is a solid cancellation"). Phaladeepika
  // 7.27 (both lords in mutual kendra to EACH OTHER) is textual and NOT implemented. BPHS gives
  // none of these — its debilitation raja yoga is Ch.41 vv.19-20, a different rule entirely.
  // Left exactly as it is on purpose: which conditions are Velea's is David's ruling, not a
  // refactor. The file records the sources so the ruling is made against them.

  // 1. Dispositor of the debilitation sign in a kendra from Asc or Moon.
  const dispositor = SIGN_RULER[debilSign];
  if (dispositor !== planet && inKendra(lonBy[dispositor], dispositor)) {
    reasons.push(`dispositor ${dispositor} (lord of ${debilSign}) in a kendra`);
    by.push(dispositor);
  }

  // 2. The planet that EXALTS in the debilitation sign, in a kendra from Asc or Moon.
  //    ONE OF TWO GLOSSES of the compound in Phaladeepika 7.30 — the sibling reading is #3 below.
  const exalter = EXALTS_IN[debilSign];
  if (exalter && exalter !== planet && inKendra(lonBy[exalter], exalter)) {
    reasons.push(`${exalter} (exalts in ${debilSign}) in a kendra`);
    by.push(exalter);
  }

  // 3. Lord of the planet's EXALTATION sign, in a kendra from Asc or Moon.
  const exaltLord = SIGN_RULER[EXALT[planet].sign];
  if (exaltLord !== planet && inKendra(lonBy[exaltLord], exaltLord)) {
    reasons.push(`${exaltLord} (lord of ${planet}'s exaltation ${EXALT[planet].sign}) in a kendra`);
    by.push(exaltLord);
  }

  // 4. The debilitated planet aspected by its dispositor.
  if (dispositor !== planet) {
    const houseAway = houseFrom(signIndex(lonBy[dispositor]), pLon);
    if (aspectsHouse(dispositor, houseAway)) {
      reasons.push(`aspected by dispositor ${dispositor}`);
      by.push(dispositor);
    }
  }

  // 5. CONJUNCTION with the dispositor (David's doctrine, 2026-07-20). His condition 4 reads
  //    "the debilitated planet and its sign lord are in mutual aspect OR CONJUNCTION — this gives
  //    the sign lord an opportunity to support the weakened planet." The engine had only the aspect
  //    half, so a planet sitting in the SAME SIGN as its own rescuer did not register at all, which
  //    is the most direct form of that support there is.
  if (dispositor !== planet && signIndex(lonBy[dispositor]) === signIndex(pLon)) {
    reasons.push(`conjunct its dispositor ${dispositor}`);
    by.push(dispositor);
  }

  // 6. PARIVARTANA — exchange of signs (his condition 5). The debilitated planet sits in its
  //    dispositor's sign (true by definition of debilitation) AND the dispositor sits in a sign the
  //    debilitated planet rules. Each holds the other's house; the classical mutual-exchange rescue.
  if (dispositor !== planet) {
    const dispositorSign = signName(lonBy[dispositor]);
    if (SIGN_RULER[dispositorSign] === planet) {
      reasons.push(`sign exchange with ${dispositor} (parivartana)`);
      by.push(dispositor);
    }
  }

  // 7. THE DEBILITATED PLANET ITSELF IN A KENDRA from Asc or Moon — David's condition 3.
  //
  //    I owe him a plain retraction here. I researched the verses, found that Phaladeepika 7.30
  //    names two LORDS, and told him the popular "planet in a kendra" rule was "a mistranslation"
  //    that this engine had never implemented — "Good." His doctrine lists it as condition 3. When I
  //    answered by laying out the philology on both sides instead of building anything, he said:
  //    "huh????? i feel like you are overcomplicating this."
  //
  //    He was right. Both facts were already established and neither was in dispute: the verse names
  //    two lords, AND the planet-in-kendra rule is genuinely widespread in the living tradition. The
  //    only open question was which authority Velea follows — and that was never mine to research.
  //    It is his, he answered it by listing the condition in his own doctrine, and I turned an
  //    answered question back into a seminar. Velea follows David.
  //
  //    Note the `by` entry: the planet itself forms this cancellation, so under the canon's dashaGate
  //    rule ("latent until its planets' period activates it") this one is activated by the fallen
  //    planet's OWN period. That is the correct reading, not a shortcut — no rescuer is involved.
  if (inKendra(pLon, planet)) {
    reasons.push(`${planet} itself in a kendra`);
    by.push(planet);
  }

  const uniq = Array.from(new Set(reasons));
  return { cancelled: uniq.length > 0, reasons: uniq, count: uniq.length, by: Array.from(new Set(by)) };
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

/** THE LABEL THAT CANNOT LIE (v796, ruled v797).
 *
 * David's law: dignity and cancellation ALWAYS travel together — a raw "Debilitated" is a trap. The
 * module header has said so since it was written, and every consumer still read the bare label,
 * because the bare label is what the OTHER dignity module (panchang/dignity.ts, which has no concept
 * of cancellation) produces. So a cancelled fall was classified as strained everywhere it mattered,
 * including on David's own cancelled Moon.
 *
 * WHAT A CANCELLED FALL READS AS — David's ruling, 2026-07-20, taken from the canon rather than from
 * my instinct. canon/yogas.json universalRules:
 *
 *   neechaBhanga — "A debilitated (fallen) planet associated with an exalted planet has its debility
 *                   cancelled (neecha bhanga) and CAN ACT AS IF EXALTED."
 *   dashaGate    — "The single most common reason a yoga fails to deliver: the dasha/bhukti of the
 *                   planets forming it never runs during the relevant life period. A yoga is LATENT
 *                   until its planets' period activates it."
 *   noYogaDominates — "Never give an unmodified textbook reading of a yoga."
 *
 * So: SUPPORTIVE, but only while a period of the planets forming it runs. Outside that period it is
 * not yet a strength and not a plain fall either — it is a fall that will convert. Two labels, and
 * the gate is the canon's own rule, not a dial:
 *   · a running dasha lord is the planet itself or one of its cancellers → acting as exalted
 *   · otherwise                                                          → cancelled, latent
 * I do NOT collapse the latent case into "supported" (that would ignore dashaGate) and I do NOT let
 * either case fall into "strained" (that would ignore the cancellation). noYogaDominates is honoured
 * by carrying the reasons through so the prose modifies rather than recites.
 *
 * It also never softens what it could not check — missing longitudes, a node, a non-finite ascendant
 * all pass through as the bare "Debilitated". Silence is not cancellation.
 *
 * @param rawLabel     a TIER_LABEL string ("Debilitated", "Exalted", "Own", …) from either dignity module
 * @param runningLords the dasha lords currently running (maha/antar/pratyantar). Omitted or empty ⇒
 *                     nothing is running ⇒ latent, per dashaGate. Never guess a period.
 */
export const CANCELLED_LATENT_LABEL = "Debilitated (cancelled — latent)";
export const CANCELLED_ACTIVE_LABEL = "Debilitated (cancelled — acting as exalted)";
/** Every label that means "a fall this chart cancels", in either phase. */
export const CANCELLED_LABELS: readonly string[] = [CANCELLED_LATENT_LABEL, CANCELLED_ACTIVE_LABEL];

export function labelWithCancellation(
  planet: string,
  rawLabel: string | null | undefined,
  lonBy: Record<string, number>,
  lagnaLon: number,
  runningLords?: Array<string | null | undefined>
): { label: string; cancelled: boolean; active: boolean; reasons: string[]; by: string[] } {
  const plain = { label: rawLabel ?? "—", cancelled: false, active: false, reasons: [] as string[], by: [] as string[] };
  if (rawLabel !== "Debilitated") return plain;
  // Nodes and anything outside the seven grahas have no essential dignity and no cancellation rule.
  if (!GRAHAS.includes(planet as Graha)) return plain;
  // A missing longitude means we cannot check — and an UNCHECKED debilitation must stay
  // "Debilitated", never be quietly softened. Silence is not cancellation.
  if (!GRAHAS.every((g) => Number.isFinite(lonBy[g])) || !Number.isFinite(lagnaLon)) return plain;
  const nb = neechaBhanga(planet as Graha, lonBy as Record<Graha, number>, lagnaLon);
  if (!nb.cancelled) return plain;
  // dashaGate: the yoga's own planets must be running. The debilitated planet counts — its period is
  // when its condition speaks at all — as does any planet that supplies a cancelling condition.
  const running = new Set((runningLords ?? []).filter(Boolean) as string[]);
  const formers = [planet, ...nb.by];
  const active = formers.some((p) => running.has(p));
  return {
    label: active ? CANCELLED_ACTIVE_LABEL : CANCELLED_LATENT_LABEL,
    cancelled: true, active, reasons: nb.reasons, by: nb.by,
  };
}
