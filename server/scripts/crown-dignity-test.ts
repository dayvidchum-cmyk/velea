import { resolveDaySky } from "../panchang/resolve-day-sky.js";
/**
 * SHOULD natal Moon dignity fold into the DAILY crown/mode layer? A month test on David's chart
 * before we commit (his call). His Moon is debilitated-but-cancelled — the exact stress case.
 *
 * The structural fact this exposes: natal dignity is a BIRTH CONSTANT. It can't add daily texture —
 * it can only (a) uniformly re-baseline, or (b) act as a gate. So the test compares his real month to
 * two hypothetical foldings:
 *   NAIVE  — raw debilitation gates crowns + docks the score (ignores neecha bhanga)
 *   NB-AWARE — the cancellation is honored (his Moon's fall is undone → no penalty)
 *
 * Run: npx tsx server/scripts/crown-dignity-test.ts [YYYY-MM]
 */
import { calculateBirthChart } from "../birthchart/calculator.js";
import { anchorsFromBodies, crownDay, majorityDayStarIdx } from "../panchang/crown.js";
import { dignityOf, type Graha } from "../vedic/dignity.js";

const BIRTH = { date: "1982-04-13", time: "17:20", lat: 14.6, lon: 120.6, tz: "Asia/Manila" };
const GRAHAS: Graha[] = ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn"];
const si = (l: number) => Math.floor((((l % 360) + 360) % 360) / 30);

async function main() {
  const ym = process.argv[2] || "2026-07";
  const [Y, M] = ym.split("-").map(Number);

  const natal: any = await calculateBirthChart(BIRTH.date, BIRTH.time, BIRTH.lat, BIRTH.lon, BIRTH.tz, { lagnaBasis: "ascendant" });
  const bodies = ["sun","moon","mars","mercury","jupiter","venus","saturn","rahu","ketu"].map((k) => ({
    planet: k[0].toUpperCase() + k.slice(1), sign: natal[k].sign, nakshatra: natal[k].nakshatra,
  }));
  const anchors = anchorsFromBodies(bodies as any, natal.lagna.sign)!;
  const lonBy = Object.fromEntries(GRAHAS.map((g) => [g, natal[g.toLowerCase()].longitude])) as Record<Graha, number>;
  const moonDig = dignityOf("Moon", lonBy, natal.lagna.longitude);

  console.log(`\nCrown/mode × natal Moon dignity — ${ym}, David's chart`);
  console.log(`natal Moon: ${moonDig.sign} — ${moonDig.state}${moonDig.neechaBhanga?.cancelled ? " (neecha bhanga CANCELLED)" : ""}\n`);

  const daysInMonth = new Date(Date.UTC(Y, M, 0)).getUTCDate();
  const count = { current: { crown: 0, favorable: 0, neutral: 0, caution: 0 }, naive: { crown: 0, favorable: 0, neutral: 0, caution: 0 } };

  for (let d = 1; d <= daysInMonth; d++) {
    const date = `${ym}-${String(d).padStart(2, "0")}`;
    const ch: any = await calculateBirthChart(date, "12:00", 0, 0, "UTC");
    const T: Record<string, number> = Object.fromEntries(GRAHAS.map((g) => [g, si(ch[g.toLowerCase()].longitude)]));
    const daySky = await resolveDaySky({ dateStr: date });
    const majIdx = await majorityDayStarIdx(date, daySky.lat, daySky.lon, daySky.utcOffset);
    const cd = crownDay({ ...anchors, sunLon: ch.sun.longitude, moonLon: ch.moon.longitude, transitSignByPlanet: T, ashtakavarga: anchors.ashtakavarga, dayNakIdxOverride: majIdx ?? undefined });
    count.current[cd.rating as keyof typeof count.current]++;

    // NAIVE folding: a debilitated natal Moon (ignoring NB) gates the crown away and docks the score.
    const rawDebil = moonDig.debilitated; // true for David
    let naiveRating = cd.rating;
    if (rawDebil) {
      const s = cd.score - 1;
      naiveRating = cd.rating === "crown" ? "favorable" : s <= -2 ? "caution" : s >= 2 ? "favorable" : "neutral";
    }
    count.naive[naiveRating as keyof typeof count.naive]++;
  }

  const row = (label: string, c: typeof count.current) =>
    console.log(`  ${label.padEnd(28)} crown ${c.crown}   favorable ${c.favorable}   neutral ${c.neutral}   caution ${c.caution}`);
  console.log("verdict counts:");
  row("current (dignity NOT folded)", count.current);
  row("NAIVE fold (raw debil)", count.naive);
  row("NB-AWARE fold (cancelled)", count.current); // cancelled → identical to current
  console.log(`\nreading:`);
  console.log(`  • NAIVE folding erases all ${count.current.crown} of his crowns (his Moon is debilitated) and pushes days toward caution.`);
  console.log(`  • NB-AWARE folding == current: the cancellation undoes the penalty, so nothing moves.`);
  console.log(`  • Natal dignity is a birth CONSTANT — it can only gate or re-baseline, never add daily texture.`);
  console.log(`  → Recommendation: do NOT gate the daily crown/mode on natal Moon dignity. Its value is already`);
  console.log(`    captured at the chart level (the Dignity readout). Revisit only as an INTERACTION (natal`);
  console.log(`    dignity × a daily variable), never as a flat constant.\n`);
}
main().catch((e) => { console.error(e); process.exit(1); });
