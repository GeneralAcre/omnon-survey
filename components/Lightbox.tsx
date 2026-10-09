"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { GroupBadge } from "./GroupBadge";
import { timeAgo, useT } from "./app-state";
import { downloadUrl, photoUrl } from "./images";
import { IconBack, IconDownload, IconNext, IconX } from "./Icons";

export type LightboxItem = { file: string; title: string; by: string; group: string; at: string; downloadName: string; href?: string };

export default function Lightbox({ items, index, onClose }: { items: LightboxItem[]; index: number; onClose: () => void }) {
  const { t, lang } = useT();
  const [i, setI] = useState(index);
  const touchX = useRef<number | null>(null);
  const item = items[i];
  const go = (d: number) => setI((n) => (n + d + items.length) % items.length);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") setI((n) => (n - 1 + items.length) % items.length);
      if (e.key === "ArrowRight") setI((n) => (n + 1) % items.length);
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [items.length, onClose]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black">
      <div className="flex items-center gap-2 px-2 pt-[max(env(safe-area-inset-top),0.5rem)] pb-2">
        <button onClick={onClose} aria-label={t("close")} className="flex h-11 w-11 items-center justify-center rounded-full">
          <IconX />
        </button>
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-2 truncate text-sm font-semibold"><GroupBadge group={item.group} />{item.title}</p>
          <p className="truncate text-xs text-muted">
            {t("takenBy")} {item.by} · {timeAgo(item.at, lang)}
          </p>
        </div>
        <span className="px-2 text-xs text-muted">
          {i + 1}/{items.length}
        </span>
      </div>
      <div
        className="relative flex min-h-0 flex-1 items-center justify-center"
        onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
        onTouchEnd={(e) => {
          if (touchX.current === null) return;
          const dx = e.changedTouches[0].clientX - touchX.current;
          if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1);
          touchX.current = null;
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img key={item.file} src={photoUrl(item.file)} alt={item.title} className="max-h-full max-w-full object-contain" />
        {items.length > 1 && (
          <>
            <button onClick={() => go(-1)} aria-label="Previous" className="absolute left-2 hidden h-11 w-11 items-center justify-center rounded-full bg-white/10 sm:flex">
              <IconBack />
            </button>
            <button onClick={() => go(1)} aria-label="Next" className="absolute right-2 hidden h-11 w-11 items-center justify-center rounded-full bg-white/10 sm:flex">
              <IconNext className="h-6 w-6" />
            </button>
          </>
        )}
      </div>
      <div className="flex gap-2 px-4 pt-3 pb-safe">
        {item.href && (
          <Link href={item.href} className="btn-primary flex-1">
            {t("openBuilding")}
          </Link>
        )}
        <a href={downloadUrl(item.file, item.downloadName)} download={item.downloadName} className="btn-secondary flex-1">
          <IconDownload /> {t("download")}
        </a>
      </div>
    </div>
  );
}
