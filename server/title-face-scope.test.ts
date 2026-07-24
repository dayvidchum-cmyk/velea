import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

/**
 * THE TITLE FACE GOES ON TITLES ONLY (v945).
 *
 * David, 2026-07-24: "Gloock should only be Title and H1. That's it."
 *
 * Gloock shipped the day before as the value of `--font-serif`, which some thirty sites consumed —
 * sheet titles, h2/h3 section headings, the Planner hero's body prose and the whole Manifesto. So
 * the display face was speaking in places that are not titles. The ruling narrows it to the
 * wordmark and page-level H1s, delivered by its own token `--font-title`; everything below that
 * tier inherits the app sans from body.
 *
 * This is a source scan rather than a render test because the defect is a literal in a style
 * object: the failure mode is someone reaching for the pretty face on the next h3 they write, and
 * nothing noticing. That is precisely how the token this replaced went wrong — `--font-serif` sat
 * as a dead self-reference for weeks, silently rendering Inter, with a green suite the whole time.
 *
 * The occurrence COUNT is asserted as well as the file set, so a second title in an
 * already-approved file is a decision someone has to make on purpose.
 */
const ROOTS = ["client/src/pages", "client/src/components"];
const REPO = new URL("../", import.meta.url).pathname;
const CSS = readFileSync(join(REPO, "client/src/index.css"), "utf8");

/** The seven surfaces David's ruling admits, and how many title sites each one owns. */
const APPROVED: Record<string, number> = {
  "client/src/components/AppHeader.tsx": 2,        // the Velea wordmark + the page greeting h1
  "client/src/components/BrandSplash.tsx": 1,      // the wordmark, morphing in from the Khmer
  "client/src/components/FirstRunWelcome.tsx": 1,  // "Welcome." h1
  "client/src/components/SecondaryPageHeader.tsx": 1,
  "client/src/components/StageSheet.tsx": 2,       // the two hero card titles
  "client/src/components/WelcomeScreen.tsx": 1,
  "client/src/pages/About.tsx": 1,                 // <h1>Velea</h1>
  "client/src/pages/Audit.tsx": 1,                 // admin-only "Visual Audit" h1
  "client/src/pages/Login.tsx": 1,                 // the name plate over the gate
};

function countTitleToken(): Record<string, number> {
  const found: Record<string, number> = {};
  for (const root of ROOTS) {
    for (const f of readdirSync(join(REPO, root)).filter((x) => x.endsWith(".tsx"))) {
      const rel = `${root}/${f}`;
      const n = (readFileSync(join(REPO, rel), "utf8").match(/var\(--font-title\)/g) ?? []).length;
      if (n) found[rel] = n;
    }
  }
  return found;
}

describe("Gloock is the title face and nothing else", () => {
  it("scans real files — a scan over nothing proves nothing", () => {
    let n = 0;
    for (const root of ROOTS) n += readdirSync(join(REPO, root)).filter((x) => x.endsWith(".tsx")).length;
    expect(n).toBeGreaterThan(20);
  });

  it("delivers Gloock through --font-title, in both token blocks", () => {
    // :root and @theme inline must agree, or the face depends on CSS emit order — the exact
    // trap that left --font-serif resolving to Inter.
    const decls = CSS.match(/--font-title:[^;]+;/g) ?? [];
    expect(decls.length, "--font-title must be declared in BOTH :root and @theme inline").toBe(2);
    for (const d of decls) expect(d).toContain("Gloock");
  });

  it("keeps Gloock OUT of --font-serif — the token below the title tier", () => {
    const decls = CSS.match(/--font-serif:[^;]+;/g) ?? [];
    expect(decls.length).toBe(2);
    for (const d of decls) {
      expect(d, "--font-serif must not carry the title face (David 2026-07-24)").not.toContain("Gloock");
    }
  });

  it("names Gloock nowhere but that one token — never hardcoded past it", () => {
    for (const root of ROOTS) {
      for (const f of readdirSync(join(REPO, root)).filter((x) => x.endsWith(".tsx"))) {
        const src = readFileSync(join(REPO, `${root}/${f}`), "utf8");
        expect(src, `${root}/${f} hardcodes Gloock instead of using var(--font-title)`).not.toContain("Gloock");
      }
    }
  });

  it("puts the title face on the approved titles only, and no others", () => {
    expect(countTitleToken()).toEqual(APPROVED);
  });
});
