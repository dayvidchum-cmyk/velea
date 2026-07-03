import { useEffect, useState } from "react";

/** TEMP diagnostic — polls viewport + key element boxes. Remove once footer is fixed. */
export default function SafeAreaDebug() {
  const [info, setInfo] = useState("measuring…");

  useEffect(() => {
    const unit = (h: string) => {
      const p = document.createElement("div");
      p.style.cssText = `position:fixed;top:0;left:0;width:0;height:${h};visibility:hidden`;
      document.body.appendChild(p);
      const px = p.getBoundingClientRect().height;
      document.body.removeChild(p);
      return px.toFixed(0);
    };
    const rect = (sel: string) => {
      const el = document.querySelector(sel) as HTMLElement | null;
      if (!el) return "none";
      const r = el.getBoundingClientRect();
      return `t${r.top.toFixed(0)} b${r.bottom.toFixed(0)} h${r.height.toFixed(0)}`;
    };
    const read = () => {
      const sc = window.screen.height;
      setInfo(
        [
          `screen=${sc} inner=${window.innerHeight} (gap=${sc - window.innerHeight})`,
          `vh=${unit("100vh")} dvh=${unit("100dvh")} lvh=${unit("100lvh")}`,
          `cover(splash/sky)=${rect(".app-cover-height")}`,
          `shell=${rect(".app-shell-height")}`,
          `nav=${rect(".nav-safe-area")}`,
        ].join("\n"),
      );
    };
    read();
    const id = setInterval(read, 700);
    return () => clearInterval(id);
  }, []);

  return (
    <div style={{ position: "fixed", top: "calc(env(safe-area-inset-top,0px) + 40px)", left: 6, right: 6, zIndex: 99999, background: "rgba(210,0,0,0.94)", color: "#fff", fontSize: 10, lineHeight: 1.4, padding: "4px 7px", borderRadius: 6, fontFamily: "ui-monospace, monospace", pointerEvents: "none", whiteSpace: "pre-line" }}>
      {info}
    </div>
  );
}
