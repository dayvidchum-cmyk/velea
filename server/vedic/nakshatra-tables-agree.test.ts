/**
 * THE 27 STARS LIVE IN ONE PLACE — and nothing may fork the order-table.
 *
 * History: David, 2026-07-21: "Is spelling differences throwing this off?" — measured, files each
 * kept their own copy of the 27-star array and positions had diverged (Mrigashira/Mrigashirsha,
 * Dhanishtha/Dhanishta). The failure is SILENT: a divergent spelling makes a `findIndex(name)`
 * lookup return -1, the caller's `if (idx >= 0)` guard skips, and the reader simply never gets a
 * crown / tara / apex day. Nothing throws.
 *
 * 2026-07-22 (open-issue #2, David: "consolidate the 27 star names… the glossary too"): every flat
 * sidereal-order copy across server AND client was replaced by one canonical export,
 * `shared/nakshatra-names.ts`, that all modules import (`@shared/nakshatra-names`). This test changed
 * shape with them: it proves there are no order-array copies left to disagree, and that the human
 * Glossary's 27 nakshatra terms match the canon exactly. Name-KEYED data (each star's ruling planet,
 * bird, glossary definition) legitimately lives keyed by these names — that is not a fork, so the
 * detector only flags flat ARRAYS of the names, never `{ "Ashwini": … }` maps.
 */
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "fs";
import { join } from "path";
import { NAK27 } from "./nakshatra-names.js";

const ROOT = join(__dirname, "..", "..");

// The one true spelling, hardcoded HERE so this test is an INDEPENDENT source of truth (not a
// tautology against the file it guards).
const EXPECTED = [
  "Ashwini", "Bharani", "Krittika", "Rohini", "Mrigashira", "Ardra", "Punarvasu", "Pushya", "Ashlesha",
  "Magha", "Purva Phalguni", "Uttara Phalguni", "Hasta", "Chitra", "Swati", "Vishakha", "Anuradha",
  "Jyeshtha", "Mula", "Purva Ashadha", "Uttara Ashadha", "Shravana", "Dhanishtha", "Shatabhisha",
  "Purva Bhadrapada", "Uttara Bhadrapada", "Revati",
];
const NAKSET = new Set(EXPECTED);

// The files allowed to hold the literal table: the canonical source and this test.
const CANONICAL = join("shared", "nakshatra-names.ts");
const SELF = join("server", "vedic", "nakshatra-tables-agree.test.ts");

function walk(dir: string, out: string[] = []): string[] {
  for (const ent of readdirSync(join(ROOT, dir), { withFileTypes: true })) {
    const rel = join(dir, ent.name);
    if (ent.isDirectory()) {
      if (["node_modules", "dist", ".git", "build"].includes(ent.name)) continue;
      walk(rel, out);
    } else if ((ent.name.endsWith(".ts") || ent.name.endsWith(".tsx")) && !ent.name.endsWith(".test.ts") && !ent.name.endsWith(".test.tsx")) {
      out.push(rel);
    }
  }
  return out;
}

/** True if the file contains a FLAT array literal holding ≥20 of the 27 star names as elements.
 *  A name-keyed map `{ "Ashwini": … }` never matches (its names are followed by ':', and the object
 *  braces aren't the `[ … ]` we scan). This is the "forked order-table" signature. */
function hasForkedArray(src: string): boolean {
  for (const m of src.matchAll(/\[([^\[\]]*?)\]/gs)) {
    const names = [...m[1].matchAll(/["']([^"']+)["']/g)].map((x) => x[1]).filter((n) => NAKSET.has(n));
    if (names.length >= 20) return true;
  }
  return false;
}

describe("the 27 nakshatras are single-sourced", () => {
  it("the canonical table has all 27 in the one true spelling", () => {
    expect(NAK27).toEqual(EXPECTED);
  });

  it("no module forks its own 27-star order-array (all must import the canonical one)", () => {
    const forks: string[] = [];
    for (const dir of ["server", "client/src", "shared"]) {
      for (const f of walk(dir)) {
        if (f === CANONICAL || f === SELF) continue;
        if (hasForkedArray(readFileSync(join(ROOT, f), "utf8"))) forks.push(f);
      }
    }
    expect(forks, `these files re-declare the 27-star order-array instead of importing @shared/nakshatra-names:\n${forks.join("\n")}`).toEqual([]);
  });

  it("the Glossary's 27 nakshatra terms match the canon exactly (spelling + completeness)", () => {
    const src = readFileSync(join(ROOT, "client/src/pages/Glossary.tsx"), "utf8");
    // Entries shaped { term: "X", category: "Nakshatra", … }
    const terms = [...src.matchAll(/term:\s*"([^"]+)"\s*,\s*category:\s*"Nakshatra"/g)].map((m) => m[1]);
    expect(new Set(terms), "a Glossary nakshatra term is misspelled or missing vs NAK27").toEqual(new Set(EXPECTED));
    expect(terms.length, "the Glossary should define each of the 27 exactly once").toBe(27);
  });

  // CONTROL, both directions — a blind detector would pass vacuously.
  it("the fork detector actually fires (negative control)", () => {
    expect(hasForkedArray(`const N = ${JSON.stringify(EXPECTED)};`), "a real order-array must trip the detector").toBe(true);
    expect(hasForkedArray('const x = ["Ashwini", "Bharani"];'), "a two-name array must NOT trip it").toBe(false);
    expect(hasForkedArray('const m = { "Ashwini": 1, "Revati": 2 };'), "a name-keyed map must NOT trip it").toBe(false);
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
