/**
 * One-off backfill: persist the two Aug-12-2026 eclipse reads David already generated (Career +
 * Money) as frozen horoscope snapshots, SCRUBBED — so he doesn't re-spend a fire on reads he's
 * already seen. These were generated before the lifeArea column existed, so they never saved.
 * The prose is verbatim what the app returned; scrubMachinery() strips the one leaked term
 * ("debilitation") from the Money read. question is "" (the horoscope page doesn't render it).
 *
 *   DATABASE_URL='mysql://…' npx tsx server/scripts/backfill-eclipse-snapshots.ts
 * Idempotent: insertHoroscope no-ops if the (profile,date,area) snapshot already exists.
 */
import { sql } from "drizzle-orm";
import { getDb, insertHoroscope } from "../db.js";
import { scrubMachinery } from "../narrative/generate.js";
import { PROMPT_VERSION, MODEL } from "../narrative/prompts.js";

const PROFILE_ID = 30001; // the profile that owns the existing 7/29 horoscope (David's active profile)
const DATE = "2026-08-12";

const career = {
  scene: "Your career lord is running on fumes right now — not broken, but stripped of its usual ease, pressing hard on your physical self and your sense of standing at once. Add a solar eclipse landing today, and the territory is genuinely unsettled: results are unreliable, visibility is distorted, and any move toward title or power made right now is built on unstable ground. This is a day to observe, not to push.",
  story: "The architecture underneath your career is more solid than the surface suggests. Go deeper: the grit and staying power that drives real achievement — your capacity to do hard things over time — sits in its own home in the career's deep picture, utterly at ease. That is the floor. It holds even when the surface is strained. What you have built through discipline, through the long slow grind of daily obligation, is real and it is not going anywhere. The surface ruler of your career territory — the voice, the intelligence, the capacity to manage authority — sits at a genuinely charged threshold in the deep chart, in the house of one-on-one positioning. Midpoint between the birth chart (where it lives in crisis territory, handling what others cannot) and the deep career picture (where it faces others directly), this is someone whose career works through navigating high-stakes terrain on behalf of, or in direct negotiation with, other people. Power is not held alone here; it is earned through the encounter. Rahu lives in your career house natally — ambition runs large, originality is genuine, and there is always a hunger for more standing, more reach, more authority. That hunger is not a flaw; it is the engine. But Rahu in the fine texture of this season means the amplification is at full volume right now, and the eclipse adds noise. Status moves made today will not land where you aim them.",
  tilt: "Hold the line on what you have already built — the staying power, the track record, the daily discipline. None of that is at risk. What to avoid: any bid for new title, visibility, or authority today. The eclipse window distorts how such moves are received; what looks like a strong play now reads differently once the air clears. The honest posture across your career territory today is consolidation — tend the work that is already in motion, protect the relationships that hold your standing, and let ambition wait three days.",
  closeLine: "The floor of your career is solid; the ceiling is temporarily obscured — don't reach for it today.",
  question: "",
};

const money = {
  scene: "The money picture is strained right now, and today sharpens that. The ruler of your income and wealth is running hollow — not broken, but operating below its ceiling, promising more than it currently pays out. Today it lands exactly on the part of your chart that governs the effort required to meet obligations, which makes the cost visible. Meanwhile, the solar eclipse window — peaking today — makes this a poor moment to lock in financial decisions. The ground is unsettled; what looks clear may shift within days.",
  story: "The standing picture of your money has two faces. On the surface, wealth sits in a house occupied by Jupiter — expansion, banks, other people's money, inheritance — which sounds promising. But Jupiter here is fighting its environment, holding a position where it cannot operate with ease. The deep picture tells the truer story: in the wealth chart, both Jupiter and the Moon land in a friendly sign, and that is the floor that holds. The Moon — your sense of enough, the felt experience of sufficiency — has hard-won strength in your chart. It fell and recovered; what it produces is earned, not given, and it doesn't quit. That is real. The difficulty is the income ruler itself: Venus governs both your wealth and the belief and purpose that should feed it. In the deep chart it sits in enemy territory, stranded, hollow at its core. The money this area produces is real but capped — it costs more to generate than it looks from outside, and it rarely feels like enough because the ruler that should move it freely is working against friction. The part of your chart governing the daily effort to meet responsibilities — the grind, the obligations, what you owe — shows up as a quiet drain in the wealth picture: Mars in the deep chart sits in a position of debilitation and withdrawal, meaning the muscle you bring to financial challenges works harder than it returns. What this chart genuinely promises: a floor that holds, real assets and capacity, the ability to meet what you owe over time. What it asks you to be honest about: the ceiling is lower than the promise feels, and the effort cost is higher than it appears on paper.",
  tilt: "Today is not a day to negotiate rates, close a financial agreement, or move money into something new. The eclipse window is exact — results initiated now are unreliable, and the ruler of your wealth is at its weakest point in the sky. What this day does suit: review what you actually own versus what you owe, look at where the slow drain is happening, and name it plainly. Maintenance and honest accounting fit this energy far better than acquisition or commitment. The sense that money feels scarcer than it should is real information, not anxiety — use it to locate the specific leak, not to make a big move.",
  closeLine: "The floor holds — but today is for finding the drain, not opening a new tap.",
  question: "",
};

const scrub = (r: Record<string, string>) => Object.fromEntries(Object.entries(r).map(([k, v]) => [k, scrubMachinery(v)]));

async function main() {
  const db = await getDb();
  if (!db) { console.error("No DB."); process.exit(1); }
  const res: any = await db.execute(sql`SELECT userId FROM profiles WHERE id = ${PROFILE_ID} LIMIT 1`);
  const rows = Array.isArray(res?.[0]) ? res[0] : res;
  const userId = rows?.[0]?.userId;
  if (!userId) { console.error(`No profile ${PROFILE_ID}.`); process.exit(1); }
  console.log(`profile ${PROFILE_ID} → userId ${userId}`);

  for (const [area, read] of [["career", career], ["money", money]] as const) {
    const ok = await insertHoroscope({
      userId, profileId: PROFILE_ID, readingDate: DATE, lifeArea: area,
      promptVersion: PROMPT_VERSION, model: MODEL, content: JSON.stringify(scrub(read)),
    });
    console.log(`${ok ? "✅ saved" : "❌ failed"}: ${DATE} · ${area}  (debilitation scrubbed: ${JSON.stringify(scrub(read)).includes("debilitat") ? "NO — STILL PRESENT" : "yes"})`);
  }
  console.log("🪐 backfill complete.");
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
