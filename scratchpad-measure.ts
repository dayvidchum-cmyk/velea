import { neechaBhanga, planetDignity } from "./server/vedic/dignity.js";

const GRAHAS = ["Sun","Moon","Mars","Mercury","Jupiter","Venus","Saturn"] as any[];
// Debilitation degree for each planet (deep point) — put the planet exactly there.
const DEBIL: Record<string, number> = {
  Sun: 190, Moon: 213, Mars: 118, Mercury: 345, Jupiter: 275, Venus: 177, Saturn: 20,
};

let total = 0, wasCancelled = 0, nowCancelled = 0, flipped = 0;
let countUp = 0;

// Deterministic sweep: for each debilitated planet, every lagna sign x every Moon sign,
// with the other planets spread on a fixed lattice so the OTHER conditions vary too.
for (const p of GRAHAS) {
  for (let lag = 0; lag < 12; lag++) {
    for (let moonSign = 0; moonSign < 12; moonSign++) {
      for (let spread = 0; spread < 12; spread++) {
        const lonBy: any = {};
        GRAHAS.forEach((g, i) => { lonBy[g] = ((i * 37 + spread * 30) % 360) + 15; });
        lonBy[p] = DEBIL[p];
        lonBy.Moon = moonSign * 30 + 15;
        if (p === "Moon") lonBy.Moon = DEBIL.Moon;
        lonBy.Rahu = 0; lonBy.Ketu = 180;
        if (planetDignity(p, lonBy[p]) !== "debilitated") continue;
        const lagnaLon = lag * 30 + 15;
        const nb = neechaBhanga(p, lonBy, lagnaLon);
        const others = nb.reasons.filter(r => !r.includes("itself in a kendra"));
        const self = nb.reasons.length !== others.length;
        total++;
        if (others.length > 0) wasCancelled++;
        if (nb.cancelled) nowCancelled++;
        if (others.length === 0 && self) flipped++;
        if (others.length > 0 && self) countUp++;
      }
    }
  }
}
const pct = (n: number) => ((n / total) * 100).toFixed(1) + "%";
console.log(`charts tested:            ${total}`);
console.log(`cancelled BEFORE rule 7:  ${wasCancelled}  (${pct(wasCancelled)})`);
console.log(`cancelled AFTER rule 7:   ${nowCancelled}  (${pct(nowCancelled)})`);
console.log(`NEWLY cancelled (flip):   ${flipped}  (${pct(flipped)})   <-- charts whose verdict CHANGES`);
console.log(`already cancelled, count+1: ${countUp}  (${pct(countUp)})  <-- 'solid' threshold inflation`);
