import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join } from "node:path";

/**
 * QUARANTINE TRIPWIRES (v843) — modules that are dead AND stale, so that wiring one is a
 * deliberate act rather than an accident.
 *
 * The reach sweep (v842, re-run here with controls) asks a different question from test coverage:
 * not "is this module tested" but "does anything in PRODUCTION import it". 59 production modules
 * are reached by no other production module. Most are vendored shadcn ui/* primitives, which is
 * expected and fine. Two are not:
 *
 *   server/vedic/meaning-engine.ts   — 159 lines, imported by NOTHING but its own test.
 *   client/src/components/CheckInCard.tsx — 241 lines, imported by nothing; the live check-in
 *                                           lives in pages/Planner.tsx.
 *
 * meaning-engine.ts is the pre-rebuild INVENTED meaning layer — the thing David's ground-up rebuild
 * exists to replace — and it contradicts a doctrine that is live in the prompt today. Its own test
 * passes happily: it asserts style ("avoids mystical language", "uses operational language") and
 * never asks whether the content is still Velea's method. A green test on a dead, stale module is
 * worse than no test, because it reads as assurance.
 *
 * I did NOT delete either file — deleting is David's call, and CheckInCard in particular may be a
 * deliberate spare. What is mine to do is make the staleness impossible to wire by accident.
 *
 * NOTE ON A CLAIM I NEARLY MADE: I also flagged meaning-engine's 10th house ("career, public role")
 * as contradicting the "dharma is identity, not work" doctrine. It does NOT — prompts.ts:600 reads
 * "10th — Your work in the world: career, public standing, reputation, authority". I was quoting my
 * own memory of a rule instead of the rule. Only the 2nd-house conflict below is real.
 */

const ROOT = new URL("../../", import.meta.url).pathname;

function productionFiles(dir: string): string[] {
  const out: string[] = [];
  const walk = (d: string) => {
    for (const e of readdirSync(d)) {
      if (["node_modules", "dist", "build", ".git"].includes(e)) continue;
      const p = join(d, e);
      if (statSync(p).isDirectory()) { walk(p); continue; }
      if (!/\.(ts|tsx)$/.test(p)) continue;
      if (/\.test\.tsx?$/.test(p)) continue;
      if (p.includes(`${"/"}scripts${"/"}`)) continue;
      out.push(p);
    }
  };
  walk(join(ROOT, dir));
  return out;
}

const PROD = [...productionFiles("server"), ...productionFiles("client/src")];
const importersOf = (base: string, selfSuffix: string) =>
  PROD.filter((f) => !f.endsWith(selfSuffix))
    .filter((f) => new RegExp(`["'][^"']*/${base}(\\.(js|ts|tsx))?["']`).test(readFileSync(f, "utf8")));

describe("the reach sweep can tell reached from unreached", () => {
  // CONTROLS. I got the previous enumeration wrong twice by trusting a regex I had not tested
  // against a known answer, so the sweep now proves itself on both sides before reporting anything.
  it("sees a known-live module as reached", () => {
    // day-read-signals JOINED this list on 2026-07-23: it was the dead-module fixture below for
    // months (ask #14, "179 lines nobody calls") until David ruled "wire it" and it became the day
    // read's precision nudge. Its move from the dead control to the live one IS the wiring, proven.
    for (const live of ["input-builder", "life-areas", "affliction", "day-read-signals"]) {
      expect(importersOf(live, `${live}.ts`).length, `${live} should be reached`).toBeGreaterThan(0);
    }
  });

  it("sees a known-dead module as unreached", () => {
    // The standing dead-but-present control (quarantined below): a real orphan, not a deleted file.
    expect(importersOf("CheckInCard", "CheckInCard.tsx")).toEqual([]);
  });
});

describe("meaning-engine.ts is DELETED (David's call, 2026-07-20)", () => {
  // It was 159 lines imported by nothing but its own test — the pre-rebuild invented meaning layer,
  // still hardcoding "self-worth" as a default 2nd-house theme against the live prompt doctrine.
  // David: "Delete it?" It is gone, and git holds it if it is ever wanted back.
  it("is really gone, and nothing imports it", () => {
    expect(existsSync(join(ROOT, "server/vedic/meaning-engine.ts"))).toBe(false);
    expect(importersOf("meaning-engine", "meaning-engine.ts")).toEqual([]);
  });
});

describe("CheckInCard.tsx is quarantined", () => {
  it("is unimported, while the live check-in lives in Planner", () => {
    // Not a doctrine conflict — just 241 lines of orphaned UI that will drift silently. Recorded so
    // it is a choice (delete it, or restore it) rather than a thing nobody knows is there.
    expect(importersOf("CheckInCard", "CheckInCard.tsx")).toEqual([]);
    const planner = readFileSync(join(ROOT, "client/src/pages/Planner.tsx"), "utf8");
    expect(planner).toMatch(/checkIn|check-in/i);
  });
});
