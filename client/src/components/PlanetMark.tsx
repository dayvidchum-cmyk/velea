import type { CSSProperties, ReactElement } from "react";

/**
 * PlanetMark — the five station planets drawn as OUR OWN line-art (David 2026-07-16:
 * "the planner calendar is the bane of my existence… I won't ever be able to look at
 * every single user's calendar to make sure the glyphs are lined up").
 *
 * WHY: the calendar previously rendered ☿♀♂♃♄ as FONT characters (Apple Symbols), whose
 * ink sits off-center differently per platform and size — the root of every alignment
 * war (GLYPH_NUDGE etc.). These SVGs are pure geometry in one 24×24 box, visually
 * centered BY CONSTRUCTION: identical pixels on every device, no font, no nudges.
 * Kin to OctagramMark / LotusMark / SummitMark (round line-art, bindu-hearted circles).
 */
const PATHS: Record<string, ReactElement> = {
  Mercury: (
    <>
      {/* horns · head · cross — ☿ */}
      <path d="M7.8 3.2 C8.4 5.4 10 6.6 12 6.6 C14 6.6 15.6 5.4 16.2 3.2" />
      <circle cx="12" cy="11" r="4.4" />
      <path d="M12 15.4 V21" />
      <path d="M9.2 18.2 H14.8" />
    </>
  ),
  Venus: (
    <>
      {/* head · cross — ♀ */}
      <circle cx="12" cy="8.6" r="4.9" />
      <path d="M12 13.5 V21" />
      <path d="M8.8 17.6 H15.2" />
    </>
  ),
  Mars: (
    <>
      {/* shield · spear — ♂ */}
      <circle cx="10.2" cy="13.8" r="5.1" />
      <path d="M13.9 10.1 L19.4 4.6" />
      <path d="M14.6 4.6 H19.4 V9.4" />
    </>
  ),
  Jupiter: (
    <>
      {/* the crescent-two · crossbar · stem — ♃ */}
      <path d="M6.2 7.6 C6.2 4.9 9.4 3.6 11.2 5.5 C13.1 7.5 11.6 10.3 8.9 12.6 C7.6 13.7 6.4 14.8 5.4 15.9 H16.2" />
      <path d="M13.6 10.4 V20.4" />
    </>
  ),
  Saturn: (
    <>
      {/* cross · sickle — ♄ */}
      <path d="M9 4.2 V14.6" />
      <path d="M6.2 7.4 H11.8" />
      <path d="M9 14.6 C9 11.8 13.8 11 15.2 13.8 C16.4 16.2 14.6 18 13.2 19.4 C12.8 19.8 12.8 20.4 13.3 20.8" />
    </>
  ),
};

export const PLANET_MARK_INK: Record<string, string> = {
  // The assigned inks: Mercury aquamarine + Saturn jyotish indigo are David's blessed
  // mark colors; Venus/Mars/Jupiter wear the dasha table's parchment set.
  Mercury: "#3FA8A0", Saturn: "#454A8C", Venus: "#CE5F6E", Mars: "#A8002C", Jupiter: "#A2850A",
};

export default function PlanetMark({
  planet,
  size = 14,
  strokeWidth = 1.9,
  color,
  style,
}: {
  planet: string;
  size?: number;
  strokeWidth?: number;
  color?: string;
  style?: CSSProperties;
}) {
  const body = PATHS[planet];
  if (!body) return null;
  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color ?? PLANET_MARK_INK[planet] ?? "currentColor"}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ display: "inline-block", flexShrink: 0, ...style }}
    >
      {body}
    </svg>
  );
}
