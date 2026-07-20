#!/bin/zsh
# MUTATION PROBE — does a test actually notice when the thing it guards breaks?
#
# Why this exists (v841): every test in this repo was green, and three of them were guarding
# nothing. `npm run verify` cannot tell a real guard from a decorative one — only breaking the
# source on purpose can. This found:
#
#   · prompt-structure.test.ts passed while the crown doctrine's DEFINING heading was renamed,
#     because BASE_PROMPT also contains the cross-reference that quotes it. That IS the v805 bug,
#     and the test written to prevent v805 was blind to it.
#   · the same file passed against a DELETED PROMPT_VERSION export, because its only assertion was
#     `not.toBe("old-string")` and undefined satisfies that.
#   · DAILY_ROW_CAP could be raised 100x with the whole suite green — the daily spend cap, the one
#     thing between a binge and the Anthropic wallet, had no test at all.
#
# Each line below breaks one thing and expects the named test to fail. "SURVIVED" is the finding.
# The tree is restored after every probe; it refuses to run against uncommitted changes so a
# failed restore can never eat real work.
#
# Usage:  ./tools/mutation-probe.sh          (from the repo root)

cd "$(dirname "$0")/.." || exit 1

if [[ -n "$(git status --porcelain)" ]]; then
  echo "refusing to run: working tree is dirty. Commit or stash first — this script edits sources."
  git status --porcelain
  exit 1
fi

fails=0

