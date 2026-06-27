import { getDb } from '../server/db.js';
import { sql } from 'drizzle-orm';

const OWNER_PROFILE_ID = 30001;
const USER_ID = 1;

async function run() {
  const db = await getDb();

  // Step 2: Count NULLs before migration
  console.log('=== BEFORE MIGRATION (NULL profileId counts) ===');
  const before = await db.execute(sql`
    SELECT 'tasks' AS tbl, COUNT(*) AS cnt FROM tasks WHERE userId = ${USER_ID} AND profileId IS NULL
    UNION ALL
    SELECT 'projects', COUNT(*) FROM projects WHERE userId = ${USER_ID} AND profileId IS NULL
    UNION ALL
    SELECT 'reflections', COUNT(*) FROM reflections WHERE userId = ${USER_ID} AND profileId IS NULL
    UNION ALL
    SELECT 'project_notes', COUNT(*) FROM project_notes WHERE profileId IS NULL
  `);
  const beforeRows = Array.isArray(before[0]) ? before[0] : (before as any).rows ?? before;
  console.table(beforeRows);

  // Step 3: Migrate
  console.log('\n=== RUNNING MIGRATION ===');
  const r1 = await db.execute(sql`UPDATE tasks SET profileId = ${OWNER_PROFILE_ID} WHERE userId = ${USER_ID} AND profileId IS NULL`);
  console.log('tasks updated:', (r1[0] as any).affectedRows ?? '?');

  const r2 = await db.execute(sql`UPDATE projects SET profileId = ${OWNER_PROFILE_ID} WHERE userId = ${USER_ID} AND profileId IS NULL`);
  console.log('projects updated:', (r2[0] as any).affectedRows ?? '?');

  const r3 = await db.execute(sql`UPDATE reflections SET profileId = ${OWNER_PROFILE_ID} WHERE userId = ${USER_ID} AND profileId IS NULL`);
  console.log('reflections updated:', (r3[0] as any).affectedRows ?? '?');

  const r4 = await db.execute(sql`UPDATE project_notes SET profileId = ${OWNER_PROFILE_ID} WHERE profileId IS NULL`);
  console.log('project_notes updated:', (r4[0] as any).affectedRows ?? '?');

  // Step 4: Verify
  console.log('\n=== AFTER MIGRATION (NULL profileId counts — all should be 0) ===');
  const after = await db.execute(sql`
    SELECT 'tasks' AS tbl, COUNT(*) AS cnt FROM tasks WHERE userId = ${USER_ID} AND profileId IS NULL
    UNION ALL
    SELECT 'projects', COUNT(*) FROM projects WHERE userId = ${USER_ID} AND profileId IS NULL
    UNION ALL
    SELECT 'reflections', COUNT(*) FROM reflections WHERE userId = ${USER_ID} AND profileId IS NULL
    UNION ALL
    SELECT 'project_notes', COUNT(*) FROM project_notes WHERE profileId IS NULL
  `);
  const afterRows = Array.isArray(after[0]) ? after[0] : (after as any).rows ?? after;
  console.table(afterRows);

  process.exit(0);
}

run().catch(console.error);
