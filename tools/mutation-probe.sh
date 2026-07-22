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
# The probe above only proves the CORRECTED TABLE is still correct. It cannot see whether the
# interpreter reads it — for eight days it did not, and this exact mutation is the bug that shipped:
# a private list in interpreter.ts holding Magha as expansion while the cited table said fierce.
run server/panchang/interpreter.ts "const NAKSHATRA_UPGRADE: string[] = byCategory('Upgrade');" "const NAKSHATRA_UPGRADE: string[] = ['Magha', ...byCategory('Upgrade')];" \
  server/panchang/nakshatra-one-table.test.ts "the interpreter keeps a private nakshatra list again"
# The THIRD copy of the 27 stars — the collective day-quality scoring. It agrees with canon today;
# nothing was stopping it drifting away, which is exactly how the interpreter's copy went wrong.
run server/panchang/auspiciousness.ts "  -1, // 9  Magha" "  +1, // 9  Magha" \
  server/panchang/auspiciousness-canon.test.ts "day-quality scoring drifts from the cited natures"
# A server lock rendering as an outage again — the half of the gate sweep that was done by hand.
run client/src/pages/LifeAtlas.tsx '(windowReadQ.data as any)?.locked ? (' 'false ? (' \
  server/locked-gate-client.test.ts "a locked season falls through to try-again"
# A paid reading going back to recording no location, while the page prints a live one above it.
run server/routers.ts 'computedCity: dayLoc.city, computedSource: dayLoc.source' 'computedSource: dayLoc.source' \
  server/horoscope-location.test.ts "a frozen reading stops recording where its sky was cast"
# A premium gate rendering as a fact about the sky again ("the sky is between eclipse seasons").
run client/src/pages/Horoscope.tsx 'const locked = !!((reveal.data as any)?.locked || (saved.data as any)?.locked);\n  const noSeason' 'const locked = false;\n  const noSeason' \
  server/locked-gate-client.test.ts "a mutation call site stops honouring the lock"
# The takeaway peeler going back to cutting inside an appositive (David's broken thought).
run shared/peel-takeaway.ts 'if (dashes.length !== 1) return { data: text, takeaway: "" };' 'if (dashes.length < 1) return { data: text, takeaway: "" };' \
  shared/peel-takeaway.test.ts "the peeler cuts inside an aside again"
# The peeler going back to peeling BY DEFAULT (the denylist hole, 2026-07-22): treating any
# single-dash tail as a closer beheads a lowercase continuation ("— pulling the belief loose").
run shared/peel-takeaway.ts 'if (so || startsNewClause) {' 'if (so || true) {' \
  shared/peel-takeaway.test.ts "the peeler beheads a lowercase continuation tail again"
# The day layer getting back into the STAGE input, which re-bills the year read every morning.
run server/narrative/input-builder.ts 'natal: natalStage, natalRetrogradeCount' 'natal, natalRetrogradeCount' \
  server/narrative/service.hash.test.ts "the stage input carries the day layer again"
# The birth tier reading a column `profiles` does not have — it did, and the old assertion passed
# because "birthLocation" is a substring of "birthLocationLat".
run server/panchang/resolve-day-sky.ts 'city: p.birthLocationCity ?? null,' 'city: p.birthLocation ?? null,' \
  server/horoscope-location.test.ts "the birth tier goes back to a phantom column"
# A special yoga refilling a day the rikta law emptied — shipped in Amrita Siddhi, uncaught.
run server/vedic/day-filter.ts '    if (emptied) {' '    if (false) {' \
  server/vedic/siddha-yoga.test.ts "a yoga stops speaking in the emptied day's grammar"
# The Siddha grid quietly losing one of David's three ruled spellings.
run server/vedic/canon/siddha-yoga.json '"Rohini", "Mrigashira", "Ardra", "Uttara Phalguni", "Uttara Ashadha", "Anuradha"' '"Rohini", "Mrigashira", "Ardra", "Uttara Phalguni", "Uttara Ashadha", "Animidha"' \
  server/vedic/siddha-yoga.test.ts "an OCR spelling gets back into the encoded grid"
# The sentence going back to being built BEFORE the yoga speaks — the contradiction one field over.
run server/vedic/day-filter.ts '    : yogaOnEmpty' '    : false && yogaOnEmpty' \
  server/vedic/siddha-yoga.test.ts "the sentence contradicts the supports again"
