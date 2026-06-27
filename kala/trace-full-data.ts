import { appRouter } from "./server/routers";
import type { TrpcContext } from "./server/_core/context";
import { getDb } from "./server/db";
import { users, natalBodies } from "./drizzle/schema";
import { eq, and } from "drizzle-orm";

async function traceData() {
  console.log("\n========== FULL DATA TRACE FOR DAVID CHUM ==========\n");
  
  const db = await getDb();
  if (!db) {
    console.error("Database connection failed");
    process.exit(1);
  }

  // STAGE 1: Users table
  console.log("STAGE 1: USERS TABLE");
  console.log("====================");
  const userResult = await db.select().from(users).where(eq(users.id, 1)).limit(1);
  if (userResult.length > 0) {
    const user = userResult[0];
    console.log(`ID: ${user.id}`);
    console.log(`Name: ${user.name}`);
    console.log(`Birth Date: ${user.birthDate}`);
    console.log(`Birth Time: ${user.birthTime}`);
    console.log(`Birth Location: ${user.birthLocation}`);
    console.log(`Lagna Sign: ${user.lagnaSign}`);
    console.log(`Ascendant Degree: ${user.ascendantDegree}`);
  } else {
    console.log("No user found");
    process.exit(1);
  }

  // STAGE 2: Natal Bodies table - Venus
  console.log("\n\nSTAGE 2: NATAL_BODIES TABLE - VENUS");
  console.log("====================================");
  const venusResult = await db
    .select()
    .from(natalBodies)
    .where(and(eq(natalBodies.userId, 1), eq(natalBodies.planet, "Venus")))
    .limit(1);
  
  if (venusResult.length > 0) {
    const venus = venusResult[0];
    console.log(`Planet: ${venus.planet}`);
    console.log(`Sign: ${venus.sign}`);
    console.log(`Degree: ${venus.degree}`);
    console.log(`House: ${venus.house}`);
    console.log(`Nakshatra: ${venus.nakshatra}`);
    console.log(`Pada: ${venus.pada}`);
  } else {
    console.log("No Venus record found in natal_bodies");
  }

  // STAGE 2B: All natal bodies
  console.log("\n\nSTAGE 2B: ALL NATAL BODIES FOR USER 1");
  console.log("======================================");
  const allBodies = await db
    .select()
    .from(natalBodies)
    .where(eq(natalBodies.userId, 1));
  
  console.log(`Total planets: ${allBodies.length}`);
  allBodies.forEach(body => {
    console.log(`  ${body.planet}: ${body.sign} ${body.degree}° (House ${body.house}, ${body.nakshatra} Pada ${body.pada})`);
  });

  // STAGE 3-6: Call the router to get the full profection data
  console.log("\n\nSTAGE 3-6: CALLING PROFECTION ROUTER");
  console.log("=====================================");
  
  const ctx: TrpcContext = {
    user: {
      id: 1,
      openId: "test-user",
      email: "test@example.com",
      name: "David Chum",
      role: "user",
    },
  } as TrpcContext;

  try {
    const caller = appRouter.createCaller(ctx);
    const result = await caller.profection.current();

    // STAGE 3: Profection engine output
    console.log("\nSTAGE 3: PROFECTION ENGINE OUTPUT");
    console.log("==================================");
    const prof = result.profection;
    console.log(`Age: ${prof.age}`);
    console.log(`Activated House: ${prof.activatedHouse}`);
    console.log(`Activated Sign: ${prof.activatedSign}`);
    console.log(`Time Lord: ${prof.timeLord}`);
    console.log(`Year Start: ${prof.yearStart}`);
    console.log(`Year End: ${prof.yearEnd}`);

    // STAGE 4: Interpreter input (from debug info)
    console.log("\n\nSTAGE 4: INTERPRETER INPUT");
    console.log("============================");
    if (result._debug) {
      console.log(`Time Lord: ${result._debug.timeLord}`);
      console.log(`Natal Bodies Count: ${result._debug.natalBodiesCount}`);
      if (result._debug.timeLordNatal) {
        console.log(`Natal Time Lord:`);
        console.log(`  Planet: ${result._debug.timeLordNatal.planet}`);
        console.log(`  Sign: ${result._debug.timeLordNatal.sign}`);
        console.log(`  House: ${result._debug.timeLordNatal.house}`);
        console.log(`  Nakshatra: ${result._debug.timeLordNatal.nakshatra}`);
        console.log(`  Pada: ${result._debug.timeLordNatal.pada}`);
      }
    }

    // STAGE 5: Interpreter output
    console.log("\n\nSTAGE 5: INTERPRETER OUTPUT");
    console.log("=============================");
    const interp = result.interpretation;
    console.log(`\nOperational Chain:\n${interp.operationalChain}\n`);
    console.log(`\nYearly Focus (Section 5):\n${interp.section5}\n`);
    console.log(`\nWhat Supports Growth (Section 6):\n${interp.section6}\n`);
    console.log(`\nWhat Creates Friction (Section 7):\n${interp.section7}\n`);

    // STAGE 6: API response structure
    console.log("\n\nSTAGE 6: API RESPONSE STRUCTURE");
    console.log("================================");
    console.log(`Response has profection: ${!!result.profection}`);
    console.log(`Response has interpretation: ${!!result.interpretation}`);
    console.log(`Response has _debug: ${!!result._debug}`);
    console.log(`Interpretation sections: section5=${!!interp.section5}, section6=${!!interp.section6}, section7=${!!interp.section7}`);

  } catch (error) {
    console.error("Router error:", error);
  }

  process.exit(0);
}

traceData().catch(err => {
  console.error("Error:", err);
  process.exit(1);
});
