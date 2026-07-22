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

// FIND the payload lines, never index them (v851). These were LINES[1095] and LINES[741] — literal
// line numbers — and the moment I edited input-builder above them, all three assertions failed
// against correct code. A test that breaks when unrelated lines move is a test that will be
// "fixed" by deleting it. The two builders are distinguishable by what they carry: the year read
// has no panchang.
const PAYLOADS = payloadLines.map(([, l]) => l);
const DAY = PAYLOADS.map(emittedKeys).find((k) => k.has("panchang")) ?? new Set<string>();
const YEAR = PAYLOADS.map(emittedKeys).find((k) => !k.has("panchang")) ?? new Set<string>();
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

  it("the contact module is WIRED to the payload, not merely present in the repo (v885)", () => {
    // THE FAILURE THIS EXISTS FOR: v884 shipped server/vedic/contacts.ts with its own passing
    // tests, its own mutation probe, and a changelog entry describing the fix as landed — and the
    // file was imported by NOTHING. The prompt kept reading the bare 10° scan it replaced. Unit
    // tests on a module cannot see that; only an assertion about the PATH can.
    expect(SRC).toContain('from "../vedic/contacts.js"');
    // Called by the builder, not just imported.
    expect(SRC).toMatch(/natalContactPayload\(lonAll, lagnaLonForDig\)/);
    // And the per-planet list the prompt branches on must be fed BY that call.
    expect(SRC).toMatch(/const conjunctOf = \(name: string\) => contactsByPlanet\[name\]/);
    // The old scan must be gone, not merely bypassed — a dead copy is how the drift started.
    expect(SRC).not.toMatch(/if \(o <= 10\) out\.push\(\{ name: k, orb: \+o\.toFixed\(1\) \}\)/);
  });

  it("every key the prompt branches on inside a contact is actually emitted", () => {
    // The prompt now tells the model "every entry has a kind" and switches behaviour on it.
    expect(PROMPTS).toContain('Every entry has a "kind"');
    for (const k of ["kind", "sameSign", "conventionsAgree"]) {
      expect(SRC.includes(`${k}: c.${k}`), `conjunct.${k} promised to the model, never emitted`).toBe(true);
    }
  });
});

/**
 * THE PROTAGONIST AND THE FACET REACH THE MODEL (2026-07-21).
 *
 * Both were shipped today to close gaps David's Venus audit exposed, and both are the exact shape
 * the v884 lesson warns about: a module can be correct, tested, and imported by nothing. So these
 * assert the WIRING at source level — that input-builder actually emits them — not just that the
 * helpers work.
 *
 * The gaps they guard:
 *   · natalCondition.lords carried the Vimshottari chain only, so the ANNUAL TIME LORD — the planet
 *     leading the year — never had its natal condition sent. David and Lisa are both 44, both Virgo
 *     lagna, both a 9th-house Taurus profection led by Venus, and every narratable line was
 *     identical.
 *   · canon/planet-in-house.json (Vol II Appendix III) reached the HOUSE READ only, so the day read
 *     had no chart-specific facet and the prompt carried four hardcoded examples instead.
 */
