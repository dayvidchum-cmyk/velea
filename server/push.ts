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
import { yearStationMarks } from "./sky/current-sky.js";

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

// One LLM line per eclipse date, shared by every user; regenerates only on process restart.
const ECLIPSE_LINE_MEMO = new Map<string, string>();
async function eclipseBellLine(date: string, type: "solar" | "lunar"): Promise<string> {
  const memoKey = `${date}:${type}`;
  const memo = ECLIPSE_LINE_MEMO.get(memoKey);
  if (memo) return memo;
  const { generateEclipseBellLine } = await import("./narrative/generate.js");
  const line = (await generateEclipseBellLine(type))
    ?? "The light breaks its own rules today. Watch — don't launch."; // his own doctrine, the fallback
  ECLIPSE_LINE_MEMO.set(memoKey, line);
  return line;
}

/**
 * THE BELL'S SKY LINE (David 2026-07-18): the greeting stays; the body reads the day's sky.
 * Deterministic — the engine picks the state, DAVID's words fill it (no LLM, no cost). States he
 * hasn't worded yet fall through to the default stage line; new lines drop into this table as he
 * writes them (the bell-voices list on the brief).
 */
const DAY_WORD: Record<number, string> = { 1: "tomorrow", 2: "in 2 days", 3: "in 3 days" };

/**
 * THE BELL POOLS (David 2026-07-18: "there can be a few bells") — each state holds a POOL of
 * his lines; the day's date picks one (stable all day, so the test bell rings what 8am rings,
 * and the whole userbase hears the same voice each morning). Drop a new line into its pool and
 * it joins the rotation.
 */
function pickLine(pool: string[], seed: string): string {
  if (pool.length === 1) return pool[0];
  let h = 0;
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return pool[h % pool.length];
}

const POOL = {
  crown: [
    "Heavy is the head that wears the crown — who cares. Today is yours, honey. Follow the sky.",
  ],
  retroshade: [
    (planet: string, he: string) => `${planet} Retrograde ends today! But it's never that easy. ${he} walked right into retroshade.`,
  ],
  waterfalls: [
    (planet: string, turn: string, when: string) => `${planet} stations ${turn} ${when}. Don't go chasing waterfalls.`,
  ],
  horizon: [
    "There's something on the horizon.",
  ],
  stage: [
    "Let's see how the stage is set today.",
  ],
};
// Planet pronouns (David's pantheon canon, 2026-07-18): the Moon is THEY — Chandra is male in
// the Vedas, "a horny whoring polygamist with a fucking harem, each in her own palace": the 27
// nakshatra wives ARE the lunar mansions, one palace visited per night (Tara Bala's mythic skin).
// David renders them They. Venus = She until he says otherwise; the rest He.
const PRONOUN: Record<string, string> = { Venus: "She", Moon: "They" };
async function skyLineFor(localDate: string): Promise<string> {
  try {
    const from = localDate;
    const to = new Date(Date.parse(localDate + "T00:00:00Z") + 8 * 86400000).toISOString().slice(0, 10); // 7-day lookahead for the horizon rung
    const marks = await yearStationMarks(from, to);
    const daysTo = (d: string) => Math.round((Date.parse(d + "T00:00:00Z") - Date.parse(localDate + "T00:00:00Z")) / 86400000);
    // 1 · ECLIPSE DAY — the rarest, loudest global event (4-7x/year): the line is LLM-written
    // per eclipse (one tiny call serves every user, memoized; static fallback if the wallet's
    // dry). David: "feed this one to the llm… for shits and giggles."
    for (const ec of marks.eclipses ?? []) {
      if (daysTo(ec.date) === 0) return eclipseBellLine(ec.date, ec.type);
    }
    // 2 · STATION-DIRECT TODAY — the turn itself outranks the approach (his retroshade line).
    for (const st of marks.stations) {
      if (st.kind === "station-direct" && daysTo(st.date) === 0) {
        const he = PRONOUN[st.planet] ?? "He";
        return pickLine(POOL.retroshade.map((fn) => fn(st.planet, he)), localDate);
      }
    }
    // 2 · THE WATERFALLS — a station approaches, EITHER direction, 1-3 days out, NAMED
    // (David: "waterfalls is good for station retro, as well").
    let best: { planet: string; days: number; kind: string } | null = null;
    for (const st of marks.stations) {
      if (st.kind !== "station-direct" && st.kind !== "station-retro") continue;
      const days = daysTo(st.date);
      if (days >= 1 && days <= 3 && (!best || days < best.days)) best = { planet: st.planet, days, kind: st.kind };
    }
    if (best) {
      const when = DAY_WORD[best.days] ?? `in ${best.days} days`;
      const turn = best.kind === "station-direct" ? "direct" : "retrograde";
      return pickLine(POOL.waterfalls.map((fn) => fn(best!.planet, turn, when)), localDate);
    }
    // 3 · THE HORIZON TEASE — the far rung of the same crescendo (David: "horizon is good for
    // eclipses and any rx coming up"): an eclipse within 3 days, or an rx GATHERING 4-7 days
    // out — before the waterfalls names it. Deliberately unnamed: the bell teases, the tap
    // reveals. horizon → waterfalls → retroshade: the tease sharpens into the name, the name
    // breaks into the turn.
    for (const ec of marks.eclipses ?? []) {
      const days = daysTo(ec.date);
      if (days >= 1 && days <= 3) return pickLine(POOL.horizon, localDate);
    }
    for (const st of marks.stations) {
      if (st.kind === "station-retro") {
        const days = daysTo(st.date);
        if (days >= 4 && days <= 7) return pickLine(POOL.horizon, localDate);
      }
    }
    // (Slots still awaiting David's words: eclipse day · crown day.)
  } catch { /* sky unavailable — the default line never fails */ }
  return pickLine(POOL.stage, localDate);
}

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
      title: `Good morning, ${first}!`,
      body: await skyLineFor(clock.date), // the day's sky picks the line — David's words, engine-chosen
      url: "/",
    });
    if (sent > 0) {
      await db.update(pushSubscriptions)
        .set({ lastMorningPush: clock.date })
        .where(eq(pushSubscriptions.userId, r.userId));
    }
  }
}

/** The sky line for a user's local today — used by the admin test bell so it rings the REAL line. */
export async function skyLineForToday(tz?: string | null): Promise<string> {
  const clock = localClock(tz) ?? { date: new Date().toISOString().slice(0, 10), hour: 0 };
  return skyLineFor(clock.date);
}

let schedulerStarted = false;
/** Start the minute tick. Called once at boot; harmless when keys are absent (ticks no-op). */
export function startMorningBell(): void {
  if (schedulerStarted) return;
  schedulerStarted = true;
  setInterval(() => { morningBellTick().catch((e) => console.warn("[push] tick failed:", e)); }, 60_000);
  console.log(`[push] morning bell scheduler started (configured: ${pushConfigured()})`);
}
