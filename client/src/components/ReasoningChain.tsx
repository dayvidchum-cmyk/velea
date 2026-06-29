/**
 * ReasoningChain — collapsible astrological explanation layer
 *
 * Displays the full derivation chain:
 *   Base Mode + Expression summary (always visible at top)
 *   1. Moon Position (Today's Focus)
 *   2. House Activation
 *   3. Nakshatra Expression
 *   4. Tithi Influence
 *   5. Time Lord Influence
 *   Final Synthesis
 *
 * NOTE: Ascendant/Lagna is intentionally NOT shown here.
 * It is fixed natal context used only in calculations and diagnostics.
 *
 * This is a DISPLAY-ONLY component. It does not calculate anything.
 * All data comes from the existing panchang.today / timeLordInfluence tRPC calls.
 *
 * TEXT COLORS: All text uses white/rgba(255,255,255,x) so it reads on any
 * gradient background (gold, green, teal, rose, etc.).
 */

import { useState } from "react";
import { ChevronDown } from "lucide-react";

// ─── House data ───────────────────────────────────────────────────────────────

const HOUSE_THEMES: Record<number, { name: string; themes: string[] }> = {
  1:  { name: "1st House", themes: ["identity", "body", "visibility", "self-direction", "personal agency"] },
  2:  { name: "2nd House", themes: ["money", "values", "resources", "voice", "self-worth", "material stability"] },
  3:  { name: "3rd House", themes: ["communication", "short travel", "siblings", "writing", "outreach", "local movement"] },
  4:  { name: "4th House", themes: ["foundations", "home base", "stabilization", "repair", "consolidation", "internal security"] },
  5:  { name: "5th House", themes: ["creativity", "self-expression", "romance", "children", "speculation", "performance"] },
  6:  { name: "6th House", themes: ["work", "service", "health", "daily routine", "problem-solving", "refinement"] },
  7:  { name: "7th House", themes: ["partnerships", "contracts", "open relationships", "negotiation", "collaboration"] },
  8:  { name: "8th House", themes: ["transformation", "shared resources", "depth", "research", "endings", "hidden matters"] },
  9:  { name: "9th House", themes: ["belief systems", "higher learning", "travel", "philosophy", "expansion", "meaning"] },
  10: { name: "10th House", themes: ["career", "public role", "authority", "reputation", "achievement", "visibility"] },
  11: { name: "11th House", themes: ["networks", "community", "goals", "collective action", "alliances", "future vision"] },
  12: { name: "12th House", themes: ["retreat", "solitude", "hidden work", "release", "spiritual practice", "rest"] },
};

const HOUSE_MODE_RESULT: Record<number, string> = {
  1: "Action", 2: "Flex", 3: "Build", 4: "Restraint",
  5: "Selective", 6: "Build", 7: "Selective", 8: "Restraint",
  9: "Flex", 10: "Action", 11: "Action", 12: "Restraint",
};

// ─── Ordinal suffix ───────────────────────────────────────────────────────────

function ordinal(n: number): string {
  if (n === 1) return "1st";
  if (n === 2) return "2nd";
  if (n === 3) return "3rd";
  return `${n}th`;
}

// ─── Section wrapper ──────────────────────────────────────────────────────────

interface SectionProps {
  number: number;
  title: string;
  subtitle: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  accentColor?: string;
}

function Section({ number, title, subtitle, children, defaultOpen = false, accentColor }: SectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div
      style={{
        borderBottom: "1px solid rgba(255,255,255,0.12)",
        paddingBottom: open ? "0.75rem" : "0",
      }}
    >
      <button
        className="w-full text-left py-2.5 flex items-start justify-between gap-2"
        onClick={() => setOpen((v) => !v)}
        style={{ background: "transparent", border: "none", cursor: "pointer" }}
      >
        <div className="flex items-start gap-2.5 min-w-0">
          <span
            className="flex-shrink-0 text-[10px] font-bold tracking-wide mt-0.5"
            style={{
              color: "rgba(255,255,255,0.55)",
              minWidth: "1rem",
            }}
          >
            {number}
          </span>
          <div className="min-w-0">
            <p
              className="text-[10px] font-bold tracking-wide uppercase leading-none"
              style={{
                color: "rgba(255,255,255,0.9)",
                letterSpacing: "0.04em",
              }}
            >
              {title}
            </p>
            <p
              className="text-xs mt-0.5 leading-snug"
              style={{
                color: "rgba(255,255,255,0.65)",
              }}
            >
              {subtitle}
            </p>
          </div>
        </div>
        <ChevronDown
          size={12}
          className="flex-shrink-0 mt-1"
          style={{
            color: "rgba(255,255,255,0.45)",
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 200ms cubic-bezier(0.23, 1, 0.32, 1)",
          }}
        />
      </button>

      {open && (
        <div
          className="pb-2 text-xs leading-relaxed space-y-2"
          style={{
            color: "rgba(255,255,255,0.82)",
          }}
        >
          {children}
        </div>
      )}
    </div>
  );
}

