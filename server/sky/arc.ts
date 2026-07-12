// The Arc — a forward trajectory of a person's slow + daily layers. Pure chart mechanics,
// no life-context needed: it scans ahead, finds the standout apex day, counts the crown days,
// and surfaces the season-turns that shape the road (dasha changes, the profection handoff,
// slow-planet house ingresses). This is the deterministic skeleton; narration rides on top.
//
// Deliberately conservative: it reports WHAT changes and WHEN, never a life-event claim
// (that's the guardrail — the sky is many-to-one, the engine must not collapse it blindly).

import { crownDay, natalAshtakavarga } from "../panchang/crown.js";
import { calculateDashaTimeline } from "../dasha-calculator.js";
import { calculateProfectionYear } from "../profection/calculator.js";
import { getSiderealLongitudesWithSpeed } from "../vedic/natal-chart-engine.js";

const ZOD = ["Aries","Taurus","Gemini","Cancer","Leo","Virgo","Libra","Scorpio","Sagittarius","Capricorn","Aquarius","Pisces"];
const NAK = ["Ashwini","Bharani","Krittika","Rohini","Mrigashira","Ardra","Punarvasu","Pushya","Ashlesha","Magha","Purva Phalguni","Uttara Phalguni","Hasta","Chitra","Swati","Vishakha","Anuradha","Jyeshtha","Mula","Purva Ashadha","Uttara Ashadha","Shravana","Dhanishtha","Shatabhisha","Purva Bhadrapada","Uttara Bhadrapada","Revati"];
const ORD = ["","1st","2nd","3rd","4th","5th","6th","7th","8th","9th","10th","11th","12th"];
const SLOW = ["Jupiter","Saturn","Rahu"] as const;

// Signs each graha owns (Aries=0), for deriving "houses ruled" from a lagna. Nodes own nothing here.
const OWNED_SIGNS: Record<string, number[]> = {
  Sun:[4], Moon:[3], Mars:[0,7], Mercury:[2,5], Jupiter:[8,11], Venus:[1,6], Saturn:[9,10], Rahu:[], Ketu:[],
};
const rulesHouses = (lord: string, lagnaIdx: number) => (OWNED_SIGNS[lord] ?? []).map((s) => ((s - lagnaIdx + 12) % 12) + 1);

const norm = (x: number) => ((x % 360) + 360) % 360;
const signIdx = (lon: number) => Math.floor(norm(lon) / 30);
const iso = (d: Date) => d.toISOString().slice(0, 10);
const addDays = (day: string, n: number) => { const t = new Date(day + "T00:00:00Z"); t.setUTCDate(t.getUTCDate() + n); return iso(t); };
const daysBetween = (a: string, b: string) => Math.round((new Date(b + "T00:00:00Z").getTime() - new Date(a + "T00:00:00Z").getTime()) / 86400000);

export type ArcKind = "apex" | "dasha" | "profection" | "ingress";
export interface ArcMilestone {
  date: string;
  daysAway: number;
  kind: ArcKind;
  title: string;   // short label, e.g. "Ketu season → Venus"
  detail: string;  // one grounded line — what shifts, in house terms
}
// One dasha period (maha or antar) with the age-span it covers and its lord's chart footprint —
// the natal house it sits in and the houses it rules. The narrative layer turns this into voice.
export interface DashaPeriod {
  lord: string;
  startDate: string;
  endDate: string;
  ageStart: number;
  ageEnd: number;
  natalHouse: number | null;  // where the lord sits natally (needs natalHouseByPlanet)
  rulesHouses: number[];      // houses it rules from the lagna
}

// The road behind + the road just ahead: each mahadasha already lived, then the current
// mahadasha, the current antardasha (where she stands), and the next antardasha.
export interface DashaJourney {
  pastMahas: DashaPeriod[];
  currentMaha: DashaPeriod | null;
  currentAntar: DashaPeriod | null;
  nextAntar: DashaPeriod | null;
}

export interface Arc {
  from: string;
  horizonDays: number;
  apex: { date: string; daysAway: number; score: number; crown: boolean } | null;
  crownCount: number;
  crownDates: string[];
  milestones: ArcMilestone[]; // ordered by date
  dashaJourney: DashaJourney;
}

export interface ArcSubject {
  birthDate: string;
  moonNakshatra: string;
  moonSign: string;
  moonDegree: string;
  moonLongitude: string | null;
  lagnaSign: string;
  natalHouseByPlanet?: Record<string, number>; // e.g. { Jupiter: 2, Saturn: 1, ... } — enriches the journey
  natalSignByPlanet?: Record<string, string>;  // planet → natal sign name — unlocks the Ashtakavarga crown layer
}

/**
 * The dasha journey alone — cheap (one timeline call, no ephemeris scan). The road behind
 * (mahadashas lived) → the current mahadasha and antardasha → the next antardasha. This is what
 * the daily narrative weaves for continuity; the full forward scan (computeArc) is for a UI feature.
 */
