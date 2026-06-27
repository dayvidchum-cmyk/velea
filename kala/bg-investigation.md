# Background Investigation

## Today page (Home.tsx)
- Background is on a `.container` div — narrower width, so the image doesn't stretch as much
- The background only covers the top portion of the page (the container area)
- Below the container, it's pure black — the image doesn't extend to full viewport

## Planner page (Planner.tsx)
- Background is on a `min-h-screen w-full` div — full viewport width and height
- The image stretches to cover the entire viewport
- With `backgroundSize: cover`, the image scales up significantly on wide viewports
- This causes the zoomed-in/pixelated appearance

## Root cause
Both pages use identical CSS properties (cover, center, fixed). The difference is:
- Home.tsx: background on `.container` (max-width constrained) — image appears at natural scale
- Planner.tsx: background on full-width `min-h-screen w-full` div — image scales up to fill entire viewport

The image is 1456x816px. On a wide desktop viewport, `background-size: cover` scales it up significantly, causing pixelation.

## Fix options
1. Use `background-size: contain` + dark bg color to avoid upscaling (but leaves gaps)
2. Use `background-position: center top` to show the best part of the image
3. Both pages should use the same approach — apply background to a shared app-level wrapper
