/**
 * The marketing route list exists in TWO places that cannot import each other:
 * `marketingPages` in server/_core/index.ts (what the server serves) and `MARKETING`
 * in client/public/sw.js (what the service worker must NEVER store as the app shell).
 * sw.js is a plain static file with no build step, so there is no shared constant to
 * reach for — only this test.
 *
 * The failure it guards is silent and delayed: add a route (this happened with /gate),
 * forget sw.js, and the first installed-PWA visitor to that page overwrites the cached
 * offline shell with a marketing page. Nothing errors; the app just opens to the wrong
 * document the next time it is offline.
 */
import { describe, expect, it } from "vitest";
import fs from "fs";
import path from "path";

const ROOT = path.resolve(import.meta.dirname, "..");

function serverMarketingPaths(): string[] {
  const src = fs.readFileSync(path.join(ROOT, "server/_core/index.ts"), "utf8");
  const block = src.match(/const marketingPages: Record<string, string> = \{([\s\S]*?)\};/);
  expect(block, "marketingPages literal not found — did its shape change?").toBeTruthy();
  const paths = [...block![1].matchAll(/"(\/[a-z0-9-]*)":/g)].map((m) => m[1]);
  expect(paths.length, "extracted zero routes — the matcher is broken, not the code").toBeGreaterThan(3);
  return paths;
}

function swMarketingPaths(): string[] {
  const src = fs.readFileSync(path.join(ROOT, "client/public/sw.js"), "utf8");
  const block = src.match(/const MARKETING = \[([^\]]*)\]/);
  expect(block, "MARKETING array not found in sw.js").toBeTruthy();
  const paths = [...block![1].matchAll(/"(\/[a-z0-9-]*)"/g)].map((m) => m[1]);
  expect(paths.length, "extracted zero paths — the matcher is broken, not the code").toBeGreaterThan(3);
  return paths;
}

describe("marketing routes ↔ service worker parity", () => {
  it("sw.js excludes every server-served marketing page, plus the root", () => {
    const server = serverMarketingPaths();
    const sw = new Set(swMarketingPaths());
    expect(sw.has("/"), "root must be excluded — on velealor.com it can be the landing").toBe(true);
    for (const p of server) {
      expect(sw.has(p), `${p} is served as marketing but sw.js would cache it as the app shell`).toBe(true);
    }
  });

  it("sw.js lists nothing the server does not serve", () => {
    const server = new Set([...serverMarketingPaths(), "/"]);
    for (const p of swMarketingPaths()) {
      expect(server.has(p), `sw.js excludes ${p}, which is no longer a marketing route`).toBe(true);
    }
  });
});
