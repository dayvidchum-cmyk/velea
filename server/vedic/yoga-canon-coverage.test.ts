import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import canon from "./canon/yogas.json";

/**
 * EVERY CANON YOGA HAS A DETECTOR, AND EVERY DETECTOR HAS A NAMEPLATE (v825).
 *
 * The nameplate David asked for — "those yoga names might as well be written in Sanskrit" — comes
 * from canon/yogas.json. A detector whose name is not in the canon ships to the free shelf with NO
 * plain-language line; a canon entry with no detector is a rule the engine can never fire. Both are
 * the karakas-class drift (Jupiter missing from career for eight days), on a surface that is free
 * and visible.
 *
 * A NOTE ON THE PROBE ITSELF, because it matters more than the result. My first pass at this
 * scanned for `out["Name"] =` and `name: "Name"` and reported the five Pancha Mahapurusha yogas as
 * having no detector. They do — they are declared as array literals and assigned in a loop, and the
 * regex simply could not see that shape. Three checks of mine have now produced a false finding
 * today. This one matches ANY string literal in the module, which cannot miss a declared name.
 */
const SRC = readFileSync(new URL("./yoga-detect.ts", import.meta.url), "utf8");
const CANON_NAMES: string[] = ((canon as any).yogas as any[]).map((y) => y.name);
/** Every double-quoted string literal in the detector module. */
const LITERALS = new Set(Array.from(SRC.matchAll(/"([^"\\]{2,80})"/g), (m) => m[1]));

describe("yoga detectors vs canon/yogas.json", () => {
  it("the canon carries a real set — a check over nothing proves nothing", () => {
    expect(CANON_NAMES.length).toBeGreaterThan(30);
    expect(new Set(CANON_NAMES).size).toBe(CANON_NAMES.length); // no duplicate names
  });

  it.each(CANON_NAMES)("%s has a detector", (name) => {
    expect(LITERALS.has(name), `canon yoga "${name}" is never named in yoga-detect.ts`).toBe(true);
  });

  it("every detector key exists in the canon, so no yoga ships without a nameplate", () => {
    const keys = Array.from(SRC.matchAll(/out\["([^"]+)"\]\s*=/g), (m) => m[1]);
    expect(keys.length).toBeGreaterThan(20);
    const canonSet = new Set(CANON_NAMES);
    const orphans = keys.filter((k) => !canonSet.has(k));
    expect(orphans, "detected but absent from the canon — would ship with no plain-language line").toEqual([]);
  });

  it("the probe can actually fail — a name the canon does not have is not found", () => {
    // Guards against the opposite error: a matcher so permissive that everything "passes".
    expect(LITERALS.has("Definitely Not A Yoga")).toBe(false);
  });
});
