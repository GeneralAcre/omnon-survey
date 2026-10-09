"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useMemo, useState } from "react";
import { GROUPS, IMAGE_SLOTS, allPhotos, functionLabel, groupColor, groupOf, typeLabel, type SurveyRecord } from "@/lib/schema";
import { setLang, setUser, timeAgo, useT, useUser } from "./app-state";
import { useRecords } from "./data";
import { photoUrl } from "./images";
import { IconDownload, IconImage, IconPin, IconPlus, IconSearch, IconUser } from "./Icons";
import AreaHero from "./AreaHero";
import { GroupBadge } from "./GroupBadge";
import PhotoFeed from "./PhotoFeed";
import Sheet from "./Sheet";

// Leaflet touches `window`, so the map only loads in the browser.
const PlacesMap = dynamic(() => import("./PlacesMap"), {
  ssr: false,
  loading: () => <div className="h-[62dvh] animate-pulse rounded-3xl bg-surface" />,
});

type Filter = "all" | "mine" | "1" | "2" | "3";
type View = "list" | "photos" | "map";

export default function RecordList() {
  const { t, L, lang } = useT();
  const user = useUser()!;
  const { records, error, reload } = useRecords();
  const [filter, setFilter] = useState<Filter>("all");
  const [view, setView] = useState<View>("list");
  const [query, setQuery] = useState("");
  const [menu, setMenu] = useState(false);
  const [exporting, setExporting] = useState(false);

  const isMine = (r: SurveyRecord) => r.createdBy.name === user.name || allPhotos(r).some((p) => p.by === user.name);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (records ?? [])
      .filter((r) => (filter === "all" ? true : filter === "mine" ? isMine(r) : r.group === filter))
      .filter(
        (r) =>
          !q ||
          [r.plotNo, typeLabel(r, "en"), typeLabel(r, "th"), functionLabel(r, "en"), functionLabel(r, "th"), r.createdBy.name, r.updatedBy.name, r.notes, ...allPhotos(r).map((p) => p.by)].some(
            (v) => v.toLowerCase().includes(q),
          ),
      );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [records, filter, query, user.name]);

  const count = (f: Filter) => (records ?? []).filter((r) => (f === "all" ? true : f === "mine" ? isMine(r) : r.group === f)).length;
  const photoCount = visible.reduce((n, r) => n + allPhotos(r).length, 0);
  const placeCount = visible.filter((r) => r.lat != null).length;

  const chips: { id: Filter; label: string; group?: string }[] = [
    { id: "all", label: t("all") },
    ...GROUPS.map((g) => ({ id: g.id as Filter, label: L(g.label), group: g.id })),
    { id: "mine", label: t("mine") },
  ];

  const views: { id: View; label: string; n: number }[] = [
    { id: "list", label: t("viewList"), n: visible.length },
    { id: "photos", label: t("viewPhotos"), n: photoCount },
    { id: "map", label: t("viewMap"), n: placeCount },
  ];

  const me = groupColor(user.group);

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 pb-32">
      <div className="px-4 pt-[max(env(safe-area-inset-top),0.75rem)] sm:pt-[max(env(safe-area-inset-top),1rem)]">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold tracking-widest text-accent uppercase">Khlong Om Non</p>
            <h1 className="text-2xl font-bold">{t("records")}</h1>
          </div>
          <button
            onClick={() => setMenu(true)}
            className="flex items-center gap-2 rounded-full border border-line bg-surface py-1.5 pr-3 pl-1.5"
            aria-label={t("switchUser")}
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold" style={{ background: me.bg, color: me.fg }}>
              {user.name.slice(0, 1).toUpperCase()}
            </span>
            <span className="max-w-[7rem] truncate text-sm">{user.name}</span>
            <GroupBadge group={user.group} />
          </button>
        </div>

        <div className="mt-3 sm:mt-4">
          <AreaHero myGroup={user.group} />
        </div>
      </div>

      <div className="sticky top-0 z-20 bg-background/85 px-4 pt-3 pb-3 backdrop-blur-xl">
        <div className="grid grid-cols-3 gap-1 rounded-2xl bg-surface p-1">
          {views.map((v) => (
            <button
              key={v.id}
              onClick={() => setView(v.id)}
              className={`min-h-11 rounded-xl px-1 py-2 text-sm font-semibold transition ${view === v.id ? "bg-foreground text-background" : "text-muted"}`}
            >
              {v.label}
              <span className={`ml-1 font-normal ${view === v.id ? "text-background/50" : "text-muted/70"}`}>{records ? v.n : ""}</span>
            </button>
          ))}
        </div>

        <div className="no-scrollbar -mx-4 mt-3 flex gap-2 overflow-x-auto px-4">
          {chips.map((c) => {
            const active = filter === c.id;
            const col = c.group ? groupColor(c.group) : null;
            return (
              <button
                key={c.id}
                onClick={() => setFilter(c.id)}
                className={`flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition ${
                  active && !col ? "bg-foreground text-background" : active ? "" : "bg-surface-2 text-foreground"
                }`}
                style={active && col ? { background: col.bg, color: col.fg } : undefined}
              >
                {col && !active && <span className="h-2.5 w-2.5 rounded-full" style={{ background: col.bg }} />}
                {c.label}
                <span className="opacity-60">{records ? count(c.id) : ""}</span>
              </button>
            );
          })}
        </div>

        {view !== "map" && (
          <div className="relative mt-3">
            <IconSearch className="pointer-events-none absolute top-1/2 left-4 h-5 w-5 -translate-y-1/2 text-muted" />
            <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("search")} className="field py-3 pl-11" />
          </div>
        )}
      </div>

      <div className="px-4">
        {error && (
          <div className="mt-2 flex items-center justify-between rounded-2xl bg-red-500/10 p-4 text-sm text-red-300">
            {t("loadError")}
            <button onClick={reload} className="font-semibold underline">
              {t("retry")}
            </button>
          </div>
        )}
        {records === null && !error && <p className="py-16 text-center text-muted">{t("loading")}</p>}

        {records && view === "list" && (
          <>
            {visible.length === 0 && <p className="py-16 text-center text-muted">{records.length === 0 ? t("empty") : t("noMatch")}</p>}
            <ul className="mt-1 space-y-2">
              {visible.map((r) => (
                <li key={r.id}>
                  <Card r={r} />
                </li>
              ))}
            </ul>
          </>
        )}
        {records && view === "photos" && <PhotoFeed records={visible} />}
        {records && view === "map" && <PlacesMap records={visible} noPlaceLabel={t("noPlace")} />}
      </div>

      <Link
        href="/new"
        className="fixed right-5 bottom-[max(env(safe-area-inset-bottom),1.25rem)] z-30 flex h-16 items-center gap-2 rounded-full bg-foreground pr-6 pl-5 font-semibold text-background shadow-[0_8px_30px_rgba(0,0,0,0.6)] active:scale-95"
      >
        <IconPlus className="h-6 w-6" />
        {t("newRecord")}
      </Link>

      <Sheet open={menu} onClose={() => setMenu(false)}>
        <div className="flex items-center gap-3 pb-4">
          <span className="flex h-12 w-12 items-center justify-center rounded-full text-lg font-bold" style={{ background: me.bg, color: me.fg }}>
            {user.name.slice(0, 1).toUpperCase()}
          </span>
          <div>
            <p className="font-semibold">{user.name}</p>
            <p className="text-sm text-muted">
              {L(groupOf(user.group)!.label)} · {L(groupOf(user.group)!.zone)}
            </p>
          </div>
        </div>
        <div className="divide-y divide-line border-t border-line">
          <MenuItem onClick={() => { setMenu(false); setUser(null); }} icon={<IconUser />}>{t("switchUser")}</MenuItem>
          <MenuItem onClick={() => setLang(lang === "en" ? "th" : "en")} icon={<span className="w-5 text-center text-sm">ก</span>}>
            {t("language")}
          </MenuItem>
          <MenuItem onClick={() => { setMenu(false); setExporting(true); }} icon={<IconDownload />}>{t("export")}</MenuItem>
          <Link href="/about" className="flex min-h-14 items-center gap-3 text-[15px]">
            <IconImage /> {t("about")}
          </Link>
        </div>
      </Sheet>

      <ExportSheet open={exporting} onClose={() => setExporting(false)} defaultGroup={user.group} />
    </main>
  );
}

