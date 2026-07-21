// THE DOOR GATE — the ask (David's ruling, 2026-07-21: the confirm happens at the door, before
// generation, "and it saves money").
//
// WHY IT ASKS AT ALL. Every profile's hometown was seeded from its birth city — backfilled by
// add-location-model.ts for the ones that existed, and copied at creation by profiles.ts:531 for
// every one since. That was right for its own purpose (nobody should lose a sky because they never
// set a hometown), but it means a stored hometown is not evidence that a human chose it. For anyone
// who has moved, every reading is cast on the wrong sunrise, the wrong day-turn and the wrong tara
// boundary — and billed. Nothing in the schema could tell a chosen ground from a copied one, which
// is why profiles.hometownConfirmedAt exists and why this card exists to fill it.
//
// WHERE IT SITS. Beside the location chip, which already renders on exactly the surfaces that have
// doors (Planner, Horoscope). A per-door prompt is the same mistake as a per-surface spend gate:
// it works until someone adds the door that forgets it. The server enforces the real gate in
// guardedGen; this is the way to answer it.
//
// It is deliberately NOT a modal. Standing rule: ship UI as evolutions and keep the muscle-memory
// anchors stable — an unexpected full-screen interrupt on open is the churn this app avoids. The
// card sits in the flow, above the calendar, and the reading below it simply hasn't generated yet.
//
// Both buttons answer. A decline is a decision and is stamped, so the door asks once per profile
// and then never again — no nagging, per the ruling.
import { useState } from "react";
import { MapPin } from "lucide-react";
import { trpc } from "@/lib/trpc";

export default function GroundGate({ accent }: { accent?: string }) {
  const utils = trpc.useUtils();
  const { data } = trpc.settings.getReadingLocation.useQuery();
  const [busy, setBusy] = useState(false);
  const confirm = trpc.settings.confirmGround.useMutation({
    onSettled: async () => {
      // The chip and the gate read the SAME query, so one invalidation updates both and the card
      // disappears the moment the answer lands.
      await utils.settings.getReadingLocation.invalidate();
      setBusy(false);
    },
  });

  if (!data?.needsGroundConfirm) return null;

  const name = data.name ?? "you";
  const city = data.city;
  const tint = accent ?? "var(--color-primary)";

  const answer = (decision: "confirm" | "decline") => {
    setBusy(true);
    confirm.mutate({ decision });
  };

  return (
    <div
      style={{
        padding: "0.7rem 0.8rem",
        marginBottom: "0.55rem",
        borderRadius: 10,
        background: "var(--color-secondary)",
        border: "1px solid var(--color-border)",
        borderLeft: `3px solid ${tint}`,
        fontSize: "0.8rem",
        color: "var(--color-foreground)",
      }}
    >
      <div style={{ display: "flex", gap: "0.4rem", alignItems: "flex-start" }}>
        <MapPin size={13} style={{ color: tint, flexShrink: 0, marginTop: "0.2rem" }} />
        <div style={{ lineHeight: 1.5 }}>
          {/* Names the ground it is asking about, because a yes/no about an unstated city is not a
              question anyone can answer honestly. If there is no city to name, the card says so
              rather than asking about nothing. */}
          {city ? (
            <>
              Readings for <strong style={{ fontWeight: 600 }}>{name}</strong> are cast at{" "}
              <strong style={{ fontWeight: 600 }}>{city}</strong> — the sunrise, the day's turn and
              the star boundaries all come from there. Is that where {name === "you" ? "you are" : "they are"}?
            </>
          ) : (
            <>
              No location is set for <strong style={{ fontWeight: 600 }}>{name}</strong>, so the
              day's timing has nothing to stand on. Set one and every reading is tuned to it.
            </>
          )}
        </div>
      </div>

      <div style={{ display: "flex", gap: "0.4rem", marginTop: "0.6rem", flexWrap: "wrap" }}>
        {city && (
          <button
            type="button"
            disabled={busy}
            onClick={() => answer("confirm")}
            style={{
              flex: "1 1 auto", padding: "0.4rem 0.7rem", borderRadius: 8, cursor: busy ? "wait" : "pointer",
              background: tint, color: "var(--color-primary-foreground)", border: "none",
              font: "inherit", fontSize: "0.78rem", fontWeight: 600, opacity: busy ? 0.6 : 1,
            }}
          >
            Yes, that's right
          </button>
        )}
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            // "No" opens the ONE location surface (the one-surface law) rather than growing a
            // second place to enter a city. The stamp is written when a location is actually
            // saved there; leaving it unanswered leaves the door shut, which is the honest
            // state — they said the ground was wrong and have not yet said what is right.
            window.dispatchEvent(new Event("velea-open-location"));
          }}
          style={{
            flex: "1 1 auto", padding: "0.4rem 0.7rem", borderRadius: 8, cursor: busy ? "wait" : "pointer",
            background: "transparent", color: "var(--color-foreground)",
            border: "1px solid var(--color-border)", font: "inherit", fontSize: "0.78rem",
            fontWeight: 600, opacity: busy ? 0.6 : 1,
          }}
        >
          {city ? "No — change it" : "Set a location"}
        </button>
      </div>
    </div>
  );
}
