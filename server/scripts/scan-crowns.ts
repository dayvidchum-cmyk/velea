import { calculateBirthChart } from "../birthchart/calculator.js";
import { crownDay } from "../panchang/crown.js";
import { NAK27 as NAK } from "@shared/nakshatra-names";
const birthNakIdx=NAK.indexOf("Jyeshtha"), natalMoonSignIdx=7, lagnaSignIdx=5;
const si=(l:number)=>Math.floor((((l%360)+360)%360)/30);
(async()=>{
  for (const [y,m,days] of [[2026,7,31],[2026,8,31],[2026,9,30]] as [number,number,number][]) {
    let crowns:string[]=[], nearMiss:string[]=[];
    for(let d=1;d<=days;d++){
      const date=`${y}-${String(m).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
      const ch:any=await calculateBirthChart(date,"12:00",0,0,"UTC");
      const T:Record<string,number>={Sun:si(ch.sun.longitude),Moon:si(ch.moon.longitude),Mars:si(ch.mars.longitude),Mercury:si(ch.mercury.longitude),Jupiter:si(ch.jupiter.longitude),Venus:si(ch.venus.longitude),Saturn:si(ch.saturn.longitude),Rahu:si(ch.rahu.longitude),Ketu:si(ch.ketu.longitude)};
      const cd=crownDay({birthNakIdx,natalMoonSignIdx,lagnaSignIdx,sunLon:ch.sun.longitude,moonLon:ch.moon.longitude,transitSignByPlanet:T});
      if(cd.rating==="crown") crowns.push(`${date} (${cd.tarabala.name}, ${cd.chandrabala.house}th)`);
      else if(cd.tarabala.favorable&&cd.chandrabala.favorable) nearMiss.push(`${date} blocked by: universal ${cd.universal.score}${cd.transit&&cd.transit.score<=-3?` transits ${cd.transit.score}`:""}`);
    }
    console.log(`${y}-${String(m).padStart(2,"0")}: ${crowns.length} crowns${crowns.length?" → "+crowns.join(", "):""}`);
    if(nearMiss.length) console.log(`   near-misses: ${nearMiss.join(" | ")}`);
  }
})();
