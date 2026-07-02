#!/usr/bin/env node
/** One-off: observe live pressure-layer output for a user. */
import "dotenv/config";
import { getUserByEmail, getTasksByUser } from "../db.js";
import { resolveAstrologySubject } from "../astrology-subject.js";
import { getCurrentLayers } from "../layers/index.js";
import { layerEffect } from "../task-scorer.js";
import { themeTags } from "../layers/time-lord-theme.js";

async function main() {
  const email = process.argv[2] ?? "david@velea.local";
  const user = await getUserByEmail(email);
  if (!user) { console.error("No user:", email); process.exit(1); }

  const subject = await resolveAstrologySubject(user.id);
  if (!subject) { console.error("No astrology subject for", email); process.exit(1); }

  const layers = await getCurrentLayers(subject);

  console.log("\n=== LAYERS for", email, "(profile", subject.profileId + ") ===");
  console.log("Time Lord period:", layers.timeLordPeriod
    ? `${layers.timeLordPeriod.mahaDasha} / ${layers.timeLordPeriod.antarDasha} — "${layers.timeLordPeriod.theme}"`
    : "(null — missing data)");
  console.log("Active transits:", layers.transits.active.length === 0
    ? "(none in 3° orb)"
    : layers.transits.active.map((t) => `${t.transitingPlanet}→natal ${t.natalPoint} (${t.orb}°, ${t.severity})`).join(", "));

  const tasks = await getTasksByUser(user.id, subject.profileId ?? null);
  const active = tasks.filter((t) => !t.isCompleted);
  console.log(`\n=== TASK BUBBLE PREVIEW (${active.length} active tasks) ===`);
  let anyBubbles = false;
  const tags = layers.timeLordPeriod
    ? themeTags(layers.timeLordPeriod.mahaDasha as any, layers.timeLordPeriod.antarDasha as any)
    : [];
  for (const t of active) {
    const { multiplier, bubbles } = layerEffect(t, layers);
    if (bubbles.length > 0 || multiplier !== 1) {
      anyBubbles = anyBubbles || bubbles.length > 0;
      const hay = `${t.title ?? ""} ${(t as any).projectName ?? ""}`.toLowerCase();
      const matched = tags.filter((tag) => (tag.includes(" ") || tag.includes("-")) ? hay.includes(tag) : hay.split(/[^a-z]+/).includes(tag));
      console.log(`  [${t.mode}] "${t.title}"  proj=${(t as any).projectName ?? "—"}  → x${multiplier.toFixed(3)}  match:[${matched.join(",")}]  ${bubbles.join(" | ")}`);
    }
  }
  if (!anyBubbles) console.log("  (no task earns a positive chip right now — graceful empty state)");
  console.log();
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
