/**
 * THE AGENDA LAYER — a planet's operating intention, derived from its CONDITION (David, 2026-07-21).
 *
 * The problem this solves (David's three-Venus discriminability test): two people can share the
 * protagonist (Time Lord = Venus) AND the arena (the activated house), and the reading collapses,
 * because the house supplies the NOUN and the condition was only ever spent as an adjective —
 * "temperature." A shared house meant a shared noun, and adjectives don't separate lives.
 *
 * The fix is a layer between the lord and the house:
 *
 *    Planet (protagonist) → Condition (sets the AGENDA verb) → Domain (the planet's karakas — the
 *    flavor) → House (the arena) → Capacity overlay (HOW) → Narrative
 *
 * The agenda belongs to the CONDITION, not the planet. "Restore" is the same intention for Venus,
 * Mars, or Mercury; the planet's karakas only color WHAT is restored (Venus → harmony/value/
 * cohesion; Mars → strength/courage/initiative; Mercury → clarity/communication). So this table is
 * general — it applies to any graha holding any office.
 *
 * David's two structural rulings, both encoded here:
 *  1. CAPACITY IS AN OVERLAY, NOT AN AGENDA. asleep/combust answer HOW the intention is pursued,
 *     not WHAT it is — so they ride ON TOP of the primary verb (Restore + Work-Unseen), never
 *     replace it.
 *  2. NOT DETERMINISTIC. Each condition yields a PRIMARY verb + a secondary cluster; the ACTIVATED
 *     HOUSE (downstream, in the prompt) picks which secondary fits the arena. Retrograde in the 2nd
 *     reclaims resources; in the 7th it revisits agreements; in the 9th it re-examines beliefs.
 *
 * Precedence follows David's conceptual grouping (2026-07-21), walked top→bottom; the first tier
 * that matches sets the primary. "Existential/structural before baseline dignity."
 *
 *   TIER 1  Structural override — Contend (war), Redeem (cancelled fall)
 *   TIER 2  Deficit state       — Restore, Repair, Steady, Complete
 *   TIER 3  Directional state   — Reclaim (retrograde)
 *   TIER 4  Baseline state      — Consolidate (own sign), Cultivate (strong), Steward (proud), Tend
 *
 * NB — planetary war: server/vedic/natal-states.ts DELIBERATELY refuses to name a winner (no
 * declinations → the classical "north wins" call can't be made, so BOTH fighters are marked
 * harmed). So the honest agenda is CONTEND — the unresolved contest — never Prevail/Yield. If a
 * declination-based winner is ever computed, Contend splits into Prevail (winner) / Yield (loser)
 * without changing this architecture.
 *
 * These verbs are the planet's VOICE — do not silently re-map them. The verb table and the
 * precedence are David's doctrine; the state vocabulary they key off (dignity.ts, avashtas.ts,
 * natal-states.ts) is the K&F canon.
 */

/** The condition signals this layer reads — a compact projection of the stored research (condOf). */
export type AgendaSignals = {
  /** DignityState from vedic/dignity.ts. */
  dignity: string;
  /** neechaBhanga.cancelled — a cancelled fall is earned competence, not weakness. */
  fallCancelled: boolean;
  /** Shadbala ratio: >=1.15 strong, <=0.85 thin, else steady. null = unmeasured. */
  strengthRatio: number | null;
  retrograde: boolean;
  /** Lajjitaadi states PRESENT on this lord (a planet can hold several at once). */
  lajjitaadi: string[];
  /** Deepthaadi flags — we read "vikala" (combust) and "nipeedita" (war). */
  deepthaadi: string[];
  /** Jagradaadi capacity: jagrat/svapna/sushupti. */
  jagradaadi: string | null;
};

export type Agenda = {
  /** The operating verb — the protagonist's intention. */
  primary: string;
  /** The house (arena) picks the one that fits; never all at once. */
  secondaries: string[];
  /** The condition that set it — for the model's reasoning, translated in prose, never printed. */
  because: string;
};

export type CapacityMode = {
  /** The HOW modifier, layered on top of the primary agenda. */
  mode: string;
  because: string;
};

export type AgendaResult = { agenda: Agenda; capacity: CapacityMode[] };

const THIN = 0.85;
const STRONG = 1.15;

const has = (arr: string[] | undefined, s: string) => !!arr && arr.includes(s);

/**
 * The neutral default — a lord in no notable condition (friend/neutral dignity, steady strength,
 * no avashtas bite, direct motion). It simply pursues its karakas in the arena. Flagged as an
 * added cell (David has not blessed the word "Tend"); trivial to rename.
 */
const TEND: Agenda = {
  primary: "Tend",
  secondaries: ["Maintain", "Advance", "Express"],
  because: "no acute condition — the lord simply works its domain in the arena",
};

