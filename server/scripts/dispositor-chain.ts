/**
 * Dispositor chain for a point in David's chart: sign → its lord → the lord's sign → its lord …
 * until it terminates (a planet in its own sign) or loops (a mutual exchange / parivartana). Each
 * step shows the planet's sign, house, and dignity. Plus: which natal points sit near a given
 * degree (e.g. the eclipse's Sun-end), so a "hit" check and the causal chain are on one table.
 *
 * Run: npx tsx server/scripts/dispositor-chain.ts <sign> [checkDegLon]
 *   e.g. npx tsx server/scripts/dispositor-chain.ts Aquarius 129.79   (lunar eclipse + its Sun-end)
 */
import { calculateBirthChart } from "../birthchart/calculator.js";

const BIRTH = { date: "1982-04-13", time: "17:20", lat: 14.6, lon: 120.6, tz: "Asia/Manila" };
const ZOD = ["Aries","Taurus","Gemini","Cancer","Leo","Virgo","Libra","Scorpio","Sagittarius","Capricorn","Aquarius","Pisces"];
const RULER: Record<string, string> = { Aries:"Mars",Taurus:"Venus",Gemini:"Mercury",Cancer:"Moon",Leo:"Sun",Virgo:"Mercury",Libra:"Venus",Scorpio:"Mars",Sagittarius:"Jupiter",Capricorn:"Saturn",Aquarius:"Saturn",Pisces:"Jupiter" };
const EXALT: Record<string,string> = { Sun:"Aries",Moon:"Taurus",Mars:"Capricorn",Mercury:"Virgo",Jupiter:"Cancer",Venus:"Pisces",Saturn:"Libra" };
const DEBIL: Record<string,string> = { Sun:"Libra",Moon:"Scorpio",Mars:"Cancer",Mercury:"Pisces",Jupiter:"Capricorn",Venus:"Virgo",Saturn:"Aries" };
const OWN: Record<string,string[]> = { Sun:["Leo"],Moon:["Cancer"],Mars:["Aries","Scorpio"],Mercury:["Gemini","Virgo"],Jupiter:["Sagittarius","Pisces"],Venus:["Taurus","Libra"],Saturn:["Capricorn","Aquarius"] };
const norm = (x:number)=>((x%360)+360)%360;
const signOf = (l:number)=>Math.floor(norm(l)/30);
const degIn = (l:number)=>norm(l)-signOf(l)*30;
const fmt = (l:number)=>`${degIn(l).toFixed(2)}° ${ZOD[signOf(l)]}`;
const sep = (a:number,b:number)=>{const d=norm(a-b);return Math.min(d,360-d);};

function dignity(planet:string, sign:string){
  if (EXALT[planet]===sign) return "exalted";
  if (DEBIL[planet]===sign) return "DEBILITATED";
  if (OWN[planet]?.includes(sign)) return "own sign";
  return "—";
}

async function main(){
  const startSign = process.argv[2] || "Aquarius";
  const checkLon = process.argv[3] != null ? Number(process.argv[3]) : null;
  const n:any = await calculateBirthChart(BIRTH.date, BIRTH.time, BIRTH.lat, BIRTH.lon, BIRTH.tz, { lagnaBasis:"ascendant" });
  const lagIdx = signOf(n.lagna.longitude);
  const houseFrom = (l:number)=>((signOf(l)-lagIdx+12)%12)+1;
  const lonOf = (planet:string)=> n[planet.toLowerCase()].longitude as number;

  console.log(`\nDispositor chain from ${startSign} (house ${((ZOD.indexOf(startSign)-lagIdx+12)%12)+1} from ${ZOD[lagIdx]} lagna):\n`);
  let sign = startSign; const seen = new Set<string>(); let step = 0;
  while (step++ < 12){
    const lord = RULER[sign];
    const ll = lonOf(lord);
    const lordSign = ZOD[signOf(ll)];
    const dig = dignity(lord, lordSign);
    console.log(`  ${sign}  →  ${lord} at ${fmt(ll)}  (house ${houseFrom(ll)}${dig!=="—"?", "+dig:""})`);
    const key = lord;
    if (seen.has(key)) { console.log(`     ↑ loops here — mutual exchange (parivartana): ${lord} and the prior lord swap signs. Chain terminates.\n`); break; }
    if (OWN[lord]?.includes(lordSign)) { console.log(`     ↑ ${lord} in its OWN sign — the chain roots here (terminus).\n`); break; }
    seen.add(key);
    sign = lordSign;
  }

  if (checkLon != null){
    console.log(`Natal points near ${fmt(checkLon)} (the checked degree — e.g. an eclipse's Sun-end):`);
    const pts = [["Sun","sun"],["Moon","moon"],["Mars","mars"],["Mercury","mercury"],["Jupiter","jupiter"],["Venus","venus"],["Saturn","saturn"],["Rahu","rahu"],["Ketu","ketu"],["Asc","lagna"]] as const;
    const rows = pts.map(([name,k])=>({name, lon:n[k].longitude as number})).concat(n.mc?[{name:"MC",lon:n.mc.longitude}]:[])
      .map(p=>({...p, orb: sep(p.lon, checkLon)})).sort((a,b)=>a.orb-b.orb);
    for (const r of rows.slice(0,4)) console.log(`  ${r.name.padEnd(5)} ${fmt(r.lon).padEnd(16)} ${r.orb.toFixed(1)}°${r.orb<=8?"  ◄ in orb":""}`);
    const empty = signOf(checkLon);
    const occupants = rows.filter(r=>signOf(r.lon)===empty && r.name!=="Asc" && r.name!=="MC");
    console.log(`  → ${ZOD[empty]} (house ${((empty-lagIdx+12)%12)+1}) is ${occupants.length?occupants.map(o=>o.name).join(", ")+" sit(s) there":"EMPTY of natal planets"}.\n`);
  }
}
main().catch(e=>{console.error(e);process.exit(1);});