describe("the protagonist and the canon facet are actually wired (2026-07-21)", () => {
  it("CONTROL — the source is readable and is the builder we think it is", () => {
    expect(SRC.length).toBeGreaterThan(5000);
    expect(SRC).toContain("natalCondition");
    expect(SRC).toContain("chainLords");
  });

  it("the annual Time Lord is included among the lords whose natal condition is sent", () => {
    // Both arms: the full day chain, and the slowOnly (stage/year) chain.
    expect(SRC).toMatch(/chainLords\s*=\s*Array\.from\([\s\S]{0,200}pf\.timeLord/);
    expect(SRC).toMatch(/slowOnly[\s\S]{0,220}pf\.timeLord/);
  });

  it("each lord carries which office it holds", () => {
    expect(SRC).toContain("Annual Time Lord — leads THIS year");
    expect(SRC).toContain("Mahadasha lord — the long storyline");
    expect(SRC).toMatch(/roles:\s*lordRoles\[g\]/);
  });

  it("the canon facet table is imported and emitted per lord, WITH a subject", () => {
    expect(SRC).toContain("planet-in-house.json");
    expect(SRC).toMatch(/facetsOf\s*=\s*\(/);
    expect(SRC).toMatch(/indicates:\s*facetsOf\(g, pr\.house\)/);
    // David, 2026-07-21: "Never send ambiguity if you can send structure." Each facet names whose
    // life it concerns, and a mixed canon entry splits into two facets rather than one fuzzy one.
    expect(SRC).toMatch(/subject:\s*string;\s*topic:\s*string/);
    // ASSERT THE LOOP, NOT THE CONSTANT. The first version of this line checked only that
    // PERSON_WORDS existed — and a mutation probe that deleted the loop READING it survived,
    // because the table is still declared. A guard on a declaration is decorative; the behaviour
    // lives in the lookup.
    expect(SRC).toMatch(/for \(const \[re, who\] of PERSON_WORDS\) if \(re\.test\(item\)\) return who;/);
    // and explicitly NO "both" — that is the engine saying it does not know.
    expect(SRC).not.toMatch(/subject:\s*"both"/);
  });

  it("the prompt points AT the facet field rather than listing example facets", () => {
    expect(PROMPTS).toMatch(/input\.natalCondition\.lords carries/);
    expect(PROMPTS).toMatch(/SAYS WHOSE LIFE THE FACET CONCERNS/);
    expect(PROMPTS).toMatch(/do not blur the two into/);
    // the four hardcoded examples that v891 removed must not creep back
    expect(PROMPTS).not.toMatch(/Saturn here leans to thrift/);
    expect(PROMPTS).not.toMatch(/Jupiter here leans to abundance/);
  });

  it("NEGATIVE CONTROL — these matchers can fail", () => {
    expect(SRC).not.toMatch(/indicates:\s*facetOf\(g, pr\.nonexistentField\)/);
    expect("const chainLords = Array.from(new Set([cur?.mahadasha]))").not.toMatch(/chainLords\s*=\s*Array\.from\([\s\S]{0,200}pf\.timeLord/);
  });
});

/**
 * THE VOCATION FIELD IS WIRED AND ADMIN-GATED (2026-07-21).
 *
 * The reading kept literalizing a day-star's craft image onto non-makers. The chart can't know a
 * trade with certainty (aptitude, never the fact); the only honest source is the person's own word.
 * The vocation field carries it, the engine resolves the instrument into a concrete reach, and the
 * prompt lifts the craft-ban ONLY when it is present. The write is admin-only, enforced server-side.
 */
describe("the vocation field is wired and admin-gated (2026-07-21)", () => {
  const ROUTER = readFileSync(new URL("../routers/profiles.ts", import.meta.url), "utf8");

  it("the engine resolves the instrument and emits vocation to the payload", () => {
    expect(SRC).toContain("INSTRUMENT_REACH");
    expect(SRC).toMatch(/\.\.\.\(vocation \? \{ vocation \} : \{\}\)/);
  });

  it("the prompt documents vocation AND carries the ban-lift license", () => {
    expect(PROMPTS).toContain("vocation?: { instrument, reach, note? }");
    // Include the suffix so a trailing-char mutation actually breaks the match — "…KNOWN" alone is a
    // substring of "…KNOWNX" and the probe (rightly) survived against it.
    expect(PROMPTS).toContain("THE BAN LIFTS WHEN THE WORK IS KNOWN (input.vocation)");
  });

  it("the router writes the instrument ONLY inside an admin check (the gate cannot be bypassed)", () => {
    // v884 shape: the field could be perfectly wired and still let any client set it. The write must
    // sit inside `if (ctx.user.role === "admin")`, so a non-admin's value is dropped at the server.
    expect(ROUTER).toMatch(/if \(ctx\.user\.role === "admin"\) \{[\s\S]{0,240}updateData\.instrument = fields\.instrument/);
  });

  it("NEGATIVE CONTROL — these matchers can fail", () => {
    expect("no vocation here").not.toContain("INSTRUMENT_REACH");
    expect("updateData.instrument = fields.instrument").not.toMatch(/if \(ctx\.user\.role === "admin"\) \{[\s\S]{0,240}updateData\.instrument = fields\.instrument/);
  });
});
