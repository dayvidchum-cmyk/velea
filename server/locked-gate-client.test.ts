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
 *
 * IT WAS STILL BLIND TWICE OVER (audit 2026-07-20), and AUDIT_STATUS.md repeated its clean result
 * as "guarded across all 21 lockable endpoints":
 *   1. It matched `useQuery` only. Seven lockable procedures are called as MUTATIONS — the
 *      pick-a-date reveal, the eclipse season, the Mercury and slow-planet reviews, the month read,
 *      the combined read — and every one of them rendered a lock as an astronomical fact ("the sky
 *      is between eclipse seasons", "Venus is running clear") or as an outage with a dead retry.
 *   2. Its "does `locked` appear within 120 chars of the alias" heuristic matched the word inside
 *      "not yet unlocked." — marketing copy in a `detail` string — so three of the query call sites
 *      were passing by coincidence. It now requires a property ACCESS: `.locked` / `?.locked`.
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
    const whole = readFileSync(f, "utf8");
    // PER-COMPONENT, not per-file (the probe caught this): Horoscope.tsx declares `reveal` in five
    // different cards, so a file-wide search for "reveal…?.locked" was satisfied by a SIBLING
    // card's handling while the card under test had none. Scope each call site to the component
    // body it sits in — the file is cut at top-level `function X(` boundaries.
    const bounds = [...whole.matchAll(/^(?:export default |export )?function \w+\(/gm)].map((b) => b.index!);
    const scopeOf = (at: number) => {
      const start = bounds.filter((b) => b <= at).pop() ?? 0;
      const end = bounds.find((b) => b > at) ?? whole.length;
      return whole.slice(start, end);
    };
    for (const m of whole.matchAll(/const\s+(\w+)\s*=\s*trpc\.([\w.]+)\.use(?:Query|Mutation)/g)) {
      const s = scopeOf(m.index!);
      const [, v, path] = m;
      if (!lockable.has(path.split(".").at(-1)!)) continue;
      // Follow one aliasing hop — `const d: any = someQ.data` and `const readQ = ... peekQ ...`
      // are both how these pages actually read. Missing the type annotation in this regex made
      // the first version of this test report a false positive.
      const names = [v];
      for (const a of s.matchAll(new RegExp(`const\\s+(\\w+)\\s*(?::[^=\\n]+)?=\\s*[^;\\n]*\\b${v}\\b`, "g"))) {
        names.push(a[1]);
      }
      // ...and one hop through a promise callback, which is how the peek-into-state pages read:
      // `planetRxPeek.mutateAsync({...}).then((r) => setReads(...))` — the value never gets a
      // `const` name, so without this the scan reports a call site that DOES handle the lock.
      // Name collisions are possible (two different `r`s in one file); this errs toward not
      // crying wolf, and the per-endpoint sweep is still the thing being asserted.
      for (const a of s.matchAll(new RegExp(`\\b${v}\\b[\\s\\S]{0,160}?\\.then\\(\\s*\\((\\w+)\\)`, "g"))) {
        names.push(a[1]);
      }
      // A property ACCESS, not the letters: `detail="… not yet unlocked."` used to satisfy this.
      if (!names.some((n) => new RegExp(`\\b${n}\\b[^\\n]{0,120}\\??\\.locked\\b`).test(s))) {
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

  it("the scan sees MUTATION call sites too, and cannot be satisfied by the word in prose", () => {
    // CONTROLS for the two ways this test was blind. Both run against synthetic source, so they
    // fail if the matcher is ever loosened back — the real sweep above then means something.
    const lockable = lockableProcedures();
    for (const p of ["reveal", "eclipseSeason", "mercuryRx", "planetRxPeek", "month"]) {
      expect(lockable, `${p} answers locked:true on the server`).toContain(p);
    }
    const mut = (src: string) => /const\s+(\w+)\s*=\s*trpc\.([\w.]+)\.use(?:Query|Mutation)/.test(src);
    expect(mut("const reveal = trpc.horoscope.eclipseSeason.useMutation();")).toBe(true);
    expect(mut("const q = trpc.narrative.houseRead.useQuery(x);")).toBe(true);
    const handled = (alias: string, src: string) => new RegExp(`\\b${alias}\\b[^\\n]{0,120}\\??\\.locked\\b`).test(src);
    expect(handled("season", 'detail="A premium reading, not yet unlocked."'), "prose satisfies the matcher again").toBe(false);
    expect(handled("reveal", "const locked = !!(reveal.data as any)?.locked;")).toBe(true);
  });
});
