/**
 * KNOTS — the life-event convergence detector.
 *
 * David's coinage: a "knot" is the moment the sky ties a life-event theme (marriage, children,
 * career, identity, fame, …) tight enough that it's about to become LIVED — not a static natal
 * signature everyone carries, but a theme ACTIVATED NOW by the running periods and transits.
 *
 * This is a pure, deterministic backend flag (no LLM, no API cost). It reads the canon
 * (server/vedic/canon/*) for each theme's houses + karakas, then scores CONVERGENCE across
 * independent lines of evidence — dasha/time-lord bearing, conjunction/aspect to the theme's
 * house-lord or karaka, transit contact now, a meridian placement, a present yoga — and only
 * lights a knot when the theme is both in the active period AND reinforced. That gate is what
 * stops the naive over-fire (all four themes lighting on a plain day).
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
const HOUSE_LORD_COMBOS: Record<string, any> = (houseLordCombos as any).combinations ?? {};

export type KnotTheme =
  | "marriage" | "children" | "career" | "identity" | "fame"
  | "wealth" | "siblings" | "parents" | "home" | "health";

type ThemeDef = { label: string; houses: number[]; karakas: string[]; partnerKaraka?: { husband: string; wife: string } };

// Theme → (houses, karakas), straight from karakas.json knotSignificatorMap + bhava canon.
// Identity/fame/career deliberately overlap the 10th — the fold pass below expresses HOW the 10th
// cashes out for THIS chart (career vs marriage vs parenthood) rather than collapsing it to "work".
const THEMES: Record<KnotTheme, ThemeDef> = {
  marriage: { label: "Marriage / union",              houses: [7],     karakas: ["Venus"], partnerKaraka: { husband: "Jupiter", wife: "Venus" } },
  children: { label: "Children / creativity",         houses: [5],     karakas: ["Jupiter"] },
  career:   { label: "Career / vocation",             houses: [10],    karakas: ["Saturn", "Sun", "Mercury"] },
  identity: { label: "Identity — how you're received",houses: [1, 10], karakas: ["Sun"] },
  fame:     { label: "Fame / recognition",            houses: [10, 1], karakas: ["Sun"] },
  wealth:   { label: "Wealth / income",               houses: [2, 11], karakas: ["Jupiter"] },
  siblings: { label: "Inner circle / siblings",       houses: [3, 11], karakas: ["Mars"] },
  parents:  { label: "Parents / roots",               houses: [4, 9],  karakas: ["Moon", "Sun", "Jupiter"] },
  home:     { label: "Home / land",                   houses: [4],     karakas: ["Moon", "Mercury"] },
  health:   { label: "Health / vitality",             houses: [6, 1],  karakas: ["Sun", "Mars"] },
};

// Whole-sign Vedic drishti: everyone aspects the 7th; Mars +4/+8, Jupiter +5/+9, Saturn +3/+10.
// (Mirrors server/vedic/dignity.ts aspectsHouse.)
const SPECIAL_ASPECTS: Record<string, number[]> = { Mars: [4, 8], Jupiter: [5, 9], Saturn: [3, 10] };
function aspectedHouses(planet: string, fromHouse: number): number[] {
  const aways = [7, ...(SPECIAL_ASPECTS[planet] ?? [])];
  return aways.map((a) => ((fromHouse - 1 + (a - 1)) % 12) + 1);
}

export type NatalPlanet = { house: number | null; sign: string; rulesHouses: number[]; dignity?: string };

export type KnotSignal = { kind: "dasha" | "timelord" | "conjunction" | "aspect" | "transit" | "meridian" | "yoga"; weight: number; text: string };
export type KnotTier = "event" | "standing";
export type Knot = {
  theme: KnotTheme; label: string; houses: number[]; karakas: string[];
  score: number; lit: boolean; tier: KnotTier; signals: KnotSignal[];
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
const LIT_THRESHOLD = 4;

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
  const rawLords: Array<{ lord: string; level: KnotSignal["kind"]; dated: boolean; w: number; name: string }> = [];
  if (args.dashaLords.maha) rawLords.push({ lord: args.dashaLords.maha, level: "dasha", dated: true, w: 3, name: "maha-dasha" });
  if (args.dashaLords.antar) rawLords.push({ lord: args.dashaLords.antar, level: "dasha", dated: true, w: 3, name: "sub-period" });
  if (args.dashaLords.praty) rawLords.push({ lord: args.dashaLords.praty, level: "dasha", dated: true, w: 2, name: "sub-sub-period" });
  if (args.timeLord) rawLords.push({ lord: args.timeLord, level: "timelord", dated: false, w: 1, name: "year-lord" });
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
    let hasPeriodBearing = false;
    let hasHouseLine = false;   // the theme's own HOUSE or HOUSE-LORD is involved → can light at all
    let hasEventLine = false;   // the RULER got a DATED hit (transit / dasha-conjunct-lord) → event-tier

    // ── A) period bearing ── baseline dasha rulership is STANDING; a dasha lord CONJUNCT the house-lord
    //     (the classic activation, and the Simone fix) is the loudest DATED line.
    for (const { lord, level, dated, w, name } of periodLords) {
      const nl = N[lord];
      if (!nl) continue;
      const bearing: string[] = [];
      if (isPlayer(lord)) { bearing.push(`is itself ${roleOf(lord)} of this`); if (isLord(lord)) hasHouseLine = true; }
      if (nl.house != null && houses.includes(nl.house)) { bearing.push(`sits in the house of this`); hasHouseLine = true; }
      if (bearing.length) { signals.push({ kind: level, weight: isLord(lord) ? w : Math.max(1, w - 1), text: `${name} ${lord} ${bearing.join(" and ")}` }); hasPeriodBearing = true; }
      // conjunction: shares a natal house (whole-sign) with a theme player
      for (const p of players.filter((q) => q !== lord && N[q]?.house != null && N[q]!.house === nl.house)) {
        signals.push({ kind: "conjunction", weight: isLord(p) ? 3 : 2, text: `${name} ${lord} is conjunct ${p} — ${roleOf(p)} of this` });
        hasPeriodBearing = true;
        if (isLord(p)) { hasHouseLine = true; if (dated) hasEventLine = true; }   // dasha WITH the house-lord = dated event
      }
      // drishti onto a theme player's house
      for (const p of players.filter((q) => q !== lord && N[q]?.house != null && aspectedHouses(lord, nl.house ?? 0).includes(N[q]!.house!))) {
        signals.push({ kind: "aspect", weight: 1, text: `${name} ${lord} aspects ${p}, ${roleOf(p)} of this` });
        if (isLord(p)) hasHouseLine = true;
      }
      if (aspectedHouses(lord, nl.house ?? 0).some((h) => houses.includes(h)) && !bearing.length) {
        signals.push({ kind: "aspect", weight: 1, text: `${name} ${lord} aspects the house of this` });
        hasHouseLine = true;
      }
    }

    // ── B) transit (now) ── DATED. A transit onto the house-LORD, or through the theme house, is an
    //     event line; onto a karaka it only reinforces (standing).
    for (const t of args.transitsHitting ?? []) {
      if (!t.slow) continue;
      if (t.hitsNatalPoint && isPlayer(t.hitsNatalPoint)) {
        const onLord = isLord(t.hitsNatalPoint);
        signals.push({ kind: "transit", weight: onLord ? 3 : 2, text: `transiting ${t.planet} is landing on ${t.hitsNatalPoint}, ${roleOf(t.hitsNatalPoint)} of this` });
        if (onLord) { hasHouseLine = true; hasEventLine = true; }
      } else if (t.houseFromLagna != null && houses.includes(t.houseFromLagna)) {
        signals.push({ kind: "transit", weight: 2, text: `transiting ${t.planet} is moving through this territory` });
        hasHouseLine = true; hasEventLine = true;
      }
    }

    // ── C) meridian ── structural (true all year) → STANDING reinforcement, never dated.
    for (const p of args.meridianOnAxis ?? []) {
      if (isPlayer(p)) { signals.push({ kind: "meridian", weight: isLord(p) ? 2 : 1, text: `${p}, ${roleOf(p)} here, sits on the meridian (the dharma axis)` }); if (isLord(p)) hasHouseLine = true; }
    }

    // ── D) yoga (Tier-2) ──
    for (const y of args.yogasPresent ?? []) {
      if (y.knot?.includes(key)) signals.push({ kind: "yoga", weight: 2, text: `${y.name} is present` });
    }

    // ── combo prose: the theme's own house-lord placement, from canon ──
    let comboProse: Knot["comboProse"] = null;
    const primaryLord = houseLordOf(houses[0]);
    if (primaryLord && N[primaryLord]?.house) {
      const ckey = `L${houses[0]}H${N[primaryLord]!.house}`;
      const c = HOUSE_LORD_COMBOS[ckey];
      if (c) comboProse = { key: ckey, positive: c.positive, negative: c.negative };
    }

    const score = signals.reduce((s, x) => s + x.weight, 0);
    // A knot lights only when its own HOUSE/HOUSE-LORD is activated (not karaka-only) AND it clears
    // the bar. Event-tier requires the RULER to have taken a DATED hit.
    const lit = hasPeriodBearing && hasHouseLine && score >= LIT_THRESHOLD;
    const tier: KnotTier = hasEventLine ? "event" : "standing";
    knots.push({ theme: key, label: def.label, houses, karakas, score, lit, tier, signals, comboProse });
  }

  // ── rank: event-tier (dated, specific) ALWAYS above standing-tier (diffuse year frame), then by
  // score. This is the timescale law — a dated life event outranks a year-long background theme so it
  // never gets buried (the original Simone failure: a Moon-year read as mood, the engagement missed).
  const rank = (k: Knot) => (k.tier === "event" ? 1000 : 0) + k.score;
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
