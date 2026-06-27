import { getDb } from "./server/db";
import { timeLordTransits } from "./drizzle/schema";
import { eq } from "drizzle-orm";

/**
 * Validate that Time Lord transits form a continuous timeline with no gaps or overlaps
 */
async function validateTransitContinuity() {
  const db = await getDb();
  if (!db) {
    console.error("Database connection failed");
    return;
  }

  // Get all transits for the profection year
  const transits = await db
    .select()
    .from(timeLordTransits)
    .orderBy(timeLordTransits.startDate);

  if (transits.length === 0) {
    console.log("No transits found");
    return;
  }

  console.log(`\n=== TRANSIT CONTINUITY VALIDATION ===`);
  console.log(`Total transit periods: ${transits.length}`);
  console.log(`Date range: ${transits[0].startDate} to ${transits[transits.length - 1].endDate}\n`);

  // Check for gaps, overlaps, and duplicates
  const issues: string[] = [];
  const dateMap = new Map<string, number>();

  for (let i = 0; i < transits.length; i++) {
    const transit = transits[i];
    const startDate = new Date(transit.startDate);
    const endDate = new Date(transit.endDate);

    // Check each date in this transit period
    let currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      const dateStr = currentDate.toISOString().split("T")[0];
      
      if (dateMap.has(dateStr)) {
        issues.push(`DUPLICATE: ${dateStr} appears in multiple transit periods`);
      } else {
        dateMap.set(dateStr, i);
      }
      
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Check for gaps between consecutive transits
    if (i < transits.length - 1) {
      const nextTransit = transits[i + 1];
      const currentEnd = new Date(transit.endDate);
      const nextStart = new Date(nextTransit.startDate);
      
      // End date should be exactly one day before next start date
      const dayAfterEnd = new Date(currentEnd);
      dayAfterEnd.setDate(dayAfterEnd.getDate() + 1);
      
      if (dayAfterEnd.toISOString().split("T")[0] !== nextStart.toISOString().split("T")[0]) {
        const gap = Math.floor((nextStart.getTime() - currentEnd.getTime()) / (1000 * 60 * 60 * 24));
        issues.push(
          `GAP: ${transit.endDate} to ${nextTransit.startDate} (${gap} days missing)`
        );
      }
    }

    console.log(
      `${i + 1}. ${transit.sign} (House ${transit.house}): ${transit.startDate} → ${transit.endDate}`
    );
  }

  // Check for missing dates in the profection year
  const profectionStart = new Date("2026-04-13");
  const profectionEnd = new Date("2027-04-12");
  let currentDate = new Date(profectionStart);
  const missingDates: string[] = [];

  while (currentDate <= profectionEnd) {
    const dateStr = currentDate.toISOString().split("T")[0];
    if (!dateMap.has(dateStr)) {
      missingDates.push(dateStr);
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }

  console.log(`\n=== VALIDATION RESULTS ===`);
  console.log(`Total dates covered: ${dateMap.size}`);
  console.log(`Total dates in profection year: ${Math.floor((profectionEnd.getTime() - profectionStart.getTime()) / (1000 * 60 * 60 * 24)) + 1}`);

  if (missingDates.length > 0) {
    console.log(`\n⚠️  MISSING DATES (${missingDates.length}):`);
    missingDates.slice(0, 20).forEach(date => console.log(`  - ${date}`));
    if (missingDates.length > 20) {
      console.log(`  ... and ${missingDates.length - 20} more`);
    }
  } else {
    console.log(`\n✅ No missing dates`);
  }

  if (issues.length > 0) {
    console.log(`\n❌ ISSUES FOUND (${issues.length}):`);
    issues.forEach(issue => console.log(`  - ${issue}`));
  } else {
    console.log(`\n✅ No gaps or overlaps`);
  }

  console.log(`\n=== END VALIDATION ===\n`);
}

validateTransitContinuity().catch(console.error);