/** Derive the operating agenda + capacity overlay from a lord's condition. Pure. */
export function deriveAgenda(sig: AgendaSignals): AgendaResult {
  const ratio = sig.strengthRatio;
  const thin = ratio != null && ratio <= THIN;
  const strong = ratio != null && ratio >= STRONG;
  const debilitated = sig.dignity === "debilitated";

  // ── CAPACITY OVERLAY (computed independently; rides on top of whatever primary wins) ──
  // Only the NOTABLE capacity conditions fire. svapna (half capacity) is the common middle —
  // it sits on the majority of planets, so emitting "Conserve" there would dilute it to noise.
  // Conserve is kept in the doctrine but GATED OFF by default; flip EMIT_CONSERVE to surface it.
  const EMIT_CONSERVE = false;
  const capacity: CapacityMode[] = [];
  if (has(sig.deepthaadi, "vikala")) {
    capacity.push({
      mode: "Work Unseen",
      because: "combust — reduced visible agency; build quietly, don't chase recognition",
    });
  }
  if (sig.jagradaadi === "sushupti") {
    capacity.push({
      mode: "Enlist",
      because: "asleep — cannot act alone; the intention needs allies to move",
    });
  } else if (EMIT_CONSERVE && sig.jagradaadi === "svapna") {
    capacity.push({
      mode: "Conserve",
      because: "half capacity — pace it, do the essential part",
    });
  }

  const agenda = derivePrimary(sig, { thin, strong, debilitated });
  return { agenda, capacity };
}

function derivePrimary(
  sig: AgendaSignals,
  d: { thin: boolean; strong: boolean; debilitated: boolean },
): Agenda {
  // ── TIER 1 — STRUCTURAL OVERRIDE ──
  // A live contest for agency, or a whole-life earned-competence story, override everything.
  if (has(sig.deepthaadi, "nipeedita")) {
    return {
      primary: "Contend",
      secondaries: ["Negotiate", "Compete"], // NOT Prevail/Yield — the engine can't name a winner
      because: "in a planetary war — a contest for agency with no victor the engine can name",
    };
  }
  if (d.debilitated && sig.fallCancelled) {
    return {
      primary: "Redeem",
      secondaries: ["Prove", "Earn", "Reclaim standing"],
      because: "a cancelled fall — earned competence, a story of proving, not of weakness",
    };
  }

  // ── TIER 2 — DEFICIT STATE ──
  // A depletion or disturbance the lord is trying to set right. Structural deficit (Restore) leads,
  // then the emotional bites (Repair, Steady), then the mild wanting (Complete).
  if (has(sig.lajjitaadi, "kshudita") || (d.debilitated && !sig.fallCancelled) || d.thin) {
    return {
      primary: "Restore",
      secondaries: ["Recover", "Rebuild", "Replenish", "Protect"],
      because: "starved / fallen / thin — depleted; rebuild the resource before spending it",
    };
  }
  if (has(sig.lajjitaadi, "lajjita")) {
    return {
      primary: "Repair",
      secondaries: ["Make good", "Recover face", "Atone"],
      because: "shamed — something to make good before it can move forward",
    };
  }
  if (has(sig.lajjitaadi, "kshobhita")) {
    return {
      primary: "Steady",
      secondaries: ["Contain", "Settle", "De-escalate"],
      because: "agitated — disturbed; settle it before acting",
    };
  }
  if (has(sig.lajjitaadi, "trishita")) {
    return {
      primary: "Complete",
      secondaries: ["Pursue", "Satisfy", "Finish"],
      because: "left thirsty — an unfinished wanting to carry through",
    };
  }

  // ── TIER 3 — DIRECTIONAL STATE ──
  if (sig.retrograde) {
    return {
      primary: "Reclaim",
      secondaries: ["Review", "Reconnect", "Revise", "Recover", "Revisit"],
      because: "retrograde — re-covering its own ground; the house names what is reclaimed",
    };
  }

  // ── TIER 4 — BASELINE STATE ──
  if (sig.dignity === "own" || sig.dignity === "moolatrikona") {
    return {
      primary: "Consolidate",
      secondaries: ["Deepen", "Mature", "Root", "Steward"],
      because: "in its own sign — at home; deepen and mature the theme rather than meet a new one",
    };
  }
  if (sig.dignity === "exalted" || d.strong || has(sig.lajjitaadi, "mudita")) {
    return {
      primary: "Cultivate",
      secondaries: ["Extend", "Give", "Grow", "Elevate"],
      because: "strong / delighted — surplus to extend; grow it and give it out",
    };
  }
  // Proud: capable and well-placed, the risk is complacency/overreach — steward it, don't press.
  // (David flagged this word for render-testing; the tone is one step removed from the condition.)
  if (has(sig.lajjitaadi, "garvita")) {
    return {
      primary: "Steward",
      secondaries: ["Give back", "Restrain", "Share"],
      because: "proud — capable and well-placed; the risk is overreach, so steward rather than press",
    };
  }

  return TEND;
}
