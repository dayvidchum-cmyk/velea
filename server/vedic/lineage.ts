/**
 * THE LINEAGE SPREAD — ancestry read wherever it is lit, not behind one chip.
 *
 * David's doctrine and ruling, 2026-07-20, captured verbatim in canon/lineage-doctrine.md. I asked
 * whether ancestry is one life-area (one chip, one varga lens on the 12th) or a spread across seven
 * houses and three planets that the reading draws on wherever it is lit. His answer: **the spread**.
 *
 * So this is a DETECTOR, the same shape as knots.ts — it watches strands and reports which are lit
 * and by what — not a lens with a tap. It is deliberately a separate module rather than seven more
 * KnotThemes, because folding seven ancestry strands into the knot list would flood every reading's
 * knot block and change what already works.
 *
 * THE STRANDS, in his words:
 *   2nd  — Kula: the immediate family line, values, traditions, inherited wealth; "traits and assets
 *          passed down to you directly by your parents and grandparents".
 *   4th  — the mother: her health, the emotional bond, the nurturing environment she provided.
 *   5th  — Purva Punya: past-life credit; "the genetic and spiritual legacy you carry FORWARD".
 *   8th  — deep genetic inheritance: wills and estates, ancestral trauma, hidden family secrets,
 *          chronic conditions passed down through DNA.
 *   9th  — the father: "your first teacher (Guru), guide, and the person who introduces you to duty".
 *   10th — the father's standing: his career, social standing, and his authority over you.
 *   12th — the departed (Pitrus), the spirit world, moksha; affliction here can mean Pitri Dosha,
 *          ancestral debt or unresolved ancestral karma.
 *
 * And the karakas, because "houses only tell half the story":
 *   Moon — the mother, regardless of which house she rules.
 *   Sun  — the father: his ego, health, and soul connection to you.
 *   Ketu — the planet of the past; deep genetic or spiritual ancestral roots.
 *
 * WHAT THIS MODULE DOES NOT DO: it does not score, rank or weigh. It reports which strands are lit
 * and why, in the same signal vocabulary the knots use. Any "how loud" judgement is a method call
 * that has not been made, and inventing one here is exactly the kind of unowned weighting this run
 * has been removing.
 */
import type { NatalPlanet, KnotSignal } from "./knots.js";

export type LineageStrand =
  | "kula" | "mother" | "forward" | "inheritance" | "father" | "fatherStanding" | "departed";

export type LineageThread = {
  strand: LineageStrand;
  label: string;
  house: number;
  /** The natural significators for this strand — his karakas, not a house-table derivation. */
  karakas: string[];
  /** What this strand is asking, in the reader's language. Fed to the prompt as the frame. */
  question: string;
  lit: boolean;
  /** Distinct running period-lords tied to this strand. */
  activeLords: string[];
  signals: KnotSignal[];
};

type StrandDef = Omit<LineageThread, "lit" | "activeLords" | "signals">;

// The spread. House + karakas + the question, straight from the doctrine file.
const STRANDS: StrandDef[] = [
  { strand: "kula", label: "The family line", house: 2, karakas: ["Jupiter"],
    question: "the line you sit inside — its values, its traditions, and what it handed you to live on" },
  { strand: "mother", label: "The mother", house: 4, karakas: ["Moon"],
    question: "your mother herself — her health, the bond, and the shelter she did or did not provide" },
  { strand: "forward", label: "What you carry forward", house: 5, karakas: ["Jupiter"],
    question: "past-life credit, and the legacy — genetic and spiritual — that passes on through you" },
  { strand: "inheritance", label: "What came down through the blood", house: 8, karakas: ["Saturn", "Ketu"],
    question: "estates and what is owed, and the inherited weight: family secrets, ancestral trauma, conditions carried in the body" },
  { strand: "father", label: "The father", house: 9, karakas: ["Sun", "Jupiter"],
    question: "your father as your first teacher — the one who introduced you to duty, and what that did" },
  { strand: "fatherStanding", label: "The father's standing", house: 10, karakas: ["Sun"],
    question: "his position in the world and his authority over you — what you inherited of it, and what you refused" },
  { strand: "departed", label: "The departed", house: 12, karakas: ["Ketu", "Saturn"],
    question: "the ancestors who have passed, what is owed backwards, and what is asking to be released" },
];

export type BuildLineageArgs = {
  natal: Record<string, NatalPlanet>;
  dashaLords: { maha?: string | null; antar?: string | null; praty?: string | null };
  timeLord?: string | null;
  transitsHitting?: Array<{ planet: string; hitsNatalPoint: string | null; houseFromLagna: number | null; slow: boolean }>;
};

/** Who rules a house, from the natal map's own rulesHouses — no second sign-lord table. */
function lordOf(natal: Record<string, NatalPlanet>, house: number): string | null {
  for (const [planet, p] of Object.entries(natal)) {
    if ((p?.rulesHouses ?? []).includes(house)) return planet;
  }
  return null;
}

/**
 * A strand is LIT when a running period-lord or the time lord is actually tied to it — seated in
 * the house, ruling it, or being one of its karakas — or when a SLOW transit lands on it. The
 * fast-moving daily transits are deliberately excluded: ancestry is a standing theme, and letting
 * the Moon light "the departed" every third day would make the spread noise.
 */
export function buildLineage(args: BuildLineageArgs): { lit: LineageThread[]; all: LineageThread[] } {
  const { natal, dashaLords, timeLord } = args;
  const periods: Array<[string, string]> = [
    [dashaLords.maha ?? "", "the life chapter"],
    [dashaLords.antar ?? "", "the season"],
    [dashaLords.praty ?? "", "the current weeks"],
  ];
  if (timeLord) periods.push([timeLord, "the year lord"]);

  const all = STRANDS.map((def): LineageThread => {
    const houseLord = lordOf(natal, def.house);
    const signals: KnotSignal[] = [];
    const activeLords = new Set<string>();

    for (const [planet, level] of periods) {
      if (!planet) continue;
      const p = natal[planet];
      const isKaraka = def.karakas.includes(planet);
      const rules = (p?.rulesHouses ?? []).includes(def.house);
      const sits = p?.house === def.house;
      if (!isKaraka && !rules && !sits) continue;
      activeLords.add(planet);
      const how = sits ? `sits in the ${def.house}th`
        : rules ? `rules the ${def.house}th`
        : `is the significator of ${def.label.toLowerCase()}`;
      signals.push({ kind: "dasha", text: `${planet} — ${level} — ${how}` });
    }

    for (const t of args.transitsHitting ?? []) {
      if (!t.slow) continue; // standing theme: slow movers only
      const onHouse = t.houseFromLagna === def.house;
      const onKaraka = t.hitsNatalPoint && def.karakas.includes(t.hitsNatalPoint);
      const onLord = t.hitsNatalPoint && houseLord === t.hitsNatalPoint;
      if (!onHouse && !onKaraka && !onLord) continue;
      signals.push({
        kind: "transit",
        text: onHouse
          ? `${t.planet} is moving through the ${def.house}th`
          : `${t.planet} is sitting on ${t.hitsNatalPoint}`,
      });
    }

    return { ...def, lit: signals.length > 0, activeLords: [...activeLords], signals };
  });

  return { lit: all.filter((t) => t.lit), all };
}
