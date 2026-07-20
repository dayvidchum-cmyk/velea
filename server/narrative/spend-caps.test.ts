import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

/**
 * THE DAILY SPEND CAPS HAD NO TEST (v841).
 *
 * Found by mutation probe, not by reading: I changed DAILY_ROW_CAP from 50 to 5000 and the whole
 * suite stayed green. These two constants are the only thing standing between one user's binge and
 * the Anthropic wallet, and they were the subject of a real defect earlier in this run — v806
 * changed what the in-process arm COUNTS (generations → model calls) and left the single shared
 * constant at 50, silently cutting the ceiling to about a third. v819 split them into two arms with
 * two units. Nothing pinned either number afterwards, so the exact class of mistake that had just
 * happened could happen again unnoticed.
 *
 * David's stated priority order puts engine accuracy first and "where money could bleed because of
 * your lack of attention to detail" second. This is the second one, and it was unguarded.
 *
 * These are structural assertions on the source: overDailyCap talks to the DB and to a process-wide
 * counter, and the point here is the CONSTANTS and their relationship, not the query.
 */
const SRC = readFileSync(new URL("./service.ts", import.meta.url), "utf8");

const constant = (name: string): number => {
  const m = SRC.match(new RegExp(`const ${name}\\s*=\\s*(\\d+)\\s*;`));
  if (!m) throw new Error(`${name} is not declared in service.ts — the cap is gone, not merely changed`);
  return Number(m[1]);
};

describe("the daily spend caps", () => {
  it("declares BOTH arms — a missing constant must fail loudly, not read as undefined", () => {
    // The PROMPT_VERSION test in this same folder passed against a DELETED export, because its only
    // assertion was a `not.toBe`. constant() throws instead.
    expect(constant("DAILY_ROW_CAP")).toBeTypeOf("number");
    expect(constant("DAILY_CALL_CAP")).toBeTypeOf("number");
  });

  it("pins the derived values: 50 rows, 150 calls", () => {
    // 150 is not a free number: it is the old 50-generation ceiling re-expressed in the new unit,
    // because callGuarded makes at most 3 model calls per generation. If someone raises the row cap
    // without re-deriving the call cap, the arms stop meaning the same thing again.
    expect(constant("DAILY_ROW_CAP")).toBe(50);
    expect(constant("DAILY_CALL_CAP")).toBe(150);
  });

  it("keeps the call arm at exactly 3x the row arm — the documented derivation", () => {
    expect(constant("DAILY_CALL_CAP")).toBe(constant("DAILY_ROW_CAP") * 3);
    expect(SRC).toContain("callGuarded makes up to 3 per generation");
  });

  it("compares each arm against its OWN constant — v806's bug was one shared threshold", () => {
    const m = SRC.match(/return durable >= (\w+) \|\| inProcGenCount\(profileId\) >= (\w+);/);
    expect(m, "the two-arm comparison in overDailyCap changed shape").toBeTruthy();
    expect(m![1]).toBe("DAILY_ROW_CAP");
    expect(m![2]).toBe("DAILY_CALL_CAP");
    expect(m![1]).not.toBe(m![2]);
  });

  it("still exempts admins, and only admins", () => {
    // The cap bounds a paying user's binge; it must not throttle David QA'ing prose across dates.
    expect(SRC).toContain("if (uncappedProfiles.has(profileId)) return false;");
    expect(SRC).toContain("export function markProfileUncapped");
  });

  it("fails OPEN on a counting error rather than locking a paying user out", () => {
    // countGenerationsToday is a DB call. If it throws, the durable arm must contribute 0, not
    // block the read — the in-process arm is still there to stop a genuine binge.
    expect(SRC).toContain("countGenerationsToday(profileId).catch(() => 0)");
  });

  it("degrades to the dry-wallet path instead of erroring", () => {
    expect(SRC).toMatch(/Over the cap → returns null WITHOUT generating/);
  });
});
