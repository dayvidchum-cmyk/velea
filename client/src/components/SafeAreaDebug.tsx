import { useEffect, useState } from "react";

/** TEMP diagnostic — measures the nav + a real label's pixel box so we fix from data. */
export default function SafeAreaDebug() {
  const [info, setInfo] = useState("measuring…");

  useEffect(() => {
    const measure = (h: string) => {
      const p = document.createElement("div");
      p.style.cssText = `position:fixed;top:0;left:0;width:0;height:${h};visibility:hidden`;
      document.body.appendChild(p);
      const px = p.getBoundingClientRect().height;
      document.body.removeChild(p);
      return px.toFixed(0);
    };
    const read = () => {
      const shell = document.querySelector(".app-shell-height") as HTMLElement | null;
      const nav = document.querySelector(".nav-safe-area") as HTMLElement | null;
      const shellR = shell?.getBoundingClientRect();
      const navR = nav?.getBoundingClientRect();
      // find a label span (the uppercase text nodes inside the nav)
      let labelBottom = "?";
      let labelText = "?";
      const spans = nav?.querySelectorAll("span") ?? [];
      for (const s of Array.from(spans)) {
        const r = s.getBoundingClientRect();
        if ((s.textContent ?? "").trim().length > 2 && r.height > 4) {
          labelBottom = r.bottom.toFixed(0);
          labelText = (s.textContent ?? "").trim();
          break;
        }
      }
      setInfo(
        [
          `screen=${window.screen.height} inner=${window.innerHeight} lvh=${measure("100lvh")}`,
          `shellH=${shellR ? shellR.height.toFixed(0) : "?"} shellBottom=${shellR ? shellR.bottom.toFixed(0) : "?"}`,
          `navTop=${navR ? navR.top.toFixed(0) : "?"} navBottom=${navR ? navR.bottom.toFixed(0) : "?"}`,
          `label "${labelText}" bottom=${labelBottom} (screenGap=${labelBottom !== "?" ? (window.screen.height - Number(labelBottom)).toFixed(0) : "?"})`,
        ].join("\n"),
      );
    };
    read();
    const t = setTimeout(read, 700);
    return () => clearTimeout(t);
  }, []);

  return (
    <div style={{ position: "fixed", top: "calc(env(safe-area-inset-top,0px) + 44px)", left: 6, right: 6, zIndex: 99999, background: "rgba(200,0,0,0.92)", color: "#fff", fontSize: 10, lineHeight: 1.4, padding: "4px 7px", borderRadius: 6, fontFamily: "ui-monospace, monospace", pointerEvents: "none", whiteSpace: "pre-line" }}>
      {info}
    </div>
  );
}
