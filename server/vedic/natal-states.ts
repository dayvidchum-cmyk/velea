/**
 * NATAL STATES — the remaining Vol I/II per-chart layers David's run-through requires:
 *
 *   DEEPTHAADI (Vol II Ch.3, p.252 — from Saravali Ch.5): the nine quick planet states.
 *     Radiant (exalted) · Confident (own) · Rejoicing (friend's sign) · Peaceful (benefic
 *     navamsha) · Strong (bright rays — not combust) · Harmed (lost a planetary war) ·
 *     Alarmed (fallen) · Mutilated (combust) · Sorrowful (malefic navamsha).
 *     A planet holds every state that applies.
 *
 *   CHARA KARAKAS (Vol II Ch.4, pp.256-257): the seven planets ranked by degrees-within-
 *     sign (sign ignored). K&F's printed sequence: Atma, Amatya, Bhatri, Matri-Putra,
 *     Pitri, Gnati, Stri/Dara. Plus the Karakamsha (the AK's navamsha sign, p.258) —
 *     a secondary ascendant for the D9.
 *
 *   BIRTH PANCHANG (Vol I; the five limbs at the birth moment): janma tithi + paksha,
 *     vara (sunrise-bounded weekday), janma nakshatra (the Moon's — already in natal
 *     bodies), yoga (Sun+Moon), karana (half-tithi, via panchang/karana.ts).
 *
 *   DHOOMA-GROUP UPAGRAHAS (Vol II Ch.5, pp.264-265): five Sun-derived points, pure math:
 *     Dhooma = Sun + 133°20'; Vyatipata = 360 − Dhooma; Parivesha = Vyatipata + 180;
 *     Indrachapa = 360 − Parivesha; Upaketu = Indrachapa + 16°40'.
 *
 *   KALAVELA PART-STARTS (Ch.5, pp.262-263): the day (sunrise→sunset) or night eighths;
 *     part lords run in weekday order from the day's lord (day birth) or from the 5th lord
 *     onward (night birth). The START of a planet's part, cast as an ascendant, is that
 *     planet's upagraha — Gulika (Saturn's, the one that matters), Yamakantaka (Jupiter's,
 *     benefic), Kala (Sun), Paridhi (Moon), Ardhaprahara (Mercury), Indrachapa (Venus),
 *     Mrityu (Mars). This module computes the TIMES (pure); the caller resolves each time
 *     to an ascendant longitude with the ephemeris.
 *
 * Pure math throughout. No ephemeris, no interpretation.
 */

import { GRAHAS, type Graha, planetDignity } from "./dignity";
import { signIndexOf, signName, navamsaSign } from "./vargas";
import { combustion } from "../panchang/affliction";
import { karanaFromLongitudes } from "../panchang/karana";
import { WEEKDAY_LORD } from "../panchang/hora";

const norm = (x: number) => ((x % 360) + 360) % 360;
const degInSign = (lon: number) => norm(lon) - signIndexOf(lon) * 30;
const sep = (a: number, b: number) => { const d = norm(a - b); return Math.min(d, 360 - d); };

// ── DEEPTHAADI ───────────────────────────────────────────────────────────────────────────

export type DeepthaadiState =
  | "deeptha"    // radiant — exalted
  | "swasta"     // confident — own sign
  | "mudita"     // rejoicing — friend's sign
  | "santa"      // peaceful — benefic navamsha
  | "sakta"      // strong — bright rays (not combust)
  | "nipeedita"  // harmed — defeated in planetary war
  | "bhita"      // alarmed — in its fall
  | "vikala"     // mutilated — combust
  | "khala";     // sorrowful — malefic navamsha

const NATURAL_BENEFIC_LORDS = new Set<Graha>(["Jupiter", "Venus", "Mercury", "Moon"]);
const TARAS: Graha[] = ["Mars", "Mercury", "Jupiter", "Venus", "Saturn"];

