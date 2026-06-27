import { trpc } from "../lib/trpc";
import { useState, useMemo } from "react";
import { ChevronDown } from "lucide-react";
import AppHeader from "@/components/AppHeader";
import { ModeCard } from "@/components/ModeCard";
import { useDayModeColor } from "@/hooks/useDayModeColor";
import { TimeLordMovement } from "@/components/TimeLordMovement";
import { PANCHANG_TO_TASK_MODE, MODE_OKLCH, MODE_DARK, type TaskMode } from "../../../shared/types";

export default function ProfectionYear() {
  const modeColor = useDayModeColor();
  const TEXT_PRIMARY = "var(--foreground)";
  const TEXT_MUTED = "var(--muted-foreground)";

  const [showTransits, setShowTransits] = useState(false);
  const [tlOpen, setTlOpen] = useState(false);
  const [expandedTransitId, setExpandedTransitId] = useState<number | null>(null);

  const { data: profectionData, error: profectionError } = trpc.profection.current.useQuery();
  const { data: transitsData, error: transitsError, isLoading: transitsLoading } = trpc.profection.timeLordTransits.useQuery(undefined, {
    enabled: showTransits,
  });

  // Today's mode for the Time Lord Movement gradient card
  const { data: todayPanchang } = trpc.panchang.today.useQuery();
  const todayMode = todayPanchang?.mode;
  const taskMode: TaskMode | undefined = todayMode
    ? PANCHANG_TO_TASK_MODE[todayMode as keyof typeof PANCHANG_TO_TASK_MODE]
    : undefined;

  const tlGradient = taskMode === 'Action'
    ? 'var(--kala-action-gradient)'
    : taskMode === 'Build'
    ? 'var(--kala-build-gradient)'
    : taskMode === 'Selective'
    ? 'var(--kala-selective-gradient)'
    : taskMode === 'Restraint'
    ? 'var(--kala-restraint-gradient)'
    : 'var(--card)';

  const accentColor = taskMode ? MODE_OKLCH[taskMode] : 'var(--color-border)';
  const darkColor = taskMode ? MODE_DARK[taskMode] : undefined;

  const todayDateStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  if (profectionError) {
    return (
      <div style={{ padding: "2rem" }}>
        <AppHeader pageTitle="Profection Year" />
        <p style={{ color: TEXT_MUTED, marginTop: "1rem" }}>Error: {profectionError.message}</p>
      </div>
    );
  }

  if (!profectionData) {
    return (
      <div style={{ padding: "2rem" }}>
        <AppHeader pageTitle="Profection Year" />
        <p style={{ color: TEXT_MUTED, marginTop: "1rem" }}>Please set your birth date and lagna sign in settings to view your profection year.</p>
      </div>
    );
  }

  const prof = profectionData.profection;
  const { age, activatedHouse, activatedSign, timeLord, yearStart, yearEnd, lagnaSign } = prof;

  return (
    <div style={{ padding: "2rem", maxWidth: "900px", margin: "0 auto", paddingBottom: "7rem" }}>
      {/* Header */}
      <div style={{ marginBottom: "2rem" }}>
        <AppHeader pageTitle="Profection Year" />
        <p style={{ color: TEXT_PRIMARY, fontSize: "0.875rem", marginTop: "0.25rem", marginBottom: "0.5rem", fontWeight: 500, lineHeight: 1.5 }}>
          {lagnaSign} Lagna · Age {age}
          <br />
          <span style={{ whiteSpace: "nowrap" }}>{yearStart} to {yearEnd}</span>
        </p>
      </div>

      {/* SECTION 1: Current Annual Focus - FEATURED */}
      <ModeCard title="Current Annual Focus">
        <div style={{ padding: "1.25rem 1.25rem", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
          <div>
            <p style={{ color: TEXT_MUTED, fontSize: "0.75rem", marginBottom: "0.25rem" }}>Activated House</p>
            <p style={{ color: TEXT_PRIMARY, fontSize: "1.125rem", fontWeight: 600 }}>{activatedHouse}</p>
          </div>
          <div>
            <p style={{ color: TEXT_MUTED, fontSize: "0.75rem", marginBottom: "0.25rem" }}>Activated Sign</p>
            <p style={{ color: TEXT_PRIMARY, fontSize: "1.125rem", fontWeight: 600 }}>{activatedSign}</p>
          </div>
          <div>
            <p style={{ color: TEXT_MUTED, fontSize: "0.75rem", marginBottom: "0.25rem" }}>Time Lord</p>
            <p style={{ color: TEXT_PRIMARY, fontSize: "1.125rem", fontWeight: 600 }}>{timeLord}</p>
          </div>
          <div>
            <p style={{ color: TEXT_MUTED, fontSize: "0.75rem", marginBottom: "0.25rem" }}>Age</p>
            <p style={{ color: TEXT_PRIMARY, fontSize: "1.125rem", fontWeight: 600 }}>{age}</p>
          </div>
        </div>
      </ModeCard>

      {/* CURRENT TIME LORD MOVEMENT — immersive gradient card, same as Today/Planner */}
      <div
        className="overflow-hidden"
        style={{
          borderRadius: '20px',
          background: tlGradient,
          marginBottom: '1.25rem',
        }}
      >
        <button
          className="w-full flex items-center justify-between px-4 py-3"
          onClick={() => setTlOpen((v) => !v)}
        >
          <span
            style={{
              fontSize: '0.65rem',
              fontWeight: 700,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: 'rgba(255,255,255,0.7)',
            }}
          >
            Current Time Lord Movement
          </span>
          <ChevronDown
            size={14}
            style={{
              color: 'rgba(255,255,255,0.6)',
              transform: tlOpen ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 200ms ease',
            }}
          />
        </button>
        {tlOpen && (
          <div className="px-5 pb-5">
            <TimeLordMovement
              selectedDate={todayDateStr}
              variant="immersive"
              accentColor={accentColor}
              darkColor={darkColor}
            />
          </div>
        )}
      </div>

      {/* SECTION 2: Natal Anchor */}
      <ModeCard title="Natal Anchor">
        <div style={{ padding: "1rem 1.25rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontSize: "0.75rem", color: TEXT_MUTED }}>Lagna</span>
            <span style={{ fontWeight: 500, color: TEXT_PRIMARY }}>{lagnaSign}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontSize: "0.75rem", color: TEXT_MUTED }}>Activated House</span>
            <span style={{ fontWeight: 500, color: TEXT_PRIMARY }}>{activatedHouse}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontSize: "0.75rem", color: TEXT_MUTED }}>Activated Sign</span>
            <span style={{ fontWeight: 500, color: TEXT_PRIMARY }}>{activatedSign}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontSize: "0.75rem", color: TEXT_MUTED }}>Time Lord</span>
            <span style={{ fontWeight: 500, color: TEXT_PRIMARY }}>{timeLord}</span>
          </div>
        </div>
      </ModeCard>

      {/* SECTION 3: Operational Chain */}
      <ModeCard title="Operational Chain">
        <div style={{ padding: "1rem 1.25rem", fontSize: "0.875rem", color: TEXT_PRIMARY, lineHeight: 1.8, whiteSpace: "pre-wrap" }}>
          {profectionData.interpretation.operationalChain || "Operational chain unavailable. Complete profection interpretation required."}
        </div>
      </ModeCard>

      {/* SECTION 4: Time Lord Movement — Individual Transit Accordion */}
      <ModeCard
        title="Time Lord Movement"
        onHeaderClick={() => setShowTransits(!showTransits)}
        headerSub={
          <p style={{ color: "rgba(255,255,255,0.7)", fontSize: "0.7rem", margin: 0 }}>
            {timeLord ? `${timeLord} transit periods with secondary conditions` : "Time lord transit periods with secondary conditions"}
          </p>
        }
        headerRight={
          <ChevronDown
            size={16}
            style={{
              color: "rgba(255,255,255,0.8)",
              transform: showTransits ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 200ms ease-out',
              flexShrink: 0,
              marginTop: "0.1rem",
            }}
          />
        }
      >
        {showTransits && (
          <div style={{ padding: "1rem" }}>
            {transitsError ? (
              <p style={{ color: TEXT_MUTED, fontSize: "0.875rem" }}>Error loading transits: {transitsError.message}</p>
            ) : transitsData?.transits && transitsData.transits.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {transitsData.transits.map((transit: any, idx: number) => {
                  const isExpanded = expandedTransitId === idx;
                  const today = new Date().toISOString().split('T')[0];
                  const isCurrent = transit.startDate <= today && today <= transit.endDate;
                  const dateRange = `${transit.startDate} – ${transit.endDate}`;
                  const header = `${dateRange} — ${transit.sign} in House ${transit.house}`;
                  return (
                    <div
                      key={idx}
                      style={{
                        border: `1.5px solid ${isCurrent ? modeColor : 'var(--border)'}`,
                        borderRadius: "0.5rem",
                        overflow: "hidden",
                        background: isCurrent ? `color-mix(in srgb, ${modeColor} 10%, var(--background))` : 'var(--background)',
                      }}
                    >
                      <button
                        onClick={() => setExpandedTransitId(isExpanded ? null : idx)}
                        style={{
                          width: "100%",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "0.75rem 1rem",
                          background: "transparent",
                          border: "none",
                          cursor: "pointer",
                          fontSize: "0.875rem",
                        }}
                      >
                        <p style={{ margin: 0, fontWeight: isCurrent ? 700 : 500, color: isCurrent ? modeColor : TEXT_PRIMARY }}>
                          {header}
                        </p>
                        <ChevronDown
                          size={16}
                          style={{
                            color: isCurrent ? modeColor : TEXT_MUTED,
                            transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                            transition: 'transform 200ms ease-out',
                            flexShrink: 0,
                            marginLeft: "0.5rem"
                          }}
                        />
                      </button>
                      {isExpanded && (
                        <div style={{ padding: "1rem", borderTop: `1px solid var(--border)` }}>
                          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", fontSize: "0.875rem" }}>
                            <div style={{ display: "flex", justifyContent: "space-between" }}>
                              <span style={{ color: TEXT_MUTED }}>Motion:</span>
                              <span style={{ color: TEXT_PRIMARY, fontWeight: 500 }}>{transit.isRetrograde ? "Retrograde" : "Direct"}</span>
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between" }}>
                              <span style={{ color: TEXT_MUTED }}>Co-present planets:</span>
                              <span style={{ color: TEXT_PRIMARY, fontWeight: 500 }}>
                                {transit.coPresentPlanets ? JSON.parse(transit.coPresentPlanets).join(", ") : "None"}
                              </span>
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between" }}>
                              <span style={{ color: TEXT_MUTED }}>Rahu/Ketu:</span>
                              <span style={{ color: TEXT_PRIMARY, fontWeight: 500 }}>
                                {transit.rahuKetuPresence || "None"}
                              </span>
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between" }}>
                              <span style={{ color: TEXT_MUTED }}>Combustion:</span>
                              <span style={{ color: TEXT_PRIMARY, fontWeight: 500 }}>
                                {transit.combustionStatus ? "Yes" : "No"}
                              </span>
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between" }}>
                              <span style={{ color: TEXT_MUTED }}>Close conjunctions:</span>
                              <span style={{ color: TEXT_PRIMARY, fontWeight: 500 }}>
                                {transit.closeConjunctions ? JSON.parse(transit.closeConjunctions).join(", ") : "None"}
                              </span>
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between" }}>
                              <span style={{ color: TEXT_MUTED }}>Solitary:</span>
                              <span style={{ color: TEXT_PRIMARY, fontWeight: 500 }}>
                                {transit.solitaryStatus ? "Yes" : "No"}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : transitsLoading ? (
              <p style={{ color: TEXT_MUTED, fontSize: "0.875rem" }}>Loading transits...</p>
            ) : (
              <p style={{ color: TEXT_MUTED, fontSize: "0.875rem" }}>No transit data available</p>
            )}
          </div>
        )}
      </ModeCard>

      {/* SECTION 5: Yearly Focus */}
      <ModeCard title="Yearly Focus">
        <div style={{ padding: "1rem 1.25rem" }}>
          <p style={{ color: TEXT_PRIMARY, fontSize: "0.875rem", margin: 0, lineHeight: 1.6 }}>{profectionData.interpretation.section5}</p>
        </div>
      </ModeCard>

      {/* SECTION 6: What Supports Growth */}
      <ModeCard title="What Supports Growth">
        <div style={{ padding: "1rem 1.25rem" }}>
          <p style={{ color: TEXT_PRIMARY, fontSize: "0.875rem", margin: 0, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{profectionData.interpretation.section6}</p>
        </div>
      </ModeCard>

      {/* SECTION 7: What Creates Friction */}
      <ModeCard title="What Creates Friction">
        <div style={{ padding: "1rem 1.25rem" }}>
          <p style={{ color: TEXT_PRIMARY, fontSize: "0.875rem", margin: 0, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{profectionData.interpretation.section7}</p>
        </div>
      </ModeCard>

      {/* SECTION 8: Quick Reference */}
      <ModeCard title="Quick Reference">
        <div style={{ padding: "1rem 1.25rem" }}>
          <p style={{ color: TEXT_PRIMARY, fontSize: "0.875rem", margin: 0, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
• <strong>Age {age}</strong>: House {activatedHouse} ({activatedSign}) activated by {timeLord}
• <strong>Period</strong>: {new Date(yearStart + 'T12:00:00').toLocaleDateString()} – {new Date(yearEnd + 'T12:00:00').toLocaleDateString()}
• <strong>Core Work</strong>: Integrate {activatedSign} qualities into this life area
• <strong>Key Focus</strong>: {profectionData.interpretation.section5.split('.')[0]}.          </p>
        </div>
      </ModeCard>
    </div>
  );
}