# The module-load guard losing the Siddha grid, so its supports take the initiate default silently.
run server/vedic/day-filter.ts '  for (const s of ((siddha as any).supports ?? [])) {\n    if (!(s in ACT_CLASS)) unclassified.push(s);\n  }' '  for (const s of []) {\n    if (!(s in ACT_CLASS)) unclassified.push(s);\n  }' \
  server/vedic/siddha-yoga.test.ts "the ACT_CLASS guard stops reading the Siddha grid"
# The severing half reaching a nature whose own avoid-list refuses cutting (5 tender days a year).
run server/vedic/day-filter.ts '...(natureRefusesCutting(natDef) ? [] : YOGA_ON_EMPTY_SEVER),' '...YOGA_ON_EMPTY_SEVER,' \
  server/vedic/siddha-yoga.test.ts "a tender day is offered cutting again"
run server/vedic/knots.ts 'label: "Parents — mother and father"' 'label: "Parents / roots"' \
  server/vedic/parents-vs-roots.test.ts "parents and roots get conflated again"
# A computed-but-SIMPLIFIED strength source going back to publishing as though it were exact.
run server/vedic/shadbala.ts 'else approximate.push("chesta");' 'else void 0;' \
  server/vedic/shadbala-honesty.test.ts "a simplified Chesta publishes as exact again"
# Identity-as-activation: restoring it makes every area busy every day, which is what made
# "nothing much is touching this today" unsayable for the model.
run server/vedic/life-areas.ts 'if (!reasons.length) return null;' 'if (!reasons.length && !areaPlayers.has(t.planet)) return null;' \
  server/vedic/quiet-area.test.ts "being the ruler alone activates an area again"
# The ceiling in generate.ts is not what the reader gets — the INSTRUCTION is. This mutation is the
# exact state the sheet called "fixed" while a paying reader still got less prose than a free one.
run server/narrative/prompts.ts 'THE READ (aim ~240 words, hard cap 280):\n- Name the season in LIVED time' 'THE READ (aim ~120 words, hard cap 150):\n- Name the season in LIVED time' \
  server/narrative/paid-word-floor.test.ts "a paid read is instructed shorter than the free one again"

run server/narrative/prompts.ts '\nTHE DAY THAT TURNS — READ IT IN TWO PARTS.\n' '\nTHE DAY THAT TURNS — READ IT IN TWO PARTSX.\n' \
  server/narrative/two-part-day.test.ts "the two-part day law is orphaned"
run server/narrative/input-builder.ts 'atLocalTime: (field as any).nakshatraTransitionTime,' 'atLocalTime: null,' \
  server/narrative/two-part-day.test.ts "the turn time stops reaching the model"

run server/narrative/prompts.ts '\nANCESTRY IS A SPREAD, NOT A TOPIC.\n' '\nANCESTRY IS A SPREAD, NOT A TOPICX.\n' \
  server/vedic/lineage.test.ts "the lineage law is orphaned"
run server/narrative/input-builder.ts '...(lineage ? { lineage } : {}),' '' \
  server/vedic/lineage.test.ts "the lineage spread stops being emitted"
run server/vedic/lineage.ts 'if (!t.slow) continue;' 'if (false) continue;' \
  server/vedic/lineage.test.ts "fast transits start lighting ancestry"

run server/narrative/prompts.ts '\nPROBABILITY, NEVER A PROMISE.\n' '\nPROBABILITY, NEVER A PROMISEX.\n' \
  server/panchang/crown-doctrine.test.ts "the probability-not-promise law is orphaned"
run server/panchang/crown.ts 'const CHANDRA_FAV = new Set([1, 3, 6, 7, 10, 11]);' 'const CHANDRA_FAV = new Set([1, 3, 6, 7, 10]);' \
  server/panchang/crown-doctrine.test.ts "Chandra Bala drifts from his six lucky houses"
run server/panchang/crown.ts '{ name: "Sampat", quality: "good" },' '{ name: "Sampat", quality: "mixed" },' \
  server/panchang/crown-doctrine.test.ts "a tara he calls good stops being favourable"

run server/vedic/day-filter.ts '"networking": "union",' '' \
  server/vedic/seven-stars.test.ts "a per-star act loses its classification"
run server/vedic/day-filter.ts 'Shatabhisha:         ["medical treatment"' 'Shatabhisha:         ["vehicles"' \
  server/vedic/seven-stars.test.ts "Shatabhisha goes back to being a travel day"

run server/vedic/research-store.ts 'dv: DASHA_ENGINE_VERSION,' '' \
  server/vedic/engine-versions.test.ts "a dasha-engine bump stops invalidating stored periods"

run server/panchang/service.ts 'const dominantNak = (astro as any)?.nakshatraAtSunrise ?? astro?.nakshatra' 'const dominantNak = astro?.nakshatra' \
  server/panchang/sunrise-naming.test.ts "the day goes back to being named by the majority star"

