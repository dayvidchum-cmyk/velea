import { calcPanchang } from "/Users/davidchum/projects/Velea/server/panchang/astronomy.js";
(async () => {
  const astro: any = await calcPanchang("2026-07-09", 42.3601, -71.0589, -4);
  console.log(JSON.stringify({
    moonSign: astro.moonSign, nakshatraAtSunrise: astro.nakshatraAtSunrise,
    transition: astro.nakshatraTransitionTime, after: astro.nakshatraAfterTransition,
    tithi: astro.tithi, paksha: astro.tithiPaksha, moonLon: astro.moonLongitude?.toFixed(1), sunLon: astro.sunLongitude?.toFixed(1),
  }, null, 1));
})();
