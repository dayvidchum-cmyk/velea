/**
 * THE MORNING BELL — web push (David 2026-07-18: "I want to build an alert on people's phones.
 * First one: Good morning, David! Let's see how the stage is set today.")
 *
 * Honest constraints, by design:
 *  - iOS: web push works ONLY for the INSTALLED PWA (iOS 16.4+), permission granted from a real
 *    tap in Settings (never an ambush prompt — the sensory-respect law).
 *  - Keys: VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY live in Railway env (David's hand). No keys →
 *    the whole feature degrades silently to off; nothing crashes.
 *  - The scheduler ticks every minute on the long-lived server process and rings each user at
 *    08:00 THEIR local time (stored locationTimezone; users without one are skipped rather than
 *    rung at a wrong hour). lastMorningPush (local date) is the durable dedupe — a redeploy at
 *    08:00 can't double-ring.
 */
import webpush from "web-push";
import { and, eq, inArray } from "drizzle-orm";
import { getDb } from "./db.js";
import { pushSubscriptions, users } from "../drizzle/schema.js";
import { getTimezoneOffset } from "./panchang/tz-offset.js";

export function pushConfigured(): boolean {
  return !!(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
}

let vapidSet = false;
function ensureVapid(): boolean {
  if (!pushConfigured()) return false;
  if (!vapidSet) {
    webpush.setVapidDetails(
      "mailto:dayvidchum@gmail.com",
      process.env.VAPID_PUBLIC_KEY!,
      process.env.VAPID_PRIVATE_KEY!,
    );
    vapidSet = true;
  }
  return true;
}

export type PushPayload = { title: string; body: string; url?: string };

/** Send to every device a user has subscribed. Dead endpoints (410/404) are pruned. */
export async function sendPushToUser(userId: number, payload: PushPayload): Promise<number> {
  if (!ensureVapid()) return 0;
  const db = await getDb();
  if (!db) return 0;
  const subs = await db.select().from(pushSubscriptions).where(eq(pushSubscriptions.userId, userId));
  let sent = 0;
  const dead: number[] = [];
  for (const s of subs) {
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        JSON.stringify(payload),
      );
      sent++;
    } catch (err: any) {
      const code = err?.statusCode;
      if (code === 404 || code === 410) dead.push(s.id); // browser dropped the subscription
      else console.warn("[push] send failed:", code, String(err?.message ?? err).slice(0, 120));
    }
  }
  if (dead.length) await db.delete(pushSubscriptions).where(inArray(pushSubscriptions.id, dead));
  return sent;
}

/** The user's local YYYY-MM-DD + hour, from their stored tz. Null when no tz (skip, don't guess). */
function localClock(tz: string | null | undefined): { date: string; hour: number } | null {
  if (!tz) return null;
  try {
    const offset = getTimezoneOffset(tz, new Date()); // hours
    const local = new Date(Date.now() + offset * 3600000);
    return { date: local.toISOString().slice(0, 10), hour: local.getUTCHours() };
  } catch { return null; }
}

const MORNING_HOUR = 8; // 8am local — v1 fixed; per-user hour is a later dial

/** One scheduler tick: ring every subscribed user whose local clock is in the 8am hour and who
 *  hasn't been rung on their local date yet. */
export async function morningBellTick(): Promise<void> {
  if (!pushConfigured()) return;
  const db = await getDb();
  if (!db) return;
  // Distinct subscribed users joined with their name + tz.
  const rows = await db
    .select({
      userId: pushSubscriptions.userId,
      lastMorningPush: pushSubscriptions.lastMorningPush,
      name: users.name,
      tz: users.locationTimezone,
    })
    .from(pushSubscriptions)
    .innerJoin(users, eq(users.id, pushSubscriptions.userId));
  const seen = new Set<number>();
  for (const r of rows) {
    if (seen.has(r.userId)) continue;
    seen.add(r.userId);
    const clock = localClock(r.tz);
    if (!clock || clock.hour !== MORNING_HOUR) continue;
    if (r.lastMorningPush === clock.date) continue; // already rung today (their today)
    const first = (r.name ?? "").trim().split(/\s+/)[0] || "friend";
    const sent = await sendPushToUser(r.userId, {
      // David's exact words — the first bell.
      title: `Good morning, ${first}!`,
      body: "Let's see how the stage is set today.",
      url: "/",
    });
    if (sent > 0) {
      await db.update(pushSubscriptions)
        .set({ lastMorningPush: clock.date })
        .where(eq(pushSubscriptions.userId, r.userId));
    }
  }
}

let schedulerStarted = false;
/** Start the minute tick. Called once at boot; harmless when keys are absent (ticks no-op). */
export function startMorningBell(): void {
  if (schedulerStarted) return;
  schedulerStarted = true;
  setInterval(() => { morningBellTick().catch((e) => console.warn("[push] tick failed:", e)); }, 60_000);
  console.log(`[push] morning bell scheduler started (configured: ${pushConfigured()})`);
}
