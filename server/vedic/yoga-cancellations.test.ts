import { describe, it, expect } from "vitest";
import { detectYogas } from "./yoga-detect";
import yogasCanon from "./canon/yogas.json";

/**
 * THE TWO AFFLICTION YOGAS MUST CARRY THEIR CANON CANCELLATIONS (v800).
 *
 * Kemadruma and Sakata are the only detectors in this engine whose RESULT text is bad news about a
 * person's whole life — canon/yogas.json says Kemadruma means "loneliness, a poor or difficult
 * life". Both shipped without the neutralizing clause stated in their own canon entry, so a free
 * shelf could print that verdict at a chart the canon exempts. Gaja Keshari — one of the three
 * cancellers — was already being computed two lines away and simply never consulted.
 *
 * 42 detectors shipped with no test file at all. This is the first.
 */

const canonNote = (name: string) =>
  ((yogasCanon as any).yogas as any[]).find((y) => y.name === name)?.note ?? "";

const has = (yogas: ReturnType<typeof detectYogas>, name: string) => yogas.some((y) => y.name === name);

/** Aries lagna at 15° Aries. Longitudes are sign-centre degrees unless a test needs otherwise. */
const at = (signIdx: number) => signIdx * 30 + 15;
const ARIES_LAGNA = at(0);

/** Base chart: Moon alone in Gemini (3rd from an Aries lagna — NOT a kendra or trine), with its
 *  2nd and 12th from the Moon empty of the five non-luminaries, and Jupiter far away so neither
 *  Gaja Keshari nor Sakata interferes. This is a genuine, uncancelled Kemadruma. */
const BASE: Record<string, number> = {
  Sun: at(9),      // Capricorn
  Moon: at(2),     // Gemini — 3rd from lagna
  Mars: at(9),     // Capricorn
  Mercury: at(9),  // Capricorn
  Jupiter: at(7),  // Scorpio — 6th from the Moon, so Sakata's own condition is live
  Venus: at(9),    // Capricorn
  Saturn: at(9),   // Capricorn
  Rahu: at(1), Ketu: at(7),
};
const run = (over: Partial<Record<string, number>> = {}, lagnaLon = ARIES_LAGNA) =>
  detectYogas({ lonBy: { ...BASE, ...over }, lagnaLon } as any);

describe("Kemadruma carries the canon's three cancellations", () => {
  it("the canon really does state them — denominator for every test below", () => {
    expect(canonNote("Kemadruma")).toMatch(/Neutralized if the Moon is in a kendra\/trine, conjunct another planet, or forms Gaja Keshari/);
  });

  it("fires when genuinely uncancelled", () => {
    // Without this the whole file could pass by never forming the yoga at all.
    expect(has(run(), "Kemadruma")).toBe(true);
  });

  it("is cancelled by the Moon in a KENDRA from the ascendant", () => {
    expect(has(run({ Moon: at(3) }), "Kemadruma")).toBe(false); // Cancer = 4th from Aries
  });

  it("is cancelled by the Moon in a TRINE from the ascendant", () => {
    expect(has(run({ Moon: at(4) }), "Kemadruma")).toBe(false); // Leo = 5th from Aries
  });

  it("is cancelled by a planet CONJUNCT the Moon", () => {
    // Saturn joins the Moon in Gemini. It is not in the 2nd or 12th from the Moon, so the yoga's
    // own condition still holds — only the cancellation stops it.
    expect(has(run({ Saturn: at(2) }), "Kemadruma")).toBe(false);
  });

  it("is cancelled by GAJA KESHARI, which was computed and ignored", () => {
    // Jupiter in Sagittarius = 7th from a Gemini Moon (a kendra from the Moon), undebilitated,
    // uncombust, with Venus conjunct it as the benefic association.
    const y = run({ Jupiter: at(8), Venus: at(8) });
    expect(has(y, "Gaja Keshari")).toBe(true);
    expect(has(y, "Kemadruma")).toBe(false);
  });
});

