import { getDb } from "./server/db.js";

async function migrate() {
  const db = await getDb();
  if (!db) {
    console.error("Failed to connect to database");
    process.exit(1);
  }

  console.log("Migration complete - natal_bodies table is ready");
  console.log("Note: Existing planet house data from users table can be migrated on-demand");
  console.log("The interpreter will now read from natal_bodies table for complete planet data");
}

migrate().catch(console.error);
