/**
 * THE ALIGNED-FOR-TODAY AUTOPSY (audit issue #15, David flagged 2026-07-22).
 *
 * Replays the EXACT chain that fills the "Aligned for today" list, against whatever
 * DATABASE_URL points at, for one user's ACTIVE profile. READ-ONLY: no writes, no LLM,
 * no cache. It answers the one question the last session couldn't measure: which tasks
 * does the list show, and WHY was each other task dropped.
 *
 * Run (URL stays in YOUR terminal, per the no-auto-migrate law):
 *   DATABASE_URL='<railway url>' npx tsx scripts/diagnose-aligned.ts dayvidchum@gmail.com
 *
 * It prints four things:
 *   1. Today's computed MODE (the hard filter's right-hand side) + how it was derived.
 *   2. The four MODE-ORB counts (raw active tasks per mode) — seam #3.
 *   3. Every task: its mode, whether it PASSED the hard mode + due-date filter, its
 *      check-in csBand, hardMismatch, floor/base/score — seams #1 & #2.
 *   4. The FINAL aligned list after the client-side filters (pinned/completed/
 *      low-motivation-demanding/limit), in display order.
 *
 * What it deliberately OMITS: the soft lifts (handshake, meridian, domain, golden,
 * pressure layers). Those change the ORDER among equal-csBand tasks, never MEMBERSHIP —
 * and "wrong tasks" is a membership complaint. Order within a csBand tier is annotated
 * as approximate; membership is exact.
 */
import { getDb, getUserByEmail, getTasksByUser, getTodayCheckIn } from "../server/db.js";
import { resolveAstrologySubject } from "../server/astrology-subject.js";
import { resolveDaySky, localToday } from "../server/panchang/resolve-day-sky.js";
import { getActiveProfile, getProfileNatalBodies } from "../server/routers/profiles.js";
import { anchorsFromBodies, personalDayForDate } from "../server/panchang/crown.js";
import { scoreTasks, currentStateScore, type CurrentState } from "../server/task-scorer.js";

const email = process.argv[2] ?? "dayvidchum@gmail.com";
const pad = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1) + "…" : s.padEnd(n));

