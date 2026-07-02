import { calculateBirthChart } from "../birthchart/calculator.js";

/**
 * Meridian layer — which transiting grahas are on the natal MC/IC axis right now,
 * read as: which planet · on which pole (outer/inner voice) · its dignity in that
 * sidereal sign · the natal house it carries from (the courier). Read-only; does not
 * feed the day-mode or ranking.
 */

const ZODIAC = ["Aries","Taurus","Gemini","Cancer","Leo","Virgo","Libra","Scorpio","Sagittarius","Capricorn","Aquarius","Pisces"];
const DIGN: Record<string, { ex: string; de: string; own: string[] }> = {
  Sun: { ex: "Aries", de: "Libra", own: ["Leo"] },
  Moon: { ex: "Taurus", de: "Scorpio", own: ["Cancer"] },
  Mars: { ex: "Capricorn", de: "Cancer", own: ["Aries", "Scorpio"] },
  Mercury: { ex: "Virgo", de: "Pisces", own: ["Gemini", "Virgo"] },
  Jupiter: { ex: "Cancer", de: "Capricorn", own: ["Sagittarius", "Pisces"] },
  Venus: { ex: "Pisces", de: "Virgo", own: ["Taurus", "Libra"] },
  Saturn: { ex: "Libra", de: "Aries", own: ["Capricorn", "Aquarius"] },
};
function dignity(planet: string, sign: string): string {
  const d = DIGN[planet];
  if (!d) return "neutral";
  if (sign === d.ex) return "exalted";
  if (sign === d.de) return "debilitated";
  if (d.own.includes(sign)) return "own sign";
  return "neutral";
}
const angDist = (a: number, b: number) => { const d = Math.abs(a - b) % 360; return d > 180 ? 360 - d : d; };

const PLANETS: [string, string][] = [
  ["Jupiter", "jupiter"], ["Saturn", "saturn"], ["Rahu", "rahu"], ["Ketu", "ketu"],
  ["Mars", "mars"], ["Venus", "venus"], ["Mercury", "mercury"], ["Sun", "sun"], ["Moon", "moon"],
];
// Slow planets set the chapter; fast planets just brush the axis.
const SLOW = new Set(["Jupiter", "Saturn", "Rahu", "Ketu"]);

export type AxisHit = {
  planet: string;
  pole: "MC" | "IC";
  poleLabel: "outer voice" | "inner voice";
  orb: number;                 // degrees from the exact point
  transitSign: string;
  transitDegree: number;
  dignity: string;
  natalHouse: number | null;   // the house this planet carries from (the courier)
  applying: boolean;           // moving toward the point vs separating
  slow: boolean;
};

export type MeridianRead = {
  mc: { sign: string; degree: number };
  ic: { sign: string; degree: number };
  hits: AxisHit[];
  orb: number;
};

const ORB = 6;

export async function computeMeridianRead(
  mcLongitude: number,
  natalHouseByPlanet: Record<string, number | null>,
  atDate?: Date,
): Promise<MeridianRead> {
  const now = atDate ?? new Date();
  const dateStr = now.toISOString().slice(0, 10);
  const timeStr = now.toISOString().slice(11, 16);
  // Planet longitudes are geocentric (observer-independent), so 0,0,UTC is fine here.
  const transit: any = await calculateBirthChart(dateStr, timeStr, 0, 0, "UTC");

  const MC = ((mcLongitude % 360) + 360) % 360;
  const IC = (MC + 180) % 360;

  const hits: AxisHit[] = [];
  for (const [Name, key] of PLANETS) {
    const t = transit[key];
    if (!t) continue;
    const dMC = angDist(t.longitude, MC);
    const dIC = angDist(t.longitude, IC);
    const onMC = dMC <= ORB;
    const onIC = dIC <= ORB;
    if (!onMC && !onIC) continue;
    const point = onMC ? MC : IC;
    const orb = onMC ? dMC : dIC;
    // applying vs separating: nudge a hair in the direction of motion.
    const dir = t.isRetrograde ? -1 : 1;
    const stepped = ((t.longitude + dir * 0.02) % 360 + 360) % 360;
    const applying = angDist(stepped, point) < orb;
    hits.push({
      planet: Name,
      pole: onMC ? "MC" : "IC",
      poleLabel: onMC ? "outer voice" : "inner voice",
      orb,
      transitSign: t.sign,
      transitDegree: t.degree,
      dignity: dignity(Name, t.sign),
      natalHouse: natalHouseByPlanet[Name] ?? null,
      applying,
      slow: SLOW.has(Name),
    });
  }
  // Chapter-makers (slow) first, then by tightness of orb.
  hits.sort((a, b) => (Number(b.slow) - Number(a.slow)) || (a.orb - b.orb));

  return {
    mc: { sign: ZODIAC[Math.floor(MC / 30)], degree: MC % 30 },
    ic: { sign: ZODIAC[Math.floor(IC / 30)], degree: IC % 30 },
    hits,
    orb: ORB,
  };
}

