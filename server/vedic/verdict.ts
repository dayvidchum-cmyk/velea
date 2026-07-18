/**
 * THE VERDICT — the chart's life-register headline, engine-located.
 *
 * Born from David's astrologer stories (2026-07-18): "he can look at my chart and tell me it's a
 * late bloomer's chart — built on time and experience… money, love, etc? late. if at all." That
 * verdict is not intuition — it is the canon's convergence method (K&F Vol II Appendix IV) pointed
 * at the LIFE time frame (the Lens Router's widest lens):
 *
 *   1. The DASHA ORDER is the bloom schedule — everyone gets the same lords; the question is WHEN
 *      yours arrive (Vol I Ch.12). A well-conditioned lord connected to an area pays in ITS period.
 *   2. PLANETARY MATURITY (Vol I Ch.13 p162, canon/timing.json) — a Saturn-hinged chart ripens at
 *      36; a Venus-hinged one at 25. "Time and experience" is a maturity statement.
 *   3. BALAADI AVASHTA (canon/avashtas.json) — the fruition dial: infant ¼ · adolescent ½ · adult
 *      full · old ⅛ · dead ~none. The mechanical source of "if at all."
 *   4. The NODAL AXIS — Ketu's house = past-life mastery (already spent), Rahu's = this life's
 *      hunger (fires, especially in node periods).
 *
 * The engine LOCATES (deterministic, auditable, from the stored research + the 120-year tree);
 * the LLM only VOICES. Nothing here is invented scoring — every factor cites its canon source.
 */
import { eq, and } from "drizzle-orm";
import { getDb } from "../db.js";
import { profiles, profileDashaPeriods } from "../../drizzle/schema.js";
import { getStoredResearch } from "./research-store.js";
import timingJson from "./canon/timing.json";

const MATURITY: Record<string, number> = (timingJson as any).maturityOfPlanets?.ageYears ?? {
  Jupiter: 16, Sun: 22, Moon: 24, Venus: 25, Mars: 28, Mercury: 32, Saturn: 36, Rahu: 42, Ketu: 48,
};

// Balaadi fruition (canon: infant ¼ · adolescent ½ · adult full · old ⅛ · dead ~none).
const BALAADI_FRUIT: Record<string, number> = { bala: 0.25, kumara: 0.5, yuva: 1, vriddha: 0.125, mrita: 0.05 };

// Dignity base weights (exalt > moolatrikona > own > friend > neutral > enemy > fall;
// neecha bhanga lifts a cancelled debilitation to workable).
const DIGNITY_BASE: Record<string, number> = {
  exalted: 1, moolatrikona: 0.9, own: 0.85, friend: 0.7, neutral: 0.5, enemy: 0.3, debilitated: 0.15,
};

// The areas David's astrologer spoke to — houses in the classical portfolios + primary karakas.
// Plain glosses ride along so the voicing NEVER says a house number (the no-house-numbers law).
const AREAS: { key: string; label: string; houses: number[]; karaka: string; gloss: string }[] = [
  { key: "money", label: "money & livelihood", houses: [2, 11], karaka: "Jupiter", gloss: "earnings, holdings, the circles that pay" },
  { key: "partnership", label: "partnership", houses: [7], karaka: "Venus", gloss: "marriage, the committed other" },
  { key: "career", label: "the world's stage", houses: [10], karaka: "Sun", gloss: "the name you carry in public, the work the world sees" },
];

export type VerdictData = {
  engineVersion: string;
  bloomProfile: "early" | "steady" | "late" | "late-if-at-all";
  hinge: { planet: string; maturityAge: number; why: string };
  areas: Array<{
    key: string; label: string; gloss: string;
    thin: boolean;
    bloomAge: number | null;
    bloomYear: number | null;
    window: { lord: string; startAge: number; endAge: number } | null;
    lords: Array<{ planet: string; fruit: number; dignity: string; balaadi: string; house: number }>;
  }>;
  nodal: { rahuHouse: number | null; ketuHouse: number | null };
  maturityBeats: Array<{ planet: string; age: number }>;
  currentAge: number;
};

/** A lord's capacity to deliver, 0..1 — dignity (½) + Shadbala ratio (0.3) + Vimshopak (0.2),
 *  then multiplied by the Balaadi fruition dial. All read from the STORED research. */
function fruitOf(p: any): { fruit: number; dignity: string; balaadi: string } {
  const state: string = p?.dignity?.state ?? "neutral";
  let base = DIGNITY_BASE[state] ?? 0.5;
  if (state === "debilitated" && p?.dignity?.neechaBhanga?.cancelled) base = 0.55; // bhanga lifts
  const ratio = Math.min(p?.shadbala?.ratio ?? 0.8, 1.5) / 1.5;
  const vim = Math.min(Math.max((p?.vimshopak?.points ?? 10) / 20, 0), 1);
  const q = base * 0.5 + ratio * 0.3 + vim * 0.2;
  const bal: string = p?.avashtas?.balaadi ?? "yuva";
  return { fruit: Math.round(q * (BALAADI_FRUIT[bal] ?? 1) * 100) / 100, dignity: state, balaadi: bal };
}

