import { useLocation } from "wouter";
import type { Panchang } from "../../../drizzle/schema";
import ModeTag from "./ModeTag";
import { termToSlug, findGlossaryTerm } from "../pages/Glossary";
import { useDayModeColor } from "@/hooks/useDayModeColor";

interface PanchangCardProps {
  data: Panchang;
  compact?: boolean;
}

/** Inline tappable term — navigates to /glossary?term=<slug> if the term exists in the glossary */
function GlossaryLink({ value, label }: { value: string; label?: string }) {
  const [, navigate] = useLocation();
  const match = findGlossaryTerm(value);

  if (!match) {
    return (
      <span style={{ color: "var(--color-foreground)", fontSize: "0.75rem", fontWeight: 500 }}>
        {label ?? value}
      </span>
    );
  }

  return (
    <button
      onClick={() => navigate(`/glossary?term=${termToSlug(match.term)}`)}
      className="transition-opacity hover:opacity-70 active:opacity-50"
      style={{
        color: "var(--color-primary)",
        fontSize: "0.75rem",
        fontWeight: 500,
        textDecoration: "underline",
        textDecorationStyle: "dotted",
        textUnderlineOffset: "2px",
        background: "none",
        border: "none",
        padding: 0,
        cursor: "pointer",
        fontFamily: "inherit",
      }}
    >
      {label ?? value}
    </button>
  );
}

/** Full card glossary link — larger text */
function GlossaryLinkFull({ value }: { value: string }) {
  const [, navigate] = useLocation();
  const match = findGlossaryTerm(value);

  if (!match) {
    return (
      <span className="text-sm font-medium" style={{ color: "var(--color-foreground)" }}>
        {value}
      </span>
    );
  }

  return (
    <button
      onClick={() => navigate(`/glossary?term=${termToSlug(match.term)}`)}
      className="text-sm font-medium transition-opacity hover:opacity-70 active:opacity-50 text-left"
      style={{
        color: "var(--color-primary)",
        textDecoration: "underline",
        textDecorationStyle: "dotted",
        textUnderlineOffset: "2px",
        background: "none",
        border: "none",
        padding: 0,
        cursor: "pointer",
        fontFamily: "inherit",
      }}
    >
      {value}
    </button>
  );
}

export default function PanchangCard({ data, compact = false }: PanchangCardProps) {
  const dayLabelColor = useDayModeColor();
  if (compact) {
    return (
      <div className="glass-card p-3 flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1.5">
          <span style={{ color: dayLabelColor, fontSize: "0.65rem", letterSpacing: "0.04em", textTransform: "uppercase" }}>Tithi</span>
          <GlossaryLink value={data.tithi} />
        </div>
        <span style={{ color: "var(--color-muted-foreground)" }}>·</span>
        <div className="flex items-center gap-1.5">
          <span style={{ color: dayLabelColor, fontSize: "0.65rem", letterSpacing: "0.04em", textTransform: "uppercase" }}>Nakshatra</span>
          <GlossaryLink value={data.nakshatra} />
        </div>
        <span style={{ color: "var(--color-muted-foreground)" }}>·</span>
        <div className="flex items-center gap-1.5">
          <span style={{ color: dayLabelColor, fontSize: "0.65rem", letterSpacing: "0.04em", textTransform: "uppercase" }}>Moon</span>
          <GlossaryLink value={data.moonSign} />
        </div>
        <span style={{ color: "var(--color-muted-foreground)" }}>·</span>
        <div className="flex items-center gap-1.5">
          <span style={{ color: dayLabelColor, fontSize: "0.65rem", letterSpacing: "0.04em", textTransform: "uppercase" }}>Sunrise</span>
          <span style={{ color: "var(--color-foreground)", fontSize: "0.75rem", fontWeight: 500 }}>{data.sunrise}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card p-4">
      <div className="flex items-center justify-between mb-3">
        <h3
          className="text-xs font-bold tracking-wide uppercase"
          style={{ color: dayLabelColor, letterSpacing: "0.04em" }}
        >
          Panchang
        </h3>
        <ModeTag mode={data.mode} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <PanchangField label="Tithi" labelColor={dayLabelColor}>
          <GlossaryLinkFull value={data.tithi} />
        </PanchangField>
        <PanchangField label="Nakshatra" labelColor={dayLabelColor}>
          <GlossaryLinkFull value={data.nakshatra} />
        </PanchangField>
        <PanchangField label="Moon" labelColor={dayLabelColor}>
          <GlossaryLinkFull value={data.moonSign} />
        </PanchangField>
        <PanchangField label="Sunrise" labelColor={dayLabelColor}>
          <span className="text-sm font-medium" style={{ color: "var(--color-foreground)" }}>{data.sunrise}</span>
        </PanchangField>
      </div>
    </div>
  );
}

function PanchangField({ label, children, labelColor }: { label: string; children: React.ReactNode; labelColor?: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span
        className="text-[10px] font-semibold tracking-wide uppercase"
        style={{ color: labelColor ?? "var(--color-muted-foreground)", letterSpacing: "0.04em" }}
      >
        {label}
      </span>
      {children}
    </div>
  );
}
