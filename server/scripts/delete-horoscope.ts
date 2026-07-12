/** Delete one horoscope snapshot: profile + date + area from argv.
 *   DATABASE_URL='mysql://…' npx tsx server/scripts/delete-horoscope.ts <profileId> <YYYY-MM-DD> <lifeArea>
 * Scoped to the exact row; prints how many it removed and what remains for that profile. */
import { sql } from "drizzle-orm";
import { getDb } from "../db.js";

async function main() {
  const [profileId, date, area] = process.argv.slice(2);
  if (!profileId || !date || !area) { console.error("usage: <profileId> <YYYY-MM-DD> <lifeArea>"); process.exit(1); }
  const db = await getDb();
  if (!db) { console.error("No DB."); process.exit(1); }
  const res: any = await db.execute(sql`DELETE FROM horoscopes WHERE profileId = ${Number(profileId)} AND readingDate = ${date} AND lifeArea = ${area}`);
  console.log(`🗑️  deleted rows: ${res?.[0]?.affectedRows ?? res?.affectedRows ?? "?"}  (${date} · ${area})`);
  const rows: any = await db.execute(sql`SELECT readingDate, lifeArea FROM horoscopes WHERE profileId = ${Number(profileId)} ORDER BY createdAt DESC`);
  const list = Array.isArray(rows?.[0]) ? rows[0] : rows;
  console.log(`remaining for profile ${profileId}: ${list.length}`);
  console.table(list);
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
