/**
 * useVisualViewport
 *
 * Tracks the Visual Viewport API so fixed elements stay anchored to the
 * true visible bottom on iOS Safari when the browser toolbar shows/hides.
 *
 * IMPORTANT: Only listens to `resize`, NOT `scroll`.
 * The `scroll` event fires during iOS rubber-band/bounce scrolling and
 * causes the nav to jump — we only care about toolbar resize events.
 *
 * Returns the CSS `bottom` value to apply to a fixed bottom element.
 */

import { useState, useEffect } from "react";

export function useVisualViewport(): string {
  const [bottom, setBottom] = useState("0px");

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;

    function update() {
      const layoutHeight = document.documentElement.clientHeight;
      // Only account for the toolbar offset, not scroll position
      const visualBottom = layoutHeight - vv!.height;
      setBottom(`${Math.max(0, visualBottom)}px`);
    }

    update();
    vv.addEventListener("resize", update);

    return () => {
      vv.removeEventListener("resize", update);
    };
  }, []);

  return bottom;
}
