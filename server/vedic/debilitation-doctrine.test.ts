import { describe, it, expect } from "vitest";
import { neechaBhanga } from "./dignity.js";
import type { Graha } from "./dignity.js";

/**
 * DEBILITATION — David's doctrine, 2026-07-20 (canon/debilitation-doctrine.md).
 *
 * He listed six cancellation conditions. Two were missing from the engine and are added here:
 * CONJUNCTION with the sign lord (his #4 says "mutual aspect OR conjunction" — we had aspect only),
 * and PARIVARTANA, the sign exchange (his #5).
 *
 * Two more of his six are deliberately NOT added, because both need his ruling rather than my
 * inference — see the doctrine file:
 *   · the debilitated planet ITSELF in a kendra, which I previously told him was a mistranslation
 *     of Phaladeepika 7.30 and which his doctrine lists as commonly cited. Verse vs practice.
 *   · benefic support, which he himself flags as "not always listed as a primary rule".
 */

// Longitudes by sign index * 30 + degree. Sun debilitates in Libra (180°), ruled by Venus.
const deg = (signIdx: number, d = 15) => signIdx * 30 + d;
const LIBRA = 6, TAURUS = 1, LEO = 4, ARIES = 0, CANCER = 3;

function chart(over: Partial<Record<Graha, number>> = {}): Record<Graha, number> {
  const base: Record<string, number> = {
    Sun: deg(LIBRA), Moon: deg(CANCER), Mars: deg(ARIES), Mercury: deg(TAURUS),
    Jupiter: deg(TAURUS), Venus: deg(TAURUS), Saturn: deg(TAURUS), Rahu: deg(TAURUS), Ketu: deg(LEO),
  };
  return { ...base, ...over } as Record<Graha, number>;
}

describe("conjunction with the dispositor (his condition 4, second half)", () => {
  it("cancels when the fallen planet sits in the SAME SIGN as its rescuer", () => {
    // Sun fallen in Libra; Venus (Libra's lord) also in Libra. The most direct support there is.
    const r = neechaBhanga("Sun", chart({ Venus: deg(LIBRA, 20) }), deg(LEO));
    expect(r.cancelled).toBe(true);
    expect(r.reasons.join(" | ")).toMatch(/conjunct its dispositor Venus/);
    expect(r.by).toContain("Venus");
  });

  it("does not fire merely because the dispositor exists somewhere", () => {
    // Venus in Taurus — not conjunct, not in a kendra from a Leo lagna (Taurus is the 10th... so it
    // IS a kendra). Use a lagna that makes Taurus non-angular so only the conjunction rule is tested.
    const r = neechaBhanga("Sun", chart({ Venus: deg(TAURUS) }), deg(ARIES));
    expect(r.reasons.join(" | ")).not.toMatch(/conjunct its dispositor/);
  });
});

describe("parivartana — the sign exchange (his condition 5)", () => {
  it("cancels when each planet sits in a sign the other rules", () => {
    // Sun fallen in Libra (Venus's sign); Venus in Leo (the Sun's sign). A true exchange.
    const r = neechaBhanga("Sun", chart({ Venus: deg(LEO) }), deg(TAURUS));
    expect(r.cancelled).toBe(true);
    expect(r.reasons.join(" | ")).toMatch(/sign exchange with Venus \(parivartana\)/);
  });

  it("does NOT fire when the dispositor merely sits in some other sign", () => {
    // Venus in Cancer — Cancer is ruled by the Moon, not the Sun. No exchange.
    const r = neechaBhanga("Sun", chart({ Venus: deg(CANCER) }), deg(TAURUS));
    expect(r.reasons.join(" | ")).not.toMatch(/parivartana/);
  });
});

describe("what the doctrine says this function must NOT claim", () => {
  it("reports cancellation only — never a raja yoga", () => {
    // "Neecha Bhanga is not automatically Raja Yoga… Not everyone with Neecha Bhanga experiences
    // extraordinary success." The returned shape must carry no such promise.
    const r = neechaBhanga("Sun", chart({ Venus: deg(LEO) }), deg(TAURUS));
    expect(Object.keys(r).sort()).toEqual(["by", "cancelled", "count", "reasons"]);
    expect(JSON.stringify(r)).not.toMatch(/raja/i);
  });

  it("a planet that is not debilitated is not cancelled", () => {
    // Step 1 of his six-step evaluation: is the planet ACTUALLY debilitated?
    const r = neechaBhanga("Sun", chart({ Sun: deg(LEO) }), deg(LEO));
    expect(r.cancelled).toBe(false);
  });

  it("counts distinct reasons, so two rules firing is visible as two", () => {
    // He is explicit that a cancellation can be marginal or strong. The count is the only signal
    // the engine currently gives, and it must stay honest — deduped, not inflated.
    const r = neechaBhanga("Sun", chart({ Venus: deg(LEO) }), deg(TAURUS));
    expect(r.count).toBe(new Set(r.reasons).size);
  });
});
