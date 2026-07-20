# How to work in this repo

David should never have to ask for this. It is the standing method, not a mode.

## The order of priorities, always

1. **Accuracy of the data handed to the LLM.** The engine locates; the model only voices. A wrong
   number in the payload is worse than any UI defect.
2. **Where money could bleed** — ungated billing endpoints, cache keys that miss, spend caps.
3. **Colours, margins, pixels.**

A cosmetic fix never outranks a data fix. When triaging, say which tier the item is in.

## RULE ZERO — never state a value you have not printed

**Do not type an astrological fact, a code string, a number, a file path, or an example from memory.
Run it and paste what came out.** This is the single highest-frequency way this project wastes
David's time, and it costs about two minutes to avoid.

It applies to messages, commit notes, comments, docs and tests — **the audit sheet and working brief
included.** A wrong example in a message is not "just a message": David reads it, believes it,
and corrects it, which is his time spent on my laziness.

Receipts, all from one day:
- Told him "there is no cited source in this repo" for the muhurta siddhi tables. They were in a book
  the repo already cites, in his own folder. I had never opened it.
- Wrote a test fixture described as "one condition" that actually fired **four** — asserted, never run.
- Illustrated a reason string as `Venus (exalts in Libra)`. **Saturn** exalts in Libra; Venus rules
  it. Conflated ruler with exaltation while explaining the function that distinguishes them.
- Claimed a migration script "the shift alert is built" when it was not. He ran it on production
  trusting that line.

**Before writing any specific claim, ask: did I run this, or do I remember it?** If remembered,
either run it or don't write it. "I believe" and "should be" are signals to go check, not hedges to
publish.

Corollary — **the engine is more likely right than your description of it.** When a check disagrees
with working code, suspect the check first. Four separate instruments were wrong before the thing
they measured was.

## Never take a green as truth

A passing test proves nothing until you have broken the thing it guards and watched it fail.

- `npm run probe` — the mutation harness. It breaks each source on purpose and asserts the test
  notices. **Every new guard gets a probe in the same commit.**
- Probes need a clean tree; commit first, then probe. **If David has uncommitted work in the tree,
  do NOT stash it** — clone to a temp dir at HEAD, symlink `node_modules`, and run the harness
  there. His in-progress files are never worth the risk, and "I couldn't run it" is not an
  acceptable substitute when a zero-risk way exists:
  `git clone --no-hardlinks --depth 1 file://$PWD /tmp/x && cd /tmp/x && ln -s <repo>/node_modules . && npm run probe`
- **Never `git add -A`.** Stage the specific files you changed. David works in this repo at the same
  time, and `add -A` once swept two untracked images from his in-progress marketing page into a
  commit of mine. Check `git status` before every commit and commit only your own paths.
- `npm run build` — gate on the **exit code**, never on `build | grep error` (grep exits 0 on a
  failed build).
- `npx vitest run` — the whole suite, not just the file you touched. A test that passes alone and
  fails in the suite is a real interaction, not a flake.

**Known false-green traps, all of which have actually happened here:**
- A probe insert whose anchor didn't match, while the harness still printed "all probes caught" from
  the old set. Check the probe COUNT changed.
- A test asserting `not.toBe` against an export that had been deleted.
- A regex loose enough to match a different line than intended — it then passes for the wrong
  reason. Anchor on text that cannot appear in the case you're excluding.
- A scanner reporting zero hits from a PDF with no English text layer. **Zero from an uncontrolled
  instrument is not evidence.**

## Run the control before the conclusion

Every measurement gets a control in both directions: the thing you expect to fire must fire, and a
synthetic case that should NOT fire must not. Most wrong findings in this repo were a broken
instrument, not a broken engine — including nine invented "money leaks" that were a bad matcher.

**Measure, don't read the diff.** The two worst shipped bugs found recently (the Moon kendra
tautology) were invisible in review and obvious the moment a rate was computed.

## Question your own work, and any agent's

- Before reporting a finding, try to refute it. Retract in writing when wrong, in the same place the
  claim was made.
- An unrun search is not evidence of absence. Before writing "there is no source for this," open the
  folder. `~/Library/Mobile Documents/com~apple~CloudDocs/DCPC/VEDIC APP/For Claude Code/` holds the
  textbooks; `server/vedic/canon/` holds what's been transcribed from them.
- Subagent output is a claim, not a result. Verify it yourself before it reaches David.

## Fix the class, not the instance

Name the root cause in one sentence, then fix the whole class. If the same wrong sentence exists in
three files, that is one bug with three copies.

## Never guess into a person's chart

When a source is ambiguous — a smudged scan, two rival glosses of one verse — **do not encode a
guess.** Transcribe it verbatim to `server/vedic/canon/`, flag exactly what is uncertain, and put
the choice to David in plain English. A wrong table looks authoritative forever.

Method questions (thresholds, which authority wins, what counts as "solid") are **David's rulings,
not research tasks.** Build what he has already specified; don't reopen a settled question as a
seminar. When he has written a condition down, that IS the ruling — build it.

### What to hand him, and what to just fix

**Flag it only when the fix needs his authority** — which tradition wins, what a number should be,
anything the engine cannot answer for him. Say it in one line, with a recommendation and the
numbers behind it.

**Fix it when the remedy takes no side.** A correctness defect with a neutral repair is not his
call, and handing it over is friction invented out of nothing.

The test: *does fixing this require choosing something only he can choose?* If no, fix it.
**"It's complicated" and "it has Sanskrit in it" are not the same as "it's his call."** He asked
"what is the advantage of doing this?" about exactly such a hand-off, and there was none — worse,
the thing I deferred was silently defeating a ruling he had just made.

Never hand him a decision as a way of avoiding work, and never hand him two when one will do.

## Don't say it's fixed until it is fixed

"Done" means: built, tested, probed, full suite green, build exit 0, committed, pushed, deployed.
Report failures with their output. If a step was skipped, say so.

Then update **both** documents — `tools/audit-sheet/` and `tools/working-brief/` — and republish
each to its existing artifact URL. A decision comes OFF the list the moment he rules on it; record
the verdict in one line so nothing leaves the queue by being forgotten.

## Other standing laws

- **No auto-migrations.** Schema changes are scripts David runs. A `push --force` once wiped every
  account.
- **Local `.env` is not production.** Never diagnose prod from it; prod config lives in Railway.
- **Look at every visual you ship.**
- Read `SYSTEM_MAP.md` before exploring, and update it in the same commit as any architecture change.
- Version: `client/src/lib/version.ts` **and** the `sw.js` cache line, bumped together.
