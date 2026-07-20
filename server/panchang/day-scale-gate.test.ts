import { describe, it, expect } from "vitest";
import { gateDayField } from "./service.js";
import type { DayField } from "./interpreter.js";

/**
 * THE DAY-SCALE MODE MUST SURVIVE THE GATES (v794).
 *
 * gateDayField rewrites the day's mode twice: once when a chart's interaction mode supersedes the
 * Moon-only verdict, and once when a personal caution day contains it. Both were written when there
 * was a single mode field. If either forgets the day-scale field, the narrative silently keeps
 * reading an ungated or pre-interaction mode — a contained day that still reads as Action in the
 * one place that bills. One rule, both scales (the Personal Weather Gate law).
 */

const field = (over: Partial<DayField> = {}): DayField =>
  ({
    date: "2026-07-20",
    dayOfWeek: "Monday",
    moonSign: "Taurus",
    houseActivated: 9,
    nakshatra: "Rohini",
    nakshatraPada: 2,
    tithi: "Panchami",
    tithiPaksha: "Shukla",
    karana: null,
    sunriseLocal: "5:20 AM",
    mode: "Action",
    baseMode: "Action",
    finalMode: "Action",
    dayFinalMode: "Build",
    qualifier: "Assertive Action",
    dayQualifier: "Productive Build",
    instruction: "",
    modeReason: { baseMode: "Action" } as any,
    dayModeReason: { baseMode: "Build" } as any,
    nakshatraModifier: { name: "Rohini", behavioralQuality: "", supports: [], avoid: [], modifierTags: [], toneModifier: "" },
    tithiPacing: { tithi: "Panchami", paksha: "Shukla", phase: "waxing", pacingLabel: "", pacingNote: "" },
    nakshatraAtSunrise: "Rohini",
    nakshatraTransitionTime: null,
    nakshatraAfterTransition: null,
    ...over,
  }) as DayField;

describe("gateDayField keeps both scales honest", () => {
  it("passes both scales through untouched when nothing gates", () => {
    const r = gateDayField(field(), null, null);
    expect(r.finalMode).toBe("Action");
    expect(r.dayFinalMode).toBe("Build");
    expect(r.weatherGated).toBe(false);
  });

  it("a caution day contains the DAY mode too, not only the moment's", () => {
    const r = gateDayField(field(), "caution", null);
    expect(r.finalMode).toBe("Restraint");
    // The one that reaches the reading. Before v794 this stayed 'Build': the prose was written for
    // an uncontained day underneath a hero that said contained.
    expect(r.dayFinalMode).toBe("Restraint");
    expect(r.dayQualifier).toBe("Contained Build");
    expect(r.weatherGated).toBe(true);
  });

  it("an interaction mode supersedes both scales — it is one whole-day verdict", () => {
    const r = gateDayField(field(), null, "Selective");
    expect(r.finalMode).toBe("Selective");
    expect(r.dayFinalMode).toBe("Selective");
    expect(r.dayQualifier).toContain("Selective");
  });

  it("interaction mode then caution: the gate still reaches the day scale", () => {
    const r = gateDayField(field(), "caution", "Action");
    expect(r.finalMode).toBe("Restraint");
    expect(r.dayFinalMode).toBe("Restraint");
    expect(r.weatherGated).toBe(true);
  });

  it("a day already at Restraint is not double-contained", () => {
    const r = gateDayField(field({ finalMode: "Restraint", dayFinalMode: "Restraint" }), "caution", null);
    expect(r.dayFinalMode).toBe("Restraint");
    expect(r.weatherGated).toBe(false);
  });

  it("falls back to finalMode when a field predates the day-scale pair", () => {
    // Legacy rows and hand-built fields have no dayFinalMode; the gate must not emit undefined.
    const legacy = field();
    delete (legacy as any).dayFinalMode;
    delete (legacy as any).dayQualifier;
    const r = gateDayField(legacy, "caution", null);
    expect(r.dayFinalMode).toBe("Restraint");
  });
  it("recomputes the interaction ladder so the SCORES match the mode (v825)", () => {
    // v819 relabelled finalMode/baseMode on the OLD ladder and left every score untouched. The day
    // card's confidence is computed from baseScore + the three modifiers against finalScore, so the
    // number did not move — and the payload came out saying baseMode "Selective" beside Action's
    // baseScore. A reason whose scores belong to a different mode explains nothing.
    const r = gateDayField(field(), null, "Selective");
    const mr: any = r.dayModeReason;
    expect(mr.baseMode).toBe("Selective");
    // MODE_SCORE: Restraint 0 · Selective 1 · Build 2 · Action 3. The ladder must start where the
    // mode actually sits, not where the discarded one did.
    expect(mr.baseScore).toBe(1);
    expect(typeof mr.finalScore).toBe("number");
    expect(mr.explanation).toBeTruthy();
  });

  it("leaves the ladder alone under the weather gate — containment is not a rung (v825)", () => {
    // "Contained Build" deliberately keeps the original mode visible: the day IS Build, contained
    // from outside. The ladder that produced Build is still the true explanation of why.
    const r = gateDayField(field(), "caution", null);
    expect(r.dayFinalMode).toBe("Restraint");
    expect(r.dayQualifier).toBe("Contained Build");
    expect((r.dayModeReason as any).baseMode).toBe("Build");   // untouched, and honest
  });

  it("carries the day-scale mode and qualifier through both gates (v819)", () => {
    // interpreter.ts documents the triplet as travelling together; v794 rewrote the mode and the
    // qualifier and left the reason behind. routers.ts derives the day card's confidence % from
    // that reason's score ladder, so a gated day showed a number read off the ungated ladder.
    expect(gateDayField(field(), "caution", null).dayFinalMode).toBe("Restraint");
    expect(gateDayField(field(), null, "Selective").dayFinalMode).toBe("Selective");
    // Ungated days keep the reason they came in with — the denominator.
    const clean = gateDayField(field(), null, null);
    expect((clean.dayModeReason as any).baseMode).toBe("Build");
  });
});
