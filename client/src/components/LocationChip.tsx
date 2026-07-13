// A compact "where you're reading from" control, meant to sit ABOVE a calendar (Readings + Planner)
// so the current location is always in view and one tap from changing it — David kept forgetting to
// update it when switching profiles, because the only control was buried in the header/Settings.
// No schema of its own: it reads the existing per-user current location (settings.getLocation) and
// opens the existing LocationSheet by dispatching the same "velea-open-location" event the header and
// first-run welcome use. The sheet reloads on save, so the calendar recomputes under the new sky.
import { MapPin, ChevronRight } from "lucide-react";
import { trpc } from "@/lib/trpc";

export default function LocationChip({ accent }: { accent?: string }) {
  const { data } = trpc.settings.getLocation.useQuery();
  const city = data?.city ?? null;
  const tint = accent ?? "var(--color-primary)";
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event("velea-open-location"))}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "0.4rem",
        width: "100%",
        padding: "0.45rem 0.7rem",
        marginBottom: "0.55rem",
        borderRadius: 10,
        background: "var(--color-secondary)",
        border: "1px solid var(--color-border)",
        color: "var(--color-foreground)",
        cursor: "pointer",
        font: "inherit",
        fontSize: "0.8rem",
        textAlign: "left",
      }}
      aria-label="Change the location your readings are computed for"
    >
      <MapPin size={13} style={{ color: tint, flexShrink: 0 }} />
      <span style={{ color: "var(--color-muted-foreground)" }}>
        Reading from{" "}
        <strong style={{ color: "var(--color-foreground)", fontWeight: 600 }}>
          {city ?? "set your location"}
        </strong>
      </span>
      <span
        style={{
          marginLeft: "auto",
          display: "flex",
          alignItems: "center",
          gap: "0.15rem",
          color: tint,
          fontSize: "0.72rem",
          fontWeight: 600,
        }}
      >
        Change <ChevronRight size={13} />
      </span>
    </button>
  );
}
