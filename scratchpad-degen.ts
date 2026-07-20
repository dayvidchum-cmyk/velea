import { neechaBhanga } from "./server/vedic/dignity.js";
// Mars debilitates in CANCER, whose lord is the MOON. Condition 1 asks "is the dispositor in a
// kendra?" — and inKendra checks kendra-from-Moon, where the Moon sits in the 1st from itself.
// If that is degenerate, Mars-in-Cancer cancels in EVERY chart ever cast, regardless of the Moon.
let allCancel = true; const samples: string[] = [];
let seed=99; const rnd=()=>(seed=(seed*1103515245+12345)%2147483648)/2147483648;
for (let t=0;t<3000;t++){
  const lonBy:any={ Sun:rnd()*360, Moon:rnd()*360, Mars:118, Mercury:rnd()*360,
                    Jupiter:rnd()*360, Venus:rnd()*360, Saturn:rnd()*360 };
  const nb = neechaBhanga("Mars" as any, lonBy, rnd()*360);
  const byDispositorOnly = nb.reasons.filter(r=>r.includes("dispositor Moon (lord of Cancer) in a kendra"));
  if (byDispositorOnly.length===0) { allCancel=false; samples.push(`Moon@${lonBy.Moon.toFixed(0)}`); }
}
console.log(`Mars debilitated in Cancer, 3000 random charts:`);
console.log(`  "dispositor Moon in a kendra" fired in EVERY chart: ${allCancel}`);
if(!allCancel) console.log(`  counterexamples: ${samples.slice(0,3).join(", ")}`);

// And the Moon itself, debilitated in Scorpio — does anything ever leave it uncancelled?
let moonAlways = true; const mSamples: string[]=[];
for (let t=0;t<3000;t++){
  const lonBy:any={ Sun:rnd()*360, Moon:218, Mars:rnd()*360, Mercury:rnd()*360,
                    Jupiter:rnd()*360, Venus:rnd()*360, Saturn:rnd()*360 };
  const nb = neechaBhanga("Moon" as any, lonBy, rnd()*360);
  if(!nb.reasons.some(r=>r.includes("Moon itself in a kendra"))) { moonAlways=false; mSamples.push("x"); }
}
console.log(`\nMoon debilitated in Scorpio, 3000 random charts:`);
console.log(`  "Moon itself in a kendra" fired in EVERY chart: ${moonAlways}`);