describe("Sakata carries its canon cancellation", () => {
  it("the canon really does state it", () => {
    expect(canonNote("Sakata / Shataka")).toMatch(/NOT formed if the Moon is in an angle to the Ascendant/);
  });

  it("forms when the Moon is 6th/8th/12th from Jupiter and NOT in an angle", () => {
    expect(has(run(), "Sakata / Shataka")).toBe(true); // Gemini Moon is 6th from a Scorpio Jupiter
  });

  it("is NOT formed when the Moon sits in an angle to the ascendant", () => {
    // Moon to Cancer (4th from Aries = a kendra); Jupiter to Aquarius keeps it 6th from the Moon,
    // so the yoga's own condition is still satisfied and only the angle stops it.
    const y = run({ Moon: at(3), Jupiter: at(10) });
    expect(has(y, "Sakata / Shataka")).toBe(false);
  });
});

describe("the cancellations are measured from the ASCENDANT, not from the running frame", () => {
  // This is the trap I walked into while writing the fix. detectYogas evaluates every yoga in the
  // lagna, chandra and surya frames and reports a hit if ANY frame holds it. In the chandra frame
  // the Moon is trivially house 1 — a kendra AND a trine — so referencing the cancellation to the
  // running frame would auto-cancel both afflictions for every chart ever, while also breaking the
  // FRAME_INDEPENDENT contract these two are declared under.
  it("still reports both as frame-independent, i.e. one 'natal' frame and not a per-frame list", () => {
    const k = run().find((y) => y.name === "Kemadruma");
    const s = run().find((y) => y.name === "Sakata / Shataka");
    expect(k!.frames).toEqual(["natal"]);
    expect(s!.frames).toEqual(["natal"]);
  });

  it("a chart whose Moon is NOT angular to the lagna still forms them", () => {
    // The Moon is house 1 from the Chandra lagna by definition. If the cancellation had followed the
    // frame, this chart would report neither yoga.
    expect(has(run(), "Kemadruma")).toBe(true);
    expect(has(run(), "Sakata / Shataka")).toBe(true);
  });

  it("moving only the LAGNA cancels them, proving the ascendant is what is being read", () => {
    // Same planets exactly; only the ascendant moves, putting the Gemini Moon in a kendra (Gemini is
    // the 4th from a Pisces lagna) — and both afflictions must switch off.
    const y = run({}, at(11)); // Pisces lagna
    expect(has(y, "Kemadruma")).toBe(false);
    expect(has(y, "Sakata / Shataka")).toBe(false);
  });
});

describe("the combustion verdict, not the combustion report (v800)", () => {
  // combustion() returns { combust, orbDeg, limitDeg } for every orb-bearing planet, so the old
  // `!!combustion(...)` was true for every planet but the Sun, always. Two yogas depended on it and
  // both were broken in opposite directions — one could never fire, one always fired.
  const clear = { ...BASE, Jupiter: at(8), Venus: at(8) };          // Jupiter 120°+ from the Sun
  const combustJup = { ...BASE, Jupiter: at(9) + 3, Sun: at(9), Venus: at(9) }; // ~3° from the Sun

  it("Gaja Keshari can form at all — it could not, for any chart, before this fix", () => {
    const y = detectYogas({ lonBy: clear, lagnaLon: ARIES_LAGNA } as any);
    expect(has(y, "Gaja Keshari")).toBe(true);
  });

  it("and still refuses when Jupiter really IS combust", () => {
    // Denominator: if this also passed, the fix would just be "always form it".
    const y = detectYogas({ lonBy: combustJup, lagnaLon: ARIES_LAGNA } as any);
    expect(has(y, "Gaja Keshari")).toBe(false);
  });

  it("'Dur' now depends on real combustion instead of being true by construction", () => {
    // Aries lagna. Arm A: the 6th lord Mercury sits in Cancer, a kendra. Arm B is `some angular lord
    // is combust OR in 6/8/12` — and with Mars, Moon, Jupiter and Saturn all out of the dusthanas
    // and all clear of the Sun, arm B can only be satisfied by combustion. Before the fix the left
    // side of arm B was always true, so this chart reported Dur; now it does not.
    const clearAngular: any = {
      Sun: at(4), Moon: at(2), Mars: at(0), Mercury: at(3),
      Jupiter: at(8), Venus: at(1), Saturn: at(9), Rahu: at(5), Ketu: at(11),
    };
    expect(has(detectYogas({ lonBy: clearAngular, lagnaLon: ARIES_LAGNA } as any), "Dur")).toBe(false);

    // And it still fires when an angular lord genuinely IS combust — Saturn, the 10th lord, moved to
    // 5° from the Sun. This pair is the denominator: the fix is a real verdict, not a blanket false.
    const saturnCombust = { ...clearAngular, Saturn: at(4) + 5 };
    expect(has(detectYogas({ lonBy: saturnCombust, lagnaLon: ARIES_LAGNA } as any), "Dur")).toBe(true);
  });
});

