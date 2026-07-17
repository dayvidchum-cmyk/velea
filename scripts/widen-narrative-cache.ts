/**
 * THE OUTAGE FIX (2026-07-17): narrative_cache.cacheDate was VARCHAR(10) — sized for
 * YYYY-MM-DD when the cache held only day readings. Every newer surface keys by a longer
 * slug ("atlas-wealth", "yoga-<name>", "atlas-w-wealth-2058-04-15") and strict MySQL
 * rejected the write — the already-generated reading was thrown away with it, so every
 * tap regenerated (and re-billed) and every new surface rendered quiet.
 *
 * Widens cacheDate 10→64 and surface 16→24. MODIFY only — no data touched, no drops,
 * the (profileId, surface, cacheDate) unique key survives. Idempotent: re-running when
 * already widened is a no-op. Per the no-auto-force-migrate law, run by David's hand:
 *
 *   DATABASE_URL='<railway url>' npx tsx scripts/widen-narrative-cache.ts
 */
import { sql } from "drizzle-orm";
import { getDb } from "../server/db.js";

async function main() {
  const db = await getDb();
  if (!db) { console.error("No DB (DATABASE_URL unset?). Aborting."); process.exit(1); }

  const [cols] = await db.execute(sql`
    SELECT COLUMN_NAME, CHARACTER_MAXIMUM_LENGTH FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'narrative_cache'
      AND COLUMN_NAME IN ('cacheDate', 'surface')
  `);
  for (const c of cols as any[]) {
    console.log(`before: ${c.COLUMN_NAME} VARCHAR(${c.CHARACTER_MAXIMUM_LENGTH})`);
  }

  await db.execute(sql`ALTER TABLE narrative_cache MODIFY surface VARCHAR(24) NOT NULL`);
  console.log("✅ surface → VARCHAR(24)");
  await db.execute(sql`ALTER TABLE narrative_cache MODIFY cacheDate VARCHAR(64) NOT NULL`);
  console.log("✅ cacheDate → VARCHAR(64)");

  console.log("\nDone. Open a yoga or Atlas reading — it should load AND stay cached (second open is instant).");
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
