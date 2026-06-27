import { getDb } from "../db";
import { timeLordTransits, type InsertTimeLordTransit, type TimeLordTransit } from "../../drizzle/schema";
import { and, eq, gte, lte } from "drizzle-orm";

/**
 * Create Time Lord transit records for a profection year
 */
export async function createTimeLordTransits(
  profectionYearId: number,
  userId: number,
  transits: Array<{
    timeLord: string;
    startDate: string;
    endDate: string;
    sign: string;
    house: number;
    nakshatra?: string;
    isRetrograde: boolean;
    condition: string;
    operationalMeaning: string;
    recommendedUse: string;
  }>,
  profileId?: number | null
): Promise<TimeLordTransit[]> {
  const db = await getDb();
  if (!db) return [];

  const records: InsertTimeLordTransit[] = transits.map((transit) => ({
    profectionYearId,
    userId,
    profileId: profileId ?? null,
    timeLord: transit.timeLord,
    startDate: transit.startDate,
    endDate: transit.endDate,
    sign: transit.sign,
    house: transit.house,
    nakshatra: transit.nakshatra,
    isRetrograde: transit.isRetrograde,
    condition: transit.condition,
    operationalMeaning: transit.operationalMeaning,
    recommendedUse: transit.recommendedUse,
  }));

  await db.insert(timeLordTransits).values(records);
  
  // Fetch and return the created records
  return await db
    .select()
    .from(timeLordTransits)
    .where(eq(timeLordTransits.profectionYearId, profectionYearId));
}

/**
 * Get all Time Lord transits for a profection year
 */
export async function getTimeLordTransitsForYear(
  profectionYearId: number
): Promise<TimeLordTransit[]> {
  const db = await getDb();
  if (!db) return [];
  return await db
    .select()
    .from(timeLordTransits)
    .where(eq(timeLordTransits.profectionYearId, profectionYearId))
    .orderBy(timeLordTransits.startDate);
}

/**
 * Get Time Lord transits active on a specific date
 */
export async function getTimeLordTransitForDate(
  profectionYearId: number,
  date: string
): Promise<TimeLordTransit | null> {
  const db = await getDb();
  if (!db) return null;
  const result = await db
    .select()
    .from(timeLordTransits)
    .where(
      and(
        eq(timeLordTransits.profectionYearId, profectionYearId),
        lte(timeLordTransits.startDate, date),
        gte(timeLordTransits.endDate, date)
      )
    )
    .limit(1);

  return result[0] || null;
}

/**
 * Get Time Lord transits within a date range
 */
export async function getTimeLordTransitsInRange(
  profectionYearId: number,
  startDate: string,
  endDate: string
): Promise<TimeLordTransit[]> {
  const db = await getDb();
  if (!db) return [];
  return await db
    .select()
    .from(timeLordTransits)
    .where(
      and(
        eq(timeLordTransits.profectionYearId, profectionYearId),
        lte(timeLordTransits.startDate, endDate),
        gte(timeLordTransits.endDate, startDate)
      )
    )
    .orderBy(timeLordTransits.startDate);
}

/**
 * Delete Time Lord transits for a profection year
 */
export async function deleteTimeLordTransitsForYear(
  profectionYearId: number
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db
    .delete(timeLordTransits)
    .where(eq(timeLordTransits.profectionYearId, profectionYearId));
}

/**
 * Delete all time lord transit records for a user.
 * Used when a user recalculates their birth chart — transits will be regenerated
 * on-demand by the transit router.
 */
export async function deleteAllTimeLordTransitsForUser(
  userId: number
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db
    .delete(timeLordTransits)
    .where(eq(timeLordTransits.userId, userId));
}
