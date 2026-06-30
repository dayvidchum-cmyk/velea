#!/usr/bin/env node
/** One-off: dump a full astrological timing snapshot for the Narrative layer. */
import "dotenv/config";
import { getUserByEmail } from "../db.js";
import { resolveAstrologySubject } from "../astrology-subject.js";
import { calculateProfectionYear } from "../profection/calculator.js";
import { calculateDashaTimeline } from "../dasha-calculator.js";
import { getCurrentLayers } from "../layers/index.js";
import { getSiderealLongitudes } from "../vedic/natal-chart-engine.js";

const ZODIAC = ["Aries","Taurus","Gemini","Cancer","Leo","Virgo","Libra","Scorpio","Sagittarius","Capricorn","Aquarius","Pisces"];
const SIGN_RULERS: Record<string,string> = {
  Aries:"Mars",Taurus:"Venus",Gemini:"Mercury",Cancer:"Moon",Leo:"Sun",Virgo:"Mercury",
  Libra:"Venus",Scorpio:"Mars",Sagittarius:"Jupiter",Capricorn:"Saturn",Aquarius:"Saturn",Pisces:"Jupiter",
};
const NAKSHATRAS = ["Ashwini","Bharani","Krittika","Rohini","Mrigashira","Ardra","Punarvasu","Pushya","Ashlesha","Magha","Purva Phalguni","Uttara Phalguni","Hasta","Chitra","Swati","Vishakha","Anuradha","Jyeshtha","Mula","Purva Ashadha","Uttara Ashadha","Shravana","Dhanishta","Shatabhisha","Purva Bhadrapada","Uttara Bhadrapada","Revati"];
// Exalt / Debil / Own signs for dignity
const DIGN: Record<string,{ex:string;de:string;own:string[]}> = {
  Sun:{ex:"Aries",de:"Libra",own:["Leo"]},
  Moon:{ex:"Taurus",de:"Scorpio",own:["Cancer"]},
  Mars:{ex:"Capricorn",de:"Cancer",own:["Aries","Scorpio"]},
  Mercury:{ex:"Virgo",de:"Pisces",own:["Gemini","Virgo"]},
  Jupiter:{ex:"Cancer",de:"Capricorn",own:["Sagittarius","Pisces"]},
  Venus:{ex:"Pisces",de:"Virgo",own:["Taurus","Libra"]},
  Saturn:{ex:"Libra",de:"Aries",own:["Capricorn","Aquarius"]},
};
function dignity(planet: string, sign: string): string {
  const d = DIGN[planet]; if (!d) return "—";
  if (sign === d.ex) return "Exalted";
  if (sign === d.de) return "Debilitated";
  if (d.own.includes(sign)) return "Own sign";
  return "Neutral";
}
function nakFromLon(lon: number): string { return NAKSHATRAS[Math.floor(lon / (360/27)) % 27]; }
function signFromLon(lon: number): string { return ZODIAC[Math.floor(lon/30)%12]; }
function houseFromLagna(sign: string, lagna: string): number {
  return ((ZODIAC.indexOf(sign) - ZODIAC.indexOf(lagna) + 12) % 12) + 1;
}
function housesRuledBy(planet: string, lagna: string): number[] {
  return ZODIAC.filter((s) => SIGN_RULERS[s] === planet).map((s) => houseFromLagna(s, lagna));
}

