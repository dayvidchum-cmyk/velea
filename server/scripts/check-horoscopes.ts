/** Read-only diagnostic: list the most recent horoscope snapshots so we can see whether reveals
 *  are actually persisting (profile, date, area, size, when). No writes. */
import { sql } from "drizzle-orm";
import { getDb } from "../db.js";

async function main() {
  const db = await getDb();
  if (!db) { console.error("No DB (DATABASE_URL unset?)."); process.exit(1); }
  const rows: any = await db.execute(sql`
    SELECT profileId, readingDate, lifeArea, CHAR_LENGTH(content) AS contentLen,
           (notes IS NOT NULL AND notes <> '') AS hasNotes, createdAt
    FROM horoscopes
    ORDER BY createdAt DESC
    LIMIT 25
  `);
  // drizzle-mysql2 db.execute returns the mysql2 tuple [rows, fields] — the ROWS are element 0.
  const list = Array.isArray(rows?.[0]) ? rows[0] : (Array.isArray(rows) ? rows : []);
  console.log(`rows returned: ${list.length}`);
  console.table(list);
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