export function computeDashaJourney(subject: ArcSubject, from: string): DashaJourney {
  const lagnaIdx = ZOD.indexOf(subject.lagnaSign);
  const journey: DashaJourney = { pastMahas: [], currentMaha: null, currentAntar: null, nextAntar: null };
  try {
    const tl = calculateDashaTimeline(subject.birthDate, subject.moonNakshatra, subject.moonSign, subject.moonDegree, from, subject.moonLongitude);
    const entries = tl.entries as any[];
    const curIdx = entries.findIndex((e) => e.isCurrent);
    const cur = entries[curIdx];
    const birth = new Date(subject.birthDate + "T00:00:00Z");
    const ageAt = (d: string) => {
      const t = new Date(d + "T00:00:00Z");
      let a = t.getUTCFullYear() - birth.getUTCFullYear();
      if (t.getUTCMonth() < birth.getUTCMonth() || (t.getUTCMonth() === birth.getUTCMonth() && t.getUTCDate() < birth.getUTCDate())) a--;
      return a;
    };
    const period = (lord: string, s: string, e: string): DashaPeriod =>
      ({ lord, startDate: s, endDate: e, ageStart: ageAt(s), ageEnd: ageAt(e), natalHouse: subject.natalHouseByPlanet?.[lord] ?? null, rulesHouses: rulesHouses(lord, lagnaIdx) });
    if (cur) {
      const spans: { lord: string; start: string; end: string }[] = [];
      for (const e of entries) {
        const last = spans[spans.length - 1];
        if (last && last.lord === e.mahadasha) last.end = e.endDate;
        else spans.push({ lord: e.mahadasha, start: e.startDate, end: e.endDate });
      }
      const curSpanIdx = spans.findIndex((s) => s.lord === cur.mahadasha);
      journey.pastMahas = spans.slice(0, curSpanIdx).map((s) => period(s.lord, s.start, s.end));
      const cs = spans[curSpanIdx];
      journey.currentMaha = period(cs.lord, cs.start, cs.end);
      journey.currentAntar = period(cur.antardasha, cur.startDate, cur.endDate);
      const next = entries[curIdx + 1];
      if (next) journey.nextAntar = period(next.antardasha, next.startDate, next.endDate);
    }
  } catch { /* journey optional */ }
  return journey;
}

/**
 * Compute a person's forward arc. Two horizons on purpose: the daily crown/apex scan runs over the
 * near-term `horizonDays` (default 90 — "when's my next strong day"), while the sparse slow turns
 * (dasha season-change, profection birthday, slow-planet ingresses) scan the longer `slowHorizonDays`
 * (default 365), because a 3-month window usually contains none of them.
 */
