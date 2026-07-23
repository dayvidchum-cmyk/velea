/**
 * RECOVERY-SCAN — the tuning surface for the neecha-bhanga recovery continuum (David 2026-07-23).
 *
 * Prints where every combination of (structural rescue × rescuer × functional strength × importance)
 * lands on the continuum — strong-friction → partial → substantial → operational → exceptional — so
 * David can SEE the curve and move the weights (RECOVERY in server/vedic/dignity.ts) by looking,
 * exactly like the crown/mode calibration. No DB, no chart: run it, read the landscape, tune, re-run.
 *
 *   npx tsx server/scripts/recovery-scan.ts
 */
import { gradeRecovery, type RecoveryImpairments } from "../vedic/dignity.js";

const BANDS = ["strong-friction", "partial", "substantial", "operational", "exceptional"] as const;
const pad = (s: string, n: number) => (s + " ".repeat(n)).slice(0, n);

const scen: { label: string; count: number; solid: boolean; rescuer?: "dignified" | "fallen" | null; impair?: RecoveryImpairments }[] = [
  { label: "bare cancel (2)",            count: 2, solid: false },
  { label: "solid cancel (3)",           count: 3, solid: true },
  { label: "strong cancel (4)",          count: 4, solid: true },
  { label: "solid, dignified rescuer",   count: 3, solid: true, rescuer: "dignified" },
  { label: "solid, fallen rescuer",      count: 3, solid: true, rescuer: "fallen" },
  { label: "strong (4), dignified",      count: 4, solid: true, rescuer: "dignified" },
];
const funcs: { label: string; impair: RecoveryImpairments }[] = [
  { label: "no data",  impair: {} },
  { label: "backed",   impair: { shadbalaRatio: 1.30 } },
  { label: "thin",     impair: { shadbalaRatio: 0.70 } },
  { label: "combust",  impair: { combust: true } },
];

console.log("\n  THE RECOVERY CONTINUUM — first curve (tune RECOVERY in dignity.ts, re-run)\n");
console.log("  " + pad("scenario", 26) + funcs.map((f) => pad(f.label + " (imp/¬imp)", 22)).join(""));
console.log("  " + "-".repeat(26 + funcs.length * 22));

for (const s of scen) {
  let row = "  " + pad(s.label, 26);
  for (const f of funcs) {
    const imp = gradeRecovery({ count: s.count, solid: s.solid, rescuerDignity: s.rescuer ?? null, important: true, impair: f.impair });
    const noi = gradeRecovery({ count: s.count, solid: s.solid, rescuerDignity: s.rescuer ?? null, important: false, impair: f.impair });
    const cell = `${bandAbbr(imp.band)}${imp.isNBRY ? "*" : ""}/${bandAbbr(noi.band)}`;
    row += pad(`${cell}  (${imp.confidence.toFixed(2)})`, 22);
  }
  console.log(row);
}

console.log("\n  legend: SF=strong-friction  Pa=partial  Su=substantial  Op=operational  Ex=exceptional(NBRY, *)");
console.log("          imp = rules an angle/trine (raja-yoga eligible) · ¬imp = does not · (n) = confidence 0..1");
console.log("\n  DAVID'S MOON (Scorpio, cancelled by 2 — Mars in the 1st + Venus in a kendra):");
for (const [lab, impair] of [["structural only", {}], ["if strongly backed", { shadbalaRatio: 1.3 }], ["if thin", { shadbalaRatio: 0.7 }]] as const) {
  const r = gradeRecovery({ count: 2, solid: false, rescuerDignity: null, important: false, impair });
  console.log(`    ${pad(lab, 20)} → ${pad(r.band, 16)} (confidence ${r.confidence.toFixed(2)})  [${r.factors.join("; ")}]`);
}
console.log("");

function bandAbbr(b: string): string {
  return { "strong-friction": "SF", partial: "Pa", substantial: "Su", operational: "Op", exceptional: "Ex" }[b] ?? b;
}
void BANDS;