/**
 * All Deepthaadi states holding for one planet. `signDignityOf` (friend/enemy at sign
 * level) comes from avashtas.ts's table — passed in to avoid a circular import.
 */
export function deepthaadiOf(
  planet: Graha,
  lonBy: Record<string, number>,
  speedBy: Partial<Record<Graha, number>> | undefined,
  friendSign: boolean,
): DeepthaadiState[] {
  const states: DeepthaadiState[] = [];
  const lon = lonBy[planet];
  const dig = planetDignity(planet, lon);

  if (dig === "exalted") states.push("deeptha");
  if (dig === "own" || dig === "moolatrikona") states.push("swasta");
  if (friendSign) states.push("mudita");
  if (dig === "debilitated") states.push("bhita");

  // Navamsha temperament: the D9 sign's LORD benefic → peaceful; malefic → sorrowful.
  const navLord = (["Mars","Venus","Mercury","Moon","Sun","Mercury","Venus","Mars","Jupiter","Saturn","Saturn","Jupiter"] as Graha[])[navamsaSign(lon)];
  states.push(NATURAL_BENEFIC_LORDS.has(navLord) ? "santa" : "khala");

  // Combustion (Vikala) vs bright rays (Sakta) — the Sun itself is neither.
  // combustion() always returns a report for orb-bearing planets; the VERDICT is `.combust`.
  if (planet !== "Sun") {
    const c = combustion(planet, lon, lonBy.Sun, (speedBy?.[planet] ?? 0) < 0);
    states.push(c?.combust ? "vikala" : "sakta");
  }

  // Planetary war (Nipeedita): two taras within 1°. Without declinations the classical
  // "north wins" call can't be made, so BOTH participants are marked harmed — a war
  // wounds the pair (K&F Ch.3 treats war as damage to the fight itself).
  if (TARAS.includes(planet)) {
    const atWar = TARAS.some((o) => o !== planet && sep(lonBy[planet], lonBy[o]) < 1);
    if (atWar) states.push("nipeedita");
  }

  return states;
}

// ── CHARA KARAKAS ────────────────────────────────────────────────────────────────────────

/** K&F's printed sequence, highest degrees-in-sign first (pp.256-257). */
export const CHARA_KARAKA_SEQUENCE = [
  "atma", "amatya", "bhatri", "matri-putra", "pitri", "gnati", "dara",
] as const;
export type CharaKarakaName = (typeof CHARA_KARAKA_SEQUENCE)[number];

export interface CharaKarakas {
  /** karaka name → planet, in K&F's seven-planet scheme. */
  karakas: Record<CharaKarakaName, Graha>;
  /** The Atma-karaka's navamsha sign — the Karakamsha, a secondary D9 ascendant (p.258). */
  karakamsha: string;
}

export function charaKarakas(lonBy: Record<Graha, number>): CharaKarakas {
  const ranked = [...GRAHAS].sort((a, b) => degInSign(lonBy[b]) - degInSign(lonBy[a]));
  const karakas = Object.fromEntries(
    CHARA_KARAKA_SEQUENCE.map((name, i) => [name, ranked[i]]),
  ) as Record<CharaKarakaName, Graha>;
  return { karakas, karakamsha: signName(navamsaSign(lonBy[karakas.atma])) };
}

// ── BIRTH PANCHANG ───────────────────────────────────────────────────────────────────────

const TITHI_NAMES = [
  "Pratipada", "Dwitiya", "Tritiya", "Chaturthi", "Panchami", "Shashthi", "Saptami",
  "Ashtami", "Navami", "Dashami", "Ekadashi", "Dwadashi", "Trayodashi", "Chaturdashi",
];
const YOGA_NAMES = [
  "Vishkambha", "Priti", "Ayushman", "Saubhagya", "Shobhana", "Atiganda", "Sukarma",
  "Dhriti", "Shula", "Ganda", "Vriddhi", "Dhruva", "Vyaghata", "Harshana", "Vajra",
  "Siddhi", "Vyatipata", "Variyana", "Parigha", "Shiva", "Siddha", "Sadhya", "Shubha",
  "Shukla", "Brahma", "Indra", "Vaidhriti",
];

