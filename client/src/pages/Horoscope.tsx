import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import { ChevronLeft, ChevronRight, ChevronDown, Loader2 } from "lucide-react";
import OctagramMark from "@/components/OctagramMark";
import AppHeader from "@/components/AppHeader";
import LockedFeatureCard from "@/components/LockedFeatureCard";
import VeleaLorMark from "@/components/VeleaLorMark";
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

const pad = (n: number) => String(n).padStart(2, "0");
const ymd = (y: number, m0: number, d: number) => `${y}-${pad(m0 + 1)}-${pad(d)}`;
const todayStr = () => { const d = new Date(); return ymd(d.getFullYear(), d.getMonth(), d.getDate()); };
const fmtLong = (s: string) => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" }); };
const fmtShort = (s: string) => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }); };

type Section = { synthesis: string; why: string };
type DeepRead = {
  coreTheme: Section; whyNow: Section; developmentalTask: Section;
  manifestations: { area: string; synthesis: string; why?: string }[];
  confidence?: { level: string; factors: { plain: string; astro: string }[] };
};

export default function Horoscope() {
  const [, navigate] = useLocation();
  const modeColor = useDayModeColor();

  const { data: access } = trpc.horoscope.access.useQuery(undefined, { staleTime: 1000 * 60 * 30 });
  const entitled = access?.entitled === true;

  const utils = trpc.useUtils();
  const { data: purchased } = trpc.horoscope.list.useQuery(undefined, { enabled: entitled, staleTime: 1000 * 30 });
  const purchasedSet = useMemo(() => new Set((purchased ?? []).map((r) => r.date)), [purchased]);

  const [view, setView] = useState(() => { const d = new Date(); return { y: d.getFullYear(), m: d.getMonth() }; });
  const [selectedDate, setSelectedDate] = useState<string>(todayStr());
  const panelRef = useRef<HTMLDivElement>(null);

  const { data: reading, isLoading: readingLoading } = trpc.horoscope.get.useQuery(
    { date: selectedDate },
    { enabled: entitled && !!selectedDate, staleTime: 1000 * 60 * 5 },
  );

  const reveal = trpc.horoscope.reveal.useMutation({
    onSuccess: () => { utils.horoscope.get.invalidate({ date: selectedDate }); utils.horoscope.list.invalidate(); },
  });
  // Clear last-reveal state when the date changes, so a prior date's result never leaks in.
  useEffect(() => { reveal.reset(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [selectedDate]);
  const saveNotes = trpc.horoscope.saveNotes.useMutation({ onSuccess: () => utils.horoscope.list.invalidate() });

  // Notes: local draft synced from the loaded reading, autosaved after a pause + on blur.
  const [notesDraft, setNotesDraft] = useState("");
  const savedNotesRef = useRef("");
  const exists = reading?.exists === true;
  useEffect(() => {
    if (exists) { const n = (reading as any)?.notes ?? ""; setNotesDraft(n); savedNotesRef.current = n; }
    else { setNotesDraft(""); savedNotesRef.current = ""; }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate, exists]);
  useEffect(() => {
    if (!exists || notesDraft === savedNotesRef.current) return;
    const t = setTimeout(() => { saveNotes.mutate({ date: selectedDate, notes: notesDraft }); savedNotesRef.current = notesDraft; }, 1000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notesDraft, exists, selectedDate]);
  const flushNotes = () => { if (exists && notesDraft !== savedNotesRef.current) { saveNotes.mutate({ date: selectedDate, notes: notesDraft }); savedNotesRef.current = notesDraft; } };

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
  const revealed: DeepRead | null = reveal.data?.available && (reveal.data as any).date === selectedDate ? ((reveal.data as any).read ?? null) : null;
  const read: DeepRead | null = (exists ? (reading as any).read : null) ?? revealed ?? null;

  return (
    <div className="container" style={{ paddingTop: "1.5rem", paddingBottom: "7rem" }}>
      <div style={{ marginBottom: "1.25rem" }}><AppHeader pageTitle="Horoscope" onBack={() => navigate("/")} backLabel="Today" /></div>

      <div style={{ maxWidth: 560, margin: "0 auto" }}>
        <p style={{ color: "var(--color-muted-foreground)", fontSize: "0.82rem", lineHeight: 1.5, margin: "0 0 1.1rem", textAlign: "center" }}>
          Pick any day — past or future — and receive its reading, drawn from your chart for that exact date.
        </p>

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

        {/* ── Selected date panel ── */}
        <div ref={panelRef} style={{ marginTop: "1.1rem", scrollMarginTop: "1rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.7rem" }}>
            {purchasedSet.has(selectedDate) && <VeleaLorMark size={15} color={GOLD} />}
            <h2 style={{ fontSize: "1.05rem", fontWeight: 800, color: "var(--foreground)", margin: 0, letterSpacing: "-0.01em" }}>{fmtLong(selectedDate)}</h2>
          </div>

          {readingLoading ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
              {[1, 2, 3].map((i) => <div key={i} style={{ height: 14, borderRadius: 6, background: "var(--color-secondary)", opacity: 0.5, width: i === 3 ? "70%" : "100%" }} />)}
            </div>
          ) : read ? (
            <ReadingView read={read} modeColor={modeColor} notesDraft={notesDraft} setNotesDraft={setNotesDraft} onNotesBlur={flushNotes} saving={saveNotes.isPending} />
          ) : (
            <RevealPanel
              date={selectedDate}
              pending={reveal.isPending}
              failed={reveal.data?.available === false}
              onReveal={() => reveal.mutate({ date: selectedDate })}
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
              {purchased.map((r) => (
                <button
                  key={r.date}
                  onClick={() => { const [y, m] = r.date.split("-").map(Number); setView({ y, m: m - 1 }); selectDate(r.date); }}
                  style={{
                    textAlign: "left", cursor: "pointer", borderRadius: 12, padding: "0.7rem 0.8rem",
                    border: r.date === selectedDate ? `1.5px solid ${GOLD}` : "1px solid var(--color-border)",
                    background: "var(--color-card)", display: "flex", flexDirection: "column", gap: "0.2rem",
                  }}
                >
                  <span style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                    <VeleaLorMark size={11} color={GOLD} />
                    <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--foreground)" }}>{fmtShort(r.date)}</span>
                    {r.hasNotes && <span style={{ fontSize: "0.56rem", fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase", color: GOLD, opacity: 0.85 }}>· noted</span>}
                  </span>
                  {r.snippet && <span style={{ fontSize: "0.72rem", color: "var(--color-muted-foreground)", lineHeight: 1.4 }}>{r.snippet}…</span>}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── The reveal ("purchase") prompt for a not-yet-owned date ──
function RevealPanel({ date, pending, failed, onReveal, modeColor }: { date: string; pending: boolean; failed: boolean; onReveal: () => void; modeColor: string }) {
  return (
    <div style={{ borderRadius: 14, border: "1px dashed var(--color-border)", background: "var(--color-card)", padding: "1.4rem 1.1rem", textAlign: "center" }}>
      <OctagramMark size={20} color={modeColor} style={{ display: "block", opacity: 0.85, margin: "0 auto 0.6rem" }} />
      <p style={{ fontSize: "0.82rem", color: "var(--color-muted-foreground)", lineHeight: 1.5, margin: "0 0 1rem" }}>
        No reading yet for {fmtShort(date)}. Reveal it to read your chart for this day.
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

// ── The deep read, rendered as horoscope prose (mechanics tucked behind one toggle) + notes ──
function ReadingView({ read, modeColor, notesDraft, setNotesDraft, onNotesBlur, saving }: {
  read: DeepRead; modeColor: string; notesDraft: string; setNotesDraft: (s: string) => void; onNotesBlur: () => void; saving: boolean;
}) {
  const [mechOpen, setMechOpen] = useState(false);
  const label = (t: string) => (
    <p style={{ fontSize: "0.6rem", fontWeight: 800, letterSpacing: "0.09em", textTransform: "uppercase", color: modeColor, margin: "1.3rem 0 0.4rem", opacity: 0.9 }}>{t}</p>
  );
  const body = (s: string) => <p style={{ fontSize: "0.95rem", lineHeight: 1.68, color: "var(--foreground)", margin: 0 }}>{s}</p>;

  return (
    <div>
      <div style={{ borderRadius: 14, border: "1px solid var(--color-border)", background: "var(--color-card)", padding: "1.1rem 1.1rem 1.25rem" }}>
        {/* Lead — the core theme, given room to breathe. */}
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

        {/* Mechanics — the chart reasoning, collapsed by default (low cognitive load). */}
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