async function main() {
  const email = process.argv[2] ?? "david@kala.local";
  const today = new Date().toISOString().split("T")[0];
  const user = await getUserByEmail(email);
  if (!user) { console.error("No user:", email); process.exit(1); }
  const subject = await resolveAstrologySubject(user.id);
  if (!subject || !subject.lagnaSign) { console.error("No subject/lagna for", email); process.exit(1); }
  const lagna = subject.lagnaSign;

  const byPlanet = Object.fromEntries(subject.natalBodies.map((b) => [b.planet, b]));

  console.log("================ NATAL ================");
  console.log("Name:", subject.name, "| Birth:", subject.birthDate, subject.birthTime ?? "", "|", subject.birthLocationCity ?? "");
  console.log("Lagna (Ascendant):", lagna);
  for (const p of ["Sun","Moon","Mars","Mercury","Jupiter","Venus","Saturn","Rahu","Ketu"]) {
    const b = byPlanet[p]; if (!b) continue;
    console.log(`${p}: ${b.sign} | House ${b.house} | ${b.nakshatra ?? "?"}${b.pada?` pada ${b.pada}`:""} | ${dignity(p,b.sign)}${b.isRetrograde?" | Retrograde":""} | rules houses [${housesRuledBy(p,lagna).join(", ")}]`);
  }

  console.log("\n================ ANNUAL PROFECTION ================");
  const prof = calculateProfectionYear(subject.birthDate, today, lagna);
  const tlBody = byPlanet[prof.timeLord];
  console.log(`Age ${prof.age} | Activated House ${prof.activatedHouse} | Activated Sign ${prof.activatedSign} | Year ${prof.yearStart}→${prof.yearEnd}`);
  console.log(`Annual Time Lord: ${prof.timeLord}`);
  console.log(`  Time Lord natal condition: ${tlBody ? `${tlBody.sign} | House ${tlBody.house} | ${tlBody.nakshatra ?? "?"} | ${dignity(prof.timeLord, tlBody.sign)}${tlBody.isRetrograde?" | Retrograde":""}` : "(not in natal bodies)"}`);
  console.log(`  Time Lord rules houses: [${housesRuledBy(prof.timeLord, lagna).join(", ")}]`);

  console.log("\n================ DASHA (Vimshottari) ================");
  const moon = byPlanet["Moon"];
  const tl = calculateDashaTimeline(subject.birthDate, moon.nakshatra ?? "", moon.sign, moon.degree, today, moon.longitude);
  const cur = tl.entries.find((e) => e.isCurrent);
  if (cur) {
    console.log(`Maha Dasha: ${cur.mahadasha}  |  Antar Dasha: ${cur.antardasha}  | (${(cur as any).startDate ?? "?"} → ${(cur as any).endDate ?? "?"})`);
    for (const lord of [cur.mahadasha, cur.antardasha]) {
      const b = byPlanet[lord];
      console.log(`  ${lord} natal: ${b ? `${b.sign} | House ${b.house} | ${b.nakshatra ?? "?"} | ${dignity(lord,b.sign)}${b.isRetrograde?" | Retro":""} | rules [${housesRuledBy(lord,lagna).join(", ")}]` : "(missing)"}`);
    }
    console.log("  (Pratyantar Dasha: not computed by this timeline — MD/AD only)");
  } else {
    console.log("(no current dasha entry found)");
  }

  console.log("\n================ CURRENT TRANSITS ================");
  const now = new Date();
  const soon = new Date(now.getTime() + 24*3600*1000);
  const planets = ["Sun","Moon","Mars","Mercury","Jupiter","Venus","Saturn","Rahu","Ketu"];
  const posNow = await getSiderealLongitudes(now, planets);
  const posSoon = await getSiderealLongitudes(soon, planets);
  for (const p of planets) {
    const lon = posNow[p]; if (lon === undefined) continue;
    const sign = signFromLon(lon);
    const retro = p === "Rahu" || p === "Ketu" ? true : (posSoon[p] !== undefined && ((posSoon[p] - lon + 540) % 360) - 180 < 0);
    console.log(`${p}: ${sign} (${lon.toFixed(1)}°) | House ${houseFromLagna(sign, lagna)} from lagna | ${nakFromLon(lon)}${retro?" | Retrograde":""}`);
  }

  console.log("\n================ PRESSURE LAYERS (orb hits) ================");
  const layers = await getCurrentLayers(subject);
  console.log("Time Lord period theme:", layers.timeLordPeriod ? `${layers.timeLordPeriod.mahaDasha}/${layers.timeLordPeriod.antarDasha} — "${layers.timeLordPeriod.theme}"` : "(none)");
  console.log("Active transit pressures (≤3° orb):", layers.transits.active.length === 0 ? "(none)" :
    layers.transits.active.map((t:any) => `${t.transitingPlanet}→natal ${t.natalPoint} (${t.orb}°, ${t.severity})`).join(", "));

  console.log("\n================ DAILY LUNAR CONTEXT ================");
  const moonLon = posNow["Moon"];
  console.log(`Moon today: ${signFromLon(moonLon)} | ${nakFromLon(moonLon)} | House ${houseFromLagna(signFromLon(moonLon), lagna)} from lagna`);

  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
