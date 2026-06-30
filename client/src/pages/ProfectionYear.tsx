import { trpc } from "../lib/trpc";
import { NatalSection, DashaSection } from "./Astrology";
import { useState, useMemo } from "react";
import { ChevronDown, CircleDot } from "lucide-react";
import AppHeader from "@/components/AppHeader";
import { useDayModeColor } from "@/hooks/useDayModeColor";
import { TimeLordMovement } from "@/components/TimeLordMovement";
import { ProfectionWheel } from "@/components/ProfectionWheel";
import { WhyNowChain } from "@/components/WhyNowChain";
import { CurrentTriggerBreakdown } from "@/components/CurrentTriggerBreakdown";
import { PANCHANG_TO_TASK_MODE, MODE_OKLCH, MODE_DARK, type TaskMode } from "../../../shared/types";
import { LIFE_AREAS } from "../../../shared/life-areas";

// House ordinals + plain-language glosses (mirrors HOUSE_GLOSS in WhyNowChain.tsx /
// CurrentTriggerBreakdown.tsx) so the "Current Time Lord Movement" card can name the
// chapter the Time Lord is currently transiting — deterministic, no API call.
const ORD = ["", "1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th", "9th", "10th", "11th", "12th"];
const HOUSE_GLOSS: Record<number, string> = {
  1: "self, body, how you are seen",
  2: "money, possessions, self-worth, speech",
  3: "communication, siblings, short trips, skill",
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

// Deterministic dasha-breakdown helpers (no API): a lord's dignity + the houses
// it rules from the lagna.
const ZODIAC = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"];
const SIGN_RULERS: Record<string, string> = { Aries: "Mars", Taurus: "Venus", Gemini: "Mercury", Cancer: "Moon", Leo: "Sun", Virgo: "Mercury", Libra: "Venus", Scorpio: "Mars", Sagittarius: "Jupiter", Capricorn: "Saturn", Aquarius: "Saturn", Pisces: "Jupiter" };
const DIGN: Record<string, { ex: string; de: string; own: string[] }> = {
  Sun: { ex: "Aries", de: "Libra", own: ["Leo"] },
  Moon: { ex: "Taurus", de: "Scorpio", own: ["Cancer"] },
  Mars: { ex: "Capricorn", de: "Cancer", own: ["Aries", "Scorpio"] },
  Mercury: { ex: "Virgo", de: "Pisces", own: ["Gemini", "Virgo"] },
  Jupiter: { ex: "Cancer", de: "Capricorn", own: ["Sagittarius", "Pisces"] },
  Venus: { ex: "Pisces", de: "Virgo", own: ["Taurus", "Libra"] },
  Saturn: { ex: "Libra", de: "Aries", own: ["Capricorn", "Aquarius"] },
};
function dignityWord(planet: string, sign: string): string | null {
  const d = DIGN[planet];
  if (!d) return null;
  if (sign === d.ex) return "exalted";
  if (sign === d.de) return "debilitated";
  if (d.own.includes(sign)) return "own sign";
  return null;
}
function housesRuledFromLagna(planet: string, lagna: string): number[] {
  const li = ZODIAC.indexOf(lagna);
  if (li < 0) return [];
  return ZODIAC.filter((s) => SIGN_RULERS[s] === planet)
    .map((s) => ((ZODIAC.indexOf(s) - li + 12) % 12) + 1)
    .sort((a, b) => a - b);
}

// Words that signal a continuation/appositive fragment, not a standalone closing
// thought — so we never peel a mid-sentence em dash into a dangling takeaway.
const FRAGMENT_STARTS = new Set([
  "is", "are", "was", "were", "be", "been", "being", "and", "but", "or", "nor",
  "which", "that", "who", "whom", "whose", "where", "when", "while", "because",
  "though", "although", "yet", "if", "as",
]);

/**
 * Split a "why" string into placement detail (data) and a closing takeaway.
 * Peels at an explicit "— so …", or at a trailing em dash IF the tail reads as a
 * complete sentence (doesn't begin with a fragment/connector word). This keeps
 * real closing lines ("— the year places belief inside service…") as takeaways
 * while leaving mid-sentence appositives ("— is where…") attached.
 */
function peelTakeaway(text: string): { data: string; takeaway: string } {
  const so = text.match(/\s+—\s+so[,\s]+/i);
  if (so && so.index !== undefined) {
    return { data: text.slice(0, so.index).trim().replace(/[,;]\s*$/, ""), takeaway: text.slice(so.index + so[0].length).trim() };
  }
  const idx = text.lastIndexOf("—");
  if (idx > text.length * 0.4) {
    const tail = text.slice(idx + 1).trim();
    const first = (tail.split(/\s+/)[0] || "").toLowerCase().replace(/[^a-z]/g, "");
    if (tail && !FRAGMENT_STARTS.has(first)) {
      return { data: text.slice(0, idx).trim().replace(/[,;]\s*$/, ""), takeaway: tail };
    }
  }
  return { data: text, takeaway: "" };
}

export default function ProfectionYear() {
  const modeColor = useDayModeColor();
  const TEXT_PRIMARY = "var(--foreground)";
  const TEXT_MUTED = "var(--muted-foreground)";

  const [s1, setS1] = useState(true);
  const [s2, setS2] = useState(false);
  const [s3, setS3] = useState(false);
  const [s4, setS4] = useState(false);
  const [s5, setS5] = useState(false);
  const [s6, setS6] = useState(false);
  const [s7, setS7] = useState(false);
  const [s8, setS8] = useState(false);
  const [tlOpen, setTlOpen] = useState(false);
  const [triggerOpen, setTriggerOpen] = useState(false);
  const [explainerOpen, setExplainerOpen] = useState(false);
  const [wheelOpen, setWheelOpen] = useState(true); // wheel stays open unless minimized
  const [whyNowOpen, setWhyNowOpen] = useState(true);
  const [areasOpen, setAreasOpen] = useState(true);
  const [readOpen, setReadOpen] = useState(true);
  const [expandedTransitId, setExpandedTransitId] = useState<number | null>(null);
  const [chartTab, setChartTab] = useState<"timelord" | "natal" | "dasha">("timelord");
  const CHART_TABS: { id: "timelord" | "natal" | "dasha"; label: string }[] = [
    { id: "timelord", label: "Time Lord" },
    { id: "natal", label: "Natal" },
    { id: "dasha", label: "Dasha" },
  ];

  const { data: profectionData, error: profectionError } = trpc.profection.current.useQuery();
  const { data: transitsData, error: transitsError, isLoading: transitsLoading } = trpc.profection.timeLordTransits.useQuery(undefined, {
    enabled: s4,
  });

  const { data: todayPanchang } = trpc.panchang.today.useQuery();

  // LLM Deep Read — six sections + synthesis, personalized to this chart.
  const { data: activeProfile } = trpc.profiles.getActive.useQuery();
  const { data: subject } = trpc.profiles.getSubject.useQuery();
  const { data: dashaTimeline } = trpc.dasha.timeline.useQuery(undefined, { retry: false });
  const localToday = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }, []);
  const { data: triggerData } = trpc.narrative.currentTransits.useQuery(
    { profileId: activeProfile?.id as number, date: localToday },
    { enabled: !!activeProfile?.id },
  );
  const deepProfileId = activeProfile?.id;
  const { data: deepReadResult, isLoading: deepReadLoading } = trpc.narrative.deepRead.useQuery(
    { profileId: deepProfileId as number, date: localToday },
    { enabled: !!deepProfileId, staleTime: 1000 * 60 * 60 },
  );
  const deepRead = deepReadResult?.read ?? null;

  // Where the Time Lord is transiting right now — used to name the current "chapter".
  const { data: tlTransit } = trpc.timeLordTransit.forDate.useQuery(
    { date: localToday },
    { enabled: !!localToday },
  );
  const taskMode: TaskMode | undefined = todayPanchang?.mode
    ? PANCHANG_TO_TASK_MODE[todayPanchang.mode as keyof typeof PANCHANG_TO_TASK_MODE]
    : undefined;

  const tlGradient = taskMode === 'Action' ? 'var(--kala-action-gradient)'
    : taskMode === 'Build' ? 'var(--kala-build-gradient)'
    : taskMode === 'Selective' ? 'var(--kala-selective-gradient)'
    : taskMode === 'Restraint' ? 'var(--kala-restraint-gradient)'
    : 'var(--card)';

  // Angled (diagonal) variant for short closed accordion bars — a horizontal/vertical
  // gradient reads oddly squeezed into the thin closed strip.
  const tlCardGradient = taskMode === 'Action' ? 'var(--kala-action-card-gradient)'
    : taskMode === 'Build' ? 'var(--kala-build-card-gradient)'
    : taskMode === 'Selective' ? 'var(--kala-selective-card-gradient)'
    : taskMode === 'Restraint' ? 'var(--kala-restraint-card-gradient)'
    : 'var(--card)';

  const accentColor = taskMode ? MODE_OKLCH[taskMode] : 'var(--color-border)';
  const darkColor = taskMode ? MODE_DARK[taskMode] : undefined;
  const todayDateStr = localToday;

  const card = (
    title: string,
    open: boolean,
    setOpen: (v: boolean) => void,
    content: React.ReactNode
  ) => (
    <div style={{ borderRadius: "20px", overflow: "hidden", marginBottom: "1.25rem", background: tlGradient }}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.75rem 1rem", background: "transparent", border: "none", cursor: "pointer" }}
      >
        <span style={{ color: "rgba(255,255,255,0.72)", fontSize: "0.74rem", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase" as const }}>{title}</span>
        <ChevronDown size={14} style={{ color: "rgba(255,255,255,0.6)", flexShrink: 0, transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 200ms ease" }} />
      </button>
      {open ? content : null}
    </div>
  );

  // "The Read" accordions: a CLOSED card is a flat solid color; an OPEN card carries a
  // subtle gradient. Synthesis-first means each section opens in near-black (the human
  // truth) with the planet/house mechanics demoted to gray afterwards.
  const readAccordion = (
    label: string,
    open: boolean,
    setOpen: (v: boolean) => void,
    content: React.ReactNode,
  ) => (
    <div style={{
      border: "none",
      borderRadius: "0.85rem",
      overflow: "hidden",
      marginBottom: "0.85rem",
      background: open ? tlGradient : tlCardGradient,
    }}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.85rem 1.1rem", background: "transparent", border: "none", cursor: "pointer", textAlign: "left" }}
      >
        <span style={{ color: open ? "#fff" : "rgba(255,255,255,0.85)", fontSize: "0.78rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" as const }}>{label}</span>
        <ChevronDown size={16} style={{ color: "rgba(255,255,255,0.7)", flexShrink: 0, transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 200ms ease" }} />
      </button>
      {open && <div style={{ padding: "0 1.1rem 1.1rem" }}>{content}</div>}
    </div>
  );

  // White card with a day-mode-colored header, collapsible — the cohesive
  // container used for every section on the Time Lord page.
  const panel = (
    title: string,
    open: boolean,
    setOpen: (v: boolean) => void,
    content: React.ReactNode,
  ) => (
    <div style={{ borderRadius: "20px", background: "var(--card)", border: "1px solid var(--border)", marginBottom: "1.25rem", overflow: "hidden" }}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "1.1rem 1.25rem", background: "transparent", border: "none", cursor: "pointer", textAlign: "left" }}
      >
        <span style={{ fontSize: "0.74rem", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase" as const, color: modeColor }}>{title}</span>
        <ChevronDown size={16} style={{ color: modeColor, opacity: 0.7, flexShrink: 0, transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 200ms ease" }} />
      </button>
      {open && <div style={{ padding: "0 1.25rem 1.25rem" }}>{content}</div>}
    </div>
  );

  // Wraps rich (white-text) content in the colored ombre so it stays legible
  // inside the white card.
  const ombre = (children: React.ReactNode) => (
    <div style={{ borderRadius: "14px", background: tlGradient, padding: "1.25rem", overflow: "hidden" }}>{children}</div>
  );

  // One-sentence synthesis, carried by the gold Chart icon. Used at the end of every
  // Read breakdown so the placement bullets resolve into a single human takeaway.
  const goldTakeaway = (text: string) => (
    <div style={{ display: "flex", gap: "0.65rem", alignItems: "flex-start", marginTop: "0.95rem" }}>
      <CircleDot size={17} style={{ color: "#E7C766", flexShrink: 0, marginTop: "0.15rem" }} />
      <p style={{ color: "rgba(255,255,255,0.95)", fontSize: "0.95rem", lineHeight: 1.55, margin: 0, fontWeight: 600 }}>{text.charAt(0).toUpperCase() + text.slice(1)}</p>
    </div>
  );

  // A planet's placement, under a gold header that names WHO it is (Venus · Time Lord,
  // Moon Mahadasha…). Without the header a bullet like "Sits in the 6th" has no subject.
  const planetGroupBlock = (g: { label: string; bullets: { head: string; gloss: string }[] }) => (
    <div style={{ marginTop: "0.95rem" }}>
      <p style={{ color: "#E7C766", fontSize: "0.82rem", fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase" as const, margin: "0 0 0.45rem" }}>{g.label}</p>
      <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: "0.4rem" }}>
        {g.bullets.map((bl, i) => (
          <li key={i} style={{ fontSize: "0.9rem", lineHeight: 1.45, display: "flex", gap: "0.55rem" }}>
            <span style={{ color: "rgba(255,255,255,0.5)", flexShrink: 0, fontWeight: 700, lineHeight: "1.35rem" }}>•</span>
            <span>
              <span style={{ color: "rgba(255,255,255,0.92)" }}>{bl.head}</span>
              {bl.gloss && <span style={{ color: "rgba(255,255,255,0.6)" }}> ({bl.gloss})</span>}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );

  // The why (gray mechanics) renders as a simple little list — one line per clause —
  // so the chart data informs without overwhelming. Splits on "; " (the dasha chain
  // separates maha / antar that way); a single clause stays a single line.
  const whyBlock = (why: string) => {
    // Peel a trailing takeaway (after a late em dash) to emphasize with the
    // Chart icon; bullet the placement clauses that come before it.
    const { data, takeaway } = peelTakeaway(why);
    const items = data
      // sentence ends, semicolons, and " and " before a placement clause
      .split(/(?<=\.)\s+|;\s+|\s+and\s+(?=(?:your\b|rules\b|ruling\b|sits\b|in\s+your\b))/i)
      .map((s) => s.trim().replace(/[.,;]+$/, ""))
      .filter(Boolean)
      .map((s) => s.charAt(0).toUpperCase() + s.slice(1));
    const list = items.length ? items : [data];
    return (
      <div style={{ margin: "0.7rem 0 0" }}>
        <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {list.map((it, i) => (
            <li key={i} style={{ color: "rgba(255,255,255,0.68)", fontSize: "0.92rem", lineHeight: 1.5, display: "flex", gap: "0.6rem" }}>
              <span style={{ color: "rgba(255,255,255,0.55)", flexShrink: 0, lineHeight: "1.4rem", fontWeight: 700 }}>•</span>
              <span>{it}</span>
            </li>
          ))}
        </ul>
        {takeaway && goldTakeaway(takeaway)}
      </div>
    );
  };

  // Synthesis (white, the human truth) first; the why (muted-white mechanics) after, as a list.
  const sectionBody = (sec: { synthesis: string; why: string }) => (
    <>
      <p style={{ color: "rgba(255,255,255,0.96)", fontSize: "1rem", lineHeight: 1.7, margin: 0 }}>{sec.synthesis}</p>
      {sec.why && whyBlock(sec.why)}
    </>
  );

  if (profectionError) return (
    <div style={{ padding: "2rem" }}>
      <AppHeader pageTitle="Your Charts" />
      <p style={{ color: TEXT_MUTED, marginTop: "1rem" }}>Error: {profectionError.message}</p>
    </div>
  );

  if (!profectionData) return (
    <div style={{ padding: "2rem" }}>
      <AppHeader pageTitle="Your Charts" />
      <p style={{ color: TEXT_MUTED, marginTop: "1rem" }}>Please set your birth date and lagna sign in settings to view your profection year.</p>
    </div>
  );

  const { age, activatedHouse, activatedSign, timeLord, lagnaSign } = profectionData.profection;
  const tlBody: any = (subject as any)?.natalBodies?.find((b: any) => b.planet === timeLord);

  // A planet's placement as deterministic bullets (dignity + house it sits in, houses
  // it rules), under a label that names WHO it is — computed from the chart, not the LLM.
  const buildPlanetGroup = (lord: string, label: string) => {
    const bodies: any[] = (subject as any)?.natalBodies ?? [];
    if (!lord || !lagnaSign || bodies.length === 0) return null;
    const bullets: { head: string; gloss: string }[] = [];
    const b = bodies.find((x) => x.planet === lord);
    if (b) {
      const states = [dignityWord(lord, b.sign), b.isRetrograde ? "retrograde" : null].filter(Boolean) as string[];
      const cond = states.join(" and ");
      const head = cond
        ? `${cond.charAt(0).toUpperCase()}${cond.slice(1)} in the ${ORD[b.house]} house`
        : `In the ${ORD[b.house]} house`;
      bullets.push({ head, gloss: HOUSE_GLOSS[b.house] ?? "" });
    }
    for (const h of housesRuledFromLagna(lord, lagnaSign)) {
      bullets.push({ head: `Rules the ${ORD[h]} house`, gloss: HOUSE_GLOSS[h] ?? "" });
    }
    return bullets.length ? { label, bullets } : null;
  };

  // Core Theme is carried by the year lord; name it so its bullets have a subject.
  const timeLordGroup = buildPlanetGroup(timeLord, `${timeLord} · Time Lord`);
  const coreTakeaway = peelTakeaway(deepRead?.coreTheme?.why ?? "").takeaway;

  // Deterministic Mahadasha / Antardasha breakdown — placement + ruled houses for
  // each current dasha lord, computed straight from the chart (not the LLM).
  const dashaGroups = (() => {
    const cur: any = (dashaTimeline as any)?.entries?.find((e: any) => e.isCurrent);
    if (!cur) return [];
    return [
      buildPlanetGroup(cur.mahadasha, `${cur.mahadasha} Mahadasha`),
      buildPlanetGroup(cur.antardasha, `${cur.antardasha} Antardasha`),
    ].filter(Boolean) as { label: string; bullets: { head: string; gloss: string }[] }[];
  })();

  // The interpretive takeaway = the part of whyNow.why after a late em dash.
  const dashaTakeaway = peelTakeaway(deepRead?.whyNow?.why ?? "").takeaway;

  return (
    <div style={{ padding: "2rem", maxWidth: "900px", margin: "0 auto", paddingBottom: "7rem" }}>
      <div style={{ marginBottom: "1.5rem" }}>
        <AppHeader pageTitle="Your Charts" />
      </div>

      {/* Chart tabs — Time Lord · Natal · Dasha (3 clickable views, like before) */}
      <div style={{ display: "flex", gap: "0.25rem", padding: "0.25rem", borderRadius: "0.75rem", background: "var(--muted)", marginBottom: "1.5rem" }}>
        {CHART_TABS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => setChartTab(id)}
            style={{
              flex: 1,
              borderRadius: "0.5rem",
              padding: "0.55rem",
              fontSize: "0.8rem",
              fontWeight: 700,
              cursor: "pointer",
              transition: "all 200ms ease",
              background: chartTab === id ? `color-mix(in srgb, ${modeColor} 15%, var(--card))` : "transparent",
              color: chartTab === id ? modeColor : TEXT_MUTED,
              border: chartTab === id ? `1px solid ${modeColor}` : "1px solid transparent",
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {chartTab === "natal" && <NatalSection />}
      {chartTab === "dasha" && <DashaSection />}

      {chartTab === "timelord" && (<>
      {/* What a Time Lord / profection year is — short explainer */}
      {panel("How profection works", explainerOpen, setExplainerOpen, (
        <p style={{ color: TEXT_PRIMARY, fontSize: "0.98rem", lineHeight: 1.65, margin: 0 }}>
          In astrology, <strong>annual profection</strong> is an ancient timing technique that follows the
          movement of your <strong>Lagna</strong> (Ascendant, Rising Sign), which activates one house of your
          birth chart each year of your life. At birth you are age 0 and your <strong>1st house</strong> is
          activated; at age 1, the 2nd house; and after 12 years the cycle repeats. The ruler of the activated
          house is your <strong>Time Lord</strong> — the planet running your year.
        </p>
      ))}

      {/* Your Time Lords wheel — open by default */}
      {panel("Your Time Lords (from birth to 120 years old)", wheelOpen, setWheelOpen, (
        <ProfectionWheel lagnaSign={lagnaSign} age={age} headingColor={modeColor} />
      ))}

      {/* WHY NOW? — deterministic logic chain (computed from the chart, auditable) */}
      {panel("Why now?", whyNowOpen, setWhyNowOpen, (
        <WhyNowChain
          age={age}
          activatedHouse={activatedHouse}
          activatedSign={activatedSign}
          timeLord={timeLord}
          tlNatalHouse={tlBody?.house}
          tlNatalSign={tlBody?.sign}
          tlNatalNakshatra={tlBody?.nakshatra}
          accentColor={modeColor}
        />
      ))}

      {/* This year's life areas — the houses this profection year activates ("the party") */}
      {(() => {
        const yearAreas = LIFE_AREAS.filter((a) => a.houses.includes(activatedHouse));
        if (yearAreas.length === 0) return null;
        return panel("This year's life areas", areasOpen, setAreasOpen, (
          <>
            <p style={{ fontSize: "0.8rem", color: TEXT_MUTED, marginBottom: "1rem", lineHeight: 1.5 }}>
              House {activatedHouse} is lit up this year, so these are the areas of life in focus. Tasks you tag with them rise on days the year's themes are echoed.
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
              {yearAreas.map((a) => (
                <span
                  key={a.key}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.4rem",
                    fontSize: "0.8rem",
                    fontWeight: 500,
                    padding: "0.3rem 0.6rem",
                    borderRadius: "0.4rem",
                    background: `color-mix(in srgb, ${modeColor} 8%, transparent)`,
                    color: TEXT_MUTED,
                    cursor: "default",
                  }}
                >
                  <span style={{ width: "5px", height: "5px", borderRadius: "999px", background: modeColor, flexShrink: 0 }} />
                  {a.label}
                </span>
              ))}
            </div>
          </>
        ));
      })()}

      {/* LLM Deep Read — the full structured read (The Read). Sits ABOVE Current Trigger.
          Each heading is its own accordion: closed = flat color, open = subtle gradient. */}
      {deepRead && panel("The Read · your year", readOpen, setReadOpen, (
        <>
          {readAccordion("Core Theme", s1, setS1, (
            <>
              <p style={{ color: "rgba(255,255,255,0.96)", fontSize: "1rem", lineHeight: 1.7, margin: 0 }}>{deepRead.coreTheme.synthesis}</p>
              {timeLordGroup ? (
                <>
                  {planetGroupBlock(timeLordGroup)}
                  {coreTakeaway && goldTakeaway(coreTakeaway)}
                </>
              ) : (
                deepRead.coreTheme.why && whyBlock(deepRead.coreTheme.why)
              )}
            </>
          ))}

          {readAccordion("Your Current Karmic Chapter — Dasha", s2, setS2, (
            <>
              <p style={{ color: "rgba(255,255,255,0.96)", fontSize: "1rem", lineHeight: 1.7, margin: 0 }}>{deepRead.whyNow.synthesis}</p>
              {dashaGroups.length > 0 ? (
                dashaGroups.map((g) => <div key={g.label}>{planetGroupBlock(g)}</div>)
              ) : (
                deepRead.whyNow.why && whyBlock(deepRead.whyNow.why)
              )}
              {dashaGroups.length > 0 && dashaTakeaway && goldTakeaway(dashaTakeaway)}
            </>
          ))}

          {deepRead.manifestations?.length > 0 && readAccordion("Possible Manifestations", s3, setS3, (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
              {deepRead.manifestations.map((m, i) => (
                <div key={i} style={{ background: "rgba(0,0,0,0.18)", borderRadius: "0.7rem", padding: "0.85rem 1rem" }}>
                  <p style={{ color: "#E7C766", fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" as const, margin: "0 0 0.4rem" }}>{m.area}</p>
                  <p style={{ color: "rgba(255,255,255,0.96)", fontSize: "0.95rem", lineHeight: 1.55, margin: 0 }}>{m.synthesis}</p>
                  {m.why && whyBlock(m.why)}
                </div>
              ))}
            </div>
          ))}

          {readAccordion("The Lesson", s5, setS5, sectionBody(deepRead.developmentalTask))}

          {deepRead.confidence && readAccordion(`${deepRead.confidence.level} Confidence`, s6, setS6, (
            <>
              <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {deepRead.confidence.factors?.map((f, i) => (
                  <li key={i} style={{ display: "flex", gap: "0.5rem", alignItems: "baseline", lineHeight: 1.55 }}>
                    <span style={{ color: "rgba(255,255,255,0.55)", flexShrink: 0 }}>·</span>
                    <span style={{ fontSize: "0.95rem" }}>
                      <span style={{ color: "rgba(255,255,255,0.96)", fontWeight: 600 }}>{f.plain}</span>
                      {f.astro && <span style={{ color: "rgba(255,255,255,0.66)" }}>{" — "}{f.astro}</span>}
                    </span>
                  </li>
                ))}
              </ul>
              <p style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.82rem", margin: "0.75rem 0 0", fontStyle: "italic" }}>The more independent techniques point at one life area, the higher the confidence.</p>
            </>
          ))}
        </>
      ))}
      {!deepRead && deepReadLoading && (
        <div style={{ borderRadius: "20px", background: "var(--card)", border: "1px solid var(--border)", padding: "1.5rem", marginBottom: "1.25rem", color: TEXT_MUTED, fontSize: "0.85rem" }}>
          Generating your reading…
        </div>
      )}

      {/* CURRENT TRIGGER — deterministic transit breakdown (ephemeris math, auditable) */}
      {triggerData?.available && panel("Current Trigger", triggerOpen, setTriggerOpen, ombre(
        <CurrentTriggerBreakdown
          transits={triggerData.transits}
          activatedHouse={triggerData.activatedHouse}
          timeLord={triggerData.timeLord}
          accentColor="rgba(255,255,255,0.85)"
          onDark
        />
      ))}

      {/* Current Time Lord Movement */}
      {panel("Current Time Lord Movement", tlOpen, setTlOpen, ombre(
        <>
          <p style={{ color: "rgba(255,255,255,0.9)", fontSize: "0.95rem", lineHeight: 1.65, marginBottom: "1rem" }}>
            When the Time Lord moves, life moves. As it passes through each house, that area of your life is activated in turn — and the <strong>friction</strong> you feel there shows you what needs to be resolved.
          </p>
          {tlTransit?.house != null && (
            <div style={{ marginBottom: "1rem" }}>
              <p style={{ color: "#fff", fontSize: "0.98rem", fontWeight: 700, lineHeight: 1.5, margin: "0 0 0.35rem" }}>
                Chapter: {HOUSE_GLOSS[tlTransit.house] ?? "this area of life"} (your {ORD[tlTransit.house]} house)
              </p>
              <p style={{ color: "rgba(255,255,255,0.9)", fontSize: "0.95rem", lineHeight: 1.6, margin: 0 }}>
                Your Time Lord {tlTransit.timeLord} is passing through this part of your chart right now — so this is the life-area where the year's growth and friction actually play out.
              </p>
            </div>
          )}
          <TimeLordMovement selectedDate={todayDateStr} variant="immersive" accentColor={accentColor} darkColor={darkColor} bestUses={deepRead?.chapterGoodFor} avoid={deepRead?.chapterAvoid} />
        </>
      ))}

      {panel("Time Lord Movement This Year", s4, setS4, ombre(
        <div>
          {transitsError ? (
            <p style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.95rem" }}>Error loading transits.</p>
          ) : transitsLoading ? (
            <p style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.95rem" }}>Loading...</p>
          ) : transitsData?.transits?.length ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {transitsData.transits.map((transit: any, idx: number) => {
                const isExpanded = expandedTransitId === idx;
                const today = new Date().toISOString().split('T')[0];
                const isCurrent = transit.startDate <= today && today <= transit.endDate;
                return (
                  <div key={idx} style={{ border: `1.5px solid ${isCurrent ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.15)"}`, borderRadius: "0.5rem", overflow: "hidden", background: isCurrent ? "rgba(255,255,255,0.92)" : "rgba(0,0,0,0.14)" }}>
                    <button type="button" onClick={() => setExpandedTransitId(isExpanded ? null : idx)} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.75rem 1rem", background: "transparent", border: "none", cursor: "pointer" }}>
                      <p style={{ margin: 0, fontWeight: isCurrent ? 700 : 500, color: isCurrent ? "#111111" : "rgba(255,255,255,0.9)", fontSize: "0.95rem" }}>
                        {transit.startDate} – {transit.endDate} — {transit.sign} in House {transit.house}
                      </p>
                      <ChevronDown size={16} style={{ color: isCurrent ? "#111111" : "rgba(255,255,255,0.6)", transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 200ms ease", flexShrink: 0, marginLeft: "0.5rem" }} />
                    </button>
                    {isExpanded && (
                      <div style={{ padding: "1rem", borderTop: `1px solid ${isCurrent ? "rgba(0,0,0,0.12)" : "rgba(255,255,255,0.12)"}`, display: "flex", flexDirection: "column", gap: "0.75rem", fontSize: "0.95rem" }}>
                        {[["Motion", transit.isRetrograde ? "Retrograde" : "Direct"], ["Combustion", transit.combustionStatus ? "Yes" : "No"], ["Solitary", transit.solitaryStatus ? "Yes" : "No"]].map(([label, value]) => (
                          <div key={String(label)} style={{ display: "flex", justifyContent: "space-between" }}>
                            <span style={{ color: isCurrent ? "rgba(0,0,0,0.55)" : "rgba(255,255,255,0.6)" }}>{label}:</span>
                            <span style={{ color: isCurrent ? "rgba(0,0,0,0.88)" : "rgba(255,255,255,0.92)", fontWeight: 500 }}>{value}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <p style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.95rem" }}>No transit data available.</p>
          )}
        </div>
      ))}

      </>)}

    </div>
  );
}
