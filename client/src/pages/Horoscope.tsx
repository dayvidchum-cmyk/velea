import { useEffect, useMemo, useRef, useState, type ReactNode, type CSSProperties } from "react";
import { useLocation } from "wouter";
import { ChevronLeft, ChevronRight, ChevronDown, Loader2 } from "lucide-react";
import OctagramMark from "@/components/OctagramMark";
import AppHeader from "@/components/AppHeader";
import LockedFeatureCard from "@/components/LockedFeatureCard";
import VeleaLorMark from "@/components/VeleaLorMark";
import GlossaryText from "@/components/GlossaryText";
import MasterModeCard from "@/components/MasterModeCard";
import HoraCard from "@/components/HoraCard";
import LocationChip from "@/components/LocationChip";
import { useDayModeColor } from "@/hooks/useDayModeColor";
import { trpc } from "@/lib/trpc";

/**
 * HOROSCOPE — the "pick a date" premium reading. A clean month calendar: tap any day, reveal
 * ("purchase") its date-specific deep read, and keep your own notes under it. Purchased dates are
 * marked with the Veleal'or bullseye so you can scroll back through every reading you own. Gated by
 * horoscope.access (same allowlist as Time Master) — non-entitled users see the locked card.
 */

const GOLD = "#D4AF37";
const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

// The life areas the reading can be pointed at — each routes server-side to its own divisional
// chart (life-areas.ts, from Kurczak & Fish Appendix IV). Display metadata only; the server
// validates the key. Order mirrors LIFE_AREA_ORDER.
const LIFE_AREAS: { key: string; label: string }[] = [
  { key: "self", label: "Self & Body" },
  { key: "money", label: "Money" },
  { key: "career", label: "Career" },
  { key: "love", label: "Love" },
  { key: "health", label: "Health" },
  { key: "home", label: "Home" },
  { key: "children", label: "Children" },
  { key: "purpose", label: "Purpose" },
  { key: "siblings", label: "Siblings & Inner Circle" },
  { key: "parents", label: "Parents" },
];
const areaLabel = (k: string) => (k === "day" ? "Full day" : LIFE_AREAS.find((a) => a.key === k)?.label ?? k);

const pad = (n: number) => String(n).padStart(2, "0");
const ymd = (y: number, m0: number, d: number) => `${y}-${pad(m0 + 1)}-${pad(d)}`;
const todayStr = () => { const d = new Date(); return ymd(d.getFullYear(), d.getMonth(), d.getDate()); };
const fmtLong = (s: string) => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" }); };
const fmtShort = (s: string) => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }); };

type Section = { synthesis: string; why: string };
// The current shape: the metaphor DAY read — pure prose (scene = outer weather, story = inner
// self + chapter, tilt = how to move, closeLine = one carried line). No mechanics/why layer.
type DayRead = { scene: string; story: string; tilt: string; closeLine: string };
// Legacy shape: older horoscope snapshots froze a year-style deep read. Still rendered for
// any date purchased before the day-engine switch (immutable snapshots never regenerate).
type DeepRead = {
  coreTheme: Section; whyNow: Section; developmentalTask: Section;
  manifestations: { area: string; synthesis: string; why?: string }[];
  confidence?: { level: string; factors: { plain: string; astro: string }[] };
};
type AnyRead = DayRead | DeepRead;
const isDayRead = (r: AnyRead | null): r is DayRead => !!r && (r as DayRead).scene !== undefined;

