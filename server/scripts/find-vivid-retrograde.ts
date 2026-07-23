/**
 * FIND-VIVID-RETROGRADE — scans forward for the dates where an OUTER planet (Venus/Mars/Jupiter/
 * Saturn) sits in a dramatic retrograde phase, so the wired transit read (states doctrine #2) has a
 * loud showcase. Calls the SAME planetRxState the input-builder calls, so a hit here proves the
 * payload field populates. Stationing days (the most charged pivot) are starred. Throwaway tooling.
 *
 *   npx tsx server/scripts/find-vivid-retrograde.ts 2026-07-23 200
 */
import { planetRxState, type RxPlanet } from "../sky/retrograde-phase.js";

const start = process.argv[2] ?? "2026-07-23";
const days = Number(process.argv[3] ?? 200);
const OUTER: RxPlanet[] = ["venus", "mars", "jupiter", "saturn"];
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const addDays = (iso: string, n: number) => {
  const d = new Date(iso + "T00:00:00Z"); d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

async function main() {
  console.log(`\n  Scanning ${days} days from ${start} for outer-planet retrograde phases (noon UTC)\n`);
  const stationDays: string[] = [];
  const seenPhase = new Set<string>();
  for (let i = 0; i < days; i++) {
    const date = addDays(start, i);
    for (const p of OUTER) {
      const rx = await planetRxState(p, date);
      if (rx.phase === "direct") continue;
      seenPhase.add(rx.phase);
      const star = rx.phase === "stationing" ? " ★ STATIONING (most charged)" : "";
      if (rx.phase === "stationing") stationDays.push(`${date}  ${cap(p)}`);
      // Print the phase transitions and every stationing day; skip mid-run repeats to stay readable.
      const key = `${p}:${rx.phase}`;
      if (rx.phase === "stationing" || !seenPhase.has(key)) {
        seenPhase.add(key);
        console.log(`  ${date}  ${cap(p).padEnd(8)} ${rx.phase.padEnd(11)} strength ${rx.strength.toFixed(2)}${star}`);
      }
    }
  }
  console.log(`\n  Phases seen: ${[...seenPhase].filter((k) => !k.includes(":")).join(", ") || "none"}`);
  console.log(`  Stationing (showcase) days:\n${stationDays.map((s) => "    " + s).join("\n") || "    none in window"}\n`);
}
main().catch((e) => { console.error(e); process.exit(1); });
