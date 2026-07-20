/**
 * KNOTS — the life-event convergence detector.
 *
 * David's coinage: a "knot" is the moment the sky ties a life-event theme (marriage, children,
 * career, identity, fame, …) tight enough that it's about to become LIVED — not a static natal
 * signature everyone carries, but a theme ACTIVATED NOW by the running periods and transits.
 *
 * This is a pure, deterministic backend flag (no LLM, no API cost). It reads the canon
 * (server/vedic/canon/*) for each theme's houses + karakas, then applies Appendix IV STEP 15:
 * "when the MahaDasha lord and sub-cycle lords indicate SIMILAR events, predict that event; the
 * more sub-cycles that agree, the better the probability." Convergence is a form of interaction —
 * sambhanda (Vol I Ch.8): a period-lord counts only when it is ACTIVELY tied to the theme (sits in
 * its house, is conjunct or aspects its ruler), never for merely holding TITLE to a house while
 * interacting with nothing. A knot lights on the COUNT of converging lords (≥2, or 1 + a dated hit
 * on the ruler), NOT a weight-sum. That count is what stops the over-fire (every quiet chart lit up
 * because every lord rules some house — titular ownership was miscounted as a signal).
 *
 * The specific gap it closes: the life-area lens counted a dasha lord only if it ruled/sat-in/owned
 * a theme house or WAS a karaka — never if it was CONJUNCT or ASPECTED the house-lord/karaka. That
 * blindness made Simone's marriage invisible: her maha lord Rahu sits WITH her 7th lord Mars. Here,
 * conjunction and drishti to a theme player are first-class lines.
 *
 * Canon sources: karakas.json (knotSignificatorMap + the non-heteronormative partner rule),
 * bhava-significations.json (10th = dharma/identity/fame, not career-only), yogas.json (Tier-2),
 * house-lord-combinations.json (the lived result prose). See server/vedic/canon/README.md.
 */
// Bundled JSON import (esbuild inlines it into dist — no runtime file read, which would break the
// bundled prod server since the canon dir doesn't ship next to dist/index.js).
import houseLordCombos from "./canon/house-lord-combinations.json";
import karakasCanon from "./canon/karakas.json";
const HOUSE_LORD_COMBOS: Record<string, any> = (houseLordCombos as any).combinations ?? {};

export type KnotTheme =
  | "marriage" | "children" | "career" | "identity" | "fame"
  | "wealth" | "siblings" | "parents" | "home" | "health";

type ThemeDef = { label: string; houses: number[]; karakas: string[]; partnerKaraka?: { husband: string; wife: string } };

// Theme → (houses, karakas). The six themes the canon indexes are now READ FROM IT rather than
// re-typed here (canon/karakas.json knotSignificatorMap, Vol I Ch.4 + Ch.7) — that file was the
// third canon file imported by nothing, and the hand-copied table had already drifted: career's
// karakas were [Saturn, Sun, Mercury] where the canon says [Mercury, Sun, Jupiter, Saturn]. JUPITER
// WAS MISSING, so a Jupiter dasha, or Jupiter lighting the 10th, did not register as a career knot
// at all — the counsel/teaching/wisdom karaka, absent from the vocation theme.
// THE FOUR EXTENSIONS STAY LOCAL, deliberately: wealth, home and health have no entry in the canon
// index, and the canon splits father [9]/[Sun,Jupiter] and mother [4]/[Moon] where this engine reads
// one `parents` theme — whose [4,9] / [Moon,Sun,Jupiter] is exactly their union. Deriving the whole
// table from the canon would silently delete four themes and split a fifth; deriving only what the
// canon actually indexes keeps both the canon and the extensions honest.
// Identity/fame/career deliberately overlap the 10th — the fold pass below expresses HOW the 10th
// cashes out for THIS chart (career vs marriage vs parenthood) rather than collapsing it to "work".
const CANON_MAP = (karakasCanon as any).knotSignificatorMap as Record<string, { houses?: number[]; karakas?: string[] }>;
const fromCanon = (theme: string, label: string, extra?: Partial<ThemeDef>): ThemeDef => {
  const c = CANON_MAP[theme];
  if (!c?.houses?.length || !c?.karakas?.length) throw new Error(`karakas.json lost its "${theme}" entry`);
  return { label, houses: [...c.houses], karakas: [...c.karakas], ...extra };
};
const THEMES: Record<KnotTheme, ThemeDef> = {
  marriage: fromCanon("marriage", "Marriage / union", { partnerKaraka: { husband: "Jupiter", wife: "Venus" } }),
  children: fromCanon("children", "Children / creativity"),
  career:   fromCanon("career",   "Career / vocation"),
  identity: fromCanon("identity", "Identity — how you're received"),
  fame:     fromCanon("fame",     "Fame / recognition"),
  siblings: fromCanon("siblings", "Inner circle / siblings"),
  // Not in the canon's index — Velea's own, kept explicit so nothing silently vanishes:
  wealth:   { label: "Wealth / income",               houses: [2, 11], karakas: ["Jupiter"] },
  parents:  { label: "Parents / roots",               houses: [4, 9],  karakas: ["Moon", "Sun", "Jupiter"] }, // = canon father ∪ mother
  home:     { label: "Home / land",                   houses: [4],     karakas: ["Moon", "Mercury"] },
  health:   { label: "Health / vitality",             houses: [6, 1],  karakas: ["Sun", "Mars"] },
};

