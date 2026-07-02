import { trpc } from "@/lib/trpc";
import { useDayModeColor } from "@/hooks/useDayModeColor";

const ORD = ["", "1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th", "9th", "10th", "11th", "12th"];
const HOUSE_GLOSS: Record<number, string> = {
  1: "self & body", 2: "voice & values", 3: "skill & courage", 4: "home & roots",
  5: "creativity & heart", 6: "work & service", 7: "partnership", 8: "depth & transformation",
  9: "belief & teachers", 10: "vocation & standing", 11: "community & gains", 12: "retreat & release",
};

/**
 * The Meridian card — the MC/IC voice axis and which grahas are activating it now.
 * Read-only slow-arc layer; doesn't touch the day-mode. (Meridian Phase 1b.)
 */
export default function MeridianCard() {
  const accent = useDayModeColor();
  const { data } = trpc.meridian.current.useQuery(undefined, { staleTime: 1000 * 60 * 30 });
  if (!data) return null; // no MC computed for this profile yet

  return (
    <div style={{ borderRadius: "16px", border: "1px solid var(--color-border)", background: "var(--color-card)", padding: "1.1rem 1.25rem", marginBottom: "1.5rem" }}>
      <p style={{ fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--color-muted-foreground)", margin: 0 }}>
        The Meridian · your voice axis
      </p>
      <p style={{ fontSize: "0.9rem", color: "var(--foreground)", margin: "0.5rem 0 0", lineHeight: 1.55 }}>
        <strong style={{ color: accent }}>{data.mc.sign}</strong> outer voice — what you're called to say and build; balanced by{" "}
        <strong style={{ color: accent }}>{data.ic.sign}</strong> inner voice — the ground you speak it from.
      </p>

      {data.hits.length === 0 ? (
        <p style={{ fontSize: "0.85rem", color: "var(--color-muted-foreground)", margin: "0.85rem 0 0", lineHeight: 1.5 }}>
          The axis is quiet right now — no planet crossing your voice line. When one does, it colors the larger chapter for as long as it's there.
        </p>
      ) : (
        <div style={{ marginTop: "0.95rem", display: "flex", flexDirection: "column", gap: "0.65rem" }}>
          {data.hits.map((h, i) => (
            <div key={i} style={{ borderLeft: `3px solid ${h.slow ? accent : "var(--color-border)"}`, paddingLeft: "0.75rem" }}>
              <p style={{ fontSize: "0.88rem", color: "var(--foreground)", margin: 0, lineHeight: 1.5 }}>
                <strong>{h.planet}</strong> on your <strong>{h.poleLabel}</strong> — {h.transitSign} {Math.round(h.transitDegree)}°
                {h.dignity !== "neutral" && <span style={{ color: accent, fontWeight: 600 }}> · {h.dignity}</span>}
                {h.natalHouse != null && (
                  <span style={{ color: "var(--color-muted-foreground)" }}> · carrying your {ORD[h.natalHouse]} house{HOUSE_GLOSS[h.natalHouse] ? ` (${HOUSE_GLOSS[h.natalHouse]})` : ""}</span>
                )}
              </p>
              <p style={{ fontSize: "0.72rem", color: "var(--color-muted-foreground)", margin: "0.15rem 0 0", letterSpacing: "0.02em" }}>
                {h.slow ? "a chapter" : "a passing note"} · {h.applying ? "approaching" : "separating"} · within {h.orb.toFixed(1)}°
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
