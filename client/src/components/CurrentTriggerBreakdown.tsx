// Deterministic CURRENT TRIGGER breakdown: each significant current transit shown as
// planet → which of your houses it is in → what it touches → AND what that planet actually
// does to that area (the synthesis, so it reads without prior astrology knowledge). Pure
// chart math + fixed dictionaries, no LLM.
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
  Sun:     { brings: "visibility, authority, and the pull to show up as yourself", tone: "step forward here, but let the ego serve the work rather than run it" },
  Moon:    { brings: "emotional weather, shifting needs, and sensitivity", tone: "feeling runs high and changes fast — tend it, don't act on the spike" },
  Mars:    { brings: "drive, heat, courage, and friction", tone: "push decisively here — the same heat can spill into conflict or haste, so aim it" },
  Mercury: { brings: "quick thinking, conversation, learning, and dealings", tone: "a good window for talk, contracts, and the details in this area" },
  Jupiter: { brings: "growth, opportunity, grace, and meaning", tone: "say yes to what expands you here — it's a door opening" },
  Venus:   { brings: "harmony, pleasure, connection, and a softening", tone: "relationship, beauty, and ease flow here — lean into it" },
  Saturn:  { brings: "weight, discipline, and the slow work of maturing", tone: "it tests this area rather than rushing it; patience and structure win" },
  Rahu:    { brings: "hunger, amplification, and obsessive, unconventional focus", tone: "ambition spikes here — powerful, but watch for overreach and illusion" },
  Ketu:    { brings: "detachment, dissolution, and a quiet pull inward", tone: "interest here fades or turns spiritual; release rather than grip" },
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
            <p style={{ color: fg, fontSize: "1rem", lineHeight: 1.55, margin: 0 }}>
              <strong>{t.planet}</strong> is moving through your <strong>{ORD[t.houseFromLagna]} house</strong>{t.sign ? ` (${t.sign})` : ""} — {HOUSE_GLOSS[t.houseFromLagna] ?? "this area of life"}.
            </p>
            {nature && (
              <p style={{ color: fg, fontSize: "0.9rem", lineHeight: 1.55, margin: "0.35rem 0 0", opacity: 0.9 }}>
                It brings <strong>{nature.brings}</strong> here — {nature.tone}.
                {t.hitsNatalPoint ? ` And because it's landing on your natal ${t.hitsNatalPoint}, the effect is personal and pointed, not background.` : ""}
                {t.retrograde ? " Retrograde: the theme turns back for review — revisit, don't launch." : ""}
              </p>
            )}
            {tags.length > 0 && (
              <p style={{ color: accent, fontSize: "0.84rem", marginTop: "0.35rem", marginBottom: 0, fontWeight: 600 }}>{tags.join(" · ")}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}