async function main() {
  const db = await getDb();
  if (!db) { console.error("No DB (DATABASE_URL unset?). Aborting."); process.exit(1); }

  const user = await getUserByEmail(email);
  if (!user) { console.error(`No user for ${email}.`); process.exit(1); }

  const subject = await resolveAstrologySubject(user.id);
  const activeProfile = await getActiveProfile(user.id);
  const profileId = subject?.profileId ?? activeProfile?.id ?? null;

  // The date frame the client uses (LOCAL, not UTC — the 8pm-Boston class).
  const dateStr = localToday(user as any, activeProfile as any);

  // ── Today's MODE — the same derivation the Planner uses: personalDayForDate's mode
  //    (modeByDate) takes priority; only if null does it fall back to the panchang mode. ──
  let todayMode: string | null = null;
  let modeSource = "";
  if (subject?.lagnaSign && profileId != null) {
    const sky = await resolveDaySky({ user: user as any, profile: activeProfile as any, profileId, dateStr });
    const bodies = await getProfileNatalBodies(profileId);
    const anchors = anchorsFromBodies(bodies as any, subject.lagnaSign);
    if (anchors) {
      const day = await personalDayForDate(anchors, dateStr, sky);
      todayMode = day?.mode ?? null;
      modeSource = `personalDayForDate (lagna ${subject.lagnaSign}, dayLoc ${sky.lat.toFixed(2)},${sky.lon.toFixed(2)} off ${sky.utcOffset})`;
    }
  }
  if (!todayMode) { todayMode = "Build"; modeSource = "FALLBACK → Build (personalDayForDate returned null)"; }

  const checkIn = await getTodayCheckIn(user.id, profileId);
  const currentState: CurrentState | null = checkIn ? {
    physicalEnergy: checkIn.physicalEnergy,
    mentalClarity: checkIn.mentalClarity,
    emotionalStability: checkIn.emotionalStability,
    creativeFlow: checkIn.creativeFlow,
    motivation: checkIn.motivation,
  } : null;

  const allTasks = await getTasksByUser(user.id, profileId);
  const active = allTasks.filter((t: any) => !t.snoozedUntil || t.snoozedUntil <= Date.now());

  console.log(`\n═══ ALIGNED-FOR-TODAY AUTOPSY — ${email} ═══`);
  console.log(`Date (local frame): ${dateStr}   Profile: ${profileId ?? "owner"}`);
  console.log(`TODAY'S MODE: ${todayMode}`);
  console.log(`  source: ${modeSource}`);
  console.log(`Check-in today: ${checkIn
    ? `phys ${checkIn.physicalEnergy} · mental ${checkIn.mentalClarity} · emo ${checkIn.emotionalStability} · creative ${checkIn.creativeFlow} · MOTIVATION ${checkIn.motivation}`
    : "NONE (no check-in today → csBand 0 for all, no motivation gate)"}`);
  console.log(`Total tasks: ${allTasks.length}  (active/un-snoozed: ${active.length})`);

  // ── 2. Mode-orb counts (seam #3): raw active tasks per mode, exactly as the orbs count. ──
  const orb = (m: string) => active.filter((t: any) => t.mode === m && !t.isCompleted).length;
  console.log(`\n── MODE ORBS (raw active count per mode) ──`);
  for (const m of ["Restraint", "Build", "Selective", "Action"]) {
    console.log(`  ${pad(m, 10)} ${orb(m)}${m === todayMode ? "   ← TODAY'S MODE (only these are eligible)" : ""}`);
  }
  const noMode = active.filter((t: any) => !["Restraint", "Build", "Selective", "Action"].includes(t.mode) && !t.isCompleted);
  if (noMode.length) console.log(`  (${noMode.length} active task(s) have an unrecognised mode: ${[...new Set(noMode.map((t: any) => JSON.stringify(t.mode)))].join(", ")})`);

  // ── 3. Per-task chain. Run the REAL scorer, then explain each task's fate. ──
  const scored = scoreTasks(allTasks as any, { todayMode, todayDate: dateStr, currentState });
  const scoredById = new Map(scored.map((s: any) => [s.id, s]));
  const today = new Date(dateStr);

  console.log(`\n── EVERY ACTIVE TASK — why it's in or out ──`);
  console.log(`  ${pad("title", 26)} ${pad("mode", 10)} ${pad("verdict", 34)} csBand  floor`);
  for (const t of active as any[]) {
    if (t.isCompleted) continue;
    let verdict = "";
    let csBand = 0, floor = 0;
    if (t.mode !== todayMode) {
      verdict = `OUT — mode≠today (${t.mode})`;
    } else if (t.dueDate) {
      const due = new Date(t.dueDate);
      const diffDays = Math.floor((today.getTime() - due.getTime()) / 86400000);
      if (diffDays < 0) verdict = `OUT — future due (${t.dueDate.split("T")[0]})`;
    }
    const s = scoredById.get(t.id) as any;
    if (!verdict && s) {
      const cs = currentState ? currentStateScore(t, currentState) : null;
      csBand = cs?.delta ?? 0;
      floor = (t.isPinned ? 1000 : 0) + (t.dueDate && t.dueDate.split("T")[0] < dateStr ? 500 : t.dueDate && t.dueDate.split("T")[0] === dateStr ? 300 : 0);
      verdict = "IN (ranked)";
      if (cs?.hardMismatch) verdict += " ⚠ hardMismatch";
      if (t.isPinned) verdict += " [pinned→own section]";
    }
    console.log(`  ${pad(String(t.title ?? ""), 26)} ${pad(String(t.mode), 10)} ${pad(verdict, 34)} ${String(csBand).padStart(5)}  ${String(floor).padStart(5)}`);
  }

  // ── 4. FINAL aligned list, reproducing the client filters exactly. ──
  const lowMotivation = (checkIn?.motivation ?? 5) <= 2;
  const isDemanding = (t: any) =>
    (t.cognitiveLoad && t.cognitiveLoad !== "Low") ||
    (t.physicalLoad && t.physicalLoad !== "Low") ||
    (t.emotionalLoad && t.emotionalLoad !== "Low") ||
    t.creativeRequired || t.socialRequired;
  const pinnedIds = new Set(scored.filter((t: any) => t.isPinned).map((t: any) => t.id));
  const final = scored.filter((t: any) => {
    if (pinnedIds.has(t.id)) return false;             // pinned render in their own section
    if (t.isCompleted) return false;
    if (lowMotivation && isDemanding(t)) return false;  // motivation master-gate
    return true;
  });

  console.log(`\n── FINAL "Aligned for today" list (client filters applied${lowMotivation ? ", LOW-MOTIVATION gate ON" : ""}) ──`);
  if (!final.length) console.log("  (empty)");
  final.forEach((t: any, i) => {
    console.log(`  ${String(i + 1).padStart(2)}. ${pad(String(t.title ?? ""), 30)} align ${String(t.alignment).padStart(3)}  — ${(t.reasons ?? []).slice(0, 2).join("; ")}`);
  });
  console.log(`\n(Order within one csBand tier is approximate here — soft lifts omitted. Membership is exact.)\n`);
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
