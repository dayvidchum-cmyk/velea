/**
 * DUMP ECLIPSE DATA — read-only, no LLM. Prints the RAW engine data for a user's chart so you can
 * read the ground truth the reading is built from: the eclipse season (each eclipse's house, sign,
 * dispositor, the axis it pulls, tight natal hits), plus the STAGE (the year) and the CHAPTER
 * (profection + dasha + the year-lord's current room). No prose, no writes, no cost.
 *
 * The URL stays in YOUR terminal (migration law):
 *   DATABASE_URL='<railway url>' npx tsx scripts/dump-eclipse-data.ts dayvidchum@gmail.com [YYYY-MM-DD]
 */
import { eq } from "drizzle-orm";
import { getDb, getUserByEmail } from "../server/db.js";
import { profiles } from "../drizzle/schema.js";
import { buildNarrativeInput } from "../server/narrative/input-builder.js";

const email = process.argv[2] ?? "dayvidchum@gmail.com";
const dateStr = process.argv[3] ?? new Date().toISOString().slice(0, 10);

const j = (v: any) => JSON.stringify(v, null, 2);
const line = (s = "") => console.log(s);
const rule = (c = "─") => console.log(c.repeat(72));

async function main() {
  const db = await getDb();
  if (!db) { console.error("No DB (DATABASE_URL unset?)."); process.exit(1); }
  const user = await getUserByEmail(email);
  if (!user) { console.error(`No user ${email}.`); process.exit(1); }
  const myProfiles = await db.select().from(profiles).where(eq(profiles.userId, user.id));
  if (!myProfiles.length) { console.error("No profiles for user."); process.exit(1); }

  for (const p of myProfiles as any[]) {
    const lat = p.birthLocationLat ? parseFloat(p.birthLocationLat) : 0;
    const lon = p.birthLocationLon ? parseFloat(p.birthLocationLon) : 0;
    // dayLoc is required by the builder; the eclipse HOUSE placement comes from your lagna, not dayLoc,
    // so birth coords + utcOffset 0 are fine for grounding the placements.
    const input: any = await buildNarrativeInput(p.id, dateStr, { dayLoc: { lat, lon, utcOffset: 0 }, eclipseArc: true });

    rule("═");
    line(`PROFILE: ${p.name ?? "#" + p.id}   ·   as of ${dateStr}`);
    line(`Ascendant (lagna): ${input.natal?.lagna ?? "?"}   ·   birth: ${p.birthDate ?? "?"} ${p.birthTime ?? "(no time)"}`);
    rule("═");

    // ── THE STAGE (the year) ────────────────────────────────────────────
    line("\n▛ THE STAGE — the year you are standing in");
    rule();
    if (input.stage) line(j(input.stage)); else line("  (no stage block in payload)");

    // ── THE CHAPTER (profection · dasha · year-lord's room) ─────────────
    line("\n▛ THE CHAPTER — profection · dasha · the year-lord's current room");
    rule();
    line("PROFECTION:");            line(j(input.profection));
    line("\nDASHA (the running lords):"); line(j(input.dasha));
    line("\nTIME-LORD TRANSIT (the room the year is lived in now):"); line(j(input.timeLordTransit));

    // ── THE ECLIPSE SEASON (the raw arc) ────────────────────────────────
    const arc = input.eclipseSeasonArc;
    line("\n▛ THE ECLIPSE SEASON — where each eclipse lands in YOUR chart");
    rule();
    if (!arc || !arc.eclipses?.length) {
      line("  No eclipse season arc for this date (none within the window).");
    } else {
      line(`Window: ${arc.today} → ${arc.windowEnd}   ·   ${arc.count} eclipse(s) this season\n`);
      arc.eclipses.forEach((e: any, i: number) => {
        line(`  ── ECLIPSE ${i + 1} of ${arc.eclipses.length} ──`);
        line(`  Date:         ${e.date}   (${e.daysAway} days away)`);
        line(`  Type:         ${e.type}   ${e.type === "SOLAR" ? "(new-moon RESET)" : e.type === "LUNAR" ? "(full-moon CULMINATION)" : ""}`);
        line(`  Sign:         ${e.sign ?? "?"}`);
        line(`  House:        ${e.house ?? "?"}   →  ${e.houseGloss ?? "?"}`);
        line(`  Opposite:     ${e.oppositeHouse ?? "?"}   →  ${e.oppositeHouseGloss ?? "?"}   (the axis it pulls)`);
        if (e.houseFromMoon != null) line(`  From Moon:    house ${e.houseFromMoon}`);
        if (e.dispositor) line(`  Dispositor:   ${e.dispositor.planet ?? "?"}  ·  natal house ${e.dispositor.natalHouse ?? "?"}  ·  dignity: ${e.dispositor.dignity ?? "?"}`);
        if (e.hits?.length) {
          line(`  Natal hits:`);
          e.hits.forEach((h: any) => line(`      · ${h.point ?? "?"}  ·  orb ${h.orbDeg ?? "?"}°  ·  ${h.which ?? ""}`));
        } else {
          line(`  Natal hits:   none tight`);
        }
        line("");
      });
    }

    // ── THE ORIENTATION PAYLOAD (v0) ────────────────────────────────────
    line("\n▛ THE ORIENTATION PAYLOAD — what the layer hands the reading (Timeline · Authority · Personal)");
    rule();
    if (input.orientation) {
      line("TIMELINE (the running clocks this season sits inside):");
      line(j(input.orientation.timeline));
      line("\nAUTHORITY (which running lord each eclipse actually engages, via which relationship):");
      line(j(input.orientation.authority));
      line("\nCANON (the dispositor-ACTIVATED facet — narrowed from the raw house gloss):");
      for (const c of (input.orientation.canon ?? []) as any[]) {
        line(`  ${c.movement}  ·  house ${c.house} disposed by ${c.dispositor}`);
        line(`      activated: ${c.activated ?? "(silent → falls back to gloss)"}`);
        line(`      fallback gloss: ${c.fallbackGloss}`);
      }
      line("\nPERSONAL (each engaged actor, re-sourced from natalCondition — NOT the arc's thin dignity):");
      // print compact keys so it's readable; full objects can be large
      for (const [planet, cond] of Object.entries(input.orientation.personal as Record<string, any>)) {
        line(`  ${planet}: dignity="${cond.dignity ?? "?"}"  strength="${cond.strength ?? "?"}"  roles=${JSON.stringify(cond.roles ?? [])}`);
        if (cond.states?.length) line(`      states: ${JSON.stringify(cond.states)}`);
        if (cond.indicates) line(`      indicates: ${JSON.stringify(cond.indicates)}`);
      }
    } else {
      line("  (no orientation payload — input.orientation absent)");
    }

    // ── RAW APPENDIX — nothing hidden ───────────────────────────────────
    line("\n▛ RAW eclipseSeasonArc (full JSON, nothing omitted)");
    rule();
    line(j(arc));
  }
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
