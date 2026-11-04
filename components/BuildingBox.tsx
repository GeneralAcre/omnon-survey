"use client";

import Link from "next/link";
import { allPhotos, functionLabel, groupColor, typeLabel, type SurveyRecord } from "@/lib/schema";
import { cn } from "@/lib/utils";
import { useT } from "./app-state";
import { GroupBadge } from "./GroupBadge";
import { IconCamera, IconImage, IconPin } from "./Icons";
import { photoUrl, retryImage } from "./images";

// The tile every building grid is built from. Grids set them close together.
export const boxGrid = "grid gap-1.5 sm:gap-2";
export const box = "flex aspect-[4/5] flex-col";
export const boxPad = "p-2.5 sm:p-4";

// One building in its own box: the photo fills the top edge to edge, details below.
export function BuildingBox({ r, highlight = false }: { r: SurveyRecord; highlight?: boolean }) {
  const { t, lang } = useT();
  const cover = r.images.front?.photos[0] ?? allPhotos(r)[0];
  const photos = allPhotos(r).length;
  return (
    <Link
      href={`/r/${r.id}`}
      className={cn("group bg-card transition-colors hover:bg-muted", box, highlight && "ring-2 ring-inset")}
      style={highlight ? ({ "--tw-ring-color": groupColor(r.group).bg } as React.CSSProperties) : undefined}
    >
      <div className="relative min-h-0 flex-1 overflow-hidden">
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photoUrl(cover.file, "thumb")}
            onError={retryImage}
            alt=""
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            <IconImage className="size-8" />
          </div>
        )}
      </div>
      <div className={boxPad}>
        <div className="flex items-center gap-1.5">
          <span className="truncate text-sm font-semibold">{r.plotNo}</span>
          <GroupBadge group={r.group} className="shrink-0" />
          {r.lat != null && <IconPin className="size-3.5 shrink-0 text-muted-foreground" />}
        </div>
        <div className="mt-0.5 flex items-center justify-between gap-2 text-xs text-muted-foreground">
          <span className="truncate">{[typeLabel(r, lang), functionLabel(r, lang)].filter(Boolean).join(" · ") || t("notSet")}</span>
          {photos > 0 && (
            <span className="flex shrink-0 items-center gap-1">
              <IconCamera className="size-3.5" />
              {photos}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
