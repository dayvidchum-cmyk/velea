import { describe, it, expect } from "vitest";
import { locationSuffix } from "./location-label.js";

// The chip's suffix is hardcoded copy selected by the sky tier, so every branch is asserted
// against the tier that chooses it — including the ones that must stay SILENT, which is the half
// a "does it say the right thing" test normally misses.
describe("the location chip says only what its tier supports", () => {
  it("someone else's chart on the account's city says it follows you", () => {
    expect(locationSuffix("current", false, "Boston")).toBe("follows you");
  });

  // David's correction: this was the noise. The value is right, so the label is nothing.
  it("your own chart on your own city says nothing", () => {
    expect(locationSuffix("current", true, "Boston")).toBeNull();
  });

  it("the app default names itself rather than borrowing either other label", () => {
    expect(locationSuffix("default", true, "Boston")).toBe("no location set");
    expect(locationSuffix("default", false, "Boston")).toBe("no location set");
  });

  // The controls: a person's own stored ground has nothing to disclose, for either subject.
  it("a person's own ground is silent", () => {
    for (const src of ["override", "hometown", "birth"] as const) {
      expect(locationSuffix(src, true, "Newark")).toBeNull();
      expect(locationSuffix(src, false, "Newark")).toBeNull();
    }
  });

  it("no city means no suffix — the chip already says 'set a location'", () => {
    expect(locationSuffix("default", false, null)).toBeNull();
    expect(locationSuffix("current", false, null)).toBeNull();
  });
});
