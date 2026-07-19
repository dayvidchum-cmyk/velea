import { anchorsFromBodies, personalRatingForDate } from "../panchang/crown.js";
import { resolveDaySky } from "../panchang/resolve-day-sky.js";
import { gateDayField } from "../panchang/service.js";
import { interpretPanchang } from "../panchang/interpreter.js";
import { calcPanchang } from "../panchang/astronomy.js";
const anchors = anchorsFromBodies([{ planet: "Moon", nakshatra: "Jyeshtha", sign: "Scorpio" }], "Virgo")!;
(async () => {
  for (const date of ["2026-07-13", "2026-07-09", "2026-07-20"]) {
    const sky = await resolveDaySky({ dateStr: date });
    const rating = await personalRatingForDate(anchors, date, sky);
    const raw = interpretPanchang(await calcPanchang(date, sky.lat, sky.lon, sky.utcOffset), "Virgo");
    const field = gateDayField(raw, rating);
    console.log(`${date}: rating=${rating} → ${raw.finalMode} ⇒ ${field.finalMode} ("${field.qualifier}")${field.weatherGated ? " ← GATED: " + field.weatherGateReason : ""}`);
  }
})();