// ── The arc: slow-planet chapters over the axis (recent · current · upcoming) ──

export type Chapter = {
  planet: string;
  pole: "MC" | "IC";
  poleLabel: "outer voice" | "inner voice";
  enterMonth: string;   // "Jun 2025"
  exitMonth: string;
  peakDignity: string;
  natalHouse: number | null;
  status: "current" | "recent" | "upcoming";
  // filled in by the endpoint from the dasha timeline
  antardasha?: { open: string; carry: string; close: string };
  peakDateISO?: string;
  enterDateISO?: string;
  exitDateISO?: string;
  // Retrograde stations + shadow — the *official* threshold, tighter than the orb.
  retrograde?: boolean;
  stationDirect?: { month: string; sign: string; degree: number };
  shadowCleared?: boolean;
  shadowClearedMonth?: string;
};

const SLOW_PAIRS: [string, string][] = [["Jupiter", "jupiter"], ["Saturn", "saturn"], ["Rahu", "rahu"], ["Ketu", "ketu"]];
const MONTHS3 = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const fmtMonth = (t: number) => { const d = new Date(t); return `${MONTHS3[d.getUTCMonth()]} ${d.getUTCFullYear()}`; };

export async function computeMeridianArc(
  mcLongitude: number,
  natalHouseByPlanet: Record<string, number | null>,
  now: Date = new Date(),
): Promise<Chapter[]> {
  const MC = ((mcLongitude % 360) + 360) % 360;
  const IC = (MC + 180) % 360;
  const DAY = 86400000;
  const stepDays = 20;
  const spanMs = 15 * 30 * DAY; // ~15 months either side
  const start = now.getTime() - spanMs;
  const end = now.getTime() + spanMs;

  // Sample slow-planet longitudes across the span (one chart per sample date).
  const samples: { t: number; lon: Record<string, number>; retro: Record<string, boolean> }[] = [];
  for (let t = start; t <= end; t += stepDays * DAY) {
    const d = new Date(t);
    const chart: any = await calculateBirthChart(d.toISOString().slice(0, 10), "12:00", 0, 0, "UTC");
    const lon: Record<string, number> = {};
    const retro: Record<string, boolean> = {};
    for (const [Name, key] of SLOW_PAIRS) if (chart[key]) { lon[Name] = chart[key].longitude; retro[Name] = chart[key].isRetrograde; }
    samples.push({ t, lon, retro });
  }

  const chapters: Chapter[] = [];
  for (const [Name] of SLOW_PAIRS) {
    type Win = { start: number; end: number; pole: "MC" | "IC"; peakOrb: number; peakLon: number; peakT: number };
    const wins: Win[] = [];
    let cur: Win | null = null;
    for (const s of samples) {
      const l = s.lon[Name];
      if (l == null) continue;
      const dMC = angDist(l, MC), dIC = angDist(l, IC);
      if (dMC <= ORB || dIC <= ORB) {
        const pole: "MC" | "IC" = dMC <= dIC ? "MC" : "IC";
        const orb = Math.min(dMC, dIC);
        if (!cur) cur = { start: s.t, end: s.t, pole, peakOrb: orb, peakLon: l, peakT: s.t };
        else { cur.end = s.t; if (orb < cur.peakOrb) { cur.peakOrb = orb; cur.peakLon = l; cur.peakT = s.t; cur.pole = pole; } }
      } else if (cur) { wins.push(cur); cur = null; }
    }
    if (cur) wins.push(cur);
    if (!wins.length) continue;
    // The window nearest to now.
    wins.sort((a, b) => Math.abs((a.start + a.end) / 2 - now.getTime()) - Math.abs((b.start + b.end) / 2 - now.getTime()));
    const w = wins[0];
    const status: Chapter["status"] = now.getTime() < w.start ? "upcoming" : now.getTime() > w.end ? "recent" : "current";

    // Retrograde stations + shadow-clearance — the *official* close of the chapter,
    // tighter than the orb window. A slow planet only truly lets go of the axis once
    // it stations direct and re-passes the degree where it first turned back.
    const flips: { t: number; lon: number; toRetro: boolean }[] = [];
    for (let k = 1; k < samples.length; k++) {
      const a = samples[k - 1].retro[Name], b = samples[k].retro[Name];
      if (a == null || b == null || a === b) continue;
      flips.push({ t: samples[k].t, lon: samples[k].lon[Name], toRetro: b === true });
    }
    let stationDirect: Chapter["stationDirect"];
    let shadowCleared: boolean | undefined;
    let shadowClearedMonth: string | undefined;
    let retrograde: boolean | undefined;
    const near = (t: number) => Math.abs(t - w.peakT);
    const directs = flips.filter((f) => !f.toRetro);
    const lastDirect = directs.length ? directs.reduce((best, f) => (near(f.t) < near(best.t) ? f : best)) : undefined;
    const retrosBefore = lastDirect ? flips.filter((f) => f.toRetro && f.t < lastDirect.t) : [];
    const retroBefore = retrosBefore.length ? retrosBefore[retrosBefore.length - 1] : undefined;
    if (lastDirect && retroBefore && near(lastDirect.t) <= 150 * DAY) {
      retrograde = true;
      stationDirect = { month: fmtMonth(lastDirect.t), sign: ZODIAC[Math.floor(lastDirect.lon / 30)], degree: lastDirect.lon % 30 };
      const nowSample = [...samples].reverse().find((s) => s.t <= now.getTime() && s.lon[Name] != null);
      const curLon = nowSample?.lon[Name] ?? lastDirect.lon;
      shadowCleared = curLon > retroBefore.lon;
      const clr = samples.find((s) => s.t > lastDirect.t && s.lon[Name] != null && s.lon[Name] > retroBefore.lon);
      shadowClearedMonth = clr ? fmtMonth(clr.t) : undefined;
    }

    chapters.push({
      planet: Name,
      pole: w.pole,
      poleLabel: w.pole === "MC" ? "outer voice" : "inner voice",
      enterMonth: fmtMonth(w.start),
      exitMonth: fmtMonth(w.end),
      peakDignity: dignity(Name, ZODIAC[Math.floor(w.peakLon / 30)]),
      natalHouse: natalHouseByPlanet[Name] ?? null,
      status,
      enterDateISO: new Date(w.start).toISOString().slice(0, 10),
      peakDateISO: new Date(w.peakT).toISOString().slice(0, 10),
      exitDateISO: new Date(w.end).toISOString().slice(0, 10),
      retrograde,
      stationDirect,
      shadowCleared,
      shadowClearedMonth,
    });
  }
  const rank = { current: 0, recent: 1, upcoming: 2 };
  chapters.sort((a, b) => rank[a.status] - rank[b.status]);
  return chapters;
}
