import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import canon from "./canon/planetary-friendships.json";
import karakas from "./canon/karakas.json";

/**
 * PLANETARY FRIENDSHIPS — the canon, and the one module that keeps its own copy (v844).
 *
 * Five canon files have production readers and NO test: planetary-friendships, house-lord-
 * combinations, muhurta-tables, timing, bhava-significations. This is the highest-stakes of them:
 * naisargika maitri decides the friend/neutral/enemy tier, which is most of what "condition" means
 * in every reading the model receives.
 *
 * WHAT I WENT LOOKING FOR AND DID NOT FIND. server/panchang/dignity.ts — the module whose
 * dignityLabel() feeds the readings — does NOT import this canon file. It hand-rolls FRIEND and
 * ENEMY tables, which is exactly the shape of the karakas drift fixed at v790/v799 (canon present,
 * consumer keeping a private copy that silently rots). I compared all seven planets across all
 * three buckets, including the neutrals the module leaves implicit.
 *
 *   ZERO MISMATCHES. The hand-rolled table is correct.
 *
 * I am recording that as the finding, because after v839 — where I reported a second cited source
 * as "drift" because I had already named a class and went hunting for more of it — an audit that
 * finds nothing has to be able to say so plainly instead of reaching for something to report.
 *
 * What IS true is that the duplicate is UNGUARDED: two copies of one table, and nothing noticing if
 * they diverge. That is the actual exposure, and it is what these tests close.
 */

type Bucket = { friends?: string[]; neutral?: string[]; enemies?: string[] };
const F: Record<string, Bucket> = (canon as any).friendships;
const PLANETS = Object.keys(F);

const DIGNITY_SRC = readFileSync(new URL("../panchang/dignity.ts", import.meta.url), "utf8");
function tableFrom(name: string): Record<string, Set<string>> {
  const m = DIGNITY_SRC.match(new RegExp(`${name}: Record<string, string\\[\\]> = \\{([\\s\\S]*?)\\n\\};`));
  if (!m) throw new Error(`${name} is gone from panchang/dignity.ts — it did not drift, it vanished`);
  const out: Record<string, Set<string>> = {};
  for (const e of m[1].matchAll(/(\w+):\[(.*?)\]/g)) {
    out[e[1]] = new Set([...e[2].matchAll(/"(\w+)"/g)].map((x) => x[1]));
  }
  return out;
}

describe("the canon table itself", () => {
  it("matches the classical naisargika maitri (BPHS ch.3)", () => {
    // Typed from the standard reading, not from our own file — otherwise this only proves the file
    // equals itself. Sun/Moon/Mars/Jupiter are the "solar" group, Mercury/Venus/Saturn the other.
    const BPHS: Record<string, { friends: string[]; neutral: string[]; enemies: string[] }> = {
      Sun: { friends: ["Jupiter", "Mars", "Moon"], neutral: ["Mercury"], enemies: ["Saturn", "Venus"] },
      Moon: { friends: ["Mercury", "Sun"], neutral: ["Jupiter", "Mars", "Saturn", "Venus"], enemies: [] },
      Mars: { friends: ["Jupiter", "Moon", "Sun"], neutral: ["Saturn", "Venus"], enemies: ["Mercury"] },
      Mercury: { friends: ["Sun", "Venus"], neutral: ["Jupiter", "Mars", "Saturn"], enemies: ["Moon"] },
      Jupiter: { friends: ["Mars", "Moon", "Sun"], neutral: ["Saturn"], enemies: ["Mercury", "Venus"] },
      Venus: { friends: ["Mercury", "Saturn"], neutral: ["Jupiter", "Mars"], enemies: ["Moon", "Sun"] },
      Saturn: { friends: ["Mercury", "Venus"], neutral: ["Jupiter"], enemies: ["Mars", "Moon", "Sun"] },
    };
    for (const p of PLANETS) {
      expect([...(F[p].friends ?? [])].sort(), `${p} friends`).toEqual(BPHS[p].friends);
      expect([...(F[p].neutral ?? [])].sort(), `${p} neutral`).toEqual(BPHS[p].neutral);
      expect([...(F[p].enemies ?? [])].sort(), `${p} enemies`).toEqual(BPHS[p].enemies);
    }
  });

  it("classifies all six others for every planet — no silent gaps", () => {
    // A missing planet reads as "neutral" downstream, which is a real answer for a real question.
    for (const p of PLANETS) {
      const all = [...(F[p].friends ?? []), ...(F[p].neutral ?? []), ...(F[p].enemies ?? [])];
      expect(new Set(all).size, `${p} classifies ${all.length}`).toBe(6);
      expect(all).not.toContain(p);
    }
  });

  it("is NATURAL friendship only — the temporal table is a different thing", () => {
    expect((canon as any)._note).toMatch(/naisargika/i);
    expect((canon as any)._source).toMatch(/Vol II/);
  });
});