run CLAUDE.md '## RULE ZERO — never state a value you have not printed' '## Rule zero' \
  server/working-method.test.ts "the working method loses its rule-zero law"
run CLAUDE.md 'Illustrated a reason string as `Venus (exalts in Libra)`' 'Illustrated a reason string wrongly' \
  server/working-method.test.ts "the receipts are stripped out of CLAUDE.md"

run server/vedic/dignity.ts 'if (glossA || glossB) {' 'if (glossA) {' \
  server/vedic/kendra-tautology.test.ts "one gloss of Phaladeepika 7.30 stops counting"

run server/vedic/dignity.ts 'export const CANCEL_MIN_CONDITIONS = 2;' 'export const CANCEL_MIN_CONDITIONS = 1;' \
  server/vedic/kendra-tautology.test.ts "the cancellation bar drops back to one condition"
run server/vedic/dignity.ts 'export const SOLID_MIN_CONDITIONS = 3;' 'export const SOLID_MIN_CONDITIONS = 2;' \
  server/vedic/kendra-tautology.test.ts "'solid' stops meaning three or more"

run server/vedic/dignity.ts '(who !== "Moon" && KENDRA.has(houseFrom(moonIdx, lon)))' 'KENDRA.has(houseFrom(moonIdx, lon))' \
  server/vedic/kendra-tautology.test.ts "the Moon self-reference tautology comes back"
run server/vedic/dignity.ts 'if (inKendra(pLon, planet)) {' 'if (false) {' \
  server/vedic/kendra-tautology.test.ts "David's condition 3 stops firing"

run server/vedic/canon/muhurta-tables.json '"Sunday": "Hasta"' '"Sunday": "Rohini"' \
  server/vedic/amrita-siddhi.test.ts "the Amrita Siddhi table drifts from Raman's verse"
run server/vedic/day-filter.ts 'const amrita = amritaSiddhi(input.varaLord, input.nakshatra);' 'const amrita = false;' \
  server/vedic/amrita-siddhi.test.ts "Amrita Siddhi stops being detected"

echo "=== money: where a bleed would start (priority 2) ==="
run server/narrative/service.ts 'const DAILY_ROW_CAP = 50;' 'const DAILY_ROW_CAP = 5000;' \
  server/narrative/spend-caps.test.ts "daily row cap raised 100x"
run server/narrative/service.ts 'const DAILY_CALL_CAP = 150;' 'const DAILY_CALL_CAP = 50;' \
  server/narrative/spend-caps.test.ts "v806 repeat: two arms sharing one threshold"
run server/narrative/service.ts 'countGenerationsToday(profileId).catch(() => 0)' 'countGenerationsToday(profileId)' \
  server/narrative/spend-caps.test.ts "cap failing closed on a DB error"
run server/narrative/service.ts 'if (uncappedProfiles.has(profileId)) return false;' 'if (false) return false;' \
  server/narrative/spend-caps.test.ts "admin exemption removed"
run server/routers.ts 'locked: true as const, read: null, month: null,' 'read: null, month: null,' \
  server/billing-gate.test.ts "a premium read stops saying it is locked"
run server/narrative/router.ts 'if (!(await canYearSight(ctx.user)))' 'if (false)' \
  server/billing-gate.test.ts "the year read stops enforcing year-sight server-side"
# The Road Ahead veil leaking premium detail (dates + the milestone list) to a free user.
run server/routers/arc.ts 'apex: arc.apex ? { daysAway: arc.apex.daysAway, crown: arc.apex.crown } : null,' 'apex: arc.apex ? { daysAway: arc.apex.daysAway, crown: arc.apex.crown } : null, milestones: arc.milestones,' \
  server/routers/arc-veil.test.ts "the Road Ahead veil leaks the milestone list to free users again"

run server/routers/profiles.ts 'const owned = await getProfileById(profileId, userId);' 'const owned = await getProfileById(profileId, userId as any) ?? { id: profileId };' \
  server/isolation.test.ts "assertOwnsProfile stops failing closed"
run server/routers.ts 'eqW(profilesTable.userId, ctx.user.id)' 'eqW(profilesTable.userId, ctx.user.id ?? 0)' \
  server/isolation.test.ts "the combined read loses its owner scoping"
run server/narrative/router.ts 'await assertOwnsProfile(ctx.user.id, input.profileId);\n    // Year-sight is premium' '// Year-sight is premium' \
  server/isolation.test.ts "a profileId endpoint drops assertOwnsProfile"

