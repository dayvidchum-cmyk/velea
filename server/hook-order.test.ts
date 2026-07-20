import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

/**
 * NO HOOK MAY SIT BELOW AN EARLY RETURN (v811).
 *
 * Users.tsx returned null above roughly fifteen hooks. React's rules make that a crash the first
 * time the branch is taken on a mount where it was not taken before — and the sheet's mitigation
 * ("guarded upstream by App.tsx") was FALSE: /admin/users is registered with no role check, and the
 * auth gate only bars logged-OUT users. What actually prevented the crash is that user.role cannot
 * change within a mount… on the one page that carries the setUserRole mutation.
 *
 * This scans every page rather than pinning the file that was wrong, so the next one cannot come
 * back. It lives under server/ because that is where the vitest include points; it is a source
 * scan, and the defect is structural and visible in the text.
 */
const PAGES = join(new URL("../client/src/pages/", import.meta.url).pathname);
const HOOK = /\b(useState|useEffect|useLayoutEffect|useMemo|useCallback|useRef|useQuery|useMutation|useAuth|useLocation|useContext|useReducer)\s*\(/g;

/** A component-level `return` — indented exactly two spaces, so nested callbacks are excluded. */
const EARLY_RETURN = /^ {2}(?:if \([^\n]*\) )?return[ ;(]/gm;

/** The body of the DEFAULT-EXPORTED component only, bounded by brace matching.
 *  My first version of this sliced to end-of-file and flagged Horoscope.tsx and Settings.tsx —
 *  which was the PROBE being wrong, not the pages: both define sibling components BELOW the default
 *  export, so their hooks appeared to sit "after" the main render return. Reported as a finding it
 *  would have been noise. A scan that cannot tell a sibling component from a broken one is not a
 *  scan. */
function defaultComponentBody(src: string): string | null {
  const m = /export default function \w+[^{]*\{/.exec(src);
  if (!m) return null;
  let depth = 0;
  for (let i = m.index + m[0].length - 1; i < src.length; i++) {
    const ch = src[i];
    if (ch === "{") depth++;
    else if (ch === "}") { depth--; if (depth === 0) return src.slice(m.index, i + 1); }
  }
  return null;
}

function offendersIn(src: string): string[] {
  const out: string[] = [];
  const body = defaultComponentBody(src);
  if (!body) return out;
  const returns: number[] = [];
  let m: RegExpExecArray | null;
  EARLY_RETURN.lastIndex = 0;
  while ((m = EARLY_RETURN.exec(body))) returns.push(m.index);
  if (!returns.length) return out;
  const firstReturn = returns[0];
  HOOK.lastIndex = 0;
  while ((m = HOOK.exec(body))) if (m.index > firstReturn) out.push(m[1]);
  return out;
}

describe("component hook order", () => {
  const files = readdirSync(PAGES).filter((f) => f.endsWith(".tsx"));

  it("finds files to scan — a scan over nothing proves nothing", () => {
    expect(files.length).toBeGreaterThan(5);
  });

  it("Users.tsx keeps every hook above its admin guard", () => {
    const src = readFileSync(join(PAGES, "Users.tsx"), "utf8");
    expect(src).toContain("if (user && !isAdmin) return null");
    expect(offendersIn(src)).toEqual([]);
  });

  it("Users.tsx redirects in an effect, not during render", () => {
    const src = readFileSync(join(PAGES, "Users.tsx"), "utf8");
    expect(src).toMatch(/useEffect\(\(\) => \{\s*if \(user && !isAdmin\) setLocation\("\/"\);/);
  });

  it("no page runs a hook after a component-level early return", () => {
    const bad: Record<string, string[]> = {};
    for (const f of files) {
      const hooks = offendersIn(readFileSync(join(PAGES, f), "utf8"));
      if (hooks.length) bad[f] = hooks;
    }
    expect(bad).toEqual({});
  });
});
