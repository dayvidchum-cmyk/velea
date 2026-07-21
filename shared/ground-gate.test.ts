import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { withholdGeneration, type GroundDecision } from "./ground-gate";

// THE DOOR GATE stands between a tap and a billed LLM call, so its rule gets a guard in every
// direction — including the two that must NOT withhold, which is where the damage would be.
describe("the door gate withholds generation only when nobody has been asked", () => {
  it("withholds when the profile has never answered", () => {
    expect(withholdGeneration("unasked")).toBe(true);
  });

  // BOTH answers open the door. David's ruling: a decline is a decision and is remembered, so the
  // door asks once per profile and never again. If a decline did not open it, declining would
  // silently cost the person every reading they own — the opposite of "remember, never ask again".
  it("does not withhold once an answer exists, whichever answer it was", () => {
    expect(withholdGeneration("confirmed")).toBe(false);
  });

  // THE ONE THAT MATTERS MOST. "unknown" means the question could not be asked: no database, or
  // the migration has not run and the column is absent. If this ever flipped to true, then on the
  // day the app deployed ahead of its migration EVERY reading for EVERY profile would silently
  // stop generating and fall back to static copy — an outage that looks like a working app.
  // Same class as the cacheDate outage: a missing piece of bookkeeping must never kill a read.
  it("never withholds when the question could not be asked at all", () => {
    expect(withholdGeneration("unknown")).toBe(false);
  });

  // Correctness by construction: exactly one of the three states withholds. Adding a fourth state
  // without deciding what it does to money will fail here rather than in production.
  it("exactly one decision state withholds a paid generation", () => {
    const all: GroundDecision[] = ["confirmed", "unasked", "unknown"];
    expect(all.filter(withholdGeneration)).toEqual(["unasked"]);
  });
});

// A CORRECT RULE WIRED TO NOTHING IS THE HOUSE SPECIALITY HERE — v884 shipped addresses and
// contacts "built but wired to nothing", and v885 was the wiring v884 claimed to have done. The
// rule above cannot protect a single dollar unless guardedGen actually calls it, and guardedGen
// holds a database connection, so no unit test can reach it. This reads the source instead.
describe("the rule is actually wired to the money", () => {
  const service = readFileSync(join(__dirname, "../server/narrative/service.ts"), "utf8");

  it("guardedGen consults the gate", () => {
    expect(service).toMatch(/withholdGeneration\(await groundDecision\(profileId\)\)/);
  });

  // It must sit INSIDE guardedGen — the one choke point all 17 generation sites pass through —
  // and not merely somewhere in the file. Anchored on the function's own signature so moving the
  // call out of it fails here.
  it("the gate is inside the one function every generation passes through", () => {
    const start = service.indexOf("async function guardedGen");
    expect(start).toBeGreaterThan(-1);
    const body = service.slice(start, start + 1800);
    expect(body).toMatch(/withholdGeneration/);
    // …and BEFORE the work is handed to singleFlight, or it would gate nothing: the generation
    // would already be under way.
    expect(body.indexOf("withholdGeneration")).toBeLessThan(body.indexOf("singleFlight"));
  });
});
