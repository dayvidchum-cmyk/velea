import { useState, useMemo } from 'react';
import { inkOf } from "@/lib/ink";
import VeleaLoader from "@/components/VeleaLoader";
import { trpc } from '@/lib/trpc';

/**
 * Developer-facing diagnostic panel for the mode engine.
 * Shows full modifier breakdown per day and the complete config table.
 */
export default function Diagnostics() {
  const today = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState(today);
  const [rangeStart, setRangeStart] = useState(today);
  const [rangeEnd, setRangeEnd] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 6);
    return d.toISOString().split('T')[0];
  });
  const [showConfig, setShowConfig] = useState(false);
  const [showRange, setShowRange] = useState(false);

  const dayQuery = trpc.diagnostics.day.useQuery({ date: selectedDate });
  const timeLordQuery = trpc.panchang.timeLordInfluence.useQuery({ date: selectedDate });
  const rangeQuery = trpc.diagnostics.range.useQuery(
    { startDate: rangeStart, endDate: rangeEnd },
    { enabled: showRange }
  );
  const configQuery = trpc.diagnostics.config.useQuery(undefined, { enabled: showConfig });

  const modeColor = (mode: string) => {
    switch (mode) {
      case 'Action': return '#5BA88F';
      case 'Build': return '#A68B52';
      case 'Selective': return '#5B8FA8';
      case 'Restraint': return '#8B5A5A';
      default: return '#888';
    }
  };

  return (
    <div className="container py-6 space-y-6 text-white min-h-screen" style={{ fontFamily: 'monospace' }}>
      <h1 className="text-2xl font-bold tracking-tight">Mode Engine Diagnostics</h1>

      {/* ─── SINGLE DAY BREAKDOWN ─── */}
      <section className="space-y-3">
        <div className="flex items-center gap-3">
          <label className="text-sm text-white/60">Date:</label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="bg-white/5 border border-white/10 rounded px-2 py-1 text-sm text-white"
          />
        </div>

        {dayQuery.isLoading && <VeleaLoader size={22} label="Loading…" />}
        {dayQuery.data && (
          <div className="bg-white/5 border border-white/10 rounded-lg p-4 space-y-4">
            {/* Base Calculation */}
            <div>
              <h3 className="text-xs uppercase tracking-wider text-white/40 mb-2">Base Calculation</h3>
              <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
                <span className="text-white/60">Moon Sign</span>
                <span>{dayQuery.data.moonSign}</span>
                <span className="text-white/60">House from Lagna</span>
                <span>{dayQuery.data.house}</span>
                <span className="text-white/60">Base Mode</span>
                <span style={{ color: inkOf(modeColor(dayQuery.data.baseMode)) }}>{dayQuery.data.baseMode}</span>
                <span className="text-white/60">Base Score</span>
                <span>{dayQuery.data.baseScore}</span>
              </div>
            </div>

            {/* Nakshatra */}
            <div>
              <h3 className="text-xs uppercase tracking-wider text-white/40 mb-2">Nakshatra</h3>
              <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
                <span className="text-white/60">Name</span>
                <span>{dayQuery.data.nakshatra.name}</span>
                <span className="text-white/60">Modifier</span>
                <span className={dayQuery.data.nakshatra.modifier > 0 ? 'text-green-400' : dayQuery.data.nakshatra.modifier < 0 ? 'text-red-400' : 'text-white/40'}>
                  {dayQuery.data.nakshatra.modifier > 0 ? '+' : ''}{dayQuery.data.nakshatra.modifier}
                </span>
                <span className="text-white/60">Reason</span>
                <span className="text-white/70 text-xs">{dayQuery.data.nakshatra.reason}</span>
              </div>
            </div>

            {/* Tithi */}
            <div>
              <h3 className="text-xs uppercase tracking-wider text-white/40 mb-2">Tithi</h3>
              <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
                <span className="text-white/60">Name</span>
                <span>{dayQuery.data.tithi.name} ({dayQuery.data.tithi.paksha})</span>
                <span className="text-white/60">Modifier</span>
                <span className={dayQuery.data.tithi.modifier > 0 ? 'text-green-400' : dayQuery.data.tithi.modifier < 0 ? 'text-red-400' : 'text-white/40'}>
                  {dayQuery.data.tithi.modifier > 0 ? '+' : ''}{dayQuery.data.tithi.modifier}
                </span>
                <span className="text-white/60">Reason</span>
                <span className="text-white/70 text-xs">{dayQuery.data.tithi.reason}</span>
              </div>
            </div>

            {/* Field Condition */}
            <div>
              <h3 className="text-xs uppercase tracking-wider text-white/40 mb-2">Field Condition</h3>
              <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
                <span className="text-white/60">Condition</span>
                <span>{dayQuery.data.fieldCondition.condition}</span>
                <span className="text-white/60">Modifier</span>
                <span className={dayQuery.data.fieldCondition.modifier > 0 ? 'text-green-400' : dayQuery.data.fieldCondition.modifier < 0 ? 'text-red-400' : 'text-white/40'}>
                  {dayQuery.data.fieldCondition.modifier > 0 ? '+' : ''}{dayQuery.data.fieldCondition.modifier}
                </span>
                <span className="text-white/60">Reason</span>
                <span className="text-white/70 text-xs">{dayQuery.data.fieldCondition.reason}</span>
              </div>
            </div>

            {/* Final */}
            <div className="border-t border-white/10 pt-3">
              <h3 className="text-xs uppercase tracking-wider text-white/40 mb-2">Final</h3>
              <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
                <span className="text-white/60">Raw Score (diag.)</span>
                <span>{dayQuery.data.rawScore}</span>
                <span className="text-white/60">Total Score (diag.)</span>
                <span>{dayQuery.data.totalScore}</span>
                <span className="text-white/60">Final Mode</span>
                <span className="font-bold text-lg" style={{ color: inkOf(modeColor(dayQuery.data.finalMode)) }}>
                  {dayQuery.data.finalMode}
                </span>
                {(dayQuery.data as any).qualifier && (
                  <>
                    <span className="text-white/60">Qualifier</span>
                    <span className="font-semibold" style={{ color: inkOf(modeColor(dayQuery.data.finalMode)) }}>
                      {(dayQuery.data as any).qualifier}
                    </span>
                  </>
                )}
                {(dayQuery.data as any).modeFlipped && (
                  <>
                    <span className="text-white/60">Mode Flip</span>
                    <span className="text-yellow-400 text-xs">All 3 layers aligned → {dayQuery.data.baseMode} → {dayQuery.data.finalMode}</span>
                  </>
                )}
                <span className="text-white/60">Confidence</span>
                <span className="font-bold">{dayQuery.data.confidence}%</span>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* ─── TIME LORD INFLUENCE ─── */}
      <section className="space-y-3">
        <h2 className="text-sm uppercase tracking-wider text-white/40">Time Lord Influence (Advisory)</h2>
        {timeLordQuery.isLoading && <VeleaLoader size={22} label="Loading…" />}
        {timeLordQuery.data === null && (
          <p className="text-white/40 text-sm">No birth data or lagna configured. Set up your birth chart to enable Time Lord influence.</p>
        )}
        {timeLordQuery.data && (
          <div className="bg-white/5 border border-white/10 rounded-lg p-4 space-y-4">
            <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
              <span className="text-white/60">Date</span>
              <span>{timeLordQuery.data.date}</span>
              <span className="text-white/60">Final Mode</span>
              <span className="font-bold" style={{ color: inkOf(modeColor(timeLordQuery.data.finalMode ?? '')) }}>{timeLordQuery.data.finalMode}</span>
              <span className="text-white/60">Qualifier</span>
              <span className="font-semibold" style={{ color: inkOf(modeColor(timeLordQuery.data.finalMode ?? '')) }}>{timeLordQuery.data.qualifier ?? '—'}</span>
              <span className="text-white/60">Time Lord</span>
              <span className="font-bold text-yellow-300">{timeLordQuery.data.timeLordLabel}</span>
              <span className="text-white/60">Operational Chain</span>
              <span className="text-white/70">{timeLordQuery.data.operationalChain}</span>
            </div>
            {timeLordQuery.data.bestUses && timeLordQuery.data.bestUses.length > 0 && (
              <div>
                <h3 className="text-xs uppercase tracking-wider text-white/40 mb-2">Best Uses Today</h3>
                <ul className="space-y-1">
                  {timeLordQuery.data.bestUses.map((use, i) => (
                    <li key={i} className="text-sm text-white/80 flex items-start gap-2">
                      <span className="text-yellow-400 mt-0.5">·</span>
                      <span>{use.charAt(0).toUpperCase() + use.slice(1)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {timeLordQuery.data.avoidToday && timeLordQuery.data.avoidToday.length > 0 && (
              <div>
                <h3 className="text-xs uppercase tracking-wider text-white/40 mb-2">Avoid Today</h3>
                <ul className="space-y-1">
                  {timeLordQuery.data.avoidToday.map((item, i) => (
                    <li key={i} className="text-sm text-white/60 flex items-start gap-2">
                      <span className="text-white/30 mt-0.5">·</span>
                      <span>{item.charAt(0).toUpperCase() + item.slice(1)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {timeLordQuery.data.reasoning && (
              <div className="pt-2 border-t border-white/10">
                <h3 className="text-xs uppercase tracking-wider text-white/40 mb-1">Reasoning</h3>
                <p className="text-xs text-white/50">{timeLordQuery.data.reasoning}</p>
              </div>
            )}
          </div>
        )}
      </section>

      {/* ─── DATE RANGE TABLE ─── */}
      <section className="space-y-3">
        <button
          onClick={() => setShowRange(!showRange)}
          className="text-sm text-white/60 hover:text-white underline"
        >
          {showRange ? 'Hide' : 'Show'} Date Range Table
        </button>

        {showRange && (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <label className="text-sm text-white/60">From:</label>
              <input
                type="date"
                value={rangeStart}
                onChange={(e) => setRangeStart(e.target.value)}
                className="bg-white/5 border border-white/10 rounded px-2 py-1 text-sm text-white"
              />
              <label className="text-sm text-white/60">To:</label>
              <input
                type="date"
                value={rangeEnd}
                onChange={(e) => setRangeEnd(e.target.value)}
                className="bg-white/5 border border-white/10 rounded px-2 py-1 text-sm text-white"
              />
            </div>

            {rangeQuery.isLoading && <p className="text-white/40">Loading range...</p>}
            {rangeQuery.data && (
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="text-white/40 border-b border-white/10">
                      <th className="text-left p-1">Date</th>
                      <th className="text-left p-1">Moon</th>
                      <th className="text-left p-1">H</th>
                      <th className="text-left p-1">Base</th>
                      <th className="text-left p-1">Nak</th>
                      <th className="text-right p-1">N±</th>
                      <th className="text-left p-1">Tithi</th>
                      <th className="text-right p-1">T±</th>
                      <th className="text-left p-1">Field</th>
                      <th className="text-right p-1">F±</th>
                      <th className="text-right p-1">Raw</th>
                      <th className="text-left p-1">Final</th>
                      <th className="text-right p-1">Conf</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rangeQuery.data.map((row) => (
                      <tr key={row.date} className="border-b border-white/5 hover:bg-white/5">
                        <td className="p-1 text-white/70">{row.date.slice(5)}</td>
                        <td className="p-1">{row.moonSign.slice(0, 3)}</td>
                        <td className="p-1">{row.house}</td>
                        <td className="p-1" style={{ color: inkOf(modeColor(row.baseMode)) }}>{row.baseMode.slice(0, 3)}</td>
                        <td className="p-1">{row.nakshatraName.split(' ')[0].slice(0, 6)}</td>
                        <td className={`p-1 text-right ${row.nakshatraModifier > 0 ? 'text-green-400' : row.nakshatraModifier < 0 ? 'text-red-400' : 'text-white/30'}`}>
                          {row.nakshatraModifier > 0 ? '+' : ''}{row.nakshatraModifier}
                        </td>
                        <td className="p-1">{row.tithiName.replace(/^(Shukla|Krishna)\s+/, '').slice(0, 6)}</td>
                        <td className={`p-1 text-right ${row.tithiModifier > 0 ? 'text-green-400' : row.tithiModifier < 0 ? 'text-red-400' : 'text-white/30'}`}>
                          {row.tithiModifier > 0 ? '+' : ''}{row.tithiModifier}
                        </td>
                        <td className="p-1">{row.fieldCondition.slice(0, 4)}</td>
                        <td className={`p-1 text-right ${row.fieldModifier > 0 ? 'text-green-400' : row.fieldModifier < 0 ? 'text-red-400' : 'text-white/30'}`}>
                          {row.fieldModifier > 0 ? '+' : ''}{row.fieldModifier}
                        </td>
                        <td className="p-1 text-right">{row.rawScore}</td>
                        <td className="p-1 font-bold" style={{ color: inkOf(modeColor(row.finalMode)) }}>{row.finalMode.slice(0, 3)}</td>
                        <td className="p-1 text-right">{row.confidence}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </section>

      {/* ─── CONFIGURATION TABLE ─── */}
      <section className="space-y-3">
        <button
          onClick={() => setShowConfig(!showConfig)}
          className="text-sm text-white/60 hover:text-white underline"
        >
          {showConfig ? 'Hide' : 'Show'} All Modifier Configuration
        </button>

        {showConfig && configQuery.data && (
          <div className="space-y-6">
            {/* House to Base Mode */}
            <div>
              <h3 className="text-xs uppercase tracking-wider text-white/40 mb-2">House → Base Mode</h3>
              <div className="grid grid-cols-4 gap-1 text-xs">
                {Object.entries(configQuery.data.houseToBaseMode).map(([house, mode]) => (
                  <div key={house} className="bg-white/5 rounded px-2 py-1">
                    <span className="text-white/40">H{house}:</span>{' '}
                    <span style={{ color: inkOf(modeColor(mode as string)) }}>{mode as string}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Nakshatra Modifiers */}
            <div>
              <h3 className="text-xs uppercase tracking-wider text-white/40 mb-2">Nakshatra Modifiers</h3>
              <div className="space-y-1">
                {['Upgrade', 'Downgrade', 'Selective', 'Neutral'].map((category) => (
                  <div key={category} className="bg-white/5 rounded p-2">
                    <span className="text-xs text-white/50 uppercase">{category}</span>
                    <span className="text-xs text-white/30 ml-2">
                      ({category === 'Upgrade' ? '+1' : category === 'Downgrade' ? '-1' : category === 'Selective' ? '→1 bias' : '0'})
                    </span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {Object.entries(configQuery.data!.nakshatraModifiers)
                        .filter(([, v]) => (v as any).category === category)
                        .map(([name]) => (
                          <span key={name} className="text-xs bg-white/5 rounded px-1.5 py-0.5">
                            {name}
                          </span>
                        ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Tithi Modifiers */}
            <div>
              <h3 className="text-xs uppercase tracking-wider text-white/40 mb-2">Tithi Modifiers</h3>
              <div className="bg-white/5 rounded p-2 text-xs space-y-1">
                <div>Shukla (waxing): <span className="text-green-400">+{configQuery.data.tithiPhaseModifier.Shukla}</span></div>
                <div>Krishna (waning): <span className="text-red-400">{configQuery.data.tithiPhaseModifier.Krishna}</span></div>
                <div className="mt-2 text-white/50">Strong Restraint Tithis (additional {configQuery.data.strongRestraintAdditionalModifier}):</div>
                <div className="flex flex-wrap gap-1">
                  {configQuery.data.strongRestraintTithis.map((t: string) => (
                    <span key={t} className="bg-white/5 rounded px-1.5 py-0.5 text-red-300">{t}</span>
                  ))}
                </div>
              </div>
            </div>

            {/* Field Condition */}
            <div>
              <h3 className="text-xs uppercase tracking-wider text-white/40 mb-2">Field Condition Modifiers</h3>
              <div className="bg-white/5 rounded p-2 text-xs space-y-1">
                <div>Open: <span className="text-white/40">{configQuery.data.fieldConditionModifiers.Open}</span> (upgrade nak + Shukla + no strong restraint)</div>
                <div>Restricted (full): <span className="text-red-400">{configQuery.data.fieldConditionModifiers.Restricted_Full}</span> (downgrade nak + Krishna + strong restraint)</div>
                <div>Restricted (partial): <span className="text-red-400">{configQuery.data.fieldConditionModifiers.Restricted_Partial}</span> (downgrade nak + strong restraint)</div>
                <div>Neutral: <span className="text-white/40">{configQuery.data.fieldConditionModifiers.Neutral}</span> (everything else)</div>
              </div>
            </div>

            {/* Selective Bias */}
            <div>
              <h3 className="text-xs uppercase tracking-wider text-white/40 mb-2">Selective Bias</h3>
              <div className="bg-white/5 rounded p-2 text-xs">
                Selective nakshatras pull score toward 1 by ±{configQuery.data.selectiveBiasStrength}
              </div>
            </div>

            {/* Flex Resolution */}
            <div>
              <h3 className="text-xs uppercase tracking-wider text-white/40 mb-2">Flex Resolution</h3>
              <div className="bg-white/5 rounded p-2 text-xs space-y-1">
                <div>With upward signal: score = {configQuery.data.flexResolution.withUpwardSignal} (Build)</div>
                <div>Without signal: score = {configQuery.data.flexResolution.withoutSignal} (Selective)</div>
              </div>
            </div>

            {/* Confidence */}
            <div>
              <h3 className="text-xs uppercase tracking-wider text-white/40 mb-2">Confidence Calculation</h3>
              <div className="bg-white/5 rounded p-2 text-xs space-y-1">
                <div>Base: {configQuery.data.confidenceConfig.baseConfidence}%</div>
                <div>Agreement bonus: +{configQuery.data.confidenceConfig.agreementBonus}% per agreeing modifier</div>
                <div>Distance penalty: -{configQuery.data.confidenceConfig.distancePenalty}% per unit of clamping distance</div>
                <div>Range: [{configQuery.data.confidenceConfig.min}%, {configQuery.data.confidenceConfig.max}%]</div>
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
