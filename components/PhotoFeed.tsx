"use client";

import { useMemo, useState } from "react";
import { SHOTS, groupColor, type SurveyRecord } from "@/lib/schema";
import { photoFileName } from "@/lib/naming";
import { cn } from "@/lib/utils";
import { useT } from "./app-state";
import { BOX_PAGE, SeeMore, box, boxCols, boxGrid } from "./BuildingBox";
import { photoUrl, retryImage } from "./images";
import Lightbox, { type LightboxItem } from "./Lightbox";

// Every photo from every visible building, newest first.
export default function PhotoFeed({ records }: { records: SurveyRecord[] }) {
  const { t, L } = useT();
  const [limit, setLimit] = useState(BOX_PAGE);
  const [open, setOpen] = useState<number | null>(null);

  const items: (LightboxItem & { plotNo: string })[] = useMemo(
    () =>
      records
        .flatMap((r) =>
          SHOTS.flatMap((s) =>
            (r.images[s.key]?.photos ?? []).map((p, i) => ({
              ...p,
              group: r.group,
              plotNo: r.plotNo,
              title: `${r.plotNo} · ${L(s.label)}`,
              downloadName: photoFileName(r, s.key, i, p),
              href: `/r/${r.id}`,
            })),
          ),
        )
        .sort((a, b) => b.at.localeCompare(a.at)),
    [records, L],
  );

  if (items.length === 0) return <p className="py-16 text-center text-muted-foreground">{t("noPhotos")}</p>;

  return (
    <>
      <div className={cn(boxGrid, boxCols)}>
        {items.slice(0, limit).map((p, i) => {
          const c = groupColor(p.group);
          return (
            <button key={p.file} onClick={() => setOpen(i)} className={cn(box, "relative overflow-hidden bg-card")}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photoUrl(p.file, "thumb")} onError={retryImage} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
              <span className="absolute inset-x-0 top-0 h-1" style={{ background: c.bg }} />
              <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent px-2.5 pt-6 pb-2 text-left text-white sm:px-4 sm:pb-3">
                <span className="block truncate text-sm font-semibold">{p.plotNo}</span>
                <span className="flex items-center gap-1 truncate text-xs text-white/70">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: c.bg }} />
                  {p.by}
                </span>
              </span>
            </button>
          );
        })}
      </div>
      {items.length > limit && <SeeMore onClick={() => setLimit((n) => n + BOX_PAGE)} />}
      {open !== null && <Lightbox items={items} index={open} onClose={() => setOpen(null)} />}
    </>
  );
}
