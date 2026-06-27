#!/usr/bin/env node
/**
 * One-off: create the `sessions` table if it doesn't exist, so the DB-backed
 * login flow works before a full `npm run db:push` migration is run.
 *
 * Usage: npx tsx server/scripts/create-sessions-table.ts
 */

import "dotenv/config";
import { sql } from "drizzle-orm";
import { getDb } from "../db.js";

async function main() {
  const db = await getDb();
  if (!db) throw new Error("No database connection (check DATABASE_URL).");

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS sessions (
      token VARCHAR(64) NOT NULL,
      userId INT NOT NULL,
      expiresAt TIMESTAMP NOT NULL,
      createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (token)
    )
  `);

  console.log("✓ sessions table is ready. Login should work now.");
  process.exit(0);
}

main().catch((err) => {
  console.error("✗ Failed to create sessions table:", err);
  process.exit(1);
});