function MenuItem({ onClick, icon, children }: { onClick: () => void; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className="flex min-h-14 w-full items-center gap-3 text-left text-[15px]">
      {icon}
      {children}
    </button>
  );
}

function Card({ r }: { r: SurveyRecord }) {
  const { t, lang } = useT();
  const cover = r.images.front?.photos[0] ?? allPhotos(r)[0];
  const type = typeLabel(r, lang);
  const fn = functionLabel(r, lang);
  const c = groupColor(r.group);
  return (
    <Link href={`/r/${r.id}`} className="relative flex gap-3 overflow-hidden rounded-2xl bg-surface p-2.5 pl-3.5 active:bg-surface-2">
      <span className="absolute inset-y-0 left-0 w-1" style={{ background: c.bg }} />
      <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-surface-2">
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photoUrl(cover.file, "thumb")} alt="" loading="lazy" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted">
            <IconImage className="h-6 w-6" />
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1 py-0.5">
        <div className="flex items-center gap-2">
          <span className="truncate text-lg font-bold">{r.plotNo}</span>
          <GroupBadge group={r.group} />
          {r.lat != null && <IconPin className="h-4 w-4 shrink-0 text-muted" />}
        </div>
        <p className="truncate text-sm text-foreground/80">{[type, fn].filter(Boolean).join(" · ") || t("notSet")}</p>
        <div className="mt-1.5 flex items-center gap-2">
          <div className="flex gap-0.5">
            {IMAGE_SLOTS.map((s) => (
              <span
                key={s.key}
                className="h-1.5 w-2.5 rounded-full"
                style={{ background: r.images[s.key]?.photos.length ? c.bg : "var(--line)" }}
              />
            ))}
          </div>
          <span className="text-xs text-muted">{allPhotos(r).length} 📷</span>
        </div>
        <p className="mt-1 truncate text-xs text-muted">
          {t("by")} {r.updatedBy.name} · {timeAgo(r.updatedAt, lang)}
        </p>
      </div>
    </Link>
  );
}

