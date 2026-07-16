import { useState, useMemo, useEffect, useRef } from "react";
import VeleaLoader from "@/components/VeleaLoader";
import { createPortal } from "react-dom";
import { trpc } from "@/lib/trpc";
import { ChevronDown, X } from "lucide-react";
import { useLocation } from "wouter";
import OctagramMark from "@/components/OctagramMark";
import AppHeader from "@/components/AppHeader";
import GlossaryText from "@/components/GlossaryText";
import { ModeCard } from "@/components/ModeCard";
import { TimeLordMovement } from "@/components/TimeLordMovement";
import { useDayModeColor } from "@/hooks/useDayModeColor";
import { PANCHANG_TO_TASK_MODE, MODE_OKLCH, MODE_DARK, MODE_SOLID, autoTextColors, type TaskMode } from "@shared/types";

// ── Constants ──────────────────────────────────────────────────────────────

const PLANET_COLORS: Record<string, string> = {
  Sun: "#E8A317", Moon: "#C0C0C0", Mars: "#BD0039", Mercury: "#85CDB5",
  Jupiter: "#C9A800", Venus: "#F8A4AC", Saturn: "#3F50AF",
  Ketu: "#9A7B6C", Rahu: "#5691A4",
};

// Planet colors tuned for legibility on the parchment natal chart (darker/richer
// than the default set so the light ones — Moon, Mercury, Venus — don't wash out).
const PLANET_COLORS_PARCH: Record<string, string> = {
  Sun: "#C2820A", Moon: "#7E7E7E", Mars: "#A8002C", Mercury: "#3C8A7A",
  Jupiter: "#A2850A", Venus: "#CE5F6E", Saturn: "#37468F", Ketu: "#856453", Rahu: "#3A7888",
};

// Astrological glyphs for each graha
const PLANET_SYMBOLS: Record<string, string> = {
  Sun: "☉", Moon: "☽", Mars: "♂", Mercury: "☿",
  Jupiter: "♃", Venus: "♀", Saturn: "♄",
  Rahu: "☊", Ketu: "☋",
};

// ── Planet color helpers ─────────────────────────────────────────────────────

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

/** Perceptual luminance (0–255). Above ~150 reads as a "light" color. */
function luminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex);
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

/** TONAL inks (the Today-page law: never white, never black) — a light fill carries a
 *  DEEP register of its own hue; a dark fill carries a PALE cream-tinted register. */
function planetTextColors(hex: string) {
  const deep = (p: number) => `color-mix(in srgb, color-mix(in srgb, ${hex} 45%, #2A1F14) ${p}%, transparent)`;
  const pale = (p: number) => `color-mix(in srgb, color-mix(in srgb, ${hex} 22%, #FBF7ED) ${p}%, transparent)`;
  return luminance(hex) > 150
    ? { primary: deep(100), muted: deep(72), faint: deep(58), chip: deep(14), chipBorder: deep(30) }
    : { primary: pale(100), muted: pale(78), faint: pale(64), chip: pale(20), chipBorder: pale(40) };
}

/** Subtle ±12% vertical gradient so cards read as one family with gentle depth. */
function planetGradient(hex: string): string {
  return `linear-gradient(180deg, color-mix(in srgb, ${hex} 88%, #FDFDFD) 0%, ${hex} 50%, color-mix(in srgb, ${hex} 88%, #000) 100%)`;
}

const PLANET_DIGNITY: Record<string, { exalt: string; debil: string; own: string[] }> = {
  Sun:     { exalt: "Aries",     debil: "Libra",     own: ["Leo"] },
  Moon:    { exalt: "Taurus",    debil: "Scorpio",   own: ["Cancer"] },
  Mars:    { exalt: "Capricorn", debil: "Cancer",    own: ["Aries", "Scorpio"] },
  Mercury: { exalt: "Virgo",     debil: "Pisces",    own: ["Gemini", "Virgo"] },
  Jupiter: { exalt: "Cancer",    debil: "Capricorn", own: ["Sagittarius", "Pisces"] },
  Venus:   { exalt: "Pisces",    debil: "Virgo",     own: ["Taurus", "Libra"] },
  Saturn:  { exalt: "Libra",     debil: "Aries",     own: ["Capricorn", "Aquarius"] },
  Rahu:    { exalt: "Taurus",    debil: "Scorpio",   own: [] },
  Ketu:    { exalt: "Scorpio",   debil: "Taurus",    own: [] },
};

function getPlanetDignity(planet: string, sign: string): string | null {
  const d = PLANET_DIGNITY[planet];
  if (!d) return null;
  if (sign === d.exalt) return "Exalt";
  if (sign === d.debil) return "Debil";
  if (d.own.includes(sign)) return "Own";
  return null;
}

const MAHADASHA_DURATIONS: Record<string, number> = {
  Mercury: 17, Ketu: 7, Venus: 20, Sun: 6, Moon: 10,
  Mars: 7, Rahu: 18, Jupiter: 16, Saturn: 19,
};

const ZODIAC_SIGNS = [
  "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
  "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces",
];

// North Indian chart: outer square (0-300) + inner diamond (midpoints) + X diagonals
// Key intersection points: (75,75) (225,75) (75,225) (225,225) (150,150)
const CHART_HOUSES = [
  { house: 1,  points: "150,0 225,75 150,150 75,75",    cx: 150, cy: 72  },
  { house: 2,  points: "0,0 150,0 75,75",                cx: 72,  cy: 22  },
  { house: 3,  points: "0,0 75,75 0,150",                cx: 34,  cy: 72  },
  { house: 4,  points: "0,150 75,75 150,150 75,225",     cx: 72,  cy: 150 },
  { house: 5,  points: "0,150 75,225 0,300",             cx: 34,  cy: 228 },
  { house: 6,  points: "75,225 150,300 0,300",           cx: 72,  cy: 278 },
  { house: 7,  points: "150,300 75,225 150,150 225,225", cx: 150, cy: 228 },
  { house: 8,  points: "300,300 150,300 225,225",        cx: 228, cy: 278 },
  { house: 9,  points: "300,300 300,150 225,225",        cx: 266, cy: 228 },
  { house: 10, points: "300,150 225,225 150,150 225,75", cx: 228, cy: 150 },
  { house: 11, points: "300,150 225,75 300,0",           cx: 266, cy: 72  },
  { house: 12, points: "300,0 225,75 150,0",             cx: 228, cy: 22  },
];

// ── Natal Chart visual ─────────────────────────────────────────────────────

// Short, user-facing summary for each house — shown when a house is tapped on the
// natal chart. Condensed from the narrative engine's house dictionary.
const HOUSE_SUMMARY: Record<number, { title: string; summary: string }> = {
  1: { title: "Self", summary: "Your body, vitality, and temperament — the lens you meet the world through, and your overall direction in life." },
  2: { title: "Wealth & Voice", summary: "What you own and value: money, resources, and possessions, your speech and self-worth, and your family of origin." },
  3: { title: "Courage & Communication", summary: "Effort, skill, and initiative; siblings and your inner circle — the closest friends, blood and chosen — neighbors, and short trips; writing, messaging, and the hands-on." },
  4: { title: "Home & Roots", summary: "Mother, home, land, and inner foundation — where you come from and what gives you a sense of security." },
  5: { title: "Creativity & Children", summary: "What comes out of you: creativity, romance, and play; children; discerning intelligence and speculation." },
  6: { title: "Work, Service & Health", summary: "Daily work and service, routine and duty; health and the body; debts, obstacles, conflict, and self-sacrifice." },
  7: { title: "Partnership", summary: "Marriage and one-on-one relationships; partners, clients, and contracts; the people you face directly." },
  8: { title: "Transformation & Depth", summary: "Crisis, change, and rebirth; intimacy and merged resources; the hidden, the occult, and deep psychology." },
  9: { title: "Belief & Fortune", summary: "Meaning, philosophy, and dharma; teachers and teaching; higher learning, long journeys, faith, and the father." },
  10: { title: "Career & Standing", summary: "Career, reputation, and public role; your action seen in the world, your authority, and your duty to society." },
  11: { title: "Gains & Network", summary: "Gains, income, and rewards; friends, networks, and community; hopes and the fulfillment of goals." },
  12: { title: "Release & Retreat", summary: "Letting go, rest, and the unseen; solitude, foreign lands, and spirituality; loss, expenses, and liberation." },
};

