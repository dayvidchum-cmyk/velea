import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

/**
 * NO BILLING ENDPOINT WITHOUT A GATE (v847).
 *
 * David's priority 2 is "where money could bleed because of your lack of attention to detail". The
 * sharpest version of that is a procedure that calls the model without checking whether the caller
 * is entitled: a premium reading served free, billed to the capped Anthropic wallet, once per
 * caller who knows the endpoint name. There is precedent in this very repo — narrative.deepRead
 * once enforced NO entitlement server-side while both its UI surfaces gated on flags, so calling it
 * directly bought a full year read for nothing (fixed by canYearSight).
 *
 * I enumerated every procedure that reaches a generation entry point (get*Cached / peek*Cached /
 * getLifeAreaRead) across routers.ts and narrative/router.ts, and checked each for a gate.
 *
 *   EVERY ONE IS GATED. Fifth null result in a row.
 *
 * WHAT WAS WRONG, AGAIN, WAS MY SCANNER. Two gate forms it did not know:
 *   · hasHoroscope(ctx.user) — a named helper wrapping hasFeature("specialReadings") plus the
 *     admin/bootstrap allowlist. My first pass reported NINE ungated premium endpoints — eclipse
 *     season, Mercury rx, planet rx, the month, the life-area reveal — every one of them false.
 *   · `if (ctx.user.role !== "admin") throw FORBIDDEN` — I matched only `role === "admin"`, so the
 *     admin-only diagnostic probe read as wide open.
 * That was the fifth and sixth failed extraction in two sittings. Had I reported the first pass, it
 * would have been the largest false alarm of this run: nine invented money leaks.
 *
 * So the matcher below is the CORRECTED one, and it is controlled in both directions — a body with
 * a known gate must pass, and a synthetic body with none must be caught. A gate-checker that cannot
 * detect a missing gate is exactly the decorative test v841 was about.
 */

const ROUTERS = readFileSync(new URL("./routers.ts", import.meta.url), "utf8");
const NARRATIVE = readFileSync(new URL("./narrative/router.ts", import.meta.url), "utf8");

