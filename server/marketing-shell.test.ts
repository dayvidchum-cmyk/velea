/**
 * ONE stylesheet for the editorial pages.
 *
 * The shell CSS used to be pasted into all six marketing pages — 72-100% identical. Every
 * change cost six edits, and drift was invisible: two different h1 treatments coexisted
 * because there was nothing for them to disagree with. site.css is now the source of
 * truth; a page's own <style> is for what belongs to that page alone, and it loads after,
 * so it still wins.
 *
 * This test is what stops the copies coming back.
 */
import { describe, expect, it } from "vitest";
import fs from "fs";
import path from "path";

const DIR = path.resolve(import.meta.dirname, "..", "client/public/marketing");
const PAGES = ["velea.html", "why.html", "system.html", "gate.html", "access.html", "confirmed.html"];

/** Top-level CSS chunks (a comment, a rule, or an at-rule), text verbatim. */
function chunks(css: string): string[] {
  const out: string[] = [];
  let buf = "", depth = 0;
  for (let i = 0; i < css.length; i++) {
    if (depth === 0 && css.startsWith("/*", i)) {
      const end = css.indexOf("*/", i) + 2;
      out.push(css.slice(i, end).trim());
      i = end - 1;
      continue;
    }
    const c = css[i];
    buf += c;
    if (c === "{") depth++;
    else if (c === "}" && --depth === 0) { out.push(buf.trim()); buf = ""; }
  }
  if (buf.trim()) out.push(buf.trim());
  return out.filter(Boolean);
}

function inlineCss(html: string): string {
  return [...html.matchAll(/<style>([\s\S]*?)<\/style>/g)].map((m) => m[1]).join("\n");
}

const shared = fs.readFileSync(path.join(DIR, "site.css"), "utf8");
const sharedRules = new Set(chunks(shared).filter((c) => !c.startsWith("/*")));

describe("the marketing shell", () => {
  it("carries the rules every page agrees on", () => {
    for (const sel of [".nav {", "main {", ".label {", ".links ", ".rule {", "footer {"]) {
      expect(shared.includes(sel), `site.css is missing ${sel}`).toBe(true);
    }
  });

  it("does NOT carry a selector the pages disagree about", () => {
    // A partial override inherits the shell rule's other properties — that is how
    // text-transform:uppercase leaked into /access's display h1. Divergent selectors
    // stay whole with their page, and this test is what keeps them out of here.
    const divergent = new Set<string>();
    const bySel = new Map<string, Set<string>>();
    for (const page of PAGES) {
      for (const c of chunks(inlineCss(fs.readFileSync(path.join(DIR, page), "utf8")))) {
        if (c.startsWith("/*") || c.startsWith("@")) continue;
        const sel = c.split("{")[0].trim();
        if (!bySel.has(sel)) bySel.set(sel, new Set());
        bySel.get(sel)!.add(c);
      }
    }
    for (const [sel, variants] of bySel) if (variants.size > 1) divergent.add(sel);
    for (const sel of divergent) {
      const inShell = chunks(shared).some((c) => !c.startsWith("/*") && c.split("{")[0].trim() === sel);
      expect(inShell, `${sel} differs between pages, so site.css must not declare it too`).toBe(false);
    }
  });

  it.each(PAGES)("%s links site.css", (page) => {
    const html = fs.readFileSync(path.join(DIR, page), "utf8");
    expect(html.includes('<link rel="stylesheet" href="/marketing/site.css" />')).toBe(true);
  });

  it.each(PAGES)("%s does not re-declare a rule that site.css already carries", (page) => {
    const html = fs.readFileSync(path.join(DIR, page), "utf8");
    const dupes = chunks(inlineCss(html))
      .filter((c) => !c.startsWith("/*"))
      .filter((c) => sharedRules.has(c));
    expect(dupes, `${page} repeats ${dupes.length} rule(s) verbatim from site.css — the copies are coming back`)
      .toEqual([]);
  });
});
