import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

/**
 * A BUMP TO ANY ENGINE MUST INVALIDATE WHAT IT PRODUCED (v865).
 *
 * The audit row said "DASHA_ENGINE_VERSION is declared and read by nothing", and house-research.ts
 * said so too, in a comment. Both were true, and the consequence was worse than dead code:
 *
 *   storeNatalResearch hashes the birth inputs plus RESEARCH_ENGINE_VERSION into `inputHash`.
 *   If the hash matches, it returns researchStatus "unchanged".
 *   storeDashaTree then SKIPS its own rewrite when researchStatus === "unchanged".
 *
 * So a change to the DASHA engine left the hash identical, the status "unchanged", and the stored
 * dasha periods untouched — a stale 120-year clock persisting across an engine change, silently,
 * with nothing anywhere able to notice. Same for the convergence timeline.
 *
 * The versions had nowhere to be read. Now all three ride the hash.
 *
 * WHAT THIS DELIBERATELY DOES NOT DO: per-table invalidation. profile_dasha_periods has no
 * engineVersion column, and adding one is a schema change — David-run, never automatic. So a dasha
 * bump also recomputes the research blob. Recomputing more than strictly needed is the safe
 * direction; serving a stale clock is not.
 */
const SRC = readFileSync(new URL("./research-store.ts", import.meta.url), "utf8");

describe("the invalidation hash", () => {
  it("carries all three engine versions, not just the research one", () => {
    const m = SRC.match(/const inputHash = createHash\("sha256"\)[\s\S]{0,400}?\.digest\("hex"\)/);
    expect(m, "the inputHash construction changed shape").toBeTruthy();
    const block = m![0];
    expect(block).toContain("RESEARCH_ENGINE_VERSION");
    expect(block).toContain("DASHA_ENGINE_VERSION");
    expect(block).toContain("CONVERGENCE_ENGINE_VERSION");
  });

  it("actually imports the convergence version — a name it cannot see cannot gate anything", () => {
    expect(SRC).toMatch(/import \{[^}]*CONVERGENCE_ENGINE_VERSION[^}]*\} from "\.\/convergence\.js"/);
  });

  it("the skip that made this dangerous still exists — this is what the hash now protects", () => {
    // If storeDashaTree stopped skipping on "unchanged", the staleness would be gone by another
    // route and this guard would be guarding nothing. It skips; the hash is what makes that safe.
    expect(SRC).toMatch(/if \(researchStatus === "unchanged"\)/);
  });

  it("the stale comment claiming they are read by nothing is gone", () => {
    const HR = readFileSync(new URL("./house-research.ts", import.meta.url), "utf8");
    expect(HR).not.toMatch(/are declared and read by nothing\./);
    expect(HR).toMatch(/ride the research inputHash/);
  });
});

describe("the versions are real, distinct strings", () => {
  it("each is a non-empty identifier", () => {
    for (const re of [
      /const DASHA_ENGINE_VERSION = "([^"]+)"/,
      /export const RESEARCH_ENGINE_VERSION = "([^"]+)"/,
    ]) {
      const hit = SRC.match(re) ?? readFileSync(new URL("./house-research.ts", import.meta.url), "utf8").match(re);
      expect(hit?.[1]?.length ?? 0).toBeGreaterThan(3);
    }
  });
});
