// Deterministic "Why now?" logic chain for the Time Lord page. Every step is computed
// from the chart (age → activated house → its sign → that sign's ruler = the Time Lord
// → where the Time Lord sits natally), so it is auditable and never hallucinated.
import type { ReactNode } from "react";
import GlossaryText from "@/components/GlossaryText";

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

export function WhyNowChain({
  age, activatedHouse, activatedSign, timeLord,
  tlNatalHouse, tlNatalSign, tlNatalNakshatra, accentColor,
}: {
  age: number; activatedHouse: number; activatedSign: string; timeLord: string;
  tlNatalHouse?: number | null; tlNatalSign?: string | null; tlNatalNakshatra?: string | null;
  accentColor?: string;
}) {
  const accent = accentColor ?? "var(--foreground)";

  const steps: ReactNode[] = [
    <>You are <strong>{age}</strong> years old this year.</>,
    <>This activates <strong>the {ORD[activatedHouse]} house</strong> of your birth chart — {HOUSE_GLOSS[activatedHouse]}.</>,
    <>Your {ORD[activatedHouse]} house is <strong>{activatedSign}</strong>.</>,
    <><strong>{activatedSign}</strong> is ruled by <strong>{timeLord}</strong> — your <strong>Time Lord</strong> this year.</>,
  ];
  if (tlNatalHouse) {
    steps.push(
      <>
        <strong>{timeLord}</strong> sits in <strong>the {ORD[tlNatalHouse]} house</strong> of your birth chart
        {tlNatalSign ? ` (${tlNatalSign}${tlNatalNakshatra ? `, ${tlNatalNakshatra}` : ""})` : ""} — {HOUSE_GLOSS[tlNatalHouse]}.
      </>
    );
  }

  return (
    <div>
      {steps.map((s, i) => (
        <div key={i}>
          <div style={{ display: "flex", gap: "0.65rem", alignItems: "flex-start" }}>
            <span style={{ flexShrink: 0, width: 26, height: 26, borderRadius: "999px", background: accent, color: "#FDFDFD", fontSize: "0.85rem", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", marginTop: "0.05rem" }}>{i + 1}</span>
            <p style={{ color: "var(--foreground)", fontSize: "1rem", lineHeight: 1.6, margin: 0 }}><GlossaryText>{s}</GlossaryText></p>
          </div>
          {i < steps.length - 1 && (
            <div style={{ color: accent, opacity: 0.6, fontSize: "1rem", lineHeight: 1, margin: "0.25rem 0 0.25rem 0.55rem" }}>↓</div>
          )}
        </div>
      ))}
    </div>
  );
}
