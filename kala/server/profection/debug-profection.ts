import { calculateProfectionYear } from "./calculator";

const birthDate = "1982-04-13";
const currentDate = "2026-05-25";
const lagnaSign = "Virgo";

console.log("\n" + "=".repeat(80));
console.log("ANNUAL PROFECTION VALIDATION - DAVID CHUM");
console.log("=".repeat(80));

console.log("\n1. INPUT DATA");
console.log("-".repeat(80));
console.log(`Birth Date: ${birthDate}`);
console.log(`Current Date: ${currentDate}`);
console.log(`Lagna Sign: ${lagnaSign}`);

try {
  const profection = calculateProfectionYear(birthDate, currentDate, lagnaSign);

  console.log("\n2. CALCULATED PROFECTION");
  console.log("-".repeat(80));
  console.log(`Age: ${profection.age}`);
  console.log(`Modulo (age % 12): ${profection.ageModulo}`);
  console.log(`Activated House: ${profection.activatedHouse}`);
  console.log(`Activated Sign: ${profection.activatedSign}`);
  console.log(`Time Lord: ${profection.timeLord}`);
  console.log(`Profection Start Date: ${profection.yearStart}`);
  console.log(`Profection End Date: ${profection.yearEnd}`);

  console.log("\n3. VALIDATION TARGETS");
  console.log("-".repeat(80));

  const targets = [
    { name: "Age", expected: 44, actual: profection.age, match: profection.age === 44 },
    { name: "Modulo Result", expected: 8, actual: profection.ageModulo, match: profection.ageModulo === 8 },
    { name: "Activated House", expected: 9, actual: profection.activatedHouse, match: profection.activatedHouse === 9 },
    { name: "Activated Sign", expected: "Taurus", actual: profection.activatedSign, match: profection.activatedSign === "Taurus" },
    { name: "Time Lord", expected: "Venus", actual: profection.timeLord, match: profection.timeLord === "Venus" },
    { name: "Profection Start Date", expected: "2026-04-13", actual: profection.yearStart, match: profection.yearStart === "2026-04-13" },
    { name: "Profection End Date", expected: "2027-04-12", actual: profection.yearEnd, match: profection.yearEnd === "2027-04-12" },
  ];

  let allMatch = true;
  targets.forEach(({ name, expected, actual, match }) => {
    const status = match ? "✓ PASS" : "✗ FAIL";
    console.log(`${status} | ${name}: expected "${expected}", got "${actual}"`);
    if (!match) allMatch = false;
  });

  console.log("\n" + "=".repeat(80));
  if (allMatch) {
    console.log("✓ ALL VALIDATION TARGETS PASSED - PHASE 2 COMPLETE");
  } else {
    console.log("✗ VALIDATION FAILED - STOP EXECUTION");
  }
  console.log("=".repeat(80) + "\n");
} catch (error) {
  console.error("\n✗ CALCULATION ERROR:");
  console.error(error);
  console.log("=".repeat(80) + "\n");
}
