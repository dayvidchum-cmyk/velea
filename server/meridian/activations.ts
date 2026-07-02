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
