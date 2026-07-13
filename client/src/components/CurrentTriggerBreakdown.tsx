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

// What each planet DOES when it moves through a house — its nature ("brings …") fused with
// how to work with it ("tone"). Read as: "It brings {brings} here — {tone}"
const PLANET_NATURE: Record<string, { brings: string; tone: string }> = {
  Sun:     { brings: "visibility & authority", tone: "step forward, let it serve the work" },
  Moon:    { brings: "shifting mood & sensitivity", tone: "tend the feeling, don't chase the spike" },
  Mars:    { brings: "drive, heat, courage", tone: "push decisively — aim it, don't spill" },
  Mercury: { brings: "quick thinking & dealings", tone: "good for talk, contracts, details" },
  Jupiter: { brings: "growth & opportunity", tone: "say yes to what expands you" },
  Venus:   { brings: "harmony, pleasure, ease", tone: "lean into connection & beauty" },
  Saturn:  { brings: "weight & discipline", tone: "patience and structure win" },
  Rahu:    { brings: "hunger & amplification", tone: "aim high, watch the overreach" },
  Ketu:    { brings: "detachment & release", tone: "loosen the grip, turn inward" },
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
        const tags: string[] = [];
        if (t.planet === timeLord) tags.push("your Time Lord — the current chapter");
        if (t.houseFromLagna === activatedHouse) tags.push("this year's activated house");
        if (t.hitsNatalPoint) tags.push(`touching your natal ${t.hitsNatalPoint}`);
        if (t.retrograde) tags.push("retrograde");
        const nature = PLANET_NATURE[t.planet];
        return (
          <div key={i} style={{ borderLeft: `3px solid ${accent}`, paddingLeft: "0.75rem" }}>
            <p style={{ color: fg, fontSize: "0.98rem", lineHeight: 1.35, margin: 0, fontWeight: 700 }}>
              {t.planet} <span style={{ fontWeight: 500, opacity: 0.82 }}>· {HOUSE_GLOSS[t.houseFromLagna] ?? "this area of life"}</span>
            </p>
            {nature && (
              <p style={{ color: fg, fontSize: "0.86rem", lineHeight: 1.4, margin: "0.2rem 0 0", opacity: 0.82 }}>
                {nature.brings} — {nature.tone}
              </p>
            )}
            {tags.length > 0 && (
              <p style={{ color: accent, fontSize: "0.8rem", marginTop: "0.3rem", marginBottom: 0, fontWeight: 600 }}>{tags.join(" · ")}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}
