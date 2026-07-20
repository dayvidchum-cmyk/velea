import { neechaBhanga, planetDignity } from "./server/vedic/dignity.js";
const GRAHAS = ["Sun","Moon","Mars","Mercury","Jupiter","Venus","Saturn"] as any[];
const DEBIL: Record<string,number> = { Sun:190,Moon:213,Mars:118,Mercury:345,Jupiter:275,Venus:177,Saturn:20 };
let seed=2468; const rnd=()=> (seed=(seed*1103515245+12345)%2147483648)/2147483648;
let total=0; const at:Record<number,number>={1:0,2:0,3:0,4:0};
// Also: what if the two rival glosses of ONE verse (conditions 2 & 3) count as one, as the
// provenance file says they should? That is a de-duplication, not a method change.
let dedupAt2=0, dedupAt1=0;
for(let t=0;t<40000;t++){
  const p=GRAHAS[Math.floor(rnd()*7)]; const lonBy:any={};
  for(const g of GRAHAS) lonBy[g]=rnd()*360;
  lonBy[p]=DEBIL[p]+(rnd()*2-1);
  if(planetDignity(p,lonBy[p])!=="debilitated") continue;
  const nb=neechaBhanga(p,lonBy,rnd()*360); total++;
  for(const k of [1,2,3,4]) if(nb.count>=k) at[k]++;
  const hasExalter=nb.reasons.some(r=>r.includes("exalts in"));
  const hasExaltLord=nb.reasons.some(r=>r.includes("lord of")&&r.includes("exaltation"));
  const dedup=nb.count-((hasExalter&&hasExaltLord)?1:0);
  if(dedup>=1) dedupAt1++; if(dedup>=2) dedupAt2++;
}
const pct=(n:number)=>((n/total)*100).toFixed(1).padStart(5)+"%";
console.log(`sampled ${total} debilitated planets\n`);
console.log(`  cancels if >=1 condition (TODAY): ${pct(at[1])}`);
console.log(`  cancels if >=2 conditions:        ${pct(at[2])}`);
console.log(`  cancels if >=3 conditions:        ${pct(at[3])}`);
console.log(`  cancels if >=4 conditions:        ${pct(at[4])}`);
console.log(`\n  with the two rival glosses of ONE verse merged (per the provenance file):`);
console.log(`    >=1: ${pct(dedupAt1)}    >=2: ${pct(dedupAt2)}`);
