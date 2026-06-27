import { trpc } from "../lib/trpc";
import { useState, useMemo } from "react";
import { ChevronDown } from "lucide-react";
import AppHeader from "@/components/AppHeader";
import { useDayModeColor } from "@/hooks/useDayModeColor";
import { TimeLordMovement } from "@/components/TimeLordMovement";
import { PANCHANG_TO_TASK_MODE, MODE_OKLCH, MODE_DARK, type TaskMode } from "../../../shared/types";

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
  const [expandedTransitId, setExpandedTransitId] = useState<number | null>(null);

  const { data: profectionData, error: profectionError } = trpc.profection.current.useQuery();
  const { data: transitsData, error: transitsError, isLoading: transitsLoading } = trpc.profection.timeLordTransits.useQuery(undefined, {
    enabled: s4,
  });

  const { data: todayPanchang } = trpc.panchang.today.useQuery();
  const taskMode: TaskMode | undefined = todayPanchang?.mode
    ? PANCHANG_TO_TASK_MODE[todayPanchang.mode as keyof typeof PANCHANG_TO_TASK_MODE]
    : undefined;

  const tlGradient = taskMode === 'Action' ? 'var(--kala-action-gradient)'
    : taskMode === 'Build' ? 'var(--kala-build-gradient)'
    : taskMode === 'Selective' ? 'var(--kala-selective-gradient)'
    : taskMode === 'Restraint' ? 'var(--kala-restraint-gradient)'
    : 'var(--card)';

  const accentColor = taskMode ? MODE_OKLCH[taskMode] : 'var(--color-border)';
  const darkColor = taskMode ? MODE_DARK[taskMode] : undefined;
  const todayDateStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  const card = (
    title: string,
    open: boolean,
    setOpen: (v: boolean) => void,
    content: React.ReactNode
  ) => (
    <div style={{ border: `1.5px solid ${modeColor}`, borderRadius: "0.75rem", overflow: "hidden", marginBottom: "1.25rem", background: `color-mix(in srgb, ${modeColor} 14%, var(--background))` }}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.65rem 1.25rem", background: modeColor, border: "none", cursor: "pointer" }}
      >
        <span style={{ color: "#fff", fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" as const }}>{title}</span>
        <ChevronDown size={16} style={{ color: "rgba(255,255,255,0.8)", flexShrink: 0, transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 200ms ease" }} />
      </button>
      {open ? content : null}
    </div>
  );

  if (profectionError) return (
    <div style={{ padding: "2rem" }}>
      <AppHeader pageTitle="Profection Year" />
      <p style={{ color: TEXT_MUTED, marginTop: "1rem" }}>Error: {profectionError.message}</p>
    </div>
  );

  if (!profectionData) return (
    <div style={{ padding: "2rem" }}>
      <AppHeader pageTitle="Profection Year" />
      <p style={{ color: TEXT_MUTED, marginTop: "1rem" }}>Please set your birth date and lagna sign in settings to view your profection year.</p>
    </div>
  );

  const { age, activatedHouse, activatedSign, timeLord, yearStart, yearEnd, lagnaSign } = profectionData.profection;

  return (
    <div style={{ padding: "2rem", maxWidth: "900px", margin: "0 auto", paddingBottom: "7rem" }}>
      <div style={{ marginBottom: "2rem" }}>
        <AppHeader pageTitle="Profection Year" />
        <p style={{ color: TEXT_PRIMARY, fontSize: "0.875rem", marginTop: "0.25rem", marginBottom: "0.5rem", fontWeight: 500, lineHeight: 1.5 }}>
          {lagnaSign} Lagna · Age {age}<br />
          <span style={{ whiteSpace: "nowrap" }}>{yearStart} to {yearEnd}</span>
        </p>
      </div>

      {card("Current Annual Focus", s1, setS1,
        <div style={{ padding: "1.25rem", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
          {[["Activated House", activatedHouse], ["Activated Sign", activatedSign], ["Time Lord", timeLord], ["Age", age]].map(([label, value]) => (
            <div key={String(label)}>
              <p style={{ color: TEXT_MUTED, fontSize: "0.75rem", marginBottom: "0.25rem" }}>{label}</p>
              <p style={{ color: TEXT_PRIMARY, fontSize: "1.125rem", fontWeight: 600 }}>{value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Time Lord Movement — immersive gradient */}
      <div style={{ borderRadius: "20px", background: tlGradient, marginBottom: "1.25rem", overflow: "hidden" }}>
        <button type="button" onClick={() => setTlOpen(v => !v)} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.75rem 1rem", background: "transparent", border: "none", cursor: "pointer" }}>
          <span style={{ fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(255,255,255,0.7)" }}>Current Time Lord Movement</span>
          <ChevronDown size={14} style={{ color: "rgba(255,255,255,0.6)", transform: tlOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 200ms ease" }} />
        </button>
        {tlOpen && (
          <div style={{ padding: "0 1.25rem 1.25rem" }}>
            <TimeLordMovement selectedDate={todayDateStr} variant="immersive" accentColor={accentColor} darkColor={darkColor} />
          </div>
        )}
      </div>

      {card("Natal Anchor", s2, setS2,
        <div style={{ padding: "1rem 1.25rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {[["Lagna", lagnaSign], ["Activated House", activatedHouse], ["Activated Sign", activatedSign], ["Time Lord", timeLord]].map(([label, value]) => (
            <div key={String(label)} style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: "0.75rem", color: TEXT_MUTED }}>{label}</span>
              <span style={{ fontWeight: 500, color: TEXT_PRIMARY }}>{value}</span>
            </div>
          ))}
        </div>
      )}

      {card("Operational Chain", s3, setS3,
        <div style={{ padding: "1rem 1.25rem", fontSize: "0.875rem", color: TEXT_PRIMARY, lineHeight: 1.8, whiteSpace: "pre-wrap" }}>
          {profectionData.interpretation.operationalChain || "Operational chain unavailable."}
        </div>
      )}

      {card("Time Lord Movement", s4, setS4,
        <div style={{ padding: "1rem" }}>
          {transitsError ? (
            <p style={{ color: TEXT_MUTED, fontSize: "0.875rem" }}>Error loading transits.</p>
          ) : transitsLoading ? (
            <p style={{ color: TEXT_MUTED, fontSize: "0.875rem" }}>Loading...</p>
          ) : transitsData?.transits?.length ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {transitsData.transits.map((transit: any, idx: number) => {
                const isExpanded = expandedTransitId === idx;
                const today = new Date().toISOString().split('T')[0];
                const isCurrent = transit.startDate <= today && today <= transit.endDate;
                return (
                  <div key={idx} style={{ border: `1.5px solid ${isCurrent ? modeColor : "var(--border)"}`, borderRadius: "0.5rem", overflow: "hidden", background: isCurrent ? `color-mix(in srgb, ${modeColor} 10%, var(--background))` : "var(--background)" }}>
                    <button type="button" onClick={() => setExpandedTransitId(isExpanded ? null : idx)} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.75rem 1rem", background: "transparent", border: "none", cursor: "pointer" }}>
                      <p style={{ margin: 0, fontWeight: isCurrent ? 700 : 500, color: isCurrent ? modeColor : TEXT_PRIMARY, fontSize: "0.875rem" }}>
                        {transit.startDate} – {transit.endDate} — {transit.sign} in House {transit.house}
                      </p>
                      <ChevronDown size={16} style={{ color: isCurrent ? modeColor : TEXT_MUTED, transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 200ms ease", flexShrink: 0, marginLeft: "0.5rem" }} />
                    </button>
                    {isExpanded && (
                      <div style={{ padding: "1rem", borderTop: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: "0.75rem", fontSize: "0.875rem" }}>
                        {[["Motion", transit.isRetrograde ? "Retrograde" : "Direct"], ["Combustion", transit.combustionStatus ? "Yes" : "No"], ["Solitary", transit.solitaryStatus ? "Yes" : "No"]].map(([label, value]) => (
                          <div key={String(label)} style={{ display: "flex", justifyContent: "space-between" }}>
                            <span style={{ color: TEXT_MUTED }}>{label}:</span>
                            <span style={{ color: TEXT_PRIMARY, fontWeight: 500 }}>{value}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <p style={{ color: TEXT_MUTED, fontSize: "0.875rem" }}>No transit data available.</p>
          )}
        </div>
      )}

      {card("Yearly Focus", s5, setS5,
        <div style={{ padding: "1rem 1.25rem" }}>
          <p style={{ color: TEXT_PRIMARY, fontSize: "0.875rem", margin: 0, lineHeight: 1.6 }}>{profectionData.interpretation.section5}</p>
        </div>
      )}

      {card("What Supports Growth", s6, setS6,
        <div style={{ padding: "1rem 1.25rem" }}>
          <p style={{ color: TEXT_PRIMARY, fontSize: "0.875rem", margin: 0, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{profectionData.interpretation.section6}</p>
        </div>
      )}

      {card("What Creates Friction", s7, setS7,
        <div style={{ padding: "1rem 1.25rem" }}>
          <p style={{ color: TEXT_PRIMARY, fontSize: "0.875rem", margin: 0, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{profectionData.interpretation.section7}</p>
        </div>
      )}

      {card("Quick Reference", s8, setS8,
        <div style={{ padding: "1rem 1.25rem" }}>
          <p style={{ color: TEXT_PRIMARY, fontSize: "0.875rem", margin: 0, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
{`• Age ${age}: House ${activatedHouse} (${activatedSign}) activated by ${timeLord}
• Period: ${new Date(yearStart + 'T12:00:00').toLocaleDateString()} – ${new Date(yearEnd + 'T12:00:00').toLocaleDateString()}
• Core Work: Integrate ${activatedSign} qualities into this life area
• Key Focus: ${profectionData.interpretation.section5.split('.')[0]}.`}
          </p>
        </div>
      )}
    </div>
  );
}
