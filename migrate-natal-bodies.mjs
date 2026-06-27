import mysql from "mysql2/promise";
import { config } from "dotenv";

config();

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL not set");
  process.exit(1);
}

// Parse connection string: mysql://user:pass@host:port/database
const url = new URL(DATABASE_URL.startsWith('mysql://') ? DATABASE_URL : `mysql://${DATABASE_URL}`);
const connection = await mysql.createConnection({
  host: url.hostname,
  user: url.username,
  password: url.password,
  database: url.pathname.slice(1),
  port: url.port || 3306,
  waitForConnections: true,
  connectionLimit: 1,
  queueLimit: 0,
});

console.log("Connected to database");

// Get all users with birth chart data
const [users] = await connection.execute(
  `SELECT id, lagnaSign, sunHouse, moonHouse, marsHouse, mercuryHouse, 
          jupiterHouse, venusHouse, saturnHouse, rahuHouse, ketuHouse 
   FROM users WHERE lagnaSign IS NOT NULL`
);

console.log(`Found ${users.length} users with birth chart data`);

const planets = [
  "Sun",
  "Moon",
  "Mars",
  "Mercury",
  "Jupiter",
  "Venus",
  "Saturn",
  "Rahu",
  "Ketu",
];
const houseFields = [
  "sunHouse",
  "moonHouse",
  "marsHouse",
  "mercuryHouse",
  "jupiterHouse",
  "venusHouse",
  "saturnHouse",
  "rahuHouse",
  "ketuHouse",
];

let insertedCount = 0;

for (const user of users) {
  for (let i = 0; i < planets.length; i++) {
    const planet = planets[i];
    const house = user[houseFields[i]];

    if (house === null || house === undefined) continue;

    // Check if already exists
    const [existing] = await connection.execute(
      `SELECT id FROM natal_bodies WHERE userId = ? AND planet = ?`,
      [user.id, planet]
    );

    if (existing.length > 0) {
      console.log(`  Skipping ${planet} for user ${user.id} (already exists)`);
      continue;
    }

    // Insert with placeholder values
    // Sign will be derived from house and lagna in a future step
    await connection.execute(
      `INSERT INTO natal_bodies (userId, planet, sign, degree, house, nakshatra, pada) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [user.id, planet, "Unknown", "0", house, null, null]
    );

    insertedCount++;
    console.log(`  Inserted ${planet} for user ${user.id} (house ${house})`);
  }
}

console.log(`\nMigration complete: ${insertedCount} natal bodies inserted`);
console.log("Note: sign, degree, nakshatra, pada are placeholders and will be populated when users update their birth chart");

await connection.end();
