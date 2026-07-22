import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

/**
 * THE ROAD-AHEAD VEIL MUST NOT LEAK DETAIL (2026-07-22).
 *
 * arc.forward is a locked premium surface. A free (non-entitled) user is shown a THIRST veil —
 * how much is ahead (the apex's relative timing, the crown count, the season-turn count) — but
 * NEVER the dates, the titles, or the milestone list. The gate is enforced server-side so the
 * client cannot leak what it never receives; this guard pins that the server actually strips it.
 *
 * A static scan, in the spirit of isolation.test.ts: it reads the two return branches and asserts
 * the veiled one carries no `milestones` and no calendar `date`, while the entitled one does carry
 * `milestones`. Runtime-mocking a full chart for one deterministic branch buys nothing this doesn't.
 */
const SRC = readFileSync(new URL("./arc.ts", import.meta.url), "utf8");

// The veiled branch is the body of `if (!entitled) { … }` up to its closing return's `}`.
const veilMatch = SRC.match(/if \(!entitled\) \{([\s\S]*?)\n    \}/);

describe("arc.forward veils the Road Ahead for the non-entitled", () => {
  it("has a distinct non-entitled branch", () => {
    expect(veilMatch, "the `if (!entitled)` veil branch is gone").not.toBeNull();
  });

  it("the veiled payload leaks NO milestone list", () => {
    expect(veilMatch![1]).not.toMatch(/milestones/);
  });

  it("the veiled payload leaks NO calendar date (only relative timing survives)", () => {
    // `daysAway` is allowed (relative); an actual `.date` / `date:` is the leak.
    expect(veilMatch![1]).not.toMatch(/\.date\b|date:/);
  });

  it("the entitled payload DOES carry the full milestone list", () => {
    // Guards against a fix that accidentally veils everyone (the mirror failure).
    expect(SRC).toMatch(/entitled: true[\s\S]*?milestones: arc\.milestones/);
  });
});
