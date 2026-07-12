/** One-off: delete the two frozen 2026-08-12 life-area snapshots (career + money) so they can be
 *  re-revealed under the new eclipse-phase prompt. Scoped tightly — leaves every other row alone. */
import { sql } from "drizzle-orm";
import { getDb } from "../db.js";

async function main() {
  const db = await getDb();
  if (!db) { console.error("No DB."); process.exit(1); }
  const res: any = await db.execute(sql`
    DELETE FROM horoscopes
    WHERE profileId = 30001 AND readingDate = '2026-08-12' AND lifeArea IN ('career', 'money')
  `);
  const affected = res?.[0]?.affectedRows ?? res?.affectedRows ?? "?";
  console.log(`🗑️  deleted rows: ${affected}`);
  const rows: any = await db.execute(sql`SELECT readingDate, lifeArea, createdAt FROM horoscopes WHERE profileId = 30001 ORDER BY createdAt DESC`);
  const list = Array.isArray(rows?.[0]) ? rows[0] : rows;
  console.log(`remaining for profile 30001: ${list.length}`);
  console.table(list);
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