export interface BirthPanchang {
  tithi: { number: number; name: string; paksha: "Shukla" | "Krishna" };
  /** Sunrise-bounded weekday lord (the Vedic vara). */
  vara: Graha;
  yoga: { number: number; name: string };
  karana: { name: string; quality: string };
}

/** The five limbs at birth. `vedicWeekday` = 0(Sun)..6(Sat) of the sunrise-bounded day. */
export function birthPanchang(sunLon: number, moonLon: number, vedicWeekday: number): BirthPanchang {
  const elong = norm(moonLon - sunLon);
  const tithiNum = Math.floor(elong / 12) + 1; // 1..30
  const inPaksha = ((tithiNum - 1) % 15) + 1;  // 1..15
  const tithiName = inPaksha === 15 ? (tithiNum === 15 ? "Purnima" : "Amavasya") : TITHI_NAMES[inPaksha - 1];
  const yogaNum = Math.floor(norm(sunLon + moonLon) / (360 / 27)) + 1; // 1..27
  const k = karanaFromLongitudes(sunLon, moonLon);
  return {
    tithi: { number: tithiNum, name: tithiName, paksha: tithiNum <= 15 ? "Shukla" : "Krishna" },
    vara: WEEKDAY_LORD[vedicWeekday] as Graha,
    yoga: { number: yogaNum, name: YOGA_NAMES[yogaNum - 1] },
    karana: { name: k.name, quality: k.quality },
  };
}

// ── UPAGRAHAS ────────────────────────────────────────────────────────────────────────────

/** The five Dhooma-group points from the Sun (pp.264-265). Longitudes 0..360. */
export function dhoomaGroup(sunLon: number): Record<string, number> {
  const dhooma = norm(sunLon + 133 + 20 / 60);
  const vyatipata = norm(360 - dhooma);
  const parivesha = norm(vyatipata + 180);
  const indrachapa = norm(360 - parivesha);
  const upaketu = norm(indrachapa + 16 + 40 / 60);
  return { dhooma, vyatipata, parivesha, indrachapa, upaketu };
}

export const KALAVELA_OF: Record<Graha, string> = {
  Sun: "kala", Moon: "paridhi", Mercury: "ardhaprahara", Venus: "indrachapaK",
  Mars: "mrityu", Jupiter: "yamakantaka", Saturn: "gulika",
};

/**
 * Kalavela part-START times (UTC ms) for all seven planets (pp.262-263).
 * Day birth: day span ÷ 8, part lords from the weekday lord in weekday order.
 * Night birth: night span ÷ 8, part lords from the FIFTH lord counted from the day's lord.
 * The eighth part is lordless. The caller casts each start time as an ascendant.
 */
export function kalavelaStarts(opts: {
  birthUtcMs: number;
  sunriseMs: number;
  sunsetMs: number;
  nextSunriseMs: number;
  /** 0(Sun)..6(Sat) — the sunrise-bounded Vedic weekday. */
  vedicWeekday: number;
}): Record<string, number> {
  const isDay = opts.birthUtcMs >= opts.sunriseMs && opts.birthUtcMs < opts.sunsetMs;
  const spanStart = isDay ? opts.sunriseMs : opts.sunsetMs;
  const spanLen = (isDay ? opts.sunsetMs - opts.sunriseMs : opts.nextSunriseMs - opts.sunsetMs) / 8;
  const firstLordIdx = isDay ? opts.vedicWeekday : (opts.vedicWeekday + 4) % 7; // night: the 5th lord onward
  const out: Record<string, number> = {};
  for (let part = 0; part < 7; part++) {
    const lord = WEEKDAY_LORD[(firstLordIdx + part) % 7] as Graha;
    out[KALAVELA_OF[lord]] = spanStart + spanLen * part;
  }
  return out;
}
