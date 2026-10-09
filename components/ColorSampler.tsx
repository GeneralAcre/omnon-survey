"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { loadImage, mainColours, type Swatch } from "@/lib/palette";
import { useT } from "./app-state";
import FullscreenDialog from "./FullscreenDialog";
import { IconCheck, IconPlus, IconX } from "./Icons";

export default function ColorSampler({
  src,
  paletteSrc = src,
  colors,
  onAdd,
  onRemove,
  onClose,
}: {
  src: string;
  // Image the main colours are read from; pass the same one the colours step uses so the hexes match.
  paletteSrc?: string;
  colors: string[];
  onAdd: (hexes: string[]) => void;
  onRemove: (hex: string) => void;
  onClose: () => void;
}) {
  const { t } = useT();
  const canvas = useRef<HTMLCanvasElement | null>(null);
  const image = useRef<HTMLImageElement | null>(null);
  const [hover, setHover] = useState<string | null>(null);

  // The dialog may mount the canvas after the photo loads, or before; draw whenever both exist.
  function draw() {
    const c = canvas.current;
    const img = image.current;
    if (!c || !img || c.width === img.width) return;
    const scale = Math.min(1, 1400 / Math.max(img.width, img.height));
    c.width = img.width * scale;
    c.height = img.height * scale;
    c.getContext("2d", { willReadFrequently: true })!.drawImage(img, 0, 0, c.width, c.height);
  }

  useEffect(() => {
    let live = true;
    loadImage(src)
      .then((img) => {
        if (!live) return;
        image.current = img;
        draw();
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [src]);

  function colorAt(e: React.PointerEvent<HTMLCanvasElement>): string | null {
    const c = e.currentTarget;
    const rect = c.getBoundingClientRect();
    const x = Math.floor(((e.clientX - rect.left) / rect.width) * c.width);
    const y = Math.floor(((e.clientY - rect.top) / rect.height) * c.height);
    // Average a 7×7 patch so texture noise doesn't skew the sample.
    let d: Uint8ClampedArray;
    try {
      d = c.getContext("2d")!.getImageData(Math.max(0, x - 3), Math.max(0, y - 3), 7, 7).data;
    } catch {
      return null; // Pixels unreadable; never crash the picker over it.
    }
    let r = 0, g = 0, b = 0, n = 0;
    for (let i = 0; i < d.length; i += 4) {
      r += d[i]; g += d[i + 1]; b += d[i + 2]; n++;
    }
    return "#" + [r, g, b].map((v) => Math.round(v / n).toString(16).padStart(2, "0")).join("");
  }

  return (
    <FullscreenDialog title={t("tapToSample")} onClose={onClose}>
      <div className="flex items-center gap-3 px-4 pt-[max(env(safe-area-inset-top),0.75rem)] pb-3">
        <p className="flex-1 text-sm text-muted-foreground">{t("tapToSample")}</p>
        <Button size="xl" onClick={onClose} className="min-h-10">
          {t("done")}
        </Button>
      </div>
      <div className="flex min-h-0 flex-1 items-center justify-center px-2">
        <canvas
          ref={(c) => {
            canvas.current = c;
            draw();
          }}
          className="max-h-full max-w-full touch-none"
          onPointerMove={(e) => setHover(colorAt(e))}
          onPointerDown={(e) => {
            const hex = colorAt(e);
            setHover(hex);
            if (hex) onAdd([hex]);
          }}
        />
      </div>

      <div className="space-y-3 px-4 pt-3 pb-safe">
        <MainColours src={paletteSrc} colors={colors} onAdd={onAdd} onRemove={onRemove} />

        <section>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold">{t("yourScheme")}</h3>
            {hover && (
              <span className="ml-auto flex items-center gap-1.5 font-mono text-xs text-muted-foreground">
                <span className="size-4 rounded border border-white/20" style={{ background: hover }} />
                {hover}
              </span>
            )}
          </div>
          <div className="no-scrollbar mt-2 flex min-h-10 gap-2 overflow-x-auto pt-1.5 pr-1.5">
            {colors.length === 0 && <p className="self-center text-xs text-muted-foreground">{t("schemeEmpty")}</p>}
            {colors.map((c) => (
              <button
                key={c}
                onClick={() => onRemove(c)}
                aria-label={`${t("delete")} ${c}`}
                className="relative size-9 shrink-0 rounded-lg border border-white/10"
                style={{ background: c }}
              >
                <span className="absolute -top-1.5 -right-1.5 flex size-4.5 items-center justify-center rounded-full bg-secondary text-foreground">
                  <IconX className="size-3" />
                </span>
              </button>
            ))}
          </div>
        </section>
      </div>
    </FullscreenDialog>
  );
}

// The few colours covering most of a photo, each tap toggling it in the scheme.
// onFound fires once per photo with what was found (used to fill an empty scheme).
export function MainColours({
  src,
  colors,
  onAdd,
  onRemove,
  onFound,
}: {
  src: string;
  colors: string[];
  onAdd: (hexes: string[]) => void;
  onRemove: (hex: string) => void;
  onFound?: (swatches: Swatch[]) => void;
}) {
  const { t } = useT();
  const [found, setFound] = useState<{ src: string; swatches: Swatch[] } | null>(null);
  const [failed, setFailed] = useState<string | null>(null);
  const main = found?.src === src ? found.swatches : null;

  useEffect(() => {
    let live = true;
    loadImage(src)
      .then((img) => {
        if (!live) return;
        const swatches = mainColours(img, 5);
        setFound({ src, swatches });
        onFound?.(swatches);
      })
      .catch(() => live && setFailed(src));
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src]);

  const missing = (main ?? []).filter((s) => !colors.includes(s.hex)).map((s) => s.hex);

  return (
    <section>
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">{t("mainColours")}</h3>
        <Button variant="secondary" size="sm" className="rounded-full" disabled={!missing.length} onClick={() => onAdd(missing)}>
          <IconPlus className="size-3.5" /> {t("addAll")}
        </Button>
      </div>
      <div className="no-scrollbar mt-2 flex gap-2 overflow-x-auto pt-1 pb-1 pl-1">
        {main === null && <p className="text-xs text-muted-foreground">{failed === src ? t("loadError") : t("findingColours")}</p>}
        {main?.map((s) => {
          const added = colors.includes(s.hex);
          return (
            <button
              key={s.hex}
              onClick={() => (added ? onRemove(s.hex) : onAdd([s.hex]))}
              aria-pressed={added}
              aria-label={s.hex}
              className="flex shrink-0 flex-col items-center gap-1"
            >
              <span
                className={cn(
                  "relative flex size-12 items-center justify-center rounded-xl border border-white/15",
                  added && "ring-2 ring-foreground ring-offset-2 ring-offset-black",
                )}
                style={{ background: s.hex }}
              >
                {added && (
                  <span className="flex size-5 items-center justify-center rounded-full bg-foreground text-background">
                    <IconCheck className="size-3.5" />
                  </span>
                )}
              </span>
              <span className="font-mono text-[10px] text-muted-foreground">{Math.round(s.share * 100)}%</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
