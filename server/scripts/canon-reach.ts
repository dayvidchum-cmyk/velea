/**
 * WHICH CANON REACHES THE READER, AND WHICH SITS UNREAD.
 *
 * David, 2026-07-21: "run that canon sweep."
 *
 * THREE TIMES IN ONE DAY the same defect appeared — canon already transcribed, already correct,
 * already in the repo, and wired to the wrong surface or to nothing:
 *   1. convergence.ts already WAS Appendix IV Step 15; I nearly built a second one beside it.
 *   2. the annual Time Lord had no natal condition — the research existed, the payload never
 *      asked for that planet.
 *   3. canon/planet-in-house.json (Vol II Appendix III, 12x7) reached the HOUSE READ only and
 *      never the day read, so the day read had no chart-specific facet and the prompt carried
 *      four hardcoded examples instead.
 *
 * Each was small once found. That is the argument for measuring the CLASS rather than fixing
 * instances: a transcribed book that no surface consumes is invisible work, and the standing law
 * is build from canon, not inference.
 *
 * WHAT THIS MEASURES: for every data file in server/vedic/canon/, who imports it directly, and
 * whether it is REACHABLE from each narrative entry point by following static imports.
 *
 * WHAT IT DOES NOT MEASURE, stated so the output is not read as more than it is:
 *   - reachable != actually sent. A module may import canon and use it on one branch only.
 *   - dynamic `await import()` inside a function IS followed (the repo uses it heavily), but a
 *     path built from a variable cannot be resolved and is missed.
 *   - the .md files are doctrine for humans and the prompt, not data — listed separately.
 * So "reached" is an UPPER bound and "unreached" is the finding that matters.
 *
 * Run: npx tsx server/scripts/canon-reach.ts
 */
import { readFileSync, readdirSync, existsSync } from "fs";
import { join, dirname, resolve } from "path";

const ROOT = join(import.meta.dirname, "..", "..");
const CANON_DIR = join(ROOT, "server", "vedic", "canon");

/** The surfaces a reader actually meets, and the module each is built in. */
const ENTRY_POINTS: { label: string; file: string }[] = [
  { label: "DAY READ (+ most surfaces)", file: "server/narrative/input-builder.ts" },
  { label: "house/atlas/service reads", file: "server/narrative/service.ts" },
  { label: "the prompts themselves", file: "server/narrative/prompts.ts" },
  { label: "day filter (muhurta)", file: "server/vedic/day-filter.ts" },
  { label: "natal research store", file: "server/vedic/house-research.ts" },
  { label: "knots / convergence", file: "server/vedic/convergence.ts" },
  { label: "crown / panchang", file: "server/panchang/crown.ts" },
];

const SRC_EXT = [".ts", ".tsx", ".json"];

function resolveImport(fromFile: string, spec: string): string | null {
  if (!spec.startsWith(".")) return null;                       // package import
  const base = resolve(dirname(fromFile), spec);
  const candidates = [
    base,
    base.replace(/\.js$/, ".ts"),                                // NodeNext ".js" -> source ".ts"
    base.replace(/\.js$/, ".tsx"),
    ...SRC_EXT.map((e) => base + e),
    ...SRC_EXT.map((e) => join(base, "index" + e)),
  ];
  for (const c of candidates) if (existsSync(c) && !c.endsWith("/")) return c;
  return null;
}

const IMPORT_RE = /(?:from\s+|import\s*\(\s*)["']([^"']+)["']/g;

const importsCache = new Map<string, string[]>();
function importsOf(file: string): string[] {
  const hit = importsCache.get(file);
  if (hit) return hit;
  let out: string[] = [];
  try {
    const src = readFileSync(file, "utf8");
    const specs = [...src.matchAll(IMPORT_RE)].map((m) => m[1]);
    out = specs.map((s) => resolveImport(file, s)).filter((x): x is string => !!x);
  } catch { /* unreadable — treat as no imports */ }
  importsCache.set(file, out);
  return out;
}

/** Everything reachable from an entry point by following static + dynamic imports. */
function reachableFrom(entry: string): Set<string> {
  const seen = new Set<string>();
  const stack = [entry];
  while (stack.length) {
    const f = stack.pop()!;
    if (seen.has(f)) continue;
    seen.add(f);
    if (f.endsWith(".json")) continue;                            // data is a leaf
    for (const dep of importsOf(f)) if (!seen.has(dep)) stack.push(dep);
  }
  return seen;
}

/** Every source file in the repo, for the direct-importer scan. */
function allSources(dir: string, acc: string[] = []): string[] {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.name === "node_modules" || e.name === "dist" || e.name.startsWith(".")) continue;
    const p = join(dir, e.name);
    if (e.isDirectory()) allSources(p, acc);
    else if (/\.(ts|tsx)$/.test(e.name)) acc.push(p);
  }
  return acc;
}