// ─── Why It Matters callout ───────────────────────────────────────────────────

function WhyItMatters({ text }: { text: string }) {
  return (
    <div
      className="px-2.5 py-2 rounded-md text-xs leading-relaxed"
      style={{
        background: "rgba(0,0,0,0.15)",
        border: "1px solid rgba(255,255,255,0.1)",
        color: "rgba(255,255,255,0.7)",
      }}
    >
      <span
        className="text-[10px] font-bold tracking-wide uppercase mr-1.5"
        style={{ color: "rgba(255,255,255,0.45)" }}
      >
        Why it matters:
      </span>
      {text}
    </div>
  );
}

// ─── Result badge ─────────────────────────────────────────────────────────────

function Result({ label, value }: { label: string; value: string; accentColor?: string }) {
  return (
    <div className="flex items-center gap-2 pt-0.5">
      <span
        className="text-[10px] font-bold tracking-wide uppercase"
        style={{ color: "rgba(255,255,255,0.45)" }}
      >
        {label}:
      </span>
      <span
        className="text-xs font-semibold"
        style={{ color: "rgba(255,255,255,0.9)" }}
      >
        {value}
      </span>
    </div>
  );
}

// ─── Bullet list ──────────────────────────────────────────────────────────────

function BulletList({ items, accentColor }: { items: string[]; accentColor?: string }) {
  return (
    <ul className="space-y-0.5 pl-0">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-1.5 text-xs">
          <span style={{ color: accentColor ?? "rgba(255,255,255,0.55)", flexShrink: 0 }}>·</span>
          <span style={{ color: "rgba(255,255,255,0.82)" }}>{item.charAt(0).toUpperCase() + item.slice(1)}</span>
        </li>
      ))}
    </ul>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface ReasoningChainProps {
  panchang: {
    moonSign: string;
    houseActivated: number;
    nakshatra: string;
    nakshatraAtSunrise?: string;
    tithi: string;
    tithiPaksha: "Shukla" | "Krishna";
    baseMode?: string;
    finalMode?: string;
    mode: string;
    qualifier?: string;
    lagnaSign?: string;
    nakshatraModifier?: {
      behavioralQuality: string;
      supports: string[];
      avoid: string[];
      toneModifier: string;
    };
    tithiPacing?: {
      phase: "waxing" | "waning";
      pacingLabel: string;
      pacingNote: string;
    };
    modeReason?: {
      tithiModifier: number;
    };
  };
  timeLord?: {
    timeLordLabel?: string;
    operationalChain?: string;
    bestUses?: string[];
    avoidToday?: string[];
    reasoning?: string;
    recommendedBehavior?: string;
  } | null;
  modeColor?: string;
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ReasoningChain({ panchang, timeLord, modeColor }: ReasoningChainProps) {
  const lagnaSign = panchang.lagnaSign ?? null;
  const house = panchang.houseActivated;
  const houseInfo = HOUSE_THEMES[house] ?? HOUSE_THEMES[1];
  const houseResult = HOUSE_MODE_RESULT[house] ?? panchang.baseMode ?? panchang.mode;
  const nakshatra = panchang.nakshatraAtSunrise ?? panchang.nakshatra;
  const baseMode = panchang.baseMode ?? panchang.mode;
  const qualifier = panchang.qualifier ?? panchang.mode;
  const tithiPacing = panchang.tithiPacing;
  const nakshatraModifier = panchang.nakshatraModifier;

  // Determine if nakshatra changes the mode expression
  const nakshatraChangesMode = qualifier !== baseMode;

  return (
    <div className="space-y-0">

      {/* ── Base Mode + Expression summary ───────────────────────────────── */}
      <div
        className="py-3 mb-1"
        style={{
          borderBottom: "1px solid rgba(255,255,255,0.12)",
        }}
      >
        <div className="flex items-baseline gap-3 flex-wrap">
          <div className="flex items-baseline gap-2">
            <span
              className="text-[10px] font-bold tracking-wide uppercase"
              style={{
                color: "rgba(255,255,255,0.5)",
                minWidth: "5.5rem",
              }}
            >
              Base Mode
            </span>
            <span
              className="text-sm font-bold"
              style={{ color: "rgba(255,255,255,0.95)" }}
            >
              {baseMode}
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span
              className="text-[10px] font-bold tracking-wide uppercase"
              style={{
                color: "rgba(255,255,255,0.5)",
                minWidth: "5.5rem",
              }}
            >
              Expression
            </span>
            <span
              className="text-sm font-bold"
              style={{ color: "rgba(255,255,255,0.95)" }}
            >
              {qualifier}
            </span>
          </div>
        </div>
      </div>

      {/* ── 1. Moon Position ─────────────────────────────────────────────── */}
      <Section
        number={1}
        title="Moon Position"
        subtitle={`Moon in ${panchang.moonSign} — Today's Focus`}
        accentColor={modeColor}
      >
        <p>
          Today the Moon occupies{" "}
          <strong style={{ color: "rgba(255,255,255,0.95)" }}>{panchang.moonSign}</strong>.
        </p>
        <WhyItMatters text="The Moon describes where attention, energy, and emotional momentum naturally flow. It moves through a new sign roughly every 2.5 days." />
      </Section>

      {/* ── 2. House Activation ──────────────────────────────────────────── */}
      <Section
        number={2}
        title="House Activation"
        subtitle={lagnaSign ? `${panchang.moonSign} is the ${ordinal(house)} house from ${lagnaSign}` : `${panchang.moonSign} — House ${house} activated`}
        accentColor={modeColor}
      >
        <p>
          <strong style={{ color: "rgba(255,255,255,0.95)" }}>{houseInfo.name} Themes:</strong>
        </p>
        <BulletList items={houseInfo.themes} accentColor={modeColor} />
        <WhyItMatters text="Velea uses the Moon's house position as the primary mode determinant. The house tells you what area of life is activated today." />
        {!lagnaSign && (
          <p className="text-xs mt-2 px-3 py-2 rounded-md" style={{ background: "rgba(0,0,0,0.2)", color: "rgba(255,255,255,0.6)" }}>
            House position is estimated. Set your birth chart in Settings to see your personalized house activation.
          </p>
        )}
        <Result label="Result" value={`${ordinal(house)} House = ${houseResult}`} accentColor={modeColor} />
      </Section>

      {/* ── 3. Nakshatra Expression ──────────────────────────────────────── */}
      <Section
        number={3}
        title="Nakshatra Expression"
        subtitle={`${nakshatra} — How the mode moves`}
        accentColor={modeColor}
      >
        {nakshatraModifier ? (
          <>
            <p>
              <strong style={{ color: "rgba(255,255,255,0.95)" }}>Behavioral quality:</strong>{" "}
              {nakshatraModifier.behavioralQuality}.
            </p>
            <p className="mt-1">
              {nakshatraChangesMode ? (
                <>
                  Does <strong style={{ color: "rgba(255,255,255,0.95)" }}>not</strong> change the mode.
                  Instead it changes <em>how</em>{" "}
                  <strong style={{ color: "rgba(255,255,255,0.95)" }}>{baseMode}</strong> expresses itself.
                </>
              ) : (
                <>
                  Reinforces <strong style={{ color: "rgba(255,255,255,0.95)" }}>{baseMode}</strong> without shifting the base mode.
                </>
              )}
            </p>
            <p className="mt-1 italic" style={{ color: "rgba(255,255,255,0.65)" }}>
              {nakshatraModifier.toneModifier}
            </p>
          </>
        ) : (
          <p>Nakshatra shapes how the day's energy moves without changing the base mode.</p>
        )}
        <Result label="Result" value={qualifier} accentColor={modeColor} />
        {qualifier !== baseMode && (
          <p className="text-xs" style={{ color: "rgba(255,255,255,0.6)" }}>
            This is not passive {baseMode.toLowerCase()}. It favors a more specific expression of the same mode.
          </p>
        )}
      </Section>

      {/* ── 4. Tithi Influence ───────────────────────────────────────────── */}
      <Section
        number={4}
        title="Tithi Influence"
        subtitle={`${panchang.tithi} — Pacing`}
        accentColor={modeColor}
      >
        {tithiPacing ? (
          <>
            <p>
              <strong style={{ color: "rgba(255,255,255,0.95)" }}>Phase:</strong>{" "}
              {tithiPacing.phase === "waxing" ? "Waxing moon" : "Waning moon"} — {tithiPacing.pacingLabel.toLowerCase()} movement.
            </p>
            <p className="mt-1">{tithiPacing.pacingNote}</p>
            <p className="mt-1">
              {tithiPacing.phase === "waxing"
                ? "Supports outward movement. Reinforces expansion."
                : "Supports inward movement. Reinforces restraint."}
            </p>
          </>
        ) : (
          <p>
            {panchang.tithiPaksha === "Krishna"
              ? "Waning phase — supports inward movement and refinement."
              : "Waxing phase — supports outward movement and expansion."}
          </p>
        )}
      </Section>

      {/* ── 5. Time Lord Influence ───────────────────────────────────────── */}
      {timeLord && (
        <Section
          number={5}
          title="Time Lord Influence"
          subtitle={timeLord.timeLordLabel ?? "Annual Time Lord"}
          accentColor={modeColor}
        >
          {timeLord.operationalChain && (
            <div>
              <p
                className="text-[10px] font-bold tracking-wide uppercase mb-1"
                style={{ color: "rgba(255,255,255,0.45)" }}
              >
                Operational Chain
              </p>
              <p className="font-mono text-xs leading-relaxed" style={{ color: "rgba(255,255,255,0.75)" }}>
                {timeLord.operationalChain.split(" / ").join("\n→ ")}
              </p>
            </div>
          )}
          {timeLord.bestUses && timeLord.bestUses.length > 0 && (
            <div>
              <p
                className="text-[10px] font-bold tracking-wide uppercase mb-1 mt-1"
                style={{ color: "rgba(255,255,255,0.45)" }}
              >
                Translation — This year favors
              </p>
              <BulletList items={timeLord.bestUses} accentColor={modeColor} />
            </div>
          )}
          {timeLord.reasoning && (
            <p className="text-xs pt-1" style={{ color: "rgba(255,255,255,0.6)", borderTop: "1px solid rgba(255,255,255,0.1)" }}>
              {timeLord.reasoning}
            </p>
          )}
        </Section>
      )}

      {/* ── Final Synthesis ──────────────────────────────────────────────── */}
      <div className="pt-3 pb-1">
        <p
          className="text-[10px] font-bold tracking-wide uppercase mb-2"
          style={{ color: "rgba(255,255,255,0.45)", letterSpacing: "0.04em" }}
        >
          Final Synthesis
        </p>
        <div className="space-y-1.5">
          <div className="flex items-baseline gap-2">
            <span className="text-[10px] uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.45)", minWidth: "5rem" }}>Base Mode</span>
            <span className="text-xs font-bold" style={{ color: "rgba(255,255,255,0.95)" }}>{baseMode}</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-[10px] uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.45)", minWidth: "5rem" }}>Expression</span>
            <span className="text-xs font-bold" style={{ color: "rgba(255,255,255,0.95)" }}>{qualifier}</span>
          </div>
          {timeLord?.timeLordLabel && (
            <div className="flex items-baseline gap-2">
              <span className="text-[10px] uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.45)", minWidth: "5rem" }}>Time Lord</span>
              <span className="text-xs" style={{ color: "rgba(255,255,255,0.82)" }}>{timeLord.timeLordLabel}</span>
            </div>
          )}
        </div>

        {/* Best Uses */}
        {timeLord?.bestUses && timeLord.bestUses.length > 0 && (
          <div className="mt-3">
            <p
              className="text-[10px] font-bold tracking-wide uppercase mb-1.5"
              style={{ color: "rgba(255,255,255,0.45)" }}
            >
              Good for
            </p>
            <BulletList items={timeLord.bestUses} accentColor={modeColor} />
          </div>
        )}

        {/* Avoid */}
        {timeLord?.avoidToday && timeLord.avoidToday.length > 0 && (
          <div className="mt-3">
            <p
              className="text-[10px] font-bold tracking-wide uppercase mb-1.5"
              style={{ color: "rgba(255,255,255,0.45)" }}
            >
              Avoid
            </p>
            <BulletList items={timeLord.avoidToday} accentColor={modeColor} />
          </div>
        )}
      </div>
    </div>
  );
}