/** Exposed for the canon-drift test only (knots.canon.test.ts). Not part of the public API. */
export const THEME_TABLE_FOR_TEST = THEMES;

// Whole-sign Vedic drishti: everyone aspects the 7th; Mars +4/+8, Jupiter +5/+9, Saturn +3/+10.
// (Mirrors server/vedic/dignity.ts aspectsHouse.)
const SPECIAL_ASPECTS: Record<string, number[]> = { Mars: [4, 8], Jupiter: [5, 9], Saturn: [3, 10] };
function aspectedHouses(planet: string, fromHouse: number): number[] {
  const aways = [7, ...(SPECIAL_ASPECTS[planet] ?? [])];
  return aways.map((a) => ((fromHouse - 1 + (a - 1)) % 12) + 1);
}

export type NatalPlanet = { house: number | null; sign: string; rulesHouses: number[]; dignity?: string };

export type KnotSignal = { kind: "dasha" | "timelord" | "conjunction" | "aspect" | "transit" | "meridian" | "yoga"; text: string };
export type KnotTier = "event" | "standing";
export type Knot = {
  theme: KnotTheme; label: string; houses: number[]; karakas: string[];
  /** Appendix IV Step 15: how many running period-lords are ACTIVELY tied to this theme (placed in
   *  the house / conjunct or aspecting the house-lord). "The more sub cycles that indicate a certain
   *  event, the better probability." This is the count, NOT an invented weight-sum. */
  convergence: number; lit: boolean; tier: KnotTier; signals: KnotSignal[];
  /** THE HEAVY LORD (David's law, 2026-07-17, decided on the Simone proving case: "when a dasha lord
   *  lands on the Meridian, it's the whole reading"). A period lord SEATED on the MC/IC axis has its
   *  active tie count double: `weight` = convergence + one per axis-seated active lord.
   *  INTENSITY, NOT AGREEMENT. `lit` gates on the honest lord COUNT, never on this — a weighted gate
   *  lets one axis-seated maha lord reach ≥2 and light a chapter with nobody agreeing with it, which
   *  is the phantom v430 removed. Use `weight` to rank how loud a lit chapter is. Equal to
   *  convergence on charts with no MC and whenever no tied lord sits on the axis. */
  weight: number;
  /** The active lords that are axis-seated — the ones doubling. Empty unless meridianOnAxis is given. */
  heavyLords: string[];
  /** The distinct period-lords behind `convergence` (the tally members, deduped). */
  activeLords: string[];
  /** The maha lord itself is tied — Step 15's anchor (the chapter frame). */
  mahaTied: boolean;
  folds?: KnotTheme[];            // other lit themes that converge on the same planet(s)
  comboProse?: { key: string; positive?: string; negative?: string } | null;
};

export type BuildKnotsArgs = {
  natal: Record<string, NatalPlanet>;         // by planet name — house/sign/rulesHouses/dignity
  dashaLords: { maha?: string | null; antar?: string | null; praty?: string | null };
  timeLord?: string | null;
  transitsHitting?: Array<{ planet: string; hitsNatalPoint: string | null; houseFromLagna: number | null; slow: boolean }>;
  meridianOnAxis?: string[];                    // planets sitting on the MC/IC axis (by sign)
  partnerGender?: "husband" | "wife" | null;   // when known; else the gendered partner-karaka line stays off
  yogasPresent?: Array<{ name: string; knot: string[] }>;
};

const GRAHAS = ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn", "Rahu", "Ketu"];

