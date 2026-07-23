/**
 * DUMP READINGS — read-only. Prints the latest CACHED reading for each narrative surface
 * (month, combined, deep/varshaphala, house, chapter, mercury_rx, eclipse_season, life_area,
 * yoga, atlas/window, cast, glance, verdict…) for a user's profiles. No writes, no LLM calls,
 * no cache touches — just SELECTs whatever DATABASE_URL points at and prints the prose so we
 * can read the non-day surfaces the way we read the day card.
 *
 * The URL stays in YOUR terminal (migration law):
 *   DATABASE_URL='<railway url>' npx tsx scripts/dump-readings.ts dayvidchum@gmail.com
 *
 * Optional 2nd arg: a surface filter (e.g. "month" or "combined") to print only that one.
 */
import { inArray, eq } from "drizzle-orm";
import { getDb, getUserByEmail } from "../server/db.js";
import { profiles, narrativeCache } from "../drizzle/schema.js";

const email = process.argv[2] ?? "dayvidchum@gmail.com";
const only = process.argv[3]?.toLowerCase();

// The prose fields worth reading, in the order a reader meets them, across surface shapes.
const PROSE_KEYS = [
  "headline", "title", "scene", "narrative", "story", "tilt", "closeLine", "close", "question",
  "synthesis", "why", "coreTheme", "whyNow", "arc", "opening", "body", "summary", "text",
];

function printContent(raw: string) {
  let parsed: any;
  try { parsed = JSON.parse(raw); } catch { console.log("  " + raw.replace(/\n/g, "\n  ")); return; }
  if (typeof parsed === "string") { console.log("  " + parsed.replace(/\n/g, "\n  ")); return; }
  const seen = new Set<string>();
  const emit = (label: string, val: any) => {
    if (val == null) return;
    if (typeof val === "string") { console.log(`  [${label}] ${val.replace(/\n/g, "\n    ")}`); }
    else if (typeof val === "object") {
      for (const k of PROSE_KEYS) if (val[k] != null && typeof val[k] === "string") console.log(`  [${label}.${k}] ${String(val[k]).replace(/\n/g, "\n    ")}`);
    }
  };
  for (const k of PROSE_KEYS) { if (parsed[k] != null) { emit(k, parsed[k]); seen.add(k); } }
  // Sections (deep/chapter/combined store nested {synthesis, why} blocks) not caught above.
  for (const [k, v] of Object.entries(parsed)) {
    if (seen.has(k) || v == null) continue;
    if (typeof v === "object" && !Array.isArray(v)) emit(k, v);
    else if (Array.isArray(v) && v.every((x) => x && typeof x === "object")) v.forEach((x, i) => emit(`${k}[${i}]`, x));
  }
}

async function main() {
  const db = await getDb();
  if (!db) { console.error("No DB (DATABASE_URL unset?)."); process.exit(1); }
  const user = await getUserByEmail(email);
  if (!user) { console.error(`No user ${email}.`); process.exit(1); }
  const myProfiles = await db.select().from(profiles).where(eq(profiles.userId, user.id));
  if (!myProfiles.length) { console.error("No profiles for user."); process.exit(1); }
  const byId = new Map(myProfiles.map((p) => [p.id, p.name ?? `#${p.id}`]));
  const rows = await db.select().from(narrativeCache).where(inArray(narrativeCache.profileId, myProfiles.map((p) => p.id)));

  // Latest row per (profile, surface).
  const latest = new Map<string, typeof rows[number]>();
  for (const r of rows) {
    if (only && !r.surface.toLowerCase().includes(only)) continue;
    const key = `${r.profileId}|${r.surface}`;
    const cur = latest.get(key);
    if (!cur || +new Date(r.generatedAt) > +new Date(cur.generatedAt)) latest.set(key, r);
  }

  const sorted = [...latest.values()].sort((a, b) => a.surface.localeCompare(b.surface) || a.profileId - b.profileId);
  console.log(`\n${sorted.length} cached readings for ${email} (${myProfiles.length} profile(s))\n${"=".repeat(70)}`);
  for (const r of sorted) {
    console.log(`\n### ${r.surface}  ·  ${byId.get(r.profileId)}  ·  key=${r.cacheDate}  ·  ${new Date(r.generatedAt).toISOString().slice(0, 16)}  ·  ${r.model}`);
    printContent(r.content);
  }
  console.log(`\n${"=".repeat(70)}\nSurfaces present: ${[...new Set(sorted.map((r) => r.surface))].join(", ")}`);
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