run server/db.ts 'const SESSION_SLIDE_AFTER_MS =' 'const SESSION_SLIDE_AFTER_MS_UNUSED =' \
  server/session-slide.test.ts "session sliding renewal"

# The v890 doctrine. Two arms, because David's correction was two rules: the WORD is banned, and
# no facet may become a stock default in its place. Re-anchored from the pre-v890 text, which the
# harness correctly flagged as stale rather than passing on a phrase that no longer existed.
run server/narrative/prompts.ts 'BANNED OUTRIGHT: "self-worth"' 'DISCOURAGED: "self-worth"' \
  server/narrative/prompt-structure.test.ts "2nd-house self-worth ban removed from the prompt"
run server/narrative/prompts.ts 'SELF-LOVE IS ONE POSSIBLE EXPRESSION, NEVER THE DEFAULT' 'SELF-LOVE IS THE SECOND FACE' \
  server/narrative/prompt-structure.test.ts "self-love silently becomes the default again (the v889 mistake)"

run server/narrative/generate.ts "      maxTokens: 1150, maxWords: 280," "      maxTokens: 1150, maxWords: 150," \
  server/narrative/paid-word-floor.test.ts "a paid surface drops below the free day read"

echo "=== the prompt: laws that must ARRIVE, not merely exist ==="
run server/narrative/prompts.ts '\nPERSONAL APEX — THE CROWN DAY\n' '\nPERSONAL APEXX — THE CROWN DAY\n' \
  server/narrative/prompt-structure.test.ts "crown doctrine orphaned (v805's exact bug)"
run server/narrative/prompts.ts '\nWHEN THE SUN DID NOT RISE\n' '\nWHEN THE SUN DID NOT RISEX\n' \
  server/narrative/prompt-structure.test.ts "polar law orphaned"
run server/narrative/prompts.ts 'const PROMPT_VERSION' 'const PROMPT_VERSION_X' \
  server/narrative/prompt-structure.test.ts "PROMPT_VERSION deleted (cache key)"
run server/push.ts 'if (isCrownDay) return pickLine(POOL.crown' 'if (false && isCrownDay) return pickLine(POOL.crown' \
  server/bell-ladder.test.ts "bell's crown rung stops being read"

# THE HOUSE-POSTURE CLAMP (v908) — the day's tilt picks a house's leading facet, so a restraint day
# stops reading as "collect what's owed" / "build with your hands". Three arms: the heading defined,
# the restraint→tending default, and the coherence guard that stops it dumping every facet.
run server/narrative/prompts.ts "\nTHE DAY'S TILT PICKS THE POSTURE (never collapse a house into its busiest verb)\n" "\nTHE DAY'S TILT PICKS THE POSTURE (never collapse a house into its busiest verb)X\n" \
  server/narrative/prompt-structure.test.ts "the house-posture clamp heading is orphaned"
run server/narrative/prompts.ts "lead with the house's TENDING facet" "lead with the house's ACTIVE facet" \
  server/narrative/prompt-structure.test.ts "the restraint day stops leading with the tending facet"
run server/narrative/prompts.ts "that is the compiler's dump" "list them all" \
  server/narrative/prompt-structure.test.ts "the anti-dump coherence guard drops out of the clamp"

# A NAKSHATRA IS A QUALITY, NOT THE PERSON'S TRADE (v910/v911) — Chitra the craftsman-star kept
# reading as "your hands / the craft" on non-makers. Two arms: the heading defined, and the explicit
# word-ban that is the actual leak-stopper.
run server/narrative/prompts.ts "\nA NAKSHATRA IS A QUALITY, NEVER THE PERSON'S TRADE\n" "\nA NAKSHATRA IS A QUALITY, NEVER THE PERSON'S TRADEX\n" \
  server/narrative/prompt-structure.test.ts "the nakshatra-quality rule is orphaned"
run server/narrative/prompts.ts 'Do NOT use the words "craft,"' 'Feel free to use the words "craft,"' \
  server/narrative/prompt-structure.test.ts "the craft-word ban drops out, so a non-maker reads as a maker"
run server/narrative/prompts.ts "that is the day's COLLECTIVE menu, not this person's work" "that is this person's work" \
  server/narrative/prompt-structure.test.ts "the supports-abstraction rule drops out (the Chitra data-side leak)"

# THE VOCATION FIELD (2026-07-21) — the person's own word is the only honest source of a trade; it
# lifts the craft-ban. Three arms: the payload emission, the ban-lift license, and the ADMIN GATE
# (v884 shape — the field could be perfectly wired and still let any client set it).
run server/narrative/input-builder.ts "...(vocation ? { vocation } : {})" "" \
  server/narrative/payload-contract.test.ts "the vocation stops reaching the payload"
