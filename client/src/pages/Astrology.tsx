import { useState, useMemo, useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { ChevronDown, Info } from "lucide-react";
import AppHeader from "@/components/AppHeader";
import { ModeCard } from "@/components/ModeCard";
import { TimeLordMovement } from "@/components/TimeLordMovement";
import { useDayModeColor } from "@/hooks/useDayModeColor";
import { PANCHANG_TO_TASK_MODE, MODE_OKLCH, MODE_DARK, MODE_SOLID, type TaskMode } from "@shared/types";

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

/** Auto-pick dark vs white text for legibility on a given planet color. */
function planetTextColors(hex: string) {
  return luminance(hex) > 150
    ? { primary: "rgba(0,0,0,0.85)", muted: "rgba(0,0,0,0.6)", faint: "rgba(0,0,0,0.5)", chip: "rgba(0,0,0,0.16)", chipBorder: "rgba(0,0,0,0.3)" }
    : { primary: "rgba(255,255,255,0.95)", muted: "rgba(255,255,255,0.7)", faint: "rgba(255,255,255,0.6)", chip: "rgba(255,255,255,0.2)", chipBorder: "rgba(255,255,255,0.4)" };
}

/** Subtle ±12% vertical gradient so cards read as one family with gentle depth. */
function planetGradient(hex: string): string {
  return `linear-gradient(180deg, color-mix(in srgb, ${hex} 88%, #fff) 0%, ${hex} 50%, color-mix(in srgb, ${hex} 88%, #000) 100%)`;
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

  return (
    <svg viewBox="0 0 300 300" style={{ width: "100%", aspectRatio: "1/1", display: "block", border: "1px solid rgba(168,130,52,0.55)", borderRadius: "0.75rem" }}>
      <defs>
        <linearGradient id="parchmentBg" x1="0" y1="0" x2="0.4" y2="1">
          <stop offset="0%" stopColor="#FEFCF7" />
          <stop offset="100%" stopColor="#FBF6EA" />
        </linearGradient>
      </defs>
      <rect width="300" height="300" fill="url(#parchmentBg)" />

      {CHART_HOUSES.map(({ house, points, cx, cy }) => {
        const sign = ZODIAC_SIGNS[(lagnaIndex + house - 1 + 12) % 12];
        const planets = planetsByHouse[house] ?? [];
        const isLagna = house === 1;

        // Vertically center the block (house label + sign + planets) on the cell.
        const span = HEAD_GAP + ROW_H * planets.length;
        const startY = cy - span / 2;

        return (
          <g key={house}>
            <polygon
              points={points}
              fill="transparent"
              stroke={GOLD_LINE}
              strokeWidth="0.9"
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
  const COLS = "1.3fr 1fr 0.7fr 1.5fr 0.7fr";
  const headers = ["Planet", "Sign", "House", "Nakshatra", "Pada"];

  // Rose-ochre is a Build-palette tone — only warm into it on Build days. Other
  // days stay in their own hue (gradient into a darker shade of the day color).
  const ROSE_OCHRE = "#BC886F";
  const isBuild = modeColor === MODE_SOLID.Build;
  const warmStop = isBuild ? ROSE_OCHRE : `color-mix(in srgb, ${modeColor} 62%, #000)`;
  const accentBorder = isBuild ? ROSE_OCHRE : modeColor;
  return (
    <div style={{ borderRadius: "0.75rem", overflow: "hidden", border: `1px solid ${accentBorder}` }}>
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
          <span key={label} style={{ fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "#fff", textAlign: "center" }}>
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
          <span style={{ fontSize: "0.75rem", textAlign: "center", color: "var(--color-muted-foreground)" }}>{b.house}</span>
          <span style={{ fontSize: "0.7rem", textAlign: "center", color: "var(--color-muted-foreground)" }}>{b.nakshatra ?? "—"}</span>
          <span style={{ fontSize: "0.7rem", textAlign: "center", color: "var(--color-muted-foreground)" }}>{b.pada ?? "—"}</span>
        </div>
      ))}
    </div>
  );
}

// ── Sidereal heads-up ───────────────────────────────────────────────────────
// New users who only know their Western sun sign will see "wrong" signs here
// (a Western Leo Sun is often Cancer in the sidereal zodiac). Explain why so it
// reads as intentional, not broken.

function SiderealNote() {
  const [open, setOpen] = useState(false);
  return (
    <div
      className="rounded-xl px-3.5 py-3"
      style={{
        background: "var(--color-secondary)",
        border: "1px solid var(--color-border)",
      }}
    >
      <div className="flex items-start gap-2.5">
        <Info size={15} style={{ color: "var(--color-muted-foreground)", flexShrink: 0, marginTop: "1px" }} />
        <div className="flex-1">
          <p className="text-xs leading-relaxed" style={{ color: "var(--color-foreground)" }}>
            Velea uses the <strong>Vedic (sidereal) zodiac</strong>, so your signs may
            differ from the Western ones you know — a Western Leo Sun is often Cancer here.
            That's expected, not a mistake.
          </p>
          <button
            onClick={() => setOpen((v) => !v)}
            className="mt-1.5 text-[11px] font-semibold inline-flex items-center gap-1"
            style={{ color: "var(--color-muted-foreground)" }}
          >
            {open ? "Hide" : "Why are they different?"}
            <ChevronDown
              size={11}
              style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 200ms ease" }}
            />
          </button>
          {open && (
            <p className="mt-2 text-[11px] leading-relaxed" style={{ color: "var(--color-muted-foreground)" }}>
              Western astrology pins the zodiac to the <strong>seasons</strong> (0° Aries = the
              spring equinox). Vedic astrology pins it to the <strong>actual constellations</strong>.
              Because the Earth slowly wobbles on its axis (an effect called <em>precession</em>),
              those two reference points have drifted about <strong>24°</strong> apart over the last
              ~1,700 years — almost a full sign. Neither is "wrong"; they simply measure different
              things. Velea tracks the real stars.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Natal section ──────────────────────────────────────────────────────────

export function NatalSection() {
  const { data: subject, isLoading, error } = trpc.profiles.getSubject.useQuery();

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
      {/* Subject header */}
      <div>
        <p className="text-sm font-semibold">{subject.name}</p>
        <p className="text-xs" style={{ color: "var(--color-muted-foreground)" }}>
          {subject.birthDate}
          {subject.birthLocationCity ? ` · ${subject.birthLocationCity}` : ""}
          {subject.lagnaSign ? ` · ${subject.lagnaSign} Lagna` : ""}
        </p>
      </div>

      {/* Sidereal vs. Western heads-up */}
      <SiderealNote />

      {/* Chart grid */}
      <div data-tour="natal-chart">
        <NatalChartGrid lagnaSign={subject.lagnaSign} natalBodies={subject.natalBodies} />
      </div>

      {/* Planet table */}
      <PlanetTable natalBodies={subject.natalBodies} />
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

export function DashaSection() {
  const [expandedMaha, setExpandedMaha] = useState<string | null>(null);
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
      <p className="text-xs" style={{ color: "var(--color-muted-foreground)" }}>
        Your Karmic Schedule (From Birth to 120 Years Old)
      </p>

      {currentPeriod && (() => {
        // Immersive gradient card matching the Today page's Time Lord Movement card,
        // tinted with the active mahadasha's planet color.
        const activeColor = PLANET_COLORS[currentPeriod.mahadasha] ?? "#888";
        // Active period uses dark text to match the active mahadasha card.
        const t = { primary: "rgba(0,0,0,0.85)", muted: "rgba(0,0,0,0.6)", faint: "rgba(0,0,0,0.5)" };
        const isOpen = expandedMaha === currentMaha;
        return (
          <div className="overflow-hidden" style={{ borderRadius: "20px", background: planetGradient(activeColor), border: `4px solid ${activeColor}`, boxShadow: `0 0 20px ${activeColor}44` }}>
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
                <span style={{ fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: t.muted }}>
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
          const color = PLANET_COLORS[g.mahadasha] ?? "#888";
          const isExpanded = expandedMaha === g.mahadasha;
          const hasActive = g.periods.some((p: any) => p.isCurrent);
          const dur = MAHADASHA_DURATIONS[g.mahadasha] ?? 10;

          // Active card gets dark text (stands out); all others use white.
          const t = hasActive
            ? { primary: "rgba(0,0,0,0.85)", muted: "rgba(0,0,0,0.6)", faint: "rgba(0,0,0,0.5)", chip: "rgba(0,0,0,0.16)", chipBorder: "rgba(0,0,0,0.3)" }
            : { primary: "rgba(255,255,255,0.95)", muted: "rgba(255,255,255,0.7)", faint: "rgba(255,255,255,0.6)", chip: "rgba(255,255,255,0.2)", chipBorder: "rgba(255,255,255,0.4)" };
          return (
            <div key={g.mahadasha} className="rounded-xl overflow-hidden"
              style={{ border: hasActive ? `4px solid ${color}` : `1px solid ${color}99`, boxShadow: hasActive ? `0 0 20px ${color}44` : "none" }}
            >
              <button
                className="w-full flex items-center gap-3 px-4 py-4 text-left"
                style={{ background: planetGradient(color) }}
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
                <span style={{ color: t.muted, fontSize: "0.7rem" }}>{isExpanded ? "▲" : "▼"}</span>
              </button>

              {isExpanded && (
                <div style={{ background: "var(--color-card)", borderTop: `1px solid ${color}55` }}>
                  {g.periods.map((period: any, i: number) => {
                    const antColor = PLANET_COLORS[period.antardasha] ?? "#888";
                    const isCurrent = !!period.isCurrent;
                    return (
                      <div key={`${period.antardasha}-${i}`} className="px-4 py-3"
                        style={{ borderBottom: i < g.periods.length - 1 ? "1px solid var(--color-border)" : "none", background: isCurrent ? `${antColor}18` : "transparent" }}>
                        <div className="flex items-center gap-3">
                          <span className="flex-shrink-0 leading-none text-center" style={{ fontSize: "0.95rem", color: antColor, width: "1rem" }}>
                            {PLANET_SYMBOLS[period.antardasha] ?? "●"}
                          </span>
                          <span className="text-sm flex-shrink-0"
                            style={{ color: isCurrent ? "var(--color-foreground)" : "var(--color-muted-foreground)", minWidth: "80px" }}>
                            {period.antardasha}
                          </span>
                          {isCurrent && (
                            <span className="text-xs px-2 py-0.5 rounded-full flex-shrink-0"
                              style={{ background: `${antColor}25`, color: antColor, border: `1px solid ${antColor}50` }}>
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
  const tlGradient = taskMode === "Action" ? "var(--kala-action-gradient)"
    : taskMode === "Build" ? "var(--kala-build-gradient)"
    : taskMode === "Selective" ? "var(--kala-selective-gradient)"
    : taskMode === "Restraint" ? "var(--kala-restraint-gradient)"
    : "var(--card)";
  // Darker gradient for the short accordion cards so white text stays legible.
  const cardGradient = taskMode === "Action" ? "var(--kala-action-card-gradient)"
    : taskMode === "Build" ? "var(--kala-build-card-gradient)"
    : taskMode === "Selective" ? "var(--kala-selective-card-gradient)"
    : taskMode === "Restraint" ? "var(--kala-restraint-card-gradient)"
    : "var(--card)";
  const accentColor = taskMode ? MODE_OKLCH[taskMode] : "var(--color-border)";
  const darkColor = taskMode ? MODE_DARK[taskMode] : undefined;
  const todayDateStr = useMemo(() => new Date().toISOString().split("T")[0], []);
  const TEXT_PRIMARY = "var(--foreground)";
  const TEXT_MUTED = "var(--muted-foreground)";
  // Light text for use on the immersive gradient cards
  const LIGHT_PRIMARY = "#ffffff";
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
    <div className="overflow-hidden" style={{ borderRadius: "20px", background: bg }}>
      <button className="w-full flex items-center justify-between px-4 py-3" onClick={() => setOpen(!open)}>
        <span style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: "0.15rem", textAlign: "left" }}>
          <span style={{ fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(255,255,255,0.96)" }}>
            {title}
          </span>
          {subtitle && (
            <span style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.55)" }}>{subtitle}</span>
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
          <p style={{ color: LIGHT_MUTED, fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: "0.4rem" }}>Yearly Focus</p>
          <p style={{ color: LIGHT_PRIMARY, fontSize: "0.875rem", margin: 0, lineHeight: 1.6, fontWeight: 500 }}>{profectionData.interpretation.section5}</p>
        </>,
        undefined,
        tlGradient,
      )}

      {/* What Supports Growth — immersive gradient */}
      {gradientCard("What Supports Growth", growthOpen, setGrowthOpen,
        <p style={{ color: LIGHT_PRIMARY, fontSize: "0.875rem", margin: 0, lineHeight: 1.6, whiteSpace: "pre-wrap", fontWeight: 500 }}>{profectionData.interpretation.section6}</p>
      )}

      {/* What Creates Friction — immersive gradient */}
      {gradientCard("What Creates Friction", frictionOpen, setFrictionOpen,
        <p style={{ color: LIGHT_PRIMARY, fontSize: "0.875rem", margin: 0, lineHeight: 1.6, whiteSpace: "pre-wrap", fontWeight: 500 }}>{profectionData.interpretation.section7}</p>
      )}

      {/* Current Time Lord Movement — immersive gradient */}
      <div data-tour="time-lord-transits" className="overflow-hidden" style={{ borderRadius: "20px", background: tlGradient }}>
        <button className="w-full flex items-center justify-between px-4 py-3" onClick={() => setTlOpen((v) => !v)}>
          <span style={{ fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(255,255,255,0.96)" }}>
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
                    <p style={{ margin: 0, fontWeight: isCurrent ? 700 : 600, color: isCurrent ? "#fff" : LIGHT_PRIMARY }}>
                      {transit.startDate} – {transit.endDate} — {transit.sign} H{transit.house}
                    </p>
                    <ChevronDown size={16} style={{ color: isCurrent ? "#fff" : LIGHT_MUTED, transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 200ms ease-out", flexShrink: 0, marginLeft: "0.5rem" }} />
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
    window.addEventListener("kala-tour-tab", onTab);
    return () => window.removeEventListener("kala-tour-tab", onTab);
  }, []);

  return (
    <div className="min-h-screen">
      <div className="container py-6 space-y-5">
        <AppHeader pageTitle="Your Charts" />

        {/* Tab bar — active tab tinted with the current day mode color */}
        <div
          className="flex gap-1 p-1 rounded-xl"
          style={{ background: "var(--color-secondary)" }}
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
