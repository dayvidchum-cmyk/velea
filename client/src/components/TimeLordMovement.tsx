/**
 * TimeLordMovement — compact at-a-glance Time Lord transit card for the Planner.
 *
 * Shows the active transit for the selected date:
 *   Planet Year / Sign • House
 *   Date range
 *   Focus (one line)
 *   Best Uses (bullets)
 *   Avoid (bullets)
 *
 * No accordion. No large expandable sections.
 * Updates automatically when selectedDate changes.
 */

import { trpc } from "@/lib/trpc";
import { useDayModeColor } from "@/hooks/useDayModeColor";
import GlossaryText from "@/components/GlossaryText";

// ─── House focus labels ───────────────────────────────────────────────────────

const HOUSE_FOCUS: Record<number, string> = {
  1: "Self-direction, identity, visibility, personal agency.",
  2: "Resources, values, financial stability, voice.",
  3: "Communication, writing, skill-building, short connections.",
  4: "Home, roots, emotional foundation, private stability.",
  5: "Creativity, expression, pleasure, speculative work.",
  6: "Work routines, repair, health, service, daily discipline.",
  7: "Relationships, contracts, partnerships, public exchange.",
  8: "Shared resources, transformation, depth, hidden complexity.",
  9: "Education, systems, refinement, teaching, frameworks.",
  10: "Visibility, authority, public work, reputation.",
  11: "Networks, community, audience, future planning.",
  12: "Rest, withdrawal, closure, private work, spiritual practice.",
};

// ─── House best uses ─────────────────────────────────────────────────────────

const HOUSE_BEST_USES: Record<number, string[]> = {
  1: ["Personal development", "Identity work", "Self-presentation", "New beginnings"],
  2: ["Financial planning", "Skill monetization", "Resource allocation", "Value clarification"],
  3: ["Writing", "Documentation", "Short-form communication", "Local connections"],
  4: ["Home environment work", "Foundational stability", "Family affairs", "Rest"],
  5: ["Creative projects", "Self-expression", "Speculative work", "Pleasure"],
  6: ["Service work", "Health routines", "Skill refinement", "Process improvement"],
  7: ["Relationship work", "Contracts", "Partnership evaluation", "Client work"],
  8: ["Deep research", "Transformation work", "Financial restructuring", "Intimacy"],
  9: ["Learning", "Documentation", "System building", "Method development"],
  10: ["Publishing", "Marketing", "Presentations", "Portfolio building"],
  11: ["Community building", "Goal setting", "Network cultivation", "Audience work"],
  12: ["Solitary work", "Spiritual practice", "Releasing old patterns", "Reflection"],
};

// ─── House avoid ─────────────────────────────────────────────────────────────

const HOUSE_AVOID: Record<number, string[]> = {
  1: ["Excessive self-focus", "Ignoring others", "Reactive identity decisions"],
  2: ["Impulsive spending", "Undervaluing your work", "Financial shortcuts"],
  3: ["Information overload", "Scattered communication", "Shallow learning"],
  4: ["Neglecting home base", "Avoiding emotional processing", "Overworking"],
  5: ["Neglecting responsibilities", "Excessive speculation", "Seeking empty pleasure"],
  6: ["Ignoring health signals", "Overworking without rest", "Skipping routines"],
  7: ["Avoiding necessary confrontation", "Overcommitting to others", "Neglecting self"],
  8: ["Forcing outcomes", "Avoiding depth", "Ignoring financial complexity"],
  9: ["Forcing visibility", "Premature launches", "Chasing recognition"],
  10: ["Endless preparation", "Staying hidden", "Excessive revision"],
  11: ["Overcommitting to networks", "Chasing every opportunity", "Neglecting close relationships"],
  12: ["Excessive isolation", "Ignoring practical needs", "Forced withdrawal"],
};

// ─── Planet label map ─────────────────────────────────────────────────────────

const PLANET_YEAR_LABEL: Record<string, string> = {
  Sun: "Sun Year",
  Moon: "Moon Year",
  Mars: "Mars Year",
  Mercury: "Mercury Year",
  Jupiter: "Jupiter Year",
  Venus: "Venus Year",
  Saturn: "Saturn Year",
  Rahu: "Rahu Year",
  Ketu: "Ketu Year",
};

const HOUSE_ORDINAL: Record<number, string> = {
  1: "1st", 2: "2nd", 3: "3rd", 4: "4th", 5: "5th", 6: "6th",
  7: "7th", 8: "8th", 9: "9th", 10: "10th", 11: "11th", 12: "12th",
};

// ─── Date formatting ──────────────────────────────────────────────────────────

function formatDateRange(start: string, end: string): string {
  const s = new Date(start + "T12:00:00");
  const e = new Date(end + "T12:00:00");
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  return `${s.toLocaleDateString("en-US", opts)} – ${e.toLocaleDateString("en-US", opts)}`;
}

// ─── Component ────────────────────────────────────────────────────────────────

interface TimeLordMovementProps {
  selectedDate: string; // YYYY-MM-DD
  /** When true, renders with transparent background and white text for use inside a gradient hero card */
  variant?: "default" | "immersive";
  /** In immersive mode, use this color for section labels/headers (e.g. the hero card's mode color) */
  accentColor?: string;
  /** In immersive mode, use this darker color for section label headers (replaces accentColor for better readability on gradient backgrounds) */
  darkColor?: string;
  /** Engine-generated, chart-personalized chapter lists; override the static house lists when present */
  bestUses?: string[];
  avoid?: string[];
}

