"use client";

import Image from "next/image";
import { useState } from "react";
import { GROUPS } from "@/lib/schema";
import { Button } from "@/components/ui/button";
import { useT } from "./app-state";
import FullscreenDialog from "./FullscreenDialog";
import { IconX } from "./Icons";
import area from "@/public/area.png";

// The workshop zone map; tap to open it full screen.
export default function AreaHero() {
  const { t } = useT();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button onClick={() => setOpen(true)} className="block w-full overflow-hidden rounded-3xl border border-border bg-card text-left">
        <Image src={area} alt={t("studyArea")} sizes="(min-width: 672px) 672px, 100vw" fetchPriority="high" loading="eager" className="aspect-[2.15/1] w-full object-cover sm:aspect-[3/2]" />
      </button>

      {open && (
        <FullscreenDialog title={t("studyArea")} onClose={() => setOpen(false)}>
          <div className="flex justify-end px-2 pt-[max(env(safe-area-inset-top),0.5rem)]">
            <Button variant="ghost" size="icon-xl" aria-label={t("close")} onClick={() => setOpen(false)}>
              <IconX />
            </Button>
          </div>
          <div className="flex min-h-0 flex-1 items-center overflow-auto" onClick={() => setOpen(false)} style={{ touchAction: "pinch-zoom pan-x pan-y" }}>
            <Image src={area} alt={t("studyArea")} sizes="100vw" className="h-auto w-full" />
          </div>
          <div className="grid grid-cols-3 gap-1.5 px-3 pt-3 pb-safe">
            {GROUPS.map((g) => (
              <div key={g.id} className="rounded-xl px-2 py-1.5" style={{ background: g.color, color: g.ink }}>
                <p className="text-xs font-bold">
                  {t("zone")} {g.id}
                </p>
              </div>
            ))}
          </div>
        </FullscreenDialog>
      )}
    </>
  );
}