const HOUSE_RULER: Record<string, string> = {
  Aries: "Mars", Taurus: "Venus", Gemini: "Mercury", Cancer: "Moon", Leo: "Sun", Virgo: "Mercury",
  Libra: "Venus", Scorpio: "Mars", Sagittarius: "Jupiter", Capricorn: "Saturn", Aquarius: "Saturn", Pisces: "Jupiter",
};
const PLANET_QUALITY: Record<string, string> = {
  Sun: "vitality and authority", Moon: "feeling and the mind", Mars: "drive and friction",
  Mercury: "thought and communication", Jupiter: "faith and expansion", Venus: "love, money, and value",
  Saturn: "discipline and limit", Rahu: "hunger and ambition", Ketu: "detachment and release",
};
const ORD = ["", "1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th", "9th", "10th", "11th", "12th"];
const DIGNITY_WORD: Record<string, string> = { Exalt: "exalted", Debil: "debilitated", Own: "in its own sign" };

// Deterministic, chart-specific synthesis for a tapped house: weaves the house's
// theme with the sign on it, its ruler's nature and placement, and any planets there.
function composeHouseSynthesis(
  house: number,
  sign: string,
  planetsHere: Array<{ planet: string; sign: string; isRetrograde: boolean }>,
  natalBodies: NatalBody[],
): string[] {
  const ruler = HOUSE_RULER[sign];
  const out: string[] = [];

  out.push(`On your chart the ${ORD[house]} house is ${sign}, so its affairs run through ${ruler}'s nature — ${PLANET_QUALITY[ruler] ?? "its own character"}.`);

  if (planetsHere.length) {
    const parts = planetsHere.map(({ planet, sign: pSign }) => {
      const dig = getPlanetDignity(planet, pSign);
      const q = PLANET_QUALITY[planet];
      const tail = [q, dig ? DIGNITY_WORD[dig] : null].filter(Boolean).join(", ");
      return tail ? `${planet} (${tail})` : planet;
    });
    const list = parts.length === 1 ? parts[0] : `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}`;
    out.push(`${list} ${planetsHere.length === 1 ? "sits" : "sit"} here — ${planetsHere.length === 1 ? "its nature shapes" : "their natures shape"} how this area plays out for you.`);
  } else {
    out.push(`No planets sit here, so it is expressed mainly through its ruler, ${ruler}.`);
  }

  const rb = natalBodies.find((b) => b.planet === ruler);
  if (rb) {
    const rdig = getPlanetDignity(ruler, rb.sign);
    const rdigw = rdig ? ` (${DIGNITY_WORD[rdig]})` : "";
    out.push(`Its ruler ${ruler}${rdigw} sits in your ${ORD[rb.house]} house (${HOUSE_SUMMARY[rb.house].title}), tying these themes to that part of life.`);
  }

  return out;
}

interface NatalBody {
  planet: string;
  sign: string;
  degree: string;
  house: number;
  nakshatra: string | null;
  pada: number | null;
  longitude: string | null;
  isRetrograde: boolean | null;
}

