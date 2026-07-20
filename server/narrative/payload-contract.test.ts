import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

/**
 * THE PAYLOAD CONTRACT (v846) — the prompt DESCRIBES the data to the model, field by field. Any
 * field it names that the builder never emits is data the model is told to expect and never gets;
 * any field emitted and never described is tokens spent on something unexplained.
 *
 * I checked the whole contract by hand and it is CLEAN. Fourth null result in a row. Specifically:
 *   · every top-level field BASE_PROMPT documents is emitted by one of the two builders;
 *   · mercuryRx is emitted as { phase, strength, retrograde } — exactly as documented;
 *   · eclipseSeasonArc is emitted as { today, windowEnd, count, eclipses } — exactly as documented,
 *     with `eclipses` correctly presented as its SUB-field under a declared parent;
 *   · transits carries precisely the eleven keys the prompt lists.
 *
 * WHAT WAS NOT CLEAN WAS MY INSTRUMENT. I attempted this extraction FOUR times and got four wrong
 * answers before a control caught each one:
 *   1. matched only the first field on lines declaring several ("domain" read as absent);
 *   2. matched a DIFFERENT return statement — there are two builders — and concluded that panchang
 *      and transits are never emitted, which I had read with my own eyes minutes earlier;
 *   3. ran the doc-scan window past the payload block into the OUTPUT schema, so response fields
 *      (coreTheme, closeLine, tilt…) came back as "promised but missing";
 *   4. counted prose words ("Aim", "Planets", "THE") as field names.
 * Every one of those would have been a confidently-reported false finding. The pattern across this
 * whole run is the same: I write the enumeration, then trust it. So the controls below run FIRST
 * and this file's assertions are worthless without them.
 */

const SRC = readFileSync(new URL("./input-builder.ts", import.meta.url), "utf8");
const PROMPTS = readFileSync(new URL("./prompts.ts", import.meta.url), "utf8");
const LINES = SRC.split("\n");

/**
 * Top-level keys emitted by a `return { ... }` payload line: plain props AND `...(x ? { k } : {})`.
 *
 * Written as a depth-aware split rather than a regex sweep, because the regex version captured
 * VALUES as keys — `date: dateStr` yielded both `date` and `dateStr` — and I papered over that with
 * a hand-written exclusion list instead of fixing it. The control below caught the same flaw a
 * second time on `date: d`. An extractor that needs a junk-list is an extractor that is wrong.
 */
