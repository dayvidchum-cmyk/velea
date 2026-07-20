import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";

/**
 * NO ENDPOINT TAKES A CLIENT-SUPPLIED ID WITHOUT USING THE CALLER'S IDENTITY (v848).
 *
 * This is the highest-consequence invariant in the app. A money leak costs David money; an
 * isolation leak serves one person another person's birth chart. Every procedure that accepts an
 * id from the client — profileId, otherProfileId, taskId, profectionYearId, a bare `id` — is a
 * place where a guessed number could cross that line.
 *
 * I enumerated all of them across every router and checked each one. THEY ARE ALL SCOPED. Sixth
 * null result in a row. The two highest-risk by construction were read line by line rather than
 * matched:
 *   · combined.read takes `otherProfileId` — it exists to read a SECOND chart. The query filters on
 *     BOTH profiles.id AND profiles.userId, and fails closed when the row is not the caller's.
 *   · profectionTransits takes a bare row id — scoped through ctx.user.id, with an IDOR audit note
 *     already on it.
 *
 * MY FIRST ENUMERATION MISSED FOUR OF THE TWELVE profileId endpoints, including deepRead, because
 * they take a SHARED `inputSchema` rather than declaring profileId inline. That is the seventh
 * failed extraction in three sittings. The control below exists because of it: named schemas must
 * resolve, or the sweep silently covers a third of the surface and reports "all clear".
 *
 * WHAT THIS TEST PROVES, EXACTLY: that every such procedure REFERENCES the caller's identity (or is
 * admin-only). It does NOT prove the reference is used correctly — a body could mention ctx.user.id
 * and still filter wrongly. That is a real limit, stated rather than glossed: a body that never
 * mentions the caller CANNOT be scoping to them, so this catches the whole class of "forgot
 * entirely", which is how IDOR actually happens. The two subtle cases above are pinned by hand.
 */

const ROOT = dirname(new URL(import.meta.url).pathname);
const FILES = [
  "routers.ts", "routers/profiles.ts", "routers/arc.ts", "routers/dasha.ts",
  "narrative/router.ts", "profection/router.ts", "profection/transit-router.ts",
].map((f) => join(ROOT, f));

type Proc = { file: string; name: string; ids: string[]; usesCaller: boolean; admin: boolean; body: string };

function scan(src: string, file: string): Proc[] {
  // Named z.object schemas in this file that carry a profileId — deepRead & friends use one.
  const schemas = [...src.matchAll(/const (\w+)\s*=\s*z\.object\(\{([\s\S]{0,600}?)\}\)/g)]
    .filter((m) => /profileId/.test(m[2])).map((m) => m[1]);

  const lines = src.split("\n");
  const heads: Array<[number, string, string]> = [];
  lines.forEach((l, i) => {
    const m = l.match(/^\s*(\w+):\s*(protectedProcedure|publicProcedure|adminProcedure)/);
    if (m) heads.push([i, m[1], m[2]]);
  });

  const out: Proc[] = [];
  heads.forEach(([start, name, kind], idx) => {
    const body = lines.slice(start, heads[idx + 1]?.[0] ?? lines.length).join("\n");
    const inline = [...body.matchAll(/(\w*[Ii]d):\s*z\.(?:number|string)/g)].map((m) => m[1]);
    const viaSchema = schemas.some((s) => new RegExp(`\\.input\\(\\s*${s}\\b`).test(body));
    const ids = [...new Set(viaSchema ? [...inline, "profileId"] : inline)];
    if (ids.length === 0) return;
    out.push({
      file, name, ids, body,
      usesCaller: /ctx\.user\.id/.test(body) || /assertOwnsProfile/.test(body),
      // ADMIN-ONLY means the procedure REFUSES non-admins — an `adminProcedure`, or an explicit
      // `role !== "admin"` refusal. It does NOT mean the word "admin" appears.
      //
      // My first version used /role [!=]== "admin"/, which matched the ordinary
      // `ctx.user.role === "admin"` used for admin-only EXTRAS — the `deepened` flag, the
      // `canForce` refresh. deepRead has one of those, so it counted as "admin-gated" and was
      // excused from the ownership requirement entirely. A mutation probe then deleted
      // assertOwnsProfile from deepRead and this file stayed GREEN. An incidental mention of the
      // word was buying an exemption from the strictest check in the suite.
      admin: kind === "adminProcedure" || /role\s*!==\s*"admin"\s*\)\s*(?:throw|\{[\s\S]{0,80}?throw)/.test(body),
    });
  });
  return out;
}

