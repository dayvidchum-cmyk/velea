/**
 * David's Moon: debilitation + neecha-bhanga (cancellation) check. "Debilitated" is only half the
 * question — a cancelled debilitation (neecha bhanga) can flip to strength, even a raja yoga (the
 * fall-then-rise signature). Runs the classical Parashari conditions against the actual chart so the
 * eclipse reading rests on the Moon's TRUE condition, not just its sign.
 *
 * Run: npx tsx server/scripts/moon-dignity.ts
 */
import { calculateBirthChart } from "../birthchart/calculator.js";

const BIRTH = { date: "1982-04-13", time: "17:20", lat: 14.6, lon: 120.6, tz: "Asia/Manila" };
const ZOD = ["Aries","Taurus","Gemini","Cancer","Leo","Virgo","Libra","Scorpio","Sagittarius","Capricorn","Aquarius","Pisces"];
const RULER: Record<string, string> = { Aries:"Mars",Taurus:"Venus",Gemini:"Mercury",Cancer:"Moon",Leo:"Sun",Virgo:"Mercury",Libra:"Venus",Scorpio:"Mars",Sagittarius:"Jupiter",Capricorn:"Saturn",Aquarius:"Saturn",Pisces:"Jupiter" };
const norm = (x: number) => ((x % 360) + 360) % 360;
const signOf = (l: number) => Math.floor(norm(l) / 30);
const degIn = (l: number) => norm(l) - signOf(l) * 30;
const houseFrom = (refIdx: number, l: number) => ((signOf(l) - refIdx + 12) % 12) + 1;
const KENDRA = new Set([1, 4, 7, 10]);
const fmt = (l: number) => `${degIn(l).toFixed(2)}° ${ZOD[signOf(l)]}`;

async function main() {
  const n: any = await calculateBirthChart(BIRTH.date, BIRTH.time, BIRTH.lat, BIRTH.lon, BIRTH.tz, { lagnaBasis: "ascendant" });
  const lagIdx = signOf(n.lagna.longitude);
  const moonL = n.moon.longitude as number;
  const moonSign = ZOD[signOf(moonL)];

  console.log(`\nMoon: ${fmt(moonL)} (${n.moon.nakshatra}) — house ${houseFrom(lagIdx, moonL)} from ${ZOD[lagIdx]} lagna\n`);

  // Debilitation: Moon falls in Scorpio, deepest at 3°00'. Depth = how close to that trough.
  const debil = moonSign === "Scorpio";
  const deepPoint = 3.0;
  const fromTrough = Math.abs(degIn(moonL) - deepPoint);
  console.log(`DEBILITATED: ${debil ? "YES — Moon in Scorpio (fall)" : "no"}`);
  if (debil) console.log(`  depth: ${degIn(moonL).toFixed(2)}° vs the 3° trough → ${fromTrough.toFixed(1)}° past deepest (shallow/late-sign, not rock-bottom)\n`);

  // Neecha-bhanga conditions (Parashari, the commonly-cited set). Any one can cancel; more = stronger.
  const marsL = n.mars.longitude, venusL = n.venus.longitude; // Mars = Scorpio's lord (dispositor); Venus = lord of Taurus (Moon's exaltation)
  const moonIdx = signOf(moonL);
  const conds: { rule: string; met: boolean; detail: string }[] = [];

  // 1. Dispositor of the debilitation sign in a kendra from Asc or Moon.
  const marsHfromAsc = houseFrom(lagIdx, marsL), marsHfromMoon = houseFrom(moonIdx, marsL);
  conds.push({ rule: "Dispositor (Mars, lord of Scorpio) in a kendra from Asc or Moon",
    met: KENDRA.has(marsHfromAsc) || KENDRA.has(marsHfromMoon),
    detail: `Mars ${fmt(marsL)} → ${marsHfromAsc}th from Asc, ${marsHfromMoon}th from Moon` });

  // 2. Lord of the Moon's EXALTATION sign (Venus, lord of Taurus) in a kendra from Asc or Moon.
  const venHfromAsc = houseFrom(lagIdx, venusL), venHfromMoon = houseFrom(moonIdx, venusL);
  conds.push({ rule: "Exaltation-lord (Venus, lord of Taurus) in a kendra from Asc or Moon",
    met: KENDRA.has(venHfromAsc) || KENDRA.has(venHfromMoon),
    detail: `Venus ${fmt(venusL)} → ${venHfromAsc}th from Asc, ${venHfromMoon}th from Moon` });

  // 3. Debilitated Moon aspected by its dispositor Mars (Mars special aspects: 4th, 7th, 8th from itself).
  const marsAspectsMoon = [4, 7, 8].some((h) => houseFrom(signOf(marsL), moonL) === h);
  conds.push({ rule: "Moon aspected by its dispositor Mars (4/7/8 graha drishti)",
    met: marsAspectsMoon,
    detail: `Moon is ${houseFrom(signOf(marsL), moonL)}th from Mars (${marsAspectsMoon ? "aspected" : "no Mars aspect"})` });

  console.log("NEECHA-BHANGA (cancellation) conditions:");
  for (const c of conds) console.log(`  [${c.met ? "✓" : "·"}] ${c.rule}\n        ${c.detail}`);
  const metCount = conds.filter((c) => c.met).length;
  console.log(`\n→ ${metCount} condition(s) met. ${metCount >= 1 ? "Debilitation CANCELLED (neecha bhanga) — the fall-then-rise signature; strong when ≥2." : "No cancellation — the debilitation stands."}\n`);
}
main().catch((e) => { console.error(e); process.exit(1); });
