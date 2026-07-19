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
import { dignityTier, strength, ucchaBala, fivefoldMaitri, temporalRelation } from "../panchang/dignity.js";
import { buildNarrativeInput } from "../narrative/input-builder.js";
import { resolveDaySkyForProfileId } from "../panchang/resolve-day-sky.js";
import { resolveAstrologySubject } from "../astrology-subject.js";

let fails = 0;
const ok = (name: string, cond: boolean, detail = "") => {
  console.log(`${cond ? "PASS" : "FAIL"}  ${name}${detail ? "  — " + detail : ""}`);
  if (!cond) fails++;
};

async function main() {
  console.log("=== 0. UCCHA gradient vs fixed classical points ===");
  // On the exact points the gradient must hit its rails.
  ok("Sun at 10° Aries (lon 10) → 1.0", ucchaBala("Sun", 10)!.value === 1);
  ok("Sun at 10° Libra (lon 190) → 0.0", ucchaBala("Sun", 190)!.value === 0);
  ok("Jupiter at 5° Cancer (lon 95) → 1.0 peak", ucchaBala("Jupiter", 95)!.value === 1 && ucchaBala("Jupiter", 95)!.depth === "peak");
  ok("Moon at 3° Taurus (lon 33) → 1.0", ucchaBala("Moon", 33)!.value === 1);
  ok("Venus at 27° Pisces (lon 357) → 1.0", ucchaBala("Venus", 357)!.value === 1);
  ok("Saturn at 20° Libra (lon 200) → 1.0", ucchaBala("Saturn", 200)!.value === 1);
  ok("Mars at 28° Cancer (lon 118) → 0.0 hollow", ucchaBala("Mars", 118)!.value === 0 && ucchaBala("Mars", 118)!.depth === "hollow");
  // Continuity + symmetry: 90° from either point → 0.5 middling.
  ok("Sun at lon 100 (90° off) → 0.5", ucchaBala("Sun", 100)!.value === 0.5);
  ok("Sun at lon 280 (90° other side) → 0.5", ucchaBala("Sun", 280)!.value === 0.5);
  // Monotonic toward the point.
  ok("Sun 5° Aries < 10° Aries", ucchaBala("Sun", 5)!.value < 1 && ucchaBala("Sun", 5)!.value > 0.9);
  // Wrap-around safety (Venus point at 357).
  ok("Venus at 2° Aries (lon 2, wraps) ≈ 0.97", Math.abs(ucchaBala("Venus", 2)!.value - (1 - 5 / 180)) < 0.001);
  ok("Rahu → null (no consensus point)", ucchaBala("Rahu", 100) === null);
  ok("strength() carries uccha when lonDeg given", strength("Sun", "Aries", 10, { lonDeg: 10 })!.uccha!.value === 1);
  ok("strength() uccha null when lonDeg omitted", strength("Sun", "Aries", 10)!.uccha === null);

  console.log("=== 0b. PANCHADHA MAITRI vs the textbook's Einstein examples ===");
  // Worked examples from "The Art and Science of Vedic Astrology", Planetary Conditions ch.
  // Einstein (sidereal): Sun Pisces, Moon Scorpio, Mercury Aries, Venus Pisces,
  // Mars Capricorn, Jupiter Aquarius, Saturn Pisces.
  ok("Moon 9th from Sun → temporary enemy", temporalRelation("Pisces", "Scorpio") === "enemy");
  ok("Sun 2nd from Jupiter → temporary friend", temporalRelation("Aquarius", "Pisces") === "friend");
  ok("Sun→Moon: perm friend + temp enemy = neutral", fivefoldMaitri("Sun", "Moon", "Pisces", "Scorpio") === "neutral");
  ok("Jupiter→Sun: perm friend + temp friend = great friend", fivefoldMaitri("Jupiter", "Sun", "Aquarius", "Pisces") === "great_friend");
  // "Sun is in a great friends sign": Sun in Pisces, lord Jupiter in Aquarius (12th from Sun).
  ok("Sun in Pisces vs lord Jupiter → great_friend", fivefoldMaitri("Sun", "Jupiter", "Pisces", "Aquarius") === "great_friend");
  // "Mercury is in the sign of a friend (neutral + friend)": lord Mars in Cap, 10th from Aries.
  ok("Mercury in Aries vs lord Mars → friend", fivefoldMaitri("Mercury", "Mars", "Aries", "Capricorn") === "friend");
  // "Jupiter is in a friends sign (neutral + friend)": lord Saturn in Pisces, 2nd from Aquarius.
  ok("Jupiter in Aquarius vs lord Saturn → friend", fivefoldMaitri("Jupiter", "Saturn", "Aquarius", "Pisces") === "friend");
  // "Saturn is in a friend's sign (neutral + friend)": lord Jupiter in Aquarius, 12th from Pisces.
  ok("Saturn in Pisces vs lord Jupiter → friend", fivefoldMaitri("Saturn", "Jupiter", "Pisces", "Aquarius") === "friend");
  // Compound rails: enemy+enemy and same-sign temporal enemy.
  ok("Same sign → temporary enemy", temporalRelation("Leo", "Leo") === "enemy");
  ok("Sun→Saturn both in Leo: perm enemy + temp enemy = great_enemy", fivefoldMaitri("Sun", "Saturn", "Leo", "Leo") === "great_enemy");
  ok("Rahu → null (not classified)", fivefoldMaitri("Rahu", "Sun", "Leo", "Leo") === null);
  ok("strength() carries maitri when lordSign given", strength("Sun", "Pisces", 10, { lordSign: "Aquarius" })!.maitri!.compound === "great_friend");
  ok("strength() maitri null in own sign", strength("Sun", "Leo", 25, { lordSign: "Leo" })!.maitri === null);

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
  const ni: any = await buildNarrativeInput(pid, "2026-07-03", { dayLoc: await resolveDaySkyForProfileId(pid, "2026-07-03") });
  const scored = ni.transits.filter((t: any) => t.strength);
  ok("all 7 non-node transits carry strength", scored.length === 7, `${scored.length}/7`);
  console.log("  " + ni.transits.map((t: any) => `${t.planet}:${t.strength ? t.strength.label + "(" + t.strength.score + ")" : "—"}`).join("  "));

  console.log(`\n${fails === 0 ? "ALL PASS ✓" : fails + " FAILED ✗"}`);
  process.exit(fails === 0 ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
