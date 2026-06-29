// One-off: regenerate the app icons with a pared-down starry-night background
// (deep indigo field + a few stars + the gold orbit & dot). Run with sharp
// temporarily installed; outputs kala-icon-{512,192,180,32}.png to public.
import sharp from "sharp";

const SIZE = 512;
const GOLD = "#C9A84C";
const GOLD_DOT = "#E3C76C";

// A sparse, hand-placed star field — "pared down" vs. the full photo background.
const stars = [
  [40, 60, 1.1, 0.7], [88, 140, 0.8, 0.5], [150, 40, 1.4, 0.85], [210, 90, 0.7, 0.4],
  [300, 55, 1.0, 0.6], [360, 120, 1.3, 0.8], [420, 70, 0.8, 0.5], [470, 150, 1.1, 0.65],
  [60, 230, 0.9, 0.55], [130, 300, 1.2, 0.75], [40, 380, 0.8, 0.45], [100, 440, 1.0, 0.6],
  [200, 470, 1.3, 0.8], [280, 430, 0.7, 0.4], [360, 460, 1.1, 0.65], [440, 400, 0.9, 0.55],
  [470, 300, 1.2, 0.7], [420, 240, 0.7, 0.4], [330, 300, 0.8, 0.45], [180, 205, 0.6, 0.35],
  [250, 150, 0.7, 0.4], [300, 360, 0.9, 0.5], [150, 360, 0.8, 0.45], [400, 330, 0.7, 0.4],
  [70, 170, 0.7, 0.4], [235, 260, 0.6, 0.3], [285, 210, 0.6, 0.3], [190, 420, 0.8, 0.45],
];
const starEls = stars
  .map(([x, y, r, o]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#dfe7ff" opacity="${o}"/>`)
  .join("");

const cx = 256, cy = 256, R = 176;
const a = (55 * Math.PI) / 180; // dot sits upper-right on the ring, like the logo
const dotX = (cx + R * Math.sin(a)).toFixed(1);
const dotY = (cy - R * Math.cos(a)).toFixed(1);

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}">
  <defs>
    <radialGradient id="bg" cx="42%" cy="38%" r="85%">
      <stop offset="0%" stop-color="#1b1c3a"/>
      <stop offset="60%" stop-color="#111128"/>
      <stop offset="100%" stop-color="#08080f"/>
    </radialGradient>
  </defs>
  <rect width="${SIZE}" height="${SIZE}" fill="url(#bg)"/>
  ${starEls}
  <circle cx="${cx}" cy="${cy}" r="${R}" fill="none" stroke="${GOLD}" stroke-width="7" opacity="0.95"/>
  <circle cx="${dotX}" cy="${dotY}" r="14" fill="${GOLD_DOT}"/>
</svg>`;

for (const s of [512, 192, 180, 32]) {
  await sharp(Buffer.from(svg)).resize(s, s).png().toFile(`client/public/kala-icon-${s}.png`);
  console.log("wrote kala-icon-" + s + ".png");
}