export function buildKnots(args: BuildKnotsArgs): { lit: Knot[]; all: Knot[]; arudhaLagnaHouse: number | null } {
  const N = args.natal;
  const houseLordOf = (h: number): string | null =>
    GRAHAS.find((p) => N[p]?.rulesHouses?.includes(h)) ?? null;
  const planetsInHouse = (h: number): string[] => GRAHAS.filter((p) => N[p]?.house === h);

  // ── ARUDHA LAGNA (identity as received in the world — canon/arudha-lagna.json) ──
  // Count from the lagna to its lord (= the lord's house h), then h houses again; the arrival is the
  // AL. If it lands on the 1st or 7th (the two exceptions), move 10 houses on. Raw = 2h−1.
  const lagnaLord = houseLordOf(1);
  let alHouse: number | null = null;
  if (lagnaLord && N[lagnaLord]?.house != null) {
    const h = N[lagnaLord]!.house!;
    const raw = ((2 * h - 2) % 12) + 1;
    alHouse = raw === 1 || raw === 7 ? ((raw - 1 + 9) % 12) + 1 : raw;
  }

  // Period lords, DEDUPED by planet — if the same body is both year-lord and a dasha lord (the
  // Moon-double-count trap: Simone's Moon is timelord AND antar), it counts ONCE at its loudest.
  // dashaWeight distinguishes the DATED dasha spine (maha/antar) from the diffuse year frame
  // (timelord ruling a house is true all year — a standing fact, not an event).
  // `counts` = participates in the Step-15 convergence TALLY. Only the Vimshottari spine (maha/antar/
  // praty) counts — Step 15 is strictly Vimshottari. The annual-profection year-lord is a DIFFERENT
  // timing system: it REINFORCES prose but must not pad the count (mixing systems is exactly the
  // Moon-double-count trap — the Moon as both year-lord and antar would otherwise count twice).
  const rawLords: Array<{ lord: string; level: KnotSignal["kind"]; dated: boolean; counts: boolean; name: string }> = [];
  if (args.dashaLords.maha) rawLords.push({ lord: args.dashaLords.maha, level: "dasha", dated: true, counts: true, name: "maha-dasha" });
  if (args.dashaLords.antar) rawLords.push({ lord: args.dashaLords.antar, level: "dasha", dated: true, counts: true, name: "sub-period" });
  if (args.dashaLords.praty) rawLords.push({ lord: args.dashaLords.praty, level: "dasha", dated: true, counts: true, name: "sub-sub-period" });
  if (args.timeLord) rawLords.push({ lord: args.timeLord, level: "timelord", dated: false, counts: false, name: "year-lord" });
  const seen = new Set<string>();
  const periodLords = rawLords.filter((x) => (seen.has(x.lord) ? false : (seen.add(x.lord), true)));

  const knots: Knot[] = [];

  for (const key of Object.keys(THEMES) as KnotTheme[]) {
    const def = THEMES[key];
    // IDENTITY reads from the Arudha Lagna (the image the world receives), NOT the 10th-by-default —
    // its house is the AL house and its "shapers" are whatever tenants that image house. This is the
    // canon fix for reading identity as career (canon/arudha-lagna.json, velea-dharma-is-identity).
    const useAL = key === "identity" && alHouse != null;
    const houses = useAL ? [alHouse!] : def.houses;
    // theme players = the lords of the theme houses + the karakas (+ gendered partner karaka if known)
    const lords = houses.map(houseLordOf).filter(Boolean) as string[];
    const karakas = useAL ? planetsInHouse(alHouse!) : [...def.karakas];
    if (def.partnerKaraka && args.partnerGender) karakas.push(def.partnerKaraka[args.partnerGender]);
    const players = Array.from(new Set([...lords, ...karakas]));
    const isPlayer = (p: string) => players.includes(p);
    const isLord = (p: string) => lords.includes(p);
    const roleOf = (p: string) => (isLord(p) ? "the ruler" : "a significator");

    const signals: KnotSignal[] = [];
    // Appendix IV Step 15 discipline: a period-lord "indicates" this event only when it is ACTIVELY
    // tied to it — placed IN a theme house, CONJUNCT the house-lord, or ASPECTING the house/house-lord.
    // Merely holding TITLE to a theme house while sitting inertly elsewhere is NOT a convergence line
    // (every lord rules some house — counting title is exactly what over-fired every quiet chart).
    const activeLords = new Set<string>();   // distinct period-lords with an ACTIVE tie → the convergence count
    let datedRulerHit = false;               // a DATED hit ON THE HOUSE-LORD (dasha-conjunct-lord / transit-on-lord) → event-tier

    // ── A) period-lord ties ── each running lord (maha/antar/praty/year), checked for an ACTIVE line.
    for (const { lord, level, counts, name } of periodLords) {
      const nl = N[lord];
      if (!nl) continue;
      let active = false;
      // (i) the lord sits IN a theme house
      if (nl.house != null && houses.includes(nl.house)) {
        signals.push({ kind: level, text: `${name} ${lord} sits in the house of this` }); active = true;
      }
      // (ii) the lord IS the house-lord AND is placed in / aspects a theme house (an ACTIVATED ruler,
      //      not one holding title from afar). Bare title with no tie is deliberately skipped.
      if (isLord(lord) && (nl.house != null && (houses.includes(nl.house) || aspectedHouses(lord, nl.house).some((h) => houses.includes(h))))) {
        signals.push({ kind: level, text: `${name} ${lord} is the ruler of this and is tied to its house` }); active = true;
      }
      // (iii) conjunct a house-LORD (the classic activation, and the Simone fix: Rahu maha sits with 7th lord Mars).
      //       This is a STATIC natal fact — true for the whole dasha — so it establishes the CHAPTER
      //       (adds to convergence) but must NOT set datedRulerHit: a natal conjunction dates nothing.
      //       Dating comes only from a MOVING trigger (a transit onto the ruler, section B). Otherwise
      //       the "event" would fire every day for the entire multi-year dasha (the un-dated founding wound).
      for (const p of lords.filter((q) => q !== lord && N[q]?.house != null && N[q]!.house === nl.house)) {
        signals.push({ kind: "conjunction", text: `${name} ${lord} is conjunct ${p}, the ruler of this` });
        active = true;
      }
      // (iv) conjunct a KARAKA — reinforces the prose but is NOT a convergence line on its own
      for (const p of karakas.filter((q) => q !== lord && N[q]?.house != null && N[q]!.house === nl.house && !lords.includes(q))) {
        signals.push({ kind: "conjunction", text: `${name} ${lord} is conjunct ${p}, a significator of this` });
      }
      // (v) drishti onto a house-LORD → active line
      for (const p of lords.filter((q) => q !== lord && N[q]?.house != null && aspectedHouses(lord, nl.house ?? 0).includes(N[q]!.house!))) {
        signals.push({ kind: "aspect", text: `${name} ${lord} aspects ${p}, the ruler of this` }); active = true;
      }
      if (active && counts) activeLords.add(lord);   // year-lord ties reinforce prose but don't tally
    }

    // ── B) transit (now) ── a slow transit ONTO the house-lord is a dated ruler-hit; a transit merely
    //     THROUGH the theme house is standing weather (it colors, it does not by itself make an event —
    //     this is the fix for a benefic drifting through the 7th being read as a marriage).
    for (const t of args.transitsHitting ?? []) {
      if (!t.slow) continue;
      if (t.hitsNatalPoint && isLord(t.hitsNatalPoint)) {
        signals.push({ kind: "transit", text: `transiting ${t.planet} is landing on ${t.hitsNatalPoint}, the ruler of this` });
        datedRulerHit = true;
      } else if (t.hitsNatalPoint && isPlayer(t.hitsNatalPoint)) {
        signals.push({ kind: "transit", text: `transiting ${t.planet} is landing on ${t.hitsNatalPoint}, a significator of this` });
      } else if (t.houseFromLagna != null && houses.includes(t.houseFromLagna)) {
        signals.push({ kind: "transit", text: `transiting ${t.planet} is moving through this territory` });
      }
    }

    // ── C) meridian ── a natal standing fact, so it is never its OWN convergence line: an axis-seated
    //     planet that is not otherwise tied adds nothing. But when a period lord is BOTH actively tied
    //     AND seated on the dharma axis, David's heavy-lord law (2026-07-17, the Simone engagement —
    //     "when a dasha lord lands on the Meridian, it's the whole reading") doubles that tie. That law
    //     lived only in convergence.ts, applied AFTER this function returned, so the live knot layer
    //     ignored it while the stored timeline obeyed it and the two disagreed about the same chart.
    //     One law, one place (v798).
    for (const p of args.meridianOnAxis ?? []) {
      if (isPlayer(p)) signals.push({ kind: "meridian", text: `${p}, ${roleOf(p)} here, sits on the meridian (the dharma axis)` });
    }

    // ── D) yoga (Tier-2) ── reinforces prose only.
    for (const y of args.yogasPresent ?? []) {
      if (y.knot?.includes(key)) signals.push({ kind: "yoga", text: `${y.name} is present` });
    }

    // ── combo prose: the theme's own house-lord placement, from canon ──
    let comboProse: Knot["comboProse"] = null;
    const primaryLord = houseLordOf(houses[0]);
    if (primaryLord && N[primaryLord]?.house) {
      const ckey = `L${houses[0]}H${N[primaryLord]!.house}`;
      const c = HOUSE_LORD_COMBOS[ckey];
      if (c) comboProse = { key: ckey, positive: c.positive, negative: c.negative };
    }

    // Appendix IV Step 15 reads OUTWARD FROM THE MAHADASHA LORD: it frames the chapter, and the
    // sub-cycles either agree with it or they don't. So a STANDING theme (the year's background) lights
    // only when the maha lord itself is tied AND at least one more period-lord agrees (≥2 converging,
    // maha-anchored) — sub-cycles agreeing among themselves without the maha frame is not the chapter.
    // An ACUTE event breaks through on its own — but ONLY a MOVING trigger dates it: a slow transit
    // landing on the ruler (section B). A static natal dasha-conjunction establishes the chapter, it
    // does not date it. A transit merely through a house (not onto the ruler) never lights an event.
    const convergence = activeLords.size;
    // Heavy-lord weighting: each ACTIVE tie belonging to an axis-seated lord counts twice. This is
    // INTENSITY, not agreement — see the gate below.
    const heavyLords = Array.from(activeLords).filter((L) => (args.meridianOnAxis ?? []).includes(L));
    const weight = convergence + heavyLords.length;
    const mahaTied = args.dashaLords.maha != null && activeLords.has(args.dashaLords.maha);
    // THE GATE COUNTS LORDS, NOT WEIGHT (v798). Step 15 lights a standing chapter when the maha lord
    // is tied AND AT LEAST ONE MORE PERIOD-LORD AGREES. A weighted gate breaks that: a single
    // axis-seated maha lord doubles to 2 and lights the chapter alone, with nobody agreeing with it
    // — the phantom the v430 rebuild exists to prevent, and knots.test.ts caught it the moment the
    // weighting was wired to `lit`. The stored timeline HAS been gating on weight since v639, so it
    // has been manufacturing standing chapters from one lord on every axis-seated maha.
    // David's law is "when a dasha lord lands on the Meridian, it's the whole reading" — that is
    // about how loud a real chapter is, not about inventing agreement. So weight ranks; lords gate.
    const lit = (mahaTied && convergence >= 2) || (convergence >= 1 && datedRulerHit);
    const tier: KnotTier = datedRulerHit ? "event" : "standing";
    knots.push({
      theme: key, label: def.label, houses, karakas, convergence, weight, heavyLords, lit, tier, signals, comboProse,
      activeLords: Array.from(activeLords), mahaTied,
    });
  }

  // ── rank: event-tier (dated, specific) ALWAYS above standing-tier (diffuse year frame), then by
  // convergence. This is the timescale law — a dated life event outranks a year-long background theme
  // so it never gets buried (the original Simone failure: a Moon-year read as mood, the engagement missed).
  const rank = (k: Knot) => (k.tier === "event" ? 1000 : 0) + k.convergence;
  const ranked = knots.filter((k) => k.lit).sort((a, b) => rank(b) - rank(a));

  // ── fold resolution: a lit theme folds into a STRONGER one when they share a HOUSE, or a lord of
  // one sits in a house of the other (the 10th carrying the 7th lord → career/identity/fame fold into
  // marriage). Deliberately NOT on a merely-shared karaka — siblings (3rd) stays a distinct year-theme
  // rather than being swallowed by marriage just because Mars serves both.
  const lordsOf = (k: Knot) => k.houses.map(houseLordOf).filter(Boolean) as string[];
  const folded = new Set<KnotTheme>();
  for (let i = 0; i < ranked.length; i++) {
    if (folded.has(ranked[i].theme)) continue;
    for (let j = i + 1; j < ranked.length; j++) {
      if (folded.has(ranked[j].theme)) continue;
      const sharedHouse = ranked[i].houses.some((h) => ranked[j].houses.includes(h));
      const carried =
        lordsOf(ranked[j]).some((p) => N[p]?.house != null && ranked[i].houses.includes(N[p]!.house!)) ||
        lordsOf(ranked[i]).some((p) => N[p]?.house != null && ranked[j].houses.includes(N[p]!.house!));
      if (sharedHouse || carried) { (ranked[i].folds ??= []).push(ranked[j].theme); folded.add(ranked[j].theme); }
    }
  }
  // Top-level lit = ranked knots that weren't folded into a stronger one (folds recorded on the parent).
  const lit = ranked.filter((k) => !folded.has(k.theme));
  return { lit, all: knots.sort((a, b) => rank(b) - rank(a)), arudhaLagnaHouse: alHouse };
}
