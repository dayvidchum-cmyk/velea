// Deterministic "Why now?" logic chain for the Time Lord page. Every step is computed
// from the chart (age → activated house → its sign → that sign's ruler = the Time Lord
// → where the Time Lord sits natally), so it is auditable and never hallucinated.
import type { ReactNode } from "react";
import GlossaryText from "@/components/GlossaryText";

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

export function WhyNowChain({
  age, activatedHouse, activatedSign, timeLord,
  tlNatalHouse, tlNatalSign, tlNatalNakshatra, tlNodeConjunct, tlOppositeHouse, accentColor,
}: {
  age: number; activatedHouse: number; activatedSign: string; timeLord: string;
  tlNatalHouse?: number | null; tlNatalSign?: string | null; tlNatalNakshatra?: string | null;
  // A node (Rahu/Ketu) sitting with the Time Lord flips the house from "settle in" to a DIRECTION —
  // Ketu releases the ground, Rahu reaches past it — and puts the year on an axis (the opposite pole).
  tlNodeConjunct?: string | null; tlOppositeHouse?: number | null;
  accentColor?: string;
}) {
  const accent = accentColor ?? "var(--foreground)";
  const isKetu = tlNodeConjunct === "Ketu";
  const isRahu = tlNodeConjunct === "Rahu";

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
        {tlNatalSign ? ` (${tlNatalSign}${tlNatalNakshatra ? `, ${tlNatalNakshatra}` : ""})` : ""} — {HOUSE_GLOSS[tlNatalHouse]}
        {isKetu ? <> — but <strong>Ketu</strong> sits here too, so this is ground being <em>released</em>, not settled into.</>
          : isRahu ? <> — but <strong>Rahu</strong> sits here too, so this is a hunger <em>reaching</em> past the familiar, never quite filled.</>
          : <>.</>}
      </>
    );
  }
  if (tlNodeConjunct && tlOppositeHouse) {
    steps.push(
      <>
        Which puts your year on an <strong>axis</strong>: the opposite pull is <strong>the {ORD[tlOppositeHouse]} house</strong> — {HOUSE_GLOSS[tlOppositeHouse]} — {isKetu ? "the reach you grow into as these roots loosen" : "the roots that quietly loosen as you reach outward"}. The year lives between the two.
      </>
    );
  }

  // THE THREAD — the resting close (David 2026-07-16: "this needs a simple prose written
  // summary at the end. 2-3 sentences. right now it's just a feature."). Plain places,
  // no house numbers, built from the same computed facts.
  const PLACE: Record<number, string> = {
    1: "the self and the body", 2: "money and livelihood", 3: "the craft and the close circle",
    4: "home and roots", 5: "the heart and its creations", 6: "the daily work and health",
    7: "partnership", 8: "the shared and the hidden", 9: "belief and the far horizon",
    10: "your standing in the world", 11: "community and gains", 12: "rest and release",
  };
  const thread =
    `So this is a year of ${PLACE[activatedHouse]}, and ${timeLord} runs it${tlNatalHouse ? ` from ${PLACE[tlNatalHouse]}` : ""}.` +
    (tlNatalHouse ? ` That seat is where the year actually happens — the questions of ${PLACE[activatedHouse]} get worked out through ${PLACE[tlNatalHouse]}.` : "") +
    (isKetu ? " And Ketu makes it a letting-go: the year moves by releasing that ground, not by gripping it."
      : isRahu ? " And Rahu makes it a hunger: the year keeps reaching past what is familiar there."
      : ` Watch the days ${timeLord} runs strong — that is when this year speaks loudest.`);

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
      <p style={{ marginTop: "1.15rem", fontSize: "0.97rem", lineHeight: 1.7, color: "var(--foreground)" }}>
        <GlossaryText>{thread}</GlossaryText>
      </p>
    </div>
  );
}
