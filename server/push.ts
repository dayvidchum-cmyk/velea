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
import { and, eq, inArray, or, isNull, ne } from "drizzle-orm";
import { getDb } from "./db.js";
import { pushSubscriptions, users, profiles } from "../drizzle/schema.js";
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
        // AUDIT #4 (8): a morning line must not arrive at 10pm — TTL a few hours, and a
        // topic so a newer bell replaces an undelivered one. timeout so one hanging
        // endpoint can't stall the whole tick (web-push sets NO socket timeout by default).
        { TTL: 6 * 3600, topic: "morning-bell", timeout: 10_000 } as any,
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
  // AUDIT #4 (5): getTimezoneOffset swallows invalid tz strings and falls back to Boston —
  // which would ring "8am" at the wrong hour of the user's real day. Validate the tz
  // ourselves: malformed → null → skipped, per the header contract (skip, don't guess).
  try { new Intl.DateTimeFormat("en-US", { timeZone: tz }); } catch { return null; }
  try {
    const offset = getTimezoneOffset(tz, new Date()); // hours
    const local = new Date(Date.now() + offset * 3600000);
    return { date: local.toISOString().slice(0, 10), hour: local.getUTCHours() };
  } catch { return null; }
}

const MORNING_HOUR = 8; // 8am local — v1 fixed; per-user hour is a later dial

// THE ECLIPSE LINES — David's words lead (2026-07-18: "solar forces you to look in the dark.
// lunar the circuit board gets overloaded. So your light is yours to tend. isn't it?"); the
// LLM's per-eclipse line joins the pool as understudy. Date-picked like every other pool.
const DAVID_ECLIPSE: Record<"solar" | "lunar", string[]> = {
  solar: [
    "Solar eclipse today — it forces you to look in the dark. Your light is yours to tend, isn't it?",
    "Solar eclipse today — it forces you to look in the dark. Don't be scared. It's just your shadow.",
    "A 5, 6, 7, 8! Right on time — the sky nails its choreo today, and the lights go out.",
  ],
  lunar: [
    "Lunar eclipse today — the circuit board gets overloaded. Your light is yours to tend, isn't it?",
    "A 5, 6, 7, 8! Right on time — the sky nails its choreo today, and the lights go out.",
  ],
};
const ECLIPSE_LINE_MEMO = new Map<string, string>();
async function eclipseBellLine(date: string, type: "solar" | "lunar"): Promise<string> {
  const memoKey = `${date}:${type}`;
  let llm = ECLIPSE_LINE_MEMO.get(memoKey);
  if (!llm) {
    const { generateEclipseBellLine } = await import("./narrative/generate.js");
    llm = (await generateEclipseBellLine(type)) ?? "";
    ECLIPSE_LINE_MEMO.set(memoKey, llm);
  }
  const pool = [...DAVID_ECLIPSE[type], ...(llm ? [llm] : [])];
  return pickLine(pool, date);
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
  // Ordinary mornings rotate the greeting with TRIVIA (David: "people like to learn fun shit
  // like this — tidbits"). Every fact verified true; every line his to veto or rewrite.
  stage: [
    "Let's see how the stage is set today.",
    "Planets never actually move backward. Retrograde is an illusion — a slower car seeming to slip back as you pass it.",
    "In a lunar eclipse the Moon turns rust-red: it's lit by every sunrise and sunset on Earth at once.",
    "The Moon is 400 times smaller than the Sun — and 400 times closer. An eclipse is an exact fit.",
    "Every eclipse returns after 6,585 days — a third of the world further west each time.",
    "In Vedic time, the day begins with the light.", // David's rewrite of my longer version
    "Mercury is retrograde about one day in five. You've survived every single one.",
    "In an eclipse, nothing touches anything. It's pure alignment — geometry so perfect it erases the light.",
    "Let's see how the stage is set today.",
  ],
};
// Planet pronouns (David's pantheon canon, 2026-07-18): the Moon is THEY — Chandra is male in
// the Vedas, "a horny whoring polygamist with a fucking harem, each in her own palace": the 27
// nakshatra wives ARE the lunar mansions, one palace visited per night (Tara Bala's mythic skin).
// David renders them They. Venus = She until he says otherwise; the rest He.
const PRONOUN: Record<string, string> = { Venus: "She", Moon: "They" };
async function skyLineFor(localDate: string, isCrownDay = false): Promise<string> {
  try {
    // 0 · THE CROWN — the top rung of David's blessed ladder (crown > eclipse > retroshade >
    // waterfalls > horizon > ordinary). POOL.crown has carried his line since it was written and
    // NOTHING EVER READ IT: the selector went straight to eclipses, so a crowned day — one of the
    // twelve apex days of a person's whole solar year — rang the ordinary stage line. The rung is
    // PERSONAL, which is why it sat unwired while every other rung is collective; the caller now
    // resolves it per user and passes it in. Unlike the rungs below it this one cannot be derived
    // from `marks`, so it is checked first and separately.
    if (isCrownDay) return pickLine(POOL.crown, localDate);
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
    // (Slot still awaiting David's words: none — eclipse day is LLM-written, crown day is wired.)
  } catch { /* sky unavailable — the default line never fails */ }
  return pickLine(POOL.stage, localDate);
}

