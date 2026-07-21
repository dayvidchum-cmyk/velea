import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

// SPECIFIC BEFORE GENERAL (2026-07-21). PERSON_WORDS is a first-match-wins list that turns a canon
// facet title into the person it is about. Every pair in it obeys specific-before-general
// ("mother's mother" precedes "mother") except one, and that one cost a category error rather than
// an awkward phrase: /partner'?s/ matches the bare plural "Partners", so the canon facet
// "Business Partners, Commerce and Trade" was claimed by the SPOUSE rule and the reader was told
// about their marriage where the book was talking about their business.
//
// The list is a local inside a large builder function, so this reads the source. A behavioural
// test would need the whole narrative input assembled around it; the ordering IS the bug.
describe("PERSON_WORDS resolves the specific person before the general one", () => {
  const src = readFileSync(join(__dirname, "input-builder.ts"), "utf8");

  it("business partners is matched before the spouse rule that swallows the plural", () => {
    const business = src.indexOf('[/business partners/i');
    const spouse = src.indexOf("[/spouse or partner|partner'?s|spouse/i");
    expect(business).toBeGreaterThan(-1);
    expect(spouse).toBeGreaterThan(-1);
    expect(business).toBeLessThan(spouse);
  });

  // The control: the rule really does swallow the plural, which is WHY order is load-bearing here.
  // If this ever stops being true the ordering constraint can be revisited — but not before.
  it("the spouse rule does match the bare plural, so order is what protects the facet", () => {
    expect(/spouse or partner|partner'?s|spouse/i.test("Business Partners, Commerce and Trade")).toBe(true);
  });

  // …and the genuine spouse facet must still reach the spouse rule.
  it("a real partner facet is untouched by the reordering", () => {
    expect(/business partners/i.test("Egotism of Spouse or Partner, Partner's Consistency")).toBe(false);
  });
});