describe("panchang/dignity.ts keeps a private copy — it must not drift", () => {
  const FRIEND = tableFrom("FRIEND");
  const ENEMY = tableFrom("ENEMY");

  it("agrees with the canon on friends and enemies, planet by planet", () => {
    for (const p of PLANETS) {
      expect([...(FRIEND[p] ?? [])].sort(), `${p} friends`).toEqual([...(F[p].friends ?? [])].sort());
      expect([...(ENEMY[p] ?? [])].sort(), `${p} enemies`).toEqual([...(F[p].enemies ?? [])].sort());
    }
  });

  it("agrees on the NEUTRALS it leaves implicit — the half nobody would check", () => {
    // The module says "anything not friend/enemy is neutral". That implicit set is where a drift
    // would hide, because it is never written down anywhere to compare.
    for (const p of PLANETS) {
      const implied = PLANETS.filter((q) => q !== p && !FRIEND[p]?.has(q) && !ENEMY[p]?.has(q)).sort();
      expect(implied, `${p} implied neutrals`).toEqual([...(F[p].neutral ?? [])].sort());
    }
  });
});

describe("the exaltation degrees agree with the exaltation signs", () => {
  it("every EXALT_POINT lands in the sign karakas.json names", () => {
    // Two more copies of one fact: dignity.ts stores exaltation as an absolute longitude, karakas
    // .json stores it as a sign name. Same cross-check as the karaka index at v840 — one number
    // wrong is invisible until a reading calls an exalted planet fallen.
    const SIGNS = ["Aries","Taurus","Gemini","Cancer","Leo","Virgo","Libra","Scorpio","Sagittarius","Capricorn","Aquarius","Pisces"];
    const m = DIGNITY_SRC.match(/const EXALT_POINT: Record<string, number> = \{([\s\S]*?)\};/);
    expect(m, "EXALT_POINT is gone from panchang/dignity.ts").toBeTruthy();
    const points: Record<string, number> = {};
    for (const e of m![1].matchAll(/(\w+):\s*([\d.]+)/g)) points[e[1]] = Number(e[2]);
    expect(Object.keys(points).sort()).toEqual([...PLANETS].sort());
    for (const [planet, deg] of Object.entries(points)) {
      const sign = SIGNS[Math.floor(((deg % 360) + 360) % 360 / 30)];
      expect(sign, `${planet} exalts at ${deg}°`).toBe((karakas as any).planetKarakas[planet].exalt);
    }
  });

  it("debilitation is exactly opposite exaltation, as the module claims", () => {
    const SIGNS = ["Aries","Taurus","Gemini","Cancer","Leo","Virgo","Libra","Scorpio","Sagittarius","Capricorn","Aquarius","Pisces"];
    for (const p of PLANETS) {
      const ex = SIGNS.indexOf((karakas as any).planetKarakas[p].exalt);
      expect(SIGNS[(ex + 6) % 12], `${p} fall`).toBe((karakas as any).planetKarakas[p].fall);
    }
  });
});
