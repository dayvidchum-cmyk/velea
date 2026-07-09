// One-off trace: why is 2026-07-09 not golden/crown for David? (align27 comparison)
// Run: npx tsx server/scripts/trace-today-crown.ts
import { calculateBirthChart } from "../birthchart/calculator.js";
import { crownDay, tarabala, chandrabala } from "../panchang/crown.js";

const NAK = ["Ashwini","Bharani","Krittika","Rohini","Mrigashira","Ardra","Punarvasu","Pushya","Ashlesha","Magha","Purva Phalguni","Uttara Phalguni","Hasta","Chitra","Swati","Vishakha","Anuradha","Jyeshtha","Mula","Purva Ashadha","Uttara Ashadha","Shravana","Dhanishtha","Shatabhisha","Purva Bhadrapada","Uttara Bhadrapada","Revati"];
const ZOD = ["Aries","Taurus","Gemini","Cancer","Leo","Virgo","Libra","Scorpio","Sagittarius","Capricorn","Aquarius","Pisces"];

// David (test fixture): Moon Scorpio / Jyeshtha, Lagna Virgo
const birthNakIdx = NAK.indexOf("Jyeshtha");
const natalMoonSignIdx = ZOD.indexOf("Scorpio");
const lagnaSignIdx = ZOD.indexOf("Virgo");

const si = (lon: number) => Math.floor((((lon % 360) + 360) % 360) / 30);

(async () => {
  const date = process.argv[2] || "2026-07-09";
  const ch: any = await calculateBirthChart(date, "12:00", 0, 0, "UTC");
  const T: Record<string, number> = { Sun: si(ch.sun.longitude), Moon: si(ch.moon.longitude), Mars: si(ch.mars.longitude), Mercury: si(ch.mercury.longitude), Jupiter: si(ch.jupiter.longitude), Venus: si(ch.venus.longitude), Saturn: si(ch.saturn.longitude), Rahu: si(ch.rahu.longitude), Ketu: si(ch.ketu.longitude) };
  const cd = crownDay({ birthNakIdx, natalMoonSignIdx, lagnaSignIdx, sunLon: ch.sun.longitude, moonLon: ch.moon.longitude, transitSignByPlanet: T });
  const dayNak = NAK[cd.universal.nakshatra];
  console.log(`DATE ${date} (noon UTC)`);
  console.log(`Day Moon: ${ZOD[si(ch.moon.longitude)]} ${(ch.moon.longitude % 30).toFixed(1)}° · nakshatra ${dayNak}`);
  console.log(`— universal (collective sky): score ${cd.universal.score} → tithi ${cd.universal.tithi}, yoga/nak factors ${JSON.stringify({ good: (cd.universal as any).good, bad: (cd.universal as any).bad })}`);
  console.log(`— tarabala: #${cd.tarabala.taraNum} ${cd.tarabala.name} (${cd.tarabala.quality}) favorable=${cd.tarabala.favorable}`);
  console.log(`— chandrabala: transit Moon in your ${cd.chandrabala.house}th from natal Moon (${cd.chandrabala.quality}) favorable=${cd.chandrabala.favorable}`);
  if (cd.transit) console.log(`— transits: net ${cd.transit.score}\n    support: ${cd.transit.support.join("; ") || "none"}\n    afflict:  ${cd.transit.affliction.join("; ") || "none"}`);
  console.log(`TOTAL score ${cd.score} → RATING: ${cd.rating.toUpperCase()}`);
})();
