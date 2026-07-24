/**
 * DUMP DASHA — read-only. Prints a profile's ANTARDASHA (level-2) timeline straight from the stored
 * Vimshottari tree (profileDashaPeriods), with exact start/end dates. Highlights the CURRENT antardasha
 * and any antar → antar transition you ask about. No recompute, no LLM — just the engine's stored dates.
 *
 * The URL stays in YOUR terminal:
 *   DATABASE_URL='<railway url>' npx tsx scripts/dump-dasha.ts dayvidchum@gmail.com
 */
import { eq, and, asc } from "drizzle-orm";
import { getDb, getUserByEmail } from "../server/db.js";
import { profiles, profileDashaPeriods } from "../drizzle/schema.js";

const email = process.argv[2] ?? "dayvidchum@gmail.com";
const d = (v: any) => (v ? new Date(v).toISOString().slice(0, 10) : "?");
const now = Date.parse("2026-07-24T12:00:00Z");

async function main() {
  const db = await getDb();
  if (!db) { console.error("No DB (DATABASE_URL unset?)."); process.exit(1); }
  const user = await getUserByEmail(email);
  if (!user) { console.error(`No user ${email}.`); process.exit(1); }
  const myProfiles = await db.select().from(profiles).where(eq(profiles.userId, user.id));
  if (!myProfiles.length) { console.error("No profiles for user."); process.exit(1); }

  for (const p of myProfiles as any[]) {
    const rows = await db.select().from(profileDashaPeriods)
      .where(and(eq(profileDashaPeriods.profileId, p.id), eq(profileDashaPeriods.level, 2)))
      .orderBy(asc(profileDashaPeriods.startAt)) as any[];

    console.log(`\n${"=".repeat(64)}\n${p.name ?? "#" + p.id}  ·  ${p.birthDate ?? "?"} ${p.birthTime ?? ""}  ·  ${rows.length} antardashas stored`);
    console.log("=".repeat(64));

    let prev: any = null;
    for (const r of rows) {
      const startMs = Date.parse(r.startAt);
      const endMs = Date.parse(r.endAt);
      const current = startMs <= now && now < endMs;
      const jupToSat = prev && prev.maha === r.maha && prev.antar === "Jupiter" && r.antar === "Saturn";
      const tag = current ? "   ← CURRENT (24 Jul 2026)" : "";
      const arrow = jupToSat ? "  ◀── Jupiter → Saturn transition" : "";
      console.log(`  ${r.maha}-${r.antar}   ${d(r.startAt)} → ${d(r.endAt)}${tag}${arrow}`);
      prev = r;
    }

    // Direct answer: every Moon-maha Jupiter→Saturn boundary.
    const js = rows.filter((r, i) => i > 0 && rows[i - 1].maha === r.maha && rows[i - 1].antar === "Jupiter" && r.antar === "Saturn");
    console.log(`\n  → ${r_join(js)}`);
  }
  process.exit(0);
}
function r_join(js: any[]): string {
  if (!js.length) return "No Jupiter→Saturn antardasha transition found in the stored tree.";
  return js.map((r) => `${r.maha}-antardasha went Jupiter → Saturn on ${d(r.startAt)} (Saturn runs to ${d(r.endAt)}).`).join("\n  → ");
}
main().catch((e) => { console.error(e); process.exit(1); });
