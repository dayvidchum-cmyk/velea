#!/usr/bin/env node
/** One-off: assemble the Narrative-layer structured input for a profile/date.
 *  Usage: tsx narrative-input.ts [email] [scan|YYYY-MM-DD]
 */
import "dotenv/config";
import { getUserByEmail, getDb } from "../db.js";
import { profiles, profileNatalBodies } from "../../drizzle/schema.js";
import { eq, and } from "drizzle-orm";
import { calculateProfectionYear } from "../profection/calculator.js";
import { calculateDashaTimeline } from "../dasha-calculator.js";
import { getSiderealLongitudes } from "../vedic/natal-chart-engine.js";
import { calcPanchang } from "../panchang/astronomy.js";
import { interpretPanchang } from "../panchang/interpreter.js";

const ZODIAC = ["Aries","Taurus","Gemini","Cancer","Leo","Virgo","Libra","Scorpio","Sagittarius","Capricorn","Aquarius","Pisces"];
const SIGN_RULERS: Record<string,string> = { Aries:"Mars",Taurus:"Venus",Gemini:"Mercury",Cancer:"Moon",Leo:"Sun",Virgo:"Mercury",Libra:"Venus",Scorpio:"Mars",Sagittarius:"Jupiter",Capricorn:"Saturn",Aquarius:"Saturn",Pisces:"Jupiter" };
import { NAK27 as NAK } from "@shared/nakshatra-names";
const DIGN: Record<string,{ex:string;de:string;own:string[]}> = { Sun:{ex:"Aries",de:"Libra",own:["Leo"]},Moon:{ex:"Taurus",de:"Scorpio",own:["Cancer"]},Mars:{ex:"Capricorn",de:"Cancer",own:["Aries","Scorpio"]},Mercury:{ex:"Virgo",de:"Pisces",own:["Gemini","Virgo"]},Jupiter:{ex:"Cancer",de:"Capricorn",own:["Sagittarius","Pisces"]},Venus:{ex:"Pisces",de:"Virgo",own:["Taurus","Libra"]},Saturn:{ex:"Libra",de:"Aries",own:["Capricorn","Aquarius"]} };
const dignity = (p:string,s:string)=>{const d=DIGN[p];if(!d)return"—";if(s===d.ex)return"Exalted";if(s===d.de)return"Debilitated";if(d.own.includes(s))return"Own";return"Neutral";};
const signFromLon=(l:number)=>ZODIAC[Math.floor(l/30)%12];
const nakFromLon=(l:number)=>NAK[Math.floor(l/(360/27))%27];
const houseFromLagna=(s:string,lag:string)=>((ZODIAC.indexOf(s)-ZODIAC.indexOf(lag)+12)%12)+1;
const rulesHouses=(p:string,lag:string)=>ZODIAC.filter(s=>SIGN_RULERS[s]===p).map(s=>houseFromLagna(s,lag));
const utcOffsetFromLon=(lon:number)=>Math.round(lon/15);
const addDays=(d:string,n:number)=>{const x=new Date(d+"T12:00:00Z");x.setUTCDate(x.getUTCDate()+n);return x.toISOString().split("T")[0];};

async function getOwnerSubject(email:string){
  const user=await getUserByEmail(email); if(!user) throw new Error("no user "+email);
  const db=await getDb();
  if(!db) throw new Error("no db");
  const prows=await db.select().from(profiles).where(and(eq(profiles.userId,user.id),eq(profiles.isOwner,true))).limit(1);
  const p=prows[0]; if(!p) throw new Error("no owner profile");
  const bodies=await db.select().from(profileNatalBodies).where(eq(profileNatalBodies.profileId,p.id));
  return {p,bodies};
}

async function panchangFor(dateStr:string, lat:number, lon:number, lagna:string){
  const astro=await calcPanchang(dateStr,lat,lon,utcOffsetFromLon(lon));
  const field=interpretPanchang(astro,lagna);
  // day-scale, exactly as input-builder ships it (v794) — a diagnostic that showed the moment's
  // mode beside the ruling house would hide the very bug it exists to surface.
  return { mode:field.dayFinalMode ?? field.finalMode, qualifier:field.dayQualifier ?? field.qualifier, activatedHouse:field.houseActivated, nakshatra:field.nakshatra, tithi:field.tithi, paksha:field.tithiPaksha, moonSign:field.moonSign };
}