/** IS TODAY ONE OF THIS PERSON'S TWELVE CROWNED DAYS? (v808)
 *  The crown rung is the only PERSONAL rung on the bell's ladder, which is why it sat unwired while
 *  the collective rungs were all built. It reads the SAME ranked solar year the calendar and the
 *  reading were repointed to in v778/v781 — one definition of a crown day across every surface, so
 *  the bell can never announce an apex the calendar does not show.
 *  Fails SILENTLY to false: a bell that rings the ordinary line is a small loss, a bell that throws
 *  costs the user their morning entirely. The ranked year is memoised in-process on the natal
 *  inputs, so this is one cached lookup per subscribed user per morning, not a fresh 366-day walk. */
async function isCrownDayFor(userId: number, localDate: string): Promise<boolean> {
  try {
    const { getActiveProfile } = await import("./routers/profiles.js");
    const { getUserById } = await import("./db.js");
    const profile = await getActiveProfile(userId);
    if (!profile) return false;
    const user = await getUserById(userId);
    const { rankedSolarYearForProfile } = await import("./vedic/ranked-year.js");
    for (const offset of [0, -1, 1]) {   // the solar year boundary can fall either side of today
      const ranked = await rankedSolarYearForProfile(profile, user, offset);
      const top: string[] = ranked?.summary?.topDates ?? [];
      if (top.includes(localDate)) return true;
    }
    return false;
  } catch {
    return false;
  }
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
  // Group every subscription row per user so the dedupe sees ALL devices, not an
  // arbitrary first row (AUDIT #4, 9).
  const byUser = new Map<number, { name: string | null; tz: string | null; pushes: (string | null)[] }>();
  for (const r of rows) {
    const u = byUser.get(r.userId) ?? { name: r.name, tz: r.tz, pushes: [] };
    u.pushes.push(r.lastMorningPush ?? null);
    byUser.set(r.userId, u);
  }

  // THE BELL IS ON THE SAME LOCATION PRECEDENCE AS EVERY OTHER SURFACE (v808).
  // It read users.locationTimezone and NOTHING else, so anyone who never set a current location had
  // no clock, was skipped by the hour check, and never received a morning bell — permanently. The
  // app already knows their timezone: every profile carries a hometown (backfilled from birth) and a
  // birth timezone, and resolve-day-sky's standing order is current → hometown → birth. The bell was
  // the one surface off that order. It is not any more. Only users still missing a clock are looked
  // up, so a fully-located userbase costs nothing.
  // forEach, not a spread: this file's tsconfig target rejects Map iteration without
  // downlevelIteration, and adding to that error count while fixing a bug is not a trade.
  const needTz: number[] = [];
  byUser.forEach((u, id) => { if (!u.tz) needTz.push(id); });
  if (needTz.length) {
    const fallbacks = await db
      .select({
        userId: profiles.userId,
        hometownTimezone: profiles.hometownTimezone,
        birthTimezone: profiles.birthTimezone,
        userBirthTz: users.birthTimezone,
      })
      .from(profiles)
      .innerJoin(users, eq(users.id, profiles.userId))
      .where(and(inArray(profiles.userId, needTz), eq(profiles.isOwner, true)));
    for (const f of fallbacks) {
      const u = byUser.get(f.userId);
      if (!u || u.tz) continue;
      u.tz = f.hometownTimezone ?? f.birthTimezone ?? f.userBirthTz ?? null;
    }
  }
  for (const [userId, u] of byUser) {
    const clock = localClock(u.tz);
    if (!clock || clock.hour !== MORNING_HOUR) continue;
    const anyRungToday = u.pushes.some((p) => p === clock.date);
    // CLAIM BEFORE SEND (AUDIT #4, 2+3): atomically stamp the date on this user's
    // unstamped rows. Zero rows claimed → another instance/tick already owns today.
    // Stamping FIRST inverts every failure mode the old send-then-stamp had: a crash,
    // a hanging endpoint, or a failing push service now costs one missed bell instead
    // of a double-ring or a 60-attempts-per-morning retry hammer (e.g. rotated VAPID
    // keys → 403 forever → the old code hammered every subscriber every minute).
    const res: any = await db.update(pushSubscriptions)
      .set({ lastMorningPush: clock.date })
      .where(and(eq(pushSubscriptions.userId, userId), or(isNull(pushSubscriptions.lastMorningPush), ne(pushSubscriptions.lastMorningPush, clock.date))));
    const claimed = Number(res?.[0]?.affectedRows ?? res?.rowsAffected ?? 0);
    if (claimed === 0) continue;      // nothing new to claim — already rung
    if (anyRungToday) continue;       // a device added mid-morning: stamp it, don't re-ring the user
    const first = (u.name ?? "").trim().split(/\s+/)[0] || "friend";
    await sendPushToUser(userId, {
      // Title is the BRAND line ("Velea" above the greeting — David 2026-07-18: the
      // "Good morning" title made iOS render a redundant "from Velea" second line).
      title: "Velea",
      body: `Good morning, ${first}! ${await skyLineFor(clock.date, await isCrownDayFor(userId, clock.date))}`, // the day's sky picks the line — David's words, engine-chosen
      url: "/",
    });
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
  let ticking = false; // AUDIT #4 (2): a slow tick must not overlap the next one
  setInterval(() => {
    if (ticking) return;
    ticking = true;
    morningBellTick().catch((e) => console.warn("[push] tick failed:", e)).finally(() => { ticking = false; });
  }, 60_000);
  console.log(`[push] morning bell scheduler started (configured: ${pushConfigured()})`);
}
