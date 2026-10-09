"use client";

import { useEffect, useRef, useState } from "react";
import { useT } from "./app-state";

export default function ColorSampler({ src, onPick, onClose }: { src: string; onPick: (hex: string) => void; onClose: () => void }) {
  const { t } = useT();
  const canvas = useRef<HTMLCanvasElement>(null);
  const [hover, setHover] = useState<string | null>(null);
  const [picked, setPicked] = useState<string[]>([]);

  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      const c = canvas.current;
      if (!c) return;
      const scale = Math.min(1, 1400 / Math.max(img.width, img.height));
      c.width = img.width * scale;
      c.height = img.height * scale;
      c.getContext("2d", { willReadFrequently: true })!.drawImage(img, 0, 0, c.width, c.height);
    };
    img.src = src;
  }, [src]);

  function colorAt(e: React.PointerEvent<HTMLCanvasElement>) {
    const c = e.currentTarget;
    const rect = c.getBoundingClientRect();
    const x = Math.floor(((e.clientX - rect.left) / rect.width) * c.width);
    const y = Math.floor(((e.clientY - rect.top) / rect.height) * c.height);
    // Average a 7×7 patch so texture noise doesn't skew the sample.
    const d = c.getContext("2d")!.getImageData(Math.max(0, x - 3), Math.max(0, y - 3), 7, 7).data;
    let r = 0, g = 0, b = 0, n = 0;
    for (let i = 0; i < d.length; i += 4) {
      r += d[i]; g += d[i + 1]; b += d[i + 2]; n++;
    }
    return "#" + [r, g, b].map((v) => Math.round(v / n).toString(16).padStart(2, "0")).join("");
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black">
      <div className="flex items-center gap-3 px-4 pt-[max(env(safe-area-inset-top),0.75rem)] pb-3">
        <p className="flex-1 text-sm text-muted">{t("tapToSample")}</p>
        <button onClick={onClose} className="btn-primary min-h-10 px-5">
          {t("done")}
        </button>
      </div>
      <div className="flex min-h-0 flex-1 items-center justify-center px-2">
        <canvas
          ref={canvas}
          className="max-h-full max-w-full touch-none"
          onPointerMove={(e) => setHover(colorAt(e))}
          onPointerDown={(e) => {
            const hex = colorAt(e);
            setHover(hex);
            onPick(hex);
            setPicked((p) => (p.includes(hex) ? p : [...p, hex]));
          }}
        />
      </div>
      <div className="flex items-center gap-2 px-4 pt-3 pb-safe">
        <span className="h-12 w-12 shrink-0 rounded-xl border border-white/20" style={{ background: hover ?? "transparent" }} />
        <span className="w-20 font-mono text-xs text-muted">{hover}</span>
        <div className="no-scrollbar flex gap-1.5 overflow-x-auto">
          {picked.map((c) => (
            <span key={c} className="h-8 w-8 shrink-0 rounded-lg border border-white/10" style={{ background: c }} />
          ))}
        </div>
      </div>
    </div>
  );
}
