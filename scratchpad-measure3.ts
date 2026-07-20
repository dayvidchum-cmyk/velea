import { labelWithCancellation, planetDignity, CANCELLED_ACTIVE_LABEL, CANCELLED_LATENT_LABEL } from "./server/vedic/dignity.js";
const GRAHAS = ["Sun","Moon","Mars","Mercury","Jupiter","Venus","Saturn"] as any[];
const ALL = [...GRAHAS, "Rahu", "Ketu"];
const DEBIL: Record<string, number> = { Sun:190, Moon:213, Mars:118, Mercury:345, Jupiter:275, Venus:177, Saturn:20 };
let seed = 777;
const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;

let total=0, active=0, latent=0, plain=0;
for (let t=0;t<40000;t++){
  const p = GRAHAS[Math.floor(rnd()*7)];
  const lonBy: any = {};
  for (const g of GRAHAS) lonBy[g] = rnd()*360;
  lonBy[p] = DEBIL[p] + (rnd()*2-1);
  if (planetDignity(p, lonBy[p]) !== "debilitated") continue;
  // a realistic running stack: maha/antar/pratyantar drawn from all 9 dasha lords
  const lords = [ALL[Math.floor(rnd()*9)], ALL[Math.floor(rnd()*9)], ALL[Math.floor(rnd()*9)]];
  const r = labelWithCancellation(p, "Debilitated", lonBy, rnd()*360, lords);
  total++;
  if (r.label === CANCELLED_ACTIVE_LABEL) active++;
  else if (r.label === CANCELLED_LATENT_LABEL) latent++;
  else plain++;
}
const pct=(n:number)=>((n/total)*100).toFixed(1).padStart(5)+"%";
console.log(`debilitated planets sampled: ${total}`);
console.log(`  reads "acting as exalted": ${pct(active)}   <-- the fall is TREATED AS A STRENGTH`);
console.log(`  reads "cancelled - latent": ${pct(latent)}`);
console.log(`  reads plain "Debilitated":  ${pct(plain)}   <-- the fall is read as a fall`);
