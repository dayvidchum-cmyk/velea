// Regenerate the app icons: the Velea emblem (gold circle + comet) composited
// over a pared-down starry-indigo field. Outputs velea-icon-{512,192,180,32}.png.
// Run with sharp temporarily installed.
import sharp from "sharp";

const SIZE = 512;

// Sparse star field over a deep-indigo radial gradient (no gold ring — the
// emblem supplies the gold).
const stars = [
  [40, 60, 1.1, 0.6], [88, 140, 0.8, 0.45], [150, 40, 1.3, 0.7], [300, 55, 1.0, 0.55],
  [420, 70, 0.8, 0.45], [470, 150, 1.1, 0.6], [60, 230, 0.9, 0.5], [40, 380, 0.8, 0.4],
  [100, 440, 1.0, 0.55], [200, 470, 1.2, 0.65], [360, 460, 1.0, 0.55], [470, 300, 1.1, 0.6],
  [470, 410, 0.9, 0.45], [30, 300, 0.8, 0.4], [250, 30, 0.7, 0.4], [410, 470, 0.8, 0.45],
];
const starEls = stars
  .map(([x, y, r, o]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#dfe7ff" opacity="${o}"/>`)
  .join("");

const bgSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}">
  <defs>
    <radialGradient id="bg" cx="42%" cy="38%" r="85%">
      <stop offset="0%" stop-color="#1b1c3a"/>
      <stop offset="60%" stop-color="#111128"/>
      <stop offset="100%" stop-color="#08080f"/>
    </radialGradient>
  </defs>
  <rect width="${SIZE}" height="${SIZE}" fill="url(#bg)"/>
  ${starEls}
</svg>`;

const bg = await sharp(Buffer.from(bgSvg)).png().toBuffer();

// The THICK mark (velea-mark.svg — the one used in-app; David prefers it over the
// thin first emblem) at ~88% so the circle stays in the safe zone; the comet
// streaks toward the top-right corner (slightly trimmed by OS rounding, reads fine).
const emblemBox = Math.round(SIZE * 0.88);
const emblem = await sharp("client/public/velea-mark.svg", { density: 300 })
  .resize(emblemBox, emblemBox, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .toBuffer();

const master = await sharp(bg)
  .composite([{ input: emblem, gravity: "center" }])
  .png()
  .toBuffer();

for (const s of [512, 192, 180, 32]) {
  await sharp(master).resize(s, s).png().toFile(`client/public/velea-icon-${s}.png`);
  console.log("wrote velea-icon-" + s + ".png");
}
