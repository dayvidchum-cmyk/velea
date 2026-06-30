import { Fragment, type ReactElement } from "react";

// Personalized traditional annual-profection wheel. Twelve house sectors carry the
// user's whole-sign signs (labels colored by each sign's ruling planet); ages spiral
// outward in 12-year rings; the current age is highlighted in the current Time Lord's
// Velea planet color. Past/future cells alternate by house for readability.

const ZODIAC = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"];
const ABBR: Record<string, string> = { Aries: "Ari", Taurus: "Tau", Gemini: "Gem", Cancer: "Can", Leo: "Leo", Virgo: "Vir", Libra: "Lib", Scorpio: "Sco", Sagittarius: "Sag", Capricorn: "Cap", Aquarius: "Aqu", Pisces: "Pis" };
const RULER: Record<string, string> = { Aries: "Mars", Taurus: "Venus", Gemini: "Mercury", Cancer: "Moon", Leo: "Sun", Virgo: "Mercury", Libra: "Venus", Scorpio: "Mars", Sagittarius: "Jupiter", Capricorn: "Saturn", Aquarius: "Saturn", Pisces: "Jupiter" };
const PLANET_COLORS: Record<string, string> = { Sun: "#E8A317", Moon: "#C0C0C0", Mars: "#BD0039", Mercury: "#85CDB5", Jupiter: "#C9A800", Venus: "#F8A4AC", Saturn: "#3F50AF", Ketu: "#9A7B6C", Rahu: "#5691A4" };
// Each sign gets its own shade WITHIN its ruler's hue family, so the two signs a planet
// rules read as related-but-distinct (Taurus pastel pink / Libra magenta-rose = Venus;
// Aries bright red / Scorpio deep crimson = Mars; etc.).
const SIGN_COLOR: Record<string, string> = {
  Aries: "#E23B4E", Scorpio: "#8E1E3A",        // Mars
  Taurus: "#F4A9C2", Libra: "#B23A78",         // Venus (pastel pink / deep magenta-rose)
  Gemini: "#7FD4B8", Virgo: "#2E9C7C",         // Mercury
  Cancer: "#A9B4C2",                            // Moon
  Leo: "#EE9A2E",                               // Sun
  Sagittarius: "#E6C24A", Pisces: "#B0851F",   // Jupiter
  Capricorn: "#6E7BD4", Aquarius: "#313E8C",   // Saturn
};
// Trailing ︎ (variation selector-15) forces TEXT presentation so these render as
// elegant monochrome glyphs (taking our color), not colorful OS emoji.
const GLYPH: Record<string, string> = {
  Aries: "♈︎", Taurus: "♉︎", Gemini: "♊︎", Cancer: "♋︎", Leo: "♌︎", Virgo: "♍︎",
  Libra: "♎︎", Scorpio: "♏︎", Sagittarius: "♐︎", Capricorn: "♑︎", Aquarius: "♒︎", Pisces: "♓︎",
};
const PLANET_GLYPH: Record<string, string> = {
  Sun: "☉︎", Moon: "☽︎", Mercury: "☿︎", Venus: "♀︎", Mars: "♂︎", Jupiter: "♃︎", Saturn: "♄︎", Rahu: "☊︎", Ketu: "☋︎",
};
const RULERSHIP: { planet: string; signs: string[] }[] = [
  { planet: "Sun", signs: ["Leo"] },
  { planet: "Moon", signs: ["Cancer"] },
  { planet: "Mercury", signs: ["Gemini", "Virgo"] },
  { planet: "Venus", signs: ["Taurus", "Libra"] },
  { planet: "Mars", signs: ["Aries", "Scorpio"] },
  { planet: "Jupiter", signs: ["Sagittarius", "Pisces"] },
  { planet: "Saturn", signs: ["Capricorn", "Aquarius"] },
];
const GLYPH_FONT = "'Apple Symbols','Segoe UI Symbol','Noto Sans Symbols2',serif";

function polar(cx: number, cy: number, r: number, deg: number): [number, number] {
  const a = ((deg - 90) * Math.PI) / 180;
  return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
}
function annular(cx: number, cy: number, ri: number, ro: number, a0: number, a1: number): string {
  const [x1, y1] = polar(cx, cy, ro, a0);
  const [x2, y2] = polar(cx, cy, ro, a1);
  const [x3, y3] = polar(cx, cy, ri, a1);
  const [x4, y4] = polar(cx, cy, ri, a0);
  const large = a1 - a0 > 180 ? 1 : 0;
  return `M ${x1} ${y1} A ${ro} ${ro} 0 ${large} 1 ${x2} ${y2} L ${x3} ${y3} A ${ri} ${ri} 0 ${large} 0 ${x4} ${y4} Z`;
}

