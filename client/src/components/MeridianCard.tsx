import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useDayModeColor } from "@/hooks/useDayModeColor";
import { useSettingsContext } from "@/contexts/SettingsContext";
import GlossaryText from "@/components/GlossaryText";

const ORD = ["", "1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th", "9th", "10th", "11th", "12th"];
const HOUSE_GLOSS: Record<number, string> = {
  1: "self & body", 2: "voice & values", 3: "skill & courage", 4: "home & roots",
  5: "creativity & heart", 6: "work & service", 7: "partnership", 8: "depth & transformation",
  9: "belief & teachers", 10: "vocation & standing", 11: "community & gains", 12: "retreat & release",
};

type Chapter = {
  planet: string; poleLabel: string; enterMonth: string; exitMonth: string;
  peakDignity: string; natalHouse: number | null; status: "current" | "recent" | "upcoming";
  antardasha?: { open: string; carry: string; close: string };
  retrograde?: boolean;
  stationDirect?: { month: string; sign: string; degree: number };
  shadowCleared?: boolean;
  shadowClearedMonth?: string;
};

/** Frame each chapter as human orientation — naming the ending / threshold / beginning. */
function narrate(ch: Chapter): { headline: string; body: string; reflect?: boolean } {
  const carries = ch.natalHouse ? ` carrying your ${ORD[ch.natalHouse]} house${HOUSE_GLOSS[ch.natalHouse] ? ` (${HOUSE_GLOSS[ch.natalHouse]})` : ""},` : "";
  const dign = ch.peakDignity !== "neutral" ? `, ${ch.peakDignity} at its height,` : "";
  const ad = ch.antardasha;
  if (ch.status === "current") {
    return {
      headline: `You're inside a chapter — ${ch.planet} on your ${ch.poleLabel}.`,
      body: `${ch.planet}${dign}${carries} has your ${ch.poleLabel} while it's here (${ch.enterMonth} → ${ch.exitMonth}).${ad ? (ad.open === ad.carry ? ` Your ${ad.carry} antardasha is carrying its karma.` : ` Your ${ad.open}→${ad.carry} antardasha is carrying its karma.`) : ""} The ground is ${ch.planet}'s until it moves on — that's where you are.`,
    };
  }
  if (ch.status === "recent") {
    const st = ch.stationDirect;
    // The precise threshold, when a retrograde loop gives us stations + shadow.
    const official = st
      ? `${ch.planet} stationed direct on your ${ch.poleLabel} in ${st.month} (${st.sign} ${Math.round(st.degree)}°)${ch.shadowCleared && ch.shadowClearedMonth ? ` and officially cleared its shadow in ${ch.shadowClearedMonth} — the chapter is truly closed` : `, still separating out of its shadow`}.`
      : `${ch.planet} finished crossing your ${ch.poleLabel} around ${ch.exitMonth}${dign ? `, ${ch.peakDignity} at its height` : ""}.`;
    const adPhrase = ad ? (ad.carry === ad.close ? ` It ran under your ${ad.carry} antardasha throughout.` : ` The ${ad.carry} antardasha that carried it has handed off to ${ad.close}.`) : "";
    return {
      headline: `A chapter just closed — ${ch.planet} has left your ${ch.poleLabel}.`,
      body: `${official}${adPhrase} A threshold: an ending, and the opening of what's next.`,
      reflect: true,
    };
  }
  return {
    headline: `A chapter is forming — ${ch.planet} approaches your ${ch.poleLabel}.`,
    body: `Around ${ch.enterMonth}, ${ch.planet}${dign}${carries} reaches your ${ch.poleLabel}.${ad ? ` It opens under your ${ad.open} antardasha.` : ""} A new ground beginning to gather.`,
  };
}

/**
 * The Meridian card — the MC/IC voice axis, narrated as chapters (ending · threshold ·
 * beginning) so it orients you, not just clocks the sky. Read-only slow-arc layer.
 */
