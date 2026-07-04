/**
 * Proof harness for server/panchang/dignity.ts — the dignity/placement strength method.
 * Verified against FIXED classical facts (the whole point of choosing this over Shadbala):
 *   (1) exaltation / debilitation / own / moolatrikona / friend / enemy tiers,
 *   (2) composite strength folds combustion + nodal penalties and bands the label,
 *   (3) live wired output — every transit carries a strength.
 *
 * Run: npx tsx server/scripts/dignity-check.ts
 */
import "dotenv/config";
import { dignityTier, strength } from "../panchang/dignity.js";
import { buildNarrativeInput } from "../narrative/input-builder.js";
import { resolveAstrologySubject } from "../astrology-subject.js";

let fails = 0;
const ok = (name: string, cond: boolean, detail = "") => {
  console.log(`${cond ? "PASS" : "FAIL"}  ${name}${detail ? "  — " + detail : ""}`);
  if (!cond) fails++;
};

async function main() {
  console.log("=== 1. DIGNITY tiers vs fixed classical facts ===");
  ok("Sun in Aries → exalted", dignityTier("Sun", "Aries") === "exalted");
  ok("Sun in Libra → debilitated", dignityTier("Sun", "Libra") === "debilitated");
  ok("Saturn in Aries → debilitated", dignityTier("Saturn", "Aries") === "debilitated");
  ok("Saturn in Libra → exalted", dignityTier("Saturn", "Libra") === "exalted");
  ok("Mars in Cancer → debilitated", dignityTier("Mars", "Cancer") === "debilitated");
  ok("Jupiter in Cancer → exalted", dignityTier("Jupiter", "Cancer") === "exalted");
  ok("Mercury in Virgo → exalted (sign precedence)", dignityTier("Mercury", "Virgo") === "exalted");
  ok("Venus in Virgo → debilitated", dignityTier("Venus", "Virgo") === "debilitated");
  ok("Venus in Pisces → exalted", dignityTier("Venus", "Pisces") === "exalted");
  // Own vs moolatrikona (degree-sensitive): Sun in Leo 10° = moolatrikona, 25° = own.
  ok("Sun in Leo 10° → moolatrikona", dignityTier("Sun", "Leo", 10) === "moolatrikona");
  ok("Sun in Leo 25° → own", dignityTier("Sun", "Leo", 25) === "own");
  ok("Mars in Scorpio → own", dignityTier("Mars", "Scorpio") === "own");
  // Friendship by the sign's lord: Sun in Cancer (Moon-ruled), Moon is Sun's friend → friend.
  ok("Sun in Cancer → friend (Moon friendly to Sun)", dignityTier("Sun", "Cancer") === "friend");
  // Saturn in Cancer (Moon-ruled), Moon is Saturn's enemy → enemy.
  ok("Saturn in Cancer → enemy (Moon hostile to Saturn)", dignityTier("Saturn", "Cancer") === "enemy");
  // Sun in Gemini (Mercury-ruled), Mercury neutral to Sun → neutral.
  ok("Sun in Gemini → neutral", dignityTier("Sun", "Gemini") === "neutral");
  // Shadow planets have no dignity.
  ok("Rahu → null (no dignity)", dignityTier("Rahu", "Taurus") === null);

  console.log("\n=== 2. COMPOSITE strength — affliction folding + label bands ===");
  ok("exalted & clear → dignified (5)", (() => { const s = strength("Jupiter", "Cancer", 5)!; return s.label === "dignified" && s.score === 5; })());
  ok("own but combust → drops a band (3-3=0 steady)", (() => { const s = strength("Mars", "Scorpio", 5, { combust: true })!; return s.score === 0 && s.label === "steady"; })());
  ok("debilitated & nodal → compromised (-5-2=-7)", (() => { const s = strength("Mars", "Cancer", 5, { nodal: true })!; return s.score === -7 && s.label === "compromised"; })());
  ok("neutral & clear → steady (0)", strength("Sun", "Gemini", 5)!.label === "steady");
  ok("enemy → weak (-2)", strength("Saturn", "Cancer", 5)!.label === "weak");
  ok("Rahu strength → null", strength("Rahu", "Taurus", 5) === null);

  console.log("\n=== 3. Live wired output — every transit carries a strength ===");
  const pid = (await resolveAstrologySubject(2) as any).profileId;
  const ni: any = await buildNarrativeInput(pid, "2026-07-03");
  const scored = ni.transits.filter((t: any) => t.strength);
  ok("all 7 non-node transits carry strength", scored.length === 7, `${scored.length}/7`);
  console.log("  " + ni.transits.map((t: any) => `${t.planet}:${t.strength ? t.strength.label + "(" + t.strength.score + ")" : "—"}`).join("  "));

  console.log(`\n${fails === 0 ? "ALL PASS ✓" : fails + " FAILED ✗"}`);
  process.exit(fails === 0 ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
