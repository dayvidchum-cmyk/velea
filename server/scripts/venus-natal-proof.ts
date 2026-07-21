/**
 * PROOF THAT THE PROTAGONIST'S NATAL CONDITION SEPARATES TWO IDENTICAL CHAPTERS.
 *
 * David and Lisa: both 44, both Virgo lagna, both a 9th-house Taurus profection led by Venus.
 * venus-three.ts showed every narratable line identical. This prints the block that was missing.
 *
 * Computes the research DIRECTLY (computeNatalResearch) rather than through the research store,
 * because the local DB cannot write profile_research (schema drift: createdAt has no default).
 * The content is the same either way — this is the data natalCondition.lords now carries.
 *
 * Run: npx tsx server/scripts/venus-natal-proof.ts
 */
import { calculateBirthChart } from "../birthchart/calculator.js";
import { computeNatalResearch } from "../vedic/house-research.js";

const PEOPLE = [
  { n: "DAVID", d: "1982-04-13", t: "17:20", lat: 14.6781,   lon: 120.2660,  tz: "Asia/Manila" },
  { n: "LISA",  d: "1982-02-20", t: "20:39", lat: 40.706210, lon: -73.306230, tz: "America/New_York" },
  { n: "LANG",  d: "1989-11-18", t: "17:32", lat: 42.355508, lon: -71.056536, tz: "America/New_York" },
];

const LAJJ: Record<string, string> = {
  mudita: "delighted", kshudita: "starved", kshobhita: "agitated",
  trishita: "left thirsty", lajjita: "shamed", garvita: "proud",
};

async function main() {
  for (const p of PEOPLE) {
    const chart: any = await calculateBirthChart(p.d, p.t, p.lat, p.lon, p.tz, { lagnaBasis: "ascendant" });
    const lonBy: Record<string, number> = {};
    const speedBy: Record<string, number> = {};
    const declBy: Record<string, number> = {};
    for (const [nm, k] of Object.entries({ Sun: "sun", Moon: "moon", Mars: "mars", Mercury: "mercury", Jupiter: "jupiter", Venus: "venus", Saturn: "saturn", Rahu: "rahu", Ketu: "ketu" })) {
      lonBy[nm] = chart[k].longitude;
      // Shadbala needs speed (Chesta) and declination (Ayana). Omitting them the first time made
      // this script print "unmeasured" for every chart, which would have read as an engine gap
      // rather than a hole in the instrument. The real path passes both.
      if (chart[k].longitudeSpeed != null) speedBy[nm] = chart[k].longitudeSpeed;
      if (chart[k].declination != null) declBy[nm] = chart[k].declination;
    }
    const research = computeNatalResearch({
      lonBy, speedBy: speedBy as any, declBy: declBy as any,
      lagnaLon: chart.lagna.longitude,
      mcLon: chart.mc?.longitude ?? null,
      birthUtcMs: Date.parse(chart.utcBirthIso),
      latitude: p.lat, longitude: p.lon, basis: "ascendant",
    });

    const v: any = (research.planets as any).Venus;
    const states: string[] = [];
    if (v.avashtas?.jagradaadi === "jagrat") states.push("awake (full capacity)");
    else if (v.avashtas?.jagradaadi === "svapna") states.push("sleepy (half capacity)");
    else if (v.avashtas?.jagradaadi === "sushupti") states.push("asleep (needs its friends)");
    for (const h of v.avashtas?.lajjitaadi ?? []) states.push(`${LAJJ[h.state] ?? h.state}${h.by?.length ? ` by ${h.by.join(" and ")}` : ""}`);

    const ratio = v.shadbala?.ratio;
    const strength = ratio == null ? "unmeasured"
      : ratio >= 1.15 ? "strong — can deliver what it promises"
      : ratio <= 0.85 ? "thin — delivers with struggle" : "steady";
    const vim = v.vimshopak?.points?.shodasha ?? null;
    const expression = vim == null ? "—" : vim >= 12.5 ? "shows its better face" : vim <= 7.5 ? "tends to show its harder face" : "mixed expression";
    const rules = research.houses.filter((h) => h.lord.planet === "Venus").map((h) => h.house);

    console.log(`\n  ${p.n} — ${research.anchors.lagna.sign} lagna`);
    console.log(`     VENUS seat        ${v.sign}, house ${v.house}${v.retrograde ? ", retrograde" : ""}`);
    console.log(`     dignity           ${v.dignity?.state}${v.dignity?.neechaBhanga?.cancelled ? " (fall CANCELLED — hard-won)" : ""}`);
    console.log(`     strength          ${strength}  (ratio ${ratio ?? "—"})`);
    console.log(`     expression        ${expression}  (vimshopak ${vim ?? "—"})`);
    console.log(`     states            ${states.join(" · ") || "—"}`);
    console.log(`     rules houses      ${rules.join(", ") || "—"}`);
    console.log(`     conjunct          ${(v.conjunct ?? []).map((c: any) => c.planet).join(", ") || "—"}`);
  }
  console.log();
}
main().catch((e) => { console.error(e); process.exit(1); });
