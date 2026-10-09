"use client";

import { useState } from "react";
import { GROUPS } from "@/lib/schema";
import { Button } from "@/components/ui/button";
import { useT } from "./app-state";
import FullscreenDialog from "./FullscreenDialog";
import { IconX } from "./Icons";

// The workshop zone map, with each zone tied to its group colour.
export default function AreaHero({ myGroup }: { myGroup: string }) {
  const { t, L } = useT();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button onClick={() => setOpen(true)} className="relative block w-full overflow-hidden rounded-3xl border border-border text-left">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/area.png" alt={t("studyArea")} className="aspect-[2.15/1] w-full object-cover sm:aspect-[3/2]" />
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/70 to-transparent px-2.5 pt-7 pb-2.5 sm:px-3 sm:pt-10 sm:pb-3">
          <div className="flex items-end justify-between gap-2">
            <p className="text-xs font-semibold sm:text-sm">{t("studyArea")}</p>
            <p className="text-[10px] text-white/60 sm:text-[11px]">{t("tapToZoom")}</p>
          </div>
          <div className="mt-2 grid grid-cols-3 gap-1.5">
            {GROUPS.map((g) => (
              <div
                key={g.id}
                className={`rounded-lg px-1.5 py-1 sm:rounded-xl sm:px-2 sm:py-1.5 ${g.id === myGroup ? "ring-2 ring-white" : ""}`}
                style={{ background: g.color, color: g.ink }}
              >
                <p className="text-xs font-bold">
                  {t("zone")} {g.id} · G{g.id}
                </p>
              </div>
            ))}
          </div>
        </div>
      </button>

      {open && (
        <FullscreenDialog title={t("studyArea")} onClose={() => setOpen(false)}>
          <div className="flex justify-end px-2 pt-[max(env(safe-area-inset-top),0.5rem)]">
            <Button variant="ghost" size="icon-xl" aria-label={t("close")} onClick={() => setOpen(false)}>
              <IconX />
            </Button>
          </div>
          <div className="flex min-h-0 flex-1 items-center overflow-auto" onClick={() => setOpen(false)} style={{ touchAction: "pinch-zoom pan-x pan-y" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/area.png" alt={t("studyArea")} className="w-full" />
          </div>
          <div className="grid grid-cols-3 gap-1.5 px-3 pt-3 pb-safe">
            {GROUPS.map((g) => (
              <div key={g.id} className="rounded-xl px-2 py-1.5" style={{ background: g.color, color: g.ink }}>
                <p className="text-xs font-bold">
                  {t("zone")} {g.id} · G{g.id}
                </p>
              </div>
            ))}
          </div>
        </FullscreenDialog>
      )}
    </>
  );
}
