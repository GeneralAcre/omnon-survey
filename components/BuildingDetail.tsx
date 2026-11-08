"use client";

import { useState } from "react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { SHOTS, allPhotos, floodLinesLabel, functionLabel, jackedLabel, occupancyLabel, shotsDone, typeLabel, type SurveyRecord } from "@/lib/schema";
import { photoFileName } from "@/lib/naming";
import { cn } from "@/lib/utils";
import { timeAgo, useT } from "./app-state";
import { photoUrl, retryImage } from "./images";
import { IconCamera, IconDownload, IconPin } from "./Icons";
import Lightbox, { type LightboxItem } from "./Lightbox";

// A building's photos and facts, on its own page and beside the map on wide screens.
// `stacked` is the one-column form for narrow spaces, with the cover photo uncropped.
// `children` go at the end of the details.
export default function BuildingDetail({ record, stacked = false, children }: { record: SurveyRecord; stacked?: boolean; children?: React.ReactNode }) {
  const { t, L, lang } = useT();
  const [open, setOpen] = useState<number | null>(null);

  const items: LightboxItem[] = SHOTS.flatMap((s) =>
    record.images[s.key].photos.map((p, i) => ({
      ...p,
      group: record.group,
      title: [record.plotNo, L(s.label), p.note].filter(Boolean).join(" · "),
      downloadName: photoFileName(record, s.key, i, p),
    })),
  );
  const cover = record.images.front.photos[0] ?? allPhotos(record)[0];
  const contributors = [...new Set(allPhotos(record).map((p) => p.by))];

  let flatIndex = 0;

  return (
    <>
      {/* Phones and `stacked`: one column. Wide screens: the building's facts beside its photos. */}
      <div className={stacked ? undefined : "sm:px-2 lg:grid lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-8 lg:px-4 lg:pt-2"}>
        <div>
          {cover && (
            <button onClick={() => setOpen(items.findIndex((x) => x.file === cover.file))} className="block w-full px-4 lg:px-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photoUrl(cover.file)}
                onError={retryImage}
                alt=""
                className={cn("w-full rounded-3xl transition hover:opacity-90", stacked ? "max-h-[78dvh] bg-card object-contain" : "aspect-[4/3] object-cover")}
              />
            </button>
          )}

          <div className="space-y-3 px-4 pt-4 lg:px-0">
            <div className="grid grid-cols-2 gap-2">
              <Info label={t("stepType")} value={typeLabel(record, lang) || t("notSet")} />
              <Info label={t("stepFunction")} value={functionLabel(record, lang) || t("notSet")} />
              <Info label={t("buildYear")} value={record.buildYear || t("notSet")} />
              <Info label={t("buildAge")} value={record.buildAge ? `${record.buildAge} ${t("yearsOld")}` : t("notSet")} />
              <Info label={t("floors")} value={record.floors ? `${record.floors} ${t("floorsUnit")}` : t("notSet")} />
              <Info label={t("occupancy")} value={occupancyLabel(record, lang) || t("notSet")} />
              <Info label={t("jacked")} value={jackedLabel(record, lang) || t("notSet")} />
              <Info label={t("floodLine")} value={floodLinesLabel(record, "\n") || t("notSet")} />
            </div>

            {record.mapLink && (
              <a href={record.mapLink} target="_blank" rel="noreferrer" className="flex items-center gap-3 rounded-2xl bg-card p-4 active:bg-secondary">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand/15 text-brand">
                  <IconPin />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold">{t("openMaps")}</span>
                  <span className="block truncate text-xs text-muted-foreground">{record.lat != null ? `${record.lat}, ${record.lng}` : record.mapLink}</span>
                </span>
                <span className="text-muted-foreground">↗</span>
              </a>
            )}

            {record.notes && <p className="rounded-2xl bg-card p-4 text-[15px] leading-relaxed whitespace-pre-line">{record.notes}</p>}
          </div>
        </div>

        <div className={cn("space-y-3 px-4 pt-4 lg:px-0", !stacked && "lg:pt-0")}>
          <div className={cn("flex items-center justify-between pt-3", !stacked && "lg:pt-0")}>
            <h2 className="text-lg font-bold">
              {t("stepPhotos")} <span className="text-sm font-normal text-muted-foreground">{shotsDone(record)}/{SHOTS.length}</span>
            </h2>
            {items.length > 0 && (
              <a href={`/api/export/photos?id=${record.id}`} download className="flex items-center gap-1.5 text-sm text-brand">
                <IconDownload className="size-4" /> ZIP
              </a>
            )}
          </div>

          {SHOTS.map((s) => {
            const photos = record.images[s.key].photos;
            const note = record.images[s.key].note;
            return (
              <section key={s.key} className="rounded-2xl bg-card p-3">
                <div className="flex items-baseline justify-between gap-2">
                  <h3 className="font-semibold">{L(s.label)}</h3>
                  {photos.length === 0 && <span className="text-xs text-muted-foreground">{t("notTaken")}</span>}
                </div>
                {note && <p className="mt-1 text-sm text-muted-foreground">{note}</p>}
                {photos.length > 0 && (
                  <div className="mt-2 grid grid-cols-3 gap-1.5 sm:grid-cols-4">
                    {photos.map((p) => {
                      const idx = flatIndex++;
                      return (
                        <div key={p.file}>
                          <button onClick={() => setOpen(idx)} className="relative block aspect-square w-full overflow-hidden rounded-xl">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={photoUrl(p.file, "thumb")} onError={retryImage} alt="" loading="lazy" className="h-full w-full object-cover" />
                            <span className="absolute inset-x-1 bottom-1 flex items-center gap-1 truncate rounded-md bg-black/60 px-1.5 py-0.5 text-[10px] text-white">
                              <IconCamera className="size-3 shrink-0" />
                              <span className="truncate">{p.by}</span>
                            </span>
                          </button>
                          {p.note && <p className="mt-1 text-xs leading-snug">{p.note}</p>}
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            );
          })}

          <section className="rounded-2xl bg-card p-4 text-sm">
            <Row label={t("filledBy")} value={record.createdBy.name} sub={timeAgo(record.createdAt, lang)} />
            <Row label={t("editedBy")} value={record.updatedBy.name} sub={timeAgo(record.updatedAt, lang)} />
            {contributors.length > 0 && (
              <div className="border-t border-border py-3">
                <p className="text-muted-foreground">{t("takenBy")}</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {contributors.map((name) => (
                    <span key={name} className="rounded-full bg-secondary px-3 py-1">
                      {name}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {record.history?.length > 1 && (
              <Collapsible className="border-t border-border pt-3">
                <CollapsibleTrigger className="group/history flex cursor-pointer items-center gap-1 text-muted-foreground">
                  <span className="text-xs transition-transform group-data-[panel-open]/history:rotate-90">▸</span>
                  {t("history")} ({record.history.length})
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <ul className="mt-2 space-y-1.5">
                    {[...record.history].reverse().map((h, i) => (
                      <li key={i} className="flex justify-between gap-3">
                        <span>
                          {h.by} <span className="text-muted-foreground">{t(h.action)}</span>
                        </span>
                        <span className="shrink-0 text-muted-foreground">{timeAgo(h.at, lang)}</span>
                      </li>
                    ))}
                  </ul>
                </CollapsibleContent>
              </Collapsible>
            )}
          </section>

          {children}
        </div>
      </div>

      {open !== null && items[open] && <Lightbox items={items} index={open} onClose={() => setOpen(null)} />}
    </>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 leading-snug font-semibold whitespace-pre-line">{value}</p>
    </div>
  );
}

function Row({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border py-3 first:pt-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right">
        <span className="block font-medium">{value}</span>
        <span className="block text-xs text-muted-foreground">{sub}</span>
      </span>
    </div>
  );
}
