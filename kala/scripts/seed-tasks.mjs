/**
 * Seed the 6 existing tasks from the previous Naksha project.
 * Run with: node scripts/seed-tasks.mjs
 *
 * Requires DATABASE_URL in the environment.
 */
import "dotenv/config";
import mysql from "mysql2/promise";

const OWNER_OPEN_ID = process.env.OWNER_OPEN_ID;
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

const conn = await mysql.createConnection(DATABASE_URL);

// Get or create owner user
const [rows] = await conn.execute(
  "SELECT id FROM users WHERE openId = ? LIMIT 1",
  [OWNER_OPEN_ID]
);

let userId;
if (rows.length > 0) {
  userId = rows[0].id;
  console.log(`Found owner user id=${userId}`);
} else {
  // Create a placeholder user — they'll be updated on first login
  const [result] = await conn.execute(
    "INSERT INTO users (openId, name, role, lastSignedIn) VALUES (?, 'Owner', 'admin', NOW())",
    [OWNER_OPEN_ID]
  );
  userId = result.insertId;
  console.log(`Created placeholder owner user id=${userId}`);
}

// Check for existing tasks to avoid duplicates
const [existing] = await conn.execute(
  "SELECT title FROM tasks WHERE userId = ?",
  [userId]
);
const existingTitles = new Set(existing.map((r) => r.title));

const TASKS = [
  { title: "Clean bedroom",              mode: "Restraint", priority: "Medium", isPinned: false },
  { title: "Clean fish tank",            mode: "Restraint", priority: "Medium", isPinned: false },
  { title: "Clean bathroom",             mode: "Restraint", priority: "Medium", isPinned: false },
  { title: "Create Blue Brows reel",     mode: "Build",     priority: "High",   isPinned: true  },
  { title: "Edit Body pages on website", mode: "Build",     priority: "Medium", isPinned: false },
  { title: "test task",                  mode: "Selective", priority: "Low",    isPinned: false },
];

let inserted = 0;
for (const task of TASKS) {
  if (existingTitles.has(task.title)) {
    console.log(`  Skipping (exists): ${task.title}`);
    continue;
  }
  await conn.execute(
    "INSERT INTO tasks (userId, title, mode, priority, isPinned, isCompleted) VALUES (?, ?, ?, ?, ?, 0)",
    [userId, task.title, task.mode, task.priority, task.isPinned ? 1 : 0]
  );
  console.log(`  Inserted: ${task.title}`);
  inserted++;
}

console.log(`\nDone. Inserted ${inserted} tasks.`);
await conn.end();