describe("the OTHER yogas that ship bad news to a free surface (v828)", () => {
  /**
   * Kemadruma printed "loneliness, a poor or difficult life" at charts the canon exempts, for as
   * long as it existed, because nothing tested it. Six canon yogas carry a bad-news RESULT and
   * appear on the free shelf. Two now have controls (above). These are the other three that are
   * deterministically checkable — verified against their canon conditions, and each with the
   * negative case that proves the assertion is not vacuous.
   *
   * Finding, recorded because a clean result is worth recording too: all three MATCH the canon.
   * The one real gap is noted at the end.
   */
  const A = (i: number) => i * 30 + 15;
  const yogasOf = (lonBy: any, lagnaLon = A(0)) => detectYogas({ lonBy, lagnaLon } as any);
  const fires = (lonBy: any, name: string, lagnaLon = A(0)) => has(yogasOf(lonBy, lagnaLon), name);

  it("PAPA KARTARI fires on malefics enclosing the 2nd and 12th", () => {
    expect(canonNote("Papa Kartari")).toBe("");           // the canon states no cancellation
    const chart = { Sun: A(1), Moon: A(4), Mars: A(11), Mercury: A(5), Jupiter: A(8), Venus: A(6), Saturn: A(9), Rahu: A(2), Ketu: A(8) };
    expect(fires(chart, "Papa Kartari")).toBe(true);      // Sun in the 2nd, Mars in the 12th
  });

  it("PAPA KARTARI does NOT fire on the NODES alone — the canon excludes them by name", () => {
    // "Malefic planets (not the Nodes) occupy the 2nd and 12th." A detector that counted Rahu/Ketu
    // would print poor health and financial difficulty at a very large number of charts.
    const nodesOnly = { Sun: A(4), Moon: A(4), Mars: A(5), Mercury: A(5), Jupiter: A(8), Venus: A(6), Saturn: A(8), Rahu: A(1), Ketu: A(11) };
    expect(fires(nodesOnly, "Papa Kartari")).toBe(false);
  });

  it("KALA SARPA fires only when ALL SEVEN sit on one side of the nodal axis", () => {
    const allOneSide = { Rahu: A(0), Ketu: A(6), Sun: A(1), Moon: A(2), Mars: A(3), Mercury: A(4), Jupiter: A(1), Venus: A(2), Saturn: A(3) };
    expect(fires(allOneSide, "Kala Sarpa")).toBe(true);
    // One planet across the axis breaks it — the canon says all seven, and "six of seven" is a
    // materially different chart to tell someone they have.
    expect(fires({ ...allOneSide, Saturn: A(9) }, "Kala Sarpa")).toBe(false);
  });

  it("SARPA needs an OCCUPIED kendra, so an empty-angles chart is not condemned", () => {
    // "Only natural malefics in the angular houses" is vacuously true when no angle is occupied.
    // The detector carries a non-vacuity guard; without it every angle-empty chart would report
    // "a difficult and troublesome life".
    const emptyAngles = { Sun: A(1), Moon: A(1), Mars: A(2), Mercury: A(2), Jupiter: A(4), Venus: A(4), Saturn: A(5), Rahu: A(7), Ketu: A(1) };
    expect(fires(emptyAngles, "Sarpa")).toBe(false);
  });

  it("KALA SARPA's canon MITIGATION is not implemented — recorded, not silently ignored", () => {
    // The canon note says the yoga is "improved if the nodes' dispositors are well placed and the
    // nodes in compatible signs". That is a softening, not a cancellation like Kemadruma's, so it
    // does not gate the detector — but it is real canon the engine does not read, and it belongs in
    // the record rather than in nobody's head.
    expect(canonNote("Kala Sarpa")).toMatch(/Improved if the nodes' dispositors are well placed/);
  });
});
