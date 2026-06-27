import { describe, it, expect } from "vitest";
import type { Task } from "../../drizzle/schema";
import {
  DASHA_LORDS,
  themeTags,
  themeMatchesTask,
  type DashaLord,
} from "./time-lord-theme";
import type { TimeLordPeriod } from "./types";

function makeTask(overrides: Partial<Task & { projectName?: string | null }> = {}): Task & { projectName?: string | null } {
  return {
    id: 1,
    title: "Test task",
    mode: "Build",
    projectName: null,
    ...(overrides as any),
  } as any;
}

describe("Layer 2 — Time Lord theme table", () => {
  it("has a 3–5 word phrase for every one of the 81 MD/AD combinations", () => {
    for (const md of DASHA_LORDS) {
      for (const ad of DASHA_LORDS) {
        const tags = themeTags(md as DashaLord, ad as DashaLord);
        // every combo must produce tags (which include the theme phrase tokens)
        expect(tags.length, `${md}/${ad}`).toBeGreaterThan(0);
      }
    }
  });
});

describe("Layer 2 — theme ↔ task keyword matching", () => {
  const venusSaturn: TimeLordPeriod = { mahaDasha: "Venus", antarDasha: "Saturn", theme: "refining structure" };

  it("matches when a curated tag appears in the title", () => {
    const task = makeTask({ title: "Refine the onboarding flow" });
    expect(themeMatchesTask(venusSaturn, task)).toBe(true);
  });

  it("matches when a tag appears in the project name", () => {
    const task = makeTask({ title: "Misc", projectName: "Systems cleanup" });
    expect(themeMatchesTask(venusSaturn, task)).toBe(true);
  });

  it("does not match unrelated tasks", () => {
    const task = makeTask({ title: "Buy groceries", projectName: "Errands" });
    expect(themeMatchesTask(venusSaturn, task)).toBe(false);
  });

  it("is case-insensitive", () => {
    const task = makeTask({ title: "STRUCTURE the pricing page" });
    expect(themeMatchesTask(venusSaturn, task)).toBe(true);
  });
});
