import GateMark from "@/components/GateMark";
import ProseCard from "@/components/ProseCard";
import { useEffect, useMemo, useRef, useState, type ReactNode, type CSSProperties } from "react";
import { useLocation } from "wouter";
import { ChevronLeft, ChevronRight, ChevronDown, Loader2, Lock } from "lucide-react";
import OctagramMark from "@/components/OctagramMark";
import VeleaMark from "@/components/VeleaMark";
import VeleaLoader from "@/components/VeleaLoader";
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
import { AREA_SHELVES, AREA_LABEL, SUB_THEME } from "@shared/life-area-shelves";
// Legacy parent keys — kept so purchases made before the shelves still label correctly.
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
const areaLabel = (k: string) => (k === "day" ? "Full day" : AREA_LABEL[k] ?? LIFE_AREAS.find((a) => a.key === k)?.label ?? k);

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
  // THE YOGAS (David 2026-07-16): the LIST is free — real names, real strength (thirst);
  // each reading is premium. Collapsed by default, NOT locked at the section level.
  const [yogasOpen, setYogasOpen] = useState(false);
  const [openYoga, setOpenYoga] = useState<string | null>(null);
  // The free-taste confirmation — picking is permanent, so it asks once.
  const [confirmTaste, setConfirmTaste] = useState<string | null>(null);
  // THE LIFE-AREA SHELVES — which shelf of the picker is open (one at a time, the mantra).
  const [openAreaShelf, setOpenAreaShelf] = useState<string | null>(null);
  const { data: yogasData } = trpc.horoscope.yogasList.useQuery(undefined, { enabled: yogasOpen, staleTime: 30 * 60_000 });
  const yogaFreePick = (yogasData as any)?.freePick ?? null;
  const yogaReadQ = trpc.horoscope.yogaRead.useQuery(
    { name: openYoga ?? "" },
    { enabled: !!openYoga && (entitled || yogaFreePick === openYoga || confirmTaste === openYoga), staleTime: Infinity, retry: false },
  );
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

  // THE SUNKEN LOCK (David 2026-07-16, "go"): the page-level lock swallowed the WHOLE
  // hub — free readings, Time Master tiles, even the Atlas doorway were invisible to
  // non-entitled users. The hub now renders for EVERYONE; each special reading wears
  // its OWN locked card below (public-but-locked, per feature).

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
          ) : todayReadRes === undefined ? (
            <SectionLoading label="Reading today…" />
          ) : (
            // Settled but no read (audit M7: don't spin forever) — honest, not a permanent loader.
            <p style={{ fontSize: "0.82rem", fontStyle: "italic", color: "var(--color-muted-foreground)", margin: 0 }}>This reading couldn't be drawn just now — try again in a moment.</p>
          )}
        </HubSection>

        <HubSection title="Your year" subtitle="From your birthday to your next birthday — your solar year, not the calendar year" open={yearOpen} onToggle={() => setYearOpen((o) => !o)} accent={modeColor}>
          {yearReadContent ? <DeepReadBody read={yearReadContent} modeColor={modeColor} /> : yearReadRes === undefined ? <SectionLoading label="Reading your year…" /> : <p style={{ fontSize: "0.82rem", fontStyle: "italic", color: "var(--color-muted-foreground)", margin: 0 }}>This reading couldn't be drawn just now — try again in a moment.</p>}
        </HubSection>

        {/* Time Master + Hora — the premium timing layer, now living in Readings. Each carries its own
            heading + lock (masterMode.access); the app header's live glance is unaffected. */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.6rem", margin: "0 0 1.1rem" }}>
          <MasterModeCard />
          <HoraCard />
        </div>

        {/* ── This month (the full layered read expanded to the month, spined on the Time Lord) ── */}
        {entitled ? <MonthCard modeColor={modeColor} /> : (
          <div style={{ marginBottom: "0.8rem" }}><LockedFeatureCard
            title="Read this month"
            teaser="The month's full layered reading, spined on your Time Lord."
            detail="The whole month as one arc — your running chapter, the sky's turns, the days that matter — in a single deep reading. A premium reading, not yet unlocked."
          /></div>
        )}

        {/* ── This eclipse season (the whole double-eclipse arc, read for your chart) ── */}
        {entitled ? <EclipseSeasonCard modeColor={modeColor} /> : (
          <div style={{ marginBottom: "0.8rem" }}><LockedFeatureCard
            title="This eclipse season"
            teaser="The whole double-eclipse arc, read for your chart."
            detail="Both eclipses of the season — the build, the resets, the aftermath — woven into one arc reading for your chart. A premium reading, not yet unlocked."
          /></div>
        )}

        {/* ── This Mercury retrograde (the whole rx cycle arc, read for your chart) ── */}
        {entitled ? <MercuryRxCard modeColor={modeColor} /> : (
          <div style={{ marginBottom: "0.8rem" }}><LockedFeatureCard
            title="This Mercury retrograde"
            teaser="The whole retrograde cycle, read for your chart."
            detail="The full rx arc — shadow, station, review, release — read through the rooms Mercury rules in your chart. A premium reading, not yet unlocked."
          /></div>
        )}

        {/* ── THE SLOW REVIEWS — Venus · Mars · Jupiter · Saturn retrograde cycles ── */}
        {entitled ? <SlowReviewsCard modeColor={modeColor} /> : (
          <div style={{ marginBottom: "0.8rem" }}><LockedFeatureCard
            title="The slow reviews"
            teaser="Venus, Mars, Jupiter and Saturn retrogrades, read for your chart."
            detail="Each slow planet's whole retrograde arc — what it re-examines, the rooms it reviews in your chart, the natal points it backs over — read once per cycle, and kept. A premium reading, not yet unlocked."
          /></div>
        )}

        {/* ── THE COMBINED READING — two charts, one read (blessed 2026-07-16) ── */}
        {entitled ? <CombinedReadingCard /> : (
          <div style={{ marginBottom: "0.8rem" }}><LockedFeatureCard
            title="The Combined Reading"
            teaser="Two charts, one read — for any relationship."
            detail="Two people's charts read together: the two directional currents between your stars, the classical gates, whose planets land in whose rooms, and whose chapter is carrying the relationship right now. Opens with the second profile."
          /></div>
        )}

        {/* ── THE LIFE ATLAS doorway (David 2026-07-16: readings live under Readings).
            Shown to EVERYONE — inside, the themes and counts are real and the dates
            wait behind the veil. Keep them thirsty. ── */}
        <button
          onClick={() => navigate("/atlas")}
          className="w-full flex items-center justify-between px-4 py-3.5 rounded-2xl"
          style={{ margin: "0 0 1.1rem", border: "1px solid color-mix(in srgb, var(--brand-gold) 40%, var(--color-border))", background: "linear-gradient(180deg, color-mix(in srgb, var(--brand-gold) 7%, var(--color-card)), var(--color-card))", cursor: "pointer" }}
        >
          <span className="flex flex-col items-start gap-0.5 text-left">
            <span className="text-sm font-bold flex items-center gap-2" style={{ color: "var(--heading-ink)" }}>
              {/* The Atlas doorway is a TIME THRESHOLD — it wears the gate, not a knot star
                  (David 2026-07-18); octagrams inside stay: they mark the knots themselves. */}
              <GateMark size={19} color="var(--brand-gold)" /> The Life Atlas
            </span>
            <span className="text-xs" style={{ color: "var(--color-muted-foreground)" }}>
              Every season of your life — marriage, wealth, children — dated and voiced
            </span>
          </span>
          <span className="text-xs font-bold uppercase shrink-0" style={{ letterSpacing: "0.08em", color: "var(--brand-gold)" }}>open ›</span>
        </button>

        {/* ── THE YOGAS — the chart's standing gifts. Shell unlocked (collapse-default);
            every row is real; the READINGS wear the locks. ── */}
        <div className="rounded-2xl overflow-hidden" style={{ margin: "0 0 1.1rem", border: "1px solid color-mix(in srgb, var(--brand-gold) 35%, var(--color-border))", background: "var(--color-card)" }}>
          <button onClick={() => setYogasOpen((v) => !v)} className="w-full flex items-center justify-between px-4 py-3.5">
            <span className="flex flex-col items-start gap-0.5 text-left">
              <span className="text-sm font-bold flex items-center gap-2" style={{ color: "var(--heading-ink)" }}>
                <OctagramMark size={15} color="var(--brand-gold)" strokeWidth={1.2} /> Yogas — the chart's standing gifts
              </span>
              <span className="text-xs" style={{ color: "var(--color-muted-foreground)" }}>
                The combinations your birth sky locked in place, each with its own reading
              </span>
            </span>
            <ChevronDown size={17} style={{ color: "var(--color-muted-foreground)", transform: yogasOpen ? "rotate(180deg)" : "none", transition: "transform 200ms ease" }} />
          </button>
          {yogasOpen && (
            <div className="px-4 pb-4">
              {!yogasData ? (
                <VeleaLoader size={24} label="Reading the birth sky…" />
              ) : !yogasData.available || yogasData.yogas.length === 0 ? (
                <p className="text-sm italic" style={{ color: "var(--color-muted-foreground)", margin: 0 }}>No standing yogas detected in this chart's research yet.</p>
              ) : (
                <div className="space-y-1.5">
                  {/* WHAT THIS SHELF IS (David 2026-07-18: "The feature isn't even clear") —
                      one plain line before any Sanskrit. */}
                  <p className="text-xs" style={{ color: "var(--color-muted-foreground)", margin: "0 0 0.6rem", lineHeight: 1.55 }}>
                    A yoga is a standing pattern your birth sky holds for life — planets seated
                    so they work as one force. These are the ones written into your chart; tap
                    one to hear what it gives you.
                  </p>
                  {/* THE FREE TASTE (David: "the user pics") — one yoga of YOUR choosing
                      opens free; the pick is permanent; the rest wear the gate. */}
                  {!entitled && (
                    <p className="text-xs" style={{ color: "var(--color-muted-foreground)", margin: "0 0 0.5rem", lineHeight: 1.5 }}>
                      {(yogasData as any).freePick
                        ? <>Your chosen taste is <b style={{ color: "var(--brand-gold)" }}>{(yogasData as any).freePick}</b> — the others open with Velea.</>
                        : <>Choose one — its full reading opens free, and the choice is yours to keep. The rest open with Velea.</>}
                    </p>
                  )}
                  {yogasData.yogas.map((y: any) => {
                    const open = openYoga === y.name;
                    const freePick = (yogasData as any).freePick as string | null;
                    const tasteable = !entitled && (freePick === y.name || freePick === null);
                    return (
                      <div key={y.name} className="rounded-lg overflow-hidden" style={{ border: open ? "1px solid color-mix(in srgb, var(--brand-gold) 45%, transparent)" : "1px solid var(--color-border)" }}>
                        <button onClick={() => setOpenYoga(open ? null : y.name)} className="w-full flex items-center justify-between px-3 py-2.5 text-left">
                          <span className="text-sm font-semibold" style={{ color: "var(--color-foreground)", minWidth: 0 }}>
                            {y.name}
                            <span className="ml-2 text-[11px] font-medium" style={{ color: "var(--color-muted-foreground)" }}>
                              {y.kind ? `${y.kind} · ` : ""}{y.vantages > 1 ? `holds from ${y.vantages} vantages` : "held"}{y.repeatsInNavamsha ? " · repeats in the navamsha" : ""}
                            </span>
                            {y.gloss && (
                              <span className="block text-[12px] font-normal mt-0.5" style={{ color: "var(--color-muted-foreground)", lineHeight: 1.45 }}>
                                {y.gloss}
                              </span>
                            )}
                          </span>
                          {!entitled && !tasteable && <GateMark size={19} style={{ flexShrink: 0, color: "var(--brand-gold)" }} />}
                          {!entitled && tasteable && freePick === null && <span className="text-[10px] font-bold uppercase" style={{ letterSpacing: "0.08em", color: "var(--brand-gold)", flexShrink: 0 }}>taste</span>}
                        </button>
                        {open && (
                          <div className="px-3 pb-3">
                            {!entitled && !tasteable ? (
                              <div className="flex items-start gap-2.5 rounded-lg px-3 py-2.5" style={{ background: "color-mix(in srgb, var(--brand-gold) 8%, transparent)", border: "1px solid color-mix(in srgb, var(--brand-gold) 30%, transparent)" }}>
                                <GateMark size={19} style={{ marginTop: 2, flexShrink: 0, color: "var(--brand-gold)" }} />
                                <p className="text-sm" style={{ margin: 0, color: "var(--color-foreground)", lineHeight: 1.5 }}>
                                  This yoga is written into your chart — its reading (what it gives, how strongly you hold it, when it ripens) opens with the premium layer. Soon.
                                </p>
                              </div>
                            ) : !entitled && tasteable && freePick === null && confirmTaste !== y.name ? (
                              <button onClick={() => { setConfirmTaste(y.name); setTimeout(() => utils.horoscope.yogasList.invalidate(), 4000); }} className="w-full py-2 rounded-full text-[11px] font-bold uppercase" style={{ letterSpacing: "0.1em", color: "var(--brand-gold)", border: "1px solid color-mix(in srgb, var(--brand-gold) 55%, transparent)", background: "transparent", cursor: "pointer" }}>
                                Make {y.name} my free reading — this choice keeps
                              </button>
                            ) : yogaReadQ.isLoading ? (
                              <VeleaLoader size={22} label="Voicing the yoga…" />
                            ) : yogaReadQ.data?.available && yogaReadQ.data.read ? (
                              <ProseCard color="#B08D2E">{yogaReadQ.data.read.read}</ProseCard>
                            ) : (
                              <p className="text-sm italic" style={{ color: "var(--color-muted-foreground)", margin: 0 }}>The yoga is quiet — try again in a moment.</p>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {!entitled && (
          <div style={{ margin: "1.5rem 0 0.8rem" }}><LockedFeatureCard
            title="Pick a day"
            teaser="Any date, past or future — its reading, drawn from your chart."
            detail="Choose any date and a part of life, and Velea reads your chart for that exact day — the deep, layered reading, kept forever with your own notes beneath it. A premium layer, not yet unlocked."
          /></div>
        )}
        {entitled && <>
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
          {/* THE SHELVES (David: "money alone can mean so many things") — each big area
              opens into its precise classical seats; one shelf at a time, line-pill grammar. */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.15rem" }}>
            {AREA_SHELVES.map((shelf) => {
              const openShelf = openAreaShelf === shelf.label;
              const holdsSelected = shelf.areas.some((sa) => sa.key === selectedArea);
              return (
                <div key={shelf.label}>
                  <button
                    onClick={() => setOpenAreaShelf(openShelf ? null : shelf.label)}
                    style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", padding: "0.3rem 0", cursor: "pointer", color: holdsSelected ? "var(--heading-ink)" : "var(--color-muted-foreground)", fontSize: "0.74rem", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" }}
                  >
                    {shelf.label}
                    {holdsSelected && !openShelf && <span style={{ fontWeight: 500, textTransform: "none", letterSpacing: 0 }}>· {areaLabel(selectedArea)}</span>}
                    <ChevronDown size={13} style={{ transform: openShelf ? "rotate(180deg)" : "none", transition: "transform 160ms ease", opacity: 0.7 }} />
                  </button>
                  {openShelf && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", margin: "0.15rem 0 0.55rem" }}>
                      {shelf.areas.map((sa) => {
                        const on = sa.key === selectedArea;
                        const owned = (purchased ?? []).some((r) => r.date === selectedDate && (r.lifeArea ?? "day") === sa.key);
                        return (
                          <button
                            key={sa.key}
                            onClick={() => setSelectedArea(sa.key)}
                            className="line-pill"
                            style={{
                              ["--pill-ink" as any]: "var(--heading-ink)",
                              display: "inline-flex", alignItems: "center", gap: "0.3rem", cursor: "pointer",
                              borderRadius: 999, padding: "0.34rem 0.72rem", fontSize: "0.74rem", fontWeight: on ? 700 : 500,
                              border: on ? "1.5px solid var(--heading-ink)" : "1px solid var(--color-muted-foreground)",
                              background: "transparent",
                              color: on ? "var(--heading-ink)" : "var(--color-muted-foreground)",
                            }}
                          >
                            {owned && <OctagramMark size={9} color={GOLD} strokeWidth={1.2} />}
                            {sa.label}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
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
          <p style={{ fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase", color: modeColor, margin: "0 0 0.25rem", opacity: 0.85 }}>
            {areaLabel(selectedArea)}
          </p>
          {/* THE BRIDGE — from this seat's question to its whole-life seasons in the Atlas. */}
          {SUB_THEME[selectedArea] && (
            <button onClick={() => navigate(`/atlas?theme=${SUB_THEME[selectedArea]}`)} style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "none", border: "none", padding: 0, margin: "0 0 0.7rem", cursor: "pointer", color: "var(--brand-gold)", fontSize: "0.74rem", fontWeight: 600 }}>
              Seasons of this seat → the Atlas
            </button>
          )}

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
        </>}

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
        {pending ? <><span className="velea-loader" style={{ display: "inline-flex", lineHeight: 0 }}><VeleaMark size={15} color="currentColor" /></span> Reading the sky…</> : <><OctagramMark size={15} color="#1a1305" strokeWidth={1.3} /> Reveal this reading</>}
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
  // The beach-ball law: the sweeping mark, never words alone (David caught the bare text).
  return <div style={{ padding: "0.6rem 0" }}><VeleaLoader size={26} label={`${label} — the first read can take up to a minute.`} /></div>;
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
                {reveal.isPending ? <><span className="velea-loader" style={{ display: "inline-flex", lineHeight: 0 }}><VeleaMark size={15} color="currentColor" /></span> Reading the season…</> : <>Read this eclipse season</>}
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
/** THE COMBINED READING — two charts, one read. Pick the other profile + the relation
 *  (the circle picks the lens); the currents are shown deterministically, the prose weaves. */
function CombinedReadingCard() {
  const [open, setOpen] = useState(false);
  const [otherId, setOtherId] = useState<number | null>(null);
  const [relation, setRelation] = useState<"love" | "work" | "friend" | "parent" | "child" | "sibling">("love");
  const profilesQ = trpc.profiles.list.useQuery(undefined, { enabled: open, staleTime: 60_000 });
  const read = trpc.combined.read.useMutation();
  const gold = "#B08D2E";
  const me = (profilesQ.data ?? []).find((p: any) => p.isActive);
  const others = (profilesQ.data ?? []).filter((p: any) => !p.isActive);
  const RELS: { key: typeof relation; label: string }[] = [
    { key: "love", label: "Love" }, { key: "work", label: "Work" }, { key: "friend", label: "Friend" },
    { key: "parent", label: "Parent" }, { key: "child", label: "Child" }, { key: "sibling", label: "Sibling" },
  ];
  const r: any = read.data;
  const cur = r?.melana?.currents;
  return (
    <div style={{ borderRadius: 16, marginBottom: "1.1rem", padding: "1rem 1.1rem 1.1rem", border: `1px solid color-mix(in srgb, ${gold} 38%, var(--color-border))`, background: `linear-gradient(180deg, color-mix(in srgb, ${gold} 6%, var(--color-card)), var(--color-card))` }}>
      <button onClick={() => setOpen((o) => !o)} style={{ width: "100%", display: "flex", alignItems: "center", gap: "0.5rem", background: "none", border: "none", cursor: "pointer", padding: 0 }}>
        <span style={{ fontSize: "0.62rem", fontWeight: 800, letterSpacing: "0.09em", textTransform: "uppercase", color: gold }}>The Combined Reading</span>
        <span style={{ fontSize: "0.6rem", color: "var(--color-muted-foreground)" }}>two charts, one read</span>
        <ChevronDown size={16} style={{ marginLeft: "auto", flexShrink: 0, color: gold, transform: open ? "rotate(180deg)" : "none", transition: "transform 200ms ease" }} />
      </button>
      {open && (
        <div style={{ marginTop: "0.85rem" }}>
          {others.length === 0 ? (
            <p style={{ fontSize: "0.82rem", color: "var(--color-muted-foreground)", lineHeight: 1.55, margin: 0 }}>
              Reading two charts together needs a second profile — add one under Profiles, then return here.
            </p>
          ) : (
            <>
              <p style={{ fontSize: "0.66rem", fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--color-muted-foreground)", margin: "0 0 0.4rem" }}>Read {me?.name ?? "you"} with</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", marginBottom: "0.7rem" }}>
                {others.map((p: any) => (
                  <button key={p.id} onClick={() => setOtherId(p.id)} className="line-pill" style={{ ["--pill-ink" as any]: gold, borderRadius: 999, padding: "0.32rem 0.75rem", fontSize: "0.76rem", fontWeight: otherId === p.id ? 700 : 500, border: otherId === p.id ? `1.5px solid ${gold}` : "1px solid var(--color-muted-foreground)", background: "transparent", color: otherId === p.id ? gold : "var(--color-muted-foreground)", cursor: "pointer" }}>{p.name}</button>
                ))}
              </div>
              <p style={{ fontSize: "0.66rem", fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--color-muted-foreground)", margin: "0 0 0.4rem" }}>As</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", marginBottom: "0.85rem" }}>
                {RELS.map((rel) => (
                  <button key={rel.key} onClick={() => setRelation(rel.key)} className="line-pill" style={{ ["--pill-ink" as any]: gold, borderRadius: 999, padding: "0.32rem 0.75rem", fontSize: "0.76rem", fontWeight: relation === rel.key ? 700 : 500, border: relation === rel.key ? `1.5px solid ${gold}` : "1px solid var(--color-muted-foreground)", background: "transparent", color: relation === rel.key ? gold : "var(--color-muted-foreground)", cursor: "pointer" }}>{rel.label}</button>
                ))}
              </div>
              {!r?.available && (
                <button
                  onClick={() => otherId && read.mutate({ otherProfileId: otherId, relation })}
                  disabled={!otherId || read.isPending}
                  className="w-full py-2 rounded-full text-[11px] font-bold uppercase"
                  style={{ letterSpacing: "0.1em", color: gold, border: `1px solid color-mix(in srgb, ${gold} 60%, transparent)`, background: "transparent", cursor: otherId ? "pointer" : "default", opacity: otherId ? 1 : 0.5 }}
                >
                  {read.isPending ? <span style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem" }}><VeleaLoader size={14} /> Weaving the two charts…</span> : "Read us together"}
                </button>
              )}
              {r?.available && cur && (
                <div style={{ marginTop: "0.4rem" }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem", marginBottom: "0.7rem" }}>
                    <p style={{ fontSize: "0.82rem", margin: 0, color: "var(--color-foreground)" }}>
                      <strong>{r.names?.a}</strong> → <strong>{r.names?.b}</strong>: <span style={{ color: cur.aToB?.favorable ? "#2E9B54" : "#B3232F", fontWeight: 700 }}>{cur.aToB?.tara}</span>
                    </p>
                    <p style={{ fontSize: "0.82rem", margin: 0, color: "var(--color-foreground)" }}>
                      <strong>{r.names?.b}</strong> → <strong>{r.names?.a}</strong>: <span style={{ color: cur.bToA?.favorable ? "#2E9B54" : "#B3232F", fontWeight: 700 }}>{cur.bToA?.tara}</span>
                    </p>
                    <p style={{ fontSize: "0.7rem", margin: "0.15rem 0 0", color: "var(--color-muted-foreground)" }}>
                      {r.melana.score.points} of {r.melana.score.max} gates · {r.melana.kuja.balanced ? "kuja balanced" : "kuja unbalanced — the prose weighs it"} · varṇa not scored, by design
                    </p>
                  </div>
                  {r.read && <ProseCard color={gold}>{[r.read.scene, r.read.story, r.read.tilt, r.read.closeLine].filter(Boolean).join("\n\n")}</ProseCard>}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

/** THE SLOW REVIEWS (David 2026-07-16: "we have mercury done") — the rx family card:
 *  each slow planet's active/approaching cycle read once and kept; clear planets rest quiet. */
function SlowReviewsCard({ modeColor }: { modeColor: string }) {
  const [open, setOpen] = useState(false);
  const [reads, setReads] = useState<Record<string, any>>({});
  const planetRx = trpc.horoscope.planetRx.useMutation();
  const PLANETS: { key: "venus" | "mars" | "jupiter" | "saturn"; name: string; ink: string }[] = [
    { key: "venus", name: "Venus", ink: "#CE5F6E" },
    { key: "mars", name: "Mars", ink: "#A8002C" },
    { key: "jupiter", name: "Jupiter", ink: "#A2850A" },
    { key: "saturn", name: "Saturn", ink: "#454A8C" },
  ];
  const fired = useRef(false);
  const openUp = () => {
    setOpen((o) => !o);
    if (!fired.current) {
      fired.current = true;
      PLANETS.forEach((p) => {
        planetRx.mutateAsync({ planet: p.key }).then((r) => setReads((prev) => ({ ...prev, [p.key]: r }))).catch(() => setReads((prev) => ({ ...prev, [p.key]: { available: false } })));
      });
    }
  };
  const gold = "#B08D2E";
  return (
    <div style={{ borderRadius: 16, marginBottom: "1.1rem", padding: "1rem 1.1rem 1.1rem", border: `1px solid color-mix(in srgb, ${gold} 38%, var(--color-border))`, background: `linear-gradient(180deg, color-mix(in srgb, ${gold} 6%, var(--color-card)), var(--color-card))` }}>
      <button onClick={openUp} style={{ width: "100%", display: "flex", alignItems: "center", gap: "0.5rem", background: "none", border: "none", cursor: "pointer", padding: 0 }}>
        <span style={{ fontSize: "0.62rem", fontWeight: 800, letterSpacing: "0.09em", textTransform: "uppercase", color: gold }}>The slow reviews</span>
        <span style={{ fontSize: "0.6rem", color: "var(--color-muted-foreground)" }}>Venus · Mars · Jupiter · Saturn</span>
        <ChevronDown size={16} style={{ marginLeft: "auto", flexShrink: 0, color: gold, transform: open ? "rotate(180deg)" : "none", transition: "transform 200ms ease" }} />
      </button>
      {open && (
        <div style={{ marginTop: "0.85rem", display: "flex", flexDirection: "column", gap: "0.85rem" }}>
          {PLANETS.map((p) => {
            const r = reads[p.key];
            if (!r) return <div key={p.key}><VeleaLoader size={18} label={`Listening for ${p.name}…`} /></div>;
            if (!r.available || !r.read) return (
              <p key={p.key} style={{ fontSize: "0.78rem", color: "var(--color-muted-foreground)", margin: 0 }}>
                <strong style={{ color: p.ink }}>{p.name}</strong> is running clear — no review to read; this opens as its next cycle builds.
              </p>
            );
            const phase = r.cycle?.phaseNow as string | undefined;
            return (
              <div key={p.key}>
                <p style={{ fontSize: "0.68rem", fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: p.ink, margin: "0 0 0.4rem" }}>
                  {phase === "approaching" ? `${p.name} retrograde ahead` : `This ${p.name} retrograde`}
                </p>
                <ProseCard color={p.ink} question={r.read.closeLine ? undefined : undefined}>{[r.read.scene, r.read.story, r.read.tilt, r.read.closeLine].filter(Boolean).join("\n\n")}</ProseCard>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

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

  const accent = "#3FA8A0"; // AQUAMARINE — Mercury's gem family (emerald/aquamarine/peridot — David), one ☿ color everywhere
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
                  // Field note 2026-07-17: "Flatter button background here. Aquamarine mint" —
                  // one flat mint-aquamarine, the gradient retired.
                  color: "#FBF7ED", background: "#54B8A9", opacity: reveal.isPending ? 0.7 : 1,
                  boxShadow: "0 2px 10px #54B8A930",
                }}
              >
                {reveal.isPending ? <><span className="velea-loader" style={{ display: "inline-flex", lineHeight: 0 }}><VeleaMark size={15} color="currentColor" /></span> Reading the cycle…</> : <>Read this Mercury retrograde</>}
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

  const accent = "var(--day-accent)"; // the month follows the day (David: "why is read this month purple?")
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
                  color: "#FBF7ED", background: `linear-gradient(180deg, var(--day-accent), color-mix(in srgb, var(--day-accent) 70%, #2E2318))`, opacity: reveal.isPending ? 0.7 : 1,
                  boxShadow: `0 2px 12px ${accent}3a`,
                }}
              >
                {reveal.isPending ? <><span className="velea-loader" style={{ display: "inline-flex", lineHeight: 0 }}><VeleaMark size={15} color="currentColor" /></span> Reading the month…</> : <>Read this month</>}
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
        <ChevronDown size={17} style={{ transform: mechOpen ? "rotate(180deg)" : "none", transition: "transform 200ms ease" }} />
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
