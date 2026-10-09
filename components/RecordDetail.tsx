"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { IMAGE_SLOTS, allPhotos, functionLabel, groupOf, shotsDone, typeLabel } from "@/lib/schema";
import { photoFileName } from "@/lib/naming";
import { timeAgo, useT } from "./app-state";
import { removeRecord, useRecord } from "./data";
import { photoUrl } from "./images";
import { IconBack, IconCamera, IconDownload, IconPin, IconTrash } from "./Icons";
import Lightbox, { type LightboxItem } from "./Lightbox";
import { GroupBadge } from "./GroupBadge";

export default function RecordDetail() {
  const { id } = useParams<{ id: string }>();
  const { t, L, lang } = useT();
  const router = useRouter();
  const { record, error, reload } = useRecord(id);
  const [open, setOpen] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  if (record === undefined) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-3 text-muted">
        {error ? (
          <>
            {t("loadError")}
            <button onClick={reload} className="btn-secondary">
              {t("retry")}
            </button>
          </>
        ) : (
          t("loading")
        )}
      </main>
    );
  }
  if (record === null) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center text-muted">
        {t("notFound")}
        <Link href="/" className="btn-secondary">
          {t("backToList")}
        </Link>
      </main>
    );
  }

  const items: LightboxItem[] = IMAGE_SLOTS.flatMap((s) =>
    record.images[s.key].photos.map((p, i) => ({
      ...p,
      title: `${record.plotNo} · ${L(s.label)}`,
      downloadName: photoFileName(record, s.key, i, p),
    })),
  );
  const cover = record.images.front.photos[0] ?? allPhotos(record)[0];
  const contributors = [...new Map(allPhotos(record).map((p) => [p.by, p.group])).entries()];
  const g = groupOf(record.group)!;

  async function del() {
    if (!confirm(t("confirmDelete"))) return;
    setDeleting(true);
    try {
      await removeRecord(record!.id);
      router.replace("/");
    } catch {
      setDeleting(false);
    }
  }

  let flatIndex = 0;

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 pb-32">
      <header className="sticky top-0 z-20 flex items-center gap-2 bg-background/85 px-2 pt-[max(env(safe-area-inset-top),0.5rem)] pb-2 backdrop-blur-xl">
        <Link href="/" aria-label={t("backToList")} className="flex h-11 w-11 items-center justify-center rounded-full active:bg-surface-2">
          <IconBack />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="flex items-center gap-2 truncate text-lg font-bold">{record.plotNo} <GroupBadge group={record.group} /></h1>
          <p className="truncate text-xs text-muted">
            {L(g.label)} · {L(g.zone)}
          </p>
        </div>
      </header>

      {cover && (
        <button onClick={() => setOpen(items.findIndex((x) => x.file === cover.file))} className="block w-full px-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photoUrl(cover.file)} alt="" className="aspect-[4/3] w-full rounded-3xl object-cover" />
        </button>
      )}

      <div className="space-y-3 px-4 pt-4">
        <div className="grid grid-cols-2 gap-2">
          <Info label={t("stepType")} value={typeLabel(record, lang) || "—"} />
          <Info label={t("stepFunction")} value={functionLabel(record, lang) || "—"} />
        </div>

        {record.mapLink && (
          <a
            href={record.mapLink}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-3 rounded-2xl bg-surface p-4 active:bg-surface-2"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent/15 text-accent">
              <IconPin />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-semibold">{t("openMaps")}</span>
              <span className="block truncate text-xs text-muted">
                {record.lat != null ? `${record.lat}, ${record.lng}` : record.mapLink}
              </span>
            </span>
            <span className="text-muted">↗</span>
          </a>
        )}

        {(record.colors.length > 0 || record.notes) && (
          <div className="rounded-2xl bg-surface p-4">
            {record.colors.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {record.colors.map((c) => (
                  <span key={c} className="flex items-center gap-1.5 rounded-full bg-surface-2 py-1 pr-2.5 pl-1">
                    <span className="h-5 w-5 rounded-full border border-white/10" style={{ background: c }} />
                    <span className="font-mono text-xs text-muted">{c}</span>
                  </span>
                ))}
              </div>
            )}
            {record.notes && <p className={`text-[15px] leading-relaxed whitespace-pre-line ${record.colors.length ? "mt-3" : ""}`}>{record.notes}</p>}
          </div>
        )}

        <div className="flex items-center justify-between pt-3">
          <h2 className="text-lg font-bold">
            {t("stepPhotos")} <span className="text-sm font-normal text-muted">{shotsDone(record)}/{IMAGE_SLOTS.length}</span>
          </h2>
          {items.length > 0 && (
            <a href={`/api/export/photos?id=${record.id}`} download className="flex items-center gap-1.5 text-sm text-accent">
              <IconDownload className="h-4 w-4" /> ZIP
            </a>
          )}
        </div>

        {IMAGE_SLOTS.map((s) => {
          const photos = record.images[s.key].photos;
          const note = record.images[s.key].note;
          return (
            <section key={s.key} className="rounded-2xl bg-surface p-3">
              <div className="flex items-baseline justify-between gap-2">
                <h3 className="font-semibold">{L(s.label)}</h3>
                {photos.length === 0 && <span className="text-xs text-muted">{t("notTaken")}</span>}
              </div>
              {note && <p className="mt-1 text-sm text-muted">{note}</p>}
              {photos.length > 0 && (
                <div className="mt-2 grid grid-cols-3 gap-1.5">
                  {photos.map((p) => {
                    const idx = flatIndex++;
                    return (
                      <button key={p.file} onClick={() => setOpen(idx)} className="relative aspect-square overflow-hidden rounded-xl">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={photoUrl(p.file, "thumb")} alt="" loading="lazy" className="h-full w-full object-cover" />
                        <span className="absolute inset-x-1 bottom-1 flex items-center gap-1 truncate rounded-md bg-black/60 px-1.5 py-0.5 text-[10px]">
                          <IconCamera className="h-3 w-3 shrink-0" />
                          <span className="truncate">{p.by}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </section>
          );
        })}

        <section className="rounded-2xl bg-surface p-4 text-sm">
          <Row label={t("filledBy")} value={`${record.createdBy.name} · G${record.createdBy.group}`} sub={timeAgo(record.createdAt, lang)} />
          <Row label={t("editedBy")} value={`${record.updatedBy.name} · G${record.updatedBy.group}`} sub={timeAgo(record.updatedAt, lang)} />
          {contributors.length > 0 && (
            <div className="border-t border-line py-3">
              <p className="text-muted">{t("takenBy")}</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {contributors.map(([name, grp]) => (
                  <span key={name} className="rounded-full bg-surface-2 px-3 py-1">
                    {name} <GroupBadge group={grp} className="ml-1" />
                  </span>
                ))}
              </div>
            </div>
          )}
          {record.history?.length > 1 && (
            <details className="border-t border-line pt-3">
              <summary className="cursor-pointer text-muted">
                {t("history")} ({record.history.length})
              </summary>
              <ul className="mt-2 space-y-1.5">
                {[...record.history].reverse().map((h, i) => (
                  <li key={i} className="flex justify-between gap-3">
                    <span>
                      {h.by} <span className="text-muted">G{h.group} · {t(h.action)}</span>
                    </span>
                    <span className="shrink-0 text-muted">{timeAgo(h.at, lang)}</span>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </section>

        <button onClick={del} disabled={deleting} className="btn-danger w-full">
          <IconTrash /> {t("delete")}
        </button>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 bg-gradient-to-t from-background via-background to-transparent px-4 pt-6 pb-safe">
        <div className="mx-auto max-w-2xl">
          <Link href={`/r/${record.id}/edit`} className="btn-primary w-full">
            {t("edit")}
          </Link>
        </div>
      </div>

      {open !== null && items[open] && <Lightbox items={items} index={open} onClose={() => setOpen(null)} />}
    </main>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-surface p-4">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1 font-semibold leading-snug">{value}</p>
    </div>
  );
}

function Row({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-line py-3 first:pt-0">
      <span className="text-muted">{label}</span>
      <span className="text-right">
        <span className="block font-medium">{value}</span>
        <span className="block text-xs text-muted">{sub}</span>
      </span>
    </div>
  );
}
