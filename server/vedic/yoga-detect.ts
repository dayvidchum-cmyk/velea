/**
 * YOGA DETECTION — the named yogas of Vol I + Vol II Ch.7, detected mechanically against
 * canon/yogas.json (the prose canon; this module encodes each listed condition).
 *
 * Canon universal rules (yogas.json):
 *   · judgeFromMultipleLagnas — every frame-dependent yoga is judged from the Ascendant,
 *     the Chandra lagna AND the Surya lagna; holding from more frames = more influential.
 *     `frames` records where it holds. Frame-independent yogas report ["natal"].
 *   · navamsha presence — the same yoga also present in the D9 manifests with great
 *     strength → `inNavamsha`.
 *   · the dasha gate (a yoga fires in its participants' periods) is a RUNTIME overlay —
 *     the stored detection is the natal promise, not its timing.
 *
 * Honest limits, stated per yoga where they bite:
 *   · Maha Bhagya is gender-conditional; profiles carry no gender, so it is reported as a
 *     CANDIDATE when the celestial half holds (day/night + odd/even signs), never asserted.
 *   · Detection needs day/night birth for Maha Bhagya — absent (no-time charts) it skips.
 *
 * Pure math. Combustion orbs from panchang/affliction (the app's single source).
 */

import { GRAHAS, type Graha, SIGN_RULER, planetDignity } from "./dignity";
import { signIndexOf, signName, vargaSignOf } from "./vargas";
import { grahaAspectsSign } from "./aspects";
import { signDignity } from "./avashtas";
import { combustion } from "../panchang/affliction";

const norm = (x: number) => ((x % 360) + 360) % 360;
const KENDRA = [1, 4, 7, 10];
const TRINE = [1, 5, 9];
const UPACHAYA = [3, 6, 10, 11];
const BENEFICS: Graha[] = ["Jupiter", "Venus", "Mercury", "Moon"]; // natural, sign-lord grade
const MALEFICS: Graha[] = ["Sun", "Mars", "Saturn"];

export type YogaFrame = "lagna" | "chandra" | "surya" | "natal";

export interface DetectedYoga {
  name: string;
  type: string;
  /** Frames the yoga holds from (universalRules.judgeFromMultipleLagnas). */
  frames: YogaFrame[];
  /** Also present in the D9 → manifests with great strength. */
  inNavamsha: boolean;
  /** Extra qualification (e.g. Maha Bhagya's gender condition). */
  note?: string;
}

export interface YogaInput {
  lonBy: Record<string, number>;
  lagnaLon: number;
  speedBy?: Partial<Record<Graha, number>>;
  /** Day birth (sunrise→sunset)? null when unknown (no-time charts). */
  isDayBirth?: boolean | null;
}

/** One chart-frame: positions as sign indices + a reference (lagna) sign. */
interface Frame {
  refSign: number;
  signOf: Record<string, number>;
}

/** House 1..12 of a body from the frame's reference sign. */
const houseIn = (f: Frame, body: string) => ((f.signOf[body] - f.refSign + 12) % 12) + 1;
const lordOfHouse = (f: Frame, h: number): Graha => SIGN_RULER[signName((f.refSign + h - 1) % 12)] as Graha;
const inHouses = (f: Frame, body: string, houses: number[]) => houses.includes(houseIn(f, body));
const occupantsOf = (f: Frame, h: number, bodies: string[] = [...GRAHAS]) =>
  bodies.filter((b) => houseIn(f, b) === h);

/** Sambandha (mutual association): conjunction, mutual aspect, or exchange. */
function sambandha(f: Frame, a: Graha, b: Graha): boolean {
  const sa = f.signOf[a], sb = f.signOf[b];
  if (sa === sb) return true;
  if (grahaAspectsSign(a, sa, sb) && grahaAspectsSign(b, sb, sa)) return true;
  return SIGN_RULER[signName(sa)] === b && SIGN_RULER[signName(sb)] === a; // parivartana
}

/**
 * Detect every codable canon yoga in one frame set. Returns name → holds?
 * `frameKind` matters only for prose-notes; the math is identical per frame.
 */
