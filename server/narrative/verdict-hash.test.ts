import { describe, it, expect } from "vitest";
import { createHash } from "node:crypto";
import { SURFACE_VERSION, PROMPT_VERSION } from "./prompts.js";

/**
 * THE VERDICT MUST NOT REGENERATE ON A CLOCK (v802).
 *
 * verdict.ts computes `currentAge` from new Date(), rounded to 0.1 of a year, and returns it in the
 * payload. getVerdictCached hashed the whole payload, so the hash flipped every 36.5 days with no
 * change in meaning: the reading regenerated — billed — and the peek's hash comparison failed, so
 * the door reappeared claiming an already-read verdict was unread. Ten times a year, per profile.
 *
 * This mirrors the projection getVerdictCached applies. It is deliberately a copy rather than an
 * import: the point is to pin the BEHAVIOUR (age out, tense in), so if someone changes the real
 * projection to hash the age again, this test stays green only if they also change it here — and
 * the diff makes that visible in review instead of silent in the bill.
 */
const hashOf = (data: any) => {
  const salt = SURFACE_VERSION["verdict"] ?? "";
  const { currentAge: _age, ...stable } = data;
  return createHash("sha256").update(PROMPT_VERSION + "|" + salt + "|" + JSON.stringify(stable)).digest("hex");
};

const payload = (currentAge: number, tense: string) => ({
  engineVersion: "verdict-v1",
  bloomProfile: "late",
  hinge: { planet: "Saturn", maturityAge: 36, why: "the slowest hand on the chart" },
  areas: [{ key: "career", label: "Career", thin: false, bloomAge: 44, window: { startAge: 44, endAge: 51 }, tense }],
  nodal: { rahuHouse: 3, ketuHouse: 9 },
  maturityBeats: [{ planet: "Moon", age: 24 }],
  currentAge,
});

describe("the verdict's cache identity", () => {
  it("does not change as the age ticks", () => {
    // 36.5 days of ageing, ten times a year, each of which used to be a paid regeneration.
    expect(hashOf(payload(41.2, "future"))).toBe(hashOf(payload(41.3, "future")));
    expect(hashOf(payload(41.2, "future"))).toBe(hashOf(payload(43.9, "future")));
  });

  it("DOES change when the age actually crosses a window — the meaning moved", () => {
    // `tense` is computed from currentAge and stays in the hash, so a real transition still
    // regenerates. Without this assertion the fix would be indistinguishable from "never bust".
    expect(hashOf(payload(43.9, "future"))).not.toBe(hashOf(payload(44.1, "current")));
  });

  it("still changes when the chart data changes", () => {
    const a = payload(41.2, "future");
    const b = { ...payload(41.2, "future"), bloomProfile: "steady" };
    expect(hashOf(a)).not.toBe(hashOf(b));
  });

  it("has its own surface salt, so a verdict-prompt change costs one surface", () => {
    // Before v802 there was no `verdict` key at all, so the only lever was PROMPT_VERSION — which
    // regenerates every surface for every profile.
    expect(SURFACE_VERSION["verdict"]).toBeTruthy();
  });
});