run server/narrative/prompts.ts "THE BAN LIFTS WHEN THE WORK IS KNOWN" "THE BAN LIFTS WHEN THE WORK IS KNOWNX" \
  server/narrative/payload-contract.test.ts "the ban-lift license is orphaned (a set vocation does nothing)"
run server/routers/profiles.ts 'if (ctx.user.role === "admin") {\n        // Stored as a comma list' 'if (true) {\n        // Stored as a comma list' \
  server/narrative/payload-contract.test.ts "the admin gate drops, so any client can set a profile's vocation"

# THE GO HEADLINE HONOURS THE NO-BEGINNINGS VETO (v911) — "BOLD MOVES … GO" printed over a
# Selective/finish-don't-start body on four straight profiles. Break the reroute and it comes back.
run server/vedic/day-filter.ts 'const headlineFamily: TithiFamily = beginningsBlocked && family === "jaya" ? "purna" : family;' 'const headlineFamily: TithiFamily = family;' \
  server/vedic/day-filter.test.ts "a Mercury-Rx / Vishti day shouts a GO headline again"

echo "=== the public site ==="
run client/public/sw.js '"/system", "/gate", "/receive"' '"/system", "/receive"' \
  server/marketing-sw-parity.test.ts "a marketing route missing from sw.js (cached as the app shell)"
run server/_core/index.ts '"/gate": "gate.html",' '"/gate": "gate.html", "/ghost": "ghost.html",' \
  server/marketing-sw-parity.test.ts "a new marketing route the service worker never hears about"
run client/public/marketing/system.html 'points="87.6,77.6 312.4,77.6 312.4,302.4 87.6,302.4"' 'points="108,98 292,98 292,282 108,282"' \
  server/marketing-figure.test.ts "the yantra square shrinks off the ring (the bug David caught)"
run client/public/marketing/system.html '<circle cx="200" cy="190" r="159"' '<circle cx="200" cy="190" r="140"' \
  server/marketing-figure.test.ts "the inner ring moves and the square stops being inscribed"

# Mercury's arc going back to handing the model beginnings (David caught this one live).
run server/vedic/day-filter.ts 'if (input.mercuryRx) {\n    vetoes.push' 'if (false) {\n    vetoes.push' \
  server/vedic/day-filter.test.ts "a retrograde day offers beginnings again"
# The beginnings being DELETED instead of turned into the audit ("this can be simplified to auditing").
# THIS PROBE SURVIVED ON ITS FIRST RUN and was right to: every case then in the test drew its
# beginning from the YOGA branch, so the base-supports line below had no coverage at all. A test
# with its own no-yoga fixture (Hasta, tithi 1, Monday) was added rather than the probe re-aimed.
run server/vedic/day-filter.ts 'audit = supports.filter((s) => MERCURY_RX_BLOCKS.has(ACT_CLASS[s] ?? "initiate"));' 'audit = [];' \
  server/vedic/day-filter.test.ts "a day's OWN withheld acts vanish instead of becoming the audit"
# ...and the same for the yoga's half, which is where David's two strings actually came from.
run server/vedic/day-filter.ts 'if (input.mercuryRx) audit = [...audit, ...extra.filter((x) => MERCURY_RX_BLOCKS.has(ACT_CLASS[x] ?? "initiate"))];' 'if (false) audit = [...audit];' \
  server/vedic/day-filter.test.ts "a yoga's withheld acts vanish instead of becoming the audit"
# "good work begun with intent" being re-classed as a launch, which David corrected in person.
run server/vedic/day-filter.ts '"good work begun with intent": "continue",' '"good work begun with intent": "initiate",' \
  server/vedic/day-filter.test.ts "deliberateness gets filtered out as an initiation again"
# The yoga cap going back to selecting by array position instead of by vantages.
run server/narrative/input-builder.ts '      (b.frames?.length ?? 0) - (a.frames?.length ?? 0) ||' '      0 * ((b.frames?.length ?? 0) - (a.frames?.length ?? 0)) ||' \
  server/narrative/standing-yogas.test.ts "the yoga cap selects by array position again"
# The contact object collapsing back into one boolean — the thing that caused the conflict.
run server/vedic/contacts.ts 'const kind: ContactKind = sameSign && inOrb ? "same-party"' 'const kind: ContactKind = sameSign ? "same-party"' \
  server/vedic/contacts.test.ts "a wide same-sign pair is called a true conjunction again"
