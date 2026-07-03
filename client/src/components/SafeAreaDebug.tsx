import { useEffect, useState } from "react";

/** TEMP diagnostic — polls the nav + label boxes so we can't miss them. */
export default function SafeAreaDebug() {
  const [info, setInfo] = useState("measuring…");

  useEffect(() => {
    const read = () => {
      const shell = (document.querySelector(".app-shell-height") as HTMLElement | null)?.getBoundingClientRect();
      const navSafe = (document.querySelector(".nav-safe-area") as HTMLElement | null)?.getBoundingClientRect();
      const glass = (document.querySelector(".glass-nav") as HTMLElement | null)?.getBoundingClientRect();
      // first real label span in the nav
      let lBottom = "?", lText = "?";
      const spans = document.querySelectorAll(".glass-nav span");
      for (const s of Array.from(spans)) {
        const r = s.getBoundingClientRect();
        if ((s.textContent ?? "").trim().length > 2 && r.height > 4) {
          lBottom = r.bottom.toFixed(0); lText = (s.textContent ?? "").trim(); break;
        }
      }
      const sc = window.screen.height;
      setInfo(
        [
          `screen=${sc} inner=${window.innerHeight}`,
          `shell b=${shell ? shell.bottom.toFixed(0) : "?"} h=${shell ? shell.height.toFixed(0) : "?"}`,
          `navSafe t=${navSafe ? navSafe.top.toFixed(0) : "?"} b=${navSafe ? navSafe.bottom.toFixed(0) : "?"}`,
          `glass t=${glass ? glass.top.toFixed(0) : "?"} b=${glass ? glass.bottom.toFixed(0) : "?"} h=${glass ? glass.height.toFixed(0) : "?"}`,
          `label "${lText}" b=${lBottom} offScreen=${lBottom !== "?" ? (Number(lBottom) > sc ? "YES(" + (Number(lBottom) - sc).toFixed(0) + ")" : "no") : "?"}`,
        ].join("\n"),
      );
    };
    read();
    const id = setInterval(read, 800);
    return () => clearInterval(id);
  }, []);

  return (
    <div style={{ position: "fixed", top: "calc(env(safe-area-inset-top,0px) + 44px)", left: 6, right: 6, zIndex: 99999, background: "rgba(200,0,0,0.92)", color: "#fff", fontSize: 10, lineHeight: 1.4, padding: "4px 7px", borderRadius: 6, fontFamily: "ui-monospace, monospace", pointerEvents: "none", whiteSpace: "pre-line" }}>
      {info}
    </div>
  );
}