async function buildInput(email:string, dateStr:string){
  const {p,bodies}=await getOwnerSubject(email);
  const lagna=p.lagnaSign!; const lat=parseFloat(p.birthLocationLat||"42.36"); const lon=parseFloat(p.birthLocationLon||"-71.06");
  const byPlanet=Object.fromEntries(bodies.map(b=>[b.planet,b]));
  const nat=(b:any)=>b?{sign:b.sign,house:b.house,nakshatra:b.nakshatra,dignity:dignity(b.planet,b.sign),retrograde:!!b.isRetrograde}:null;

  const natal={ lagna, planets: ["Sun","Moon","Mars","Mercury","Jupiter","Venus","Saturn","Rahu","Ketu"].map(n=>{const b=byPlanet[n];return b?{name:n,sign:b.sign,house:b.house,nakshatra:b.nakshatra,pada:b.pada,dignity:dignity(n,b.sign),retrograde:!!b.isRetrograde,rulesHouses:rulesHouses(n,lagna)}:null;}).filter(Boolean) };

  const pf=calculateProfectionYear(p.birthDate!,dateStr,lagna);
  const tlb=byPlanet[pf.timeLord];
  const profection={ age:pf.age, activatedHouse:pf.activatedHouse, activatedSign:pf.activatedSign, timeLord:pf.timeLord, timeLordNatal:nat(tlb), timeLordRulesHouses:rulesHouses(pf.timeLord,lagna) };

  const moon=byPlanet["Moon"];
  const tl=calculateDashaTimeline(p.birthDate!,moon.nakshatra||"",moon.sign,moon.degree,dateStr,moon.longitude);
  const cur=tl.entries.find(e=>e.isCurrent);
  const dasha=cur?{ mahaDasha:{lord:cur.mahadasha,natal:nat(byPlanet[cur.mahadasha]),rulesHouses:rulesHouses(cur.mahadasha,lagna)}, antarDasha:{lord:cur.antardasha,natal:nat(byPlanet[cur.antardasha]),rulesHouses:rulesHouses(cur.antardasha,lagna)} }:null;

  const noon=new Date(dateStr+"T12:00:00Z");
  const soon=new Date(noon.getTime()+86400000);
  const pl=["Sun","Moon","Mars","Mercury","Jupiter","Venus","Saturn","Rahu","Ketu"];
  const a=await getSiderealLongitudes(noon,pl); const b=await getSiderealLongitudes(soon,pl);
  const natalLon:Record<string,number>={}; for(const x of bodies) if(x.longitude) natalLon[x.planet]=parseFloat(x.longitude);
  const transits=pl.map(n=>{const lonp=a[n]; if(lonp===undefined)return null; const sign=signFromLon(lonp); const retro=(n==="Rahu"||n==="Ketu")?true:(b[n]!==undefined&&(((b[n]-lonp+540)%360)-180)<0);
    // nearest natal point within 4°
    let hit:string|null=null,orb=99; for(const[k,v] of Object.entries(natalLon)){let o=Math.abs(((lonp-v+540)%360)-180); if(o<orb){orb=o;hit=k;}}
    return {planet:n,sign,houseFromLagna:houseFromLagna(sign,lagna),retrograde:retro,combust:null,hitsNatalPoint:orb<=4?hit:null,orbDeg:orb<=4?+orb.toFixed(1):null};
  }).filter(Boolean);

  const pan=await panchangFor(dateStr,lat,lon,lagna);
  const panchang={ mode:pan.mode, activatedHouse:pan.activatedHouse, nakshatra:pan.nakshatra, tithi:pan.tithi, asOf:dateStr };

  return { subject:{name:p.name,profileId:p.id,birthDate:p.birthDate,city:p.birthLocationCity}, date:dateStr, natal, profection, dasha, transits, panchang };
}

async function main(){
  const email=process.argv[2]??"david@velea.local";
  const arg=process.argv[3]??new Date().toISOString().split("T")[0];
  const {p}=await getOwnerSubject(email);
  const today=new Date().toISOString().split("T")[0];
  if(arg==="scan"){
    const lat=parseFloat(p.birthLocationLat||"42.36"),lon=parseFloat(p.birthLocationLon||"-71.06");
    console.log(`Owner: ${p.name} | lagna ${p.lagnaSign} | ${p.birthDate} | ${p.birthLocationCity}`);
    for(let i=0;i<35;i++){const d=addDays(today,i);const pan=await panchangFor(d,lat,lon,p.lagnaSign!);console.log(`${d}  ${pan.mode.padEnd(10)} (${pan.qualifier}) | H${pan.activatedHouse} ${pan.moonSign} ${pan.nakshatra} | ${pan.tithi} ${pan.paksha}`);}
    process.exit(0);
  }
  const input=await buildInput(email,arg);
  console.log(JSON.stringify(input,null,2));
  process.exit(0);
}
main().catch(e=>{console.error(e);process.exit(1);});