function ExportSheet({ open, onClose, defaultGroup }: { open: boolean; onClose: () => void; defaultGroup: string }) {
  const { t } = useT();
  const [group, setGroup] = useState(defaultGroup);
  const q = group ? `group=${group}` : "";
  const items = [
    { href: `/api/export/photos?${q}`, title: t("exportZip"), sub: t("exportZipSub") },
    { href: `/api/export?format=csv&${q}`, title: t("exportCsv"), sub: t("exportCsvSub") },
    { href: `/api/export?format=json&${q}`, title: t("exportJson"), sub: "" },
  ];
  return (
    <Sheet open={open} onClose={onClose}>
      <h2 className="text-xl font-bold">{t("exportTitle")}</h2>
      <p className="mt-4 text-sm text-muted">{t("exportScope")}</p>
      <div className="no-scrollbar mt-2 flex gap-2 overflow-x-auto">
        {[{ id: "", label: t("all") }, ...GROUPS.map((g) => ({ id: g.id, label: `G${g.id}` }))].map((g) => {
          const col = g.id ? groupColor(g.id) : null;
          const active = group === g.id;
          return (
            <button
              key={g.id}
              onClick={() => setGroup(g.id)}
              className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold ${active && !col ? "bg-foreground text-background" : active ? "" : "bg-surface-2"}`}
              style={active && col ? { background: col.bg, color: col.fg } : undefined}
            >
              {g.label}
            </button>
          );
        })}
      </div>
      <div className="mt-4 space-y-2 pb-2">
        {items.map((i) => (
          <a key={i.title} href={i.href} download className="flex items-center gap-3 rounded-2xl bg-surface-2 p-4 active:opacity-80">
            <IconDownload className="h-5 w-5 shrink-0 text-accent" />
            <span>
              <span className="block font-semibold">{i.title}</span>
              {i.sub && <span className="block text-sm text-muted">{i.sub}</span>}
            </span>
          </a>
        ))}
      </div>
    </Sheet>
  );
}
