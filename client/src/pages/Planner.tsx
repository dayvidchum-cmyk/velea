import { useState, useMemo, useEffect, useRef, useLayoutEffect } from "react";
import { useLocation } from "wouter";
import { fireTaskGuide, hasSeenTaskGuide } from "@/components/Onboarding";
import ProseLoading from "@/components/ProseLoading";
import KeptReadings from "@/components/KeptReadings";
import LocationChip from "@/components/LocationChip";
import VeleaLorMark from "@/components/VeleaLorMark";
import OctagramMark from "@/components/OctagramMark";
import PlanetMark from "@/components/PlanetMark";
import CrownMark from "@/components/CrownMark";
import { ChevronLeft, ChevronRight, Plus, ChevronDown, Pin, Moon, Sunrise, RefreshCw } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { useTheme } from "@/contexts/ThemeContext";
import { useFullSpectrum } from "@/hooks/useFullSpectrum";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import TaskItem from "@/components/TaskItem";
import SwipeableTaskRow from "@/components/SwipeableTaskRow";
import AddTaskSheet from "@/components/AddTaskSheet";
import ModeOrb from "@/components/ModeOrb";
import ModeOrbSheet from "@/components/ModeOrbSheet";
import { useSettingsContext } from "@/contexts/SettingsContext";
import { kindOfTask, KIND_ORDER, type TaskKind } from "@/lib/taskKind";

import { PANCHANG_TO_TASK_MODE, MODE_OKLCH, MODE_TINT, MODE_CARD_BG, MODE_SOLID, MODE_RGBA, autoTextColors } from "../../../shared/types";
import type { TaskMode, TaskPriority } from "../../../shared/types";
import { evaluateRestGate } from "../../../shared/rest-gate";
import type { Task } from "../../../drizzle/schema";
import AppHeader from "@/components/AppHeader";
import GlossaryText from "@/components/GlossaryText";
import { GlossaryLink } from "@/components/GlossaryPopover";
import WhyNowSheet from "@/components/WhyNowSheet";
import { createPortal } from "react-dom";
import AddToHomeScreenNote from "@/components/AddToHomeScreenNote";
import MeridianWhisper from "@/components/MeridianWhisper";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