function detectInFrame(f: Frame, input: YogaInput, dignities: Record<Graha, string>): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  const strongSign = (g: Graha) => ["exalted", "moolatrikona", "own"].includes(dignities[g]);
  const isCombust = (g: Graha) =>
    g !== "Sun" && !!combustion(g, input.lonBy[g], input.lonBy.Sun, (input.speedBy?.[g] ?? 0) < 0);

  // Pancha Mahapurusha: own/exaltation sign AND kendra or trine.
  const MAHAPURUSHA: Array<[string, Graha]> = [
    ["Ruchaka (Pancha Mahapurusha — Mars)", "Mars"], ["Bhadra (Pancha Mahapurusha — Mercury)", "Mercury"],
    ["Hansa (Pancha Mahapurusha — Jupiter)", "Jupiter"], ["Malavya (Pancha Mahapurusha — Venus)", "Venus"],
    ["Shasha (Pancha Mahapurusha — Saturn)", "Saturn"],
  ];
  for (const [name, g] of MAHAPURUSHA) {
    out[name] = strongSign(g) && (inHouses(f, g, KENDRA) || inHouses(f, g, TRINE));
  }

  // Dharma Karma Adhipati: 5th/9th lord sambandha with 1st/4th/7th/10th lord.
  out["Dharma Karma Adhipati"] = [5, 9].some((t) =>
    [1, 4, 7, 10].some((k) => {
      const lt = lordOfHouse(f, t), lk = lordOfHouse(f, k);
      return lt !== lk && sambandha(f, lt, lk);
    }));

  // Lunar yogas (Moon-relative — same in every frame; harmless to recompute).
  const moonHouseFrom = (body: string) => ((f.signOf[body] - f.signOf.Moon + 12) % 12) + 1;
  const nonSunNonNode = GRAHAS.filter((g) => g !== "Sun" && g !== "Moon");
  out["Sunapha"] = nonSunNonNode.some((g) => moonHouseFrom(g) === 2);
  out["Anapha"] = nonSunNonNode.some((g) => moonHouseFrom(g) === 12);
  out["Durudhara"] = out["Sunapha"] && out["Anapha"];
  out["Kemadruma"] = !out["Sunapha"] && !out["Anapha"];
  out["Sakata / Shataka"] = [6, 8, 12].includes(((f.signOf.Moon - f.signOf.Jupiter + 12) % 12) + 1);
  out["Gaja Keshari"] =
    KENDRA.includes(moonHouseFrom("Jupiter")) &&
    dignities.Jupiter !== "debilitated" && !isCombust("Jupiter") &&
    BENEFICS.some((b) => b !== "Jupiter" &&
      (f.signOf[b] === f.signOf.Jupiter || grahaAspectsSign(b, f.signOf[b], f.signOf.Jupiter)));

  // Solar yogas (Sun-relative).
  const sunHouseFrom = (body: string) => ((f.signOf[body] - f.signOf.Sun + 12) % 12) + 1;
  const nonMoon = GRAHAS.filter((g) => g !== "Moon" && g !== "Sun");
  out["Veshi"] = nonMoon.some((g) => sunHouseFrom(g) === 2);
  out["Vashi"] = nonMoon.some((g) => sunHouseFrom(g) === 12);
  out["Ubhayachari"] = out["Veshi"] && out["Vashi"];

  // Enclosures from the reference sign.
  const h2 = occupantsOf(f, 2), h12 = occupantsOf(f, 12);
  out["Shubha Kartari"] = h2.some((g) => BENEFICS.includes(g as Graha)) && h12.some((g) => BENEFICS.includes(g as Graha));
  out["Papa Kartari"] = h2.some((g) => MALEFICS.includes(g as Graha)) && h12.some((g) => MALEFICS.includes(g as Graha));

  // Wealth/benefic placements.
  out["Ati Vasuman"] = (["Mercury", "Venus", "Jupiter"] as Graha[]).every((g) => inHouses(f, g, UPACHAYA));
  out["Vasumat"] = BENEFICS.filter((g) => g !== "Moon").every((g) => inHouses(f, g, UPACHAYA));
  out["Amala"] = occupantsOf(f, 10).some((g) => BENEFICS.includes(g as Graha));
  out["Srik"] = KENDRA.every((h) => occupantsOf(f, h).every((g) => BENEFICS.includes(g as Graha))) &&
    KENDRA.some((h) => occupantsOf(f, h).length > 0);
  out["Sarpa"] = KENDRA.every((h) => occupantsOf(f, h).every((g) => MALEFICS.includes(g as Graha))) &&
    KENDRA.some((h) => occupantsOf(f, h).length > 0);

  // Exchange — any pair (frame-independent).
  out["Parivartana"] = GRAHAS.some((a) => GRAHAS.some((b) => {
    if (a >= b) return false;
    const sa = f.signOf[a], sb = f.signOf[b];
    return sa !== sb && SIGN_RULER[signName(sa)] === b && SIGN_RULER[signName(sb)] === a;
  }));

  // Nodal: all seven on one side of the Rahu→Ketu arc.
  const rahu = input.lonBy.Rahu;
  const within = (lon: number) => norm(lon - rahu) < 180;
  const sides = GRAHAS.map((g) => within(input.lonBy[g]));
  out["Kala Sarpa"] = sides.every(Boolean) || sides.every((x) => !x);

  // Intellect/dhana pairs.
  out["Buddhaditya"] = f.signOf.Sun === f.signOf.Mercury;
  out["Chandra-Mangala"] = f.signOf.Moon === f.signOf.Mars ||
    (grahaAspectsSign("Moon", f.signOf.Moon, f.signOf.Mars) && grahaAspectsSign("Mars", f.signOf.Mars, f.signOf.Moon)) ||
    (SIGN_RULER[signName(f.signOf.Moon)] === "Mars" && SIGN_RULER[signName(f.signOf.Mars)] === "Moon");
  out["Lakshmi (1)"] =
    (strongSign(lordOfHouse(f, 9)) && (inHouses(f, lordOfHouse(f, 9), KENDRA) || inHouses(f, lordOfHouse(f, 9), TRINE)) &&
      strongSign("Venus") && (inHouses(f, "Venus", KENDRA) || inHouses(f, "Venus", TRINE))) ||
    (houseIn(f, "Venus") === 9 && strongSign("Venus"));
  out["Lakshmi (2)"] = f.signOf.Moon === f.signOf.Mars &&
    norm(input.lonBy.Moon) % 30 > norm(input.lonBy.Mars) % 30;
  out["Pushkala"] = (() => {
    const moonSignLord = SIGN_RULER[signName(f.signOf.Moon)] as Graha;
    const lagnaLord = lordOfHouse(f, 1);
    return moonSignLord !== lagnaLord &&
      f.signOf[moonSignLord] === f.signOf[lagnaLord] &&
      inHouses(f, moonSignLord, KENDRA) &&
      BENEFICS.some((b) => grahaAspectsSign(b, f.signOf[b], f.refSign));
  })();

  // Nabhasa placements.
  out["Mangala"] = GRAHAS.every((g) => inHouses(f, g, KENDRA));
  out["Madhya"] = GRAHAS.every((g) => inHouses(f, g, [2, 5, 8, 11]));
  out["Kleeva"] = GRAHAS.every((g) => inHouses(f, g, [3, 6, 9, 12]));

  // Trik/dusthana configurations.
  out["Vipreet"] = MALEFICS.every((g) => inHouses(f, g, [6, 8, 12]));
  out["Ashubha-Mangala"] = BENEFICS.filter((g) => g !== "Moon").every((g) => inHouses(f, g, [6, 8, 12]));
  out["Adhi"] = [6, 7, 8].every((h) => occupantsOf(f, h).some((g) => BENEFICS.includes(g as Graha)));
  out["Dur"] = [6, 8, 12].map((h) => lordOfHouse(f, h)).some((l) => inHouses(f, l, KENDRA) || inHouses(f, l, TRINE)) &&
    [1, 4, 9, 10].map((h) => lordOfHouse(f, h)).some((l) => isCombust(l) || inHouses(f, l, [6, 8, 12]));

  // Learning/benefic assemblies.
  out["Saraswati"] = (["Venus", "Jupiter", "Mercury"] as Graha[]).every((g) =>
    inHouses(f, g, [...KENDRA, 5, 9, 2])) &&
    ["exalted", "moolatrikona", "own", "great friend", "friend"].includes(dignities.Jupiter);
  out["Parvati"] = KENDRA.some((h) => occupantsOf(f, h).some((g) => BENEFICS.includes(g as Graha))) &&
    [7, 8].every((h) => occupantsOf(f, h).every((g) => BENEFICS.includes(g as Graha)));
  out["Kulavardhana"] = GRAHAS.every((g) => houseIn(f, g) === 5) ||
    GRAHAS.every((g) => ((f.signOf[g] - f.signOf.Moon + 12) % 12) === 4) ||
    GRAHAS.every((g) => ((f.signOf[g] - f.signOf.Sun + 12) % 12) === 4);
  out["Arishta Bhanga"] = (inHouses(f, "Jupiter", KENDRA) || inHouses(f, "Jupiter", TRINE)) &&
    ["exalted", "moolatrikona", "own", "great friend", "friend"].includes(dignities.Jupiter);
  out["Shri Kantha (Pravrajya)"] = (["Sun", "Moon"] as Graha[]).concat(lordOfHouse(f, 1)).every((g) =>
    (inHouses(f, g, KENDRA) || inHouses(f, g, TRINE)) &&
    ["exalted", "moolatrikona", "own", "great friend", "friend"].includes(dignities[g]));

  return out;
}

