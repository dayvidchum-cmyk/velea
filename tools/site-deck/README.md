# site-deck — velealor.com as reviewable landscape pages

Builds a single self-contained HTML file that renders **every public marketing route** as
1440×810 landscape screens, with a notes box under each, for David to review and annotate.

It is **not a redrawing**. Each screen is the live page itself running in an iframe at a real
desktop viewport, scrolled one screen at a time. Fidelity is by construction: if the marketing
files change, the deck changes.

## Build

```bash
python3 tools/site-deck/build-deck.py      # writes velealor-deck.html to the scratchpad path in the script
```

Then publish the output as an Artifact. **Redeploy to the same URL** so David's typed notes and
his link survive: https://claude.ai/code/artifact/3bbc87d2-a096-4848-b2df-0995b64c2ad1

## What it covers

`/` (landing.html) · `/velea` · `/why` · `/system` · `/access` · `/confirmed`
`/receive` is deliberately skipped — it is a redirect stub that forwards to `/system`.

## The four things that are easy to get wrong

1. **Shared assets, inlined once.** The marketing pages reference `/marketing/...` by absolute
   path, which resolves only on the domain. The builder collects every referenced asset, base64s
   each **once**, and the runtime hands all pages blob URLs for them. Inlining per page instead
   would add megabytes for nothing.
2. **ASCII-proofing.** The page sources are read back as text and re-served through a Blob, so they
   must survive whatever charset the host declares. Markup non-ASCII becomes numeric entities;
   inside `<style>` blocks entities do NOT decode, so those get ASCII equivalents (verified: every
   non-ASCII char inside the marketing `<style>` blocks is in a comment). Without this, Khmer
   renders as mojibake.
3. **Mobile art variants are dropped from landing.html.** They are referenced only inside
   `@media (max-width: 700px)`; the deck always renders at 1440, so they can never apply. Saves
   ~1.3MB with zero visual difference. Re-verify that media query before changing this.
4. **Scale the shot when it is created, not on a later pass.** Frames are lazy-loaded as you
   scroll, long after the last layout pass — a shot that waits for one renders at full 1440 inside
   a ~1050px box and clips the nav. See `scaleShot` in deck-logic.js.

## Deliberate differences from the live site (stated in the deck's own footer)

- viewport pinned at 1440×810, so anything sized to window height is 810px here
- scroll-reveal animations frozen at their finished state, so nothing is caught mid-fade
- page scripts stripped, so the waitlist forms are inert

## Verify before shipping

Render it and look — do not ship a visual you have not seen (that is a standing law here).
Serve over http (NOT file://, where blob iframes get an opaque origin and the deck cannot measure
itself) and screenshot with playwright from the repo root:

```bash
cd <scratchpad> && python3 -m http.server 8791 &
cd ~/projects/Velea && node ./_shot.mjs    # playwright lives in this repo's node_modules
```
