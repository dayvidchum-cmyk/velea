import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

/**
 * THE LOCKED PRICE LIST MUST STAY WHAT DAVID RULED (2026-07-22).
 *
 * David locked the price list 2026-07-18 and ruled it SURFACED on 2026-07-22: near-sight $2.99 /
 * all-access $4.99 / pick-a-date $1.49. These are user-visible money strings routed to every locked
 * card through PREMIUM_PRICING — a single source. A static scan (in the spirit of docs-claims /
 * arc-veil, since vitest only covers server+shared) pins the three tiers and their ruled numbers, so
 * an accidental edit to a price, or a tier silently nulled back to "hidden", fails here instead of
 * shipping a wrong number to a paying user. It pins the NUMBER, not the exact formatting — David is
 * free to restyle "$2.99 / mo"; he is not free to lose the tier or fat-finger the amount unnoticed.
 *
 * When David changes the price list, change it here in the SAME commit — that is the ruling moving,
 * not a broken test.
 */
const SRC = readFileSync(new URL("../client/src/lib/pricing.ts", import.meta.url), "utf8");

// The PREMIUM_PRICING initializer body (the `= { ... }` at the end), where the live values live —
// so a number sitting only in the doc comment can't satisfy the guard.
const initializer = SRC.slice(SRC.indexOf("} = {"));

describe("the locked price list is wired to David's ruling", () => {
  it("carries the three ruled tiers, not the old two-slot shape", () => {
    expect(SRC).toMatch(/nearSight:/);
    expect(SRC).toMatch(/allAccess:/);
    expect(SRC).toMatch(/pickADate:/);
    // The pre-7/22 shape (monthly / momentRead) is gone — no consumer should reach for it.
    expect(SRC).not.toMatch(/\bmonthly:/);
    expect(SRC).not.toMatch(/\bmomentRead:/);
  });

  it("near-sight is $2.99, surfaced (not null)", () => {
    expect(initializer).toMatch(/nearSight:\s*"[^"]*2\.99[^"]*"/);
  });

  it("all-access is $4.99, surfaced (not null)", () => {
    expect(initializer).toMatch(/allAccess:\s*"[^"]*4\.99[^"]*"/);
  });

  it("pick-a-date is $1.49, surfaced (not null)", () => {
    expect(initializer).toMatch(/pickADate:\s*"[^"]*1\.49[^"]*"/);
  });
});
