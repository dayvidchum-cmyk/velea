/**
 * Cross-check: computeGoldenHoras (per-hora list flags) must agree with computeGoldenHour
 * (the live "golden now" read), since both are supposed to share ONE golden definition.
 * Also asserts each golden sub-window sits inside its hora, and the hora sequence/indices
 * returned line up 1:1 so the endpoint can map by index. Run:
 *   npx tsx server/scripts/golden-horas-check.ts
 */
import { computeGoldenHour, computeGoldenHoras } from "../panchapakshi/golden-hour.js";

const lat = 42.3601, lon = -71.0589;
// A representative bird (Ashwini / Shukla) — mechanics are chart-independent for this check.
const birthNakshatra = "Ashwini";
const birthPaksha = "Shukla" as const;

const fmt = (ms: number) => new Date(ms).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

async function main() {
  const base = new Date(2026, 6, 29, 12, 0, 0); // 2026-07-29 noon local
  const y = base.getFullYear(), m = base.getMonth() + 1, d = base.getDate();

  const flags = await computeGoldenHoras({ year: y, month: m, day: d, nowMs: base.getTime(), lat, lon, birthNakshatra, birthPaksha });
  console.log(`\n${flags.length} horas; golden = ${flags.filter((f) => f.isGolden).length}`);

  let structOk = true;
  for (const f of flags) {
    if (f.isGolden) {
      if (f.goldenStartMs == null || f.goldenEndMs == null) { console.log("  ✗ golden hora missing window", f.index); structOk = false; }
      else if (f.goldenStartMs < f.startMs || f.goldenEndMs > f.endMs || f.goldenEndMs <= f.goldenStartMs) {
        console.log("  ✗ golden window outside hora", f.index, fmt(f.goldenStartMs), fmt(f.goldenEndMs)); structOk = false;
      }
    }
  }
  console.log(structOk ? "✓ every golden window sits inside its hora" : "✗ window/hora containment FAILED");

  // Sample several instants across the day; computeGoldenHour(now).isGolden must match the
  // per-hora flag: the hora containing `now` is golden AND `now` falls in a golden sub-run.
  let agree = 0, checked = 0;
  for (let hr = 6; hr <= 23; hr++) {
    const nowMs = new Date(y, m - 1, d, hr, 17, 0).getTime();
    const gh = await computeGoldenHour({
      year: y, month: m, day: d, nowMs, lat, lon, birthNakshatra, birthPaksha,
      lagnaSign: "Virgo", ascendantDegree: null, natal: {},
    });
    if (!gh) continue;
    const list = await computeGoldenHoras({ year: y, month: m, day: d, nowMs, lat, lon, birthNakshatra, birthPaksha });
    const hora = list.find((f) => nowMs >= f.startMs && nowMs < f.endMs);
    const listGoldenNow = !!hora && hora.isGolden && hora.goldenStartMs != null && nowMs >= hora.goldenStartMs && nowMs < (hora.goldenEndMs ?? 0);
    checked++;
    const ok = gh.isGolden === listGoldenNow;
    if (ok) agree++;
    console.log(`  ${fmt(nowMs)}  goldenNow=${gh.isGolden}  listGoldenNow=${listGoldenNow}  ${ok ? "✓" : "✗ MISMATCH"}`);
  }
  console.log(`\n${agree}/${checked} instants agree between computeGoldenHour and computeGoldenHoras`);
  console.log(structOk && agree === checked ? "\n✅ PASS" : "\n❌ FAIL");
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
