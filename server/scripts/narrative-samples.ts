#!/usr/bin/env node
/** Generate real Glance + Deep Read samples for a profile across given dates.
 *  Usage: tsx server/scripts/narrative-samples.ts [profileId] [YYYY-MM-DD ...]
 */
import "dotenv/config";
import { buildNarrativeInput } from "../narrative/input-builder.js";
import { resolveDaySkyForProfileId } from "../panchang/resolve-day-sky.js";
import { generateGlance, generateDeepRead, hasAnthropicKey } from "../narrative/generate.js";

async function main() {
  if (!hasAnthropicKey()) { console.error("No ANTHROPIC_API_KEY in env."); process.exit(1); }
  const profileId = Number(process.argv[2] ?? 1);
  const dates = process.argv.slice(3);
  if (!dates.length) { console.error("Pass at least one date."); process.exit(1); }

  for (const d of dates) {
    const input = await buildNarrativeInput(profileId, d, { dayLoc: await resolveDaySkyForProfileId(profileId, d) });
    console.log(`\n${"=".repeat(72)}`);
    console.log(`Profile ${input.subject.profileId} | ${d} | mode: ${input.panchang.mode} | profection H${input.profection.activatedHouse}/${input.profection.activatedSign} TL ${input.profection.timeLord} | dasha ${input.dasha?.mahaDasha.lord}-${input.dasha?.antarDasha.lord}`);
    console.log("=".repeat(72));

    const glance = await generateGlance(input);
    if (glance) {
      console.log("\nGLANCE:");
      console.log("  Narrative: " + glance.narrative);
      console.log("  Question:  " + glance.question);
    } else {
      console.log("\nGLANCE:\n  (null)");
    }

    const deep = await generateDeepRead(input);
    if (deep) {
      console.log("\nDEEP READ:");
      console.log("  Core Theme:        " + deep.coreTheme);
      console.log("  Why Now:           " + deep.whyNow);
      console.log("  Manifestations:    " + (deep.manifestations ?? []).map((m: any) => m.area + ": " + m.note).join(" | "));
      console.log("  The Lesson:        " + deep.developmentalTask);
      console.log("  Confidence:        " + deep.confidence.level + " — " + (deep.confidence.factors ?? []).join("; "));
    } else {
      console.log("\nDEEP READ: (null)");
    }
  }
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
