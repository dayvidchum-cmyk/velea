import { readFileSync, writeFileSync } from "fs";

const content = readFileSync("server/profection/router.ts", "utf-8");

// Fix the timeLordTransits procedure
const fixed = content.replace(
  /const transits = await getTimeLordTransitsForYear\(\s*ctx\.user\.id,\s*profection\.timeLord,\s*profection\.yearStart,\s*profection\.yearEnd\s*\);/,
  `const profectionYear = await getOrCreateProfectionYear(
        ctx.user.id,
        profection.age,
        profection.activatedHouse,
        profection.activatedSign,
        profection.timeLord,
        profection.yearStart,
        profection.yearEnd
      );

      const transits = await getTimeLordTransitsForYear(profectionYear.id);`
);

writeFileSync("server/profection/router.ts", fixed);
console.log("Fixed router");