export function TimeLordMovement({ selectedDate, variant = "default", accentColor, darkColor, bestUses: propBestUses, avoid: propAvoid }: TimeLordMovementProps) {
  const { data: transit, isLoading } = trpc.timeLordTransit.forDate.useQuery(
    { date: selectedDate },
    { enabled: !!selectedDate }
  );
  const dayLabelColor = useDayModeColor();

  const immersive = variant === "immersive";
  const borderColor = immersive ? "rgba(255,255,255,0.15)" : "var(--border)";
  const bgColor = immersive ? "transparent" : "var(--card)";
  // Immersive: keep every line white so the header and the labels beneath it read
  // as one family (no darker date/section labels).
  const labelColor = immersive ? "#FDFDFD" : dayLabelColor;
  const textColor = immersive ? "#FDFDFD" : "var(--foreground)";
  const mutedColor = immersive ? "rgba(255,255,255,0.93)" : "var(--muted-foreground)";
  const dotColor = immersive ? "rgba(255,255,255,0.55)" : "var(--muted-foreground)";

  if (isLoading) {
    return (
      <div
        className="rounded-xl px-5 py-4 mb-5"
        style={{ border: `1px solid ${borderColor}`, background: bgColor }}
      >
        <div className="h-3 w-32 rounded animate-pulse mb-2" style={{ background: borderColor }} />
        <div className="h-4 w-48 rounded animate-pulse mb-1" style={{ background: borderColor }} />
        <div className="h-3 w-24 rounded animate-pulse" style={{ background: borderColor }} />
      </div>
    );
  }

  if (!transit) {
    return null; // No birth chart data — silently hide
  }

  const house = transit.house ?? 0;
  const bestUses = (propBestUses && propBestUses.length ? propBestUses : HOUSE_BEST_USES[house]) ?? [];
  const avoid = (propAvoid && propAvoid.length ? propAvoid : HOUSE_AVOID[house]) ?? [];
  const focus = HOUSE_FOCUS[house] ?? transit.operationalMeaning ?? "";
  const planetLabel = PLANET_YEAR_LABEL[transit.timeLord] ?? `${transit.timeLord} Year`;
  const houseLabel = HOUSE_ORDINAL[house] ? `${HOUSE_ORDINAL[house]} House` : "";
  const retroNote = transit.isRetrograde ? " · Retrograde" : "";

  return (
    <div
      className="rounded-xl px-5 py-4 mb-5"
      style={immersive
        ? { background: "transparent" }
        : { border: `1px solid ${borderColor}`, background: bgColor }
      }
    >
      {/* Planet + sign + house */}
      <div className="flex items-baseline gap-2 flex-wrap mb-0.5">
        <span
          className="text-lg font-bold"
          style={{ color: textColor, letterSpacing: "0.02em" }}
        >
          {planetLabel}
        </span>
        <span
          className="text-base"
          style={{ color: mutedColor }}
        >
          {transit.sign} · {houseLabel}{retroNote}
        </span>
      </div>

      {/* Date range */}
      <p
        className="text-xs mb-3 uppercase"
        style={{ color: labelColor, letterSpacing: "0.04em" }}
      >
        {formatDateRange(transit.startDate, transit.endDate)}
      </p>

      {/* Focus */}
      <div className="mb-3">
        <p
          className="text-sm font-bold uppercase mb-1"
          style={{ color: labelColor, letterSpacing: "0.04em" }}
        >
          Focus
        </p>
        <p
          className="text-base leading-relaxed"
          style={{ color: mutedColor }}
        >
          <GlossaryText>{focus}</GlossaryText>
        </p>
      </div>

      {/* Best Uses + Avoid — side by side on wider screens, stacked on narrow */}
      <div className="flex gap-5 flex-wrap">
        {/* Best Uses */}
        <div className="flex-1 min-w-[120px]">
          <p
            className="text-sm font-bold uppercase mb-1.5"
            style={{ color: labelColor, letterSpacing: "0.04em" }}
          >
            Best Uses
          </p>
          <ul className="space-y-1">
            {bestUses.map((use) => (
              <li
                key={use}
                className="flex items-start gap-1.5 text-base"
                style={{ color: mutedColor }}
              >
                <span style={{ color: dotColor, flexShrink: 0, width: "0.7rem", lineHeight: "1.5rem", textAlign: "center" }}>•</span>
                {use.charAt(0).toUpperCase() + use.slice(1)}
              </li>
            ))}
          </ul>
        </div>

        {/* Avoid */}
        <div className="flex-1 min-w-[120px]">
          <p
            className="text-sm font-bold uppercase mb-1.5"
            style={{ color: labelColor, letterSpacing: "0.04em" }}
          >
            Avoid
          </p>
          <ul className="space-y-1">
            {avoid.map((item) => (
              <li
                key={item}
                className="flex items-start gap-1.5 text-base"
                style={{ color: mutedColor }}
              >
                <span style={{ color: dotColor, flexShrink: 0, width: "0.7rem", lineHeight: "1.5rem", textAlign: "center" }}>•</span>
                {item.charAt(0).toUpperCase() + item.slice(1)}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
