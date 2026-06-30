// Deterministic CURRENT TRIGGER breakdown: each significant current transit shown as
// planet → which of your houses it is in → what it touches. Pure chart math (no LLM).
const ORD = ["", "1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th", "9th", "10th", "11th", "12th"];
const HOUSE_GLOSS: Record<number, string> = {
  1: "self, body, how you are seen",
  2: "money, possessions, self-worth, speech",
  3: "communication, siblings, short trips, skill",
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
        return (
          <div key={i} style={{ borderLeft: `3px solid ${accent}`, paddingLeft: "0.75rem" }}>
            <p style={{ color: fg, fontSize: "1rem", lineHeight: 1.55, margin: 0 }}>
              <strong>{t.planet}</strong> is moving through your <strong>{ORD[t.houseFromLagna]} house</strong>{t.sign ? ` (${t.sign})` : ""} — {HOUSE_GLOSS[t.houseFromLagna] ?? "this area of life"}.
            </p>
            {tags.length > 0 && (
              <p style={{ color: accent, fontSize: "0.84rem", marginTop: "0.3rem", marginBottom: 0, fontWeight: 600 }}>{tags.join(" · ")}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}
