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
  it("carries the day-scale REASON through both gates, not just the mode (v819)", () => {
    // interpreter.ts documents the triplet as travelling together; v794 rewrote the mode and the
    // qualifier and left the reason behind. routers.ts derives the day card's confidence % from
    // that reason's score ladder, so a gated day showed a number read off the ungated ladder.
    const gated = gateDayField(field(), "caution", null);
    expect(gated.dayFinalMode).toBe("Restraint");
    expect((gated.dayModeReason as any).finalMode).toBe("Restraint");

    const interaction = gateDayField(field(), null, "Selective");
    expect(interaction.dayFinalMode).toBe("Selective");
    expect((interaction.dayModeReason as any).finalMode).toBe("Selective");
    expect((interaction.dayModeReason as any).baseMode).toBe("Selective");

    // Ungated days keep the reason they came in with — the denominator.
    const clean = gateDayField(field(), null, null);
    expect((clean.dayModeReason as any).baseMode).toBe("Build");
  });
});
