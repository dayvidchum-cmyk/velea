import { trpc } from "../lib/trpc";
import { NatalSection, DashaSection } from "./Astrology";
import { useState, useMemo } from "react";
import { ChevronDown, Users, X } from "lucide-react";
import { createPortal } from "react-dom";
import LockedFeatureCard from "@/components/LockedFeatureCard";
import { useAuth } from "@/_core/hooks/useAuth";
import VeleaMark from "@/components/VeleaMark";
import AppHeader from "@/components/AppHeader";
import { useDayModeColor } from "@/hooks/useDayModeColor";
import { ProfectionWheel } from "@/components/ProfectionWheel";
import { WhyNowChain } from "@/components/WhyNowChain";
import MeridianCard from "@/components/MeridianCard";
import GlossaryText from "@/components/GlossaryText";
import { CurrentTriggerBreakdown } from "@/components/CurrentTriggerBreakdown";
import { PANCHANG_TO_TASK_MODE, MODE_OKLCH, MODE_DARK, type TaskMode } from "../../../shared/types";
import { LIFE_AREAS } from "../../../shared/life-areas";

// The `why` breakdown weaves chart mechanics with short "mini-synthesis" lines of plain
// meaning. Sentence-level split: a sentence carrying chart apparatus (planet / nakshatra /
// house number / rulership verb) recedes to grey; a plain-language sentence stays black.
const NAK = "Ashwini|Bharani|Krittika|Rohini|Mrigashira|Ardra|Punarvasu|Pushya|Ashlesha|Magha|Phalguni|Hasta|Chitra|Swati|Vishakha|Anuradha|Jyeshtha|Mula|Ashadha|Shravana|Dhanishta|Shatabhisha|Bhadrapada|Revati";
const APPARATUS = new RegExp(`\\b(?:Sun|Moon|Mars|Mercury|Jupiter|Venus|Saturn|Rahu|Ketu|Lagna|Ascendant|rules?|ruled|ruler|lords?|sits?|sitting|occup\\w+|placed|posited|exalt\\w*|debilit\\w*|combust\\w*|retrograde|nakshatra|dasha|mahadasha|antardasha|pratyantardasha|profection|house|\\d{1,2}(?:st|nd|rd|th)|${NAK})\\b`, "i");
function renderWhy(text: string, muted: string, base: string) {
  const chunks = text.match(/[^.!?]+[.!?]*\s*/g) ?? [text];
  return chunks.map((c, i) => <span key={i} style={{ color: APPARATUS.test(c) ? muted : base }}>{c}</span>);
}

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
// Sign colors + glyphs for the Time Lord movement ribbon (mirrors ProfectionWheel).
const SIGN_COLOR: Record<string, string> = {
  Aries: "#E23B4E", Scorpio: "#8E1E3A", Taurus: "#F4A9C2", Libra: "#B23A78",
  Gemini: "#7FD4B8", Virgo: "#2E9C7C", Cancer: "#A9B4C2", Leo: "#EE9A2E",
  Sagittarius: "#E6C24A", Pisces: "#B0851F", Capricorn: "#6E7BD4", Aquarius: "#313E8C",
};
const SIGN_GLYPH: Record<string, string> = {
  Aries: "♈︎", Taurus: "♉︎", Gemini: "♊︎", Cancer: "♋︎", Leo: "♌︎", Virgo: "♍︎",
  Libra: "♎︎", Scorpio: "♏︎", Sagittarius: "♐︎", Capricorn: "♑︎", Aquarius: "♒︎", Pisces: "♓︎",
};
const GLYPH_FONT = "'Apple Symbols','Segoe UI Symbol','Noto Sans Symbols2',serif";
// Whole-sign house of a transiting sign from the lagna — recomputed at display time
// so a stale stored `house` (from an old lagna) can never show a wrong number.
function houseFromSign(lagnaSign: string, sign: string): number {
  const li = ZODIAC.indexOf(lagnaSign);
  const si = ZODIAC.indexOf(sign);
  if (li < 0 || si < 0) return 0;
  return ((si - li + 12) % 12) + 1;
}
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
  const [s5, setS5] = useState(false);
  const [s6, setS6] = useState(false);
  const [tlOpen, setTlOpen] = useState(false);
  const [roadOpen, setRoadOpen] = useState(false);
  const [explainerOpen, setExplainerOpen] = useState(false);
  const [wheelOpen, setWheelOpen] = useState(true); // wheel is the tab's ONE primary — stays open
  const [whyNowOpen, setWhyNowOpen] = useState(false);
  const [areasOpen, setAreasOpen] = useState(false);
  const [readOpen, setReadOpen] = useState(false);
  const [expandedTransitId, setExpandedTransitId] = useState<number | null>(null);
  const [chartTab, setChartTab] = useState<"timelord" | "natal" | "dasha">("timelord");
  const CHART_TABS: { id: "timelord" | "natal" | "dasha"; label: string }[] = [
    { id: "timelord", label: "Time Lord" },
    { id: "natal", label: "Natal" },
    { id: "dasha", label: "Dasha" },
  ];

  const { data: profectionData, error: profectionError } = trpc.profection.current.useQuery();
  const { data: transitsData, error: transitsError, isLoading: transitsLoading } = trpc.profection.timeLordTransits.useQuery(undefined, {
    enabled: tlOpen, // the merged Time Lord Movement panel gates the year-ribbon fetch
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
    // TAP TO GENERATE: the deep read is an LLM call, so it fires ONLY when the reader opens
    // "The Read · your year" (readOpen) — never automatically on page load. No surprise cost.
    { enabled: !!deepProfileId && readOpen, staleTime: 1000 * 60 * 60 },
  );
  const deepRead = deepReadResult?.read ?? null;

  // Chapter good-for/avoid bullets — a SMALL, cheap, auto-firing LLM call (split out of the
  // big tap-gated deep read) so the "Best uses / Ease off" lists show WITHOUT tapping The Read.
  const { data: chapterResult } = trpc.narrative.chapter.useQuery(
    { profileId: deepProfileId as number, date: localToday },
    { enabled: !!deepProfileId, staleTime: 1000 * 60 * 60 },
  );
  const chapterGoodFor = chapterResult?.chapter?.chapterGoodFor ?? [];
  const chapterAvoid = chapterResult?.chapter?.chapterAvoid ?? [];

  // ADMIN-ONLY upsell preview: the "stage + guests" deepened read (current sky folded in),
  // fetched fresh on tap so David can test it in real time. Non-admins can't obtain it —
  // the server forces deepened=false off the admin allowlist.
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  // The Road Ahead is admin-only (David) for now — only query it for admins.
  const { data: arcData, isLoading: arcLoading, error: arcError } = trpc.arc.forward.useQuery(undefined, { retry: false, enabled: isAdmin });
  const utils = trpc.useUtils();
  const [guestsOpen, setGuestsOpen] = useState(false);
  const [guestsLoading, setGuestsLoading] = useState(false);
  const [guestsRead, setGuestsRead] = useState<any | null>(null);
  const openGuests = async () => {
    if (!deepProfileId) return;
    setGuestsOpen(true);
    setGuestsLoading(true);
    try {
      const res = await utils.narrative.deepRead.fetch({ profileId: deepProfileId, date: localToday, deepened: true, refresh: true });
      setGuestsRead(res?.read ?? null);
    } finally {
      setGuestsLoading(false);
    }
  };

  // Where the Time Lord is transiting right now — used to name the current "chapter".
  const { data: tlTransit } = trpc.timeLordTransit.forDate.useQuery(
    { date: localToday },
    { enabled: !!localToday },
  );
  const taskMode: TaskMode | undefined = todayPanchang?.mode
    ? PANCHANG_TO_TASK_MODE[todayPanchang.mode as keyof typeof PANCHANG_TO_TASK_MODE]
    : undefined;

  const tlGradient = taskMode === 'Action' ? 'var(--velea-action-gradient)'
    : taskMode === 'Build' ? 'var(--velea-build-gradient)'
    : taskMode === 'Selective' ? 'var(--velea-selective-gradient)'
    : taskMode === 'Restraint' ? 'var(--velea-restraint-gradient)'
    : 'var(--card)';

  // Angled (diagonal) variant for short closed accordion bars — a horizontal/vertical
  // gradient reads oddly squeezed into the thin closed strip.
  const tlCardGradient = taskMode === 'Action' ? 'var(--velea-action-card-gradient)'
    : taskMode === 'Build' ? 'var(--velea-build-card-gradient)'
    : taskMode === 'Selective' ? 'var(--velea-selective-card-gradient)'
    : taskMode === 'Restraint' ? 'var(--velea-restraint-card-gradient)'
    : 'var(--card)';

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
    <div style={{ borderRadius: "var(--radius-card)", background: "var(--card)", border: "1px solid var(--border)", marginBottom: "1.25rem", overflow: "hidden" }}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "1.1rem 1.25rem", background: "transparent", border: "none", cursor: "pointer", textAlign: "left" }}
      >
        <span style={{ fontSize: "0.8rem", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase" as const, color: modeColor }}>{title}</span>
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
      <VeleaMark size={17} color="#E7C766" style={{ flexShrink: 0, marginTop: "0.15rem" }} />
      <p style={{ color: "rgba(255,255,255,0.95)", fontSize: "0.95rem", lineHeight: 1.55, margin: 0, fontWeight: 600 }}><GlossaryText>{text.charAt(0).toUpperCase() + text.slice(1)}</GlossaryText></p>
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
    <div className="container" style={{ paddingTop: "1.5rem", paddingBottom: "7rem" }}>
      <AppHeader pageTitle="Your Charts" />
      <p style={{ color: TEXT_MUTED, marginTop: "1rem" }}>Error: {profectionError.message}</p>
    </div>
  );

  if (!profectionData) return (
    <div className="container" style={{ paddingTop: "1.5rem", paddingBottom: "7rem" }}>
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
    <div className="container" style={{ paddingTop: "1.5rem", paddingBottom: "7rem" }}>
      <div style={{ marginBottom: "1.5rem" }}>
        <AppHeader pageTitle="Your Charts" />
      </div>

      {/* Chart tabs — Time Lord · Natal · Dasha (3 clickable views, like before) */}
      <div data-tour="chart-tabs" style={{ display: "flex", gap: "0.25rem", padding: "0.25rem", borderRadius: "0.75rem", background: "transparent", marginBottom: "1.5rem" }}>
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
      {/* ── HOW PROFECTION WORKS — a small mode-colored link that opens a pop-up
          (sibling to "What are day modes?" on the Today page) ── */}
      {explainerOpen && createPortal(
        <div
          onClick={() => setExplainerOpen(false)}
          style={{ position: "fixed", inset: 0, zIndex: 90, background: "rgba(0,0,0,0.62)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ width: "100%", maxWidth: 480, maxHeight: "85vh", display: "flex", flexDirection: "column", overflow: "hidden", background: "var(--color-card)", border: "1px solid var(--border)", borderRadius: 20 }}
          >
            <div style={{ flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, padding: "1rem 1.3rem", borderBottom: "1px solid var(--border)", background: "var(--color-card)" }}>
              <span style={{ fontSize: "0.8rem", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase" as const, color: modeColor }}>How profection works</span>
              <button onClick={() => setExplainerOpen(false)} aria-label="Close" style={{ flexShrink: 0, width: 30, height: 30, borderRadius: 999, display: "flex", alignItems: "center", justifyContent: "center", background: `color-mix(in srgb, ${modeColor} 18%, transparent)`, border: `1px solid color-mix(in srgb, ${modeColor} 34%, transparent)`, color: modeColor, cursor: "pointer" }}>
                <X size={16} strokeWidth={2.5} />
              </button>
            </div>
            <div style={{ overflowY: "auto", padding: "1rem 1.3rem 1.3rem" }}>
              <p style={{ color: TEXT_PRIMARY, fontSize: "0.98rem", lineHeight: 1.65, margin: 0 }}>
                In astrology, <strong>annual profection</strong> is an ancient timing technique that follows the
                movement of your <strong>Lagna</strong> (Ascendant, Rising Sign), which activates one house of your
                birth chart each year of your life. At birth you are age 0 and your <strong>1st house</strong> is
                activated; at age 1, the 2nd house; and after 12 years the cycle repeats. The themes of the
                activated house become the focus of the year. The ruler of the activated house is your{" "}
                <strong>Time Lord</strong> — the planet running your year.
              </p>
            </div>
          </div>
        </div>,
        document.body,
      )}
      <button
        type="button"
        onClick={() => setExplainerOpen(true)}
        className="inline-flex items-center gap-1"
        style={{ background: "none", border: "none", cursor: "pointer", padding: "0.2rem 0", marginBottom: "1.25rem", color: modeColor, fontSize: "0.8rem", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase" as const, opacity: 0.82 }}
      >
        How profection works <span aria-hidden style={{ fontSize: "0.85rem", opacity: 0.9 }}>ⓘ</span>
      </button>

      {/* Your Time Lords wheel — open by default. "Why this year?" (the causal chain + the Time Lord's
          natal placement) is folded in here as a nested, collapsed toggle: it echoed the wheel's own
          headline as a standalone panel, so only its unique detail lives on, opt-in, under the wheel. */}
      <div data-tour="profection-wheel">
      {panel("Your Time Lords (from birth to 120 years old)", wheelOpen, setWheelOpen, (
        <ProfectionWheel
          lagnaSign={lagnaSign}
          age={age}
          headingColor={modeColor}
          whySlot={(
            <div style={{ borderTop: "1px solid var(--border)", paddingTop: "1rem" }}>
              <button
                type="button"
                onClick={() => setWhyNowOpen(!whyNowOpen)}
                style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", background: "none", border: "none", padding: 0, cursor: "pointer", textAlign: "left" }}
              >
                <span style={{ fontSize: "0.8rem", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase" as const, color: modeColor }}>Your year, explained</span>
                <ChevronDown size={16} style={{ color: modeColor, opacity: 0.7, flexShrink: 0, transform: whyNowOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 200ms ease" }} />
              </button>
              {whyNowOpen && (
                <div style={{ marginTop: "0.9rem" }}>
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
                </div>
              )}
            </div>
          )}
        />
      ))}
      </div>

      {/* The Meridian — MC/IC voice axis + who's activating it now (read-only) */}
      <MeridianCard />

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
      {/* "Your year, right now" — PUBLIC BUT LOCKED (same pattern as Time Master): everyone
          sees the tile; only the entitled (admin, for now) get the live deepened read. The
          server independently forces deepened=false off the allowlist, so nothing can leak. */}
      {!isAdmin ? (
        <div style={{ margin: "0 0 1rem" }}>
          <LockedFeatureCard
            title="Your year, right now"
            teaser="Your stage, plus the guests on it right now."
            detail="Deepens your year's reading with the current sky — pratyantardaśā, live transits, combustion, eclipse — regenerated the moment you open it. A premium layer, not yet unlocked."
          />
        </div>
      ) : deepRead ? (
        <button
          onClick={openGuests}
          style={{
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8, width: "100%",
            margin: "0 0 1rem", padding: "0.7rem 1rem", borderRadius: 14, cursor: "pointer",
            background: "color-mix(in srgb, #E7C766 14%, transparent)", border: "1px solid #C9A84C",
            color: "#C9A84C", fontSize: "0.8rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase",
          }}
        >
          <Users size={15} /> Your year, right now
        </button>
      ) : null}

      {guestsOpen && createPortal(
        <div
          onClick={() => setGuestsOpen(false)}
          style={{ position: "fixed", inset: 0, zIndex: 90, background: "rgba(0,0,0,0.62)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ width: "100%", maxWidth: 480, maxHeight: "85vh", display: "flex", flexDirection: "column", overflow: "hidden", background: "var(--color-card)", border: "1px solid #E7C766", borderRadius: 20 }}
          >
            {/* pinned header — stays put so the × is always reachable; grounds the read */}
            <div style={{ flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, padding: "1rem 1.3rem", borderBottom: "1px solid color-mix(in srgb, #E7C766 30%, transparent)", background: "var(--color-card)" }}>
              <span style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 700, color: "#C9A84C", fontSize: "0.78rem", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                <Users size={15} /> Your year, right now
              </span>
              <button onClick={() => setGuestsOpen(false)} aria-label="Close" style={{ flexShrink: 0, width: 30, height: 30, borderRadius: 999, display: "flex", alignItems: "center", justifyContent: "center", background: "color-mix(in srgb, #C9A84C 18%, transparent)", border: "1px solid color-mix(in srgb, #C9A84C 34%, transparent)", color: "#C9A84C", cursor: "pointer" }}>
                <X size={16} strokeWidth={2.5} />
              </button>
            </div>

            {/* scrolling body */}
            <div style={{ overflowY: "auto", padding: "1rem 1.3rem 1.3rem" }}>
              <p style={{ fontSize: "0.7rem", color: "var(--color-muted-foreground)", margin: "0 0 1rem", lineHeight: 1.5 }}>
                Premium preview · admin and select test users only. The stage, plus the guests on it right now — pratyantardaśā, transits, combustion, eclipse. Regenerated live each open.
              </p>
              {guestsLoading || !guestsRead ? (
                <div style={{ padding: "2rem 0", textAlign: "center", color: "var(--color-muted-foreground)", fontStyle: "italic", fontSize: "0.9rem" }}>
                  Reading the current sky…
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "1.1rem" }}>
                  {[
                    { label: "Core Theme", sec: guestsRead.coreTheme },
                    { label: "Why Now", sec: guestsRead.whyNow },
                    { label: "The Lesson", sec: guestsRead.developmentalTask },
                  ].filter((x) => x.sec?.synthesis).map(({ label, sec }) => (
                    <div key={label}>
                      <p style={{ fontSize: "0.66rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "#C9A84C", margin: "0 0 0.35rem" }}>{label}</p>
                      <p style={{ fontSize: "0.95rem", lineHeight: 1.65, color: "var(--color-foreground)", fontWeight: 550, margin: 0 }}>{sec.synthesis}</p>
                      {sec.why && <p style={{ fontSize: "0.8rem", lineHeight: 1.55, margin: "0.4rem 0 0" }}>{renderWhy(sec.why, "var(--color-muted-foreground)", "var(--color-foreground)")}</p>}
                    </div>
                  ))}
                  {guestsRead.manifestations?.length > 0 && (
                    <div>
                      <p style={{ fontSize: "0.66rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "#C9A84C", margin: "0 0 0.35rem" }}>Possible Manifestations</p>
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                        {guestsRead.manifestations.map((m: any, i: number) => (
                          <p key={i} style={{ fontSize: "0.9rem", lineHeight: 1.55, color: "var(--color-foreground)", fontWeight: 550, margin: 0 }}>{m.synthesis}</p>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

      {panel("The Read · your year", readOpen, setReadOpen, (
        deepRead ? (
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
                  <p style={{ color: "#E7C766", fontSize: "0.8rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" as const, margin: "0 0 0.4rem" }}>{m.area}</p>
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
        ) : (
          <div style={{ padding: "0.5rem 0", color: TEXT_MUTED, fontSize: "0.9rem", lineHeight: 1.6 }}>
            {deepReadLoading
              ? "Generating your reading… this can take up to a minute the first time."
              : "Tap to generate your full year reading."}
          </div>
        )
      ))}

      {/* CURRENT TRIGGER — deterministic transit breakdown (ephemeris math, auditable) */}
      {/* ── TIME LORD MOVEMENT — merged (was Current Trigger + Current Time Lord Movement + Time
          Lord Movement This Year). The "right now" immersive summary — the chapter the Time Lord
          is in, what it's good for, and today's transit trigger — sits over the full-year ribbon,
          with today marked on the ribbon as the current point. ── */}
      {panel("Time Lord Movement", tlOpen, setTlOpen, (
        <div>
          {/* Right now — immersive summary (ombre), then the year ribbon below it. */}
          <div style={{ marginBottom: "1.1rem" }}>
          {ombre(
            <>
              <p style={{ color: "rgba(255,255,255,0.9)", fontSize: "0.95rem", lineHeight: 1.65, marginBottom: tlTransit?.house != null ? "1rem" : 0 }}>
                When the Time Lord moves, life moves. As it passes through each house, that area of your life is activated in turn — and the <strong>friction</strong> you feel there shows you what needs to be resolved.
              </p>
              {tlTransit?.house != null && (
                <div style={{ marginBottom: (chapterGoodFor.length || chapterAvoid.length || triggerData?.available) ? "1.1rem" : 0 }}>
                  <p style={{ color: "#fff", fontSize: "0.98rem", fontWeight: 700, lineHeight: 1.5, margin: "0 0 0.35rem" }}>
                    Right now: {HOUSE_GLOSS[tlTransit.house] ?? "this area of life"} (your {ORD[tlTransit.house]} house)
                  </p>
                  <p style={{ color: "rgba(255,255,255,0.9)", fontSize: "0.95rem", lineHeight: 1.6, margin: 0 }}>
                    Your Time Lord {tlTransit.timeLord} is passing through this part of your chart right now — so this is the life-area where the year's growth and friction actually play out.
                  </p>
                </div>
              )}
              {(chapterGoodFor.length || chapterAvoid.length) ? (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: triggerData?.available ? "1.1rem" : 0 }}>
                  {chapterGoodFor.length ? (
                    <div>
                      <p style={{ margin: "0 0 0.4rem", fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,0.75)" }}>Best uses</p>
                      <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: "0.3rem" }}>
                        {chapterGoodFor.map((t: string) => <li key={t} style={{ fontSize: "0.85rem", color: "#fff", lineHeight: 1.4 }}>{t}</li>)}
                      </ul>
                    </div>
                  ) : null}
                  {chapterAvoid.length ? (
                    <div>
                      <p style={{ margin: "0 0 0.4rem", fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,0.6)" }}>Ease off</p>
                      <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: "0.3rem" }}>
                        {chapterAvoid.map((t: string) => <li key={t} style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.82)", lineHeight: 1.4 }}>{t}</li>)}
                      </ul>
                    </div>
                  ) : null}
                </div>
              ) : null}
              {triggerData?.available && (
                <div style={{ borderTop: "1px solid rgba(255,255,255,0.18)", paddingTop: "1.1rem" }}>
                  <p style={{ margin: "0 0 0.6rem", fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,0.75)" }}>Today's trigger</p>
                  <CurrentTriggerBreakdown
                    transits={triggerData.transits}
                    activatedHouse={triggerData.activatedHouse}
                    timeLord={triggerData.timeLord}
                    accentColor="rgba(255,255,255,0.85)"
                    onDark
                  />
                </div>
              )}
            </>
          )}
          </div>
          {transitsError ? (
            <p style={{ color: TEXT_MUTED, fontSize: "0.95rem" }}>Error loading transits.</p>
          ) : transitsLoading ? (
            <p style={{ color: TEXT_MUTED, fontSize: "0.95rem" }}>Loading...</p>
          ) : transitsData?.transits?.length ? (
            (() => {
              const segs = transitsData.transits as any[];
              const todayStr = new Date().toISOString().split("T")[0];
              const ms = (d: string) => new Date(d + "T12:00:00").getTime();
              const fmt = (d: string) => new Date(d + "T12:00:00").toLocaleDateString("en-US", { month: "short", year: "numeric" });
              const fmtLong = (d: string) => new Date(d + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
              // Default the detail + highlight to TODAY's segment (the one whose date
              // range contains today), so it never shows a stale past band by default.
              const currentIdx = segs.findIndex((t) => t.startDate <= todayStr && todayStr <= t.endDate);
              const activeIdx = expandedTransitId != null ? expandedTransitId : currentIdx;
              const sel = activeIdx >= 0 ? segs[activeIdx] : null;
              return (
                <div>
                  <p style={{ color: TEXT_MUTED, fontSize: "0.82rem", lineHeight: 1.5, marginBottom: "0.75rem" }}>
                    {timeLord}'s path this year, sign by sign. Tap a band for detail; the Velea mark is today.
                  </p>

                  {/* Ribbon */}
                  <div style={{ position: "relative", display: "flex", width: "100%", height: 52, borderRadius: 12, overflow: "hidden", border: "1px solid var(--border)" }}>
                    {segs.map((t, idx) => {
                      const dur = Math.max(ms(t.endDate) - ms(t.startDate), 1);
                      const color = SIGN_COLOR[t.sign] ?? "#888";
                      const isCurrent = t.startDate <= todayStr && todayStr <= t.endDate;
                      const selected = activeIdx === idx;
                      return (
                        <button
                          key={idx}
                          type="button"
                          title={`${t.sign} · House ${houseFromSign(lagnaSign, t.sign)} · ${fmtLong(t.startDate)}–${fmtLong(t.endDate)}`}
                          onClick={() => setExpandedTransitId(selected ? null : idx)}
                          style={{
                            position: "relative",
                            flex: `${dur} 0 0`, minWidth: 2, height: "100%", background: color,
                            opacity: selected ? 1 : isCurrent ? 0.96 : 0.8,
                            border: "none", borderRight: idx < segs.length - 1 ? "1px solid rgba(0,0,0,0.28)" : "none",
                            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 1,
                            cursor: "pointer", overflow: "hidden", boxShadow: selected ? "inset 0 0 0 2px #fff" : "none",
                          }}
                        >
                          <span style={{ fontFamily: GLYPH_FONT, fontSize: 16, color: "#fff", lineHeight: 1, textShadow: "0 1px 2px rgba(0,0,0,0.55)" }}>{SIGN_GLYPH[t.sign]}</span>
                          {t.retrogradeStatus && <span style={{ fontSize: "0.75rem", color: "#fff", lineHeight: 1, textShadow: "0 1px 2px rgba(0,0,0,0.55)" }}>℞</span>}
                        </button>
                      );
                    })}
                  </div>

                  {/* Literal timeline — a white rule the width of the ribbon, with notches at start,
                      middle, and end (middle labelled with its date), and the Velea mark riding the
                      line at today. The mark still flex-mirrors the ribbon (same flex + minWidth per
                      segment) so it lands INSIDE the true current segment rather than on a neighbor. */}
                  {(() => {
                    const startMs = ms(segs[0].startDate);
                    const endMs = ms(segs[segs.length - 1].endDate);
                    const fmtMs = (m: number) => new Date(m).toLocaleDateString("en-US", { month: "short", year: "numeric" });
                    return (
                      <div style={{ marginTop: "0.55rem" }}>
                        <div style={{ position: "relative", width: "100%", height: 30 }}>
                          {/* the rule */}
                          <div style={{ position: "absolute", left: 0, right: 0, top: "50%", height: 1.5, background: "#fff", transform: "translateY(-50%)" }} />
                          {/* notches — start · middle · end */}
                          {[0, 50, 100].map((pct) => (
                            <div key={pct} style={{ position: "absolute", left: `${pct}%`, top: "50%", width: 1.5, height: 9, background: "#fff", transform: "translate(-50%, -50%)" }} />
                          ))}
                          {/* Velea mark rides the line at today (flex-mirror keeps it in the true segment) */}
                          <div style={{ position: "absolute", left: 0, right: 0, top: "50%", transform: "translateY(-50%)", display: "flex", height: 0 }}>
                            {segs.map((s, idx) => {
                              const dur = Math.max(ms(s.endDate) - ms(s.startDate), 1);
                              const isCur = s.startDate <= todayStr && todayStr <= s.endDate;
                              const segFrac = isCur ? Math.max(0, Math.min(1, (Date.now() - ms(s.startDate)) / dur)) : 0;
                              return (
                                <div key={idx} style={{ flex: `${dur} 0 0`, minWidth: 2, position: "relative" }}>
                                  {isCur && (
                                    <div style={{ position: "absolute", left: `${segFrac * 100}%`, top: 0, transform: "translate(-50%, -50%)", lineHeight: 0, pointerEvents: "none", display: "flex", alignItems: "center", justifyContent: "center", width: 24, height: 24, borderRadius: "50%", background: "var(--card)" }} title="Today">
                                      <VeleaMark size={18} color="var(--brand-gold)" />
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                        {/* date labels under the notches — start · middle · end */}
                        <div style={{ display: "flex", justifyContent: "space-between", marginTop: "0.15rem" }}>
                          <span style={{ color: TEXT_MUTED, fontSize: "0.75rem" }}>{fmtMs(startMs)}</span>
                          <span style={{ color: TEXT_MUTED, fontSize: "0.75rem" }}>{fmtMs((startMs + endMs) / 2)}</span>
                          <span style={{ color: TEXT_MUTED, fontSize: "0.75rem" }}>{fmtMs(endMs)}</span>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Selected segment detail */}
                  {sel && (
                    <div style={{ marginTop: "0.9rem", background: "var(--secondary)", border: "1px solid var(--border)", borderRadius: 12, padding: "0.85rem 1rem" }}>
                      <p style={{ margin: 0, display: "flex", alignItems: "center", gap: "0.5rem", color: TEXT_PRIMARY, fontWeight: 700, fontSize: "0.98rem" }}>
                        <span style={{ fontFamily: GLYPH_FONT, color: SIGN_COLOR[sel.sign] ?? TEXT_PRIMARY }}>{SIGN_GLYPH[sel.sign]}</span>
                        {sel.sign} in the {ORD[houseFromSign(lagnaSign, sel.sign)]} house
                      </p>
                      <p style={{ margin: "0.2rem 0 0.7rem", color: TEXT_MUTED, fontSize: "0.82rem" }}>
                        {fmtLong(sel.startDate)} – {fmtLong(sel.endDate)}
                      </p>
                      {[
                        ["Motion", sel.retrogradeStatus ? "Retrograde" : "Direct"],
                        ["Combustion", sel.secondaryConditions?.combustionStatus ? "Yes" : "No"],
                        // Who else shares the sign — list the guests, or note it travels alone.
                        ["Guests", sel.secondaryConditions?.coPresentPlanets?.length ? sel.secondaryConditions.coPresentPlanets.join(", ") : "Solitary — travels alone"],
                      ].map(([label, value]) => (
                        <div key={String(label)} style={{ display: "flex", justifyContent: "space-between", gap: "1rem", fontSize: "0.88rem", padding: "0.15rem 0" }}>
                          <span style={{ color: TEXT_MUTED, flexShrink: 0 }}>{label}</span>
                          <span style={{ color: TEXT_PRIMARY, fontWeight: 500, textAlign: "right" }}>{value}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })()
          ) : (
            <p style={{ color: TEXT_MUTED, fontSize: "0.95rem" }}>No transit data available.</p>
          )}
        </div>
      ))}

      {isAdmin && panel("The Road Ahead", roadOpen, setRoadOpen, (
        arcError ? (
          <p style={{ color: TEXT_MUTED, fontSize: "0.95rem" }}>Add your birth details to map the road ahead.</p>
        ) : arcLoading ? (
          <p style={{ color: TEXT_MUTED, fontSize: "0.95rem" }}>Mapping your year…</p>
        ) : arcData ? (() => {
          const fmt = (d: string) => new Date(d + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
          const compact = (n: number) => (n <= 0 ? "now" : n < 45 ? `${n}d` : `${Math.round(n / 30.4)}mo`);
          const slow = (arcData.milestones as any[]).filter((m) => m.kind !== "apex");
          const dotColor = (k: string) => (k === "profection" ? "var(--brand-gold)" : k === "dasha" ? modeColor : `color-mix(in srgb, ${modeColor} 68%, #ffffff)`);
          const apex = arcData.apex;
          return (
            <div>
              <p style={{ color: TEXT_MUTED, fontSize: "0.82rem", lineHeight: 1.5, marginBottom: "1rem" }}>
                Where your year is heading — the near apex, then the slow season-turns as they arrive. The sky's shape, not a promise.
              </p>

              {/* Apex hero — the strongest-aligned day in the next 90 */}
              {apex && (
                <div style={{ display: "flex", gap: "0.85rem", alignItems: "center", padding: "1rem 1.1rem", borderRadius: 14, background: "color-mix(in srgb, var(--brand-gold) 12%, var(--card))", border: "1px solid color-mix(in srgb, var(--brand-gold) 40%, transparent)" }}>
                  <VeleaMark size={30} color="var(--brand-gold)" style={{ flexShrink: 0 }} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.13em", textTransform: "uppercase" as const, color: "var(--brand-gold)" }}>{apex.crown ? "Crown apex" : "Peak alignment"}</div>
                    <div style={{ fontSize: "1.05rem", fontWeight: 700, color: TEXT_PRIMARY, marginTop: 2 }}>{fmt(apex.date)} · in {compact(apex.daysAway)}</div>
                    <div style={{ fontSize: "0.82rem", color: TEXT_MUTED, marginTop: 3, lineHeight: 1.45 }}>Your strongest-aligned day in the next 90 — {arcData.crownCount} crown day{arcData.crownCount === 1 ? "" : "s"} in that window.</div>
                  </div>
                </div>
              )}

              {/* The road — a vertical line of the slow turns approaching */}
              {slow.length > 0 && (
                <div style={{ marginTop: "1.15rem" }}>
                  {slow.map((m, i) => {
                    const isLast = i === slow.length - 1;
                    return (
                      <div key={i} style={{ display: "flex", gap: "0.85rem", alignItems: "stretch" }}>
                        {/* rail: continuous line + a node punched over it */}
                        <div style={{ position: "relative", width: 12, flexShrink: 0, display: "flex", justifyContent: "center" }}>
                          {!isLast && <div style={{ position: "absolute", top: 6, bottom: 0, width: 2, background: `color-mix(in srgb, ${modeColor} 34%, transparent)` }} />}
                          <div style={{ position: "absolute", top: 4, width: 11, height: 11, borderRadius: "50%", background: dotColor(m.kind), boxShadow: "0 0 0 3px var(--card)" }} />
                        </div>
                        {/* content */}
                        <div style={{ flex: 1, minWidth: 0, paddingBottom: isLast ? 0 : "1.15rem" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", gap: "0.6rem", alignItems: "baseline" }}>
                            <span style={{ color: TEXT_PRIMARY, fontWeight: 700, fontSize: "0.95rem" }}>{m.title}</span>
                            <span style={{ color: modeColor, fontWeight: 700, fontSize: "0.72rem", whiteSpace: "nowrap" as const }}>{compact(m.daysAway)}</span>
                          </div>
                          <div style={{ color: TEXT_MUTED, fontSize: "0.82rem", lineHeight: 1.5, marginTop: 3 }}><GlossaryText>{m.detail}</GlossaryText></div>
                          <div style={{ color: TEXT_MUTED, fontSize: "0.72rem", marginTop: 3, opacity: 0.8 }}>{fmt(m.date)}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })() : (
          <p style={{ color: TEXT_MUTED, fontSize: "0.95rem" }}>No road data available.</p>
        )
      ))}

      </>)}

    </div>
  );
}
