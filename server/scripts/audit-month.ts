// FULL-MONTH AUDIT — day modes (gated), crown layer, golden days, and cross-layer tensions.
// Run: npx tsx server/scripts/audit-month.ts [YYYY-MM]
import { anchorsFromBodies, personalRatingForDate, crownDay } from "../panchang/crown.js";
import { gateDayField } from "../panchang/service.js";
import { interpretPanchang } from "../panchang/interpreter.js";
import { calcPanchang } from "../panchang/astronomy.js";
import { dayQuality } from "../panchang/auspiciousness.js";
import { calculateBirthChart } from "../birthchart/calculator.js";

const NAK = ["Ashwini","Bharani","Krittika","Rohini","Mrigashira","Ardra","Punarvasu","Pushya","Ashlesha","Magha","Purva Phalguni","Uttara Phalguni","Hasta","Chitra","Swati","Vishakha","Anuradha","Jyeshtha","Mula","Purva Ashadha","Uttara Ashadha","Shravana","Dhanishtha","Shatabhisha","Purva Bhadrapada","Uttara Bhadrapada","Revati"];
const anchors = anchorsFromBodies([{ planet: "Moon", nakshatra: "Jyeshtha", sign: "Scorpio" }], "Virgo")!;
const si = (l: number) => Math.floor((((l % 360) + 360) % 360) / 30);
const ym = process.argv[2] || "2026-07";
const [Y, M] = ym.split("-").map(Number);
const daysIn = new Date(Y, M, 0).getDate();

(async () => {
  const rows: any[] = [];
  for (let d = 1; d <= daysIn; d++) {
    const date = `${ym}-${String(d).padStart(2, "0")}`;
    const ch: any = await calculateBirthChart(date, "12:00", 0, 0, "UTC");
    const T: Record<string, number> = { Sun: si(ch.sun.longitude), Moon: si(ch.moon.longitude), Mars: si(ch.mars.longitude), Mercury: si(ch.mercury.longitude), Jupiter: si(ch.jupiter.longitude), Venus: si(ch.venus.longitude), Saturn: si(ch.saturn.longitude), Rahu: si(ch.rahu.longitude), Ketu: si(ch.ketu.longitude) };
    const cd = crownDay({ ...anchors, sunLon: ch.sun.longitude, moonLon: ch.moon.longitude, transitSignByPlanet: T });
    const golden = dayQuality(ch.sun.longitude, ch.moon.longitude).auspicious;
    const astro = await calcPanchang(date, 42.3601, -71.0589, -4);
    const raw = interpretPanchang(astro, "Virgo");
    const field = gateDayField(raw, cd.rating);
    rows.push({
      date: date.slice(8), dow: new Date(Y, M - 1, d).toLocaleDateString("en", { weekday: "short" }),
      mode: field.finalMode, base: raw.finalMode, gated: !!field.weatherGated, qualifier: field.qualifier,
      rating: cd.rating, score: cd.score, tara: `${cd.tarabala.name}${cd.tarabala.cycle > 1 ? "·c" + cd.tarabala.cycle : ""}`,
      taraQ: cd.tarabala.quality, chandra: cd.chandrabala.house, chandraQ: cd.chandrabala.quality,
      uni: cd.universal.score, transit: cd.transit?.score ?? 0, golden,
      afflict: cd.transit?.affliction?.length ?? 0, support: cd.transit?.support?.length ?? 0,
      dayNak: NAK[cd.universal.nakshatra], moonSign: raw.moonSign, house: raw.houseActivated, tithi: cd.universal.tithi,
      sunriseNak: astro.nakshatraAtSunrise, transitionTime: astro.nakshatraTransitionTime,
    });
  }
  for (const r of rows) {
    console.log([r.date, r.dow.padEnd(3), (r.gated ? "⛔" : "  "), r.mode.padEnd(9), `(${r.base})`.padEnd(11),
      r.rating.padEnd(9), `s${String(r.score).padStart(2)}`, r.tara.padEnd(14), `ch${String(r.chandra).padStart(2)}${r.chandraQ[0]}`,
      `u${String(r.uni).padStart(2)}`, `t${String(r.transit).padStart(2)}`, r.golden ? "GOLD" : "    ",
      `${r.moonSign}/H${r.house}`, r.dayNak, r.transitionTime ? `→${r.transitionTime}` : ""].join(" "));
  }
  // summaries
  const count = (f: (r: any) => boolean) => rows.filter(f).length;
  console.log("\n== SUMMARY ==");
  console.log("modes:", ["Action","Build","Selective","Restraint"].map(m => `${m}:${count(r => r.mode === m)}`).join(" "), `| gated:${count(r => r.gated)}`);
  console.log("ratings:", ["crown","favorable","neutral","caution"].map(m => `${m}:${count(r => r.rating === m)}`).join(" "));
  console.log("golden days:", rows.filter(r => r.golden).map(r => +r.date).join(", "));
  console.log("crown days:", rows.filter(r => r.rating === "crown").map(r => +r.date).join(", "));
  console.log("gated days:", rows.filter(r => r.gated).map(r => `${+r.date}(${r.base}→Restraint)`).join(", "));
  console.log("crown∧golden (fully aligned):", rows.filter(r => r.rating === "crown" && r.golden).map(r => +r.date).join(", ") || "none");
  console.log("golden but personally caution:", rows.filter(r => r.golden && r.rating === "caution").map(r => +r.date).join(", ") || "none");
  console.log("nakshatra transitions mid-day (noon-UTC approx risk):", rows.filter(r => r.transitionTime && r.sunriseNak !== r.dayNak).map(r => `${+r.date}(${r.sunriseNak}→${r.dayNak}@${r.transitionTime})`).join(", ") || "none");
})();