export default function Horoscope() {
  const [, navigate] = useLocation();
  const modeColor = useDayModeColor();

  const { data: access } = trpc.horoscope.access.useQuery(undefined, { staleTime: 1000 * 60 * 30 });
  const entitled = access?.entitled === true;

  const utils = trpc.useUtils();
  const { data: purchased } = trpc.horoscope.list.useQuery(undefined, { enabled: entitled, staleTime: 1000 * 30 });

  // ── Hub sections (Today's read mirror, Your year, The chapter) — the always-on readings that
  // now live here alongside pick-a-date. Collapse-default (Velea UX law) + lazy: each fetches only
  // when opened, so nothing generates until asked. All are cached day-stable, so opening is a free
  // hit once the day's read exists (Today generates the day read; Chart/here the year + chapter). ──
  const { data: activeProfile } = trpc.profiles.getActive.useQuery(undefined, { enabled: entitled, staleTime: 1000 * 60 * 5 });
  const pid = activeProfile?.id;
  const today = todayStr();
  const [todayOpen, setTodayOpen] = useState(false);
  const [yearOpen, setYearOpen] = useState(false);
  const { data: todayReadRes } = trpc.narrative.dayRead.useQuery({ profileId: pid as number, date: today }, { enabled: !!pid && todayOpen, staleTime: 1000 * 60 * 30 });
  const { data: yearReadRes } = trpc.narrative.deepRead.useQuery({ profileId: pid as number, date: today }, { enabled: !!pid && yearOpen, staleTime: 1000 * 60 * 30 });
  const todayReadContent = (todayReadRes as any)?.read ?? null;
  const yearReadContent = (yearReadRes as any)?.read ?? null;
  // Eclipse season is a period reading (narrative_cache, not the frozen reveals table), so it lists
  // separately in the log. Peek (read-only) tells us if one's already saved.
  const { data: eclipseSaved } = trpc.horoscope.eclipseSeasonSaved.useQuery(undefined, { enabled: entitled, staleTime: 1000 * 60 * 5 });
  const hasEclipseSaved = (eclipseSaved as any)?.available === true;

  const [view, setView] = useState(() => { const d = new Date(); return { y: d.getFullYear(), m: d.getMonth() }; });
  const [selectedDate, setSelectedDate] = useState<string>(todayStr());
  // The life area the reading is pointed at. Each (date, area) is its own purchase, so the calendar
  // marks and the reading both key on the selected area.
  const [selectedArea, setSelectedArea] = useState<string>("self");
  const panelRef = useRef<HTMLDivElement>(null);

  // Calendar bullseyes mark dates purchased FOR THE SELECTED AREA — switching area re-marks the month.
  const purchasedSet = useMemo(
    () => new Set((purchased ?? []).filter((r) => (r.lifeArea ?? "day") === selectedArea).map((r) => r.date)),
    [purchased, selectedArea],
  );

  const { data: reading, isLoading: readingLoading } = trpc.horoscope.get.useQuery(
    { date: selectedDate, lifeArea: selectedArea },
    { enabled: entitled && !!selectedDate, staleTime: 1000 * 60 * 5 },
  );

  const reveal = trpc.horoscope.reveal.useMutation({
    onSuccess: () => { utils.horoscope.get.invalidate({ date: selectedDate, lifeArea: selectedArea }); utils.horoscope.list.invalidate(); },
  });
  // Clear last-reveal state when the date OR area changes, so a prior read never leaks in.
  useEffect(() => { reveal.reset(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [selectedDate, selectedArea]);
  const saveNotes = trpc.horoscope.saveNotes.useMutation({ onSuccess: () => utils.horoscope.list.invalidate() });

  // Notes: local draft synced from the loaded reading, autosaved after a pause + on blur.
  const [notesDraft, setNotesDraft] = useState("");
  const savedNotesRef = useRef("");
  const exists = reading?.exists === true;
  useEffect(() => {
    if (exists) { const n = (reading as any)?.notes ?? ""; setNotesDraft(n); savedNotesRef.current = n; }
    else { setNotesDraft(""); savedNotesRef.current = ""; }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate, selectedArea, exists]);
  useEffect(() => {
    if (!exists || notesDraft === savedNotesRef.current) return;
    const t = setTimeout(() => { saveNotes.mutate({ date: selectedDate, lifeArea: selectedArea, notes: notesDraft }); savedNotesRef.current = notesDraft; }, 1000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notesDraft, exists, selectedDate, selectedArea]);
  const flushNotes = () => { if (exists && notesDraft !== savedNotesRef.current) { saveNotes.mutate({ date: selectedDate, lifeArea: selectedArea, notes: notesDraft }); savedNotesRef.current = notesDraft; } };

  const selectDate = (s: string) => {
    setSelectedDate(s);
    setTimeout(() => panelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 60);
  };

  // Locked (public-but-locked): everyone sees the page framing + the lock explainer.
  if (access && !entitled) {
    return (
      <div className="container" style={{ paddingTop: "1.5rem", paddingBottom: "7rem" }}>
        <div style={{ marginBottom: "1.25rem" }}><AppHeader pageTitle="Readings" onBack={() => navigate("/")} backLabel="Today" /></div>
        <div style={{ maxWidth: 520, margin: "0 auto" }}>
          <LockedFeatureCard
            title="Readings"
            teaser="Pick any day — receive its personalized reading."
            detail="Choose any date, past or future, and Velea reads your chart for that exact day — the deep, layered reading, kept forever with your own notes beneath it. A premium layer, not yet unlocked."
          />
        </div>
      </div>
    );
  }

  // Calendar grid for the viewed month.
  const first = new Date(view.y, view.m, 1);
  const startPad = first.getDay();
  const daysInMonth = new Date(view.y, view.m + 1, 0).getDate();
  const cells: (number | null)[] = [...Array(startPad).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  while (cells.length % 7 !== 0) cells.push(null);
  const shiftMonth = (delta: number) => setView((v) => { const d = new Date(v.y, v.m + delta, 1); return { y: d.getFullYear(), m: d.getMonth() }; });

  // Prefer the frozen reading from `get`; fall back to the fresh reveal response for THIS date
  // (so the prose appears the instant the mutation returns, before `get` refetches).
  const revealed: AnyRead | null = reveal.data?.available && (reveal.data as any).date === selectedDate ? ((reveal.data as any).read ?? null) : null;
  const read: AnyRead | null = (exists ? (reading as any).read : null) ?? revealed ?? null;

  return (
    <div className="container" style={{ paddingTop: "1.5rem", paddingBottom: "7rem" }}>
      <div style={{ marginBottom: "1.25rem" }}><AppHeader pageTitle="Readings" onBack={() => navigate("/")} backLabel="Today" /></div>

      <div style={{ maxWidth: 560, margin: "0 auto" }}>
        {/* ── Always-on readings, consolidated into the hub (collapse-default, lazy) ── */}
        <HubSection title="Today's reading" open={todayOpen} onToggle={() => setTodayOpen((o) => !o)} accent={modeColor}>
          {todayReadContent ? (
            <>
              <DayReadBody read={todayReadContent} modeColor={modeColor} />
              <button onClick={() => navigate("/")} style={hubLinkStyle(modeColor)}>Open Today →</button>
            </>
          ) : <SectionLoading label="Reading today…" />}
        </HubSection>

        <HubSection title="Your year" subtitle="From your birthday to your next birthday — your solar year, not the calendar year" open={yearOpen} onToggle={() => setYearOpen((o) => !o)} accent={modeColor}>
          {yearReadContent ? <DeepReadBody read={yearReadContent} modeColor={modeColor} /> : <SectionLoading label="Reading your year…" />}
        </HubSection>

        {/* Time Master + Hora — the premium timing layer, now living in Readings. Each carries its own
            heading + lock (masterMode.access); the app header's live glance is unaffected. */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.6rem", margin: "0 0 1.1rem" }}>
          <MasterModeCard />
          <HoraCard />
        </div>

        {/* ── This month (the full layered read expanded to the month, spined on the Time Lord) ── */}
        <MonthCard modeColor={modeColor} />

        {/* ── This eclipse season (the whole double-eclipse arc, read for your chart) ── */}
        <EclipseSeasonCard modeColor={modeColor} />

        {/* ── This Mercury retrograde (the whole rx cycle arc, read for your chart) ── */}
        <MercuryRxCard modeColor={modeColor} />

        {/* Pick-a-date intro — sits right above the calendar it describes (David). */}
        <p style={{ color: "var(--color-muted-foreground)", fontSize: "0.82rem", lineHeight: 1.5, margin: "1.5rem 0 0.9rem", textAlign: "center" }}>
          Pick any day — past or future — and a part of life, and receive its reading, drawn deep from your chart for that exact date.
        </p>

        {/* Current location — above the calendar so it's always in view and one tap to change (David). */}
        <LocationChip accent={modeColor} />

        {/* ── Calendar ── (parchment chart artifact; .parchment re-inks its token-driven text) */}
        <div className="parchment" style={{ border: "1px solid var(--color-border)", padding: "0.9rem 0.9rem 1rem" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.7rem" }}>
            <button onClick={() => shiftMonth(-1)} aria-label="Previous month" style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-muted-foreground)", padding: "0.25rem", display: "flex" }}><ChevronLeft size={20} /></button>
            <span style={{ fontSize: "0.92rem", fontWeight: 700, letterSpacing: "0.02em", color: "var(--heading-ink)" }}>{MONTHS[view.m]} {view.y}</span>
            <button onClick={() => shiftMonth(1)} aria-label="Next month" style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-muted-foreground)", padding: "0.25rem", display: "flex" }}><ChevronRight size={20} /></button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "2px", marginBottom: "0.35rem" }}>
            {WEEKDAYS.map((w) => (
              <div key={w} style={{ textAlign: "center", fontSize: "0.6rem", fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase", color: "var(--color-muted-foreground)", opacity: 0.7 }}>{w}</div>
            ))}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "2px" }}>
            {cells.map((day, i) => {
              if (day === null) return <div key={i} />;
              const ds = ymd(view.y, view.m, day);
              const isPurchased = purchasedSet.has(ds);
              const isSelected = ds === selectedDate;
              const isToday = ds === today;
              // Resting look, restored on mouse-leave. Every day is selectable, so it needs a hover
              // affordance (David: without one the cells read as a dead zone) — a soft mode-color wash
              // + hint ring on hover, without disturbing the stronger selected state.
              const restBg = isSelected ? `color-mix(in srgb, ${modeColor} 14%, transparent)` : "transparent";
              const restBorder = isSelected ? `1.5px solid ${modeColor}` : "1.5px solid transparent";
              return (
                <button
                  key={i}
                  onClick={() => selectDate(ds)}
                  onMouseEnter={(e) => { if (!isSelected) { e.currentTarget.style.background = `color-mix(in srgb, ${modeColor} 9%, transparent)`; e.currentTarget.style.border = `1.5px solid color-mix(in srgb, ${modeColor} 45%, transparent)`; } }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = restBg; e.currentTarget.style.border = restBorder; }}
                  style={{
                    position: "relative", aspectRatio: "1 / 1", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                    border: restBorder,
                    borderRadius: 10, cursor: "pointer", transition: "background 120ms, border-color 120ms",
                    background: restBg,
                    color: "var(--foreground)", padding: 0,
                  }}
                >
                  <span style={{ fontSize: "0.82rem", fontWeight: isToday ? 800 : 500, color: isPurchased ? GOLD : "var(--foreground)", lineHeight: 1 }}>{day}</span>
                  <span style={{ height: 9, display: "flex", alignItems: "center", justifyContent: "center", marginTop: 1 }}>
                    {isPurchased ? <OctagramMark size={10} color={GOLD} strokeWidth={1.2} /> : isToday ? <span style={{ width: 3, height: 3, borderRadius: 999, background: modeColor }} /> : null}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Life-area chips — which area of life this date's reading is pointed at ── */}
        <div style={{ marginTop: "1rem" }}>
          <p style={{ fontSize: "0.62rem", fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--color-muted-foreground)", margin: "0 0 0.5rem" }}>
            Which part of life?
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
            {LIFE_AREAS.map((a) => {
              const on = a.key === selectedArea;
              const owned = (purchased ?? []).some((r) => r.date === selectedDate && (r.lifeArea ?? "day") === a.key);
              return (
                <button
                  key={a.key}
                  onClick={() => setSelectedArea(a.key)}
                  // The blessed pill language (David's Refresh/Clear-all refs): OUTLINE,
                  // border the same color as the font, no tint fill.
                  style={{
                    display: "inline-flex", alignItems: "center", gap: "0.3rem", cursor: "pointer",
                    borderRadius: 999, padding: "0.34rem 0.72rem", fontSize: "0.74rem", fontWeight: on ? 700 : 500,
                    border: on ? "1.5px solid var(--heading-ink)" : "1px solid var(--color-muted-foreground)",
                    background: "transparent",
                    color: on ? "var(--heading-ink)" : "var(--color-muted-foreground)",
                  }}
                >
                  {owned && <OctagramMark size={9} color={GOLD} strokeWidth={1.2} />}
                  {a.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Selected date panel ── */}
        <div ref={panelRef} style={{ marginTop: "1.1rem", scrollMarginTop: "1rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.2rem" }}>
            {purchasedSet.has(selectedDate) && <OctagramMark size={16} color={GOLD} strokeWidth={1.2} />}
            <h2 style={{ fontSize: "1.05rem", fontWeight: 800, color: "var(--foreground)", margin: 0, letterSpacing: "-0.01em" }}>{fmtLong(selectedDate)}</h2>
          </div>
          <p style={{ fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase", color: modeColor, margin: "0 0 0.7rem", opacity: 0.85 }}>
            {areaLabel(selectedArea)}
          </p>

          {readingLoading ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
              {[1, 2, 3].map((i) => <div key={i} style={{ height: 14, borderRadius: 6, background: "var(--color-secondary)", opacity: 0.5, width: i === 3 ? "70%" : "100%" }} />)}
            </div>
          ) : read ? (
            <ReadingView read={read} modeColor={modeColor} notesDraft={notesDraft} setNotesDraft={setNotesDraft} onNotesBlur={flushNotes} saving={saveNotes.isPending} />
          ) : (
            <RevealPanel
              date={selectedDate}
              areaLabel={areaLabel(selectedArea)}
              pending={reveal.isPending}
              failed={reveal.data?.available === false}
              onReveal={() => reveal.mutate({ date: selectedDate, lifeArea: selectedArea })}
              modeColor={modeColor}
            />
          )}
        </div>

        {/* ── Your readings — the LOG of everything you've revealed, grouped by type. Always shown
            when entitled (even empty) so it's discoverable; eclipse season (a period reading, kept in
            a separate store) lists on its own row. ── */}
        {entitled && (() => {
          const byType = new Map<string, any[]>();
          for (const r of (purchased ?? [])) { const k = r.lifeArea ?? "day"; if (!byType.has(k)) byType.set(k, []); byType.get(k)!.push(r); }
          const order = [...LIFE_AREAS.map((a) => a.key), "day"];
          const groups = order.filter((k) => byType.has(k)).map((k) => ({ key: k, items: byType.get(k)!.slice().sort((a, b) => b.date.localeCompare(a.date)) }));
          const total = (purchased?.length ?? 0) + (hasEclipseSaved ? 1 : 0);
          return (
            <div style={{ marginTop: "1.8rem" }}>
              <p style={{ fontSize: "0.62rem", fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--color-muted-foreground)", margin: "0 0 0.9rem" }}>
                Your readings{total ? ` · ${total}` : ""}
              </p>
              {total === 0 && (
                <p style={{ fontSize: "0.8rem", color: "var(--color-muted-foreground)", lineHeight: 1.5, margin: 0, fontStyle: "italic" }}>
                  Your revealed readings collect here — reveal a day below, or read this eclipse season, and it's kept for you.
                </p>
              )}
              <div style={{ display: "flex", flexDirection: "column", gap: "1.2rem" }}>
                {hasEclipseSaved && (
                  <div>
                    <p style={{ fontSize: "0.6rem", fontWeight: 800, letterSpacing: "0.09em", textTransform: "uppercase", color: "#C9A227", margin: "0 0 0.5rem", opacity: 0.9 }}>Eclipse season · 1</p>
                    <button
                      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
                      style={{ textAlign: "left", cursor: "pointer", borderRadius: 12, padding: "0.7rem 0.8rem", border: "1px solid color-mix(in srgb, #C9A227 42%, var(--color-border))", background: "var(--color-card)", display: "flex", alignItems: "center", gap: "0.4rem" }}
                    >
                      <EclipseGlyph size={13} color="#C9A227" />
                      <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--heading-ink)" }}>This season</span>
                      <span style={{ fontSize: "0.56rem", fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase", color: "#C9A227", opacity: 0.85 }}>· open above</span>
                    </button>
                  </div>
                )}
                {groups.map((g) => (
                  <div key={g.key}>
                    <p style={{ fontSize: "0.6rem", fontWeight: 800, letterSpacing: "0.09em", textTransform: "uppercase", color: modeColor, margin: "0 0 0.5rem", opacity: 0.9 }}>
                      {areaLabel(g.key)} · {g.items.length}
                    </p>
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                      {g.items.map((r) => {
                        const rArea = r.lifeArea ?? "day";
                        const active = r.date === selectedDate && rArea === selectedArea;
                        return (
                          <button
                            key={`${r.date}:${rArea}`}
                            onClick={() => { const [y, m] = r.date.split("-").map(Number); setView({ y, m: m - 1 }); setSelectedArea(rArea); selectDate(r.date); }}
                            style={{
                              textAlign: "left", cursor: "pointer", borderRadius: 12, padding: "0.7rem 0.8rem",
                              border: active ? `1.5px solid ${GOLD}` : "1px solid var(--color-border)",
                              background: "var(--color-card)", display: "flex", flexDirection: "column", gap: "0.2rem",
                            }}
                          >
                            <span style={{ display: "flex", alignItems: "center", gap: "0.4rem", flexWrap: "wrap" }}>
                              <OctagramMark size={12} color={GOLD} strokeWidth={1.2} />
                              <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--foreground)" }}>{fmtShort(r.date)}</span>
                              {r.hasNotes && <span style={{ fontSize: "0.56rem", fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase", color: GOLD, opacity: 0.85 }}>· noted</span>}
                            </span>
                            {r.snippet && <span style={{ fontSize: "0.72rem", color: "var(--color-muted-foreground)", lineHeight: 1.4 }}>{r.snippet}…</span>}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}

// ── The reveal ("purchase") prompt for a not-yet-owned date ──
function RevealPanel({ date, areaLabel, pending, failed, onReveal, modeColor }: { date: string; areaLabel: string; pending: boolean; failed: boolean; onReveal: () => void; modeColor: string }) {
  return (
    <div className="parchment" style={{ borderRadius: 14, border: "1px dashed var(--color-border)", padding: "1.4rem 1.1rem", textAlign: "center" }}>
      <OctagramMark size={20} color={modeColor} style={{ display: "block", opacity: 0.85, margin: "0 auto 0.6rem" }} />
      <p style={{ fontSize: "0.82rem", color: "var(--color-muted-foreground)", lineHeight: 1.5, margin: "0 0 1rem" }}>
        No {areaLabel.toLowerCase()} reading yet for {fmtShort(date)}. Reveal it to read your chart for this day.
      </p>
      <button
        onClick={onReveal}
        disabled={pending}
        style={{
          display: "inline-flex", alignItems: "center", gap: "0.5rem", border: "none", cursor: pending ? "default" : "pointer",
          borderRadius: 999, padding: "0.65rem 1.4rem", fontSize: "0.82rem", fontWeight: 800, letterSpacing: "0.01em",
          color: "#1a1305", background: `linear-gradient(180deg, ${GOLD}, #b8912f)`, opacity: pending ? 0.7 : 1,
          boxShadow: `0 2px 12px ${GOLD}44`,
        }}
      >
        {pending ? <><Loader2 size={15} className="animate-spin" /> Reading the sky…</> : <><OctagramMark size={15} color="#1a1305" strokeWidth={1.3} /> Reveal this reading</>}
      </button>
      {failed && !pending && (
        <p style={{ fontSize: "0.72rem", color: "#9A4E6E", margin: "0.9rem 0 0" }}>The reading couldn't be drawn just now. Please try again in a moment.</p>
      )}
    </div>
  );
}

// ── Hub section: a collapse-default titled panel for the always-on readings (Today's read,
// Your year, The chapter). Matches the calendar/card framing so the hub reads as one surface. ──
function HubSection({ title, subtitle, open, onToggle, accent, children }: { title: string; subtitle?: string; open: boolean; onToggle: () => void; accent: string; children: ReactNode }) {
  return (
    <div style={{ borderRadius: 16, border: `1px solid color-mix(in srgb, ${accent} 38%, transparent)`, background: "var(--color-card)", marginBottom: "0.8rem", overflow: "hidden" }}>
      <button onClick={onToggle} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.75rem", padding: "0.85rem 1rem", background: "none", border: "none", cursor: "pointer" }}>
        <span style={{ display: "flex", flexDirection: "column", gap: "0.2rem", minWidth: 0, textAlign: "left" }}>
          <span style={{ fontSize: "0.7rem", fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: accent }}>{title}</span>
          {subtitle && <span style={{ fontSize: "0.66rem", fontWeight: 500, color: "var(--color-muted-foreground)", lineHeight: 1.35 }}>{subtitle}</span>}
        </span>
        <ChevronDown size={16} style={{ color: "var(--color-muted-foreground)", flexShrink: 0, transform: open ? "rotate(180deg)" : "none", transition: "transform 200ms ease" }} />
      </button>
      {open && <div style={{ padding: "0 1rem 1rem" }}>{children}</div>}
    </div>
  );
}

function SectionLoading({ label }: { label: string }) {
  return <p style={{ fontSize: "0.85rem", fontStyle: "italic", color: "var(--color-muted-foreground)", margin: "0.4rem 0", textAlign: "center" }}>{label}</p>;
}

const hubLinkStyle = (accent: string): CSSProperties => ({
  display: "inline-block", marginTop: "0.9rem", background: "none", border: "none", cursor: "pointer",
  color: accent, fontSize: "0.74rem", fontWeight: 700, letterSpacing: "0.04em", padding: 0,
});

// ── A small eclipse glyph: a corona ring around a dark disc (an annular "ring of fire"). Reads
// on either theme because the disc stays dark. Used only on the eclipse-season card. ──
function EclipseGlyph({ size = 17, color }: { size?: number; color: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden style={{ display: "block", flexShrink: 0 }}>
      <circle cx="12" cy="12" r="9.5" fill="none" stroke={color} strokeWidth="1.3" opacity="0.55" />
      <circle cx="12" cy="12" r="7" fill="none" stroke={color} strokeWidth="1.6" />
      <circle cx="12" cy="12" r="5.4" fill="#0b0b14" />
    </svg>
  );
}

// ── THE ECLIPSE SEASON card — the whole double-eclipse arc (build → resets → aftermath) read for
// this chart. Collapsed teaser by default (low cognitive load); taps the eclipseSeason mutation,
// which is cached by season server-side, so re-opening the same season is free. ──
function EclipseSeasonCard({ modeColor }: { modeColor: string }) {
  const utils = trpc.useUtils();
  // PEEK — read-only: does a saved reading already exist? Survives reload, so the card knows to show
  // "Read" + the reading instead of the generate button. No cost.
  const saved = trpc.horoscope.eclipseSeasonSaved.useQuery(undefined, { staleTime: 1000 * 60 * 5 });
  const reveal = trpc.horoscope.eclipseSeason.useMutation({ onSuccess: () => utils.horoscope.eclipseSeasonSaved.invalidate() });
  const [open, setOpen] = useState(false);

  const savedRead = (saved.data as any)?.available ? ((saved.data as any).read as DayRead) : null;
  const revealedRead = (reveal.data as any)?.available ? ((reveal.data as any).read as DayRead) : null;
  const read = savedRead ?? revealedRead;
  const season = ((saved.data as any)?.available ? (saved.data as any).season : null) ?? ((reveal.data as any)?.available ? (reveal.data as any).season : null);
  const noSeason = reveal.data && (reveal.data as any).available === false;

  const accent = "#C9A227"; // eclipse gold — steady, its own layer

  return (
    <div
      style={{
        borderRadius: 16, marginBottom: "1.1rem", padding: "1rem 1.1rem 1.1rem",
        border: `1px solid color-mix(in srgb, ${accent} 42%, var(--color-border))`,
        background: `linear-gradient(180deg, color-mix(in srgb, ${accent} 7%, var(--color-card)), var(--color-card))`,
      }}
    >
      {read ? (
        // Already read → collapsible: header shows a "Read" badge; tap to open/close.
        <>
          <button onClick={() => setOpen((o) => !o)} style={{ width: "100%", display: "flex", alignItems: "center", gap: "0.5rem", background: "none", border: "none", cursor: "pointer", padding: 0 }}>
            <EclipseGlyph color={accent} />
            <span style={{ fontSize: "0.62rem", fontWeight: 800, letterSpacing: "0.09em", textTransform: "uppercase", color: accent }}>This eclipse season</span>
            <span style={{ fontSize: "0.56rem", fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase", color: accent, background: `color-mix(in srgb, ${accent} 16%, transparent)`, borderRadius: 999, padding: "0.1rem 0.45rem" }}>Read</span>
            <ChevronDown size={16} style={{ marginLeft: "auto", flexShrink: 0, color: accent, transform: open ? "rotate(180deg)" : "none", transition: "transform 200ms ease" }} />
          </button>
          {open && (
            <div style={{ marginTop: "0.8rem" }}>
              {season && (
                <p style={{ fontSize: "0.68rem", color: "var(--color-muted-foreground)", margin: "0 0 0.7rem", opacity: 0.9 }}>
                  {season.count === 1 ? "One eclipse" : `${season.count} eclipses`} · read once, kept
                </p>
              )}
              <DayReadBody read={read} modeColor={modeColor} />
            </div>
          )}
        </>
      ) : (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
            <EclipseGlyph color={accent} />
            <p style={{ fontSize: "0.62rem", fontWeight: 800, letterSpacing: "0.09em", textTransform: "uppercase", color: accent, margin: 0 }}>This eclipse season</p>
          </div>
          {noSeason ? (
            <p style={{ fontSize: "0.8rem", color: "var(--color-muted-foreground)", lineHeight: 1.5, margin: 0 }}>
              The sky is between eclipse seasons right now — nothing to read yet. This opens again as the next season builds.
            </p>
          ) : (
            <>
              <p style={{ fontSize: "0.82rem", color: "var(--color-muted-foreground)", lineHeight: 1.55, margin: "0 0 0.9rem" }}>
                The whole arc of the eclipses ahead — the buildup, each reset, and where the field opens after — read once for your chart, and kept.
              </p>
              <button
                onClick={() => { reveal.mutate(); setOpen(true); }}
                disabled={reveal.isPending}
                style={{
                  display: "inline-flex", alignItems: "center", gap: "0.5rem", border: "none", cursor: reveal.isPending ? "default" : "pointer",
                  borderRadius: 999, padding: "0.6rem 1.3rem", fontSize: "0.8rem", fontWeight: 800, letterSpacing: "0.01em",
                  color: "#1a1305", background: `linear-gradient(180deg, ${accent}, #a5811f)`, opacity: reveal.isPending ? 0.7 : 1,
                  boxShadow: `0 2px 12px ${accent}3a`,
                }}
              >
                {reveal.isPending ? <><Loader2 size={15} className="animate-spin" /> Reading the season…</> : <>Read this eclipse season</>}
              </button>
              {reveal.isError && (
                <p style={{ fontSize: "0.72rem", color: "#9A4E6E", margin: "0.9rem 0 0" }}>The season couldn't be drawn just now. Please try again in a moment.</p>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}

// Mercury glyph ☿ — horns over a circle over a cross. Its own quicksilver mark, distinct from the
// eclipse disc, so the two period cards never read as the same layer.
function MercuryGlyph({ size = 17, color }: { size?: number; color: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden style={{ display: "block", flexShrink: 0 }}>
      <path d="M8.2 3.4 A3.8 3.8 0 0 0 15.8 3.4" stroke={color} strokeWidth="1.5" fill="none" strokeLinecap="round" />
      <circle cx="12" cy="10" r="3.3" fill="none" stroke={color} strokeWidth="1.6" />
      <line x1="12" y1="13.4" x2="12" y2="20.4" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
      <line x1="8.7" y1="17.4" x2="15.3" y2="17.4" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

// ── This Mercury retrograde: the whole-cycle arc (pre-shadow → review → retroshade), read once for
// your chart and kept. Mirrors EclipseSeasonCard — a period reading, generated on tap, cached per cycle. ──
function MercuryRxCard({ modeColor }: { modeColor: string }) {
  const utils = trpc.useUtils();
  const saved = trpc.horoscope.mercuryRxSaved.useQuery(undefined, { staleTime: 1000 * 60 * 5 });
  const reveal = trpc.horoscope.mercuryRx.useMutation({ onSuccess: () => utils.horoscope.mercuryRxSaved.invalidate() });
  const [open, setOpen] = useState(false);

  const savedRead = (saved.data as any)?.available ? ((saved.data as any).read as DayRead) : null;
  const revealedRead = (reveal.data as any)?.available ? ((reveal.data as any).read as DayRead) : null;
  const read = savedRead ?? revealedRead;
  const cycle = ((saved.data as any)?.available ? (saved.data as any).cycle : null) ?? ((reveal.data as any)?.available ? (reveal.data as any).cycle : null);
  const noCycle = reveal.data && (reveal.data as any).available === false;

  const accent = "#4C86C6"; // quicksilver blue — Mercury's own cool tone, distinct from eclipse gold
  // Phase-aware label: "ahead" while it's still approaching, "underway" once the review has turned on.
  const phase = cycle?.phaseNow as string | undefined;
  const eyebrow = phase === "approaching" ? "Mercury retrograde ahead" : "This Mercury retrograde";

  return (
    <div
      style={{
        borderRadius: 16, marginBottom: "1.1rem", padding: "1rem 1.1rem 1.1rem",
        border: `1px solid color-mix(in srgb, ${accent} 42%, var(--color-border))`,
        background: `linear-gradient(180deg, color-mix(in srgb, ${accent} 7%, var(--color-card)), var(--color-card))`,
      }}
    >
      {read ? (
        <>
          <button onClick={() => setOpen((o) => !o)} style={{ width: "100%", display: "flex", alignItems: "center", gap: "0.5rem", background: "none", border: "none", cursor: "pointer", padding: 0 }}>
            <MercuryGlyph color={accent} />
            <span style={{ fontSize: "0.62rem", fontWeight: 800, letterSpacing: "0.09em", textTransform: "uppercase", color: accent }}>{eyebrow}</span>
            <span style={{ fontSize: "0.56rem", fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase", color: accent, background: `color-mix(in srgb, ${accent} 16%, transparent)`, borderRadius: 999, padding: "0.1rem 0.45rem" }}>Read</span>
            <ChevronDown size={16} style={{ marginLeft: "auto", flexShrink: 0, color: accent, transform: open ? "rotate(180deg)" : "none", transition: "transform 200ms ease" }} />
          </button>
          {open && (
            <div style={{ marginTop: "0.8rem" }}>
              <p style={{ fontSize: "0.68rem", color: "var(--color-muted-foreground)", margin: "0 0 0.7rem", opacity: 0.9 }}>
                The whole cycle — buildup, review, clearing · read once, kept
              </p>
              <DayReadBody read={read} modeColor={modeColor} />
            </div>
          )}
        </>
      ) : (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
            <MercuryGlyph color={accent} />
            <p style={{ fontSize: "0.62rem", fontWeight: 800, letterSpacing: "0.09em", textTransform: "uppercase", color: accent, margin: 0 }}>{eyebrow}</p>
          </div>
          {noCycle ? (
            <p style={{ fontSize: "0.8rem", color: "var(--color-muted-foreground)", lineHeight: 1.5, margin: 0 }}>
              Mercury is running clear right now — no retrograde to read yet. This opens again as the next one builds.
            </p>
          ) : (
            <>
              <p style={{ fontSize: "0.82rem", color: "var(--color-muted-foreground)", lineHeight: 1.55, margin: "0 0 0.9rem" }}>
                The whole arc of the Mercury retrograde — the buildup, the review through your chart, and where it clears after — read once for your chart, and kept.
              </p>
              <button
                onClick={() => { reveal.mutate(); setOpen(true); }}
                disabled={reveal.isPending}
                style={{
                  display: "inline-flex", alignItems: "center", gap: "0.5rem", border: "none", cursor: reveal.isPending ? "default" : "pointer",
                  borderRadius: 999, padding: "0.6rem 1.3rem", fontSize: "0.8rem", fontWeight: 800, letterSpacing: "0.01em",
                  color: "#fff", background: `linear-gradient(180deg, ${accent}, #3a6ba8)`, opacity: reveal.isPending ? 0.7 : 1,
                  boxShadow: `0 2px 12px ${accent}3a`,
                }}
              >
                {reveal.isPending ? <><Loader2 size={15} className="animate-spin" /> Reading the cycle…</> : <>Read this Mercury retrograde</>}
              </button>
              {reveal.isError && (
                <p style={{ fontSize: "0.72rem", color: "#9A4E6E", margin: "0.9rem 0 0" }}>The cycle couldn't be drawn just now. Please try again in a moment.</p>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}

// Month glyph — three moons (new → half → full): the lunation rhythm that shapes a month.
function MonthGlyph({ size = 17, color }: { size?: number; color: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden style={{ display: "block", flexShrink: 0 }}>
      <circle cx="5" cy="12" r="2.7" fill="none" stroke={color} strokeWidth="1.4" />
      <path d="M12 9.3 A2.7 2.7 0 0 1 12 14.7 Z" fill={color} />
      <circle cx="12" cy="12" r="2.7" fill="none" stroke={color} strokeWidth="1.4" />
      <circle cx="19" cy="12" r="2.7" fill={color} />
    </svg>
  );
}

// ── This month: the full layered read expanded to the whole month (its season, big turns, and the arc
// across the weeks), read once for your chart and kept. The broadest period reading — sits atop. ──
function MonthCard({ modeColor }: { modeColor: string }) {
  const utils = trpc.useUtils();
  const saved = trpc.horoscope.monthSaved.useQuery(undefined, { staleTime: 1000 * 60 * 5 });
  const reveal = trpc.horoscope.month.useMutation({ onSuccess: () => utils.horoscope.monthSaved.invalidate() });
  const [open, setOpen] = useState(false);

  const savedRead = (saved.data as any)?.available ? ((saved.data as any).read as DayRead) : null;
  const revealedRead = (reveal.data as any)?.available ? ((reveal.data as any).read as DayRead) : null;
  const read = savedRead ?? revealedRead;
  const unavailable = reveal.data && (reveal.data as any).available === false;

  const accent = "#7B6FD1"; // twilight violet — the month's season, distinct from eclipse gold + Mercury blue
  const monthLabel = new Date().toLocaleDateString("en-US", { month: "long" });

  return (
    <div
      style={{
        borderRadius: 16, marginBottom: "1.1rem", padding: "1rem 1.1rem 1.1rem",
        border: `1px solid color-mix(in srgb, ${accent} 42%, var(--color-border))`,
        background: `linear-gradient(180deg, color-mix(in srgb, ${accent} 8%, var(--color-card)), var(--color-card))`,
      }}
    >
      {read ? (
        <>
          <button onClick={() => setOpen((o) => !o)} style={{ width: "100%", display: "flex", alignItems: "center", gap: "0.5rem", background: "none", border: "none", cursor: "pointer", padding: 0 }}>
            <MonthGlyph color={accent} />
            <span style={{ fontSize: "0.62rem", fontWeight: 800, letterSpacing: "0.09em", textTransform: "uppercase", color: accent }}>Your {monthLabel}</span>
            <span style={{ fontSize: "0.56rem", fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase", color: accent, background: `color-mix(in srgb, ${accent} 16%, transparent)`, borderRadius: 999, padding: "0.1rem 0.45rem" }}>Read</span>
            <ChevronDown size={16} style={{ marginLeft: "auto", flexShrink: 0, color: accent, transform: open ? "rotate(180deg)" : "none", transition: "transform 200ms ease" }} />
          </button>
          {open && (
            <div style={{ marginTop: "0.8rem" }}>
              <p style={{ fontSize: "0.68rem", color: "var(--color-muted-foreground)", margin: "0 0 0.7rem", opacity: 0.9 }}>
                The whole month — its season, big turns, and arc · read once, kept
              </p>
              <DayReadBody read={read} modeColor={modeColor} />
            </div>
          )}
        </>
      ) : (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
            <MonthGlyph color={accent} />
            <p style={{ fontSize: "0.62rem", fontWeight: 800, letterSpacing: "0.09em", textTransform: "uppercase", color: accent, margin: 0 }}>Your {monthLabel}</p>
          </div>
          {unavailable ? (
            <p style={{ fontSize: "0.8rem", color: "var(--color-muted-foreground)", lineHeight: 1.5, margin: 0 }}>
              This month's reading can't be drawn just now. Please try again in a moment.
            </p>
          ) : (
            <>
              <p style={{ fontSize: "0.82rem", color: "var(--color-muted-foreground)", lineHeight: 1.55, margin: "0 0 0.9rem" }}>
                The whole month ahead as one read — whose season it is, its big turns and where they land, and the arc across the weeks. Read once for your chart, and kept.
              </p>
              <button
                onClick={() => { reveal.mutate(); setOpen(true); }}
                disabled={reveal.isPending}
                style={{
                  display: "inline-flex", alignItems: "center", gap: "0.5rem", border: "none", cursor: reveal.isPending ? "default" : "pointer",
                  borderRadius: 999, padding: "0.6rem 1.3rem", fontSize: "0.8rem", fontWeight: 800, letterSpacing: "0.01em",
                  color: "#fff", background: `linear-gradient(180deg, ${accent}, #5a4fae)`, opacity: reveal.isPending ? 0.7 : 1,
                  boxShadow: `0 2px 12px ${accent}3a`,
                }}
              >
                {reveal.isPending ? <><Loader2 size={15} className="animate-spin" /> Reading the month…</> : <>Read this month</>}
              </button>
              {reveal.isError && (
                <p style={{ fontSize: "0.72rem", color: "#9A4E6E", margin: "0.9rem 0 0" }}>The month couldn't be drawn just now. Please try again in a moment.</p>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}

// ── The DAY read body: scene → story → tilt, each a plain-language synthesis, closed by the
// carried line; the chart mechanics (the whys) tuck behind one toggle (low cognitive load). ──
function DayReadBody({ read, modeColor }: { read: DayRead; modeColor: string }) {
  const label = (t: string) => (
    <p style={{ fontSize: "0.6rem", fontWeight: 800, letterSpacing: "0.09em", textTransform: "uppercase", color: modeColor, margin: "1.3rem 0 0.4rem", opacity: 0.9 }}>{t}</p>
  );
  const body = (s: string) => <p style={{ fontSize: "0.95rem", lineHeight: 1.68, color: "var(--foreground)", margin: 0 }}><GlossaryText>{s}</GlossaryText></p>;

  return (
    <div style={{ borderRadius: 14, border: "1px solid var(--color-border)", background: "var(--color-card)", padding: "1.1rem 1.1rem 1.25rem" }}>
      {/* Pure prose — no mechanics layer; the placements live in the lines, glossary-linked. */}
      {read.scene && body(read.scene)}
      {read.story && (<>{label("The story underneath")}{body(read.story)}</>)}
      {read.tilt && (<>{label("How to carry the day")}{body(read.tilt)}</>)}
      {read.closeLine && (
        <p style={{ fontSize: "1rem", lineHeight: 1.55, fontWeight: 600, fontStyle: "italic", color: modeColor, margin: "1.5rem 0 0", opacity: 0.95 }}>
          {read.closeLine}
        </p>
      )}
    </div>
  );
}

// ── Legacy year-read body — renders horoscope snapshots frozen before the day-engine switch. ──
function DeepReadBody({ read, modeColor }: { read: DeepRead; modeColor: string }) {
  const [mechOpen, setMechOpen] = useState(false);
  const label = (t: string) => (
    <p style={{ fontSize: "0.6rem", fontWeight: 800, letterSpacing: "0.09em", textTransform: "uppercase", color: modeColor, margin: "1.3rem 0 0.4rem", opacity: 0.9 }}>{t}</p>
  );
  const body = (s: string) => <p style={{ fontSize: "0.95rem", lineHeight: 1.68, color: "var(--foreground)", margin: 0 }}>{s}</p>;

  return (
    <div style={{ borderRadius: 14, border: "1px solid var(--color-border)", background: "var(--color-card)", padding: "1.1rem 1.1rem 1.25rem" }}>
      {body(read.coreTheme.synthesis)}
      {read.whyNow?.synthesis && (<>{label("Why now")}{body(read.whyNow.synthesis)}</>)}
      {read.manifestations?.length > 0 && (
        <>
          {label("How it may show up")}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.7rem" }}>
            {read.manifestations.map((m, i) => (
              <div key={i}>
                <p style={{ fontSize: "0.7rem", fontWeight: 700, color: modeColor, margin: "0 0 0.15rem", opacity: 0.85 }}>{m.area}</p>
                {body(m.synthesis)}
              </div>
            ))}
          </div>
        </>
      )}
      {read.developmentalTask?.synthesis && (<>{label("Your work")}{body(read.developmentalTask.synthesis)}</>)}
      <button
        onClick={() => setMechOpen((o) => !o)}
        style={{ display: "flex", alignItems: "center", gap: "0.35rem", background: "none", border: "none", cursor: "pointer", padding: 0, margin: "1.4rem 0 0", color: "var(--color-muted-foreground)" }}
      >
        <span style={{ fontSize: "0.62rem", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" }}>The mechanics</span>
        <ChevronDown size={14} style={{ transform: mechOpen ? "rotate(180deg)" : "none", transition: "transform 200ms ease" }} />
      </button>
      {mechOpen && (
        <div style={{ marginTop: "0.7rem", display: "flex", flexDirection: "column", gap: "0.7rem" }}>
          {[
            { t: "Core theme", w: read.coreTheme.why },
            { t: "Why now", w: read.whyNow?.why },
            { t: "Your work", w: read.developmentalTask?.why },
          ].filter((x) => x.w).map((x, i) => (
            <div key={i}>
              <p style={{ fontSize: "0.58rem", fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase", color: "var(--color-muted-foreground)", margin: "0 0 0.2rem", opacity: 0.7 }}>{x.t}</p>
              <p style={{ fontSize: "0.8rem", lineHeight: 1.5, color: "var(--color-muted-foreground)", margin: 0 }}>{x.w}</p>
            </div>
          ))}
          {read.confidence && (
            <div>
              <p style={{ fontSize: "0.58rem", fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase", color: "var(--color-muted-foreground)", margin: "0 0 0.2rem", opacity: 0.7 }}>{read.confidence.level} confidence</p>
              <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: "0.3rem" }}>
                {read.confidence.factors?.map((f, i) => (
                  <li key={i} style={{ fontSize: "0.8rem", lineHeight: 1.5, color: "var(--color-muted-foreground)", display: "flex", gap: "0.5rem" }}>
                    <span style={{ opacity: 0.5, flexShrink: 0 }}>•</span><span>{f.plain}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── The reading, rendered as horoscope prose (mechanics tucked behind one toggle) + notes.
// Renders the DAY read (scene/story/tilt/closeLine); legacy year-read snapshots fall through
// to the deep-read renderer so old purchases still display. ──
function ReadingView({ read, modeColor, notesDraft, setNotesDraft, onNotesBlur, saving }: {
  read: AnyRead; modeColor: string; notesDraft: string; setNotesDraft: (s: string) => void; onNotesBlur: () => void; saving: boolean;
}) {
  return (
    <div>
      {isDayRead(read)
        ? <DayReadBody read={read} modeColor={modeColor} />
        : <DeepReadBody read={read} modeColor={modeColor} />}

      {/* Notes — the user's own reflection, under the reading. */}
      <div style={{ marginTop: "1rem" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "0 0 0.4rem" }}>
          <p style={{ fontSize: "0.6rem", fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--color-muted-foreground)", margin: 0 }}>Your notes</p>
          <span style={{ fontSize: "0.58rem", color: "var(--color-muted-foreground)", opacity: 0.7 }}>{saving ? "Saving…" : notesDraft ? "Saved" : ""}</span>
        </div>
        <textarea
          value={notesDraft}
          onChange={(e) => setNotesDraft(e.target.value)}
          onBlur={onNotesBlur}
          placeholder="What this reading brings up — how the day actually unfolds, what you want to remember…"
          rows={4}
          style={{
            width: "100%", resize: "vertical", borderRadius: 12, border: "1px solid var(--color-border)", background: "var(--color-card)",
            color: "var(--foreground)", padding: "0.7rem 0.8rem", fontSize: "0.85rem", lineHeight: 1.55, fontFamily: "inherit", outline: "none",
          }}
        />
      </div>
    </div>
  );
}
