/**
 * THE STAGE, FOR A REAL CHART, TODAY — what the LLM would now receive instead of raw fields.
 *
 * David's shape check: the old payload sent {venusSign, venusHouse, venusDispositor,
 * mercuryRetrograde, saturnConjunctVenus} and made the model join them. This prints what
 * computeStage() resolves instead.
 *
 * Run: npx tsx server/scripts/stage-today.ts [YYYY-MM-DD] [lagnaSign]
 */
import { getSiderealLongitudes } from "../vedic/natal-chart-engine.js";
import { computeStage, STAGE_BODIES, type StageInput } from "../sky/stage.js";

const ZOD = ["Aries","Taurus","Gemini","Cancer","Leo","Virgo","Libra","Scorpio","Sagittarius","Capricorn","Aquarius","Pisces"];
const DATE = process.argv[2] ?? "2026-07-21";
const LAGNA = process.argv[3] ?? "Virgo";          // David's lagna
const VARA = ["Sun","Moon","Mars","Mercury","Jupiter","Venus","Saturn"];

async function main() {
  // The Moon is NOT in STAGE_BODIES — it is the camera, not an actor — so it is added
  // explicitly here. computeStage throws without it ("there is no camera").
  const bodies = [...STAGE_BODIES, "Moon"];
  const noon = new Date(`${DATE}T12:00:00Z`);
  const next = new Date(noon.getTime() + 86400000);
  const lon = (await getSiderealLongitudes(noon, bodies as any)) as Record<string, number>;
  const lonNext = (await getSiderealLongitudes(next, bodies as any)) as Record<string, number>;

  // Retrograde = longitude decreasing over 24h. Nodes are always retrograde.
  const retrograde: Record<string, boolean> = {};
  for (const b of bodies) {
    retrograde[b] = b === "Rahu" || b === "Ketu"
      ? true
      : (((lonNext[b] - lon[b] + 540) % 360) - 180) < 0;
  }

  // Combust: within 8° of the Sun (Sun and nodes excluded).
  const combust: Record<string, boolean> = {};
  for (const b of bodies) {
    if (b === "Sun" || b === "Rahu" || b === "Ketu") continue;
    combust[b] = Math.abs(((lon[b] - lon["Sun"] + 540) % 360) - 180) > 172;
  }

  const input: StageInput = {
    transitLon: lon,
    lagnaSignIdx: ZOD.indexOf(LAGNA),
    retrograde,
    combust,
    // David's live clock, printed earlier this session from his own profile.
    dasha: { maha: "Moon", antar: "Saturn", pratyantar: "Rahu" },
    annualTimeLord: "Venus",
    dayLord: VARA[new Date(`${DATE}T12:00:00Z`).getUTCDay()],
  };

  const stage = computeStage(input);

  console.log(`\n  THE STAGE — ${DATE}, ${LAGNA} lagna`);
  console.log(`  Book: ${input.dasha.maha} · Chapter/Protagonist: ${input.annualTimeLord} · day lord: ${input.dayLord}\n`);
  const cam = stage.camera;
  console.log(`  THE CAMERA (Moon) — ${cam.location.sign} · house ${cam.location.house} · ${cam.location.nakshatra}`);
  console.log(`     illuminates  ${cam.illuminates.theme.join(", ") || "—"}`);
  console.log(`     specifics    ${cam.illuminates.specifics.slice(0, 10).join(", ")}${cam.illuminates.specifics.length > 10 ? ", …" : ""}`);
  console.log(`     in frame     ${cam.inFocus.join(", ") || "—"}`);
  console.log(`     host         ${cam.host}${cam.hostCondition ? ` (${cam.hostCondition})` : ""}`);
  const n = stage.narrative;
  console.log();
  console.log(`  THE CAST SHEET`);
  console.log(`     narrativeState  ${n.narrativeState}`);
  console.log(`     camera          ${n.camera}`);
  console.log(`     chapterLead     ${n.chapterLead}`);
  console.log(`     sceneLead       ${n.sceneLead}`);
  console.log(`     supportingCast  ${n.supportingCast.join(", ") || "—"}`);
  if (n.stateNote) console.log(`     stateNote       ${n.stateNote}`);
  console.log();
  for (const c of stage.characters) {
    console.log(`  ${c.narrativeWeight.toUpperCase().padEnd(11)} ${c.character}${c.inFocus ? "  [in frame]" : ""}`);
    console.log(`     role       ${c.currentRole ?? "—"}`);
    console.log(`     location   ${c.location.sign} · house ${c.location.house} · ${c.location.nakshatra}`);
    console.log(`     host       ${c.host}${c.hostCondition ? ` (${c.hostCondition})` : ""}`);
    console.log(`     companions ${c.companions.join(", ") || "—"}`);
    console.log(`     condition  ${c.condition.join(" · ") || "—"}`);
    console.log();
  }
  console.log(`  TENSION: ${stage.tension ? `${stage.tension.name} — ${stage.tension.because}` : "none today (a statable state, not a blank)"}`);
  console.log(`\n  ── the Primary character, in the exact shape David specified ──`);
  console.log(JSON.stringify(stage.characters.find((c) => c.narrativeWeight === "Primary"), null, 2));
  console.log();
}

main().catch((e) => { console.error(e); process.exit(1); });
