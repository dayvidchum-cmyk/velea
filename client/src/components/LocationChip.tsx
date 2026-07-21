// A compact "whose sky, and where" control, meant to sit ABOVE a calendar (Readings + Planner) so
// the reading's location is always in view and one tap from changing it — David kept forgetting to
// update it when switching profiles, because the only control was buried in the header/Settings.
//
// It used to read settings.getLocation (the ACCOUNT slot) and print "Reading from <city>". That was
// wrong twice: it never said WHO was being read, and a profile cast from its own ground would be
// read from that ground while this chip displayed the account's city — a confident wrong answer.
//
// 2026-07-21: David changed the city here while viewing one profile and a second profile silently
// inherited it. His fix, in his words: "The little calendar thing should say 'reading for Lang in
// Boston' after I change it. That would help me ground where I am in the app... Like, who am I
// looking up again? Oh yeah. Lisa. She's in NJ."
//
// So it now reads settings.getReadingLocation, which runs the SAME resolveDaySky the reading uses,
// and names the subject. No schema of its own; still opens the one LocationSheet via the shared
// "velea-open-location" event (the one-surface law).
import { MapPin, ChevronRight } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { locationSuffix, type DaySkySource } from "@shared/location-label";

export default function LocationChip({ accent }: { accent?: string }) {
  const { data } = trpc.settings.getReadingLocation.useQuery();
  const name = data?.name ?? null;
  const city = data?.city ?? null;
  const tint = accent ?? "var(--color-primary)";

  // The suffix rule lives in shared/location-label.ts so it can be tested — the vitest config only
  // collects server/ and shared/, and copy chosen by a data tier is exactly the thing that must
  // not ship unguarded. See that file for why each tier says what it says.
  const suffix = locationSuffix(data?.source as DaySkySource | undefined, !!data?.isOwner, city);

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
      aria-label={
        name && city
          ? `Reading for ${name} in ${city}. Change the location this reading is computed for.`
          : "Change the location your readings are computed for"
      }
    >
      <MapPin size={13} style={{ color: tint, flexShrink: 0 }} />
      <span style={{ color: "var(--color-muted-foreground)" }}>
        Reading for{" "}
        <strong style={{ color: "var(--color-foreground)", fontWeight: 600 }}>
          {name ?? "you"}
        </strong>{" "}
        in{" "}
        <strong style={{ color: "var(--color-foreground)", fontWeight: 600 }}>
          {city ?? "set a location"}
        </strong>
        {/* Not a warning colour and not an alarm — a quiet honest label, and only when the tier
            actually has something to disclose. */}
        {suffix && (
          <span style={{ color: "var(--color-muted-foreground)", fontStyle: "italic" }}> · {suffix}</span>
        )}
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
          flexShrink: 0,
        }}
      >
        Change <ChevronRight size={13} />
      </span>
    </button>
  );
}