export function ProfectionWheel({ lagnaSign, age, headingColor }: { lagnaSign: string; age: number; headingColor?: string }) {
  const lagIdx = ZODIAC.indexOf(lagnaSign);
  if (lagIdx < 0 || age == null) return null;

  const currentHouse = (age % 12) + 1;
  const rings = 10; // full Vimshottari span — ages 0–119

  const SIZE = 320;
  const cx = SIZE / 2, cy = SIZE / 2;
  const labelBand = 26;
  const hole = 16;
  const ringOuter = SIZE / 2 - labelBand - 2;
  const ringW = (ringOuter - hole) / rings;

  const currentSign = ZODIAC[(lagIdx + (age % 12)) % 12];
  const timeLord = RULER[currentSign];
  const currentColor = SIGN_COLOR[currentSign] ?? "#888";

  const cells: ReactElement[] = [];
  const labels: ReactElement[] = [];

  for (let h = 0; h < 12; h++) {
    const a0 = h * 30, a1 = (h + 1) * 30;
    const sign = ZODIAC[(lagIdx + h) % 12];
    const signColor = SIGN_COLOR[sign] ?? "#888";
    const base = `color-mix(in srgb, ${signColor} 38%, var(--card))`;

    for (let r = 0; r < rings; r++) {
      const ri = hole + r * ringW, ro = hole + (r + 1) * ringW;
      const ageVal = r * 12 + h;
      const isCurrent = ageVal === age;
      const isBirth = ageVal === 0;
      // Birth cell: a more saturated fill of its own sign color, with a black bold "0".
      const birthFill = `color-mix(in srgb, ${signColor} 75%, var(--card))`;
      const cellFill = isCurrent ? currentColor : isBirth ? birthFill : base;
      const [tx, ty] = polar(cx, cy, (ri + ro) / 2, (a0 + a1) / 2);
      cells.push(
        <path key={`c${h}-${r}`} d={annular(cx, cy, ri, ro, a0, a1)} fill={cellFill} stroke={isCurrent ? currentColor : isBirth ? birthFill : "var(--border)"} strokeWidth={0.5} />,
        <text key={`t${h}-${r}`} x={tx} y={ty} fontSize={7} fontWeight={isCurrent || isBirth ? 800 : 400} fill={isCurrent || isBirth ? "#000" : "var(--muted-foreground)"} textAnchor="middle" dominantBaseline="central">{ageVal}</text>,
      );
    }

    const [lx, ly] = polar(cx, cy, ringOuter + labelBand / 2, (a0 + a1) / 2);
    labels.push(
      <text key={`l${h}`} x={lx} y={ly} fontSize={currentHouse === h + 1 ? 17 : 13} fontWeight={700} fill={signColor} fontFamily="'Apple Symbols','Segoe UI Symbol','Noto Sans Symbols2',serif" textAnchor="middle" dominantBaseline="central">{GLYPH[sign]}</text>,
    );
  }

  // BIRTH / NOW callouts — sit just outside (under) the wedge's zodiac glyph, in
  // light grey, with a thin black line pointing back to that wedge's section.
  const callouts: ReactElement[] = [];
  const mkCallout = (h: number, text: string, bump: number) => {
    const midA = h * 30 + 15;
    const rText = ringOuter + labelBand + 12 + bump;
    const [lx, ly] = polar(cx, cy, rText, midA);
    callouts.push(
      <text key={`co-t-${text}`} x={lx} y={ly} fontSize={6.5} fontWeight={700} fill="#9CA3AF" textAnchor="middle" dominantBaseline="central" style={{ letterSpacing: "0.08em" }}>{text}</text>,
    );
  };
  const nowH = age % 12;
  mkCallout(0, "BIRTH", 0);
  // If the current year falls on the birth wedge (age is a multiple of 12), stack NOW further out.
  mkCallout(nowH, "NOW", nowH === 0 ? 9 : 0);

  const M = 26; // outer margin so the callouts aren't clipped

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.75rem" }}>
      <svg viewBox={`${-M} ${-M} ${SIZE + 2 * M} ${SIZE + 2 * M}`} width="100%" style={{ display: "block" }}>
        {cells}
        {labels}
        {callouts}
        <circle cx={cx} cy={cy} r={hole} fill="var(--background)" stroke="var(--border)" strokeWidth={0.5} />
      </svg>
      <div style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", padding: "0.5rem 0.9rem", borderRadius: "999px", background: "var(--muted)", fontSize: "0.95rem", color: "var(--foreground)" }}>
        <span style={{ width: 12, height: 12, borderRadius: "50%", background: currentColor, flexShrink: 0 }} />
        <span>This year — house {currentHouse}, <strong><span style={{ fontFamily: GLYPH_FONT }}>{GLYPH[currentSign]}</span> {currentSign}</strong>, ruled by <strong>{timeLord}</strong></span>
      </div>
      <div style={{ width: "100%", borderTop: "1px solid var(--border)", paddingTop: "1rem" }}>
        <p style={{ fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: headingColor ?? "var(--muted-foreground)", textAlign: "left", marginBottom: "0.75rem" }}>Planets &amp; the signs they rule</p>
        <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", rowGap: "0.55rem", columnGap: "1.25rem", fontSize: "0.9rem", alignItems: "baseline" }}>
          {RULERSHIP.map(({ planet, signs }) => (
            <Fragment key={planet}>
              <span style={{ color: "var(--foreground)", fontWeight: 600, whiteSpace: "nowrap" }}>{PLANET_GLYPH[planet]} {planet}</span>
              <span style={{ display: "flex", gap: "1.1rem", flexWrap: "wrap" }}>
                {signs.map((s) => (
                  <span key={s} style={{ color: SIGN_COLOR[s] ?? "var(--foreground)", fontWeight: 600, whiteSpace: "nowrap" }}>{GLYPH[s]} {s}</span>
                ))}
              </span>
            </Fragment>
          ))}
        </div>
      </div>
    </div>
  );
}
