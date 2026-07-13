/**
 * Dry-run the knot detector against Simone's chart (the acceptance case).
 * Deterministic, no API. Run: npx tsx server/scripts/knots-dryrun-simone.ts
 *
 * Simone: Taurus lagna. Sun Taurus/1, Moon Leo/4 (w/Ketu), Ketu Leo/4, Mars Aquarius/10,
 * Mercury Gemini/2, Jupiter Aries/12, Venus(Rx) Gemini/2, Saturn(Rx) Sagittarius/8, Rahu Aquarius/10.
 * Dasha Rahu–Moon. Age 38 → 3rd-house profection (Cancer) → Moon year-lord.
 * MC Aquarius / IC Leo → the nodal axis sits on the meridian.
 * Engaged 6/7/2026, in her fiancé's home country (South Korea).
 */
import { buildKnots, type NatalPlanet } from "../vedic/knots.js";

// Taurus lagna → house of each sign: Taurus1 Gemini2 Cancer3 Leo4 Virgo5 Libra6 Scorpio7 Sag8 Cap9 Aqu10 Pisces11 Aries12
const natal: Record<string, NatalPlanet> = {
  Sun:     { house: 1,  sign: "Taurus",      rulesHouses: [4] },          // rules Leo(4)
  Moon:    { house: 4,  sign: "Leo",         rulesHouses: [3] },          // rules Cancer(3)
  Mars:    { house: 10, sign: "Aquarius",    rulesHouses: [7, 12] },      // rules Scorpio(7), Aries(12)
  Mercury: { house: 2,  sign: "Gemini",      rulesHouses: [2, 5] },       // rules Gemini(2), Virgo(5)
  Jupiter: { house: 12, sign: "Aries",       rulesHouses: [8, 11] },      // rules Sag(8), Pisces(11)
  Venus:   { house: 2,  sign: "Gemini",      rulesHouses: [1, 6] },       // rules Taurus(1), Libra(6)
  Saturn:  { house: 8,  sign: "Sagittarius", rulesHouses: [9, 10] },      // rules Cap(9), Aquarius(10)
  Rahu:    { house: 10, sign: "Aquarius",    rulesHouses: [] },
  Ketu:    { house: 4,  sign: "Leo",         rulesHouses: [] },
};

// Two runs: (a) no transits (year+dasha structure only), (b) a plausible June marriage transit
// (Jupiter — the natural benefic of union — contacting the 7th lord Mars / moving through the 7th).
const base = {
  natal,
  dashaLords: { maha: "Rahu", antar: "Moon", praty: null },
  timeLord: "Moon",
  meridianOnAxis: ["Rahu", "Mars", "Moon", "Ketu"], // Aquarius(MC) + Leo(IC) occupants
  partnerGender: null as null,
};

function show(title: string, res: ReturnType<typeof buildKnots>) {
  console.log(`\n\n════════ ${title} ════════`);
  console.log("LIT (ranked):");
  for (const k of res.lit) {
    console.log(`  ● ${k.theme.toUpperCase()} — ${k.label}  [${k.tier}, ${k.convergence} converging lord(s)]${k.folds?.length ? `  folds← ${k.folds.join(", ")}` : ""}`);
    for (const s of k.signals) console.log(`      · (${s.kind}) ${s.text}`);
    if (k.comboProse) console.log(`      ⟢ canon ${k.comboProse.key}: ${(k.comboProse.positive ?? "").slice(0, 110)}…`);
  }
  console.log("DARK (not lit):", res.all.filter((k) => !k.lit).map((k) => `${k.theme}(${k.convergence}${k.tier === "event" ? "e" : ""})`).join(", "));
}

show("A — structure only (no transit)", buildKnots(base));
show("B — with a June union transit (Jupiter → 7th/Mars)", buildKnots({
  ...base,
  transitsHitting: [
    { planet: "Jupiter", hitsNatalPoint: "Mars", houseFromLagna: 10, slow: true },
    { planet: "Jupiter", hitsNatalPoint: null, houseFromLagna: 7, slow: true },
  ],
}));