/** Anything that reaches the model and can mint a billed generation. */
const GENERATES = /(get\w+Cached|peek\w+Cached|getLifeAreaRead)\(/;

/**
 * Every form a server-side gate takes in this codebase. Entitlement, role, ownership, or the
 * date-window guard — a free daily read is legitimately gated by guardedDate + assertOwnsProfile
 * rather than by a flag, so "has SOME gate" is the invariant, not "has an entitlement flag".
 */
const GATE_PATTERNS: Array<[string, RegExp]> = [
  ["hasFeature", /hasFeature\(\s*ctx\.user/],
  ["hasHoroscope", /hasHoroscope\(/],
  ["hasMasterMode", /hasMasterMode\(/],
  ["canYearSight", /canYearSight\(/],
  ["admin-role", /role\s*[!=]==\s*"admin"/],
  ["assertOwnsProfile", /assertOwnsProfile/],
  ["guardedDate", /guardedDate/],
];

type Proc = { name: string; body: string; gates: string[] };

function proceduresThatGenerate(src: string): Proc[] {
  const lines = src.split("\n");
  const heads: Array<[number, string]> = [];
  lines.forEach((l, i) => {
    const m = l.match(/^\s*(\w+):\s*(?:protectedProcedure|publicProcedure|adminProcedure)/);
    if (m) heads.push([i, m[1]]);
  });
  const out: Proc[] = [];
  heads.forEach(([start, name], idx) => {
    const end = heads[idx + 1]?.[0] ?? lines.length;
    const body = lines.slice(start, end).join("\n");
    const generates = body.split("\n").some((l) => !l.trim().startsWith("//") && GENERATES.test(l));
    if (!generates) return;
    const gates = GATE_PATTERNS.filter(([, re]) => re.test(body)).map(([n]) => n);
    out.push({ name, body, gates });
  });
  return out;
}

const ALL = [...proceduresThatGenerate(ROUTERS), ...proceduresThatGenerate(NARRATIVE)];

describe("the gate-checker can tell gated from ungated (controls first)", () => {
  it("finds a meaningful number of billing endpoints", () => {
    // If this collapses to zero the suite below passes vacuously — the classic decorative test.
    expect(ALL.length).toBeGreaterThan(10);
  });

  it("detects the helper-style gate that fooled my first pass", () => {
    const month = ALL.find((p) => p.name === "month");
    expect(month, "the month reading endpoint vanished").toBeTruthy();
    expect(month!.gates).toContain("hasHoroscope");
  });

  it("detects the negated admin check that fooled my second pass", () => {
    const probe = ALL.find((p) => p.name === "testReadingForUser");
    expect(probe, "the admin diagnostic probe vanished").toBeTruthy();
    expect(probe!.gates).toContain("admin-role");
  });

  it("CATCHES a body with no gate at all", () => {
    // The negative control. Without this, "every endpoint is gated" could just mean the matcher
    // says yes to everything.
    const fake = `  wideOpen: protectedProcedure.mutation(async ({ ctx }) => {\n    return await getMonthCached(1, "2026-07-20", false, null);\n  }),\n  next: protectedProcedure.query(() => 1),`;
    const found = proceduresThatGenerate(fake);
    expect(found.map((f) => f.name)).toEqual(["wideOpen"]);
    expect(found[0].gates).toEqual([]);
  });
});

describe("every billing endpoint has a server-side gate", () => {
  it("no procedure reaches the model unguarded", () => {
    const ungated = ALL.filter((p) => p.gates.length === 0).map((p) => p.name);
    expect(
      ungated,
      `these can mint a billed generation with no server-side check: ${ungated.join(", ")}`,
    ).toEqual([]);
  });

  it("the premium reading family is behind the horoscope entitlement specifically", () => {
    // Ownership alone is not enough for these — they are the paid tier. Named individually so that
    // downgrading one to a bare assertOwnsProfile is caught, not just removing every gate.
    for (const name of ["eclipseSeason", "mercuryRx", "planetRx", "month", "reveal", "yogaRead"]) {
      const p = ALL.find((x) => x.name === name);
      expect(p, `${name} is gone from the router`).toBeTruthy();
      expect(p!.gates, `${name} lost its entitlement gate`).toContain("hasHoroscope");
    }
  });

  it("the read-only 'saved/peek' twins are gated too — a peek is still a read", () => {
    // These never generate, but they return PAID PROSE. Gating the generator and leaving the
    // reader open hands the same content away for free.
    for (const name of ["eclipseSeasonSaved", "mercuryRxSaved", "monthSaved", "planetRxPeek"]) {
      const p = ALL.find((x) => x.name === name);
      expect(p, `${name} is gone`).toBeTruthy();
      expect(p!.gates.length, `${name} is ungated`).toBeGreaterThan(0);
    }
  });

  it("the year read still enforces year-sight server-side, not just in the UI", () => {
    // The regression this whole file exists to prevent: both UI surfaces gated, the endpoint did not.
    const deep = ALL.find((p) => p.name === "deepRead");
    expect(deep, "deepRead is gone").toBeTruthy();
    expect(deep!.gates).toContain("canYearSight");
    expect(deep!.gates).toContain("assertOwnsProfile");
  });
});

describe("a gated surface must SAY it is locked (v867)", () => {
  // A gate that refuses silently cannot convert. Eleven of fifteen premium reads returned
  // `available: false` with no `locked` flag, so a non-subscriber saw "quiet, try again in a
  // moment" — indistinguishable from a real outage. Three were worse: they returned NULL, so the
  // client had nothing at all to render.
  //
  // The client already branches on `.locked` and renders a gate (Horoscope, Astrology, LifeAtlas,
  // ProfectionYear all do). The endpoints simply were not telling it. This is his standing
  // public-but-locked pattern, and it was only half wired.
  it("every premium READ refusal carries locked: true", () => {
    const premium = ALL.filter((p) => p.gates.some((g) => g === "hasHoroscope" || g === "hasFeature"))
      .filter((p) => /(get|peek)\w+Cached\(|getLifeAreaRead\(/.test(p.body));
    expect(premium.length).toBeGreaterThan(10);
    const silent = premium.filter((p) => !/locked: true/.test(p.body)).map((p) => p.name);
    expect(silent, `these refuse without saying they are locked: ${silent.join(", ")}`).toEqual([]);
  });

  it("no gated READ returns a bare null — the client cannot render a gate from nothing", () => {
    const premium = ALL.filter((p) => p.gates.includes("hasHoroscope"))
      .filter((p) => /(get|peek)\w+Cached\(|getLifeAreaRead\(/.test(p.body));
    for (const p of premium) {
      expect(p.body, `${p.name} refuses with null`).not.toMatch(
        /hasHoroscope\(ctx\.user\)\)\) return null;/,
      );
    }
  });
});