const ALL = FILES.flatMap((f) => scan(readFileSync(f, "utf8"), f.split("/").slice(-1)[0]));

describe("the sweep can be trusted (controls first)", () => {
  it("covers a real number of id-taking procedures", () => {
    expect(ALL.length).toBeGreaterThan(30);
  });

  it("resolves procedures whose profileId comes from a SHARED schema", () => {
    // The miss that produced a false "all clear" over a third of the narrative surface.
    for (const n of ["deepRead", "dayRead", "cast", "chapter"]) {
      const p = ALL.find((x) => x.name === n);
      expect(p, `${n} not seen as taking an id — the schema resolution broke`).toBeTruthy();
      expect(p!.ids).toContain("profileId");
    }
  });

  it("CATCHES a procedure that never references the caller", () => {
    // Negative control. Without it, "everything is scoped" may only mean the matcher says yes.
    const fake = `  leak: protectedProcedure.input(z.object({ profileId: z.number() })).query(async ({ input }) => {\n    return await getProfileById(input.profileId);\n  }),\n  next: protectedProcedure.query(() => 1),`;
    const found = scan(fake, "fake.ts");
    expect(found.map((f) => f.name)).toEqual(["leak"]);
    expect(found[0].usesCaller).toBe(false);
    expect(found[0].admin).toBe(false);
  });
});

describe("every id-taking endpoint is scoped to the caller", () => {
  it("none ignores the caller's identity entirely", () => {
    const open = ALL.filter((p) => !p.usesCaller && !p.admin).map((p) => `${p.file}:${p.name}(${p.ids})`);
    expect(open, `these accept a client id without ever referencing the caller: ${open.join(", ")}`).toEqual([]);
  });

  it("every profileId endpoint asserts ownership or is admin-only", () => {
    // Stricter than the sweep above: for a PROFILE id, merely mentioning ctx.user.id is not enough
    // — the ownership assert (or an admin gate) has to be there.
    const weak = ALL.filter((p) => p.ids.includes("profileId"))
      .filter((p) => !/assertOwnsProfile/.test(p.body) && !p.admin)
      .map((p) => `${p.file}:${p.name}`);
    expect(weak, `profileId accepted without assertOwnsProfile: ${weak.join(", ")}`).toEqual([]);
  });
});

describe("the two subtle cases, pinned by hand", () => {
  it("combined.read scopes the OTHER profile by userId at the query, and fails closed", () => {
    const p = ALL.find((x) => x.name === "read" && x.ids.includes("otherProfileId"));
    expect(p, "the combined two-profile reading is gone").toBeTruthy();
    // Both halves of the where-clause, and the closed failure.
    expect(p!.body).toMatch(/eqW\(profilesTable\.id, input\.otherProfileId\)/);
    expect(p!.body).toMatch(/eqW\(profilesTable\.userId, ctx\.user\.id\)/);
    expect(p!.body).toMatch(/if \(!b \|\| b\.id === a\.id\) return \{ available: false/);
  });

  it("the profection transit lookup still passes the caller into the query", () => {
    const p = ALL.find((x) => x.name === "forYear");
    expect(p, "profection forYear is gone").toBeTruthy();
    expect(p!.body).toMatch(/getTimeLordTransitsForYear\(input\.profectionYearId, ctx\.user\.id\)/);
  });

  it("assertOwnsProfile itself still scopes by BOTH ids and throws", () => {
    // Everything above leans on this one function. If it ever stops pairing profileId with userId,
    // every assertOwnsProfile call site becomes decorative at once.
    const src = readFileSync(join(ROOT, "routers/profiles.ts"), "utf8");
    expect(src).toMatch(/getProfileById\(profileId, userId\)/);
    expect(src).toMatch(/if \(!owned\) throw new TRPCError\(\{ code: "FORBIDDEN"/);
    expect(src).toMatch(/and\(eq\(profiles\.id, profileId\), eq\(profiles\.userId, userId\)\)/);
  });
});
