/**
 * One-time script: calculates and stores natal bodies for profiles that have
 * birth data but are missing profile_natal_bodies rows.
 * Run with: npx tsx calculate-profile-charts.ts
 */
import "dotenv/config";
import { eq, and } from "drizzle-orm";
import { getDb } from "./server/db";
import { profiles, profileNatalBodies } from "./drizzle/schema";
import { calculateBirthChart } from "./server/birthchart/calculator";

async function main() {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");

  const allProfiles = await db.select().from(profiles);

  for (const p of allProfiles) {
    if (!p.birthDate || !p.birthTime || !p.birthLocationLat || !p.birthLocationLon || !p.birthTimezone) {
      console.log(`Skipping ${p.name} (id=${p.id}) — incomplete birth data`);
      continue;
    }

    const existing = await db
      .select()
      .from(profileNatalBodies)
      .where(eq(profileNatalBodies.profileId, p.id));

    if (existing.length > 0) {
      console.log(`Skipping ${p.name} (id=${p.id}) — already has ${existing.length} natal bodies`);
      continue;
    }

    console.log(`Calculating chart for ${p.name} (id=${p.id})...`);
    try {
      const lat = parseFloat(p.birthLocationLat);
      const lon = parseFloat(p.birthLocationLon);
      const chart = await calculateBirthChart(p.birthDate, p.birthTime, lat, lon, p.birthTimezone);

      const planets = [
        { name: "Sun", data: chart.sun },
        { name: "Moon", data: chart.moon },
        { name: "Mercury", data: chart.mercury },
        { name: "Venus", data: chart.venus },
        { name: "Mars", data: chart.mars },
        { name: "Jupiter", data: chart.jupiter },
        { name: "Saturn", data: chart.saturn },
        { name: "Rahu", data: chart.rahu },
        { name: "Ketu", data: chart.ketu },
      ];

      for (const planet of planets) {
        await db.insert(profileNatalBodies).values({
          profileId: p.id,
          planet: planet.name,
          sign: planet.data.sign,
          degree: planet.data.degree.toFixed(6),
          house: planet.data.house,
          nakshatra: planet.data.nakshatra || null,
          pada: planet.data.pada || null,
          longitude: planet.data.longitude != null ? planet.data.longitude.toFixed(6) : null,
          isRetrograde: planet.data.isRetrograde ?? false,
        }).onDuplicateKeyUpdate({ set: { sign: planet.data.sign, isRetrograde: planet.data.isRetrograde ?? false } });
      }

      // Also update house placements on the profile row
      await db.update(profiles).set({
        lagnaSign: chart.lagna.sign,
        sunHouse: chart.sun.house,
        moonHouse: chart.moon.house,
        marsHouse: chart.mars.house,
        mercuryHouse: chart.mercury.house,
        jupiterHouse: chart.jupiter.house,
        venusHouse: chart.venus.house,
        saturnHouse: chart.saturn.house,
        rahuHouse: chart.rahu.house,
        ketuHouse: chart.ketu.house,
        ascendantDegree: chart.lagna.degree.toFixed(2),
      }).where(eq(profiles.id, p.id));

      console.log(`  ✓ ${p.name}: lagna=${chart.lagna.sign}, ${planets.length} bodies stored`);
    } catch (err) {
      console.error(`  ✗ ${p.name}: ${err}`);
    }
  }

  console.log("\nDone.");
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
