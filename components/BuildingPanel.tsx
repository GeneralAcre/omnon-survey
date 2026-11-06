"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { buttonVariants } from "@/components/ui/button";
import { groupOf, type SurveyRecord } from "@/lib/schema";
import { cn } from "@/lib/utils";
import { useT } from "./app-state";
import BuildingDetail from "./BuildingDetail";
import { GroupBadge } from "./GroupBadge";
import { IconX } from "./Icons";

// What was tapped on the map. `code` is set when one building was tapped rather
// than a whole plot; `recordId` is missing when nothing there has been surveyed.
export type MapPick = { id: string; group: string; code?: string; recordId?: string };

// Stands in for the list on wide screens, showing the place tapped on the map beside it.
export default function BuildingPanel({ pick, record, onClose }: { pick: MapPick; record?: SurveyRecord; onClose: () => void }) {
  const { t, L } = useT();
  const top = useRef<HTMLElement>(null);
  const g = groupOf(pick.group);

  // The page may be scrolled down the list; bring each new pick into view.
  useEffect(() => {
    top.current?.scrollIntoView({ block: "start" });
  }, [pick.id]);

  return (
    <section ref={top} className="min-w-0 scroll-mt-4 pb-32">
      <header className="sticky top-0 z-20 mb-2 flex items-center gap-2 bg-background/85 py-2 backdrop-blur-xl">
        <div className="min-w-0 flex-1">
          <h2 className="flex items-center gap-2 truncate text-lg font-bold">
            {record?.plotNo ?? pick.id} <GroupBadge group={pick.group} />
          </h2>
          {g && <p className="truncate text-xs text-muted-foreground">{L(g.zone)}</p>}
        </div>
        {record && (
          <Link href={`/r/${record.id}`} className={buttonVariants({ variant: "secondary", size: "lg" })}>
            {t("openFull")}
          </Link>
        )}
        {record && (
          <Link href={`/r/${record.id}/edit`} className={buttonVariants({ size: "lg" })}>
            {t("edit")}
          </Link>
        )}
        <button type="button" onClick={onClose} aria-label={t("close")} className="flex size-10 shrink-0 items-center justify-center rounded-full bg-secondary active:scale-95">
          <IconX className="size-5" />
        </button>
      </header>

      {record ? (
        <BuildingDetail record={record} stacked />
      ) : (
        <div className="rounded-3xl bg-card p-8 text-center">
          <p className="font-semibold">{t("notSurveyed")}</p>
          {pick.code === undefined ? (
            <p className="mt-1 text-sm text-muted-foreground">{t("plotCardHint")}</p>
          ) : (
            <Link href={`/new?plot=${encodeURIComponent(pick.id)}`} className={cn(buttonVariants({ size: "lg" }), "mt-4")}>
              {t("surveyThis")} {pick.id}
            </Link>
          )}
        </div>
      )}
    </section>
  );
}
