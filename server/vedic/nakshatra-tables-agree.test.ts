/**
 * EVERY NAKSHATRA TABLE IN THE REPO MUST SPELL THE 27 STARS IDENTICALLY.
 *
 * David, 2026-07-21: "Is spelling differences throwing this off?"
 *
 * It was not — measured: 7 tables, 2 of 27 positions diverged (Mrigashira/Mrigashirsha in
 * profection/transit-calculator.ts, Dhanishtha/Dhanishta in scripts/dump-snapshot.ts) and
 * neither was reachable by the string lookups that matter. Six live `NAK27.findIndex(name)`
 * lookups (routers, ranked-year, input-builder, crown x3) are all fed by the two chart engines,
 * and those agree with crown.ts on all 27 — so `birthNakIdx` never went to -1 and crown, tara
 * and personal apex never silently skipped.
 *
 * But it was one edit away from doing so, and the failure mode is SILENT: `findIndex` returns
 * -1, the caller's `if (birthNakIdx >= 0)` guard skips, and the reader simply never gets a
 * crown day. Nothing throws. That is why this is a test and not a comment.
 *
 * It also matters for a second reason now. Under David's architecture ruling the engine is the
 * sole source of facts handed to the narrative layer, so two spellings of one star inside the
 * same payload is a fact defect even when nothing computes wrongly — the time lord's nakshatra
 * came from transit-calculator ("Mrigashirsha") while every other block said "Mrigashira".
 *
 * The tables are read from SOURCE rather than imported, because most of them are module-private
 * consts. That is deliberate: a test that could only see the exported one would not have caught
 * either divergence.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import { NAK27 } from "../panchang/crown.js";

const ROOT = join(__dirname, "..", "..");

/** Every file carrying its own copy of the 27 stars. Add to this list, never fork the table. */
const FILES = [
  "server/dasha-calculator.ts",
  "server/profection/transit-calculator.ts",
  "server/sky/current-sky.ts",
  "server/vedic/natal-chart-engine.ts",
  "server/panchang/crown.ts",
  "server/scripts/dump-snapshot.ts",
  "server/birthchart/calculator.ts",
];

function tableIn(file: string): string[] | null {
  const src = readFileSync(join(ROOT, file), "utf8");
  const m = src.match(/(?:NAKSHATRAS|NAK27)\s*(?::[^=]*)?=\s*\[([\s\S]*?)\]/);
  if (!m) return null;
  const names = [...m[1].matchAll(/"([^"]+)"|'([^']+)'/g)].map((x) => x[1] ?? x[2]);
  return names.length === 27 ? names : null;
}

describe("nakshatra tables", () => {
  it("finds a 27-star table in every file that claims one", () => {
    for (const f of FILES) {
      const t = tableIn(f);
      expect(t, `${f}: no 27-entry nakshatra table parsed — did the shape change?`).not.toBeNull();
    }
  });

  it("spells all 27 stars identically in every copy", () => {
    const divergences: string[] = [];
    for (const f of FILES) {
      const t = tableIn(f);
      if (!t) continue;
      for (let i = 0; i < 27; i++) {
        if (t[i] !== NAK27[i]) divergences.push(`${f} #${i + 1}: "${t[i]}" != NAK27 "${NAK27[i]}"`);
      }
    }
    expect(divergences, `star names diverge — a findIndex lookup will silently return -1:\n${divergences.join("\n")}`).toEqual([]);
  });

  // CONTROL, both directions. Without it a broken parser returning null for every file would
  // make the test above pass vacuously — the "zero from an uncontrolled instrument" trap.
  it("the comparison can actually fail (negative control)", () => {
    const real = tableIn("server/panchang/crown.ts");
    expect(real).not.toBeNull();
    const mutated = [...real!];
    mutated[22] = "Dhanishta";                       // the exact divergence that existed
    expect(mutated).not.toEqual([...NAK27]);
    expect(real).toEqual([...NAK27]);                // and the unmutated one still matches
  });

  it("every canon star name resolves against NAK27", async () => {
    const tables = (await import("./canon/muhurta-tables.json", { with: { type: "json" } })).default as any;
    const known = new Set(NAK27.map((n) => n.toLowerCase()));
    const amrita: Record<string, string> = tables.amritaSiddhiYoga?.byWeekday ?? {};
    expect(Object.keys(amrita).length, "amritaSiddhiYoga.byWeekday is empty — instrument broken").toBeGreaterThan(0);
    for (const [day, star] of Object.entries(amrita)) {
      expect(known.has(String(star).toLowerCase()), `${day}: "${star}" is not a NAK27 name — Amrita Siddhi would never fire`).toBe(true);
    }
  });
});