function emittedKeys(returnLine: string): Set<string> {
  const open = returnLine.indexOf("{");
  const body = returnLine.slice(open + 1, returnLine.lastIndexOf("}"));
  const parts: string[] = [];
  let depth = 0, cur = "";
  for (const ch of body) {
    if ("{[(".includes(ch)) depth++;
    if ("}])".includes(ch)) depth--;
    if (ch === "," && depth === 0) { parts.push(cur); cur = ""; continue; }
    cur += ch;
  }
  parts.push(cur);

  const out = new Set<string>();
  for (const raw of parts.map((p) => p.trim()).filter(Boolean)) {
    if (raw.startsWith("...")) {
      // ...(cond ? { key } : {})  — the key is the one inside the truthy branch
      const m = raw.match(/\?\s*\{\s*(\w+)/);
      if (m) out.add(m[1]);
      continue;
    }
    const colon = raw.indexOf(":");
    const name = (colon === -1 ? raw : raw.slice(0, colon)).trim();
    if (/^\w+$/.test(name)) out.add(name);
  }
  return out;
}

const payloadLines = LINES.map((l, i) => [i + 1, l] as const).filter(([, l]) => l.trim().startsWith("return { subject:"));

describe("the extraction can be trusted (controls run first)", () => {
  it("finds exactly the two payload builders", () => {
    // If a third payload shape appears, the contract below is incomplete and must be extended
    // rather than silently covering two of three.
    expect(payloadLines).toHaveLength(2);
  });

  it("sees fields that share a line with others", () => {
    // Failure mode 1. `area: X; label: Y; varga: Z; domain: W;` on one line.
    const k = emittedKeys("  return { subject: { profileId: p.id }, date: d, natal, panchang, transits };");
    expect([...k].sort()).toEqual(["date", "natal", "panchang", "subject", "transits"]);
  });

  it("sees fields behind a conditional spread", () => {
    // Failure mode 2's sibling: `...(x ? { knots } : {})` is how half this payload is emitted.
    const k = emittedKeys("  return { subject: { profileId: p.id }, ...(knots ? { knots } : {}), ...(reading ? { reading } : {}) };");
    expect(k.has("knots")).toBe(true);
    expect(k.has("reading")).toBe(true);
  });
});

const DAY = emittedKeys(LINES[1095] ?? "");
const YEAR = emittedKeys(LINES[741] ?? "");
const EITHER = new Set([...DAY, ...YEAR]);

describe("the day payload", () => {
  it("emits the fields the prompt names as the day read's data", () => {
    for (const f of ["panchang", "transits", "timeLordTransit", "dasha", "natal", "profection",
      "humanTime", "recentReads", "arc", "date", "subject"]) {
      expect(DAY.has(f), `${f} is documented but not emitted`).toBe(true);
    }
  });

  it("carries the optional blocks by conditional spread, not as nulls", () => {
    for (const f of ["dayFilter", "knots", "meridianAxis", "nodalAxis", "openWindows", "reading",
      "mercuryRx", "lifeAreaLens", "natalCondition", "eclipseSeasonArc", "monthArc"]) {
      expect(DAY.has(f), `${f} missing from the day payload`).toBe(true);
    }
  });
});

describe("the year payload is a different shape under the same BASE_PROMPT", () => {
  it("carries the year-only fields", () => {
    // I first wrote ["dashaBase", "varshaphala", "yearWindows"] — straight from the broken
    // extraction. The year builder emits `dasha: dashaBase`, so the KEY is `dasha` (shared with the
    // day payload) and `dashaBase` is the variable holding it. The fixed extractor corrected a
    // claim I was one commit from shipping.
    expect([...YEAR].filter((k) => !DAY.has(k)).sort()).toEqual(["varshaphala", "yearWindows"]);
    expect(YEAR.has("dasha"), "the year read still gets a dasha").toBe(true);
  });

  it("does NOT carry the day's fields — so BASE_PROMPT must tolerate their absence", () => {
    // This is why every field doc in BASE_PROMPT has to say "may be null / absent". A law written
    // as though a field is always present is a law that misfires on the year read.
    expect(YEAR.has("panchang")).toBe(false);
    expect(YEAR.has("transits")).toBe(false);
  });
});

describe("the documented object SHAPES match what is emitted", () => {
  it("mercuryRx: { phase, strength, retrograde }", () => {
    expect(PROMPTS).toMatch(/- mercuryRx: \{ phase, strength, retrograde \}/);
    expect(SRC).toMatch(/\{ phase: merRx\.phase, strength: \+merRx\.strength\.toFixed\(2\), retrograde: merRx\.retrograde \}/);
  });

  it("eclipseSeasonArc: { today, windowEnd, count, eclipses } — with the parent declared", () => {
    // `eclipses` is documented as a bare "- eclipses:" bullet. That is only correct because the
    // block above it names the parent. Without that line it reads as a top-level field that does
    // not exist — which is exactly how it first appeared in my scan.
    expect(PROMPTS).toContain("input.eclipseSeasonArc is the\nengine of this read");
    expect(SRC).toMatch(/eclipseSeasonArc = \{ today: dateStr, windowEnd, count: season\.length, eclipses \}/);
  });

  it("transits carries exactly the keys the prompt lists", () => {
    const doc = PROMPTS.match(/- transits: \[\{([\s\S]*?)\}\]/);
    expect(doc, "the transits field doc changed shape").toBeTruthy();
    const documented = doc![1].split(",").map((s) => s.trim()).filter(Boolean);
    expect(documented).toEqual([
      "planet", "sign", "houseFromLagna", "retrograde", "combust", "nodal", "strength",
      "hitsNatalPoint", "orbDeg", "spotlight", "spotlightReason",
    ]);
    for (const k of documented) {
      expect(SRC.includes(`${k}:`) || SRC.includes(`${k},`), `transits.${k} never emitted`).toBe(true);
    }
  });
});
