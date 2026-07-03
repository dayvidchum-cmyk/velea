import { useEffect, useState } from "react";

/**
 * TEMPORARY diagnostic — prints the REAL safe-area/viewport numbers off the device so we
 * can stop guessing why the footer band is oversized. Remove once the nav is fixed.
 */
export default function SafeAreaDebug() {
  const [info, setInfo] = useState("measuring…");

  useEffect(() => {
    const measure = (h: string) => {
      const p = document.createElement("div");
      p.style.cssText = `position:fixed;top:0;left:0;width:0;height:${h};visibility:hidden;pointer-events:none`;
      document.body.appendChild(p);
      const px = p.getBoundingClientRect().height;
      document.body.removeChild(p);
      return px.toFixed(0);
    };
    const read = () => {
      const nav = document.querySelector(".nav-safe-area") as HTMLElement | null;
      const navRect = nav?.getBoundingClientRect();
      const standalone = (window.navigator as any).standalone;
      setInfo(
        [
          `screen=${window.screen.height} inner=${window.innerHeight}`,
          `vh=${measure("100vh")} dvh=${measure("100dvh")} svh=${measure("100svh")} lvh=${measure("100lvh")}`,
          navRect ? `navBottom=${navRect.bottom.toFixed(0)} (gap=${(window.screen.height - navRect.bottom).toFixed(0)})` : "nav=?",
        ].join("\n"),
      );
    };
    read();
    const t = setTimeout(read, 600);
    window.visualViewport?.addEventListener("resize", read);
    return () => { clearTimeout(t); window.visualViewport?.removeEventListener("resize", read); };
  }, []);

  return (
    <div style={{ position: "fixed", top: "calc(env(safe-area-inset-top,0px) + 44px)", left: 6, right: 6, zIndex: 99999, background: "rgba(200,0,0,0.9)", color: "#fff", fontSize: 10, lineHeight: 1.4, padding: "4px 7px", borderRadius: 6, fontFamily: "ui-monospace, monospace", pointerEvents: "none", whiteSpace: "pre-line" }}>
      {info}
    </div>
  );
}
