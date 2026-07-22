/**
 * DAY-FRAME dispatcher — the day read produced by the tried-and-true method, deterministically.
 *
 * The Lens Router (server/vedic/canon/METHOD.md) says the TIME FRAME picks the system: for a DAY,
 * the system is the Moon — Tārabala (day-star from the birth star) + Chandrabala (transit Moon from
 * the natal Moon) — and the grain is today's Moon. The MATTER is whatever house the day-Moon lights;
 * that house routes (Appendix IV, via life-areas.ts) to its CHART + KARAKA, and the reading is the
 * CONDITION of that arena read in D1 AND its varga, plus whether the running dasha CONVERGES on it.
 *
 * Output = the finished structured reading { tilt · arena · condition · chapter · timing }. No LLM,
 * no synthesis — the voice model only renders this (see server/narrative/VOICE-PROMPT.DRAFT.md).
 *
 * Reuses: buildLifeAreaLens (varga-deep condition + dashaBearing) · tarabala/chandrabala (the tilt).
 * Condition = dignity, and dignity here ALWAYS carries its cancellation (v796) — a debilitation the
 * chart cancels is not strained.
 * NEXT: fold in avashta for the texture inside "unlit". The engine EXISTS — vedic/avashtas.ts, all
 * six Lajjitaadi formulas and all three Jagradaadi states, wired into stored research since 07-15.
 * (This comment claimed it did not exist for five days and an audit believed the comment.)
 */
import { buildLifeAreaLens, type LifeAreaKey } from "./life-areas.js";
import { tarabala, chandrabala } from "../panchang/crown.js";
import { SIGN_RULER } from "./vargas.js";
import { labelWithCancellation, CANCELLED_ACTIVE_LABEL } from "./dignity.js";

const ZOD = ["Aries","Taurus","Gemini","Cancer","Leo","Virgo","Libra","Scorpio","Sagittarius","Capricorn","Aquarius","Pisces"];
const norm = (x: number) => ((x % 360) + 360) % 360;
const signIdx = (lon: number) => Math.floor(norm(lon) / 30);

// The house the day-Moon lights → its life-area key (Appendix IV routing, life-areas.ts primaryHouse).
// Houses 8 & 11 have no dedicated life-area varga in the set → D1 fallback (labelled from the bhava canon).
const HOUSE_TO_AREA: Record<number, LifeAreaKey> = {
  1: "self", 2: "money", 3: "siblings", 4: "home", 5: "children", 6: "health", 7: "love", 9: "purpose", 10: "career", 12: "parents",
};
const HOUSE_FALLBACK: Record<number, { area: string; karaka: string }> = {
  8:  { area: "shared resources, upheaval & the hidden", karaka: "Saturn" },
  11: { area: "gains, network & aspirations",            karaka: "Jupiter" },
};

// dignityLabel vocabulary (panchang/dignity.ts TIER_LABEL): supportive / strained / neutral.
// A CANCELLED debilitation is supportive — the canon says it "can act as if exalted"
// (canon/yogas.json universalRules.neechaBhanga), and David ruled on 2026-07-20 to take the book at
// its word. B (2026-07-22): supportive ALWAYS, not period-gated — the dashaGate is NOT applied to
// neecha bhanga (modern, no classical verse; see canon/neecha-bhanga-provenance.md). It is never
// strained, because the chart cancels it. That is the bug this closed: David's Moon is debilitated
// in Scorpio, cancelled, and had read as strained.
const SUPPORTIVE = new Set(["Exalted", "Moolatrikona", "Own", "Friend", CANCELLED_ACTIVE_LABEL]);
const STRAINED = new Set(["Debilitated", "Enemy"]);
function classify(digs: Array<string | null | undefined>): "supported" | "strained" | "mixed" | "unlit" {
  const s = digs.filter((d) => d && SUPPORTIVE.has(d)).length;
  const x = digs.filter((d) => d && STRAINED.has(d)).length;
  if (s && x) return "mixed";
  if (s) return "supported";
  if (x) return "strained";
  return "unlit"; // all neutral — steady, nothing lit (distinct from mixed)
}
// The condition is the HOUSE-LORD's state (the ruler carries the affairs). Karakas only speak when
// the ruler is neutral — they break a tie, they don't out-vote the ruler. Pooling everyone equally
// collapsed the read to "mixed" 76% of the time and never fired "unlit" (cold-data finding).
function conditionFrom(lordDigs: Array<string | null | undefined>, karakaDigs: Array<string | null | undefined>): "supported" | "strained" | "mixed" | "unlit" {
  const lord = classify(lordDigs);
  return lord !== "unlit" ? lord : classify(karakaDigs);
}

export type DayFrameReading = {
  timeFrame: "day";
  grain: "today's Moon";
  tilt: "supported" | "strained" | "mixed";
  arena: { house: number; area: string; varga: string };
  condition: "supported" | "strained" | "mixed" | "unlit";
  conditionDetail: string[];         // e.g. "ruler Mercury: Neutral (D1) / Own (D10)"
  chapter: { converges: boolean; via: string[] };
  timing: "today";
  evidence: string[];
};