const DAYS = ["S", "M", "T", "W", "T", "F", "S"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
// Planetary glyphs for the Time Lord (Sun's is the circle-dot, its alchemical symbol).

function toDateStr(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// Retrograde planets → their glyph + color for the calendar strip. Two tunings so the
// small glyphs read on the mode-tinted tiles: BRIGHT on dark + Full Spectrum, DEEP on light.
// ︎ forces TEXT presentation — without it iOS renders ♀/♂ as color emoji (a different
// font with its own baseline + it ignores our color), which threw the strip's alignment off.
const PLANET_GLYPH: Record<string, string> = { Mercury: "☿︎", Venus: "♀︎", Mars: "♂︎", Jupiter: "♃︎", Saturn: "♄︎" };
// One symbol font for all five so they share metrics and sit on the same line.
const PLANET_GLYPH_FONT = '"Apple Symbols", "Segoe UI Symbol", "Noto Sans Symbols", "Noto Sans Symbols2", sans-serif';
const PLANET_RETRO_COLOR: { bright: Record<string, string>; deep: Record<string, string> } = {
  bright: { Mercury: "#85CDB5", Venus: "#F7A8B4", Mars: "#E8556B", Jupiter: "#E6C33A", Saturn: "#33A1FF" },
  deep:   { Mercury: "#2E8B6E", Venus: "#C65A72", Mars: "#BD0039", Jupiter: "#9A7E00", Saturn: "#0E74D4" },
};

// Day-mode coin colors, ONE palette for the always-light calendar (David 2026-07-11): appearance
// mode no longer changes the surface, so it no longer changes these. BRIGHT/true mode colors — they
// read fine on the light background (David: bright gold is fine on white). A FILLED coin's NUMBER is
// a very dark tonal version of the same color (darkenOklch), not white — more elegant, and it lets
// the fill stay bright, gold included.
// ── THE DAY CHARACTER (classical filter) — replaced the 4 modes, David 2026-07-15. ──
// v1 palette keyed to the light almanac; ONE block, repaintable at will (David's canvas).
// Reserved hues stay reserved: gold = crown, fire-red = caution, violet = eclipse.
// THE SIX MOVEMENTS (David 2026-07-15) — his day-mode words + his hand-picked colors.
// The color compresses what the day's prose already says; the word is the hero.
const MOVEMENT_BG: Record<string, [string, string]> = {
  golden:    ["#2E7D4F", "#ffffff"], // Golden Day — the best, for anything
  action:    ["#77A96B", "#1d2a18"],              // outward movement, full go
  selective: ["#00687a", "#E8F1F2"],              // tend, but finish something
  build:     ["#D4AF37", "#3a2f10"],              // tend what's already present (mid depth)
  restraint: ["#d57176", "#3A1518"],              // tend, with extreme caution
  caution:   ["#B3232F", "#ffffff"],              // stop. stop. stop. — RUBY (David 2026-07-15)
};
const RUNG_NONE: [string, string] = ["transparent", "var(--color-muted-foreground)"];
// Build depth wears the hero gradient's own golds (David 2026-07-15): deep rung = the
// darker stop, thin ground = the palest. Same family the hero card breathes.
const BUILD_DEPTH_BG: Record<string, [string, string]> = {
  deep: ["#C49A2E", "#2e2408"],    // great-friend ground — the rich dark gold
  mid: ["#D4AF37", "#3a2f10"],
  thin: ["#CD9E86", "#3a1f14"],    // own-star ground — LIGHT rose-ochre (David 2026-07-15: today "should be rose ochre")
  leaning: ["#BC886F", "#3a1f14"], // softened-hostile ground — the rose-ochre floor
};
// The rung-depth methodology, extended to Selective and Action (David 2026-07-16). Same
// ladder as Build: deep = great-friend rungs (9/8) · mid = the other favorable rungs ·
// thin = own-star ground · leaning = softened-hostile ground bleeding toward Restraint.
// The apex (Golden) and the lowest point (Caution) stay flat — his explicit carve-out.
const SELECTIVE_DEPTH_BG: Record<string, [string, string]> = {
  deep: ["#00525F", "#E8F1F2"],    // richer, darker teal
  mid: ["#00687a", "#E8F1F2"],
  thin: ["#2E8291", "#F0F6F7"],    // paler water
  leaning: ["#54787C", "#EDF3F2"], // gray-TEAL (David: the slate read too gray)
};
const ACTION_DEPTH_BG: Record<string, [string, string]> = {
  deep: ["#5E9457", "#12240f"],    // great-friend ground — the richer green
  mid: ["#77A96B", "#1d2a18"],
  thin: ["#94BC88", "#233420"],    // (Action needs a favorable rung, so thin/leaning
  leaning: ["#9AA579", "#282c16"], //  are completeness only — they should not occur)
};
const DEPTH_BG: Record<string, Record<string, [string, string]>> = {
  build: BUILD_DEPTH_BG, selective: SELECTIVE_DEPTH_BG, action: ACTION_DEPTH_BG,
};
// Darken a #rrggbb toward its own shadow (RGB multiply) — the hero card descent.
// MARK INKS (David 2026-07-15): each mark speaks its own symbolic color — prosperity in
// action green, the crown in gold, Mercury in aquamarine, Saturn in the deep indigo of
// jyotish ink (deep, never black).
const MARK_INK: Record<string, string> = {
  dollar: "#77A96B", crown: "#D4AF37", Mercury: "#3FA8A0", Saturn: "#454A8C",
};
// Ink-bearing corrections (em) — the astro glyph font's ink sits off-center in its em box;
// these nudge each glyph's INK onto the true axis. Tuned against David's iPhone crops.
// Measured from David's 7/16 screenshot (device-pixel ink centroids vs column axes):
// Saturn's ℏ ink sits LEFT of its em box — the old -0.07em pushed it further left.
const GLYPH_NUDGE: Record<string, string> = { Saturn: "0.03em", Mercury: "0.01em" };
const CROWN_NUDGE = "0.04em";
// NO WHITE OR BLACK NUMBERS EVER (David 2026-07-15): a number is always its coin's hue
// at the opposite depth — deep shade on light fills, pale tint (parchment-mixed, never
// pure white) on dark fills.
function tonalInk(hex: string): string {
  if (!hex.startsWith("#") || hex.length < 7) return hex;
  const n = parseInt(hex.slice(1), 16);
  const lum = 0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255);
  return lum > 120 ? shadeHex(hex, 0.42) : `color-mix(in srgb, ${hex} 28%, #F8F4EA)`;
}
function shadeHex(hex: string, f: number): string {
  const n = parseInt(hex.slice(1), 16);
  const ch = (v: number) => Math.max(0, Math.min(255, Math.round(v * f))).toString(16).padStart(2, "0");
  return `#${ch(n >> 16)}${ch((n >> 8) & 255)}${ch(n & 255)}`;
}
// THE FIVE INKS (David 2026-07-16 experiment): numbers + rings speak only the FAMILY —
// Green (golden/action), Teal (selective), Gold (build), Rose (restraint), Caution ruby.
// FILLS stay depth-specific (today/selected wear the precise coin). Chrome untouched.
const FAMILY_INK: Record<string, string> = {
  golden: "#77A96B", action: "#77A96B", selective: "#00687a",
  build: "#D4AF37", restraint: "#d57176", caution: "#B3232F",
};
// The day's coin color for a character — movement + depth, one lookup shared by the
// calendar coins and the hero card (the card LEADS with its calendar color).
function coinPairFor(character: any): [string, string] | undefined {
  if (!character?.movement) return undefined;
  const depth = character.depth ?? character.buildDepth;
  return DEPTH_BG[character.movement]?.[depth ?? "mid"] ?? MOVEMENT_BG[character.movement];
}
// The hero card's descent: LEAD with the day's coin color, then fall through the deeper
// stops of the movement's own scale to its leaning FLOOR — Build ends in rose-ochre
// (David: "the big build card should be rose ochre"), Selective in its slate, Action in
// its khaki. A day already on the floor descends into its own shadow. Golden/Caution
// (no scale) get the plain shadow descent.
function heroDescentFor(character: any, angle = 180): string | undefined {
  const pair = coinPairFor(character);
  if (!pair) return undefined;
  const coin = pair[0];
  const scale = character?.movement ? DEPTH_BG[character.movement] : undefined;
  let stops: string[];
  if (scale) {
    // Each depth falls to the scale's leaning FLOOR by its own path: thin (own-star, now the
    // light rose-ochre) descends WITHIN the rose family — never back through the golds.
    const after: Record<string, string[]> = { thin: ["leaning"], mid: ["deep", "leaning"], deep: ["leaning"], leaning: [] };
    const depth = String(character.depth ?? character.buildDepth ?? "mid");
    stops = [coin, ...(after[depth] ?? ["deep", "leaning"]).map((k) => scale[k][0])];
    while (stops.length < 3) stops.push(shadeHex(stops[stops.length - 1], 0.72));
  } else {
    stops = [coin, shadeHex(coin, 0.74), shadeHex(coin, 0.46)];
  }
  const last = stops.length - 1;
  return `linear-gradient(${angle}deg, ${stops.map((c, i) => `${c} ${Math.round((i * 100) / last)}%`).join(", ")})`;
}
// Legacy three-state fallback for dates outside the ranked year (cold cache, far months).
const GO_GREEN: [string, string] = ["#90a989", "#243320"];
const CAUTION_ROSE: [string, string] = ["#d57176", "#3A1518"];
const BETWEEN: [string, string] = ["#00687a", "#E8F1F2"];

// (Retired from the coins 2026-07-16 — kept for the hero word only.)
// ONE LANGUAGE (David 2026-07-15): the kinds WEAR the movement colors on purpose —
// "Tender is restraint. Swift is action go. Motion is selective." A kind's color says
// which movement its acts belong to, so a reader learns ONE palette for the whole app.
const NATURE_DOT: Record<string, string> = {
  fixed: "#D4AF37",   // Foundation — Build gold: tending what lasts
  movable: "#00687a", // Motion — Selective teal (David's call)
  swift: "#77A96B",   // Swift — Action green: the go acts (David's call)
  tender: "#d57176",  // Tender — Restraint rose (David's call)
  sharp: "#00525F",   // Cutting — deep Selective teal: the FINISH family (clean endings), not pink
  fierce: "#BC886F",  // Force — rose-ochre: heavy tending that leans restraint
  mixed: "#C49A2E",   // Steady — deep Build gold: the daily grind
};
const NATURE_WORD: Record<string, string> = {
  fixed: "Ground", movable: "Motion", swift: "Swift", tender: "Tender",
  sharp: "Cutting", fierce: "Force", mixed: "Steady",
};

const MODE_DOT: Record<string, string> = {
  Action:     "oklch(0.70 0.18 150)",  // green
  Build:      "oklch(0.80 0.15 92)",   // bright gold
  Restraint:  "oklch(0.68 0.09 355)",   // mulberry (moved off the caution red)
  Selective:  "oklch(0.68 0.08 225)",  // teal
  Flex:       "oklch(0.72 0.10 280)",  // purple
  Activate:   "oklch(0.70 0.18 150)",
  ACTION:     "oklch(0.70 0.18 150)",
  BUILD:      "oklch(0.80 0.15 92)",
  RESTRAINT:  "oklch(0.68 0.09 355)",
  "SELECTIVE ACTION": "oklch(0.68 0.08 225)",
};

/** Adds an alpha value to an oklch() color string, e.g. "oklch(0.72 0.16 145)" → "oklch(0.72 0.16 145 / 0.15)" */
function withAlpha(oklch: string, alpha: number): string {
  // If it's already a CSS variable or non-oklch value, fall back to a neutral tint
  if (!oklch.startsWith("oklch(")) return `oklch(0.5 0 0 / ${alpha})`;
  return oklch.replace(")", ` / ${alpha})`);
}

/** Darkens an oklch() color by scaling its lightness, e.g. for hover/press fills. */
function darkenOklch(oklch: string, factor: number): string {
  const m = oklch.match(/^oklch\(([\d.]+)\s+([\d.]+)\s+([\d.]+)/);
  if (!m) return oklch;
  const L = Math.max(0, parseFloat(m[1]) * factor);
  return `oklch(${L.toFixed(3)} ${m[2]} ${m[3]})`;
}

// Planner-specific mode colors — now identical to shared since shared was fixed to gold
const PLANNER_MODE_OKLCH: Record<TaskMode, string> = {
  ...MODE_OKLCH,
};

const PLANNER_MODE_TINT: Record<TaskMode, string> = {
  ...MODE_TINT,
};

// Plain-language day-mode reference shown at the bottom of Today (collapsible),
// to help decide which tasks fit which mode. Mirrors the Glossary "Modes" entries.

// Task → AddTaskSheet's editTask shape. One mapping for every edit entry point (was duplicated
// three times — general, pinned, aligned — each a ~15-field literal that could drift apart).
function toSheetTask(t: any) {
  return {
    id: String(t.id),
    title: t.title,
    mode: t.mode,
    priority: t.priority === "High" ? 3 : t.priority === "Medium" ? 2 : 1,
    dueDate: t.dueDate ? new Date(t.dueDate).toISOString().split("T")[0] : undefined,
    isPinned: t.isPinned,
    wealthFlow: t.wealthFlow ?? false,
    projectId: t.projectId ?? null,
    cognitiveLoad: t.cognitiveLoad ?? null,
    physicalLoad: t.physicalLoad ?? null,
    creativeRequired: t.creativeRequired ?? null,
    socialRequired: t.socialRequired ?? null,
    emotionalLoad: t.emotionalLoad ?? null,
    notes: t.notes ?? null,
    recurrence: t.recurrence ?? null,
    lifeAreas: t.lifeAreas ?? null,
  };
}


export default function Planner() {
  const [, navigate] = useLocation();
  const { isAuthenticated, user } = useAuth();
  const { theme } = useTheme();
  const { settings } = useSettingsContext();

  // `today` is reactive so midnight rollover (with the app left open) advances the whole
  // hero — mode AND prose — to the new day, instead of freezing the read at page-load day.
  const [today, setToday] = useState(() => new Date());
  const [viewDate, setViewDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState(toDateStr(today));
  useEffect(() => {
    const check = () => {
      const now = new Date();
      if (toDateStr(now) === toDateStr(today)) return;
      // Only carry the user forward if they were sitting on "today"; leave a manually
      // selected past/future date alone.
      setSelectedDate((sd) => (sd === toDateStr(today) ? toDateStr(now) : sd));
      setToday(now);
    };
    const id = setInterval(check, 60_000);
    window.addEventListener("visibilitychange", check);
    window.addEventListener("focus", check);
    return () => { clearInterval(id); window.removeEventListener("visibilitychange", check); window.removeEventListener("focus", check); };
  }, [today]);
  const [reflection, setReflection] = useState("");
  const [reflectionSaved, setReflectionSaved] = useState(false);
  const [reflectionOpen, setReflectionOpen] = useState(false); // recorder collapsed — no big empty box by default

  // Task list state
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editTask, setEditTask] = useState<Task | null>(null);
  // Edit sheets for the curated daily lists (ported from the retired Today page)
  const [heroOpen, setHeroOpen] = useState(true);
  // Orb sheets reflect TODAY (not the calendar-selected date).
  const [orbSheetMode, setOrbSheetMode] = useState<TaskMode | null>(null);
  const [quickAddMode, setQuickAddMode] = useState<TaskMode | null>(null);
  // "Plan ahead" planning tools are collapsed by default — today-first.
  const [calendarOpen, setCalendarOpen] = useState(true); // Calendar is its own section, open by default
  const [pinnedOpen, setPinnedOpen] = useState(false); // both task lists ship collapsed — the hero is the only open block
  const [alignedOpen, setAlignedOpen] = useState(false);
  // SOFT OPEN (David 2026-07-16): the first open of a NEW day greets instead of demanding —
  // hero + calendar + at most one aligned task; orb numbers hidden; task lists held back
  // until one tap ("Show my day"). Once per local day; Settings can turn it off.
  const [softOpen, setSoftOpen] = useState(false);
  useEffect(() => {
    if (settings.softOpen === false) return;
    const todayStr = toDateStr(new Date());
    if (localStorage.getItem("velea-soft-open-seen") !== todayStr) {
      localStorage.setItem("velea-soft-open-seen", todayStr);
      setSoftOpen(true);
    }
  }, [settings.softOpen]);
  const [whyNowTask, setWhyNowTask] = useState<any>(null); // the aligned task whose "Why now?" pop-up is open
  const [allTasksOpen, setAllTasksOpen] = useState(false);
  const [taskSearch, setTaskSearch] = useState("");
  const [openKindGroups, setOpenKindGroups] = useState<Set<string>>(new Set());
  // Kind pop-up (David: orb tap → a dead-center pop-up of that kind's tasks, not a jump
  // into the accordion).
  const [kindPopup, setKindPopup] = useState<TaskKind | null>(null);
  const [completedOpen, setCompletedOpen] = useState(false);

  function getHouseSuffix(n: number | undefined): string {
    if (!n) return "th";
    if (n === 1) return "st";
    if (n === 2) return "nd";
    if (n === 3) return "rd";
    return "th";
  }

  const yearMonth = `${viewDate.getFullYear()}-${String(viewDate.getMonth() + 1).padStart(2, "0")}`;

  const { data: monthPanchang = [] } = trpc.panchang.byMonth.useQuery({ yearMonth });
  const { data: selectedPanchang, isFetching: panchangFetching } = trpc.panchang.byDate.useQuery({ date: selectedDate });
  // Today's panchang is needed to know the current day mode for auto-assigning on pin
  const { data: todayPanchang } = trpc.panchang.today.useQuery();
  // Crown days — the PERSONAL apex (your chart's tara+chandra+transits align), shown as
  // a gold crown badge + gold border on the calendar. (Golden days were removed.)
  const { data: crownData } = trpc.crown.forMonth.useQuery(
    { year: viewDate.getFullYear(), month: viewDate.getMonth() + 1 },
    { enabled: isAuthenticated, staleTime: 60 * 60 * 1000 },
  );
  // Collective sky labels — Mercury's course (David follows the WHOLE course; the ±3
  // days around each station are the worst) + eclipse days. One glyph, three
  // intensities: faint ☿ across the retrograde, stronger in station windows, full on
  // station day. Eclipses get the dark disc.
  const { data: skyMarks } = trpc.sky.monthMarks.useQuery({ yearMonth }, { enabled: isAuthenticated, staleTime: 60 * 60 * 1000 });
  // The day CHARACTER per date (the classical filter) — from the same crown.forMonth source.
  const charByDate = useMemo(() => {
    const m = new Map<string, any>();
    for (const d of (crownData?.days ?? []) as any[]) if (d.character) m.set(d.date, d.character);
    return m;
  }, [crownData]);
  const selectedCharacter = charByDate.get(selectedDate);
  // THE HANDSHAKE (hoisted above the ranking query, which feeds on it): the kinds
  // today's character supports — empty on hostile/contained days.
  const todaySupportedKinds = useMemo(() => {
    const c = charByDate.get(toDateStr(new Date()));
    return new Set<string>((c?.supportedKinds as string[] | undefined) ?? (c?.nature ? [c.nature] : []));
  }, [charByDate]);
  const rungByDate = useMemo(() => {
    const m = new Map<string, { num: number; quality: string }>();
    for (const d of (crownData?.days ?? []) as any[]) if (d.rung) m.set(d.date, d.rung);
    return m;
  }, [crownData]);
  // Every retrograde planet's marks, collapsed to a per-date list for the glyph strip.
  // Each planet contributes at most one state per day; strongest wins: station > window
  // > rx > shadow. `detail` feeds the tap popup.
  const retroByDate = useMemo(() => {
    const rank: Record<string, number> = { "station-retro": 5, "station-direct": 5, window: 4, rx: 3, shadow: 1 };
    const map = new Map<string, { planet: string; state: string; detail: string }[]>();
    const add = (date: string, planet: string, state: string, detail: string) => {
      let arr = map.get(date);
      if (!arr) { arr = []; map.set(date, arr); }
      const existing = arr.find((e) => e.planet === planet);
      if (existing) { if (rank[state] > rank[existing.state]) { existing.state = state; existing.detail = detail; } }
      else arr.push({ planet, state, detail });
    };
    for (const p of skyMarks?.retro ?? []) {
      for (const s of p.stations) add(s.date, p.planet, s.type === "turns retrograde" ? "station-retro" : "station-direct", s.type === "turns retrograde" ? "stations retrograde" : "stations direct");
      for (const d of p.windowDays) add(d, p.planet, "window", "station window — the roughest days");
      for (const d of p.retroDays) add(d, p.planet, "rx", "retrograde");
      for (const d of p.preShadowDays) add(d, p.planet, "shadow", "in its pre-shadow");
      for (const d of p.postShadowDays) add(d, p.planet, "shadow", "in its post-shadow");
      for (const d of p.shadowEnterDays) add(d, p.planet, "shadow", "enters its shadow");
      for (const d of p.shadowExitDays) add(d, p.planet, "shadow", "clears its shadow");
    }
    const order = ["Mercury", "Venus", "Mars", "Jupiter", "Saturn"];
    for (const arr of Array.from(map.values())) arr.sort((a, b) => order.indexOf(a.planet) - order.indexOf(b.planet));
    return map;
  }, [skyMarks]);
  // The retrograde planets present ANYWHERE this month, in canonical order — each gets a fixed
  // track slot under the coins so its span reads as one continuous horizontal line across days.
  const monthRetroPlanets = useMemo(() => {
    const present = new Set<string>((skyMarks?.retro ?? []).map((p) => p.planet));
    return ["Mercury", "Venus", "Mars", "Jupiter", "Saturn"].filter((p) => present.has(p));
  }, [skyMarks]);
  const eclipseByDate = useMemo(() => {
    const m = new Map<string, string>();
    for (const e of skyMarks?.eclipses ?? []) m.set(e.date, e.type);
    return m;
  }, [skyMarks]);
  const crownByDate = useMemo(() => {
    const m = new Map<string, string>();
    for (const d of (crownData?.days ?? []) as any[]) if (d.rating === "crown") m.set(d.date, d.why ?? "");
    return m;
  }, [crownData]);
  // Personal-weather gate, calendar edition: a personal CAUTION day is contained to Restraint
  // (mirrors server applyWeatherGate — the day sheet/hero get the same clamp server-side, so
  // tile color and prose always agree). See server/panchang/interpreter.ts.
  const cautionByDate = useMemo(() => {
    const m = new Map<string, string>();
    for (const d of (crownData?.days ?? []) as any[]) if (d.rating === "caution") m.set(d.date, d.why ?? "");
    return m;
  }, [crownData]);
  const cautionSet = useMemo(() => new Set(cautionByDate.keys()), [cautionByDate]);
  // Prosperity days — a lit WEALTH convergence window covers the date; the coin wears $
  // at glyph size (David 2026-07-16: "$ for prosperity", sized like the other glyphs).
  const prosperitySet = useMemo(
    () => new Set<string>(((crownData?.days ?? []) as any[]).filter((d) => d.prosperity).map((d) => d.date)),
    [crownData],
  );
  // Achievement days — Sadhaka tara (rung 6, the accomplisher): the coin wears ✓ (David).
  // Full/new moon days — a pale disc and a dark disc in the mark cluster (David).
  const moonPhaseByDate = useMemo(() => {
    const m = new Map<string, "full" | "new">();
    for (const d of ((crownData?.days ?? []) as any[])) if (d.moonPhase) m.set(d.date, d.moonPhase);
    return m;
  }, [crownData]);
  const achievementSet = useMemo(
    () => new Set<string>(((crownData?.days ?? []) as any[]).filter((d) => d.achievement).map((d) => d.date)),
    [crownData],
  );
  // The interaction MODE per day (David's two-lens precision model, server-gated) — the SAME mode
  // the day card/hero shows. crown.forMonth computes it off the day chart it already builds, so the
  // calendar tile and the day sheet never disagree. Falls back to the Moon-only byMonth mode when a
  // profile has no crown scan (no birth chart).
  const modeByDate = useMemo(() => {
    const m = new Map<string, string>();
    for (const d of (crownData?.days ?? []) as any[]) if (d.mode) m.set(d.date, d.mode);
    return m;
  }, [crownData]);
  // Golden days — the COLLECTIVE potential (panchang day-quality, no chart needed), brought
  // back as a golden BORDER on the calendar. Crown days = a golden day + the crown badge on top.
  const { data: goldenData } = trpc.sky.goldenDays.useQuery(
    { yearMonth: `${viewDate.getFullYear()}-${String(viewDate.getMonth() + 1).padStart(2, "0")}` },
    { enabled: isAuthenticated, staleTime: 60 * 60 * 1000 },
  );
  const goldenSet = useMemo(() => new Set<string>((goldenData?.potential ?? []) as string[]), [goldenData]);
  // Tapped crown day's popup — stores the cell's viewport anchor so the popup can render
  // fixed-to-viewport (never clipped by the calendar card's overflow).
  const [crownTip, setCrownTip] = useState<{ date: string; kind: "crown" | "caution" | "retro" | "eclipse" | "prosperity" | "achievement"; why: string; cx: number; top: number; bottom: number; accent: string } | null>(null);
  // Scroll-anchor: selecting a date re-renders the hero card ABOVE the calendar, whose height change
  // would otherwise shove the calendar and "jump" the screen. We capture the calendar's viewport top
  // on tap and restore it in a layout effect so the tapped cell stays visually put.
  const calendarRef = useRef<HTMLDivElement>(null);
  const scrollAnchorRef = useRef<number | null>(null);
  const ignoreScrollRef = useRef(false);
  useLayoutEffect(() => {
    const anchor = scrollAnchorRef.current;
    scrollAnchorRef.current = null;
    if (anchor == null || !calendarRef.current) return;
    const pin = () => {
      if (!calendarRef.current) return;
      const delta = calendarRef.current.getBoundingClientRect().top - anchor;
      if (Math.abs(delta) > 0.5) { ignoreScrollRef.current = true; window.scrollBy(0, delta); }
    };
    pin();
    // The day card above loads ASYNC after the tap — it collapses then re-grows, yanking the
    // page up and back. Keep the tapped cell pinned through that churn: re-correct on every
    // body resize for ~1.2s, then stand down.
    const until = performance.now() + 1200;
    let corrections = 0; // damp: iOS floats the fixed nav during scrollBy storms — few, meaningful corrections only
    const ro = new ResizeObserver(() => {
      if (performance.now() > until || corrections >= 3) { ro.disconnect(); return; }
      if (!calendarRef.current) return;
      const delta = calendarRef.current.getBoundingClientRect().top - anchor;
      if (Math.abs(delta) > 2) { corrections++; ignoreScrollRef.current = true; window.scrollBy(0, delta); }
    });
    ro.observe(document.body);
    const stop = window.setTimeout(() => ro.disconnect(), 1300);
    return () => { ro.disconnect(); window.clearTimeout(stop); };
  }, [selectedDate]);
  // Crown popup dismissal WITHOUT a scroll-blocking backdrop (that froze the page): close on an
  // outside pointer-down, on user scroll (the anchor correction's programmatic scroll is ignored
  // once), and on resize. The popup is anchored to a captured rect, so any real scroll should close it.
  useEffect(() => {
    if (!crownTip) return;
    const onScroll = () => { if (ignoreScrollRef.current) { ignoreScrollRef.current = false; return; } setCrownTip(null); };
    const onResize = () => setCrownTip(null);
    const onDown = (e: Event) => { const t = e.target as Element | null; if (!(t && t.closest && t.closest("[data-crowntip]"))) setCrownTip(null); };
    window.addEventListener("scroll", onScroll, { passive: true, capture: true });
    window.addEventListener("resize", onResize);
    const id = window.setTimeout(() => document.addEventListener("pointerdown", onDown), 0);
    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onResize);
      document.removeEventListener("pointerdown", onDown);
      window.clearTimeout(id);
    };
  }, [crownTip?.date]);
  const todayTaskMode = todayPanchang
    ? PANCHANG_TO_TASK_MODE[(modeByDate.get(toDateStr(today)) ?? todayPanchang.mode) as keyof typeof PANCHANG_TO_TASK_MODE]
    : undefined;
  const { data: allTasks = [], isSuccess: tasksLoaded } = trpc.tasks.list.useQuery(undefined, { enabled: isAuthenticated });

  // First zero-task day → nudge the standalone "how to add a task" guide, once.
  const taskGuideFiredRef = useRef(false);
  useEffect(() => {
    if (!isAuthenticated || !tasksLoaded || taskGuideFiredRef.current) return;
    if (allTasks.length !== 0) return;
    if (hasSeenTaskGuide(user?.id)) return;
    taskGuideFiredRef.current = true;
    const t = setTimeout(() => fireTaskGuide(), 900);
    return () => clearTimeout(t);
  }, [isAuthenticated, tasksLoaded, allTasks.length, user?.id]);

  // Ranked-for-today suggestions powering the "Aligned for today" list (ported from Home).
  const todayDateStr = useMemo(() => today.toISOString().split("T")[0], [today]);
  const { data: rankedTasks } = trpc.tasks.rankedForToday.useQuery(
    {
      todayMode: todayTaskMode ?? "Build",
      todayDate: todayDateStr,
      todayHouse: todayPanchang?.houseActivated ?? undefined,
      verdictShapesRanking: settings.verdictShapesRanking,
      meridianLift: settings.meridianLift,
      supportedKinds: Array.from(todaySupportedKinds),
    },
    { enabled: isAuthenticated && !!todayTaskMode }
  );
  // Today's check-in → the Rest gate (shared/rest-gate). A floor reading ("empty on every
  // axis") flips the "Aligned for today" surface from a task list to a rest card + a single
  // opt-in "one small thing" — rest is the aligned move, above the collective sky.
  const REST_TEAL = "#178F9E"; // Restore/Selective teal — the rest-gate accent
  const { data: todayCheckIn } = trpc.checkIn.today.useQuery(undefined, { enabled: isAuthenticated });
  const restGate = useMemo(() => evaluateRestGate(todayCheckIn as any), [todayCheckIn]);
  const [restOptIn, setRestOptIn] = useState(false);
  const { data: savedReflection } = trpc.reflections.get.useQuery(
    { date: selectedDate },
    { enabled: isAuthenticated }
  );
  const { data: activeProfile } = trpc.profiles.getActive.useQuery();
  const glanceProfileId = activeProfile?.id;
  // THE DAY READ — the ONE hero read (story + its final question). Auto-loads for the selected
  // date and server-caches per (profile, date), so re-selecting a day is free. It IS the hero:
  // the concise day-story replaced the old glance teaser + the "day in full" press-line, so
  // exactly one read generates per day (no double-pay). The prose generates for ANY date.
  const { data: dayRead, isFetching: dayReadFetching } = trpc.narrative.dayRead.useQuery(
    { profileId: glanceProfileId as number, date: selectedDate },
    { enabled: !!glanceProfileId, staleTime: 1000 * 60 * 30 },
  );
  const dayReadContent = (dayRead as any)?.read ?? null;

  const utils = trpc.useUtils();

  // Refresh today's reading — regenerates the daily read and CACHES it (no nowMs = not a
  // moment/ephemeral read), so the new one persists and returns on reload (David's expectation).
  // Each tap is a fresh Sonnet call, so the button is admin-gated in the UI.
  const [refreshingRead, setRefreshingRead] = useState(false);
  const updateToMoment = async () => {
    if (!glanceProfileId) return;
    setRefreshingRead(true);
    try {
      const res = await utils.narrative.dayRead.fetch({ profileId: glanceProfileId, date: selectedDate, refresh: true });
      utils.narrative.dayRead.setData({ profileId: glanceProfileId, date: selectedDate }, res);
    } finally {
      setRefreshingRead(false);
    }
  };

  const saveReflection = trpc.reflections.upsert.useMutation({
    onSuccess: () => {
      setReflectionSaved(true);
      setTimeout(() => setReflectionSaved(false), 2000);
      utils.reflections.get.invalidate({ date: selectedDate });
    },
  });

  const createMutation = trpc.tasks.create.useMutation({
    onMutate: async (input) => {
      await utils.tasks.list.cancel();
      const prev = utils.tasks.list.getData();
      const optimistic = {
        id: -Date.now(),
        userId: 0,
        profileId: null,
        title: input.title,
        mode: input.mode ?? "Build",
        priority: input.priority ?? "Medium",
        isPinned: input.isPinned ?? false,
        isCompleted: false,
        completedAt: null,
        dueDate: input.dueDate ?? null,
        wealthFlow: input.wealthFlow ?? false,
        projectId: input.projectId ?? null,
        projectName: null,
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        subtaskTotal: 0,
        subtaskCompleted: 0,
      } as Task & { subtaskTotal: number; subtaskCompleted: number; projectName: string | null };
      utils.tasks.list.setData(undefined, (old) => [optimistic, ...(old ?? [])]);
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) utils.tasks.list.setData(undefined, ctx.prev);
      toast.error("Failed to add task");
    },
    onSettled: () => {
      utils.tasks.list.invalidate();
      utils.tasks.modeCounts.invalidate();
    },
  });

  const updateMutation = trpc.tasks.update.useMutation({
    onMutate: async (input) => {
      await utils.tasks.list.cancel();
      const prev = utils.tasks.list.getData();
      utils.tasks.list.setData(undefined, (old) =>
        old?.map((t) => (t.id === input.id ? ({ ...t, ...input } as typeof t) : t))
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) utils.tasks.list.setData(undefined, ctx.prev);
      toast.error("Failed to update task");
    },
    onSettled: () => {
      utils.tasks.list.invalidate();
      utils.tasks.modeCounts.invalidate();
      utils.tasks.pinnedForToday.invalidate();
      utils.tasks.rankedForToday.invalidate();
    },
  });

  const deleteMutation = trpc.tasks.delete.useMutation({
    onMutate: async ({ id }) => {
      await utils.tasks.list.cancel();
      const prev = utils.tasks.list.getData();
      utils.tasks.list.setData(undefined, (old) => old?.filter((t) => t.id !== id));
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) utils.tasks.list.setData(undefined, ctx.prev);
      toast.error("Failed to delete task");
    },
    onSettled: () => {
      utils.tasks.list.invalidate();
      utils.tasks.modeCounts.invalidate();
      utils.tasks.rankedForToday.invalidate();
    },
  });

  const purgeCompleted = trpc.tasks.purgeCompleted.useMutation({
    onSuccess: ({ removed }) => {
      utils.tasks.list.invalidate();
      utils.tasks.modeCounts.invalidate();
      utils.tasks.rankedForToday.invalidate();
      utils.tasks.dueList.invalidate();
      toast.success(removed > 0 ? `Cleared ${removed} completed task${removed > 1 ? "s" : ""}` : "No completed tasks to clear");
    },
    onError: () => toast.error("Failed to clear completed tasks"),
  });

  const toggleComplete = trpc.tasks.update.useMutation({
    onMutate: async ({ id, isCompleted }) => {
      await utils.tasks.list.cancel();
      const prev = utils.tasks.list.getData();
      utils.tasks.list.setData(undefined, (old) =>
        old?.map((t) => (t.id === id ? { ...t, isCompleted: isCompleted ?? t.isCompleted } : t))
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) utils.tasks.list.setData(undefined, ctx.prev);
    },
    onSettled: () => {
      utils.tasks.list.invalidate();
      utils.tasks.modeCounts.invalidate();
    },
  });

  const togglePin = trpc.tasks.update.useMutation({
    onMutate: async ({ id, isPinned }) => {
      await utils.tasks.list.cancel();
      const prev = utils.tasks.list.getData();
      utils.tasks.list.setData(undefined, (old) =>
        old?.map((t) => (t.id === id ? { ...t, isPinned: isPinned ?? t.isPinned } : t))
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) utils.tasks.list.setData(undefined, ctx.prev);
    },
    onSettled: () => {
      utils.tasks.list.invalidate();
      utils.tasks.modeCounts.invalidate();
    },
  });

  const deleteTask = trpc.tasks.delete.useMutation({
    onMutate: async ({ id }) => {
      await utils.tasks.list.cancel();
      const prev = utils.tasks.list.getData();
      utils.tasks.list.setData(undefined, (old) => old?.filter((t) => t.id !== id));
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) utils.tasks.list.setData(undefined, ctx.prev);
      toast.error("Failed to delete task");
    },
    onSettled: () => {
      utils.tasks.list.invalidate();
      utils.tasks.modeCounts.invalidate();
    },
  });

  const handleSave = (data: { title: string; mode: TaskMode; priority: TaskPriority; isPinned: boolean; dueDate?: string | null }) => {
    if (editTask) {
      updateMutation.mutate({ id: editTask.id, ...data });
    } else {
      createMutation.mutate(data);
    }
    setEditTask(null);
  };

  const handleEdit = (task: Task) => {
    setEditTask(task);
    setSheetOpen(true);
  };

  const panchangByDate = useMemo(() => {
    const map: Record<string, typeof monthPanchang[0]> = {};
    for (const p of monthPanchang) map[p.date] = p;
    return map;
  }, [monthPanchang]);

  const selectedTaskMode = selectedPanchang
    ? PANCHANG_TO_TASK_MODE[(modeByDate.get(selectedDate) ?? selectedPanchang.mode) as keyof typeof PANCHANG_TO_TASK_MODE]
    : undefined;

  const isFlexDay = (selectedPanchang?.mode as string) === "Flex" || (selectedPanchang?.mode as string) === "FLEX";

  const PRIORITY_ORDER: Record<string, number> = { high: 0, medium: 1, low: 2 };

  const matchedTasks = useMemo(() => {
    const now = Date.now();
    const notSnoozed = allTasks.filter((t) => !t.snoozedUntil || t.snoozedUntil <= now);
    const base = isFlexDay
      ? notSnoozed.filter((t) => (t.mode === "Build" || t.mode === "Action") && !t.isCompleted)
      : selectedTaskMode
      ? notSnoozed.filter((t) => t.mode === selectedTaskMode && !t.isCompleted)
      : [];
    return base
      .sort((a, b) => {
        // Pinned first, then by priority
        if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
        return (PRIORITY_ORDER[a.priority] ?? 1) - (PRIORITY_ORDER[b.priority] ?? 1);
      })
      .slice(0, 3);
  }, [allTasks, selectedTaskMode, isFlexDay]);

  // Orb counts reflect TODAY, derived from the single allTasks source so there is
  // no extra fetch. Mirrors server tasks.modeCounts / tasks.dueList semantics.
  const orbModeCounts = useMemo(() => {
    const now = Date.now();
    const active = allTasks.filter((t) => !t.snoozedUntil || t.snoozedUntil <= now);
    return {
      Restraint: active.filter((t) => t.mode === "Restraint" && !t.isCompleted).length,
      Build: active.filter((t) => t.mode === "Build" && !t.isCompleted).length,
      Selective: active.filter((t) => t.mode === "Selective" && !t.isCompleted).length,
      Action: active.filter((t) => t.mode === "Action" && !t.isCompleted).length,
    } as Record<TaskMode, number>;
  }, [allTasks]);
  // THE SEVEN KINDS (David 2026-07-15: "7 to be precise… funnel and organize them for me
  // automatically"): every task LIVE-classified into the classical vocabulary — nothing
  // stored, the four-mode tag underneath is untouched (scorer/rest-gate bridge intact).
  const kindByTaskId = useMemo(() => {
    const m = new Map<number, TaskKind>();
    for (const t of allTasks) m.set(t.id, kindOfTask(t));
    return m;
  }, [allTasks]);
  const orbKindCounts = useMemo(() => {
    const now = Date.now();
    const counts = Object.fromEntries(KIND_ORDER.map((k) => [k, 0])) as Record<TaskKind, number>;
    for (const t of allTasks) {
      if (t.isCompleted || (t.snoozedUntil && t.snoozedUntil > now)) continue;
      counts[kindByTaskId.get(t.id) ?? "mixed"]++;
    }
    return counts;
  }, [allTasks, kindByTaskId]);
  const todayKind = charByDate.get(toDateStr(today))?.nature as TaskKind | undefined;
  // Whole-sign rulerships from the active profile's lagna — powers the personalized
  // retrograde lines ("for you, this reviews …"), deterministic and free.
  const SIGN_ORDER = ["Aries","Taurus","Gemini","Cancer","Leo","Virgo","Libra","Scorpio","Sagittarius","Capricorn","Aquarius","Pisces"];
  const RULES: Record<string, string[]> = { Sun: ["Leo"], Moon: ["Cancer"], Mars: ["Aries","Scorpio"], Mercury: ["Gemini","Virgo"], Jupiter: ["Sagittarius","Pisces"], Venus: ["Taurus","Libra"], Saturn: ["Capricorn","Aquarius"] };
  const HOUSE_ROOM: Record<number, string> = { 1: "how you're received", 2: "money & livelihood", 3: "your inner circle & the craft of your hands", 4: "home & roots", 5: "children & creations", 6: "health & the daily grind", 7: "the partner", 8: "shared resources & the depths", 9: "belief & the far horizon", 10: "your public name", 11: "gains & the wider circle", 12: "retreat & what you spend" };
  const RX_POSTURE: Record<string, string> = {
    Mercury: "The review runs strong — what you revise now holds. Re-read everything; re-sign nothing.",
    Venus: "Old loves and old tastes resurface for re-valuing. Restore before you re-spend.",
    Mars: "Force turns inward — train, repair, re-strategize; don't pick the fight.",
    Jupiter: "The teacher revisits old lessons — re-study what you already believe.",
    Saturn: "The structure re-inspects itself — tighten what stands before building higher.",
  };
  const rxRoomsFor = (planet: string): string | null => {
    const lagna = (activeProfile as any)?.lagnaSign;
    const li = lagna ? SIGN_ORDER.indexOf(lagna) : -1;
    if (li < 0) return null;
    const rooms = (RULES[planet] ?? []).map((sg) => HOUSE_ROOM[((SIGN_ORDER.indexOf(sg) - li + 12) % 12) + 1]).filter(Boolean);
    return rooms.length ? rooms.join(" and ") : null;
  };

  // Priority sort order (title-case to match DB enum)
  const PRIORITY_RANK: Record<string, number> = { High: 0, Medium: 1, Low: 2 };

  // Today's mode color for the curated daily lists (ported from Home).
  const todayModeColor = "var(--day-accent)"; // daily list accents follow the day

  // Pinned for Now: explicitly pinned, not completed, sorted by priority.
  const pinnedForNow = useMemo(() => {
    const now = Date.now();
    const localToday = toDateStr(new Date());
    // Due tasks (overdue or due TODAY) auto-populate To Do alongside the user's pins — the ONLY
    // thing that ever lands here automatically (the Due orb was retired). A pinned-and-due task
    // shows once via the OR.
    const isDueNow = (t: any) => {
      if (!t.dueDate) return false;
      const due = typeof t.dueDate === "string" ? t.dueDate.slice(0, 10) : toDateStr(new Date(t.dueDate));
      return due <= localToday;
    };
    return allTasks
      .filter((t) =>
        !t.isCompleted &&
        (!t.snoozedUntil || t.snoozedUntil <= now) &&
        (t.isPinned || isDueNow(t))
      )
      .sort((a, b) => {
        const pa = PRIORITY_RANK[a.priority ?? "Low"] ?? 2;
        const pb = PRIORITY_RANK[b.priority ?? "Low"] ?? 2;
        return pa - pb;
      });
  }, [allTasks]);

  // Aligned for Today: ranked tasks that are NOT already pinned (avoid duplication),
  // limited by the user's todayTaskLimit. Display order follows the backend score.
  const alignedForToday = useMemo(() => {
    if (!rankedTasks) return [];
    const pinnedIds = new Set(pinnedForNow.map((t) => t.id));
    // Respect the optimistic `list` state (updated instantly on complete/delete) so
    // an aligned task leaves the list the moment it's tapped — instead of waiting for
    // rankedForToday to refetch from the (slow) server.
    const liveById = new Map(allTasks.map((t) => [t.id, t]));
    const limit = settings.todayTaskLimit;
    // Motivation is the master gate: when drive is on the floor (1–2), a demanding task
    // (anything above pure-low load) doesn't just rank lower — it shouldn't be *shown* as
    // aligned at all (seeing it creates friction). Only gentle, low-friction tasks survive.
    const lowMotivation = ((todayCheckIn as any)?.motivation ?? 5) <= 2;
    const isDemanding = (t: any) =>
      (t.cognitiveLoad && t.cognitiveLoad !== "Low") ||
      (t.physicalLoad && t.physicalLoad !== "Low") ||
      (t.emotionalLoad && t.emotionalLoad !== "Low") ||
      t.creativeRequired || t.socialRequired;
    const filtered = rankedTasks.filter((t) => {
      if (pinnedIds.has(t.id)) return false;
      // Only trust the live list once it has loaded, so a cold/slow list load
      // doesn't briefly hide everything.
      if (tasksLoaded) {
        const live = liveById.get(t.id);
        if (!live || live.isCompleted) return false; // deleted or just-completed
        if (lowMotivation && isDemanding(live)) return false; // motivation master-gate
      } else if (lowMotivation && isDemanding(t)) {
        return false;
      }
      return true;
    });
    return limit === "unlimited" ? filtered : filtered.slice(0, Number(limit));
  }, [rankedTasks, pinnedForNow, allTasks, tasksLoaded, settings.todayTaskLimit, todayCheckIn]);

  // Alignment-with-today per task (from the scored list), so Do Now / pinned tasks
  // can show their fit even though the floor forces them to the top. Off-mode tasks
  // aren't scored today → low alignment (20 ≈ 1 dot).
  // THE HANDSHAKE MISS: every day-supported kind sits at zero tasks → name where the
  // ranking actually lands (the top aligned task's kind). Sky stays lit; truth gets a voice.
  // THE LEADING KIND (David 2026-07-16 "half-light on the kind orbs. do it."): the top
  // aligned task's kind ALWAYS wears the half-light when it isn't the sky's lit kind —
  // the row always shows where your alignment actually leans.
  const leadingKind = useMemo(() => {
    if (alignedForToday.length === 0) return null;
    const lead = kindOfTask(alignedForToday[0]);
    return todaySupportedKinds.has(lead) ? null : lead;
  }, [todaySupportedKinds, alignedForToday]);
  // The whisper still narrates only the TRUE miss (every supported kind at zero).
  const handshakeMissKind = useMemo(() => {
    if (todaySupportedKinds.size === 0) return null;
    const allEmpty = Array.from(todaySupportedKinds).every((k) => (orbKindCounts[k as TaskKind] ?? 0) === 0);
    if (!allEmpty) return null;
    return leadingKind;
  }, [todaySupportedKinds, orbKindCounts, leadingKind]);

  const alignmentById = useMemo(() => {
    const m = new Map<number, number>();
    (rankedTasks ?? []).forEach((t: any) => { if (typeof t.alignment === "number") m.set(t.id, t.alignment); });
    return m;
  }, [rankedTasks]);

  // Calendar
  const daysInMonth = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0).getDate();
  const firstDayOfWeek = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1).getDay();
  const calendarCells: (number | null)[] = [
    ...Array(firstDayOfWeek).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  useEffect(() => { setReflection(savedReflection?.content ?? ""); }, [savedReflection?.content, selectedDate]);

  const prevMonth = () => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
  const nextMonth = () => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
  // Tap the serif "July 2026" to jump: a year stepper + 12-month grid (David 2026-07-15:
  // "maybe it's a matter of selecting the year or the month to scroll and load").
  const [monthPickerOpen, setMonthPickerOpen] = useState(false);
  const [pickerYear, setPickerYear] = useState<number | null>(null);

  const todayTaskModeForGradient = todayPanchang
    ? PANCHANG_TO_TASK_MODE[(modeByDate.get(toDateStr(today)) ?? todayPanchang.mode) as keyof typeof PANCHANG_TO_TASK_MODE]
    : undefined;
  const modeRgba = todayTaskModeForGradient ? MODE_RGBA[todayTaskModeForGradient] : MODE_RGBA.Build;

  // Hero gradient for selected date
  const selectedTaskModeForHero = selectedPanchang
    ? PANCHANG_TO_TASK_MODE[(modeByDate.get(selectedDate) ?? selectedPanchang.mode) as keyof typeof PANCHANG_TO_TASK_MODE]
    : undefined;
  // THE CARD LEADS WITH ITS CALENDAR COLOR (David 2026-07-16): the hero gradient's top
  // stop IS the day's coin (movement + depth), then it goes down into its own shadow.
  const selectedDescent = heroDescentFor(selectedCharacter);
  const heroGradient = selectedDescent
    ? selectedDescent
    : selectedTaskModeForHero === 'Action'
    ? 'var(--velea-action-gradient)'
    : selectedTaskModeForHero === 'Build'
    ? 'var(--velea-build-gradient)'
    : selectedTaskModeForHero === 'Selective'
    ? 'var(--velea-selective-gradient)'
    : selectedTaskModeForHero === 'Restraint'
    ? 'var(--velea-restraint-gradient)'
    : selectedPanchang
    ? `rgba(${selectedTaskModeForHero ? MODE_RGBA[selectedTaskModeForHero] : modeRgba}, 0.25)`
    : 'var(--card)';
  // Angled card gradient — reads flatter/cleaner on short cards (e.g. the collapsed
  // Time Lord pill) than the tall 180deg hero gradient.
  const heroCardGradient = selectedDescent
    ? heroDescentFor(selectedCharacter, 200)
    : selectedTaskModeForHero === 'Action'
    ? 'var(--velea-action-card-gradient)'
    : selectedTaskModeForHero === 'Build'
    ? 'var(--velea-build-card-gradient)'
    : selectedTaskModeForHero === 'Selective'
    ? 'var(--velea-selective-card-gradient)'
    : selectedTaskModeForHero === 'Restraint'
    ? 'var(--velea-restraint-card-gradient)'
    : heroGradient;
  const selectedModeRgba = selectedTaskModeForHero ? MODE_RGBA[selectedTaskModeForHero] : modeRgba;
  // The day card is (re)loading for the selected date — used to visibly mark the whole box as pending.
  const dayCardLoading = panchangFetching || dayReadFetching;

  // Calendar card: use today's mode color for strip header + border
  // The calendar frame + location chip follow the day accent (David: no generic gold).
  const calModeColor = "var(--day-accent)";
  const [fullSpectrum] = useFullSpectrum();

  return (
    <div className="min-h-screen w-full relative">
      {/* Content */}
      <div
        className="container py-6 space-y-5 relative z-10"
      >
      {/* Shared app header — hero layout identical to Today page */}
      <AppHeader
        heroMode={{ qualifier: todayPanchang?.qualifier ?? null }}
      />

      {isAuthenticated && <AddToHomeScreenNote />}
      {isAuthenticated && <MeridianWhisper />}

      {/* ── HERO DAY MODE CARD — the primary read, first thing after the header ── */}
      {selectedPanchang ? (
        <div className="relative z-10">
          <div
            data-tour="today-mode"
            className="relative overflow-hidden"
            style={{
              borderRadius: '28px',
              padding: '1.75rem 1.75rem 1.5rem',
              background: heroGradient,
              ["--hero-ink" as any]: "color-mix(in srgb, var(--day-accent) 14%, #FBF7ED)",
              minHeight: heroOpen ? '280px' : undefined,
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* Loading: a pulsing ring around the whole box so it's obvious the read for this date is
                on its way (not an empty/finished card). */}
            {dayCardLoading && (
              <div
                className="animate-pulse"
                aria-hidden
                style={{ position: 'absolute', inset: 0, borderRadius: '28px', border: '2px solid color-mix(in srgb, var(--hero-ink) 65%, transparent)', pointerEvents: 'none', zIndex: 3 }}
              />
            )}
            {/* Header row — admin "update to the moment" (LEFT corner) + DATE label (toggles) + caret
                (RIGHT corner). The refresh lives OPPOSITE the caret with the date between them, so the
                two tap targets never crowd — reaching for one can't catch the other. */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', width: '100%', marginBottom: '0.25rem' }}>
              {/* Premium preview (admin only): regenerate the day-read to this moment. */}
              {user?.role === "admin" && glanceProfileId && dayReadContent && (
                <button
                  type="button"
                  onClick={updateToMoment}
                  disabled={refreshingRead}
                  title="Refresh today's reading"
                  aria-label="Refresh today's reading"
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, color: 'color-mix(in srgb, var(--day-accent-deep) 75%, transparent)', display: 'flex', alignItems: 'center', flexShrink: 0 }}
                >
                  <RefreshCw size={14} className={refreshingRead ? 'animate-spin' : ''} />
                </button>
              )}
              <button
                type="button"
                onClick={() => setHeroOpen((v) => !v)}
                style={{ display: 'flex', alignItems: 'center', flex: 1, minWidth: 0, background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left' }}
              >
                <span
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    letterSpacing: '0.14em',
                    textTransform: 'uppercase',
                    color: 'color-mix(in srgb, var(--day-accent-deep) 75%, transparent)',
                  }}
                >
                  {selectedDate === toDateStr(today) ? "TODAY'S READ" : `${selectedPanchang.dayOfWeek}, ${selectedPanchang.date}`}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setHeroOpen((v) => !v)}
                aria-label={heroOpen ? 'Collapse' : 'Expand'}
                style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', flexShrink: 0 }}
              >
                <ChevronDown
                  size={17}
                  style={{ marginTop: -2, color: 'color-mix(in srgb, var(--day-accent-deep) 70%, transparent)', transform: heroOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 200ms ease' }}
                />
              </button>
            </div>

            {/* GIANT MODE NAME */}
            <h2
              style={{
                fontFamily: "'Playfair Display', 'Georgia', ui-serif, serif",
                fontSize: 'clamp(2rem, 8vw, 2.75rem)', // same scale as the greeting (David)
                fontWeight: 700,
                lineHeight: 1,
                color: 'var(--hero-ink)',
                letterSpacing: '-0.02em',
                marginBottom: '0.65rem',
              }}
            >
              {selectedCharacter
                ? (selectedCharacter.movementWord ?? (selectedCharacter.contained ? "Caution" : NATURE_WORD[selectedCharacter.nature] ?? selectedCharacter.nature))
                : (selectedTaskModeForHero ?? selectedPanchang.mode)}
            </h2>

            {/* Depth — the rung confessing under the word (extremes only, no noise).
                Build, Selective and Action all carry it; Golden and Caution stay flat. */}
            {(() => {
              const depth = selectedCharacter?.depth ?? selectedCharacter?.buildDepth;
              if (!depth || depth === "mid") return null;
              return (
                <p style={{ fontSize: 'clamp(0.72rem, 3vw, 0.9rem)', fontWeight: 600, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'color-mix(in srgb, var(--hero-ink) 90%, transparent)', marginTop: '-0.5rem', marginBottom: '0.35rem' }}>
                  {depth === "deep" ? "deep — the ground holds a lot today"
                    : depth === "leaning" ? "leaning restraint — tend, but keep it gentle"
                    : "thin — tend with a lighter hand"}
                </p>
              );
            })()}
            {/* The day's character line — the classical filter's headline + tilt. */}
            {selectedCharacter && (
              <p style={{ fontSize: 'clamp(0.8rem, 3.4vw, 1rem)', fontWeight: 400, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'color-mix(in srgb, var(--hero-ink) 85%, transparent)', marginTop: '-0.35rem', marginBottom: '0.4rem' }}>
                {selectedCharacter.headline}
              </p>
            )}
            {selectedCharacter && (
              <p style={{ fontSize: 'clamp(0.78rem, 3.2vw, 0.95rem)', fontStyle: 'italic', color: 'color-mix(in srgb, var(--hero-ink) 85%, transparent)', marginTop: '0', marginBottom: '0.85rem' }}>
                {selectedCharacter.sentence}
              </p>
            )}

            {/* Qualifier — legacy mode qualifier; only when no character came back */}
            {!selectedCharacter && (() => {
              const q = (selectedPanchang as any).qualifier as string | undefined;
              const base = selectedTaskModeForHero ?? selectedPanchang.mode;
              if (!q || q === base) return null;
              return (
                <p
                  style={{
                    fontSize: 'clamp(0.8rem, 3.4vw, 1rem)',
                    fontWeight: 400,
                    letterSpacing: '0.2em',
                    textTransform: 'uppercase',
                    color: 'color-mix(in srgb, var(--hero-ink) 82%, transparent)',
                    marginTop: '-0.35rem',
                    marginBottom: '0.85rem',
                  }}
                >
                  {q}
                </p>
              );
            })()}

            {/* The day turns — legacy note; it names the RETIRED modes, so it only renders
                when no character came back (audit 2026-07-15). */}
            {!selectedCharacter && (selectedPanchang as any).turnsAtNote && (
              <p style={{ fontSize: 'clamp(0.72rem, 3vw, 0.85rem)', fontStyle: 'italic', color: 'color-mix(in srgb, var(--hero-ink) 85%, transparent)', marginTop: '-0.3rem', marginBottom: '0.85rem' }}>
                {(selectedPanchang as any).turnsAtNote}
              </p>
            )}

            {heroOpen && (<>
            {/* THE DAY STORY — the hero read: one flowing story (scene → story → tilt), closed by
                the carried line. Auto-loads; the concise story IS the hero (no teaser, no press-
                line). Pure prose on the hero ground, glossary-linked. */}
            {(() => {
              // Only the generated read — never fabricated/hard-coded prose. If it isn't
              // ready, show the loading shimmer; if genuinely absent, show nothing.
              if (!dayReadContent) {
                return dayReadFetching
                  ? <div style={{ marginBottom: '1.25rem' }}><ProseLoading label="Crafting today's reading — this can take up to a minute the first time…" /></div>
                  : null;
              }
              const paras = [dayReadContent.scene, dayReadContent.story, dayReadContent.tilt].filter(Boolean);
              return (
                <div style={{ marginBottom: '1rem' }}>
                  {paras.map((para: string, i: number) => (
                    <p
                      key={i}
                      style={{
                        fontFamily: "'Inter', ui-sans-serif, sans-serif",
                        fontSize: 'clamp(0.8rem, 3.2vw, 0.875rem)',
                        lineHeight: 1.65,
                        color: 'color-mix(in srgb, var(--hero-ink) 90%, transparent)',
                        fontWeight: 400,
                        marginBottom: '0.7rem',
                      }}
                    >
                      <GlossaryText>{para}</GlossaryText>
                    </p>
                  ))}
                  {dayReadContent.closeLine && (
                    <p
                      style={{
                        fontFamily: "'Inter', ui-sans-serif, sans-serif",
                        fontSize: 'clamp(0.85rem, 3.4vw, 0.95rem)',
                        lineHeight: 1.55,
                        fontStyle: 'italic',
                        fontWeight: 600,
                        color: 'var(--hero-ink)',
                        marginTop: '0.9rem',
                        marginBottom: 0,
                      }}
                    >
                      <GlossaryText>{dayReadContent.closeLine}</GlossaryText>
                    </p>
                  )}
                </div>
              );
            })()}

            {/* THE CAST surface is RETIRED (David 2026-07-15: "eliminate the cast pop-up
                completely by leaning into it in the hero prose") — the story now carries
                its own cast; SignpostSheet stays in the codebase for easy rollback. */}

            {/* Panchang mini row */}
            <div data-tour="panchang-terms" className="flex items-center gap-4 flex-wrap" style={{ marginBottom: '1.25rem' }}>
              <div className="flex items-center gap-1.5">
                <Moon size={14} style={{ color: 'color-mix(in srgb, var(--hero-ink) 60%, transparent)' }} />
                {selectedPanchang.nakshatraTransitionTime && selectedPanchang.nakshatraAfterTransition ? (
                  <span style={{ fontSize: '0.9rem', color: 'color-mix(in srgb, var(--hero-ink) 85%, transparent)' }}>
                    <GlossaryLink term={selectedPanchang.nakshatraAtSunrise ?? ''}>{selectedPanchang.nakshatraAtSunrise}</GlossaryLink>
                    <span style={{ color: 'color-mix(in srgb, var(--hero-ink) 50%, transparent)' }}> → </span>
                    <GlossaryLink term={selectedPanchang.nakshatraAfterTransition ?? ''}>{selectedPanchang.nakshatraAfterTransition}</GlossaryLink>
                    <span style={{ color: 'color-mix(in srgb, var(--hero-ink) 50%, transparent)' }}> {selectedPanchang.nakshatraTransitionTime}</span>
                  </span>
                ) : (
                  <span style={{ fontSize: '0.9rem', color: 'color-mix(in srgb, var(--hero-ink) 85%, transparent)' }}><GlossaryLink term={selectedPanchang.nakshatra ?? ''}>{selectedPanchang.nakshatra}</GlossaryLink></span>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                <span style={{ fontSize: '0.9rem', color: 'color-mix(in srgb, var(--hero-ink) 50%, transparent)' }}>☽</span>
                <span style={{ fontSize: '0.9rem', color: 'color-mix(in srgb, var(--hero-ink) 85%, transparent)' }}><GlossaryLink term={selectedPanchang.moonSign ?? ''}>{selectedPanchang.moonSign}</GlossaryLink></span>
              </div>
              {selectedPanchang.sunriseLocal && (
                <div className="flex items-center gap-1.5">
                  <Sunrise size={14} style={{ color: 'color-mix(in srgb, var(--hero-ink) 60%, transparent)' }} />
                  <span style={{ fontSize: '0.9rem', color: 'color-mix(in srgb, var(--hero-ink) 85%, transparent)' }}>{selectedPanchang.sunriseLocal}</span>
                </div>
              )}
              <div className="flex items-center gap-1.5">
                <span style={{ fontSize: '0.9rem', color: 'color-mix(in srgb, var(--hero-ink) 50%, transparent)' }}>◑</span>
                <span style={{ fontSize: '0.9rem', color: 'color-mix(in srgb, var(--hero-ink) 85%, transparent)' }}><GlossaryLink term={(selectedPanchang.tithi ?? '').replace(/^(shukla|krishna)\s+/i, '')}>{selectedPanchang.tithi}</GlossaryLink></span>
              </div>
            </div>

            {/* Italic question — the day-read's own closing question; no hard-coded fallback. */}
            {dayReadContent?.question && (
            <p
              style={{
                marginTop: 'auto',
                marginLeft: 'auto',
                marginRight: 'auto',
                maxWidth: '80ch',
                paddingTop: '1rem',
                fontFamily: "'Inter', ui-sans-serif, sans-serif",
                fontStyle: 'italic',
                fontSize: 'clamp(0.875rem, 3.5vw, 1rem)',
                lineHeight: 1.5,
                color: 'color-mix(in srgb, var(--hero-ink) 80%, transparent)',
                textAlign: 'center',
                textWrap: 'balance',
              }}
            >
              <GlossaryText>{dayReadContent.question}</GlossaryText>
            </p>
            )}

            {/* Kept Readings — at the very bottom, under the day's final question: pin this reading
                + link to the timestamped archive (gated teaser). */}
            {glanceProfileId && dayReadContent && (
              <KeptReadings profileId={glanceProfileId} date={selectedDate} />
            )}
            </>)}
          </div>
        </div>
      ) : (
        <div className="glass-card p-4 relative z-10">
          {panchangFetching ? (
            <ProseLoading color="var(--color-muted-foreground)" label="Reading the day…" />
          ) : (
            <p className="text-sm text-center" style={{ color: "var(--color-muted-foreground)" }}>No panchang data for this date.</p>
          )}
        </div>
      )}

      {/* ── CALENDAR — its own section, OPEN by default unless the user collapses it (David). ── */}
      <div className="flex items-center w-full relative z-10">
        <button
          onClick={() => setCalendarOpen((v) => !v)}
          className="flex items-center gap-2 flex-1 py-2 transition-all"
        >
          <span
            className="text-sm font-bold uppercase"
            style={{ color: "var(--heading-ink)", letterSpacing: "0.04em" }}
          >
            Calendar
          </span>
          <ChevronDown
            size={17}
            style={{
              color: "var(--color-muted-foreground)",
              transform: calendarOpen ? "rotate(180deg)" : "rotate(0deg)",
              transition: "transform 200ms ease",
            }}
          />
        </button>
        {/* The ranked YEAR view (crown-day calendar, whole-year edition) — admin-gated v1. */}
        {user?.role === "admin" && (
          <button
            onClick={() => navigate("/year")}
            className="px-2 py-1 text-xs font-semibold uppercase tracking-wide"
            style={{ color: "var(--day-accent)" }}
          >
            Year ↗
          </button>
        )}
      </div>
      {calendarOpen && (
        <div className="space-y-5">
      {/* Current location — above the calendar so it's always in view and one tap to change (David). */}
      <LocationChip accent={calModeColor} />
      {/* ── 1. CALENDAR ── */}
      <div
        ref={calendarRef}
        className="parchment relative z-10 overflow-hidden"
        style={{
          borderRadius: "16px",
          // Soft sliver frame — a 1px hairline at low opacity of the day-mode color (David).
          border: `1.5px solid color-mix(in srgb, ${calModeColor} 38%, transparent)`,
          // The calendar is ALWAYS a LIGHT almanac page (coins are tuned for a light surface), but
          // its exact tone is appearance-aware (Option A): warm PAPER + a soft shadow on dark/FS so it
          // glows as an artifact ON the dark, and clean near-white with a whisper of shadow on light so
          // it doesn't read dingy against the white app bg. Both defined in index.css per theme.
          background: "var(--parchment)",
          boxShadow: "var(--parchment-shadow)",
        }}
      >
        {/* Month header — the colored band is gone (David); month/year/arrows sit on the light
            surface as dark gray. The thin colored border around the whole calendar stays. */}
        <div className="flex items-center justify-between px-4 pt-4 pb-1">
          {/* Serif month, LEFT-aligned (David) — tap it to pick a month/year directly. */}
          <button
            onClick={() => { setMonthPickerOpen((v) => !v); setPickerYear(viewDate.getFullYear()); }}
            className="flex items-baseline gap-2 active:opacity-70 transition-opacity"
          >
            <h2
              style={{
                fontFamily: "'Playfair Display', Georgia, ui-serif, serif",
                fontSize: "1.45rem",
                fontWeight: 700,
                color: "var(--heading-ink)",
                letterSpacing: "0.01em",
              }}
            >
              {MONTHS[viewDate.getMonth()]} {viewDate.getFullYear()}
            </h2>
            <ChevronDown size={16} style={{ marginTop: -2, color: "#8a8264", transform: monthPickerOpen ? "rotate(180deg)" : "none", transition: "transform 200ms ease" }} />
          </button>
          <div className="flex items-center gap-1.5">
            <button
              onClick={prevMonth}
              className="p-1 rounded-full transition-all duration-150 active:scale-95"
              style={{ color: "var(--day-accent)", background: "color-mix(in srgb, var(--day-accent) 10%, transparent)" }}
            >
              <ChevronLeft size={15} />
            </button>
            <button
              onClick={nextMonth}
              className="p-1 rounded-full transition-all duration-150 active:scale-95"
              style={{ color: "var(--day-accent)", background: "color-mix(in srgb, var(--day-accent) 10%, transparent)" }}
            >
              <ChevronRight size={15} />
            </button>
          </div>
        </div>
        {/* The jump picker — a year stepper + the twelve months, on the calendar's own paper. */}
        {monthPickerOpen && (
          <div className="px-4 pb-2">
            <div className="flex items-center justify-center gap-4 mb-2">
              <button onClick={() => setPickerYear((y) => (y ?? viewDate.getFullYear()) - 1)} className="p-1 rounded-full" style={{ color: "var(--day-accent)", background: "color-mix(in srgb, var(--day-accent) 10%, transparent)" }}>
                <ChevronLeft size={13} />
              </button>
              <span style={{ fontFamily: "'Playfair Display', Georgia, ui-serif, serif", fontWeight: 700, fontSize: "1.05rem", color: "var(--heading-ink)" }}>
                {pickerYear ?? viewDate.getFullYear()}
              </span>
              <button onClick={() => setPickerYear((y) => (y ?? viewDate.getFullYear()) + 1)} className="p-1 rounded-full" style={{ color: "var(--day-accent)", background: "color-mix(in srgb, var(--day-accent) 10%, transparent)" }}>
                <ChevronRight size={13} />
              </button>
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {MONTHS.map((m, i) => {
                const y = pickerYear ?? viewDate.getFullYear();
                const isCurrent = i === viewDate.getMonth() && y === viewDate.getFullYear();
                return (
                  <button
                    key={m}
                    onClick={() => { setViewDate(new Date(y, i, 1)); setMonthPickerOpen(false); }}
                    className="py-1.5 rounded-lg text-[12px] font-medium transition-colors"
                    style={{
                      background: isCurrent ? "var(--heading-ink)" : "color-mix(in srgb, var(--heading-ink) 6%, transparent)",
                      color: isCurrent ? "#f8f4ea" : "#2a2a2a",
                    }}
                  >
                    {m.slice(0, 3)}
                  </button>
                );
              })}
            </div>
          </div>
        )}
        {/* Calendar body — tighter side margins so the month can breathe wider (David). */}
        <div className="px-2 pt-1 pb-6">

        <div className="grid grid-cols-7 mb-3">
          {DAYS.map((d, i) => (
            <div
              key={i}
              className="text-center text-xs font-semibold tracking-wide py-1"
              style={{ color: "var(--heading-ink)", letterSpacing: "0.04em" }}
            >
              {d}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7" style={{ rowGap: "1.65rem", paddingTop: "0.6rem" }}>
          {calendarCells.map((day, idx) => {
            if (!day) return <div key={`empty-${idx}`} />;
            const dateStr = `${yearMonth}-${String(day).padStart(2, "0")}`;
            const panchang = panchangByDate[dateStr];
            const isToday = dateStr === toDateStr(today);
            const isCrown = crownByDate.has(dateStr);
            const isGolden = goldenSet.has(dateStr);
            const isSelected = dateStr === selectedDate;
            const dayMode = modeByDate.get(dateStr) ?? panchang?.mode;
            const dayCharacter = charByDate.get(dateStr);
            // ONE CALENDAR (David 2026-07-16): the month coins wear the SAME ladder tints as
            // the year view — the grouped golds-through-reds that carry meaning. The nature
            // rainbow is retired from the coins; nature speaks in the hero's words.
            const rung = rungByDate.get(dateStr);
            const [rungBg, rungInk] = coinPairFor(dayCharacter)
              ?? (rung
              ? (rung.quality === "good" ? GO_GREEN
                : rung.quality === "bad" ? CAUTION_ROSE
                : BETWEEN)
              : RUNG_NONE);
            const modeColor = rung ? rungBg : (dayMode ? MODE_DOT[dayMode] : undefined);
            const hasMode = !!modeColor;
            // Whole cell is tinted by the day's mode — far more legible than a tiny
            // dot, and selected/today get a stronger fill + solid border. Dark mode
            // needs more saturation: the low-alpha tints wash out on the dark bg.
            // Full Spectrum is ALWAYS a dark surface — appearance may never leak into it
            // (standing FS law). Every dark-vs-light branch below uses this, not raw theme.
            const isDark = theme === "dark" || fullSpectrum;
            // Full Spectrum paints the card gold, so the low-alpha tints composite over gold and go
            // muddy (teal→dull, rose→brown, gold→olive). Push the fill toward opaque there so each
            // day reads as its true, vibrant mode color instead of a muddied blend with the surface.
            const tintAlpha = fullSpectrum
              ? (isSelected ? 0.65 : 0.45)
              : (isSelected ? (isDark ? 0.78 : 0.55) : isToday ? (isDark ? 0.6 : 0.62) : (isDark ? 0.34 : 0.20));
            const GOLD_BRIGHT = "#F2C21C"; // saturated gold — golden-day border
            const CAUTION_RED = "#C41E3A"; // ruby — David 2026-07-15: "the fire engine red should be more ruby"
            // A caution day is ONE red family (David: today "vibrated" because the mulberry Restraint
            // fill and the fire-red caution ring/number — two close hues — stacked on the same coin).
            // Resolve the whole coin to red: fill, number, and ring differ only in lightness, not hue.
            const isCautionDay = cautionSet.has(dateStr);
            const accent = isCautionDay ? CAUTION_RED : (modeColor ?? "var(--color-foreground)");
            // Five-ink law: the FAMILY color for this day's number + ring (fills stay specific).
            const familyInk = isCautionDay ? CAUTION_RED : (dayCharacter?.movement ? (FAMILY_INK[dayCharacter.movement] ?? accent) : accent);
            const ECLIPSE_RING = "#6E5AA6"; // muted violet — echoes the eclipse disc's cosmic indigo
            // Retrograde planets active this day → the bottom glyph strip (rendered below).
            const retroToday = retroByDate.get(dateStr);
            const stationsToday = retroToday?.filter((e) => e.state === "station-retro" || e.state === "station-direct") ?? [];
            // The calendar surface is always light now, so the retro glyphs/strip always use the
            // deep (light-bg) palette — the bright variant would wash out on white in dark/FS mode.
            const retroColor = PLANET_RETRO_COLOR.deep;
            // TODAY uses the normal theme-aware tint (a touch stronger via tintAlpha's isToday branch)
            // plus its white border + bold number — no longer force-darkened. The old dark fill existed
            // so a white Velea mark would read, but that mark was removed from today (v154); keeping the
            // dark fill made the date number always-white regardless of light/dark appearance.
            // TODAY = the mode color at FULL strength (darkening gold made it read brown);
            // the number color is contrast-picked, so gold days carry a dark number and
            // teal/green/wine days keep white.
            // David's coin model (2026-07-11): the calendar is ALWAYS light, and a coin is FILLED with
            // its day-mode color only for TODAY or the date the user presses. Every other day is an
            // OUTLINE — a ring in the day-mode color, with the number in that same color. No more white
            // today-border: today is simply the filled coin.
            // Every coin is FILLED with its rung tint (the year view's language) — today and the
            // selected day distinguish themselves by ring + weight, not by being the only fills.
            // DAVID'S MOCK (2026-07-15, "do you seeeeeee"): a bare day is just its colored
            // number — the RING appears only when the day carries marks, and the marks PERCH
            // on the ring itself (paper halo breaks the line under each). Filled = weight:
            // today and the caution days, with a deeper ring of their own shade.
            const filled = (isToday || isCautionDay) && !!(dayCharacter?.movement || rung || hasMode);
            const hasTaraBadge = prosperitySet.has(dateStr) || achievementSet.has(dateStr);
            const windowGlyphList = (retroByDate.get(dateStr) ?? []).filter((e) => e.state === "window").slice(0, 2);
            const ringForMarks = hasTaraBadge || windowGlyphList.length > 0;
            // A FILLED coin's number is a very dark TONAL version of the day-mode color — more elegant
            // than flat white (David), and it lets the fill stay bright (esp. Build's gold). An OUTLINE
            // coin's number is the mode color itself, on white.
            // The movement pair carries its OWN contrast ink — Caution declares WHITE on the red
            // fill. The old near-black-red caution override predated the six-movement red fill and
            // left the caution number nearly invisible (David's 7/16 screenshot: black "4"/"31" on
            // fire red while teal coins read white). The pair wins whenever one exists.
            const darkInk = (dayCharacter?.movement || rung) ? rungInk : isCautionDay ? "#3A0606" : darkenOklch(accent, 0.5);
            // Caution falls out of accent(=CAUTION_RED)+darkInk with no special case: outline days get
            // the bright red number on white, filled today/selected days get the near-black-red on red.
            // A FILLED coin's number is a DEEP shade of its own color (David: 7/4 & 7/31's
            // white → darker caution shade; today's near-black → darker today-color).
            const numberColor = filled || (isSelected && hasMode) ? shadeHex(accent, 0.45) : hasMode ? familyInk : "var(--color-muted-foreground)";
            const activeInk = tonalInk(accent); // hover/press preview ink — tonal, never white/black
            // Per David's mock: a FILLED coin lightens its fill toward the paper and carries
            // a DEEP number of its own hue (7/4's number was reading white-washed-pink).
            // AUDIT (David's gate): a PICKED day must show — the selected coin holds a
            // soft fill (lighter than today's weight), cleared when selection returns home.
            const restingBg = filled
              ? `color-mix(in srgb, ${accent} 62%, var(--parchment))`
              // Crown coins wear TODAY's fill weight (David 7/16: "match today's fill.
              // It'll look clearer") — the day's own coin at full strength, so the
              // octagram sits on a solid lit coin instead of a fuzzy champagne wash.
              : isCrown
              ? `color-mix(in srgb, ${accent} 62%, var(--parchment))`
              : isSelected && hasMode && !eclipseByDate.has(dateStr)
              ? `color-mix(in srgb, ${accent} 26%, var(--parchment))`
              : "transparent";
            const hoverBg = hasMode ? accent : "var(--color-secondary)";
            const pressBg = hasMode ? darkenOklch(accent, 0.85) : "var(--color-border)";

            return (
              <button
                key={dateStr}
                onClick={(e) => {
                  // Anchor the calendar so the hero-card re-render above doesn't jump the screen.
                  scrollAnchorRef.current = calendarRef.current?.getBoundingClientRect().top ?? null;
                  setSelectedDate(dateStr);
                  // Crown days AND golden days pop a bubble; tapping the open day (or a plain day) closes it.
                  const isCaution = cautionSet.has(dateStr);
                  const isEclipseDay = eclipseByDate.has(dateStr);
                  const isRetroDay = retroByDate.has(dateStr);
                  const isProsperity = prosperitySet.has(dateStr);
                  const isAchievement = achievementSet.has(dateStr);
                  if (crownTip?.date === dateStr || (!isCrown && !isCaution && !isEclipseDay && !isRetroDay && !isProsperity && !isAchievement)) { setCrownTip(null); return; }
                  const r = e.currentTarget.getBoundingClientRect();
                  const kind = isCrown ? "crown" : isCaution ? "caution" : isEclipseDay ? "eclipse" : isRetroDay ? "retro" : isProsperity ? "prosperity" : "achievement";
                  let why = isCrown ? (crownByDate.get(dateStr) ?? "") : isCaution ? (cautionByDate.get(dateStr) ?? "") : "";
                  if (kind === "eclipse") why = eclipseByDate.get(dateStr) ?? "";
                  setCrownTip({ date: dateStr, kind: kind as any, why, cx: r.left + r.width / 2, top: r.top, bottom: r.bottom, accent: kind === "caution" ? CAUTION_RED : accent });
                }}
                className="flex flex-col items-center transition-all duration-150"
                style={{ width: "100%", gap: "0.2rem" }}
              >
                {/* The round date coin. */}
                <div
                  className="flex items-center justify-center"
                  style={{
                    position: "relative",
                    // Whole pixels (the Virgo-rising pass): a FIXED 32px box means the number
                    // and the mark chip round their centers identically in every column.
                    width: "32px",
                    height: "32px",
                    borderRadius: 999,
                    transition: "background 150ms",
                    color: numberColor,
                    background: restingBg,
                    // David 2026-07-11: day-mode rings REMOVED. A regular day is just its colored
                    // number (or, for today / the pressed day, a filled coin). A ring survives ONLY on
                    // the days that earn one: caution (red), knot/crown (gold), golden (gold), and
                    // station (the day-mode color, around the planet glyph).
                    // THE EXPERIMENT (David 2026-07-15 midnight): rings ONLY on current,
                    // caution and crowned days — everything else bare. Marks still perch.
                    border: cautionSet.has(dateStr)
                      ? (filled ? "2px solid transparent" : `2px solid ${shadeHex("#B3232F", 0.6)}`)
                      : isCrown
                      ? `1.5px solid ${GOLD_BRIGHT}`
                      // THE GLYPH DAY earns its thin ring — the FAMILY ink (five-ink law);
                      // station days wear it too ("why doesn't station days get a ring?").
                      : (!filled && !eclipseByDate.has(dateStr) && (stationsToday.length > 0 || achievementSet.has(dateStr) || prosperitySet.has(dateStr) || moonPhaseByDate.has(dateStr) || windowGlyphList.length > 0))
                      ? `1.5px solid color-mix(in srgb, ${familyInk} 62%, transparent)`
                      // SELECTED keeps its ring in the family ink; the fill beneath is the specific mode.
                      : (isSelected && hasMode && !isCrown && !eclipseByDate.has(dateStr))
                      ? `1.5px solid ${familyInk}`
                      : "1.5px solid transparent",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = hoverBg; if (hasMode) e.currentTarget.style.color = activeInk; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = restingBg; e.currentTarget.style.color = numberColor; }}
                  onMouseDown={(e) => { e.currentTarget.style.background = pressBg; if (hasMode) e.currentTarget.style.color = activeInk; }}
                  onMouseUp={(e) => { e.currentTarget.style.background = hoverBg; if (hasMode) e.currentTarget.style.color = activeInk; }}
                >
                  {/* THE GLYPH-COIN LAW (David 2026-07-16): a bare day carrying marks drops
                      its number — thin ring of its own color, no fill, the glyphs LARGE and
                      centered inside. The PERCH survives only where the coin's center is
                      already taken: station days (big planet glyph) and filled days
                      (today/caution keep their number — the tara badges never hide). */}
                  {/* Crown days keep their perch too (doctrine: layers COEXIST — the 7/24 crown was
                      swallowing Mercury's station-direct ☿). A crowned station day perches ALL its
                      marks above the octagram coin. */}
                  {!eclipseByDate.has(dateStr) && (stationsToday.length > 0 || isCrown) && (achievementSet.has(dateStr) || prosperitySet.has(dateStr) || moonPhaseByDate.has(dateStr) || windowGlyphList.length > 0 || (isCrown && stationsToday.length > 0)) && (() => {
                    const others: React.ReactNode[] = [];
                    // A crowned station day: the turning planet perches (the octagram holds the center).
                    if (isCrown) for (const e of stationsToday) others.push(
                      <PlanetMark key={`st-${e.planet}`} planet={e.planet} size={15} strokeWidth={2} />
                    );
                    const phase = moonPhaseByDate.get(dateStr);
                    if (phase) others.push(
                      <span key="moon" style={{ width: 9, height: 9, borderRadius: 999, alignSelf: "center",
                        background: phase === "full" ? "#FDFBF3" : "#160f26",
                        border: phase === "full" ? "1px solid #8a8264" : "1px solid #160f26",
                        display: "inline-block" }} />
                    );
                    if (prosperitySet.has(dateStr)) others.push(<span key="$" style={{ fontSize: "0.82rem", fontWeight: 600, color: MARK_INK.dollar, alignSelf: "center" }}>$</span>);
                    // A station day still shows OTHER planets' window glyphs (David's 7/26:
                    // Saturn centers, Mercury's window ☿ perches) — the stationing planet
                    // itself is never in windowGlyphList (its state is "station").
                    for (const e of windowGlyphList) others.push(
                      <PlanetMark key={e.planet} planet={e.planet} size={13} strokeWidth={2.1} />
                    );
                    const hasCrownMark = achievementSet.has(dateStr);
                    const mid = Math.floor(others.length / 2);
                    // Each mark sits in a FIXED 12px slot (flex-centered) so Apple-Symbols
                    // advance-width noise can't drift the cluster's optical center (the
                    // "sad alignment" audit, 7/16). Slotted marks, measured geometry.
                    const slot = (node: React.ReactNode, key: React.Key) => (
                      <span key={key} style={{ width: 12, display: "flex", justifyContent: "center", alignItems: "center" }}>{node}</span>
                    );
                    const slotted = others.map((n, i) => slot(n, i));
                    return (
                      <span style={{ position: "absolute", top: -13, left: 0, right: 0, display: "flex", justifyContent: "center", pointerEvents: "none", zIndex: 1 }}>
                        {hasCrownMark ? (
                          // Crown law: ♛ ALWAYS rides the coin's center axis; others flank it.
                          // A 3-column grid keeps the crown pinned even with an odd flank count.
                          <span style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", width: "100%", lineHeight: 1, whiteSpace: "nowrap" }}>
                            <span style={{ display: "flex", justifyContent: "flex-end", alignItems: "center" }}>{slotted.slice(0, mid)}</span>
                            <CrownMark size={17} style={{ transform: "translateY(-2px)" }} />
                            <span style={{ display: "flex", justifyContent: "flex-start", alignItems: "center" }}>{slotted.slice(mid)}</span>
                          </span>
                        ) : (
                          <span style={{ display: "flex", alignItems: "center", lineHeight: 1, whiteSpace: "nowrap" }}>{slotted}</span>
                        )}
                      </span>
                    );
                  })()}
                  {isCrown ? (
                    // The knot mark — an OUTLINE octagram (Star of Lakshmi), drawn in LINES, not a
                    // solid fill (David: "I want the lakshmi stars to be lines again"). The center
                    // bindu (a solid point in the star's heart) + a soft glow keep it reading as a
                    // luminous star, not a hollow white coin.
                    (() => {
                      // On a bright-gold Build coin a GOLD line would vanish — so the stroke takes a
                      // softer medium amber (0.72×L) there: visible, engraved, not a sore thumb.
                      // Bright gold with a glow everywhere else.
                      const knotOnGold = filled && modeColor === MODE_DOT.Build;
                      const knotColor = knotOnGold ? darkenOklch(accent, 0.72) : GOLD_BRIGHT;
                      return <span style={{ display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 0, pointerEvents: "none" }}><OctagramMark size={25} color={knotColor} strokeWidth={1.15} style={{ filter: knotOnGold ? "none" : "drop-shadow(0 0 3px rgba(242,194,28,0.55))" }} /></span>;
                    })()
                  ) : eclipseByDate.has(dateStr) ? (
                    // Eclipse day: the dark gold-rimmed disc IN PLACE of the number — the day is the mark.
                    <span style={{ width: 20, height: 20, borderRadius: 999, background: "#160f26", border: "1.25px solid #F2C21C", boxShadow: "0 0 6px rgba(242,194,28,0.55)", pointerEvents: "none", display: "inline-block" }} />
                  ) : stationsToday.length ? (
                    // Station day: the turning planet's glyph, in the DAY-MODE color. Rendered the same
                    // proven way as the date number and the retro strip — a plain flex-centered span
                    // with line-height:1. The SVG <text> route kept these Apple-Symbols astro glyphs
                    // sitting high; the coin's own flexbox centers a plain span cleanly. Sized well
                    // above the 1rem number so the turning planet reads at a glance (David).
                    <span style={{ display: "flex", gap: 3, alignItems: "center", justifyContent: "center", pointerEvents: "none", lineHeight: 1 }}>
                      {stationsToday.map((e) => (
                        <PlanetMark key={e.planet} planet={e.planet} size={stationsToday.length > 1 ? 20 : 26} strokeWidth={1.7} />
                      ))}
                    </span>
                  ) : (achievementSet.has(dateStr) || prosperitySet.has(dateStr) || moonPhaseByDate.has(dateStr) || windowGlyphList.length > 0) ? (
                    // THE GLYPH DAY: the marks ARE the day — centered inside the ring. A solo
                    // mark sits large; COMPANIONS SHRINK AND HUDDLE (two 16s + gap outgrew the
                    // 32px coin — "like they are running from each other").
                    <span style={{ display: "flex", gap: 2, alignItems: "center", justifyContent: "center", pointerEvents: "none", lineHeight: 1 }}>
                      {(() => {
                        const phase = moonPhaseByDate.get(dateStr);
                        const count = (phase ? 1 : 0) + (prosperitySet.has(dateStr) ? 1 : 0) + (achievementSet.has(dateStr) ? 1 : 0) + windowGlyphList.length;
                        const g = count >= 2 ? 13 : 16;
                        return <>
                          {phase && <span style={{ width: count >= 2 ? 11 : 13, height: count >= 2 ? 11 : 13, borderRadius: 999, background: phase === "full" ? "#FDFBF3" : "#160f26", border: phase === "full" ? "1.5px solid #8a8264" : "1.5px solid #160f26", display: "inline-block", flexShrink: 0 }} />}
                          {prosperitySet.has(dateStr) && <span style={{ fontSize: `${g}px`, fontWeight: 600, color: MARK_INK.dollar, lineHeight: 1 }}>$</span>}
                          {achievementSet.has(dateStr) && <CrownMark size={g + 5} />}
                          {windowGlyphList.map((e) => (
                            <PlanetMark key={e.planet} planet={e.planet} size={g} strokeWidth={count >= 2 ? 2.1 : 1.9} />
                          ))}
                        </>;
                      })()}
                    </span>
                  ) : (
                    <span style={{ color: "inherit", fontWeight: filled ? 700 : 600, fontSize: "1.15rem", lineHeight: 1, display: "flex", alignItems: "center", justifyContent: "center", position: "relative", zIndex: 2 }}>
                      {day}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* (Annual reminder line removed — the Time Lord Movement section below renders it in full.) */}
      </div>{/* end calendar body */}
      </div>{/* end calendar card */}

      {/* Crown-day popup — PORTALED to document.body so it is never a descendant of the
          overflow:hidden calendar card (the ROOT cause of the clipping). Anchored to the
          tapped cell via a captured viewport rect, clamped to the screen, flipped above/
          below by viewport half. Cannot be clipped on any row / month / screen. */}
      {crownTip && createPortal((() => {
        const W = 220;
        const left = Math.max(8, Math.min(crownTip.cx - W / 2, window.innerWidth - W - 8));
        const above = crownTip.top > window.innerHeight * 0.5;
        const vpos = above
          ? { bottom: Math.round(window.innerHeight - crownTip.top + 10) }
          : { top: Math.round(crownTip.bottom + 10) };
        const accent = crownTip.accent;
        const caretLeft = Math.max(14, Math.min(crownTip.cx - left, W - 14));
        return (
          <div
            data-crowntip
            style={{
              position: "fixed", left, width: W, ...vpos, zIndex: 81, textAlign: "left",
              background: `color-mix(in srgb, ${accent} 22%, var(--color-card))`,
              border: `2px solid ${accent}`, borderRadius: "var(--radius-card)",
              padding: "0.7rem 0.8rem", fontSize: "0.74rem", lineHeight: 1.45, color: "var(--color-foreground)",
              fontWeight: 400, boxShadow: `0 12px 34px rgba(0,0,0,0.4), 0 0 0 4px color-mix(in srgb, ${accent} 20%, transparent)`,
            }}
          >
            {/* Speech-bubble caret in the day's mode color, pointing back at the tapped day */}
            <span style={{
              position: "absolute", left: caretLeft, width: 0, height: 0, transform: "translateX(-50%)",
              borderLeft: "8px solid transparent", borderRight: "8px solid transparent",
              ...(above ? { bottom: -8, borderTop: `8px solid ${accent}` } : { top: -8, borderBottom: `8px solid ${accent}` }),
            }} />
            {crownTip.kind === "crown" ? (
              <>
                <span style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 700, color: "#C9A84C", marginBottom: "0.25rem" }}>
                  <span style={{ width: 8, height: 8, borderRadius: 999, background: "#F2C21C", boxShadow: "0 0 5px rgba(242,194,28,0.75)", display: "inline-block" }} /> Crowning day
                </span>
                These are days when the universal sky and your chart line up with unusual force. What arrives may look like a gift or a rupture &mdash; but it carries weight, and it moves you where you&rsquo;re meant to go.
                {goldenSet.has(crownTip.date) && (
                  <span style={{ display: "block", marginTop: "0.4rem", fontSize: "0.68rem", color: "var(--color-muted-foreground)" }}>
                    Also a golden day &mdash; your knot is the apex of a bright shared sky.
                  </span>
                )}
                {crownTip.why && (
                  <span style={{ display: "block", marginTop: "0.4rem", fontSize: "0.68rem", color: "var(--color-muted-foreground)" }}>
                    {crownTip.why}
                  </span>
                )}
              </>
            ) : crownTip.kind === "prosperity" ? (
              <>
                <span style={{ display: "flex", alignItems: "center", gap: 5, fontWeight: 700, color: "#8a6d1f", marginBottom: "0.25rem" }}>
                  <span style={{ fontWeight: 600, color: MARK_INK.dollar }}>$</span> Prosperity day
                </span>
                Your prosperity star &mdash; wealth, income and livelihood run with you today. Earn on your own terms.
              </>
            ) : crownTip.kind === "achievement" ? (
              <>
                <span style={{ display: "flex", alignItems: "center", gap: 5, fontWeight: 700, color: "#8a6d1f", marginBottom: "0.25rem" }}>
                  <CrownMark size={18} /> Achievement day
                </span>
                The accomplisher&rsquo;s star &mdash; something can be won today. Land an aim: ship it, submit it, finish it.
              </>
            ) : crownTip.kind === "eclipse" ? (
              <>
                <span style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 700, color: "#C9A84C", marginBottom: "0.25rem" }}>
                  <span style={{ width: 9, height: 9, borderRadius: 999, background: "#160f26", border: "1.5px solid #F2C21C", display: "inline-block" }} /> {crownTip.why === "solar" ? "Solar" : "Lunar"} eclipse
                </span>
                The light breaks its own rules today &mdash; a volatile sky. Watch, don&rsquo;t launch; what surfaces is information.
              </>
            ) : crownTip.kind === "retro" ? (
              <>
                <span style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 700, color: "var(--color-foreground)", marginBottom: "0.35rem" }}>
                  Retrograde sky
                </span>
                <span style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
                  {(retroByDate.get(crownTip.date) ?? []).map((e) => {
                    const col = (theme === "dark" || fullSpectrum) ? PLANET_RETRO_COLOR.bright[e.planet] : PLANET_RETRO_COLOR.deep[e.planet];
                    return (
                      <span key={e.planet} style={{ display: "flex", gap: 6, alignItems: "baseline" }}>
                        <span style={{ color: col, fontFamily: PLANET_GLYPH_FONT, fontWeight: 800, fontSize: "0.95rem", lineHeight: 1 }}>{PLANET_GLYPH[e.planet]}</span>
                        <span>
                          <b style={{ color: col }}>{e.planet}</b> {e.detail}.
                          {rxRoomsFor(e.planet) && (
                            <span style={{ display: "block", marginTop: 2, fontSize: "0.78rem", color: "var(--color-foreground)" }}>
                              For you, this moves through <b>{rxRoomsFor(e.planet)}</b>.
                              {RX_POSTURE[e.planet] ? ` ${RX_POSTURE[e.planet]}` : ""}
                            </span>
                          )}
                        </span>
                      </span>
                    );
                  })}
                </span>
              </>
            ) : (
              <>
                <span style={{ display: "flex", alignItems: "center", gap: 5, fontWeight: 700, color: "#FF1F1F", marginBottom: "0.25rem" }}>
                  Unaligned day
                </span>
                The sky pulls against your chart today &mdash; contain, don&rsquo;t begin. Nothing forward, nothing new.
                {crownTip.why && (
                  <span style={{ display: "block", marginTop: "0.4rem", fontSize: "0.68rem", color: "var(--color-muted-foreground)" }}>
                    {crownTip.why}
                  </span>
                )}
              </>
            )}
          </div>
        );
      })(), document.body)}

        </div>
      )}

      {/* Time Master + Hora moved to the Readings hub (2026-07-12) — the premium timing layer now
          lives with the other readings. The app header keeps the live at-a-glance on every page. */}

      {/* ── MODE ORBS (reflect TODAY) ── */}
      {isAuthenticated && (
        <div className="relative z-10">
          <button
            onClick={() => setAllTasksOpen((v) => !v)}
            className="flex items-center gap-2 mb-3"
          >
            <h3
              className="text-sm font-bold uppercase"
              style={{ color: "var(--heading-ink)", letterSpacing: "0.04em" }}
            >
              All Tasks{settings.showOrbCounts && !softOpen ? ` (${allTasks.filter((t) => !t.isCompleted).length})` : ""}
            </h3>
            <ChevronDown
              size={17}
              style={{ marginTop: -2, color: "var(--color-muted-foreground)", transform: allTasksOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 200ms ease" }}
            />
          </button>
          {/* THE SEVEN KIND ORBS (David 2026-07-15: "7 to be precise", with names) — the
              classical task vocabulary; today's own kind glows filled. Tap = open its group. */}
          {/* THE HANDSHAKE MISS (David 2026-07-16): the day can carry a kind you hold none
              of — the sky's orb stays lit (truth), the kind your ranking ACTUALLY leans on
              gets a half-light, and a whisper narrates the seam. */}
          <div className="flex justify-between items-end" data-tour="mode-orbs">
            {KIND_ORDER.map((k) => {
              const kColor = NATURE_DOT[k];
              const kCount = orbKindCounts[k] ?? 0;
              const isToday = todaySupportedKinds.has(k);
              const isLanding = k === leadingKind;
              return (
                <button
                  key={k}
                  onClick={() => setKindPopup(k)}
                  className="flex flex-col items-center gap-1.5 group transition-all duration-200 cursor-pointer"
                >
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-[11px] transition-all duration-200 ${isToday ? "scale-110 orb-pulse" : "group-hover:scale-105"}`}
                    style={{
                      // Filled = TODAY'S color, always (David: the kind-colored fill broke
                      // cohesion) — same recipe as today's coin: soft day fill, deep day ink.
                      // The LANDING kind (handshake miss) half-lights at 26%, no pulse.
                      background: isToday ? "color-mix(in srgb, var(--day-accent) 62%, var(--orb-base, var(--parchment)))"
                        : isLanding ? "color-mix(in srgb, var(--day-accent) 26%, var(--orb-base, var(--parchment)))" : "transparent",
                      border: isToday || isLanding ? "1px solid transparent" : `1px solid ${kColor}`,
                      color: isToday || isLanding ? "var(--orb-ink, var(--day-accent-deep))" : kColor,
                    }}
                  >
                    {settings.showOrbCounts && !softOpen ? kCount : "·"}
                  </div>
                  <span className="text-[9px] font-bold uppercase" style={{ letterSpacing: "0.06em", color: isToday ? "var(--orb-ink, var(--day-accent-deep))" : "var(--color-muted-foreground)" }}>
                    {NATURE_WORD[k]}
                  </span>
                </button>
              );
            })}
          </div>
          {handshakeMissKind && (
            <p className="mt-2 text-xs italic" style={{ color: "var(--color-muted-foreground)", lineHeight: 1.5 }}>
              The day carries {Array.from(todaySupportedKinds).map((k) => NATURE_WORD[k]).join(" and ")} acts — you're
              holding none. It can also spend on what you have; {NATURE_WORD[handshakeMissKind]} leads your day.
            </p>
          )}

          {/* All-tasks accordion — collapsible groups by mode (the old Planner view) */}
          {allTasksOpen && (
            <div className="mt-4 space-y-2">
              {/* SEARCH (David 2026-07-16: 86 tasks need a finder) — filters every group live. */}
              <input
                type="search"
                value={taskSearch}
                onChange={(e) => setTaskSearch(e.target.value)}
                placeholder="Search your tasks…"
                className="w-full px-3 py-2 rounded-lg text-sm mb-1"
                style={{ background: "var(--color-secondary)", border: "1px solid color-mix(in srgb, var(--day-accent) 35%, var(--color-border))", color: "var(--color-foreground)" }}
              />
              {KIND_ORDER.map((m) => {
                // Snoozed tasks are INCLUDED here (unlike the ranked "today" list) so the
                // expanded All-Tasks view is the full picture — they sink to the bottom of
                // their kind group and render dimmed.
                const q = taskSearch.trim().toLowerCase();
                const groupTasks = allTasks
                  .filter((t) => (kindByTaskId.get(t.id) ?? "mixed") === m && !t.isCompleted)
                  .filter((t) => !q || (t.title ?? "").toLowerCase().includes(q) || ((t as any).description ?? "").toLowerCase().includes(q))
                  .sort((a, b) => {
                    const sa = a.snoozedUntil && a.snoozedUntil > Date.now() ? 1 : 0;
                    const sb = b.snoozedUntil && b.snoozedUntil > Date.now() ? 1 : 0;
                    return sa - sb;
                  });
                const open = q ? groupTasks.length > 0 : openKindGroups.has(m);
                const groupColor = NATURE_DOT[m];
                if (q && groupTasks.length === 0) return null;
                return (
                  <div key={m} className="rounded-lg overflow-hidden" style={{ border: "1px solid var(--color-border)" }}>
                    <button
                      onClick={() =>
                        setOpenKindGroups((cur) => {
                          const n = new Set(cur);
                          n.has(m) ? n.delete(m) : n.add(m);
                          return n;
                        })
                      }
                      className="w-full flex items-center justify-between px-3 py-2.5"
                      style={{ background: "var(--color-secondary)" }}
                    >
                      <span className="text-xs font-bold uppercase" style={{ color: groupColor, letterSpacing: "0.04em" }}>
                        {NATURE_WORD[m]} {settings.showOrbCounts && <span style={{ color: "var(--color-muted-foreground)" }}>({groupTasks.length})</span>}
                      </span>
                      <ChevronDown
                        size={17}
                        style={{ marginTop: -2, color: "var(--color-muted-foreground)", transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 200ms ease" }}
                      />
                    </button>
                    {open &&
                      (groupTasks.length === 0 ? (
                        <p className="text-xs px-3 py-3" style={{ color: "var(--color-muted-foreground)" }}>No {m} tasks.</p>
                      ) : (
                        <div className="p-2 space-y-2">
                          {groupTasks.map((task) => {
                            const snoozed = !!(task.snoozedUntil && task.snoozedUntil > Date.now());
                            return (
                            <div key={task.id} style={snoozed ? { opacity: 0.55 } : undefined}>
                            <SwipeableTaskRow
                              onSwipeLeft={() => updateMutation.mutate({ id: task.id, isCompleted: !task.isCompleted })}
                              onSwipeRight={() => deleteMutation.mutate({ id: task.id })} rightMode="delete"
                              isCompleted={task.isCompleted}
                              isPinned={task.isPinned}
                              modeColor={groupColor}
                            >
                              <TaskItem
                                task={task as Task & { subtaskTotal?: number; subtaskCompleted?: number }}
                                onToggleComplete={() => updateMutation.mutate({ id: task.id, isCompleted: !task.isCompleted })}
                                onTogglePin={() => updateMutation.mutate({ id: task.id, isPinned: !task.isPinned, ...(!task.isPinned && todayTaskMode ? { dayMode: todayTaskMode } : {}) })}
                    onCyclePriority={(id, next) => updateMutation.mutate({ id, priority: next })}
                    onSetIntent={(id, next) => updateMutation.mutate({ id, intent: next })}
                                onDelete={() => deleteMutation.mutate({ id: task.id })}
                                onEdit={(t: Task) => handleEdit(t)}
                                dayMode={todayTaskMode}
                              />
                            </SwipeableTaskRow>
                            </div>
                            );
                          })}
                        </div>
                      ))}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* SOFT OPEN — the one aligned move + the door to the full day. */}
      {isAuthenticated && softOpen && (
        <div className="relative z-10 space-y-3">
          {!restGate.tripped && alignedForToday.length > 0 && (
            <div
              className="flex items-baseline gap-3 px-4 py-3.5 rounded-xl"
              style={{ background: "var(--color-card)", border: "1px solid var(--color-border)" }}
            >
              <span className="text-sm font-semibold" style={{ color: "var(--color-foreground)" }}>
                {alignedForToday[0].title}
              </span>
              <span className="text-xs ml-auto shrink-0" style={{ color: "var(--color-muted-foreground)" }}>
                aligned today
              </span>
            </div>
          )}
          {restGate.tripped && (
            <div className="px-4 py-3.5 rounded-xl" style={{ background: `color-mix(in srgb, ${REST_TEAL} 12%, var(--color-card))`, border: `1px solid color-mix(in srgb, ${REST_TEAL} 34%, transparent)` }}>
              <p className="text-sm" style={{ color: REST_TEAL, fontWeight: 600 }}>Restore today. Water, air, a little quiet.</p>
            </div>
          )}
          <button
            onClick={() => setSoftOpen(false)}
            className="w-full py-2.5 rounded-full text-xs font-bold uppercase"
            style={{ letterSpacing: "0.12em", color: "var(--color-muted-foreground)", border: "1px solid var(--color-border)", background: "transparent" }}
          >
            Show my day
          </button>
        </div>
      )}

      {/* Pinned for Now — explicit user pins (ported from the retired Today page) */}
      {isAuthenticated && !softOpen && (
        <div className="relative z-10">
          <button
            onClick={() => setPinnedOpen((v) => !v)}
            className="flex items-center gap-2 w-full mb-3"
          >
            <h3
              className="text-sm font-bold uppercase"
              style={{ color: "var(--heading-ink)", letterSpacing: "0.04em" }}
            >
              To Do
            </h3>
            <ChevronDown
              size={17}
              style={{ marginTop: -2, color: "var(--color-muted-foreground)", transform: pinnedOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 200ms ease" }}
            />
          </button>

          {pinnedOpen && (pinnedForNow.length === 0 ? (
            <div
              className="p-4 text-center rounded-lg"
              style={{ color: "var(--muted-foreground)", background: "var(--input)", border: "1px solid var(--border)" }}
            >
              <p className="text-base font-bold" style={{ color: "var(--foreground)" }}>Nothing pinned yet.</p>
              <p className="text-sm mt-1.5" style={{ color: "var(--foreground)", opacity: 0.85, lineHeight: 1.55 }}>
                This list is entirely yours — pin any task (tap the 📌) to keep it right here, in focus. Velea suggests; you decide.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {pinnedForNow.map((task) => (
                <SwipeableTaskRow
                  key={task.id}
                  onSwipeLeft={() => updateMutation.mutate({ id: task.id, isCompleted: !task.isCompleted })}
                  onSwipeRight={() => deleteMutation.mutate({ id: task.id })} rightMode="delete"
                  isCompleted={task.isCompleted}
                  isPinned={task.isPinned}
                  modeColor={todayModeColor}
                >
                  <TaskItem quiet
                    task={task as Task & { subtaskTotal?: number; subtaskCompleted?: number }}
                    onToggleComplete={() => updateMutation.mutate({ id: task.id, isCompleted: !task.isCompleted })}
                    onTogglePin={() => updateMutation.mutate({ id: task.id, isPinned: !task.isPinned, ...(!task.isPinned && todayTaskMode ? { dayMode: todayTaskMode } : {}) })}
                    onCyclePriority={(id, next) => updateMutation.mutate({ id, priority: next })}
                    onSetIntent={(id, next) => updateMutation.mutate({ id, intent: next })}
                    onDelete={() => deleteMutation.mutate({ id: task.id })}
                    onEdit={(t: Task) => handleEdit(t)}
                    dayMode={todayTaskMode}
                    alignment={alignmentById.get(task.id) ?? 20}
                  />
                </SwipeableTaskRow>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* Aligned for Today — system-ranked suggestions (ported from the retired Today page) */}
      {isAuthenticated && !softOpen && !!todayTaskMode && (
        <div className="relative z-10">
          <button
            onClick={() => setAlignedOpen((v) => !v)}
            className="flex items-center gap-2 w-full mb-3"
          >
            <h3
              className="text-sm font-bold uppercase"
              style={{ color: "var(--heading-ink)", letterSpacing: "0.04em" }}
            >
              Aligned for today
            </h3>
            <ChevronDown
              size={17}
              style={{ marginTop: -2, color: "var(--color-muted-foreground)", transform: alignedOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 200ms ease" }}
            />
          </button>

          {alignedOpen && (restGate.tripped ? (
            <div
              className="p-4 rounded-lg"
              style={{ background: `color-mix(in srgb, ${REST_TEAL} 12%, var(--color-card))`, border: `1px solid color-mix(in srgb, ${REST_TEAL} 34%, transparent)` }}
            >
              <p className="text-sm font-bold" style={{ color: REST_TEAL, marginBottom: "0.3rem" }}>Restore today.</p>
              <p className="text-sm" style={{ color: "var(--color-foreground)", lineHeight: 1.55 }}>
                {restGate.reason} The aligned move today isn't a task — it's rest. Water, air, a little quiet; come back when there's more in the tank.
              </p>
              {alignedForToday.length > 0 && (!restOptIn ? (
                <button
                  onClick={() => setRestOptIn(true)}
                  className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full"
                  style={{ background: `color-mix(in srgb, ${REST_TEAL} 16%, transparent)`, color: REST_TEAL, border: `1px solid color-mix(in srgb, ${REST_TEAL} 40%, transparent)`, fontSize: "0.8rem", fontWeight: 700 }}
                >
                  Show me one small thing
                </button>
              ) : (
                <div className="mt-3">
                  <SwipeableTaskRow
                    onSwipeLeft={() => updateMutation.mutate({ id: alignedForToday[0].id, isCompleted: !alignedForToday[0].isCompleted })}
                    onSwipeRight={() => deleteMutation.mutate({ id: alignedForToday[0].id })} rightMode="delete"
                    isCompleted={alignedForToday[0].isCompleted}
                    isPinned={alignedForToday[0].isPinned}
                    modeColor={REST_TEAL}
                  >
                    <TaskItem quiet
                      task={alignedForToday[0] as Task & { subtaskTotal?: number; subtaskCompleted?: number }}
                      onToggleComplete={() => updateMutation.mutate({ id: alignedForToday[0].id, isCompleted: !alignedForToday[0].isCompleted })}
                      onTogglePin={() => updateMutation.mutate({ id: alignedForToday[0].id, isPinned: !alignedForToday[0].isPinned })}
                      onCyclePriority={(id, next) => updateMutation.mutate({ id, priority: next })}
                      onSetIntent={(id, next) => updateMutation.mutate({ id, intent: next })}
                      onDelete={() => deleteMutation.mutate({ id: alignedForToday[0].id })}
                      onEdit={(t: Task) => handleEdit(t)}
                      dayMode={todayTaskMode}
                      alignment={(alignedForToday[0] as any).alignment ?? alignmentById.get(alignedForToday[0].id)}
                      compact
                    />
                  </SwipeableTaskRow>
                </div>
              ))}
            </div>
          ) : alignedForToday.length === 0 ? (
            <div
              className="p-4 text-center rounded-lg"
              style={{ color: "var(--muted-foreground)", background: "var(--input)", border: "1px solid var(--border)" }}
            >
              <p className="text-sm">No suggestions for today's mode.</p>
              <p className="text-xs mt-1" style={{ color: "var(--muted-foreground)" }}>
                Add tasks tagged {todayTaskMode} to see recommendations here.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {alignedForToday.map((task) => (
                <SwipeableTaskRow
                  key={task.id}
                  onSwipeLeft={() => updateMutation.mutate({ id: task.id, isCompleted: !task.isCompleted })}
                  onSwipeRight={() => deleteMutation.mutate({ id: task.id })} rightMode="delete"
                  isCompleted={task.isCompleted}
                  isPinned={task.isPinned}
                  modeColor={todayModeColor}
                >
                  <TaskItem quiet
                    task={task as Task & { subtaskTotal?: number; subtaskCompleted?: number }}
                    onToggleComplete={() => updateMutation.mutate({ id: task.id, isCompleted: !task.isCompleted })}
                    onTogglePin={() => updateMutation.mutate({ id: task.id, isPinned: !task.isPinned, ...(!task.isPinned && todayTaskMode ? { dayMode: todayTaskMode } : {}) })}
                    onCyclePriority={(id, next) => updateMutation.mutate({ id, priority: next })}
                    onSetIntent={(id, next) => updateMutation.mutate({ id, intent: next })}
                    onDelete={() => deleteMutation.mutate({ id: task.id })}
                    onEdit={(t: Task) => handleEdit(t)}
                    dayMode={todayTaskMode}
                    alignment={(task as any).alignment ?? alignmentById.get(task.id)}
                    compact
                  />
                  {/* The reasoning lives behind an obvious "Why now?" — the card stays clean */}
                  {(((task as any).reasons?.length > 0) || ((task as any).layerBubbles?.length > 0)) && (
                    <button
                      onClick={() => setWhyNowTask(task)}
                      className="mx-3 mb-2 mt-0.5 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full"
                      style={{ background: `color-mix(in srgb, ${todayModeColor} 14%, var(--color-card))`, color: todayModeColor, border: `1px solid color-mix(in srgb, ${todayModeColor} 34%, transparent)`, fontSize: "0.8rem", fontWeight: 700 }}
                    >
                      Why now? →
                    </button>
                  )}
                </SwipeableTaskRow>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* ── REFLECTION LOG — one section: the day's recorder + "View full log" merged (David). ── */}
      {isAuthenticated && !softOpen && (
        <div className="relative z-10">
          <button
            onClick={() => setReflectionOpen((v) => !v)}
            className="flex items-center gap-2 mb-2 w-full"
            style={{ background: "none", border: "none", cursor: "pointer", padding: 0, textAlign: "left" }}
          >
            <p
              className="text-sm font-bold uppercase"
              style={{ color: "var(--heading-ink)", letterSpacing: "0.04em" }}
            >
              Reflection Log
            </p>
            <ChevronDown size={17} style={{ flexShrink: 0, color: "var(--color-muted-foreground)", marginTop: -2, transform: reflectionOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 200ms ease" }} />
          </button>
          {reflectionOpen && (
          <div className="glass-card p-3">
            <textarea
              className="w-full bg-transparent text-sm resize-none outline-none leading-relaxed"
              style={{ color: "var(--color-foreground)", minHeight: "80px", caretColor: "var(--foreground)" }}
              placeholder={`Write a reflection for ${new Date(selectedDate + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}…`}
              value={reflection}
              onChange={(e) => setReflection(e.target.value)}
            />
            <div className="flex items-center justify-between mt-2 gap-2">
              <button
                onClick={() => navigate("/reflections")}
                className="text-xs font-semibold transition-opacity hover:opacity-70"
                style={{ color: "var(--color-muted-foreground)", background: "none", border: "none", cursor: "pointer", padding: 0, letterSpacing: "0.02em" }}
              >
                View full log →
              </button>
              <div className="ml-auto flex items-center gap-2">
                {saveReflection.isError && (
                  <span className="text-xs" style={{ color: "oklch(0.70 0.15 25)" }}>Failed to save.</span>
                )}
                <button
                  onClick={() => saveReflection.mutate(
                    { date: selectedDate, content: reflection },
                    { onError: () => {} }
                  )}
                  disabled={saveReflection.isPending || reflection === (savedReflection?.content ?? "")}
                  className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all disabled:opacity-40"
                  style={{
                    letterSpacing: "0.02em",
                    background: reflectionSaved ? "var(--secondary)" : "var(--input)",
                    color: "var(--foreground)",
                    border: `1px solid var(--border)`,
                  }}
                >
                  {saveReflection.isPending ? "Saving…" : reflectionSaved ? "Saved ✓" : "Save"}
                </button>
              </div>
            </div>
          </div>
          )}
        </div>
      )}

      {/* ── COMPLETED (moved below the Planner section, per request) ── */}
      {isAuthenticated && !softOpen && (() => {
        const completed = allTasks.filter((t) => t.isCompleted);
        return (
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-3">
              <button onClick={() => setCompletedOpen((v) => !v)} className="flex items-center gap-2">
                <h3 className="text-sm font-bold uppercase" style={{ color: "var(--heading-ink)", letterSpacing: "0.04em" }}>
                  Completed{settings.showOrbCounts || completed.length > 0 ? ` (${completed.length})` : ""}
                </h3>
                <ChevronDown
                  size={17}
                  style={{ marginTop: -2, color: "var(--color-muted-foreground)", transform: completedOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 200ms ease" }}
                />
              </button>
              {completed.length > 0 && (
                <button
                  onClick={() => {
                    if (window.confirm(`Permanently delete ${completed.length} completed task${completed.length > 1 ? "s" : ""}? This can't be undone.`)) {
                      purgeCompleted.mutate();
                    }
                  }}
                  disabled={purgeCompleted.isPending}
                  className="text-xs font-semibold px-3 py-1.5 rounded-full transition-opacity disabled:opacity-50"
                  style={{ color: "#c0504d", border: "1px solid #c0504d" }}
                >
                  {purgeCompleted.isPending ? "Clearing…" : "Clear all"}
                </button>
              )}
            </div>

            {completedOpen && (completed.length === 0 ? (
              <div className="p-4 text-center rounded-lg" style={{ color: "var(--muted-foreground)", background: "var(--input)", border: "1px solid var(--border)" }}>
                <p className="text-sm">No completed tasks.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {completed.map((task) => (
                  <SwipeableTaskRow
                    key={task.id}
                    onSwipeLeft={() => deleteMutation.mutate({ id: task.id })}
                    onSwipeRight={() => updateMutation.mutate({ id: task.id, isCompleted: false })}
                    isCompleted={task.isCompleted}
                    isPinned={task.isPinned}
                    modeColor={PLANNER_MODE_OKLCH[task.mode as TaskMode]}
                  >
                    <TaskItem
                      task={task as Task & { subtaskTotal?: number; subtaskCompleted?: number }}
                      onToggleComplete={() => updateMutation.mutate({ id: task.id, isCompleted: !task.isCompleted })}
                      onTogglePin={() => updateMutation.mutate({ id: task.id, isPinned: !task.isPinned })}
                      onDelete={() => deleteMutation.mutate({ id: task.id })}
                      onEdit={(t: Task) => handleEdit(t)}
                      dayMode={todayTaskMode}
                    />
                  </SwipeableTaskRow>
                ))}
              </div>
            ))}
          </div>
        );
      })()}


      {/* Mode Orb Sheet */}
      {orbSheetMode && (
        <ModeOrbSheet
          mode={orbSheetMode}
          open={!!orbSheetMode}
          onClose={() => setOrbSheetMode(null)}
        />
      )}

      {/* Quick Add Sheet (mode-orb shortcut) — preselect the orb's mode you tapped, so adding from
          the Restraint orb starts the task in Restraint (was silently defaulting to Build). */}
      {quickAddMode && (
        <AddTaskSheet
          open={!!quickAddMode}
          onClose={() => setQuickAddMode(null)}
          initialMode={quickAddMode}
          editTask={undefined}
        />
      )}

      {/* (Pinned + Aligned edits now route through handleEdit → the single Add/Edit sheet below.) */}

      {/* Why-now pop-up for an aligned task */}
      <WhyNowSheet task={whyNowTask} modeColor={todayModeColor} onClose={() => setWhyNowTask(null)} />

      {/* Due Orb Sheet */}


      {/* KIND POP-UP — dead center (David): the tapped orb's tasks on one paper card. */}
      {kindPopup && createPortal(
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-6"
          style={{ background: "rgba(30, 24, 16, 0.45)" }}
          onClick={() => setKindPopup(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl overflow-hidden"
            style={{ background: "var(--parchment)", boxShadow: "0 18px 60px rgba(0,0,0,0.35)", border: "1.5px solid color-mix(in srgb, var(--day-accent) 45%, transparent)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 pt-4 pb-3">
              <span className="text-sm font-bold uppercase" style={{ letterSpacing: "0.06em", color: NATURE_DOT[kindPopup] }}>
                <span style={{ display: "inline-block", width: 9, height: 9, borderRadius: 999, background: NATURE_DOT[kindPopup], marginRight: 8 }} />
                {NATURE_WORD[kindPopup]}
                <span style={{ color: "var(--color-muted-foreground)", marginLeft: 6 }}>({orbKindCounts[kindPopup] ?? 0})</span>
              </span>
              <button onClick={() => setKindPopup(null)} className="p-1 rounded-full" style={{ color: "var(--color-muted-foreground)" }}>
                <Plus size={18} style={{ transform: "rotate(45deg)" }} />
              </button>
            </div>
            <div className="px-4 pb-5 space-y-2 overflow-y-auto" style={{ maxHeight: "60vh" }}>
              {allTasks.filter((t) => !t.isCompleted && (kindByTaskId.get(t.id) ?? "mixed") === kindPopup).length === 0 ? (
                <p className="text-sm text-center py-6" style={{ color: "var(--color-muted-foreground)" }}>
                  Nothing here right now.
                </p>
              ) : (
                allTasks
                  .filter((t) => !t.isCompleted && (kindByTaskId.get(t.id) ?? "mixed") === kindPopup)
                  .map((task) => (
                    <TaskItem quiet
                      key={task.id}
                      task={task as Task & { subtaskTotal?: number; subtaskCompleted?: number }}
                      onToggleComplete={() => updateMutation.mutate({ id: task.id, isCompleted: !task.isCompleted })}
                      onTogglePin={() => updateMutation.mutate({ id: task.id, isPinned: !task.isPinned, ...(!task.isPinned && todayTaskMode ? { dayMode: todayTaskMode } : {}) })}
                      onCyclePriority={(id, next) => updateMutation.mutate({ id, priority: next })}
                      onSetIntent={(id, next) => updateMutation.mutate({ id, intent: next })}
                      onDelete={() => deleteMutation.mutate({ id: task.id })}
                      onEdit={(t: Task) => { setKindPopup(null); handleEdit(t); }}
                      dayMode={todayTaskMode}
                      alignment={alignmentById.get(task.id) ?? 20}
                    />
                  ))
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Add/Edit sheet */}
      <AddTaskSheet
        open={sheetOpen}
        onClose={() => { setSheetOpen(false); setEditTask(null); }}
        editTask={editTask ? toSheetTask(editTask) : undefined}
      />


      </div>
    </div>
  );
}
