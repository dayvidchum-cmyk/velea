/**
 * Profection Year Database Helpers
 */

import { getDb } from "../db.js";
import { profectionYears } from "../../drizzle/schema.js";
import { eq, and, isNull } from "drizzle-orm";
import type { InsertProfectionYear, ProfectionYear } from "../../drizzle/schema.js";

/**
 * Get or create a profection year record
 */
export async function getOrCreateProfectionYear(
  userId: number,
  age: number,
  activatedHouse: number,
  activatedSign: string,
  timeLord: string,
  yearStart: string,
  yearEnd: string,
  profileId?: number | null
): Promise<ProfectionYear> {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");

  const profileFilter = profileId != null ? eq(profectionYears.profileId, profileId) : isNull(profectionYears.profileId);

  // Try to find existing record
  const existing = await db
    .select()
    .from(profectionYears)
    .where(
      and(
        eq(profectionYears.userId, userId),
        profileFilter,
        eq(profectionYears.age, age),
        eq(profectionYears.yearStart, yearStart)
      )
    )
    .limit(1);

  if (existing.length > 0) {
    return existing[0];
  }

  // Create new record
  const newRecord: InsertProfectionYear = {
    userId,
    profileId: profileId ?? null,
    age,
    activatedHouse,
    activatedSign,
    timeLord,
    yearStart,
    yearEnd
  };

  await db.insert(profectionYears).values(newRecord);
  
  // Fetch and return the created record by querying for the exact match
  const created = await db
    .select()
    .from(profectionYears)
    .where(
      and(
        eq(profectionYears.userId, userId),
        profileFilter,
        eq(profectionYears.yearStart, yearStart)
      )
    )
    .limit(1);

  if (!created[0]) throw new Error("Failed to create profection year");
  return created[0];
}

/**
 * Get profection year for a specific date
 */
export async function getProfectionYearForDate(
  userId: number,
  date: string, // YYYY-MM-DD
  profileId?: number | null
): Promise<ProfectionYear | undefined> {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");

  const profileFilter = profileId != null ? eq(profectionYears.profileId, profileId) : isNull(profectionYears.profileId);
  const result = await db
    .select()
    .from(profectionYears)
    .where(and(eq(profectionYears.userId, userId), profileFilter));

  // Filter in JavaScript since we can't easily do date range queries with strings
  return result.find(year => date >= year.yearStart && date <= year.yearEnd);
}

/**
 * Get all profection years for a user
 */
export async function getAllProfectionYears(userId: number, profileId?: number | null): Promise<ProfectionYear[]> {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");

  const profileFilter = profileId != null ? eq(profectionYears.profileId, profileId) : isNull(profectionYears.profileId);
  return db
    .select()
    .from(profectionYears)
    .where(and(eq(profectionYears.userId, userId), profileFilter));
}

/**
 * Get profection years within a date range
 */
export async function getProfectionYearsInDateRange(
  userId: number,
  startDate: string, // YYYY-MM-DD
  endDate: string,   // YYYY-MM-DD
  profileId?: number | null
): Promise<ProfectionYear[]> {
  const allYears = await getAllProfectionYears(userId, profileId);
  
  // Filter for years that overlap with the date range
  return allYears.filter((year: ProfectionYear) => {
    // Year overlaps if it starts before endDate and ends after startDate
    return year.yearStart <= endDate && year.yearEnd >= startDate;
  });
}

/**
 * Delete all profection year records for a user.
 * Used when a user recalculates their birth chart — old cached rows become stale
 * and will be regenerated on-demand by the transit router.
 */
export async function deleteAllProfectionYearsForUser(userId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.delete(profectionYears).where(eq(profectionYears.userId, userId));
}
