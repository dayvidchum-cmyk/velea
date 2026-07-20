import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * THE OTHER HALF OF THE LOCK.
 *
 * billing-gate.test.ts guards that every premium refusal SAYS `locked: true`. Nothing guarded
 * the client HONOURING it — which is the half that was overclaimed: v787 said "every gate" having
 * done five of nine, and v788 finished it by hand. By hand means it can come undone by hand, and
 * it did: atlas.windowRead was still falling through to "The season is quiet — try again in a
 * moment", an outage message with a retry that can never succeed, for a reader whose entitlement
 * had lapsed.
 *
 * REACHABLE, not theoretical: pages read `entitled` from a separate query with a long staleTime,
 * so the client can still believe it is entitled while the server has already said no.
 *
 * The check is per-ENDPOINT, not per-file. A file-level "does this file mention locked" check
 * passes on LifeAtlas.tsx even with the bug, because its OTHER endpoint handled it — that weaker
 * version was written first and had to be thrown away.
 */
const ROOT = new URL("..", import.meta.url).pathname;

function walk(dir: string, ext: string[], out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name === "dist" || name === ".git") continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, ext, out);
    else if (ext.some((e) => p.endsWith(e)) && !p.includes(".test.")) out.push(p);
  }
  return out;
}

/** Every tRPC procedure that can answer `locked: true`. */
function lockableProcedures(): Set<string> {
  const out = new Set<string>();
  for (const f of walk(join(ROOT, "server"), [".ts"])) {
    const s = readFileSync(f, "utf8");
    for (const m of s.matchAll(/(\w+):\s*(?:protectedProcedure|publicProcedure)/g)) {
      let body = s.slice(m.index! + m[0].length, m.index! + m[0].length + 4000);
      const next = body.match(/\n\s{2,4}\w+:\s*(?:protectedProcedure|publicProcedure)/);
      if (next) body = body.slice(0, next.index!);
      if (/locked:\s*true/.test(body)) out.add(m[1]);
    }
  }
  return out;
}

/** Client call sites of a lockable procedure that never branch on `.locked`. */
function unhandled(): string[] {
  const lockable = lockableProcedures();
  const missing: string[] = [];
  for (const f of walk(join(ROOT, "client", "src"), [".tsx"])) {
    const s = readFileSync(f, "utf8");
    for (const m of s.matchAll(/const\s+(\w+)\s*=\s*trpc\.([\w.]+)\.useQuery/g)) {
      const [, v, path] = m;
      if (!lockable.has(path.split(".").at(-1)!)) continue;
      // Follow one aliasing hop — `const d: any = someQ.data` and `const readQ = ... peekQ ...`
      // are both how these pages actually read. Missing the type annotation in this regex made
      // the first version of this test report a false positive.
      const names = [v];
      for (const a of s.matchAll(new RegExp(`const\\s+(\\w+)\\s*(?::[^=\\n]+)?=\\s*[^;\\n]*\\b${v}\\b`, "g"))) {
        names.push(a[1]);
      }
      if (!names.some((n) => new RegExp(`\\b${n}\\b[^\\n]{0,120}locked`).test(s))) {
        missing.push(`${f.split("/").at(-1)}: ${path} (via ${v})`);
      }
    }
  }
  return missing;
}

describe("a server lock must reach the reader as a gate, never as an outage", () => {
  it("the scan is not blind — it finds the lockable endpoints and the pages that call them", () => {
    const lockable = lockableProcedures();
    expect(lockable.size).toBeGreaterThanOrEqual(15); // denominator
    for (const p of ["windowRead", "themeRead", "houseRead", "dayRead"]) expect(lockable).toContain(p);
  });

  it("every client query on a lockable endpoint branches on locked", () => {
    const missing = unhandled();
    expect(missing, `these render a server lock as a failure: ${missing.join(", ")}`).toEqual([]);
  });
});
