/**
 * THE ORIENTATION LAYER — v0 (thinnest viable). See repo ORIENTATION_SPEC.md + CONSTITUTION.md P17/P18.
 *
 * Deterministic post-assembly phase: locates a MOVEMENT within the reader's running timeline and
 * re-sources its actors from the enriched authority record. It computes NO new astrology and invents NO
 * new activation rule — it only reports RELATIONSHIPS among facts the engine has already computed
 * (Constitution P17: identity qualifies, relationship activates; the eclipse's dispositor/strike IS the
 * already-computed relationship; we only report which running authority it lands on).
 *
 * v0 scope: Timeline, Authority, Personal — wired for the eclipse-season movement only. Everything here
 * is a lookup/identity-match over existing payload objects; if a fact is absent, the context is simply
 * thinner (never guessed).
 */

import PLANET_IN_HOUSE_CANON from "../vedic/canon/planet-in-house.json" with { type: "json" };

type Lord = string;

// Canon Context — the ACTIVATED facet for a house, via an already-computed relationship (the
// eclipse's dispositor). Reuses the engine's existing planet-in-house canon (the same table facetsOf
// reads): "the dispositor in this house" narrows the flat house gloss to one specific facet
// (e.g. Moon in the 11th → "Popularity in Groups or Organizations"). Null when the cell is silent —
// then the renderer falls back to the gloss. Invents no astrology, no new activation rule (P17/P18).
const activatedCanonFor = (house: number | undefined, planet: Lord | undefined): string | null =>
  house != null && planet ? ((PLANET_IN_HOUSE_CANON as any)?.houses?.[String(house)]?.[planet] ?? null) : null;

interface EclipseLike {
  date: string;
  type?: string;
  house?: number;
  houseGloss?: string;
  dispositor?: { planet?: Lord; rulesHouses?: number[] };
  hits?: { point: Lord; orbDeg: number; which?: string }[];
}

/** Locate the eclipse-season movement in the running timeline. Returns undefined when there is no arc. */
export function orientEclipseSeason(
  arc: { eclipses?: EclipseLike[] } | undefined,
  dasha: any,
  profection: any,
  natalCondition: any,
): { timeline: any; authority: any[]; personal: Record<string, any>; canon: any[] } | undefined {
  if (!arc?.eclipses?.length) return undefined;

  // The running authorities — the identities a movement can engage. Already computed; we only name them.
  const authorities: { lord: Lord; office: string }[] = [];
  const add = (lord: Lord | undefined | null, office: string) => { if (lord) authorities.push({ lord, office }); };
  add(dasha?.mahaDasha?.lord, "mahadasha");
  add(dasha?.antarDasha?.lord, "antardasha");
  add(dasha?.pratyantarDasha?.lord, "pratyantara");
  add(profection?.timeLord, "profection-year-lord");
  const officeOf = (planet?: Lord): string | null =>
    planet ? (authorities.find((a) => a.lord === planet)?.office ?? null) : null;

  // ── AUTHORITY CONTEXT ──────────────────────────────────────────────────────────────────────
  // For each eclipse, which running authority does its ALREADY-COMPUTED relationship land on?
  //   · dispositor  — the eclipse borrows this planet's condition (an existing engine relationship)
  //   · struck      — a natal point the eclipse sits on within orb (existing hits[])
  // Pure identity match: the eclipse is the activating relationship; the office is the engaged identity.
  const engaged = new Set<Lord>();
  const authority: any[] = [];
  const canon: any[] = [];
  for (const e of arc.eclipses) {
    // CANON CONTEXT — the dispositor-activated facet for this eclipse's house (narrowed from the gloss).
    canon.push({
      movement: `${e.type ?? "eclipse"} ${e.date}`,
      house: e.house,
      dispositor: e.dispositor?.planet ?? null,
      activated: activatedCanonFor(e.house, e.dispositor?.planet),
      fallbackGloss: e.houseGloss ?? null,
    });
    const dispOffice = officeOf(e.dispositor?.planet);
    if (dispOffice && e.dispositor?.planet) {
      engaged.add(e.dispositor.planet);
      const rulesLandingHouse = e.house != null && (e.dispositor.rulesHouses ?? []).includes(e.house);
      authority.push({
        movement: `${e.type ?? "eclipse"} ${e.date}`,
        actor: e.dispositor.planet,
        engages: dispOffice,
        via: "dispositor",
        landsIn: e.house != null ? { house: e.house, gloss: e.houseGloss } : undefined,
        ...(rulesLandingHouse ? { alsoRulesTheHouseItLandsIn: true } : {}),
      });
    }
    for (const h of e.hits ?? []) {
      const hitOffice = officeOf(h.point);
      if (hitOffice) {
        engaged.add(h.point);
        authority.push({
          movement: `${e.type ?? "eclipse"} ${e.date}`,
          actor: h.point,
          engages: hitOffice,
          via: "struck",
          orbDeg: h.orbDeg,
          which: h.which,
          landsIn: e.house != null ? { house: e.house, gloss: e.houseGloss } : undefined,
        });
      }
    }
  }

  // ── PERSONAL CONTEXT ───────────────────────────────────────────────────────────────────────
  // Re-source each ENGAGED actor from the enriched authority record (natalCondition), NOT the arc's
  // thin per-frame dignity copy. This is where the cancelled-fall / hard-won truth reaches the read.
  const byPlanet = new Map<string, any>((natalCondition?.lords ?? []).map((l: any) => [l.planet, l]));
  const personal: Record<string, any> = {};
  for (const actor of engaged) {
    const enriched = byPlanet.get(actor);
    if (enriched) personal[actor] = enriched;
  }

  // ── TIMELINE CONTEXT ───────────────────────────────────────────────────────────────────────
  // The running clocks the movement sits inside (exposed, not recomputed).
  const timeline = {
    mahadasha: dasha?.mahaDasha?.lord ?? null,
    antardasha: dasha?.antarDasha?.lord ?? null,
    pratyantara: dasha?.pratyantarDasha?.lord ?? null,
    profection: profection
      ? { age: profection.age, activatedHouse: profection.activatedHouse, yearLord: profection.timeLord }
      : null,
  };

  return { timeline, authority, personal, canon };
}
