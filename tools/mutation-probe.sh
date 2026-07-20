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

echo "=== money: where a bleed would start (priority 2) ==="
run server/narrative/service.ts 'const DAILY_ROW_CAP = 50;' 'const DAILY_ROW_CAP = 5000;' \
  server/narrative/spend-caps.test.ts "daily row cap raised 100x"
run server/narrative/service.ts 'const DAILY_CALL_CAP = 150;' 'const DAILY_CALL_CAP = 50;' \
  server/narrative/spend-caps.test.ts "v806 repeat: two arms sharing one threshold"
run server/narrative/service.ts 'countGenerationsToday(profileId).catch(() => 0)' 'countGenerationsToday(profileId)' \
  server/narrative/spend-caps.test.ts "cap failing closed on a DB error"
run server/narrative/service.ts 'if (uncappedProfiles.has(profileId)) return false;' 'if (false) return false;' \
  server/narrative/spend-caps.test.ts "admin exemption removed"
run server/db.ts 'const SESSION_SLIDE_AFTER_MS =' 'const SESSION_SLIDE_AFTER_MS_UNUSED =' \
  server/session-slide.test.ts "session sliding renewal"

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