# THE WIRING ITSELF. contacts.ts had a passing test suite and a probe (above) while being imported
# by NOTHING — the prompt kept reading the bare 10° scan. Both probes below break the PATH, which
# is what no test in v884 could see.
run server/narrative/input-builder.ts 'const { byPlanet: contactsByPlanet, disagreements: contactDisagreements } =\n    natalContactPayload(lonAll, lagnaLonForDig);' 'const contactsByPlanet: any = {}, contactDisagreements: any[] = [];' \
  server/narrative/payload-contract.test.ts "the natal payload stops carrying contacts at all"
run server/narrative/input-builder.ts '      kind: c.kind,\n      sameSign: c.sameSign,\n      conventionsAgree: c.conventionsAgree,' '' \
  server/narrative/natal-contacts.test.ts "a contact collapses back to a bare name+orb the prompt cannot branch on"
run server/narrative/input-builder.ts 'const contacts = contactsOf(lonAll, lagnaLon, { orbDeg: 10 });' 'const contacts = contactsOf(lonAll, lagnaLon, { orbDeg: 10 }).filter((c) => c.conventionsAgree);' \
  server/narrative/natal-contacts.test.ts "the disagreeing pairs are dropped and only agreed ones reach the model"
run server/narrative/prompts.ts '- kind "through-the-wall"' '- kind "through-the-wallX"' \
  server/narrative/prompt-structure.test.ts "the prompt loses the through-the-wall branch and fuses everything again"
# DAVID'S 2026-07-21 RULING — "ship all six and count the exchange." Two probes, one per half.
run server/narrative/input-builder.ts ' || y?.type === "exchange")' ')' \
  server/narrative/standing-yogas.test.ts "an exchange stops reaching the model again (his parivartana)"
run server/narrative/input-builder.ts '  return limit == null ? ranked : ranked.slice(0, limit);' '  return ranked.slice(0, limit ?? 4);' \
  server/narrative/standing-yogas.test.ts "the cap of four comes back and silently drops gate-passing yogas"
# THE METER. A cost meter that is quietly wrong is worse than none — it gets believed and then
# priced against. The last probe breaks the WIRING rather than the arithmetic, which is the failure
# every other test here is blind to.
run server/narrative/generate.ts 'const CACHE_READ_MULT = 0.1, CACHE_WRITE_MULT = 1.25;' 'const CACHE_READ_MULT = 1.0, CACHE_WRITE_MULT = 1.25;' \
  server/narrative/meter.test.ts "cache reads get billed as full-price input (cost overstated)"
run server/narrative/generate.ts '  const p = PRICE_PER_MTOK[model];' '  const p = PRICE_PER_MTOK[model] ?? { in: 3, out: 15 };' \
  server/narrative/meter.test.ts "an unpriced model gets a guessed price instead of null"
run server/narrative/generate.ts 'cacheHitRate: cacheRead + cacheWrite > 0 ? +(cacheRead / (cacheRead + cacheWrite)).toFixed(3) : null,' 'cacheHitRate: +(cacheRead / (cacheRead + cacheWrite || 1)).toFixed(3),' \
  server/narrative/meter.test.ts "no cacheable traffic reports a 0% hit rate instead of no answer"
run server/narrative/generate.ts '    try { recordUsage(msg); } catch (e) { console.warn("[meter] usage not recorded:", e); }' '' \
  server/narrative/meter.test.ts "the meter is defined but never wired to a real call (v884's exact shape)"
# The fate ban going quiet again — it was enforced NOWHERE until 2026-07-20.
run server/narrative/generate.ts 'const fate = fullText.match(FATE_DECREE);' 'const fate = null as any;' \
  server/narrative/guard.test.ts "a decree about this person can ship again"

# ── OWNERSHIP GATES THE CURRENT TIER (2026-07-21) ────────────────────────────────────────────
# The account's location slot is one per LOGIN. Before the gate it outranked every other
# profile's own ground, so David's six non-owner profiles were all cast from his city. Two arms
# must both be guarded: the gate firing, and the gate NOT over-firing for the account holder.
run server/panchang/resolve-day-sky.ts 'if (profile.isOwner) return true;' 'if (true) return true;' \
  server/panchang/resolve-day-sky.test.ts 'non-owner profile stops inheriting the account location'
run server/panchang/resolve-day-sky.ts 'if (profile.isOwner === undefined || profile.isOwner === null) return true;' '  if (false) return true;' \
  server/panchang/resolve-day-sky.test.ts 'ownership-unknown keeps the old behaviour (85 call sites)'
