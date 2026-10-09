"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { GroupBadge } from "./GroupBadge";
import { timeAgo, useT } from "./app-state";
import FullscreenDialog from "./FullscreenDialog";
import { downloadUrl, photoUrl } from "./images";
import { IconBack, IconDownload, IconNext, IconX } from "./Icons";

export type LightboxItem = { file: string; title: string; by: string; group: string; at: string; downloadName: string; href?: string };

export default function Lightbox({ items, index, onClose }: { items: LightboxItem[]; index: number; onClose: () => void }) {
  const { t, lang } = useT();
  const [i, setI] = useState(index);
  const touchX = useRef<number | null>(null);
  const item = items[i];
  const go = (d: number) => setI((n) => (n + d + items.length) % items.length);

  return (
    <FullscreenDialog
      title={item.title}
      onClose={onClose}
      onKeyDown={(e) => {
        if (e.key === "ArrowLeft") go(-1);
        if (e.key === "ArrowRight") go(1);
      }}
    >
      <div className="flex items-center gap-2 px-2 pt-[max(env(safe-area-inset-top),0.5rem)] pb-2">
        <Button variant="ghost" size="icon-xl" onClick={onClose} aria-label={t("close")}>
          <IconX />
        </Button>
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-2 truncate text-sm font-semibold"><GroupBadge group={item.group} />{item.title}</p>
          <p className="truncate text-xs text-muted-foreground">
            {t("takenBy")} {item.by} · {timeAgo(item.at, lang)}
          </p>
        </div>
        <span className="px-2 text-xs text-muted-foreground">
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
            <Button variant="secondary" size="icon-xl" onClick={() => go(-1)} aria-label="Previous" className="absolute left-2 hidden bg-white/10 sm:inline-flex">
              <IconBack />
            </Button>
            <Button variant="secondary" size="icon-xl" onClick={() => go(1)} aria-label="Next" className="absolute right-2 hidden bg-white/10 sm:inline-flex">
              <IconNext />
            </Button>
          </>
        )}
      </div>
      <div className="flex gap-2 px-4 pt-3 pb-safe">
        {item.href && (
          <Link href={item.href} className={cn(buttonVariants({ size: "xl" }), "flex-1")}>
            {t("openBuilding")}
          </Link>
        )}
        <a
          href={downloadUrl(item.file, item.downloadName)}
          download={item.downloadName}
          className={cn(buttonVariants({ variant: "secondary", size: "xl" }), "flex-1")}
        >
          <IconDownload /> {t("download")}
        </a>
      </div>
    </FullscreenDialog>
  );
}
