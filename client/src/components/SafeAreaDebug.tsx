import { useEffect, useState } from "react";

/**
 * TEMPORARY diagnostic — prints the REAL safe-area/viewport numbers off the device so we
 * can stop guessing why the footer band is oversized. Remove once the nav is fixed.
 */
export default function SafeAreaDebug() {
  const [info, setInfo] = useState("measuring…");

  useEffect(() => {
    const read = () => {
      const probe = document.createElement("div");
      probe.style.cssText = "position:fixed;bottom:0;height:0;padding-bottom:env(safe-area-inset-bottom,0px);visibility:hidden;pointer-events:none";
      document.body.appendChild(probe);
      const sab = getComputedStyle(probe).paddingBottom;
      document.body.removeChild(probe);
      const nav = document.querySelector(".nav-safe-area") as HTMLElement | null;
      const navRect = nav?.getBoundingClientRect();
      const standalone = (window.navigator as any).standalone;
      const vv = window.visualViewport;
      setInfo(
        [
          `SAB=${sab}`,
          `standalone=${standalone}`,
          `inner=${window.innerHeight}`,
          `vv=${vv ? vv.height.toFixed(0) : "?"}`,
          `screen=${window.screen.height}`,
          `dpr=${window.devicePixelRatio}`,
          navRect ? `navBottom=${navRect.bottom.toFixed(0)} navH=${navRect.height.toFixed(0)}` : "nav=?",
        ].join("  "),
      );
    };
    read();
    const t = setTimeout(read, 600);
    window.visualViewport?.addEventListener("resize", read);
    return () => { clearTimeout(t); window.visualViewport?.removeEventListener("resize", read); };
  }, []);

  return (
    <div style={{ position: "fixed", top: "calc(env(safe-area-inset-top,0px) + 44px)", left: 6, right: 6, zIndex: 99999, background: "rgba(200,0,0,0.9)", color: "#fff", fontSize: 10, lineHeight: 1.35, padding: "4px 7px", borderRadius: 6, fontFamily: "ui-monospace, monospace", pointerEvents: "none", wordBreak: "break-all" }}>
      {info}
    </div>
  );
}