run() {
  # ARITY CHECK (v843). A probe line whose continuation backslash was written as \\ instead of \
  # arrives here with THREE arguments; the harness ran it, printed "caught" with a blank name, let
  # the next line execute as a shell command, and still finished with "all probes caught". A
  # verification tool that can report a false green is worse than none, so a malformed probe is now
  # a hard failure.
  if [[ $# -ne 5 ]]; then
    echo "MALFORMED probe: expected 5 arguments, got $# — check the line continuations"
    fails=$((fails + 1))
    return
  fi
  local file="$1" from="$2" to="$3" test="$4" name="$5"
  python3 - "$file" "$from" "$to" <<'PY'
import sys
f, a, b = sys.argv[1], sys.argv[2], sys.argv[3]
a = a.replace('\\n', '\n'); b = b.replace('\\n', '\n')
s = open(f, encoding='utf8').read()
if s.count(a) != 1:
    print(f"   ANCHOR-FAIL {f}: {s.count(a)} matches — the probe is stale, not the code")
    sys.exit(9)
open(f, 'w', encoding='utf8').write(s.replace(a, b, 1))
PY
  if [[ $? -ne 0 ]]; then echo "??        $name"; git checkout -- "$file"; fails=$((fails + 1)); return; fi
  if npx vitest run $test >/dev/null 2>&1; then
    echo "SURVIVED  $name  <-- the test did NOT notice"
    fails=$((fails + 1))
  else
    echo "caught    $name"
  fi
  git checkout -- "$file"
}

echo "=== engine: the data handed to the model (priority 1) ==="
run server/vedic/yoga-detect.ts '?.combust === true' '!== null' \
  server/vedic/yoga-cancellations.test.ts "combustion read as a report object (the v800 bug)"
run server/panchang/service.ts 'const dayScaleNow = field.dayFinalMode ?? field.finalMode;' 'const dayScaleNow = field.finalMode;' \
  server/panchang/day-scale-gate.test.ts "day-scale guard watching only one scale (v826)"
run server/panchang/service.ts 'const majorityMinute = Math.max(majNakMin, majSignMin, 0) > 0 ? 1441 : 0;' 'const majorityMinute = 0;' \
  server/panchang/day-scale-mode.test.ts "majority-of-day minute"
run server/vedic/canon/karakas.json '"houseKaraka": [\n        6,\n        8,\n        10,\n        12' '"houseKaraka": [\n        6,\n        8,\n        12' \
  server/vedic/karaka-tables.test.ts "canon disagreeing with itself (Saturn/10)"
run server/vedic/life-areas.ts '{ planet: "Saturn", role: "primary", signifies: "the capacity to do the hard things that attain greatness, and to appreciate them" },' '{ planet: "Jupiter", role: "primary", signifies: "x" },' \
  server/vedic/karaka-tables.test.ts "Vol II transcription edited (career primary)"

run server/narrative/day-read-signals.ts 'const comb = combustion(planet, lon, daySunLon, retro);\n    const combust = planet !== "Sun" && comb?.combust === true;' 'const combust = planet !== "Sun" && sep(lon, daySunLon) < 8;' \
  server/narrative/day-read-signals.test.ts "combustion hand-rolled as a flat 8 orb again"

# what the tripwire watches, so it "survived" against correct code. The probe was wrong, not the test.
# It now does what wiring the module would actually look like: a production file importing it.

run server/panchang/dignity.ts 'Mercury:["Sun","Venus"]' 'Mercury:["Sun"]' \
  server/vedic/friendships-canon.test.ts "dignity.ts private friendship copy drifts from canon"
run server/panchang/dignity.ts 'Sun: 10, Moon: 33' 'Sun: 10, Moon: 63' \
  server/vedic/friendships-canon.test.ts "an exaltation degree lands in the wrong sign"
run server/vedic/canon/planetary-friendships.json '"enemies": ["Venus", "Saturn"] }' '"enemies": ["Venus"] }' \
  server/vedic/friendships-canon.test.ts "the friendship canon itself drifts from BPHS"

run server/dasha-calculator.ts '{ planet: "Rahu",    years: 18 },' '{ planet: "Rahu",    years: 17 },' \
  server/vedic/canon-integrity.test.ts "dasha-calculator's private Vimshottari copy drifts"
run server/dasha-calculator.ts '"Mula":             "Ketu",' '"Mula":             "Venus",' \
  server/vedic/canon-integrity.test.ts "a birth star starts the 120-year clock on the wrong lord"
run server/vedic/canon/muhurta-tables.json '"Krittika",\n        "Vishakha"' '"Krittika"' \
  server/vedic/canon-integrity.test.ts "a nakshatra loses its muhurta nature"
run server/vedic/canon/bhava-significations.json '"karakas": ["Mars", "Saturn"]' '"karakas": ["Mars"]' \
  server/vedic/canon-integrity.test.ts "two same-source canon tables disagree on a house karaka"

run server/narrative/input-builder.ts 'recentReads, humanTime, timeLordTransit, arc,' 'recentReads, humanTime, arc,' \
  server/narrative/payload-contract.test.ts "a documented payload field stops being emitted"
run server/narrative/input-builder.ts 'strength: +merRx.strength.toFixed(2)' 'power: +merRx.strength.toFixed(2)' \
  server/narrative/payload-contract.test.ts "mercuryRx shape drifts from what the prompt promises"
run server/narrative/prompts.ts '- transits: [{ planet, sign, houseFromLagna, retrograde, combust, nodal, strength,' '- transits: [{ planet, sign, houseFromLagna, retrograde, combust, nodal,' \
  server/narrative/payload-contract.test.ts "the transits field doc drifts from the emitted shape"

run server/narrative/input-builder.ts 'for (const surface of DAILY_SURFACES) {\n        row = await getNarrativeCache(p.id, surface, ds);\n        if (row?.content) break;\n      }' 'row = (await getNarrativeCache(p.id, "day_read", ds)) ?? (await getNarrativeCache(p.id, "glance", ds));' \
  server/narrative/daily-surface.test.ts "the daily-reading surface list gets re-typed inline again"

run server/panchang/modifier-config.ts "  Magha:             { score: -1," "  Magha:             { score: +1," \
  server/panchang/nakshatra-canon.test.ts "a fierce star is scored as expansion again"
run server/vedic/knots.ts 'label: "Parents — mother and father"' 'label: "Parents / roots"' \
  server/vedic/parents-vs-roots.test.ts "parents and roots get conflated again"

echo "=== money: where a bleed would start (priority 2) ==="
run server/narrative/service.ts 'const DAILY_ROW_CAP = 50;' 'const DAILY_ROW_CAP = 5000;' \
  server/narrative/spend-caps.test.ts "daily row cap raised 100x"
run server/narrative/service.ts 'const DAILY_CALL_CAP = 150;' 'const DAILY_CALL_CAP = 50;' \
  server/narrative/spend-caps.test.ts "v806 repeat: two arms sharing one threshold"
run server/narrative/service.ts 'countGenerationsToday(profileId).catch(() => 0)' 'countGenerationsToday(profileId)' \
  server/narrative/spend-caps.test.ts "cap failing closed on a DB error"
run server/narrative/service.ts 'if (uncappedProfiles.has(profileId)) return false;' 'if (false) return false;' \
  server/narrative/spend-caps.test.ts "admin exemption removed"
run server/routers.ts 'month: protectedProcedure.mutation(async ({ ctx }) => {\n      if (!(await hasHoroscope(ctx.user))) return { available: false as const };' 'month: protectedProcedure.mutation(async ({ ctx }) => {' \
  server/billing-gate.test.ts "a premium reading endpoint loses its entitlement gate"
run server/narrative/router.ts 'if (!(await canYearSight(ctx.user)))' 'if (false)' \
  server/billing-gate.test.ts "the year read stops enforcing year-sight server-side"

run server/routers/profiles.ts 'const owned = await getProfileById(profileId, userId);' 'const owned = await getProfileById(profileId, userId as any) ?? { id: profileId };' \
  server/isolation.test.ts "assertOwnsProfile stops failing closed"
run server/routers.ts 'eqW(profilesTable.userId, ctx.user.id)' 'eqW(profilesTable.userId, ctx.user.id ?? 0)' \
  server/isolation.test.ts "the combined read loses its owner scoping"
run server/narrative/router.ts 'await assertOwnsProfile(ctx.user.id, input.profileId);\n    // Year-sight is premium' '// Year-sight is premium' \
  server/isolation.test.ts "a profileId endpoint drops assertOwnsProfile"

run server/db.ts 'const SESSION_SLIDE_AFTER_MS =' 'const SESSION_SLIDE_AFTER_MS_UNUSED =' \
  server/session-slide.test.ts "session sliding renewal"

run server/narrative/prompts.ts 'do NOT reach for "worth" or' 'do NOT reach for "wealth" or' \
  server/narrative/prompt-structure.test.ts "2nd-house self-worth doctrine removed from the prompt"

echo "=== the prompt: laws that must ARRIVE, not merely exist ==="
run server/narrative/prompts.ts '\nPERSONAL APEX — THE CROWN DAY\n' '\nPERSONAL APEXX — THE CROWN DAY\n' \
  server/narrative/prompt-structure.test.ts "crown doctrine orphaned (v805's exact bug)"
run server/narrative/prompts.ts '\nWHEN THE SUN DID NOT RISE\n' '\nWHEN THE SUN DID NOT RISEX\n' \
  server/narrative/prompt-structure.test.ts "polar law orphaned"
run server/narrative/prompts.ts 'const PROMPT_VERSION' 'const PROMPT_VERSION_X' \
  server/narrative/prompt-structure.test.ts "PROMPT_VERSION deleted (cache key)"
run server/push.ts 'if (isCrownDay) return pickLine(POOL.crown' 'if (false && isCrownDay) return pickLine(POOL.crown' \
  server/bell-ladder.test.ts "bell's crown rung stops being read"

echo
if [[ -n "$(git status --porcelain)" ]]; then
  echo "WARNING: tree is dirty after the run — a restore failed. Inspect before committing."
  git status --porcelain
  exit 1
fi
if [[ $fails -gt 0 ]]; then
  echo "$fails probe(s) survived or went stale — those guards are not guarding."
  exit 1
fi
echo "all probes caught: every guard above fails when the thing it protects breaks."
