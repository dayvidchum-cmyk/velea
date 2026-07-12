import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import { ChevronLeft, ChevronRight, ChevronDown, Loader2 } from "lucide-react";
import OctagramMark from "@/components/OctagramMark";
import AppHeader from "@/components/AppHeader";
import LockedFeatureCard from "@/components/LockedFeatureCard";
import VeleaLorMark from "@/components/VeleaLorMark";
import GlossaryText from "@/components/GlossaryText";
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
  { key: "siblings", label: "Siblings" },
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
        <div style={{ marginBottom: "1.25rem" }}><AppHeader pageTitle="Horoscope" onBack={() => navigate("/")} backLabel="Today" /></div>
        <div style={{ maxWidth: 520, margin: "0 auto" }}>
          <LockedFeatureCard
            title="Horoscope"
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
  const today = todayStr();
  const shiftMonth = (delta: number) => setView((v) => { const d = new Date(v.y, v.m + delta, 1); return { y: d.getFullYear(), m: d.getMonth() }; });

  // Prefer the frozen reading from `get`; fall back to the fresh reveal response for THIS date
  // (so the prose appears the instant the mutation returns, before `get` refetches).
  const revealed: AnyRead | null = reveal.data?.available && (reveal.data as any).date === selectedDate ? ((reveal.data as any).read ?? null) : null;
  const read: AnyRead | null = (exists ? (reading as any).read : null) ?? revealed ?? null;

  return (
    <div className="container" style={{ paddingTop: "1.5rem", paddingBottom: "7rem" }}>
      <div style={{ marginBottom: "1.25rem" }}><AppHeader pageTitle="Horoscope" onBack={() => navigate("/")} backLabel="Today" /></div>

      <div style={{ maxWidth: 560, margin: "0 auto" }}>
        <p style={{ color: "var(--color-muted-foreground)", fontSize: "0.82rem", lineHeight: 1.5, margin: "0 0 1.1rem", textAlign: "center" }}>
          Pick any day — past or future — and a part of life, and receive its reading, drawn deep from your chart for that exact date.
        </p>

        {/* ── This eclipse season (the whole double-eclipse arc, read for your chart) ── */}
        <EclipseSeasonCard modeColor={modeColor} />

        {/* ── Calendar ── */}
        <div style={{ borderRadius: 16, border: "1px solid var(--color-border)", background: "var(--color-card)", padding: "0.9rem 0.9rem 1rem" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.7rem" }}>
            <button onClick={() => shiftMonth(-1)} aria-label="Previous month" style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-muted-foreground)", padding: "0.25rem", display: "flex" }}><ChevronLeft size={20} /></button>
            <span style={{ fontSize: "0.92rem", fontWeight: 700, letterSpacing: "0.02em", color: "var(--foreground)" }}>{MONTHS[view.m]} {view.y}</span>
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
              return (
                <button
                  key={i}
                  onClick={() => selectDate(ds)}
                  style={{
                    position: "relative", aspectRatio: "1 / 1", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                    border: isSelected ? `1.5px solid ${modeColor}` : "1.5px solid transparent",
                    borderRadius: 10, cursor: "pointer",
                    background: isSelected ? `color-mix(in srgb, ${modeColor} 14%, transparent)` : "transparent",
                    color: "var(--foreground)", padding: 0,
                  }}
                >
                  <span style={{ fontSize: "0.82rem", fontWeight: isToday ? 800 : 500, color: isPurchased ? GOLD : "var(--foreground)", lineHeight: 1 }}>{day}</span>
                  <span style={{ height: 9, display: "flex", alignItems: "center", justifyContent: "center", marginTop: 1 }}>
                    {isPurchased ? <VeleaLorMark size={9} color={GOLD} /> : isToday ? <span style={{ width: 3, height: 3, borderRadius: 999, background: modeColor }} /> : null}
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
                  style={{
                    display: "inline-flex", alignItems: "center", gap: "0.3rem", cursor: "pointer",
                    borderRadius: 999, padding: "0.34rem 0.72rem", fontSize: "0.74rem", fontWeight: on ? 700 : 500,
                    border: on ? `1.5px solid ${modeColor}` : "1px solid var(--color-border)",
                    background: on ? `color-mix(in srgb, ${modeColor} 15%, transparent)` : "var(--color-card)",
                    color: on ? "var(--foreground)" : "var(--color-muted-foreground)",
                  }}
                >
                  {owned && <VeleaLorMark size={8} color={GOLD} />}
                  {a.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Selected date panel ── */}
        <div ref={panelRef} style={{ marginTop: "1.1rem", scrollMarginTop: "1rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.2rem" }}>
            {purchasedSet.has(selectedDate) && <VeleaLorMark size={15} color={GOLD} />}
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

        {/* ── Your horoscopes (scroll back) ── */}
        {purchased && purchased.length > 0 && (
          <div style={{ marginTop: "1.8rem" }}>
            <p style={{ fontSize: "0.62rem", fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--color-muted-foreground)", margin: "0 0 0.6rem" }}>
              Your horoscopes · {purchased.length}
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {purchased.map((r) => {
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
                    <VeleaLorMark size={11} color={GOLD} />
                    <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--foreground)" }}>{fmtShort(r.date)}</span>
                    <span style={{ fontSize: "0.6rem", fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase", color: modeColor, opacity: 0.9 }}>· {areaLabel(rArea)}</span>
                    {r.hasNotes && <span style={{ fontSize: "0.56rem", fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase", color: GOLD, opacity: 0.85 }}>· noted</span>}
                  </span>
                  {r.snippet && <span style={{ fontSize: "0.72rem", color: "var(--color-muted-foreground)", lineHeight: 1.4 }}>{r.snippet}…</span>}
                </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── The reveal ("purchase") prompt for a not-yet-owned date ──
function RevealPanel({ date, areaLabel, pending, failed, onReveal, modeColor }: { date: string; areaLabel: string; pending: boolean; failed: boolean; onReveal: () => void; modeColor: string }) {
  return (
    <div style={{ borderRadius: 14, border: "1px dashed var(--color-border)", background: "var(--color-card)", padding: "1.4rem 1.1rem", textAlign: "center" }}>
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
        {pending ? <><Loader2 size={15} className="animate-spin" /> Reading the sky…</> : <>Reveal this horoscope</>}
      </button>
      {failed && !pending && (
        <p style={{ fontSize: "0.72rem", color: "#B15F71", margin: "0.9rem 0 0" }}>The reading couldn't be drawn just now. Please try again in a moment.</p>
      )}
    </div>
  );
}

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
  const reveal = trpc.horoscope.eclipseSeason.useMutation();
  const data = reveal.data as { available: boolean; read?: DayRead | null; season?: { firstDate: string; count: number } | null } | undefined;
  const read = data?.available ? data.read ?? null : null;
  const season = data?.available ? data.season ?? null : null;
  const noSeason = data && data.available === false;

  const accent = "#C9A227"; // eclipse gold — steady, not the day-mode hue, so the card reads as its own layer

  return (
    <div
      style={{
        borderRadius: 16, marginBottom: "1.1rem", padding: "1rem 1.1rem 1.1rem",
        border: `1px solid color-mix(in srgb, ${accent} 42%, var(--color-border))`,
        background: `linear-gradient(180deg, color-mix(in srgb, ${accent} 7%, var(--color-card)), var(--color-card))`,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: read ? "0.2rem" : "0.5rem" }}>
        <EclipseGlyph color={accent} />
        <p style={{ fontSize: "0.62rem", fontWeight: 800, letterSpacing: "0.09em", textTransform: "uppercase", color: accent, margin: 0 }}>
          This eclipse season
        </p>
      </div>

      {!read && !noSeason && (
        <>
          <p style={{ fontSize: "0.82rem", color: "var(--color-muted-foreground)", lineHeight: 1.55, margin: "0 0 0.9rem" }}>
            The whole arc of the eclipses ahead — the buildup, each reset, and where the field opens after — read once for your chart, and kept.
          </p>
          <button
            onClick={() => reveal.mutate()}
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
            <p style={{ fontSize: "0.72rem", color: "#B15F71", margin: "0.9rem 0 0" }}>The season couldn't be drawn just now. Please try again in a moment.</p>
          )}
        </>
      )}

      {noSeason && (
        <p style={{ fontSize: "0.8rem", color: "var(--color-muted-foreground)", lineHeight: 1.5, margin: 0 }}>
          The sky is between eclipse seasons right now — nothing to read yet. This opens again as the next season builds.
        </p>
      )}

      {read && (
        <>
          {season && (
            <p style={{ fontSize: "0.68rem", color: "var(--color-muted-foreground)", margin: "0 0 0.7rem", opacity: 0.9 }}>
              {season.count === 1 ? "One eclipse" : `${season.count} eclipses`} · read once, kept
            </p>
          )}
          <DayReadBody read={read} modeColor={modeColor} />
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
