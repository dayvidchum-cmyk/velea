import { appRouter } from "./server/routers";
import type { TrpcContext } from "./server/_core/context";

// Create a mock context for user 1
const ctx: TrpcContext = {
  user: {
    id: 1,
    openId: "test-user",
    email: "test@example.com",
    name: "David Chum",
    role: "user",
  },
} as TrpcContext;

async function testProfectionAPI() {
  console.log("\n=== Testing Profection API ===\n");
  
  try {
    const caller = appRouter.createCaller(ctx);
    
    // Call the current profection year
    const result = await caller.profection.current();
    
    console.log("✅ API Response received\n");
    
    // Log the debug info
    if (result._debug) {
      console.log("DEBUG INFO:");
      console.log("  Time Lord:", result._debug.timeLord);
      console.log("  Natal Bodies Count:", result._debug.natalBodiesCount);
      if (result._debug.timeLordNatal) {
        console.log("  Natal Time Lord:");
        console.log("    - Planet:", result._debug.timeLordNatal.planet);
        console.log("    - Sign:", result._debug.timeLordNatal.sign);
        console.log("    - House:", result._debug.timeLordNatal.house);
        console.log("    - Nakshatra:", result._debug.timeLordNatal.nakshatra);
        console.log("    - Pada:", result._debug.timeLordNatal.pada);
      }
    }
    
    // Log the interpretation
    console.log("\nINTERPRETATION:");
    console.log("\nSection 5 (Yearly Focus):");
    console.log(result.interpretation.section5);
    
    console.log("\nSection 6 (What Supports Growth):");
    console.log(result.interpretation.section6);
    
    console.log("\nSection 7 (What Creates Friction):");
    console.log(result.interpretation.section7);
    
  } catch (error) {
    console.error("❌ Error:", error);
  }
}

testProfectionAPI();
