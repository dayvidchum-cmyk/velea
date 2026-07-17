// Deterministic CURRENT TRIGGER breakdown — the AUDITABLE data layer (The Cast carries the
// narrative). Each significant transit is a scannable per-planet fact: planet · the lived place
// it's moving through, one concise effect line, then flags (Time Lord / activated house / natal
// hit / retrograde). Pure chart math + fixed dictionaries, no LLM, no fake-narrative prose.
const ORD = ["", "1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th", "9th", "10th", "11th", "12th"];
const HOUSE_GLOSS: Record<number, string> = {
  1: "self, body, how you are seen",
  2: "money, possessions, self-worth, speech",
  3: "communication, siblings & close circle, short trips, skill",
  4: "home, roots, mother, the inner ground",
  5: "creativity, children, romance, the heart's expression",
  6: "work, service, health, daily duty",
  7: "partnership, clients, the one across from you",
  8: "intimacy, shared resources, transformation, the hidden",
  9: "belief, teachers, higher learning, long journeys",
  10: "career, public standing, reputation",
  11: "networks, community, gains, hopes",
  12: "rest, retreat, release, the unseen",
};

// THE 5W REWRITE (David 2026-07-16: "who are these people? what are they doing? where
// are they? whats the effect?") — every trigger reads as SENTENCES answering
// who · what · where · when · why · how, never a data stack.
const PLANET_WHO: Record<string, string> = {
  Sun: "the sovereign — visibility and authority",
  Moon: "the tide — mood and feeling",
  Mars: "the mover — drive, heat, courage",
  Mercury: "the messenger — words, dealings, quick thinking",
  Jupiter: "the teacher — growth and opportunity",
  Venus: "the lover — harmony, pleasure, ease",
  Saturn: "the elder — weight, patience, discipline",
  Rahu: "the hunger — amplification and reach",
  Ketu: "the release — detachment and undoing",
};
const PLANET_EFFECT: Record<string, string> = {
  Sun: "Step forward and let the visibility serve the work.",
  Moon: "Tend the feeling; don't chase the spike.",
  Mars: "Push decisively — aim it, don't spill it.",
  Mercury: "Use it: talk, contracts, details move well today.",
  Jupiter: "Say yes to what expands you here.",
  Venus: "Lean into connection and beauty; let ease do the work.",
  Saturn: "Patience and structure win here — build, don't rush.",
  Rahu: "Aim high, and watch the overreach.",
  Ketu: "Loosen the grip; what leaves was finished.",
};
const HOUSE_PLACE: Record<number, string> = {
  1: "the rooms of the self and the body", 2: "your money and livelihood rooms",
  3: "the rooms of your craft and close circle", 4: "your home and roots",
  5: "the rooms of the heart and its creations", 6: "your daily work and health rooms",
  7: "the partnership rooms", 8: "the rooms of the shared and the hidden",
  9: "your belief and far-horizon rooms", 10: "the rooms of your public standing",
  11: "your community and gains rooms", 12: "the rooms of rest and release",
};

export function CurrentTriggerBreakdown({
  transits, activatedHouse, timeLord, accentColor, onDark,
}: {
  transits: any[]; activatedHouse: number; timeLord: string; accentColor?: string; onDark?: boolean;
}) {
  const accent = accentColor ?? "var(--foreground)";
  const fg = onDark ? "rgba(255,255,255,0.95)" : "var(--foreground)";
  const muted = onDark ? "rgba(255,255,255,0.6)" : "var(--muted-foreground)";
  const sig = (transits ?? []).filter(
    (t) => t.hitsNatalPoint || t.planet === timeLord || t.houseFromLagna === activatedHouse,
  );
  if (!sig.length) {
    return <p style={{ color: muted, fontSize: "0.85rem", margin: 0 }}>No major transit activations right now.</p>;
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.9rem" }}>
      {sig.map((t, i) => {
        const isTL = t.planet === timeLord;
        const isYearHouse = t.houseFromLagna === activatedHouse;
        const place = HOUSE_PLACE[t.houseFromLagna] ?? "this part of your life";
        const motion = t.retrograde ? "retracing its steps back through" : "moving through";
        const role = isTL && isYearHouse
          ? " — your Time Lord walking the year's own activated house, the chapter and the year in one place"
          : isTL
          ? " — and it is your Time Lord, the planet running this chapter, so its weather is your weather"
          : isYearHouse
          ? " — the very house this year runs on, so what happens here lands where the year already points"
          : "";
        const hit = t.hitsNatalPoint ? `; it is standing on your natal ${t.hitsNatalPoint}, waking what that point holds in your chart` : "";
        const effect = (PLANET_EFFECT[t.planet] ?? "") + (t.retrograde ? " Retrograde means review — redo and reconsider before starting anything brand-new." : "");
        return (
          <div key={i} style={{ borderLeft: `3px solid ${accent}`, paddingLeft: "0.75rem" }}>
            <p style={{ color: fg, fontSize: "0.9rem", lineHeight: 1.6, margin: 0 }}>
              <strong>{t.planet}</strong>, {PLANET_WHO[t.planet] ?? "a moving planet"}, is {motion} {place} right now{role}{hit}.
            </p>
            <p style={{ color: accent, fontSize: "0.86rem", lineHeight: 1.5, margin: "0.3rem 0 0", fontWeight: 600 }}>{effect}</p>
          </div>
        );
      })}
    </div>
  );
}