export async function computeVerdict(profileId: number): Promise<VerdictData | null> {
  const db = await getDb();
  if (!db) return null;
  const research = await getStoredResearch(profileId);
  if (!research) return null;
  const [profile] = await db.select().from(profiles).where(eq(profiles.id, profileId)).limit(1);
  if (!profile?.birthDate) return null;
  const birthMs = Date.parse(profile.birthDate + "T12:00:00Z");
  const ageAt = (d: Date | string) => Math.round(((new Date(d).getTime() - birthMs) / 31557600000) * 10) / 10;
  const currentAge = ageAt(new Date());

  // The 120-year maha sequence — the bloom schedule (level 1 = mahadasha).
  const mahas = await db.select().from(profileDashaPeriods)
    .where(and(eq(profileDashaPeriods.profileId, profileId), eq(profileDashaPeriods.level, 1)))
    .orderBy(profileDashaPeriods.startAt);
  if (!mahas.length) return null;

  const planets: Record<string, any> = (research as any).planets ?? {};
  const houses: any[] = (research as any).houses ?? [];
  const lordOfHouse = (h: number) => houses[h - 1]?.lord?.planet as string | undefined;

  const areas: VerdictData["areas"] = AREAS.map((area) => {
    // Connected lords: rules one of the area's houses, stands in one, or is the karaka.
    const connected = new Set<string>();
    for (const h of area.houses) {
      const lord = lordOfHouse(h);
      if (lord) connected.add(lord);
      for (const [g, p] of Object.entries(planets)) if ((p as any).house === h) connected.add(g);
    }
    connected.add(area.karaka);
    const lords = Array.from(connected)
      .filter((g) => planets[g])
      .map((g) => ({ planet: g, house: planets[g].house as number, ...fruitOf(planets[g]) }))
      .sort((a, b) => b.fruit - a.fruit);
    const best = lords[0]?.fruit ?? 0;
    const thin = best < 0.35; // no lord can carry it → "if at all" (the Balaadi verdict)
    // First maha run by a connected lord strong enough to pay (fruit ≥ .5; ≥ .35 counts as partial).
    let window: VerdictData["areas"][number]["window"] = null;
    for (const m of mahas) {
      const lord = lords.find((l) => l.planet === m.maha);
      if (lord && lord.fruit >= (best >= 0.5 ? 0.5 : 0.35)) {
        window = { lord: m.maha, startAge: ageAt(m.startAt), endAge: ageAt(m.endAt) };
        break;
      }
    }
    const bloomAge = thin ? null : window ? Math.max(window.startAge, 0) : null;
    const bloomYear = bloomAge != null ? new Date(birthMs).getUTCFullYear() + Math.floor(bloomAge) : null;
    return { key: area.key, label: area.label, gloss: area.gloss, thin, bloomAge, bloomYear, window, lords: lords.slice(0, 4) };
  });

  // Bloom profile: median of the defined bloom ages (his astrologer's "late bloomer" line).
  const ages = areas.map((a) => a.bloomAge).filter((a): a is number => a != null).sort((a, b) => a - b);
  const median = ages.length ? ages[Math.floor(ages.length / 2)] : null;
  const bloomProfile: VerdictData["bloomProfile"] =
    median == null ? "late-if-at-all" : median < 30 ? "early" : median <= 42 ? "steady" : "late";

  // The hinge: the strongest of lagna lord / atmakaraka (by fruit) — its maturity age is the
  // chart's ripening beat (Vol I Ch.13).
  const anchors: any = (research as any).anchors ?? {};
  const hingeCandidates = [anchors?.lagna?.lord, anchors?.atmakaraka?.planet].filter((g) => g && planets[g]);
  const hingePlanet = hingeCandidates.sort((a, b) => fruitOf(planets[b]).fruit - fruitOf(planets[a]).fruit)[0] ?? "Saturn";
  const hinge = {
    planet: hingePlanet,
    maturityAge: MATURITY[hingePlanet] ?? 36,
    why: hingePlanet === anchors?.lagna?.lord ? "lord of the rising sign" : "the atmakaraka — the soul's own planet",
  };

  // Nodal axis: Ketu = past-life mastery (already spent), Rahu = this life's hunger.
  let rahuHouse: number | null = null, ketuHouse: number | null = null;
  for (const h of houses) {
    if (h?.occupants?.includes("Rahu")) rahuHouse = h.house;
    if (h?.occupants?.includes("Ketu")) ketuHouse = h.house;
  }

  const maturityBeats = Object.entries(MATURITY)
    .filter(([g]) => planets[g] || g === "Rahu" || g === "Ketu")
    .map(([planet, age]) => ({ planet, age }))
    .sort((a, b) => a.age - b.age);

  return { engineVersion: "verdict-v1", bloomProfile, hinge, areas, nodal: { rahuHouse, ketuHouse }, maturityBeats, currentAge };
}
