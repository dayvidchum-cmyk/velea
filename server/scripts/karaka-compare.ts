/** One-shot comparison of the two cited karaka tables. Run: npx tsx server/scripts/karaka-compare.ts */
import { LIFE_AREAS } from "../vedic/life-areas.js";
import { readFileSync } from "node:fs";
const C = JSON.parse(readFileSync(new URL("../vedic/canon/karakas.json", import.meta.url), "utf8"));
const T = C.houseKarakaTable as Record<string, string[]>;
console.log("area      hs | VolII primary   | VolII all               | VolI Ch.7          | prim any");
for (const k of Object.keys(LIFE_AREAS) as (keyof typeof LIFE_AREAS)[]) {
  const a = LIFE_AREAS[k]; const h = String(a.primaryHouse);
  const prim = a.karakas.filter((x) => x.role === "primary").map((x) => x.planet);
  const all = a.karakas.map((x) => x.planet); const canon = T[h] ?? [];
  const pOK = prim.some((p) => canon.includes(p)); const aOK = all.some((p) => canon.includes(p));
  console.log(`${k.padEnd(9)} ${h.padStart(2)} | ${prim.join(",").padEnd(15)} | ${all.join(",").padEnd(23)} | ${canon.join(",").padEnd(18)} | ${pOK ? "Y" : "n"}    ${aOK ? "Y" : "n"}`);
}