/** Dignity grade per planet: degree-true (exalted/moolatrikona/own/debilitated) first,
 *  then the sign-level friend/neutral/enemy grade — several yoga conditions need
 *  "friendly sign", which the degree-true function alone never reports. */
function dignityGrades(lonBy: Record<string, number>): Record<Graha, string> {
  const out = {} as Record<Graha, string>;
  for (const g of GRAHAS) {
    const d = planetDignity(g, lonBy[g]);
    out[g] = d === "neutral" ? signDignity(g, signIndexOf(lonBy[g])) : d;
  }
  return out;
}

/** Detect all canon yogas: three judge-frames + the navamsha. */
export function detectYogas(input: YogaInput): DetectedYoga[] {
  const signOf: Record<string, number> = {};
  for (const b of [...GRAHAS, "Rahu", "Ketu"]) signOf[b] = signIndexOf(input.lonBy[b]);
  const dignities = dignityGrades(input.lonBy);

  const frames: Array<{ kind: YogaFrame; f: Frame }> = [
    { kind: "lagna", f: { refSign: signIndexOf(input.lagnaLon), signOf } },
    { kind: "chandra", f: { refSign: signOf.Moon, signOf } },
    { kind: "surya", f: { refSign: signOf.Sun, signOf } },
  ];
  const byFrame = frames.map(({ kind, f }) => ({ kind, hits: detectInFrame(f, input, dignities) }));

  // Navamsha frame: every body re-mapped to its D9 sign; D9 lagna = navamsha of the lagna.
  const d9SignOf: Record<string, number> = {};
  for (const b of [...GRAHAS, "Rahu", "Ketu"]) d9SignOf[b] = vargaSignOf(input.lonBy[b], "D9");
  const d9Dignities = {} as Record<Graha, string>;
  for (const g of GRAHAS) {
    const d = planetDignity(g, d9SignOf[g] * 30 + 15);
    d9Dignities[g] = d === "neutral" ? signDignity(g, d9SignOf[g]) : d;
  }
  const d9Hits = detectInFrame(
    { refSign: vargaSignOf(input.lagnaLon, "D9"), signOf: d9SignOf },
    input, d9Dignities,
  );

  // Frame-independent yogas (identical math in every frame) report a single "natal" frame.
  const FRAME_INDEPENDENT = new Set([
    "Sunapha", "Anapha", "Durudhara", "Kemadruma", "Sakata / Shataka", "Gaja Keshari",
    "Veshi", "Vashi", "Ubhayachari", "Parivartana", "Kala Sarpa", "Buddhaditya",
    "Chandra-Mangala", "Lakshmi (2)",
  ]);

  const names = Object.keys(byFrame[0].hits);
  const detected: DetectedYoga[] = [];
  for (const name of names) {
    const holding = byFrame.filter((x) => x.hits[name]).map((x) => x.kind);
    if (!holding.length) continue;
    detected.push({
      name,
      type: "", // filled by the caller from canon/yogas.json
      frames: FRAME_INDEPENDENT.has(name) ? ["natal"] : holding,
      inNavamsha: !!d9Hits[name],
    });
  }

  // Maha Bhagya — celestial half only; gender is not stored, so report a CANDIDATE.
  if (input.isDayBirth != null) {
    const lagnaSign = signIndexOf(input.lagnaLon);
    const allOdd = [lagnaSign, signOf.Sun, signOf.Moon].every((s) => s % 2 === 0);
    const allEven = [lagnaSign, signOf.Sun, signOf.Moon].every((s) => s % 2 === 1);
    if ((input.isDayBirth && allOdd) || (!input.isDayBirth && allEven)) {
      detected.push({
        name: "Maha Bhagya", type: "fortune", frames: ["lagna"], inNavamsha: false,
        note: input.isDayBirth
          ? "celestial condition holds for a MAN (day birth, all odd signs) — gender not stored, reported as candidate"
          : "celestial condition holds for a WOMAN (night birth, all even signs) — gender not stored, reported as candidate",
      });
    }
  }

  return detected;
}