function NatalChartGrid({ lagnaSign, natalBodies }: { lagnaSign: string | null; natalBodies: NatalBody[] }) {
  const lagnaIndex = ZODIAC_SIGNS.indexOf(lagnaSign ?? "Aries");
  const accent = useDayModeColor();
  const [selectedHouse, setSelectedHouse] = useState<number | null>(null);
  // The House Reader: which house the user asked to hear (tap-gated LLM, cached natal-stable).
  const [voicedHouse, setVoicedHouse] = useState<number | null>(null);
  const [canonOpen, setCanonOpen] = useState(false);
  const houseReadQ = trpc.narrative.houseRead.useQuery(
    { house: voicedHouse ?? 1 },
    { enabled: voicedHouse != null && voicedHouse === selectedHouse, staleTime: Infinity, retry: false },
  );
  const [hoveredHouse, setHoveredHouse] = useState<number | null>(null);

  const planetsByHouse = useMemo(() => {
    const map: Record<number, Array<{ planet: string; sign: string; isRetrograde: boolean }>> = {};
    for (const b of natalBodies) {
      if (!map[b.house]) map[b.house] = [];
      map[b.house].push({ planet: b.planet, sign: b.sign, isRetrograde: !!b.isRetrograde });
    }
    return map;
  }, [natalBodies]);

  const HEAD_GAP = 7.5;  // house label → sign (tight, since the label is small)
  const ROW_H = 9.5;     // sign → planet, planet → planet
  const GOLD_LINE = "rgba(168,130,52,0.7)";
  const HOUSE_LABEL = "#9A8557";
  const SIGN_FILL = "#2E2A20";
  const LAGNA_GOLD = "#A8801E";

  const sel = selectedHouse;
  const selSign = sel != null ? ZODIAC_SIGNS[(lagnaIndex + sel - 1 + 12) % 12] : null;
  const selPlanets = sel != null ? (planetsByHouse[sel] ?? []) : [];

  return (
    <div style={{ position: "relative" }}>
    <svg viewBox="0 0 300 300" style={{ width: "100%", aspectRatio: "1/1", display: "block", border: "1px solid rgba(168,130,52,0.55)", borderRadius: "0.75rem", boxShadow: "var(--parchment-shadow)" }}>
      {/* Shares the --parchment token with the calendar + wheel so the chart artifacts are cohesive
          (was a hardcoded #FEFCF7→#FBF6EA cream). Dark ink already reads on it. */}
      <rect width="300" height="300" style={{ fill: "var(--parchment)" }} />

      {CHART_HOUSES.map(({ house, points, cx, cy }) => {
        const sign = ZODIAC_SIGNS[(lagnaIndex + house - 1 + 12) % 12];
        const planets = planetsByHouse[house] ?? [];
        const isLagna = house === 1;

        // Vertically center the block (house label + sign + planets) on the cell.
        const span = HEAD_GAP + ROW_H * planets.length;
        const startY = cy - span / 2;

        return (
          <g
            key={house}
            onClick={() => setSelectedHouse(house)}
            onMouseEnter={() => setHoveredHouse(house)}
            onMouseLeave={() => setHoveredHouse((h) => (h === house ? null : h))}
            style={{ cursor: "pointer" }}
          >
            <polygon
              points={points}
              fill={selectedHouse === house ? "rgba(168,130,52,0.18)" : hoveredHouse === house ? "rgba(168,130,52,0.08)" : "transparent"}
              stroke={GOLD_LINE}
              strokeWidth="0.9"
              style={{ transition: "fill 150ms ease" }}
            />

            {/* House number label */}
            <text
              x={cx - 18} y={startY}
              fontSize="5.5"
              textAnchor="start"
              dominantBaseline="middle"
              fill={HOUSE_LABEL}
              fontWeight={500}
              letterSpacing="0.3"
              style={{ textTransform: "uppercase" }}
            >
              House {house}
            </text>

            {/* Sign name — slightly bolder than the house label */}
            <text
              x={cx - 18} y={startY + HEAD_GAP}
              fontSize={isLagna ? 7.5 : 6.5}
              textAnchor="start"
              dominantBaseline="middle"
              fill={SIGN_FILL}
              fontWeight={700}
            >
              {sign}
              {isLagna && <tspan dx="1.5" fontSize="5" fontWeight="700" fill={LAGNA_GOLD}>Lagna</tspan>}
            </text>

            {/* Planets */}
            {planets.map(({ planet, sign: pSign, isRetrograde }, i) => {
              const dignity = getPlanetDignity(planet, pSign);
              const dignityColor = dignity === "Exalt" ? "#1f9d57"
                : dignity === "Debil" ? "#cc3b2e"
                : dignity === "Own" ? "#357E85"
                : "#8C826C";
              return (
                <text
                  key={planet}
                  x={cx - 18}
                  y={startY + HEAD_GAP + ROW_H * (i + 1)}
                  fontSize="6.5"
                  textAnchor="start"
                  dominantBaseline="middle"
                  fontWeight="600"
                  letterSpacing="0.2"
                >
                  <tspan fill={PLANET_COLORS_PARCH[planet] ?? SIGN_FILL}>{planet.toUpperCase()}</tspan>
                  {isRetrograde && <tspan dx="1.5" fontSize="5" fill="#8C826C"> Rx</tspan>}
                  {dignity && <tspan dx="1.5" fontSize="5" fontWeight="700" fill={dignityColor}>{dignity}</tspan>}
                </text>
              );
            })}
          </g>
        );
      })}

    </svg>

      {/* House summary popup */}
      {sel != null && selSign && (
        <div
          onClick={() => setSelectedHouse(null)}
          style={{ position: "absolute", inset: 0, background: "rgba(30, 24, 16, 0.4)", borderRadius: "0.75rem", display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem", zIndex: 5 }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ width: "100%", maxWidth: 320, background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: "1rem", padding: "1.1rem 1.2rem", boxShadow: "0 12px 32px rgba(0,0,0,0.25)" }}
          >
            <div className="flex items-start justify-between">
              <div>
                <p style={{ fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: accent, margin: 0 }}>
                  House {sel} · {selSign}{sel === 1 ? " Lagna" : ""}
                </p>
                <p style={{ fontSize: "1.05rem", fontWeight: 700, color: "var(--heading-ink)", margin: "0.15rem 0 0" }}>
                  {HOUSE_SUMMARY[sel].title}
                </p>
              </div>
              <button
                onClick={() => setSelectedHouse(null)}
                aria-label="Close"
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-muted-foreground)", padding: 2, marginTop: 2 }}
              >
                <X size={16} />
              </button>
            </div>

            <div style={{ marginTop: "0.7rem" }}>
              <p style={{ fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: accent, margin: "0 0 0.45rem" }}>
                In your chart
              </p>
              <p style={{ fontSize: "0.85rem", lineHeight: 1.55, color: "var(--color-foreground)", margin: 0 }}>
                <GlossaryText>{composeHouseSynthesis(sel, selSign, selPlanets, natalBodies).join(" ")}</GlossaryText>
              </p>
            </div>

            {/* THE HOUSE READER — the stored research, voiced (David 2026-07-16). Fires
                only on tap; natal-stable + cached, so each house generates once. */}
            <div style={{ marginTop: "0.9rem", borderTop: "1px solid var(--color-border)", paddingTop: "0.75rem" }}>
              {voicedHouse !== sel ? (
                <button
                  onClick={() => setVoicedHouse(sel)}
                  className="w-full py-2 rounded-full text-[11px] font-bold uppercase"
                  style={{ letterSpacing: "0.1em", color: accent, border: `1px solid color-mix(in srgb, ${accent} 45%, transparent)`, background: "transparent" }}
                >
                  Read this room
                </button>
              ) : houseReadQ.isLoading ? (
                <VeleaLoader size={24} label="Listening to the room…" />
              ) : houseReadQ.data?.available && houseReadQ.data.read ? (
                <div>
                  <p style={{ fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: accent, margin: "0 0 0.45rem" }}>
                    The room, voiced
                  </p>
                  <p style={{ fontSize: "0.85rem", lineHeight: 1.6, color: "var(--color-foreground)", margin: 0, whiteSpace: "pre-wrap" }}>
                    {houseReadQ.data.read.read}
                  </p>
                  <p style={{ fontSize: "0.82rem", fontStyle: "italic", color: "var(--color-muted-foreground)", margin: "0.6rem 0 0" }}>
                    {houseReadQ.data.read.question}
                  </p>
                </div>
              ) : (
                <p style={{ fontSize: "0.82rem", fontStyle: "italic", color: "var(--color-muted-foreground)", margin: 0 }}>
                  The room is quiet right now — try again in a moment.
                </p>
              )}
            </div>

            {/* The canon brick, COLLAPSED (David: "so little and somehow loud") — one tap
                when curiosity asks; silence otherwise. */}
            <div style={{ marginTop: "0.9rem", borderTop: "1px solid var(--color-border)", paddingTop: "0.6rem" }}>
              <button onClick={() => setCanonOpen((v) => !v)} className="w-full flex items-center justify-between" style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                <span style={{ fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--color-muted-foreground)" }}>The house itself</span>
                <ChevronDown size={15} style={{ color: "var(--color-muted-foreground)", transform: canonOpen ? "rotate(180deg)" : "none", transition: "transform 200ms ease" }} />
              </button>
              {canonOpen && (
                <p style={{ fontSize: "0.82rem", lineHeight: 1.55, color: "var(--color-muted-foreground)", margin: "0.55rem 0 0" }}>
                  {HOUSE_SUMMARY[sel].summary}
                </p>
              )}
            </div>

            <div style={{ marginTop: "0.9rem", borderTop: "1px solid var(--color-border)", paddingTop: "0.75rem" }}>
              <p style={{ fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--color-muted-foreground)", margin: "0 0 0.45rem" }}>
                Planets here
              </p>
              {selPlanets.length === 0 ? (
                <p style={{ fontSize: "0.82rem", color: "var(--color-muted-foreground)", margin: 0 }}>No planets in this house.</p>
              ) : (
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
                  {selPlanets.map(({ planet, sign: pSign, isRetrograde }) => {
                    const dignity = getPlanetDignity(planet, pSign);
                    return (
                      <span key={planet} style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--color-foreground)", background: "var(--color-secondary)", borderRadius: "999px", padding: "0.2rem 0.6rem" }}>
                        <span style={{ color: PLANET_COLORS_PARCH[planet] ?? "var(--color-foreground)" }}>{planet}</span>
                        {isRetrograde && <span style={{ color: "var(--color-muted-foreground)" }}> Rx</span>}
                        {dignity && <span style={{ color: "var(--color-muted-foreground)" }}> · {dignity}</span>}
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Planet placements table ────────────────────────────────────────────────

function PlanetTable({ natalBodies }: { natalBodies: NatalBody[] }) {
  const modeColor = useDayModeColor();
  const sorted = [...natalBodies].sort((a, b) => {
    const order = ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn", "Rahu", "Ketu"];
    return order.indexOf(a.planet) - order.indexOf(b.planet);
  });

  // Shared column layout — header and rows must use the same template. Every
  // column is centered so content reads as an even rhythm across the full width.
  const COLS = "1.2fr 0.85fr 0.8fr 0.55fr 1.3fr 0.55fr";
  const headers = ["Planet", "Sign", "Degree", "House", "Nakshatra", "Pada"];

  // Rose-ochre is a Build-palette tone — only warm into it on Build days. Other
  // days stay in their own hue (gradient into a darker shade of the day color).
  const ROSE_OCHRE = "#BC886F";
  const isBuild = modeColor === MODE_SOLID.Build;
  const warmStop = isBuild ? ROSE_OCHRE : `color-mix(in srgb, ${modeColor} 62%, #000)`;
  const accentBorder = isBuild ? ROSE_OCHRE : modeColor;
  return (
    // Parchment chart artifact (David): the rows re-ink to dark on paper via .parchment; the mode-
    // gradient header stays a colored ledger band on top. Inline borderRadius keeps the 0.75rem frame.
    <div className="parchment" style={{ borderRadius: "0.75rem", overflow: "hidden", border: `1px solid ${accentBorder}` }}>
      {/* Header — day-mode tone warming into rose-ochre on Build days, or a
          deeper shade of the day's own color otherwise. */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: COLS,
          padding: "0.5rem 0.75rem",
          gap: "0.5rem",
          background: `linear-gradient(120deg, ${modeColor} 0%, ${warmStop} 100%)`,
        }}
      >
        {headers.map((label) => (
          <span key={label} style={{ fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "#FBF7ED", textAlign: "center" }}>
            {label}
          </span>
        ))}
      </div>

      {sorted.map((b, i) => (
        <div
          key={b.planet}
          style={{
            display: "grid",
            gridTemplateColumns: COLS,
            padding: "0.5rem 0.75rem",
            gap: "0.5rem",
            alignItems: "center",
            background: i % 2 === 1 ? `color-mix(in srgb, ${isBuild ? ROSE_OCHRE : modeColor} 9%, transparent)` : "transparent",
            borderBottom: i < sorted.length - 1 ? "1px solid var(--color-border)" : "none",
          }}
        >
          <span style={{ fontSize: "0.75rem", fontWeight: 600, textAlign: "center", color: PLANET_COLORS[b.planet] ?? "var(--color-foreground)" }}>
            {b.planet}{b.isRetrograde ? " Rx" : ""}
          </span>
          <span style={{ fontSize: "0.75rem", textAlign: "center", color: "var(--color-foreground)" }}>{b.sign}</span>
          <span style={{ fontSize: "0.72rem", textAlign: "center", color: "var(--color-muted-foreground)" }}>{b.degree != null && b.degree !== "" ? `${parseFloat(b.degree).toFixed(1)}°` : "—"}</span>
          <span style={{ fontSize: "0.75rem", textAlign: "center", color: "var(--color-muted-foreground)" }}>{b.house}</span>
          <span style={{ fontSize: "0.8rem", textAlign: "center", color: "var(--color-muted-foreground)" }}>{b.nakshatra ?? "—"}</span>
          <span style={{ fontSize: "0.8rem", textAlign: "center", color: "var(--color-muted-foreground)" }}>{b.pada ?? "—"}</span>
        </div>
      ))}
    </div>
  );
}

// ── What is a natal chart? ───────────────────────────────────────────────────
// New users who only know their Western sun sign will see "wrong" signs here
// (a Western Leo Sun is often Cancer in the sidereal zodiac). Explain what a
// natal chart is and how Vedic differs from Western so it reads as intentional.

const DIFF_ROWS: { feature: string; western: string; vedic: string }[] = [
  {
    feature: "Zodiac system",
    western: "Tropical — fixed to the seasons; starts at the spring equinox.",
    vedic: "Sidereal — tied to the physical, observable constellations.",
  },
  {
    feature: "Primary focus",
    western: "Psychology, personal growth, and behavioral traits.",
    vedic: "Karma, destiny, life path (Dharma), and the timing of events.",
  },
  {
    feature: "Key body",
    western: "The Sun — core identity and ego.",
    vedic: "The Moon — the mind, emotions, and inner perception.",
  },
  {
    feature: "Timing tools",
    western: "Transits and progressions — how the chart evolves over a lifetime.",
    vedic: "Dashas — planetary periods that predict when events occur.",
  },
];

// Collapsible "learn" card matching the Time Lord page's panel(): white card,
// rounded, with a mode-colored uppercase title + chevron. Used for the natal and
// dasha definition cards so they read as the same element family as that page.
// A small mode-colored link + ⓘ that opens the explainer in a centered pop-up — matches the
// "HOW PROFECTION WORKS ⓘ" affordance rather than a bordered collapsible card.
function ExplainerPanel({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const modeColor = useDayModeColor();
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1"
        style={{ background: "none", border: "none", cursor: "pointer", padding: "0.2rem 0", marginBottom: "0.75rem", color: modeColor, fontSize: "0.8rem", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase" as const, opacity: 0.82 }}
      >
        {title} <span aria-hidden style={{ fontSize: "0.85rem", opacity: 0.9 }}>ⓘ</span>
      </button>
      {open && createPortal(
        <div
          onClick={() => setOpen(false)}
          style={{ position: "fixed", inset: 0, zIndex: 90, background: "rgba(30, 24, 16, 0.6)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ width: "100%", maxWidth: 480, maxHeight: "85vh", display: "flex", flexDirection: "column", overflow: "hidden", background: "var(--color-card)", border: "1px solid var(--border)", borderRadius: 20 }}
          >
            <div style={{ flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, padding: "1rem 1.3rem", borderBottom: "1px solid var(--border)", background: "var(--color-card)" }}>
              <span style={{ fontSize: "0.8rem", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase" as const, color: modeColor }}>{title}</span>
              <button onClick={() => setOpen(false)} aria-label="Close" style={{ flexShrink: 0, width: 30, height: 30, borderRadius: 999, display: "flex", alignItems: "center", justifyContent: "center", background: `color-mix(in srgb, ${modeColor} 18%, transparent)`, border: `1px solid color-mix(in srgb, ${modeColor} 34%, transparent)`, color: modeColor, cursor: "pointer" }}>
                <X size={16} strokeWidth={2.5} />
              </button>
            </div>
            <div style={{ overflowY: "auto", padding: "1rem 1.3rem 1.3rem" }}>{children}</div>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}

function NatalExplainer() {
  return (
    <ExplainerPanel title="What is a natal chart?">
      <div className="space-y-3 text-[13px] leading-relaxed" style={{ color: "var(--color-muted-foreground)" }}>
        <p className="text-xs leading-relaxed" style={{ color: "var(--color-foreground)" }}>
          <strong>Velea uses the Vedic (sidereal) zodiac.</strong> A natal chart is a snapshot of
          the sky at the exact moment and place you were born — the map every reading is built
          from. Your signs may differ from the Western ones you know; a Western Leo Sun is often
          Cancer here. That's expected, not a mistake.
        </p>

        <p>
          Western and Vedic astrology read that same sky in different ways — they pin the zodiac to
          different reference points, so the same birth produces different signs.
        </p>

        <div>
                <p className="text-[12px] font-bold uppercase tracking-wider mb-1.5" style={{ color: "var(--color-foreground)" }}>
                  Core differences at a glance
                </p>
                <table className="w-full border-collapse" style={{ fontSize: "13px" }}>
                  <thead>
                    <tr>
                      <th className="text-left font-semibold py-1 pr-2 align-bottom" style={{ color: "var(--color-foreground)", width: "26%" }}></th>
                      <th className="text-left font-semibold py-1 pr-2 align-bottom" style={{ color: "var(--color-foreground)" }}>Western</th>
                      <th className="text-left font-semibold py-1 align-bottom" style={{ color: "var(--color-foreground)" }}>Vedic (Jyotish)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {DIFF_ROWS.map((r) => (
                      <tr key={r.feature} style={{ borderTop: "1px solid var(--color-border)" }}>
                        <td className="py-1.5 pr-2 align-top font-semibold" style={{ color: "var(--color-foreground)" }}>{r.feature}</td>
                        <td className="py-1.5 pr-2 align-top">{r.western}</td>
                        <td className="py-1.5 align-top">{r.vedic}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div>
                <p className="text-[12px] font-bold uppercase tracking-wider mb-1" style={{ color: "var(--color-foreground)" }}>
                  How deep each goes
                </p>
                <p>
                  <strong style={{ color: "var(--color-foreground)" }}>Western</strong> works mainly
                  from the birth chart (the wheel) to map psychological themes, relationships, and
                  motivations. <strong style={{ color: "var(--color-foreground)" }}>Vedic</strong> uses
                  that chart as a base but leans on <em>vargas</em> (divisional charts) to zoom into
                  specific areas like career or marriage, and on the 27 <em>nakshatras</em> (lunar
                  mansions) for precise readings.
                </p>
              </div>

              <div>
                <p className="text-[12px] font-bold uppercase tracking-wider mb-1" style={{ color: "var(--color-foreground)" }}>
                  How they differ in practice
                </p>
                <p>
                  Because the Earth slowly wobbles on its axis (an effect called <em>precession</em>),
                  the chart shifts back roughly <strong>23–24°</strong>. So a Western Aries usually
                  becomes a Vedic Pisces. Neither is "wrong" — they measure different things. Velea
                  tracks the real, observable stars.
                </p>
              </div>
      </div>
    </ExplainerPanel>
  );
}

// ── Natal section ──────────────────────────────────────────────────────────

// ── Dignity & strength ──────────────────────────────────────────────────────
// Reads server-computed natal dignity WITH neecha-bhanga cancellation. The whole point:
// a debilitated-but-cancelled planet (David's Moon) is NOT flatly weak — it's the
// fall-then-rise, "hard-won strength", carried in the DAY color, never the debil-red.
function describeDignity(d: any, modeColor: string): { label: string; flavor: string; color: string } {
  if (d.state === "exalted") return { label: "Exalted", flavor: "at full power, in its highest sign", color: "#1f9d57" };
  if (d.state === "moolatrikona") return { label: "Moolatrikona", flavor: "in its seat of strength", color: "#357E85" };
  if (d.state === "own") return { label: "Own sign", flavor: "dignified, at home", color: "#357E85" };
  if (d.state === "debilitated") {
    if (d.neechaBhanga?.cancelled)
      return { label: "Debilitated — but cancelled (neecha bhanga)", flavor: `hard-won strength: it fell, and rose (${d.neechaBhanga.reasons.join("; ")})`, color: modeColor };
    return { label: "Debilitated", flavor: "weakened in its fall — needs support", color: "#cc3b2e" };
  }
  return { label: d.state, flavor: "", color: "var(--color-foreground)" };
}

function DignityReadout() {
  const { data } = trpc.crown.dignities.useQuery(undefined, { retry: false });
  const modeColor = useDayModeColor();
  if (!data) return null;
  const order = ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn"];
  const notable = order.map((p) => (data as any)[p]).filter((d) => d && d.state !== "neutral");
  if (!notable.length) return null;
  return (
    <div style={{ borderRadius: "0.75rem", border: "1px solid var(--color-border)", padding: "0.75rem 0.9rem" }}>
      <div style={{ fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--color-muted-foreground)", marginBottom: "0.55rem" }}>
        Dignity &amp; strength
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.55rem" }}>
        {notable.map((d: any) => {
          const { label, flavor, color } = describeDignity(d, modeColor);
          return (
            <div key={d.planet} style={{ display: "flex", gap: "0.55rem", alignItems: "baseline" }}>
              <span style={{ fontSize: "0.8rem", fontWeight: 700, minWidth: "3.4rem", color: (PLANET_COLORS as any)[d.planet] ?? "var(--color-foreground)" }}>{d.planet}</span>
              <span style={{ fontSize: "0.78rem", lineHeight: 1.4 }}>
                <span style={{ fontWeight: 600, color }}><GlossaryText>{label}</GlossaryText></span>
                {flavor && <span style={{ color: "var(--color-muted-foreground)" }}> — <GlossaryText>{flavor}</GlossaryText></span>}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function NatalSection() {
  const { data: subject, isLoading, error } = trpc.profiles.getSubject.useQuery();
  const dayLabelColor = useDayModeColor();

  if (isLoading) {
    return (
      <div className="space-y-3 pb-24">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-16 rounded-xl animate-pulse" style={{ background: "var(--color-secondary)" }} />
        ))}
      </div>
    );
  }

  if (error || !subject) {
    return (
      <div className="rounded-xl p-6 text-center" style={{ border: "1px solid var(--color-border)" }}>
        <p className="text-sm" style={{ color: "var(--color-muted-foreground)" }}>
          No birth chart data. Add a profile with birth details to view your natal chart.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-24">
      {/* Subject header — the person and their birth data, the anchor of the page */}
      <div>
        <AtlasDoor />
        <h2 className="text-2xl font-bold tracking-tight" style={{ color: "var(--heading-ink)", fontFamily: "var(--font-serif)" }}>
          {subject.name}
        </h2>
        <p className="text-sm mt-1" style={{ color: "var(--color-muted-foreground)" }}>
          {formatBirthDateLong(subject.birthDate)}
          {subject.birthTime ? ` · ${formatBirthTime(subject.birthTime)}` : ""}
          {subject.birthLocationCity ? ` · ${subject.birthLocationCity}` : ""}
        </p>
        {subject.lagnaSign && (
          <p className="text-xs font-semibold uppercase tracking-wider mt-1.5" style={{ color: dayLabelColor }}>
            {subject.lagnaSign} {subject.moonFramed ? "Chandra Lagna" : "Lagna"}
            {subject.moonFramed ? (
              <span style={{ opacity: 0.7, fontWeight: 600 }}> · Moon-framed · no birth time</span>
            ) : (subject as any).approxTime ? (
              <span style={{ opacity: 0.7, fontWeight: 600 }}> · approx</span>
            ) : null}
          </p>
        )}
      </div>

      {/* What is a natal chart? — Vedic vs. Western heads-up */}
      <NatalExplainer />

      {/* Chart grid */}
      <div data-tour="natal-chart">
        <NatalChartGrid lagnaSign={subject.lagnaSign} natalBodies={subject.natalBodies} />
      </div>

      {/* Planet table */}
      <PlanetTable natalBodies={subject.natalBodies} />

      {/* Dignity & strength — with neecha-bhanga cancellation (a cancelled fall reads as hard-won,
          not weak). Renders only the notable placements. */}
      <DignityReadout />
    </div>
  );
}

// ── Dasha section ──────────────────────────────────────────────────────────

function groupByMahadasha(data: any[]) {
  const groups: { mahadasha: string; periods: any[] }[] = [];
  let current: { mahadasha: string; periods: any[] } | null = null;
  for (const d of data) {
    if (!current || current.mahadasha !== d.mahadasha) {
      current = { mahadasha: d.mahadasha, periods: [] };
      groups.push(current);
    }
    current.periods.push(d);
  }
  return groups;
}

function formatDate(dateStr: string) {
  const [y, m, d] = dateStr.split("-");
  return `${m}/${d}/${y}`;
}

const MONTHS_LONG = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

// "1982-04-13" → "April 13, 1982"
function formatBirthDateLong(dateStr: string) {
  const [y, m, d] = dateStr.split("-").map(Number);
  if (!y || !m || !d) return dateStr;
  return `${MONTHS_LONG[m - 1]} ${d}, ${y}`;
}

// "17:20" → "5:20 PM"
function formatBirthTime(timeStr: string) {
  const [h, mi] = timeStr.split(":").map(Number);
  if (Number.isNaN(h)) return timeStr;
  const period = h >= 12 ? "PM" : "AM";
  const hh = h % 12 || 12;
  return `${hh}:${String(mi ?? 0).padStart(2, "0")} ${period}`;
}

// ── What are Dashas? ─────────────────────────────────────────────────────────
// The dasha-page heads-up, mirroring NatalExplainer: a one-line definition that
// opens into an accurate Vimshottari explanation.

const DASHA_LORDS: { lord: string; years: number }[] = [
  { lord: "Ketu", years: 7 },
  { lord: "Venus", years: 20 },
  { lord: "Sun", years: 6 },
  { lord: "Moon", years: 10 },
  { lord: "Mars", years: 7 },
  { lord: "Rahu", years: 18 },
  { lord: "Jupiter", years: 16 },
  { lord: "Saturn", years: 19 },
  { lord: "Mercury", years: 17 },
];

function DashaExplainer() {
  return (
    <ExplainerPanel title="What are Dashas?">
      <div className="space-y-3 text-[13px] leading-relaxed" style={{ color: "var(--color-muted-foreground)" }}>
        <p className="text-xs leading-relaxed" style={{ color: "var(--color-foreground)" }}>
          <strong>Dashas are planetary periods</strong> — the Vedic timing system that says which
          planet is running your life right now, and for how long. This is your karmic schedule
          this lifetime: the order and timing were fixed at your birth.
        </p>

        <p>
          Where a Western chart describes who you are, dashas describe <em>when</em>. Velea uses the{" "}
          <strong>Vimshottari</strong> system — a 120-year cycle split into nine planetary periods
          called <strong>Mahadashas</strong>. Each is ruled by one planet and runs for a fixed
          length, always in the same order.
        </p>

        <div>
                <p className="text-[12px] font-bold uppercase tracking-wider mb-1.5" style={{ color: "var(--color-foreground)" }}>
                  The nine periods (120 years)
                </p>
                <div className="grid grid-cols-3 gap-x-3 gap-y-1">
                  {DASHA_LORDS.map(({ lord, years }) => (
                    <div key={lord} className="flex items-baseline justify-between gap-1">
                      <span style={{ color: "var(--color-foreground)", fontWeight: 600 }}>{lord}</span>
                      <span>{years} yrs</span>
                    </div>
                  ))}
                </div>
              </div>

              <p>
                Your starting point is set by the <strong>Moon's nakshatra</strong> at birth — which is
                why the cycle keys off the Moon, the seat of the mind. From there the planets run in
                sequence for the rest of your life.
              </p>

              <p>
                Each Mahadasha is subdivided into <strong>Antardashas</strong> (sub-periods) in the same
                planetary order, so at any moment a major and a minor lord color the time together. The
                planet whose period is running activates its themes, the houses it rules, and its
                condition in your chart — bringing those karmas to the surface to be lived out.
              </p>
      </div>
    </ExplainerPanel>
  );
}

export function DashaSection() {
  const [expandedMaha, setExpandedMaha] = useState<string | null>(null);
  // The Chapter Reader: which lord's chapter the user asked to hear (tap-gated, cached).
  const [readLord, setReadLord] = useState<string | null>(null);
  const dashaReadQ = trpc.narrative.dashaRead.useQuery(
    { lord: readLord ?? "" },
    { enabled: !!readLord, staleTime: Infinity, retry: false },
  );
  const didAutoOpen = useRef(false);
  const dayLabelColor = useDayModeColor();

  const { data, isLoading, error } = trpc.dasha.timeline.useQuery(undefined, { retry: false });

  // The current dasha opens by default on first visit, and stays open until the user
  // minimizes it (the auto-open fires once).
  const currentMahaForInit = data?.entries?.find((d: any) => d.isCurrent)?.mahadasha ?? null;
  useEffect(() => {
    if (currentMahaForInit && !didAutoOpen.current) {
      didAutoOpen.current = true;
      setExpandedMaha(currentMahaForInit);
    }
  }, [currentMahaForInit]);

  if (isLoading) {
    return (
      <div className="space-y-2 pb-24">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-16 rounded-xl animate-pulse" style={{ background: "var(--color-secondary)" }} />
        ))}
      </div>
    );
  }

  if (error || !data) {
    const msg = error?.message ?? "Unable to load dasha timeline.";
    return (
      <div className="rounded-xl p-6 text-center" style={{ border: `1.5px solid ${dayLabelColor}`, background: `color-mix(in srgb, ${dayLabelColor} 10%, var(--background))` }}>
        <p className="text-sm" style={{ color: "var(--color-foreground)" }}>{msg}</p>
      </div>
    );
  }

  const groups = groupByMahadasha(data.entries);
  const currentPeriod = data.entries.find((d: any) => d.isCurrent);
  const currentMaha = currentPeriod?.mahadasha ?? null;

  return (
    <div className="space-y-3 pb-24" data-tour="dasha">
      <DashaExplainer />

      {currentPeriod && (() => {
        // Immersive gradient card matching the Today page's Time Lord Movement card,
        // tinted with the active mahadasha's planet color.
        const activeColor = PLANET_COLORS[currentPeriod.mahadasha] ?? "var(--color-muted-foreground)";
        // Text color follows the planet's luminance — Saturn's dark banner takes white,
        // the Sun's bright one takes ink. (Hardcoded dark text was the old clarity bug.)
        const t = autoTextColors(activeColor);
        const isOpen = expandedMaha === currentMaha;
        return (
          <div className="overflow-hidden" style={{ borderRadius: "var(--radius-card)", background: planetGradient(activeColor), border: `4px solid ${activeColor}`, boxShadow: `0 0 20px ${activeColor}44` }}>
            <button
              className="w-full flex items-center justify-between px-4 py-3"
              onClick={() => setExpandedMaha(isOpen ? null : currentMaha)}
            >
              <span className="flex items-center gap-2.5">
                <span
                  className="dasha-active-glyph flex-shrink-0 leading-none"
                  style={{ ["--glow-color" as any]: activeColor, color: t.primary, fontSize: "1.4rem" }}
                >
                  {PLANET_SYMBOLS[currentPeriod.mahadasha] ?? "●"}
                </span>
                <span style={{ fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: t.muted }}>
                  Active Period
                </span>
              </span>
              <ChevronDown size={14} style={{ color: t.muted, transform: isOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 200ms ease" }} />
            </button>
            <div className="px-5 pb-5">
              <p className="text-base" style={{ color: t.primary, fontWeight: 700 }}>{currentPeriod.mahadasha} / {currentPeriod.antardasha}</p>
              <p className="text-xs mt-0.5" style={{ color: t.muted }}>
                Started {formatDate(currentPeriod.startDate)} · {currentPeriod.duration}
              </p>
            </div>
          </div>
        );
      })()}

      <div className="space-y-2">
        {groups.map((g) => {
          const color = PLANET_COLORS[g.mahadasha] ?? "var(--color-muted-foreground)";
          const isExpanded = expandedMaha === g.mahadasha;
          const hasActive = g.periods.some((p: any) => p.isCurrent);
          const dur = MAHADASHA_DURATIONS[g.mahadasha] ?? 10;

          // Active card gets dark text (stands out); all others use white.
          // Tonal (the Today law): the parchment card takes a DEEP register of its own
          // planet color; chrome cards take the auto ramp — never flat black/white.
          const deepOf = (p: number) => `color-mix(in srgb, color-mix(in srgb, ${color} 42%, #2A1F14) ${p}%, transparent)`;
          const t = hasActive
            ? { primary: deepOf(100), muted: deepOf(74), faint: deepOf(58), chip: deepOf(13), chipBorder: deepOf(30) }
            : planetTextColors(color);
          return (
            <div key={g.mahadasha} className={`rounded-xl overflow-hidden${hasActive ? " parchment" : ""}`}
              // The active Mahadasha — your current era — is the parchment page; its current
              // sub-period (below) glows its own planet color on the paper (David). Others stay chrome.
              style={{ border: hasActive ? `1px solid var(--color-border)` : `1px solid ${color}99`, boxShadow: hasActive ? "var(--parchment-shadow)" : "none" }}
            >
              <button
                className="w-full flex items-center gap-3 px-4 py-4 text-left"
                style={{ background: hasActive ? "transparent" : planetGradient(color) }}
                onClick={() => setExpandedMaha(isExpanded ? null : g.mahadasha)}
              >
                <span className="flex-shrink-0 leading-none"
                  style={{ fontSize: "1.1rem", color: t.primary }}>
                  {PLANET_SYMBOLS[g.mahadasha] ?? "●"}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold" style={{ color: t.primary }}>{g.mahadasha} Mahadasha</span>
                    <span className="text-xs" style={{ color: t.muted }}>{dur} yrs</span>
                    {hasActive && (
                      <span className="text-xs px-2 py-0.5 rounded-full"
                        style={{ background: t.chip, color: t.primary, border: `1px solid ${t.chipBorder}` }}>
                        ◉ Active
                      </span>
                    )}
                  </div>
                  <div className="text-xs mt-0.5" style={{ color: t.faint }}>
                    {formatDate(g.periods[0].startDate)} · {g.periods.length} sub-periods
                  </div>
                </div>
                <span style={{ color: t.muted, fontSize: "0.8rem" }}>{isExpanded ? "▲" : "▼"}</span>
              </button>

              {isExpanded && (
                <div style={{ background: "var(--color-card)", borderTop: `1px solid ${color}55` }}>
                  {/* THE CHAPTER READER — the lord's dossier, voiced (tap-gated, cached). */}
                  <div style={{ padding: "0.8rem 1rem 0.2rem" }}>
                    {readLord !== g.mahadasha ? (
                      <button
                        onClick={() => setReadLord(g.mahadasha)}
                        className="w-full py-2 rounded-full text-[11px] font-bold uppercase"
                        style={{ letterSpacing: "0.1em", color, border: `1px solid ${color}66`, background: "transparent" }}
                      >
                        Read the {g.mahadasha} chapter
                      </button>
                    ) : dashaReadQ.isLoading ? (
                      <VeleaLoader size={24} label="Opening the chapter…" />
                    ) : dashaReadQ.data?.available && dashaReadQ.data.read ? (
                      <div>
                        <p style={{ fontSize: "0.85rem", lineHeight: 1.6, color: "var(--color-foreground)", margin: 0, whiteSpace: "pre-wrap" }}>
                          {dashaReadQ.data.read.read}
                        </p>
                        <p style={{ fontSize: "0.82rem", fontStyle: "italic", color: "var(--color-muted-foreground)", margin: "0.55rem 0 0.3rem" }}>
                          {dashaReadQ.data.read.question}
                        </p>
                      </div>
                    ) : (
                      <p style={{ fontSize: "0.82rem", fontStyle: "italic", color: "var(--color-muted-foreground)", margin: 0 }}>
                        The chapter is quiet right now — try again in a moment.
                      </p>
                    )}
                  </div>
                  {g.periods.map((period: any, i: number) => {
                    const antColor = PLANET_COLORS[period.antardasha] ?? "var(--color-muted-foreground)";
                    const isCurrent = !!period.isCurrent;
                    return (
                      <div
                        key={`${period.antardasha}-${i}`}
                        className="px-4 py-3"
                        // On the parchment page, the current sub-period (Saturn now) GLOWS its own
                        // planet color — a soft wash, a solid left tab, and a colored halo (David).
                        style={
                          isCurrent
                            ? { background: `${antColor}1C`, borderLeft: `4px solid ${antColor}`, borderRadius: 10, margin: "0.4rem 0.5rem", boxShadow: `0 0 18px ${antColor}55` }
                            : { borderBottom: i < g.periods.length - 1 ? "1px solid var(--color-border)" : "none", borderLeft: "3px solid transparent" }
                        }
                      >
                        <div className="flex items-center gap-3">
                          <span className="flex-shrink-0 leading-none text-center" style={{ fontSize: "0.95rem", color: antColor, width: "1rem" }}>
                            {PLANET_SYMBOLS[period.antardasha] ?? "●"}
                          </span>
                          <span className="text-sm flex-shrink-0"
                            style={{ color: isCurrent ? antColor : "var(--color-muted-foreground)", fontWeight: isCurrent ? 600 : 400, minWidth: "80px" }}>
                            {period.antardasha}
                          </span>
                          {isCurrent && (
                            <span className="text-xs px-2 py-0.5 rounded-full flex-shrink-0 font-semibold"
                              style={{ background: antColor, color: autoTextColors(antColor).primary, border: `1px solid ${antColor}` }}>
                              NOW
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-1 pl-5 flex-wrap">
                          <span className="text-xs" style={{ color: "var(--color-muted-foreground)" }}>{formatDate(period.startDate)}</span>
                          <span className="text-xs" style={{ color: "var(--color-muted-foreground)" }}>· {period.duration}</span>
                          <span className="text-xs" style={{ color: "var(--color-muted-foreground)" }}>· {period.startAge}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Profection section ─────────────────────────────────────────────────────

function ProfectionSection() {
  const modeColor = useDayModeColor();
  const [focusOpen, setFocusOpen] = useState(true);
  const [growthOpen, setGrowthOpen] = useState(false);
  const [frictionOpen, setFrictionOpen] = useState(false);
  const [chainOpen, setChainOpen] = useState(false);
  const [transitsOpen, setTransitsOpen] = useState(false);
  const [quickRefOpen, setQuickRefOpen] = useState(false);
  const [tlOpen, setTlOpen] = useState(false);
  const [expandedTransitId, setExpandedTransitId] = useState<number | null>(null);

  const { data: profectionData, error: profectionError } = trpc.profection.current.useQuery();
  const { data: transitsData, error: transitsError, isLoading: transitsLoading } = trpc.profection.timeLordTransits.useQuery(undefined, { enabled: transitsOpen });
  const { data: todayPanchang } = trpc.panchang.today.useQuery();

  const todayMode = todayPanchang?.mode;
  const taskMode: TaskMode | undefined = todayMode ? PANCHANG_TO_TASK_MODE[todayMode as keyof typeof PANCHANG_TO_TASK_MODE] : undefined;
  const tlGradient = taskMode === "Action" ? "var(--velea-action-gradient)"
    : taskMode === "Build" ? "var(--velea-build-gradient)"
    : taskMode === "Selective" ? "var(--velea-selective-gradient)"
    : taskMode === "Restraint" ? "var(--velea-restraint-gradient)"
    : "var(--card)";
  // Darker gradient for the short accordion cards so white text stays legible.
  const cardGradient = taskMode === "Action" ? "var(--velea-action-card-gradient)"
    : taskMode === "Build" ? "var(--velea-build-card-gradient)"
    : taskMode === "Selective" ? "var(--velea-selective-card-gradient)"
    : taskMode === "Restraint" ? "var(--velea-restraint-card-gradient)"
    : "var(--card)";
  const accentColor = taskMode ? MODE_OKLCH[taskMode] : "var(--color-border)";
  const darkColor = taskMode ? MODE_DARK[taskMode] : undefined;
  const todayDateStr = useMemo(() => new Date().toISOString().split("T")[0], []);
  const TEXT_PRIMARY = "var(--foreground)";
  const TEXT_MUTED = "var(--muted-foreground)";
  // Light text for use on the immersive gradient cards
  const LIGHT_PRIMARY = "#FDFDFD";
  const LIGHT_MUTED = "rgba(255,255,255,0.94)";

  // Immersive gradient accordion card — same style as Current Time Lord Movement
  const gradientCard = (
    title: string,
    open: boolean,
    setOpen: (v: boolean) => void,
    content: React.ReactNode,
    subtitle?: React.ReactNode,
    bg: string = cardGradient,
  ) => (
    <div className="overflow-hidden" style={{ borderRadius: "var(--radius-card)", background: bg }}>
      <button className="w-full flex items-center justify-between px-4 py-3" onClick={() => setOpen(!open)}>
        <span style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: "0.15rem", textAlign: "left" }}>
          <span style={{ fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(255,255,255,0.96)" }}>
            {title}
          </span>
          {subtitle && (
            <span style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.55)" }}>{subtitle}</span>
          )}
        </span>
        <ChevronDown size={14} style={{ color: "rgba(255,255,255,0.6)", transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 200ms ease", flexShrink: 0 }} />
      </button>
      {open && <div className="px-5 pb-5">{content}</div>}
    </div>
  );

  if (profectionError) {
    return <p className="text-sm" style={{ color: TEXT_MUTED }}>Error: {profectionError.message}</p>;
  }
  if (!profectionData) {
    return <p className="text-sm" style={{ color: TEXT_MUTED }}>Please set your birth date and lagna sign in settings.</p>;
  }

  const prof = profectionData.profection;
  const { age, activatedHouse, activatedSign, timeLord, yearStart, yearEnd, lagnaSign } = prof;

  return (
    <div className="space-y-4 pb-24" data-tour="profection">
      <p className="text-xs" style={{ color: TEXT_MUTED }}>
        {lagnaSign} Lagna · Age {age} · {yearStart} to {yearEnd}
      </p>

      {/* Current Annual Focus — combined with Yearly Focus, immersive gradient */}
      {gradientCard("Current Annual Focus", focusOpen, setFocusOpen,
        <>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1.25rem" }}>
            {[
              { label: "Activated House", value: activatedHouse },
              { label: "Activated Sign", value: activatedSign },
              { label: "Time Lord", value: timeLord },
              { label: "Age", value: age },
            ].map(({ label, value }) => (
              <div key={label}>
                <p style={{ color: LIGHT_MUTED, fontSize: "0.75rem", marginBottom: "0.25rem" }}>{label}</p>
                <p style={{ color: LIGHT_PRIMARY, fontSize: "1.125rem", fontWeight: 700 }}>{value}</p>
              </div>
            ))}
          </div>
          <p style={{ color: LIGHT_MUTED, fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: "0.4rem" }}>Yearly Focus</p>
          <p style={{ color: LIGHT_PRIMARY, fontSize: "0.875rem", margin: 0, lineHeight: 1.6, fontWeight: 500 }}><GlossaryText>{profectionData.interpretation.section5}</GlossaryText></p>
        </>,
        undefined,
        tlGradient,
      )}

      {/* What Supports Growth — immersive gradient */}
      {gradientCard("What Supports Growth", growthOpen, setGrowthOpen,
        <p style={{ color: LIGHT_PRIMARY, fontSize: "0.875rem", margin: 0, lineHeight: 1.6, whiteSpace: "pre-wrap", fontWeight: 500 }}><GlossaryText>{profectionData.interpretation.section6}</GlossaryText></p>
      )}

      {/* What Creates Friction — immersive gradient */}
      {gradientCard("What Creates Friction", frictionOpen, setFrictionOpen,
        <p style={{ color: LIGHT_PRIMARY, fontSize: "0.875rem", margin: 0, lineHeight: 1.6, whiteSpace: "pre-wrap", fontWeight: 500 }}><GlossaryText>{profectionData.interpretation.section7}</GlossaryText></p>
      )}

      {/* Current Time Lord Movement — immersive gradient */}
      <div data-tour="time-lord-transits" className="overflow-hidden" style={{ borderRadius: "var(--radius-card)", background: tlGradient }}>
        <button className="w-full flex items-center justify-between px-4 py-3" onClick={() => setTlOpen((v) => !v)}>
          <span style={{ fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(255,255,255,0.96)" }}>
            Current Time Lord Movement
          </span>
          <ChevronDown size={14} style={{ color: "rgba(255,255,255,0.6)", transform: tlOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 200ms ease" }} />
        </button>
        {tlOpen && (
          <div className="px-5 pb-5">
            <TimeLordMovement selectedDate={todayDateStr} variant="immersive" accentColor={accentColor} darkColor={darkColor} />
          </div>
        )}
      </div>

      {/* Operational Chain — immersive gradient */}
      {gradientCard("Operational Chain", chainOpen, setChainOpen,
        <p style={{ color: LIGHT_PRIMARY, fontSize: "0.875rem", margin: 0, lineHeight: 1.8, whiteSpace: "pre-wrap", fontWeight: 500 }}>
          {profectionData.interpretation.operationalChain || "Operational chain unavailable."}
        </p>
      )}

      {/* Time Lord Movement transit accordion — immersive gradient */}
      {gradientCard("Time Lord Movement", transitsOpen, setTransitsOpen,
        transitsError ? (
          <p style={{ color: LIGHT_MUTED, fontSize: "0.875rem" }}>Error: {transitsError.message}</p>
        ) : transitsData?.transits && transitsData.transits.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {transitsData.transits.map((transit: any, idx: number) => {
              const isExpanded = expandedTransitId === idx;
              const today = new Date().toISOString().split("T")[0];
              const isCurrent = transit.startDate <= today && today <= transit.endDate;
              return (
                <div key={idx} style={{ border: `1.5px solid ${isCurrent ? "rgba(255,255,255,0.55)" : "rgba(255,255,255,0.2)"}`, borderRadius: "0.5rem", overflow: "hidden", background: isCurrent ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.06)" }}>
                  <button onClick={() => setExpandedTransitId(isExpanded ? null : idx)}
                    style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.75rem 1rem", background: "transparent", border: "none", cursor: "pointer", fontSize: "0.875rem" }}>
                    <p style={{ margin: 0, fontWeight: isCurrent ? 700 : 600, color: isCurrent ? "#FDFDFD" : LIGHT_PRIMARY }}>
                      {transit.startDate} – {transit.endDate} — {transit.sign} H{transit.house}
                    </p>
                    <ChevronDown size={16} style={{ color: isCurrent ? "#FDFDFD" : LIGHT_MUTED, transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 200ms ease-out", flexShrink: 0, marginLeft: "0.5rem" }} />
                  </button>
                  {isExpanded && (
                    <div style={{ padding: "1rem", borderTop: "1px solid rgba(255,255,255,0.2)" }}>
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", fontSize: "0.875rem" }}>
                        {[
                          { label: "Motion", value: transit.isRetrograde ? "Retrograde" : "Direct" },
                          { label: "Co-present", value: transit.coPresentPlanets ? JSON.parse(transit.coPresentPlanets).join(", ") : "None" },
                          { label: "Rahu/Ketu", value: transit.rahuKetuPresence || "None" },
                          { label: "Combustion", value: transit.combustionStatus ? "Yes" : "No" },
                          { label: "Conjunctions", value: transit.closeConjunctions ? JSON.parse(transit.closeConjunctions).join(", ") : "None" },
                          { label: "Solitary", value: transit.solitaryStatus ? "Yes" : "No" },
                        ].map(({ label, value }) => (
                          <div key={label} style={{ display: "flex", justifyContent: "space-between" }}>
                            <span style={{ color: LIGHT_MUTED }}>{label}:</span>
                            <span style={{ color: LIGHT_PRIMARY, fontWeight: 600 }}>{value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : transitsLoading ? (
          <p style={{ color: LIGHT_MUTED, fontSize: "0.875rem" }}>Loading...</p>
        ) : (
          <p style={{ color: LIGHT_MUTED, fontSize: "0.875rem" }}>No transit data available</p>
        ),
        `${timeLord} transit periods`
      )}

      {/* Quick Reference — immersive gradient */}
      {gradientCard("Quick Reference", quickRefOpen, setQuickRefOpen,
        <p style={{ color: LIGHT_PRIMARY, fontSize: "0.875rem", margin: 0, lineHeight: 1.6, whiteSpace: "pre-wrap", fontWeight: 500 }}>
{`• Age ${age}: House ${activatedHouse} (${activatedSign}) activated by ${timeLord}
• Period: ${new Date(yearStart + "T12:00:00").toLocaleDateString()} – ${new Date(yearEnd + "T12:00:00").toLocaleDateString()}
• Core Work: Integrate ${activatedSign} qualities into this life area
• Key Focus: ${profectionData.interpretation.section5.split(".")[0]}.`}
        </p>
      )}
    </div>
  );
}

// ── Tab bar ────────────────────────────────────────────────────────────────

type Tab = "natal" | "profection" | "dasha";

const TABS: { id: Tab; label: string }[] = [
  { id: "natal", label: "Natal Chart" },
  { id: "profection", label: "Profection" },
  { id: "dasha", label: "Dasha" },
];

// ── Page ───────────────────────────────────────────────────────────────────

export default function Astrology() {
  const [tab, setTab] = useState<Tab>("natal");
  const modeColor = useDayModeColor();

  // The guided tour drives the active tab as it walks through the chart.
  useEffect(() => {
    const onTab = (e: Event) => {
      const next = (e as CustomEvent).detail as Tab;
      if (next === "natal" || next === "profection" || next === "dasha") setTab(next);
    };
    window.addEventListener("velea-tour-tab", onTab);
    return () => window.removeEventListener("velea-tour-tab", onTab);
  }, []);

  return (
    <div className="min-h-screen">
      <div className="container py-6 space-y-5">
        <AppHeader pageTitle="Your Charts" />

        {/* Tab bar — active tab tinted with the current day mode color */}
        <div
          className="flex gap-1 p-1 rounded-xl"
          style={{ background: `color-mix(in srgb, ${modeColor} 10%, var(--color-card))`, border: "1px solid var(--color-border)" }}
        >
          {TABS.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className="flex-1 rounded-lg py-2 text-xs font-semibold transition-all duration-200"
              style={{
                background: tab === id ? `color-mix(in srgb, ${modeColor} 15%, var(--color-card))` : "transparent",
                color: tab === id ? modeColor : "var(--color-muted-foreground)",
                border: tab === id ? `1px solid ${modeColor}` : "1px solid transparent",
              }}
              onMouseEnter={(e) => {
                if (tab === id) return;
                e.currentTarget.style.background = `color-mix(in srgb, ${modeColor} 8%, transparent)`;
                e.currentTarget.style.color = modeColor;
                e.currentTarget.style.borderColor = `color-mix(in srgb, ${modeColor} 40%, transparent)`;
              }}
              onMouseLeave={(e) => {
                if (tab === id) return;
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.color = "var(--color-muted-foreground)";
                e.currentTarget.style.borderColor = "transparent";
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === "natal" && <NatalSection />}
        {tab === "profection" && <ProfectionSection />}
        {tab === "dasha" && <DashaSection />}
      </div>
    </div>
  );
}


/** The doorway to the Life Atlas — shown only to the entitled (flag-gated). */
function AtlasDoor() {
  const [, navigate] = useLocation();
  const { data: mine } = trpc.features.mine.useQuery(undefined, { staleTime: 60_000 });
  if (mine?.lifeAtlas !== true) return null;
  return (
    <button onClick={() => navigate("/atlas")} className="w-full mb-4 flex items-center justify-between px-4 py-3 rounded-xl" style={{ border: "1px solid color-mix(in srgb, var(--day-accent) 45%, transparent)", background: "color-mix(in srgb, var(--day-accent) 7%, var(--color-card))" }}>
      <span className="text-sm font-bold flex items-center gap-2" style={{ color: "var(--heading-ink)" }}><OctagramMark size={15} color="var(--brand-gold)" strokeWidth={1.2} /> The Life Atlas</span>
      <span className="text-xs font-bold uppercase" style={{ letterSpacing: "0.08em", color: "var(--day-accent)" }}>open ›</span>
    </button>
  );
}