run server/panchang/resolve-day-sky.ts 'if (currentTierApplies(p) && u?.locationLat' 'if (u?.locationLat' \
  server/panchang/resolve-day-sky.test.ts 'the gate is actually consulted by the resolver'

# ── THE PROTAGONIST AND THE FACET REACH THE MODEL (2026-07-21) ───────────────────────────────
# Both close gaps David's Venus audit exposed, and both are the v884 shape: correct, tested, and
# reachable by nobody. These break the WIRING, not the helpers.
run server/narrative/input-builder.ts 'praty?.lord, pf.timeLord' 'praty?.lord' \
  server/narrative/payload-contract.test.ts "the annual Time Lord drops out of natalCondition again"
run server/narrative/input-builder.ts '...(facetsOf(g, pr.house).length ? { indicates: facetsOf(g, pr.house) } : {}),' '' \
  server/narrative/payload-contract.test.ts "the canon facet stops being emitted per lord"
run server/narrative/input-builder.ts 'for (const [re, who] of PERSON_WORDS) if (re.test(item)) return who;' '' \
  server/narrative/payload-contract.test.ts "facets lose their subject and go fuzzy again"

# ── THE HEADLINE IS PERSONAL (2026-07-21) ────────────────────────────────────────────────────
# David read the same date on three profiles and every one was ordered "BOLD MOVES LAND WELL
# TODAY — GO" — including a Caution day whose own sentence said keep everything small. The
# sentence had always been gated by tara; the headline was the one field that never saw the
# native. Break the gate and the contradiction must come back loudly.
run server/vedic/day-filter.ts 'const headline = contained' 'const headline = false' \
  server/vedic/day-filter.test.ts "a contained day shouts the collective GO headline again"
run server/vedic/day-filter.ts ': input.tara && input.tara.quality !== "good"' ': false' \
  server/vedic/day-filter.test.ts "hostile ground is handed the collective order again"

# ── THE VETO LANDS ONCE (2026-07-21) ─────────────────────────────────────────────────────────
# David read four pulls side by side: one dropped Vishti entirely, one stated the same order four
# times, one named the Sanskrit the prompt had always forbidden. All three were "written in the
# prompt, enforced nowhere".
run server/narrative/generate.ts 'if (vishti && countNoBeginnings(whole) === 0)' 'if (false && countNoBeginnings(whole) === 0)' \
  server/narrative/veto-budget.test.ts "a vishti day can silently drop the veto again"
run server/narrative/generate.ts 'if (inMiddle > 1)' 'if (inMiddle > 99)' \
  server/narrative/veto-budget.test.ts "the instruction can be repeated through the middle again"
# The SEAL exemption is David's own correction — fold closeLine back into the middle and the close
# is punished for echoing the verdict, which he explicitly ruled it should do.
run server/narrative/generate.ts 'const middle = [r.scene, r.story, r.tilt].join(" ");' 'const middle = [r.scene, r.story, r.tilt, r.closeLine].join(" ");' \
  server/narrative/veto-budget.test.ts "the closing seal gets punished as a repetition"
run server/narrative/generate.ts '|naidhana|vadha|' '|zznaidhana|zzvadha|' \
  server/narrative/veto-budget.test.ts "the rung names ship to the reader again"
# THE LAST MILE. The retry guard is not a guarantee — three refusals and the best draft ships — so
# the deterministic scrub is the only thing that cannot be talked out of it.
run server/narrative/generate.ts '[/\bnaidhana\b/gi, "the loss star"],' '' \
  server/narrative/veto-budget.test.ts "a rung name survives the scrub and reaches the reader"
run server/narrative/generate.ts 'for (const [re, rep] of SIGN_SCRUB) out = out.replace(re, rep);' '' \
  server/narrative/veto-budget.test.ts "sign names survive the scrub (David's Scorpio leak)"

# DAVID'S LAW, 2026-07-21 — hardcoded copy must be true to the data that selected it. Both halves
# get a probe: the words themselves, and the rung-gate that makes them true.
run server/vedic/day-filter.ts 'The loss star holds the day' 'Your own star holds the day' \
  server/vedic/day-filter.test.ts "the contained line names the birth star again"
run server/vedic/day-filter.ts 'input.tara.quality === "bad" && input.tara.taraNum === 7' 'input.tara.quality !== "good"' \
  server/vedic/day-filter.test.ts "the birth star can reach the contained branch again"

# THE SIBLING (v903). v901 probed the contained line and I called the class closed; the carried
# line twenty lines down had no guard at all. Three probes: the words, the single-sourcing that
# keeps them true, and the headline gate that was making an unchecked claim beside them.
run server/vedic/day-filter.ts '${carriedByRung(input.tara.taraNum)} a win' 'Your star is carried today: a win' \
  server/vedic/day-filter.test.ts "the carried line goes anonymous again (names no rung)"
