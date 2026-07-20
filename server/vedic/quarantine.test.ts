import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
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
    for (const live of ["input-builder", "life-areas", "affliction"]) {
      expect(importersOf(live, `${live}.ts`).length, `${live} should be reached`).toBeGreaterThan(0);
    }
  });

  it("sees a known-dead module as unreached", () => {
    expect(importersOf("day-read-signals", "day-read-signals.ts")).toEqual([]);
  });
});

describe("meaning-engine.ts is quarantined", () => {
  const SRC = readFileSync(join(ROOT, "server/vedic/meaning-engine.ts"), "utf8");
  const importers = importersOf("meaning-engine", "meaning-engine.ts");

  it("carries a 2nd-house theme the live prompt doctrine bans as a default", () => {
    // prompts.ts: "do NOT reach for 'worth' or 'self-worth' as a default theme" — self-worth is the
    // SECOND face of the 2nd, surfaced only when a self-planet (Sun / Moon / 1st) actually links to
    // it. meaning-engine hardcodes it as one of four unconditional themes.
    expect(SRC).toMatch(/2: \{ name: "2nd House", themes: \[[^\]]*"self-worth"/);
    // Pinned as a FACT, not as prose. An earlier guard in this repo (docs-claims) pinned exact
    // wording and fired every time a correction was reworded while fully present. Whitespace-
    // tolerant regex: the rule can be re-typeset, it just cannot disappear.
    const PROMPTS = readFileSync(join(ROOT, "server/narrative/prompts.ts"), "utf8");
    expect(PROMPTS).toMatch(/do NOT reach for\s+"worth"\s+or\s+"self-worth"\s+as a default theme/);
  });

  it("is imported by NOTHING in production — and if that changes, this test is the alarm", () => {
    // THE TRIPWIRE. The moment someone wires this module, the stale doctrine ships with it. Failing
    // here is the intended behaviour: fix the content (or delete the module), then delete this test.
    expect(
      importers,
      `meaning-engine is now imported by ${importers.join(", ")} — it still hardcodes "self-worth" ` +
      `as a default 2nd-house theme, which the prompt doctrine forbids. Reconcile before wiring.`,
    ).toEqual([]);
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
