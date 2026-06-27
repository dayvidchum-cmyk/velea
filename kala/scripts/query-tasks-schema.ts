import { getDb } from '../server/db.js';
import { sql } from 'drizzle-orm';

async function run() {
  const db = await getDb();

  console.log('=== TASKS TABLE COLUMNS ===');
  const cols = await db.execute(sql`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_name = 'tasks'
    ORDER BY ordinal_position
  `);
  // drizzle mysql2 returns [rows, fields]
  const rows = Array.isArray(cols[0]) ? cols[0] : (cols as any).rows ?? cols;
  for (const row of rows as any[]) {
    console.log(' ', row.column_name ?? row.COLUMN_NAME);
  }

  console.log('\n=== TASK STATS FOR userId = 1 ===');
  const stats = await db.execute(sql`
    SELECT
      COUNT(*) AS total,
      COUNT(archivedAt) AS archived,
      COUNT(CASE WHEN snoozedUntil > NOW() THEN 1 END) AS snoozed,
      COUNT(profileId) AS has_profile_id
    FROM tasks
    WHERE userId = 1
  `);
  const statRows = Array.isArray(stats[0]) ? stats[0] : (stats as any).rows ?? stats;
  console.table(statRows);

  process.exit(0);
}

run().catch(console.error);
