/** What changes if the CITED nakshatra table wins (David's ruling, 2026-07-20). */
import tables from "../vedic/canon/muhurta-tables.json" with { type: "json" };
import { NAKSHATRA_MODIFIERS } from "../panchang/modifier-config.js";

// Derived from the canon's OWN supports/avoid text for each nature — not from taste.
const NATURE_SCORE: Record<string, { score: number; category: string; why: string }> = {
  movable: { score: +1, category: "Upgrade", why: "travel, moves, change of direction — outward movement" },
  swift:   { score: +1, category: "Upgrade", why: "quick errands, trade, learning, healing — light and outward" },
  fixed:   { score: +1, category: "Upgrade", why: "foundations, construction, vows — beginnings meant to last" },
  tender:  { score: 0,  category: "Selective", why: "love, art, gentle beginnings; avoid confrontation — precision, not push" },
  mixed:   { score: 0,  category: "Neutral", why: "routine and mundane; the canon says avoid the extremes, neither launch nor cut" },
  sharp:   { score: -1, category: "Downgrade", why: "decisive cuts, endings, confrontation; avoid gentle beginnings" },
  fierce:  { score: -1, category: "Downgrade", why: "force, demolition, ruthlessness; avoid almost everything gentle, beginnings, journeys" },
};

const nat: Record<string, any> = (tables as any).nakshatraNature;
const rows: Array<[string, string, number, number]> = [];
for (const [nature, v] of Object.entries(nat)) {
  if (nature.startsWith("_")) continue;
  for (const star of (v as any).nakshatras as string[]) {
    const now = NAKSHATRA_MODIFIERS[star];
    rows.push([star, nature, now ? now.score : NaN, NATURE_SCORE[nature].score]);
  }
}
const changed = rows.filter(([, , a, b]) => a !== b);
console.log(`${rows.length} stars · ${changed.length} change · ${rows.length - changed.length} already agree\n`);
console.log("star                nature    now   canon");
for (const [s, n, a, b] of changed.sort((x, y) => x[1].localeCompare(y[1])))
  console.log(`${s.padEnd(19)} ${n.padEnd(9)} ${String(a).padStart(3)}  →  ${String(b).padStart(3)}`);
console.log("\nunchanged, by nature:");
const ok: Record<string, number> = {};
for (const [, n, a, b] of rows) if (a === b) ok[n] = (ok[n] ?? 0) + 1;
console.log(" ", JSON.stringify(ok));
