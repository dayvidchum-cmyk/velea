// The Arc — a forward trajectory of a person's slow + daily layers. Pure chart mechanics,
// no life-context needed: it scans ahead, finds the standout apex day, counts the crown days,
// and surfaces the season-turns that shape the road (dasha changes, the profection handoff,
// slow-planet house ingresses). This is the deterministic skeleton; narration rides on top.
//
// Deliberately conservative: it reports WHAT changes and WHEN, never a life-event claim
// (that's the guardrail — the sky is many-to-one, the engine must not collapse it blindly).

import { calculateBirthChart } from "../birthchart/calculator.js";
import { crownDay } from "../panchang/crown.js";
import { calculateDashaTimeline } from "../dasha-calculator.js";
import { calculateProfectionYear } from "../profection/calculator.js";
import { getSiderealLongitudesWithSpeed } from "../vedic/natal-chart-engine.js";

const ZOD = ["Aries","Taurus","Gemini","Cancer","Leo","Virgo","Libra","Scorpio","Sagittarius","Capricorn","Aquarius","Pisces"];
const NAK = ["Ashwini","Bharani","Krittika","Rohini","Mrigashira","Ardra","Punarvasu","Pushya","Ashlesha","Magha","Purva Phalguni","Uttara Phalguni","Hasta","Chitra","Swati","Vishakha","Anuradha","Jyeshtha","Mula","Purva Ashadha","Uttara Ashadha","Shravana","Dhanishtha","Shatabhisha","Purva Bhadrapada","Uttara Bhadrapada","Revati"];
const ORD = ["","1st","2nd","3rd","4th","5th","6th","7th","8th","9th","10th","11th","12th"];
const SLOW = ["Jupiter","Saturn","Rahu"] as const;

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
export interface Arc {
  from: string;
  horizonDays: number;
  apex: { date: string; daysAway: number; score: number; crown: boolean } | null;
  crownCount: number;
  crownDates: string[];
  milestones: ArcMilestone[]; // ordered by date
}

export interface ArcSubject {
  birthDate: string;
  moonNakshatra: string;
  moonSign: string;
  moonDegree: string;
  moonLongitude: string | null;
  lagnaSign: string;
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
  const houseOf = (sIdx: number) => ((sIdx - lagnaIdx + 12) % 12) + 1;
  const milestones: ArcMilestone[] = [];

  // ── Daily scan: crown days + the apex (highest-aligned day in the horizon) ──
  const crownDates: string[] = [];
  let apex: Arc["apex"] = null;
  for (let i = 0; i <= horizonDays; i++) {
    const day = addDays(from, i);
    const ch: any = await calculateBirthChart(day, "12:00", 0, 0, "UTC");
    const T: Record<string, number> = {
      Sun: signIdx(ch.sun.longitude), Moon: signIdx(ch.moon.longitude), Mars: signIdx(ch.mars.longitude),
      Mercury: signIdx(ch.mercury.longitude), Jupiter: signIdx(ch.jupiter.longitude), Venus: signIdx(ch.venus.longitude),
      Saturn: signIdx(ch.saturn.longitude), Rahu: signIdx(ch.rahu.longitude), Ketu: signIdx(ch.ketu.longitude),
    };
    const cd = crownDay({ birthNakIdx, natalMoonSignIdx, lagnaSignIdx: lagnaIdx, sunLon: ch.sun.longitude, moonLon: ch.moon.longitude, transitSignByPlanet: T });
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

  milestones.sort((a, b) => a.daysAway - b.daysAway);
  return { from, horizonDays, apex, crownCount: crownDates.length, crownDates, milestones };
}