run server/vedic/day-filter.ts 'const label = PLAIN_TARA[taraNum]?.label;' 'const label = PLAIN_TARA[1]?.label;' \
  server/vedic/day-filter.test.ts "every good rung prints the birth star's name again"
run server/vedic/day-filter.ts '? (supports.length === 0 ? null : "THE DAY OFFERS IT' '? ("THE DAY OFFERS IT' \
  server/vedic/day-filter.test.ts "the headline claims an offer on a day that offers nothing again"

# WHEN A DATED SKY EVENT ACTUALLY IS (v905). Both halves of the original mistake get broken: the
# today case (an eclipse still to come, announced as over) and the past case (a station up to three
# days old, announced as "just now").
run server/sky/golden-moment.ts 'if (daysAway === 0) return "today";' 'if (daysAway === 0) return "just passed";' \
  server/sky/golden-moment.test.ts "an event happening today is announced as already over again"
run server/sky/golden-moment.ts 'return daysAway > 0 ? `in ${daysAway} days` : `${Math.abs(daysAway)} days ago`;' 'return `in ${Math.abs(daysAway)} days`;' \
  server/sky/golden-moment.test.ts "a past station is announced as upcoming again"

# SPECIFIC BEFORE GENERAL (v905). Put the spouse rule back in front and the canon's business facet
# is read as the reader's marriage again.
run server/narrative/input-builder.ts '        [/business partners/i, "business partners"],\n        [/spouse or partner' '        [/spouse or partner' \
  server/narrative/person-words-order.test.ts "the spouse rule swallows the business-partners facet again"

# THE DOOR GATE — it stands between a tap and a billed LLM call, so all three ways it could fail
# open or fail shut get broken on purpose: the rule, the fail-open posture, and the wiring.
run shared/ground-gate.ts 'return decision === "unasked";' 'return false;' \
  shared/ground-gate.test.ts "the gate stops withholding and every reading generates unasked"
# The dangerous direction: "unknown" means the column is not there yet. If it ever withholds, the
# app deploying ahead of its migration silently stops generating EVERY reading for EVERY profile.
run shared/ground-gate.ts 'return decision === "unasked";' 'return decision !== "confirmed";' \
  shared/ground-gate.test.ts "an unmigrated database withholds every reading (the outage shape)"
# BUILT BUT WIRED TO NOTHING (the v884 failure). The rule can be perfect and cost-free if nothing
# calls it — and no unit test can reach guardedGen, which holds the database.
run server/narrative/service.ts 'if (withholdGeneration(await groundDecision(profileId))) return null;' '' \
  shared/ground-gate.test.ts "the gate is lifted out of guardedGen and guards nothing"

# THE LOCATION TIERS TRAVEL WITH THE SUBJECT (v902). Drop either half back off AstrologySubject and
# the 11 subject-shaped resolveDaySky call sites go back to reading everyone from the account's city.
run server/astrology-subject.ts 'isOwner: !!p.isOwner,' '' \
  server/panchang/subject-location-tiers.test.ts "someone else's chart follows the account holder again"
run server/astrology-subject.ts 'hometownLat: p.hometownLat ?? null,' '' \
  server/panchang/subject-location-tiers.test.ts "the hometown tier vanishes from the subject again"
# The chip's copy is chosen by the tier; both halves of the ruling get broken on purpose.
run shared/location-label.ts 'return isOwner ? null : "follows you";' 'return "not set for them";' \
  shared/location-label.test.ts "the chip labels your own correct city as unset again"
run shared/location-label.ts 'if (source === "default") return "no location set";' '' \
  shared/location-label.test.ts "the app default passes as a real location again"
# Aligned #15 (v929): mode must be a SOFT rank — on-mode tasks lead, off-mode sink but stay.
run server/task-scorer.ts '.sort((a, b) => (b._mode - a._mode) || (b._cs - a._cs) || (b._base - a._base))' '.sort((a, b) => (b._cs - a._cs) || (b._base - a._base))' \
  server/task-scorer.test.ts "off-mode tasks stop sinking below on-mode (mode-primary sort lost)"
# Aligned #15 (v929): the low-drive gate must be whole-check-in aware, not motivation alone.
run server/task-scorer.ts 'if (lowMotivationGateActive(state)) {' 'if (state.motivation <= 2) {' \
  server/task-scorer.test.ts "a capable native gets gated by low motivation again"

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