export default function MeridianCard() {
  const accent = useDayModeColor();
  const [, navigate] = useLocation();
  const { settings, saveSettings } = useSettingsContext();
  const { data } = trpc.meridian.current.useQuery(undefined, { staleTime: 1000 * 60 * 30 });
  if (!data) return null;
  const liftOn = settings.meridianLift;
  const toggleLift = () => saveSettings({ ...settings, meridianLift: !liftOn });

  const chapters = (data.chapters ?? []) as Chapter[];
  const tone: Record<string, string> = { current: accent, recent: "#C0862E", upcoming: "var(--color-muted-foreground)" };

  return (
    <div style={{ borderRadius: "16px", border: "1px solid var(--color-border)", background: "var(--color-card)", padding: "1.1rem 1.25rem", marginBottom: "1.5rem" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.5rem" }}>
        <p style={{ fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--color-muted-foreground)", margin: 0 }}>
          The Meridian · your voice axis
        </p>
        <button onClick={() => navigate("/glossary")} style={{ fontSize: "0.68rem", color: accent, background: "none", border: "none", padding: 0, cursor: "pointer", whiteSpace: "nowrap" }}>
          What's this?
        </button>
      </div>
      <p style={{ fontSize: "0.9rem", color: "var(--foreground)", margin: "0.5rem 0 0", lineHeight: 1.55 }}>
        <strong style={{ color: accent }}>{data.mc.sign}</strong> outer voice — what you're called to say and build; balanced by{" "}
        <strong style={{ color: accent }}>{data.ic.sign}</strong> inner voice — the ground you speak it from.
      </p>

      {chapters.length === 0 ? (
        <p style={{ fontSize: "0.85rem", color: "var(--color-muted-foreground)", margin: "0.85rem 0 0", lineHeight: 1.5 }}>
          No slow planet near your axis in this stretch — the larger arc is quiet. The next crossing will open a chapter.
        </p>
      ) : (
        <div style={{ marginTop: "1rem", display: "flex", flexDirection: "column", gap: "0.9rem" }}>
          {chapters.map((ch, i) => {
            const n = narrate(ch);
            return (
              <div key={i} style={{ borderLeft: `3px solid ${tone[ch.status]}`, paddingLeft: "0.8rem" }}>
                <p style={{ fontSize: "0.6rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: tone[ch.status], margin: 0 }}>
                  {ch.status === "current" ? "Now" : ch.status === "recent" ? "Just closed" : "Forming"}
                </p>
                <p style={{ fontSize: "0.92rem", fontWeight: 700, color: "var(--foreground)", margin: "0.2rem 0 0", lineHeight: 1.4 }}><GlossaryText>{n.headline}</GlossaryText></p>
                <p style={{ fontSize: "0.84rem", color: "var(--color-muted-foreground)", margin: "0.25rem 0 0", lineHeight: 1.55 }}><GlossaryText>{n.body}</GlossaryText></p>
                {n.reflect && (
                  <button onClick={() => navigate("/reflections")} style={{ marginTop: "0.4rem", fontSize: "0.78rem", fontWeight: 600, color: accent, background: "none", border: "none", padding: 0, cursor: "pointer" }}>
                    What did it land? → Reflect
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* The lift toggle lives here — where the thing is explained, not buried in Settings. */}
      <div style={{ marginTop: "1rem", paddingTop: "0.85rem", borderTop: "1px solid var(--color-border)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.75rem" }}>
        <span style={{ fontSize: "0.78rem", color: "var(--color-muted-foreground)", lineHeight: 1.45 }}>
          Let a live chapter gently lift its life-areas in your day
        </span>
        <button
          onClick={toggleLift}
          aria-pressed={liftOn}
          style={{ flexShrink: 0, fontSize: "0.75rem", fontWeight: 700, padding: "0.3rem 0.75rem", borderRadius: "999px", cursor: "pointer",
            border: `1px solid ${liftOn ? accent : "var(--color-border)"}`,
            background: liftOn ? `color-mix(in srgb, ${accent} 18%, transparent)` : "transparent",
            color: liftOn ? accent : "var(--color-muted-foreground)" }}
        >
          {liftOn ? "On" : "Off"}
        </button>
      </div>
    </div>
  );
}