export async function computeArc(subject: ArcSubject, from: string, horizonDays = 90, slowHorizonDays = 365): Promise<Arc> {
  const lagnaIdx = ZOD.indexOf(subject.lagnaSign);
  const birthNakIdx = NAK.indexOf(subject.moonNakshatra);
  const natalMoonSignIdx = ZOD.indexOf(subject.moonSign);
  // Natal Ashtakavarga (when the caller supplied natal signs) — the same AV crown refinement the
  // calendar + narrative use, so the Road Ahead's crowns agree with the calendar's.
  const natalAv = subject.natalSignByPlanet
    ? natalAshtakavarga(
        Object.fromEntries(Object.entries(subject.natalSignByPlanet).map(([p, s]) => [p, ZOD.indexOf(s)])),
        lagnaIdx,
      )
    : null;
  const houseOf = (sIdx: number) => ((sIdx - lagnaIdx + 12) % 12) + 1;
  const milestones: ArcMilestone[] = [];

  // ── Daily scan: crown days + the apex (highest-aligned day in the horizon) ──
  const crownDates: string[] = [];
  let apex: Arc["apex"] = null;
  const ALL_P = ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn", "Rahu", "Ketu"];
  for (let i = 0; i <= horizonDays; i++) {
    const day = addDays(from, i);
    const pos: any = await getSiderealLongitudesWithSpeed(new Date(day + "T12:00:00Z"), ALL_P);
    const lon = (p: string) => pos[p].longitude as number;
    const T: Record<string, number> = {
      Sun: signIdx(lon("Sun")), Moon: signIdx(lon("Moon")), Mars: signIdx(lon("Mars")),
      Mercury: signIdx(lon("Mercury")), Jupiter: signIdx(lon("Jupiter")), Venus: signIdx(lon("Venus")),
      Saturn: signIdx(lon("Saturn")), Rahu: signIdx(lon("Rahu")), Ketu: signIdx(lon("Ketu")),
    };
    const cd = crownDay({ birthNakIdx, natalMoonSignIdx, lagnaSignIdx: lagnaIdx, sunLon: lon("Sun"), moonLon: lon("Moon"), transitSignByPlanet: T, ashtakavarga: natalAv });
    const isCrown = cd.rating === "crown";
    if (isCrown) crownDates.push(day);
    // Apex = the single highest-scoring day; a crown outranks a non-crown at equal score; earliest wins ties.
    if (!apex || cd.score > apex.score || (cd.score === apex.score && isCrown && !apex.crown)) {
      apex = { date: day, daysAway: i, score: cd.score, crown: isCrown };
    }
  }
  if (apex) milestones.push({
    date: apex.date, daysAway: apex.daysAway, kind: "apex",
    title: apex.crown ? "Crown apex" : "Peak alignment",
    detail: `The strongest-aligned day in the next ${horizonDays} — your slow and daily layers meet at their high.`,
  });

  // ── Dasha season-turn: the next antardasha boundary within the horizon ──
  try {
    const tl = calculateDashaTimeline(subject.birthDate, subject.moonNakshatra, subject.moonSign, subject.moonDegree, from, subject.moonLongitude);
    const curIdx = tl.entries.findIndex((e: any) => e.isCurrent);
    const cur = tl.entries[curIdx];
    const next = tl.entries[curIdx + 1];
    if (cur && next && daysBetween(from, cur.endDate) <= slowHorizonDays && daysBetween(from, cur.endDate) >= 0) {
      milestones.push({
        date: cur.endDate, daysAway: daysBetween(from, cur.endDate), kind: "dasha",
        title: `${cur.antardasha} season → ${next.antardasha}`,
        detail: `Your ${cur.mahadasha}–${cur.antardasha} sub-season closes and ${next.antardasha} opens within the ${next.mahadasha} chapter.`,
      });
    }
  } catch { /* dasha optional */ }

  // ── Profection handoff: the next birthday within the horizon flips the year's Time Lord ──
  try {
    const b = new Date(subject.birthDate + "T00:00:00Z");
    const fromD = new Date(from + "T00:00:00Z");
    const bday = new Date(Date.UTC(fromD.getUTCFullYear(), b.getUTCMonth(), b.getUTCDate()));
    if (bday < fromD) bday.setUTCFullYear(bday.getUTCFullYear() + 1);
    const bdayStr = iso(bday);
    if (daysBetween(from, bdayStr) <= slowHorizonDays) {
      const before = calculateProfectionYear(subject.birthDate, from, subject.lagnaSign) as any;
      const after = calculateProfectionYear(subject.birthDate, bdayStr, subject.lagnaSign) as any;
      milestones.push({
        date: bdayStr, daysAway: daysBetween(from, bdayStr), kind: "profection",
        title: `New year: ${before.timeLord} → ${after.timeLord}`,
        detail: `Your profection year turns to the ${ORD[after.activatedHouse]} house (${after.activatedSign}); ${after.timeLord} becomes the year's Time Lord.`,
      });
    }
  } catch { /* profection optional */ }

  // ── Slow-planet house ingresses: when Jupiter / Saturn / Rahu change house-from-lagna ──
  for (const planet of SLOW) {
    let prevHouse: number | null = null;
    let prevDay = from;
    for (let i = 0; i <= slowHorizonDays; i += 7) {
      const day = addDays(from, i);
      const pos = await getSiderealLongitudesWithSpeed(new Date(day + "T12:00:00Z"), [planet]);
      const house = houseOf(signIdx((pos as any)[planet].longitude));
      if (prevHouse != null && house !== prevHouse) {
        // Refine to the day within the 5-day step.
        let lo = prevDay, hi = day;
        while (daysBetween(lo, hi) > 1) {
          const mid = addDays(lo, Math.floor(daysBetween(lo, hi) / 2));
          const mp = await getSiderealLongitudesWithSpeed(new Date(mid + "T12:00:00Z"), [planet]);
          (houseOf(signIdx((mp as any)[planet].longitude)) === prevHouse ? (lo = mid) : (hi = mid));
        }
        milestones.push({
          date: hi, daysAway: daysBetween(from, hi), kind: "ingress",
          title: `${planet} enters your ${ORD[house]} house`,
          detail: `${planet} leaves your ${ORD[prevHouse]} and moves into your ${ORD[house]} — a slow-chapter shift in that area of life.`,
        });
      }
      prevHouse = house;
      prevDay = day;
    }
  }

  // The dasha journey (past mahadashas → current maha+antar → next antar) — its own cheap function
  // (one timeline call, no ephemeris) so the daily narrative can weave continuity without this scan.
  const dashaJourney = computeDashaJourney(subject, from);

  milestones.sort((a, b) => a.daysAway - b.daysAway);
  return { from, horizonDays, apex, crownCount: crownDates.length, crownDates, milestones, dashaJourney };
}