function main() {
  const canonFiles = readdirSync(CANON_DIR).sort();
  const dataFiles = canonFiles.filter((f) => f.endsWith(".json"));
  const docFiles = canonFiles.filter((f) => f.endsWith(".md"));

  const sources = allSources(join(ROOT, "server")).concat(allSources(join(ROOT, "shared")).filter(existsSync as any));
  const reach = new Map<string, Set<string>>();
  for (const ep of ENTRY_POINTS) {
    const abs = join(ROOT, ep.file);
    reach.set(ep.label, existsSync(abs) ? reachableFrom(abs) : new Set<string>());
  }

  // Direct importers, excluding tests and the sweep itself.
  const importersOf = (canonAbs: string) =>
    sources.filter((s) => !/\.test\.tsx?$/.test(s) && !s.endsWith("canon-reach.ts") && importsOf(s).includes(canonAbs))
           .map((s) => s.slice(ROOT.length + 1));

  console.log(`\n  ${dataFiles.length} canon DATA files, ${docFiles.length} doctrine docs\n`);
  console.log(`  file                          importers  reaches`);
  console.log(`  ${"-".repeat(74)}`);

  const unread: string[] = [];
  const oneSurface: string[] = [];
  for (const f of dataFiles) {
    const abs = join(CANON_DIR, f);
    const imps = importersOf(abs);
    const hits = ENTRY_POINTS.filter((ep) => reach.get(ep.label)!.has(abs)).map((ep) => ep.label);
    const tag = imps.length === 0 ? "UNREAD BY ANY CODE" : hits.length === 0 ? "imported, reaches no surface" : hits.join(" · ");
    console.log(`  ${f.padEnd(30)} ${String(imps.length).padStart(6)}     ${tag}`);
    for (const i of imps) console.log(`  ${" ".repeat(30)}            <- ${i}`);
    if (imps.length === 0) unread.push(f);
    else if (imps.length === 1) oneSurface.push(f);
  }

  console.log(`\n  DOES IT REACH THE DAY READ?  (the surface every reader meets daily)`);
  const dayRead = reach.get("DAY READ (+ most surfaces)")!;
  for (const f of dataFiles) {
    const abs = join(CANON_DIR, f);
    console.log(`    ${dayRead.has(abs) ? "yes" : "NO "}   ${f}`);
  }

  console.log(`\n  FINDINGS`);
  console.log(`    imported by NOTHING at all : ${unread.length ? unread.join(", ") : "none"}`);
  console.log(`    imported by exactly ONE    : ${oneSurface.length ? oneSurface.join(", ") : "none"}`);

  // ── CONTROLS. A zero from an uncontrolled instrument is not evidence (CLAUDE.md).
  console.log(`\n  CONTROLS`);
  const pih = join(CANON_DIR, "planet-in-house.json");
  const pihImps = importersOf(pih);
  console.log(`    planet-in-house.json has >=2 importers (wired to day read TODAY) : ${pihImps.length}  ${pihImps.length >= 2 ? "OK" : "FAIL - the resolver is blind"}`);
  console.log(`    the graph is non-trivial (day read reaches many files)          : ${dayRead.size}  ${dayRead.size > 30 ? "OK" : "FAIL - import walk broke"}`);
  const anyReached = dataFiles.some((f) => dayRead.has(join(CANON_DIR, f)));
  console.log(`    at least one canon file IS reached by the day read              : ${anyReached ? "OK" : "FAIL - suspect the matcher, not the code"}`);
  console.log();
  console.log(`  DOCTRINE DOCS (read by humans and quoted into prompts, not imported):`);
  console.log(`    ${docFiles.join(", ")}`);
  console.log();
}

main();
