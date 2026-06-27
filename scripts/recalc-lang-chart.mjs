// Recalculate and persist Lang's chart with the correct birth date 1989-11-18
import { calculateBirthChart } from '../server/birthchart/calculator.js';
import { createConnection } from 'mysql2/promise';

const result = await calculateBirthChart(
  '1989-11-18',
  '17:32',
  42.3601,
  -71.0589,
  'America/New_York'
);

console.log('Lagna:', result.lagna.sign, result.lagna.degree.toFixed(4));
console.log('Moon:', result.moon.sign, result.moon.nakshatra, result.moon.longitude.toFixed(4));

const conn = await createConnection(process.env.DATABASE_URL);

// Update profile chart fields
await conn.execute(
  `UPDATE profiles SET
    lagnaSign = ?,
    ascendantDegree = ?,
    sunHouse = ?,
    moonHouse = ?,
    marsHouse = ?,
    mercuryHouse = ?,
    jupiterHouse = ?,
    venusHouse = ?,
    saturnHouse = ?,
    rahuHouse = ?,
    ketuHouse = ?
  WHERE id = 1`,
  [
    result.lagna.sign,
    result.lagna.degree.toFixed(4),
    result.sun.house,
    result.moon.house,
    result.mars.house,
    result.mercury.house,
    result.jupiter.house,
    result.venus.house,
    result.saturn.house,
    result.rahu.house,
    result.ketu.house,
  ]
);

// Delete old natal bodies for profile 1
await conn.execute('DELETE FROM profile_natal_bodies WHERE profileId = 1');

// Insert new natal bodies
const planets = [
  { planet: 'Sun', data: result.sun },
  { planet: 'Moon', data: result.moon },
  { planet: 'Mercury', data: result.mercury },
  { planet: 'Venus', data: result.venus },
  { planet: 'Mars', data: result.mars },
  { planet: 'Jupiter', data: result.jupiter },
  { planet: 'Saturn', data: result.saturn },
  { planet: 'Rahu', data: result.rahu },
  { planet: 'Ketu', data: result.ketu },
];

for (const { planet, data } of planets) {
  await conn.execute(
    `INSERT INTO profile_natal_bodies (profileId, planet, sign, degree, house, nakshatra, pada, longitude)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [1, planet, data.sign, data.degree.toFixed(6), data.house, data.nakshatra, data.pada, data.longitude.toFixed(6)]
  );
}

await conn.end();
console.log('\nChart updated successfully for Lang (profileId=1)');
console.log('Lagna:', result.lagna.sign);
console.log('Moon:', result.moon.sign, result.moon.nakshatra, 'lon', result.moon.longitude.toFixed(4));
