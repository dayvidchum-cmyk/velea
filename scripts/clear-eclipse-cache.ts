/**
 * CLEAR ECLIPSE-SEASON CACHE — one user, one surface. Deletes the cached `eclipse_season`
 * narrative rows for a user's profiles so the next tap into the eclipse reading REGENERATES
 * a fresh one (under whatever prompt + SURFACE_VERSION is currently DEPLOYED — not any
 * uncommitted local rework).
 *
 * SAFE BY DEFAULT: with no --confirm it only LISTS what it would delete and writes nothing.
 * Pinned (locked) rows are never touched — a pin means the words stop moving.
 *
 * The URL stays in YOUR terminal (migration law):
 *   DATABASE_URL='<railway url>' npx tsx scripts/clear-eclipse-cache.ts dayvidchum@gmail.com
 *   DATABASE_URL='<railway url>' npx tsx scripts/clear-eclipse-cache.ts dayvidchum@gmail.com --confirm
 */
import { inArray, eq, and } from "drizzle-orm";
import { getDb, getUserByEmail } from "../server/db.js";
import { profiles, narrativeCache } from "../drizzle/schema.js";

const SURFACE = "eclipse_season";
const email = process.argv[2] ?? "dayvidchum@gmail.com";
const confirm = process.argv.includes("--confirm");

async function main() {
  const db = await getDb();
  if (!db) { console.error("No DB (DATABASE_URL unset?)."); process.exit(1); }
  const user = await getUserByEmail(email);
  if (!user) { console.error(`No user ${email}.`); process.exit(1); }
  const myProfiles = await db.select().from(profiles).where(eq(profiles.userId, user.id));
  if (!myProfiles.length) { console.error("No profiles for user."); process.exit(1); }
  const byId = new Map(myProfiles.map((p) => [p.id, p.name ?? `#${p.id}`]));
  const ids = myProfiles.map((p) => p.id);

  const rows = await db.select().from(narrativeCache).where(and(
    inArray(narrativeCache.profileId, ids),
    eq(narrativeCache.surface, SURFACE),
  ));

  if (!rows.length) {
    console.log(`\nNo ${SURFACE} rows cached for ${email}. Nothing to clear — the next tap already regenerates.`);
    process.exit(0);
  }

  console.log(`\n${rows.length} ${SURFACE} row(s) for ${email}:\n${"=".repeat(70)}`);
  for (const r of rows as any[]) {
    const pin = r.locked ? "  🔒 PINNED (will be SKIPPED)" : "";
    console.log(`  ${byId.get(r.profileId)}  ·  key=${r.cacheDate}  ·  hash=${String(r.inputHash).slice(0, 12)}  ·  ${new Date(r.generatedAt).toISOString().slice(0, 16)}${pin}`);
  }

  const deletable = (rows as any[]).filter((r) => !r.locked);
  const pinned = rows.length - deletable.length;

  if (!confirm) {
    console.log(`\n${"=".repeat(70)}`);
    console.log(`DRY RUN — nothing deleted. Would clear ${deletable.length} row(s)${pinned ? `, skip ${pinned} pinned` : ""}.`);
    console.log(`Re-run with --confirm to actually clear, then open the eclipse reading in the app.`);
    process.exit(0);
  }

  let cleared = 0;
  for (const r of deletable) {
    await db.delete(narrativeCache).where(and(
      eq(narrativeCache.profileId, r.profileId),
      eq(narrativeCache.surface, SURFACE),
      eq(narrativeCache.cacheDate, r.cacheDate),
    ));
    cleared++;
  }
  console.log(`\n${"=".repeat(70)}`);
  console.log(`Cleared ${cleared} ${SURFACE} row(s)${pinned ? `, skipped ${pinned} pinned` : ""}.`);
  console.log(`Open the eclipse reading in the app — it will regenerate fresh under the DEPLOYED prompt.`);
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
