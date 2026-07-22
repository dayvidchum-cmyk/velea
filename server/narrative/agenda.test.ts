import { describe, it, expect } from "vitest";
import { deriveAgenda, type AgendaSignals } from "./agenda.js";

// A lord in no notable condition — the neutral baseline every case starts from.
const NEUTRAL: AgendaSignals = {
  dignity: "neutral",
  fallCancelled: false,
  strengthRatio: 1.0,
  retrograde: false,
  lajjitaadi: [],
  deepthaadi: [],
  jagradaadi: "svapna",
};
const sig = (o: Partial<AgendaSignals>): AgendaSignals => ({ ...NEUTRAL, ...o });

describe("deriveAgenda — the verb by condition", () => {
  it("neutral, no state → Tend (the baseline default)", () => {
    expect(deriveAgenda(NEUTRAL).agenda.primary).toBe("Tend");
  });

  it("TIER 1: planetary war → Contend, never a winner", () => {
    const a = deriveAgenda(sig({ deepthaadi: ["nipeedita"] })).agenda;
    expect(a.primary).toBe("Contend");
    // The engine can't name a winner — Prevail/Yield must NOT appear.
    expect(a.secondaries).not.toContain("Prevail");
    expect(a.secondaries).not.toContain("Yield");
  });

  it("TIER 1: cancelled fall → Redeem (earned competence, not Restore)", () => {
    expect(deriveAgenda(sig({ dignity: "debilitated", fallCancelled: true })).agenda.primary).toBe("Redeem");
  });

  it("TIER 2: starved → Restore", () => {
    expect(deriveAgenda(sig({ lajjitaadi: ["kshudita"] })).agenda.primary).toBe("Restore");
  });
  it("TIER 2: debilitated (uncancelled) → Restore", () => {
    expect(deriveAgenda(sig({ dignity: "debilitated", jagradaadi: "sushupti" })).agenda.primary).toBe("Restore");
  });
  it("TIER 2: thin strength → Restore", () => {
    expect(deriveAgenda(sig({ strengthRatio: 0.7 })).agenda.primary).toBe("Restore");
  });
  it("TIER 2: shamed → Repair", () => {
    expect(deriveAgenda(sig({ lajjitaadi: ["lajjita"] })).agenda.primary).toBe("Repair");
  });
  it("TIER 2: agitated → Steady", () => {
    expect(deriveAgenda(sig({ lajjitaadi: ["kshobhita"] })).agenda.primary).toBe("Steady");
  });
  it("TIER 2: thirsty → Complete", () => {
    expect(deriveAgenda(sig({ lajjitaadi: ["trishita"] })).agenda.primary).toBe("Complete");
  });

  it("TIER 3: retrograde → Reclaim (with the house-picked shades)", () => {
    const a = deriveAgenda(sig({ retrograde: true })).agenda;
    expect(a.primary).toBe("Reclaim");
    expect(a.secondaries).toEqual(expect.arrayContaining(["Revisit", "Reconnect"]));
  });

  it("TIER 4: own sign → Consolidate", () => {
    expect(deriveAgenda(sig({ dignity: "own" })).agenda.primary).toBe("Consolidate");
    expect(deriveAgenda(sig({ dignity: "moolatrikona" })).agenda.primary).toBe("Consolidate");
  });
  it("TIER 4: exalted / strong / delighted → Cultivate", () => {
    expect(deriveAgenda(sig({ dignity: "exalted", jagradaadi: "jagrat" })).agenda.primary).toBe("Cultivate");
    expect(deriveAgenda(sig({ strengthRatio: 1.4 })).agenda.primary).toBe("Cultivate");
    expect(deriveAgenda(sig({ lajjitaadi: ["mudita"] })).agenda.primary).toBe("Cultivate");
  });
  it("TIER 4: proud → Steward", () => {
    expect(deriveAgenda(sig({ lajjitaadi: ["garvita"] })).agenda.primary).toBe("Steward");
  });
});

describe("deriveAgenda — precedence (structural before baseline)", () => {
  it("war outranks a cancelled fall", () => {
    expect(deriveAgenda(sig({ deepthaadi: ["nipeedita"], dignity: "debilitated", fallCancelled: true })).agenda.primary).toBe("Contend");
  });
  it("a deficit outranks retrograde", () => {
    expect(deriveAgenda(sig({ lajjitaadi: ["kshudita"], retrograde: true })).agenda.primary).toBe("Restore");
  });
  it("retrograde outranks baseline strength", () => {
    // A strong retrograde lord is Reclaiming, not Cultivating.
    expect(deriveAgenda(sig({ retrograde: true, strengthRatio: 1.4 })).agenda.primary).toBe("Reclaim");
  });
  it("cancelled fall (Redeem) outranks the plain-debilitated Restore path", () => {
    expect(deriveAgenda(sig({ dignity: "debilitated", fallCancelled: true, lajjitaadi: ["kshudita"] })).agenda.primary).toBe("Redeem");
  });
});

describe("deriveAgenda — capacity is an OVERLAY, not the agenda", () => {
  it("combust rides on top of the primary, never replaces it", () => {
    const r = deriveAgenda(sig({ lajjitaadi: ["kshudita"], deepthaadi: ["vikala"] }));
    expect(r.agenda.primary).toBe("Restore"); // still the WHAT
    expect(r.capacity.map((c) => c.mode)).toContain("Work Unseen"); // the HOW
  });
  it("asleep (sushupti) → Enlist overlay, primary unchanged", () => {
    const r = deriveAgenda(sig({ dignity: "debilitated", jagradaadi: "sushupti" }));
    expect(r.agenda.primary).toBe("Restore");
    expect(r.capacity.map((c) => c.mode)).toContain("Enlist");
  });
  it("svapna (half capacity) does NOT emit an overlay — it is the common middle", () => {
    expect(deriveAgenda(sig({ jagradaadi: "svapna" })).capacity).toHaveLength(0);
  });
  it("an awake, unafflicted lord carries no overlay", () => {
    expect(deriveAgenda(sig({ dignity: "exalted", jagradaadi: "jagrat" })).capacity).toHaveLength(0);
  });
});
