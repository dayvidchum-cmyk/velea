import { getDb } from '../server/db.js';
import { sql } from 'drizzle-orm';

async function run() {
  const db = await getDb();
  const result = await db.execute(sql`
    SELECT
      COUNT(*) AS total,
      COUNT(CASE WHEN isCompleted = 1 THEN 1 END) AS completed,
      COUNT(CASE WHEN snoozedUntil > NOW() THEN 1 END) AS snoozed,
      COUNT(CASE WHEN profileId IS NULL THEN 1 END) AS no_profile,
      COUNT(DISTINCT profileId) AS distinct_profiles
    FROM tasks
    WHERE userId = 1
  `);
  const rows = Array.isArray(result[0]) ? result[0] : (result as any).rows ?? result;
  console.table(rows);
  process.exit(0);
}

run().catch(console.error);