export function dayFrameReading(args: {
  // native
  natalLon: Record<string, number>;
  ascLon: number;
  lagnaSign: string;
  natalByPlanet: Record<string, { sign: string; house: number | null; dignity: string; rulesHouses: number[] }>;
  birthNakIdx: number;        // 0..26
  natalMoonSignIdx: number;   // 0..11
  // the day
  dayMoonLon: number;         // sidereal longitude of the transit Moon (noon)
  dayNakIdx: number;          // 0..26 — the day-star (majority-of-day when the caller supplies it)
  transits?: Parameters<typeof buildLifeAreaLens>[0]["transits"];
  dasha?: Parameters<typeof buildLifeAreaLens>[0]["dasha"];
}): DayFrameReading {
  const lagIdx = ZOD.indexOf(args.lagnaSign);
  const dayMoonSignIdx = signIdx(args.dayMoonLon);
  const moonHouse = ((dayMoonSignIdx - lagIdx + 12) % 12) + 1;

  // 1) TILT — the day's disposition + strength toward the native (Tārabala ∧ Chandrabala)
  const tb = tarabala(args.birthNakIdx, args.dayNakIdx);
  const cb = chandrabala(args.natalMoonSignIdx, dayMoonSignIdx);
  const tilt = tb.favorable && cb.favorable ? "supported"
    : (tb.quality === "bad" || cb.quality === "bad") ? "strained" : "mixed";

  // 2) ARENA + 3) CONDITION (D1 ∧ varga) + 4) CHAPTER convergence
  const areaKey = HOUSE_TO_AREA[moonHouse];
  const lordDigs: Array<string | null | undefined> = [];
  const karakaDigs: Array<string | null | undefined> = [];
  const conditionDetail: string[] = [];
  let via: string[] = [];
  let area: string, varga: string;

  if (areaKey) {
    const lens = buildLifeAreaLens({
      area: areaKey, lonByPlanet: args.natalLon, ascLon: args.ascLon, lagnaSign: args.lagnaSign,
      natalByPlanet: args.natalByPlanet, transits: args.transits ?? [], dasha: args.dasha as any,
    });
    area = lens.domain || lens.label;
    varga = lens.varga;
    if (lens.houseLord) {
      lordDigs.push(lens.houseLord.natalDignity, lens.houseLord.vargaDignity);
      conditionDetail.push(`ruler ${lens.houseLord.planet}: ${lens.houseLord.natalDignity} (D1) / ${lens.houseLord.vargaDignity} (${varga})`);
    }
    for (const k of lens.karakas) if (k.state) {
      karakaDigs.push(k.state.natalDignity, k.state.vargaDignity);
      conditionDetail.push(`karaka ${k.planet}: ${k.state.natalDignity} (D1) / ${k.state.vargaDignity} (${varga})`);
    }
    via = lens.activation.dashaBearing.map((d) => `${d.lord} (${d.level}) — ${d.how}`);
  } else {
    // Houses 8 / 11 — no varga in the set → D1-only read.
    const fb = HOUSE_FALLBACK[moonHouse];
    area = fb.area; varga = "—";
    const lord = SIGN_RULER[ZOD[(lagIdx + moonHouse - 1) % 12]];
    // Same cancellation check the lens applies — this branch reads natalByPlanet directly, so
    // without it houses 8 and 11 would keep the exact bug the lens path just closed.
    const lordDig = labelWithCancellation(lord, args.natalByPlanet[lord]?.dignity, args.natalLon, args.ascLon).label;
    const karDig = labelWithCancellation(fb.karaka, args.natalByPlanet[fb.karaka]?.dignity, args.natalLon, args.ascLon).label;
    lordDigs.push(lordDig); karakaDigs.push(karDig);
    conditionDetail.push(`ruler ${lord}: ${lordDig ?? "n/a"} (D1)`, `karaka ${fb.karaka}: ${karDig ?? "n/a"} (D1)`);
    // convergence: a running dasha lord rules the house, sits in it, or is the karaka
    for (const [level, p] of [["maha", (args.dasha as any)?.mahaDasha?.lord], ["antar", (args.dasha as any)?.antarDasha?.lord]] as const) {
      if (!p) continue;
      const rules = (args.natalByPlanet[p]?.rulesHouses ?? []).includes(moonHouse);
      const sits = args.natalByPlanet[p]?.house === moonHouse;
      const isKaraka = fb.karaka === p;
      if (rules || sits || isKaraka) via.push(`${p} (${level}) — ${rules ? "rules this" : sits ? "sits here" : "is its karaka"}`);
    }
  }

  const condition = conditionFrom(lordDigs, karakaDigs);
  const evidence = [
    `day-Moon ${ZOD[dayMoonSignIdx]} → house ${moonHouse} from ${args.lagnaSign} lagna`,
    `tāra #${tb.taraNum} ${tb.name} (${tb.quality}, cycle ${tb.cycle}) · chandrabala house ${cb.house} (${cb.quality})`,
    ...conditionDetail,
  ];

  return {
    timeFrame: "day",
    grain: "today's Moon",
    tilt,
    arena: { house: moonHouse, area, varga },
    condition,
    conditionDetail,
    chapter: { converges: via.length > 0, via },
    timing: "today",
    evidence,
  };
}
