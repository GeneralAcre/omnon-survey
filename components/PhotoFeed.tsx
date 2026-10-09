"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { IMAGE_SLOTS, groupColor, type SurveyRecord } from "@/lib/schema";
import { photoFileName } from "@/lib/naming";
import { useT } from "./app-state";
import { photoUrl } from "./images";
import Lightbox, { type LightboxItem } from "./Lightbox";

const PAGE = 90;

// Every photo from every visible building, newest first.
export default function PhotoFeed({ records }: { records: SurveyRecord[] }) {
  const { t, L } = useT();
  const [limit, setLimit] = useState(PAGE);
  const [open, setOpen] = useState<number | null>(null);

  const items: (LightboxItem & { plotNo: string })[] = useMemo(
    () =>
      records
        .flatMap((r) =>
          IMAGE_SLOTS.flatMap((s) =>
            (r.images[s.key]?.photos ?? []).map((p, i) => ({
              ...p,
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
      <div className="grid grid-cols-3 gap-1 sm:grid-cols-4">
        {items.slice(0, limit).map((p, i) => {
          const c = groupColor(p.group);
          return (
            <button key={p.file} onClick={() => setOpen(i)} className="relative aspect-square overflow-hidden rounded-lg bg-card">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photoUrl(p.file, "thumb")} alt="" loading="lazy" className="h-full w-full object-cover" />
              <span className="absolute inset-x-0 top-0 h-1" style={{ background: c.bg }} />
              <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent px-1.5 pt-4 pb-1 text-left">
                <span className="block truncate text-[11px] font-semibold">{p.plotNo}</span>
                <span className="flex items-center gap-1 truncate text-[10px] text-white/70">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: c.bg }} />
                  {p.by}
                </span>
              </span>
            </button>
          );
        })}
      </div>
      {items.length > limit && (
        <Button variant="secondary" size="xl" onClick={() => setLimit((n) => n + PAGE)} className="mt-4 w-full">
          {t("showMore")} ({items.length - limit})
        </Button>
      )}
      {open !== null && <Lightbox items={items} index={open} onClose={() => setOpen(null)} />}
    </>
  );
}
