import { neechaBhanga, planetDignity } from "./server/vedic/dignity.js";
const GRAHAS = ["Sun","Moon","Mars","Mercury","Jupiter","Venus","Saturn"] as any[];
const DEBIL: Record<string, number> = { Sun:190, Moon:213, Mars:118, Mercury:345, Jupiter:275, Venus:177, Saturn:20 };

// CONTROL: a realistic-ish random chart generator, seeded deterministically (LCG), where planets
// sit at genuinely arbitrary longitudes rather than on my lattice. If the lattice was an artefact,
// these numbers will disagree.
let seed = 12345;
const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;

const tally: Record<string, number> = {};
let total = 0, cancelled = 0, solid = 0;
const dist: Record<number, number> = {};

for (let trial = 0; trial < 40000; trial++) {
  const p = GRAHAS[Math.floor(rnd() * 7)];
  const lonBy: any = {};
  for (const g of GRAHAS) lonBy[g] = rnd() * 360;
  lonBy[p] = DEBIL[p] + (rnd() * 2 - 1);
  if (planetDignity(p, lonBy[p]) !== "debilitated") continue;
  const nb = neechaBhanga(p, lonBy, rnd() * 360);
  total++;
  if (nb.cancelled) cancelled++;
  if (nb.count >= 2) solid++;
  dist[nb.count] = (dist[nb.count] ?? 0) + 1;
  for (const r of nb.reasons) {
    const k = r.includes("itself in a kendra") ? "7 planet itself in kendra"
      : r.includes("dispositor") && r.includes("in a kendra") ? "1 dispositor in kendra"
      : r.includes("exalts in") ? "2 exalter in kendra"
      : r.includes("lord of") ? "3 exalt-lord in kendra"
      : r.includes("aspected by") ? "4 aspected by dispositor"
      : r.includes("conjunct") ? "5 conjunct dispositor"
      : r.includes("parivartana") ? "6 parivartana" : "?";
    tally[k] = (tally[k] ?? 0) + 1;
  }
}
const pct = (n: number) => ((n/total)*100).toFixed(1).padStart(5) + "%";
console.log(`RANDOM CONTROL — debilitated charts: ${total}`);
console.log(`  cancelled at all: ${pct(cancelled)}`);
console.log(`  "solid" (count>=2): ${pct(solid)}`);
console.log("\n  per-condition firing rate:");
for (const k of Object.keys(tally).sort()) console.log(`    ${k.padEnd(28)} ${pct(tally[k])}`);
console.log("\n  how many conditions fire at once:");
for (const k of Object.keys(dist).sort()) console.log(`    ${k} condition(s): ${pct(dist[+k])}`);
