import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

/**
 * THE MERIDIAN NAMES THE REGISTER, NOT THE CONTENT (2026-07-22, David's governing rule).
 *
 * The MC/IC axis is a STRUCTURAL polarity — the register a life is expressed in (outward/public vs
 * inward/rooted), not a life-domain. The prose had drifted into equating MC → career/work and
 * IC → home, a modern narrowing that biases the LLM toward career-centric readings even when the
 * engine has resolved a completely different life expression (marriage, parenthood, caregiving,
 * lineage, community, service…). The concrete domain must come from the engine's resolved story
 * (dasha, knots, life-area lens, input.vocation), NEVER from the axis itself.
 *
 * This guards the prompt text and the payload labels against re-introducing that collapse, and —
 * equally — against over-correcting the DIRECTIONAL axis (Rahu/Ketu), which legitimately keeps its
 * reach/release vocabulary. The two axes must never share pole words again.
 */
const PROMPTS = readFileSync(new URL("./prompts.ts", import.meta.url), "utf8");
const BUILDER = readFileSync(new URL("./input-builder.ts", import.meta.url), "utf8");

// The meridian instruction block, sliced from its header to the next major header.
const MERIDIAN_START = "THE MERIDIAN IS THE SPINE — READ FROM THE DHARMA AXIS OUTWARD";
const MERIDIAN_END = "THE DAY'S CHARACTER (input.dayFilter)";
function meridianSection(): string {
  const a = PROMPTS.indexOf(MERIDIAN_START);
  const b = PROMPTS.indexOf(MERIDIAN_END, a);
  expect(a, "meridian section header must exist").toBeGreaterThan(-1);
  expect(b, "meridian section end-marker must exist after the header").toBeGreaterThan(a);
  // Collapse whitespace so the assertions survive prompt reflow (a phrase may wrap across lines).
  return PROMPTS.slice(a, b).replace(/\s+/g, " ");
}

describe("the meridian axis names the register, not the content", () => {
  it("states the governing law explicitly in the prompt", () => {
    const s = meridianSection();
    expect(s).toContain("THE MERIDIAN NAMES THE REGISTER, NOT THE CONTENT");
    expect(s).toContain("The MC does NOT mean career and the IC does NOT mean home");
    // and it must offer the breadth — outward/inward chapters that are NOT career/home
    for (const alt of ["parent", "caregiving", "lineage", "ancestry"]) {
      expect(s, `breadth example "${alt}" must be named`).toContain(alt);
    }
    // it must defer the concrete domain to the engine, gated on vocation for work language
    expect(s).toContain("engine's already-resolved story");
    expect(s).toContain("input.vocation");
  });

  it("does not equate the MC with work/career or the IC with home as a DEFAULT", () => {
    const s = meridianSection();
    // the old collapse phrasings — any of these returning means the narrowing crept back
    expect(s).not.toContain("the work, the home");
    expect(s).not.toContain("public calling — the reach");
    expect(s).not.toMatch(/MC is the public calling/);
  });

  it("uses outward/inward for the meridian poles — never the directional reach/release", () => {
    const s = meridianSection();
    expect(s).toContain("outward pole (MC)");
    expect(s).toContain("inward pole (IC)");
    expect(s).not.toContain("reach pole (MC)");
    expect(s).not.toContain("release pole (IC)");
  });

  it("keeps the payload meridian pole labels register-only (input-builder)", () => {
    expect(BUILDER).toContain('return "outward (the MC — the visible, public register)"');
    expect(BUILDER).toContain('return "inward (the IC — the rooted, foundational register)"');
    // the collapse must not live in the payload either
    expect(BUILDER).not.toContain('"reach (the MC / public calling)"');
    expect(BUILDER).not.toContain('"release (the IC / roots)"');
  });

  it("does NOT over-correct: the DIRECTIONAL axis (Rahu/Ketu) still owns reach/release", () => {
    // reach/release is vector language and belongs to the nodal axis — it must survive untouched.
    expect(BUILDER).toContain('reach: { node: "Rahu"');
    expect(BUILDER).toContain('release: { node: "Ketu"');
  });

  it("stops the 10th-house doctrine from leading with career", () => {
    expect(PROMPTS).not.toContain("Your work in the world: career");
    expect(PROMPTS).toContain("Your visible role in the world");
  });
});
