import "dotenv/config";
import { and, eq } from "drizzle-orm";
import { getDb } from "./server/db";
import { profiles, profileNatalBodies } from "./drizzle/schema";
import { calculateBirthChart } from "./server/birthchart/calculator";

async function main() {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");

  for (const p of await db.select().from(profiles)) {
    if (!p.birthDate || !p.birthTime || !p.birthLocationLat || !p.birthLocationLon || !p.birthTimezone) continue;

    console.log(`${p.name} (id=${p.id})`);
    const chart = await calculateBirthChart(
      p.birthDate, p.birthTime,
      parseFloat(p.birthLocationLat), parseFloat(p.birthLocationLon),
      p.birthTimezone
    );

    const planets: [string, boolean][] = [
      ["Sun", chart.sun.isRetrograde], ["Moon", chart.moon.isRetrograde],
      ["Mercury", chart.mercury.isRetrograde], ["Venus", chart.venus.isRetrograde],
      ["Mars", chart.mars.isRetrograde], ["Jupiter", chart.jupiter.isRetrograde],
      ["Saturn", chart.saturn.isRetrograde], ["Rahu", chart.rahu.isRetrograde],
      ["Ketu", chart.ketu.isRetrograde],
    ];

    for (const [planet, isRetrograde] of planets) {
      await db.update(profileNatalBodies)
        .set({ isRetrograde })
        .where(and(eq(profileNatalBodies.profileId, p.id), eq(profileNatalBodies.planet, planet)));
      if (isRetrograde) console.log(`  ${planet}: Rx`);
    }
  }

  console.log("\nDone.");
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
