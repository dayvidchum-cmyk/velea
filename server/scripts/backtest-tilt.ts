/**
 * BACKTEST — the day-frame TILT against real logged check-ins (cold hard data).
 *
 * The method claims a day leans supported / mixed / strained toward a person (Tārabala ∧ Chandrabala).
 * Check-ins are ground truth: how the day ACTUALLY went (5 dims, 1–5). If the method tracks reality,
 * `supported` days should score higher than `strained`. If the buckets are flat, the tilt is wrong.
 *
 * MUST run against PROD data (local .env DB is stale/empty). On Railway:
 *     railway run npx tsx server/scripts/backtest-tilt.ts [userId]
 * Optional [userId] restricts to one account (e.g. just yours). No arg = every check-in.
 */
import { getDb } from "../db.js";
import { checkIns, profiles, profileNatalBodies } from "../../drizzle/schema.js";
import { eq } from "drizzle-orm";
import { calculateBirthChart } from "../birthchart/calculator.js";
import { tarabala, chandrabala } from "../panchang/crown.js";
import { NAK27 } from "@shared/nakshatra-names";

const ZOD = ["Aries","Taurus","Gemini","Cancer","Leo","Virgo","Libra","Scorpio","Sagittarius","Capricorn","Aquarius","Pisces"];
const norm = (x: number) => ((x % 360) + 360) % 360;
const signIdx = (lon: number) => Math.floor(norm(lon) / 30);
const nakIdx  = (lon: number) => Math.floor(norm(lon) / (360 / 27));

async function main() {
  const onlyUser = process.argv[2] ? parseInt(process.argv[2], 10) : null;
  const db = await getDb();
  if (!db) { console.error("no DB — run with `railway run` against prod"); process.exit(1); }

  let rows = await db.select().from(checkIns);
  if (onlyUser != null) rows = rows.filter((r) => r.userId === onlyUser);
  const profs = await db.select().from(profiles);
  const ownByUser = new Map<number, number>();
  for (const p of profs) if (!ownByUser.has(p.userId)) ownByUser.set(p.userId, p.id); // null profileId → user's own
  const moons = await db.select().from(profileNatalBodies).where(eq(profileNatalBodies.planet, "Moon"));
  const moonByProfile = new Map(moons.map((m) => [m.profileId, m]));

  const dayMoonCache = new Map<string, { s: number; n: number }>();
  async function dayMoon(date: string) {
    if (dayMoonCache.has(date)) return dayMoonCache.get(date)!;
    const ch: any = await calculateBirthChart(date, "12:00", 0, 0, "UTC");
    const v = { s: signIdx(ch.moon.longitude), n: nakIdx(ch.moon.longitude) };
    dayMoonCache.set(date, v); return v;
  }

  const buckets: Record<string, Array<{ score: number; motivation: number }>> = { supported: [], mixed: [], strained: [] };
  let skipped = 0;
  for (const r of rows) {
    const pid = r.profileId ?? ownByUser.get(r.userId);
    const moon = pid != null ? moonByProfile.get(pid) : null;
    const birthNak = moon?.nakshatra ? NAK27.findIndex((n) => n.toLowerCase() === moon!.nakshatra!.toLowerCase()) : -1;
    const natalMoonSign = moon?.sign ? ZOD.indexOf(moon.sign) : -1;
    if (birthNak < 0 || natalMoonSign < 0) { skipped++; continue; }
    const date = new Date(r.recordedAt as any).toISOString().slice(0, 10); // UTC date (approx; tz not modelled)
    const dm = await dayMoon(date);
    const tb = tarabala(birthNak, dm.n);
    const cb = chandrabala(natalMoonSign, dm.s);
    const tilt = tb.favorable && cb.favorable ? "supported" : (tb.quality === "bad" || cb.quality === "bad") ? "strained" : "mixed";
    const score = (r.physicalEnergy + r.mentalClarity + r.emotionalStability + r.creativeFlow + r.motivation) / 5;
    buckets[tilt].push({ score, motivation: r.motivation });
  }

  const stat = (arr: Array<{ score: number; motivation: number }>) => {
    const n = arr.length; if (!n) return { n: 0, mean: NaN, motiv: NaN, sd: NaN };
    const mean = arr.reduce((a, b) => a + b.score, 0) / n;
    const motiv = arr.reduce((a, b) => a + b.motivation, 0) / n;
    const sd = Math.sqrt(arr.reduce((a, b) => a + (b.score - mean) ** 2, 0) / n);
    return { n, mean, motiv, sd };
  };

  console.log(`\nBACKTEST — day-frame TILT vs check-in reality${onlyUser != null ? ` (user ${onlyUser})` : ""}`);
  console.log(`check-ins: ${rows.length} · usable: ${rows.length - skipped} · skipped: ${skipped} (no natal Moon / unresolved profile)\n`);
  console.log(`${"tilt".padEnd(11)}${"n".padEnd(7)}${"mean score".padEnd(13)}${"± sd".padEnd(9)}avg motivation`);
  console.log("─".repeat(52));
  for (const k of ["supported", "mixed", "strained"]) {
    const s = stat(buckets[k]);
    console.log(s.n ? `${k.padEnd(11)}${String(s.n).padEnd(7)}${s.mean.toFixed(2).padEnd(13)}${("±" + s.sd.toFixed(2)).padEnd(9)}${s.motiv.toFixed(2)}` : `${k.padEnd(11)}(none)`);
  }
  const S = stat(buckets.supported), X = stat(buckets.strained);
  console.log("─".repeat(52));
  if (S.n && X.n) {
    const delta = S.mean - X.mean;
    console.log(`\nEFFECT  supported − strained = ${delta >= 0 ? "+" : ""}${delta.toFixed(2)}  (out of 5)`);
    console.log(delta > 0.3 ? "→ the tilt TRACKS reality: supported days score meaningfully higher. The method holds."
      : delta > 0.05 ? "→ weak positive signal. Real but small — worth refining, not rebuilding."
      : delta > -0.05 ? "→ FLAT. The tilt does not predict how days go. It needs fixing (or it isn't a mood signal)."
      : "→ INVERTED. Supported days score LOWER — the method is backwards. Fix required.");
    console.log(`\n(n per bucket matters — a delta on <20 samples is noise. Get more check-ins before trusting a small n.)`);
  } else {
    console.log("\nNot enough data in both buckets yet — need more check-ins across supported AND strained days.");
  }
}
main().catch((e) => { console.error(e); process.exit(1); });
