"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Alert, AlertAction, AlertDescription } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";
import { GROUPS, IMAGE_SLOTS, allPhotos, functionLabel, groupColor, groupOf, shotsDone, typeLabel, type SurveyRecord } from "@/lib/schema";
import { zipParts } from "@/lib/naming";
import { plotOf } from "@/lib/study-area";
import { setUser, timeAgo, useT, useUser } from "./app-state";
import { useRecords } from "./data";
import { photoUrl, retryImage } from "./images";
import { IconCamera, IconDownload, IconImage, IconPin, IconPlus, IconSearch, IconUser } from "./Icons";
import AreaHero from "./AreaHero";
import { GroupBadge } from "./GroupBadge";
import PhotoFeed from "./PhotoFeed";
import { LangToggle } from "./Shell";

// Leaflet touches `window`, so the map only loads in the browser.
const StudyMap = dynamic(() => import("./StudyMap"), {
  ssr: false,
  loading: () => <div className="h-[62dvh] lg:h-[72dvh] animate-pulse rounded-3xl bg-card" />,
});

type Filter = "all" | "mine" | "1" | "2" | "3";
type View = "list" | "photos" | "map";

export default function RecordList() {
  const { t, L } = useT();
  const user = useUser()!;
  const [fresh, setFresh] = useState<Set<string>>(new Set());
  const onArrive = useCallback(
    (arrived: SurveyRecord[]) => {
      const others = arrived.filter((r) => r.createdBy.name !== user.name);
      if (!others.length) return;
      const ids = others.map((r) => r.id);
      others.slice(0, 3).forEach((r) =>
        toast.custom(() => <ArrivalToast r={r} justAdded={t("justAdded")} />, { id: r.id, duration: 7000 }),
      );
      setFresh((set) => new Set([...set, ...ids]));
      setTimeout(() => setFresh((set) => new Set([...set].filter((id) => !ids.includes(id)))), 20000);
    },
    [user.name, t],
  );
  const { records, error, reload } = useRecords({ live: true, onArrive });
  const [filter, setFilter] = useState<Filter>("all");
  const [view, setView] = useState<View>("list");
  const [query, setQuery] = useState("");
  const [exporting, setExporting] = useState(false);
  const results = useRef<HTMLDivElement>(null);

  const openMap = () => {
    setView("map");
    results.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

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
  // On the map: matched to a plot of the study area, or pinned by GPS.
  const onMap = (r: SurveyRecord) => r.lat != null || plotOf(r).length > 0;
  const placeCount = visible.filter(onMap).length;

  // The chip row scrolls sideways if "Zone 1…3" don't all fit.
  const chips: { id: Filter; label: string; name: string; group?: string }[] = [
    { id: "all", label: t("all"), name: t("all") },
    ...GROUPS.map((g) => ({ id: g.id as Filter, label: L(g.label), name: L(g.label), group: g.id })),
    { id: "mine", label: t("mine"), name: t("mine") },
  ];

  const views: { id: View; label: string; n: number }[] = [
    { id: "list", label: t("viewList"), n: visible.length },
    { id: "photos", label: t("viewPhotos"), n: photoCount },
    { id: "map", label: t("viewMap"), n: placeCount },
  ];

  const me = groupColor(user.group);

  // Whole-survey totals, whatever the filter, for the headline numbers.
  const all = records ?? [];
  const stats = [
    { label: t("records"), n: all.length },
    { label: t("viewPhotos"), n: all.reduce((n, r) => n + allPhotos(r).length, 0) },
    { label: t("statMapped"), n: all.filter(onMap).length },
    { label: t("statSurveyors"), n: new Set(all.flatMap((r) => [r.createdBy.name, ...allPhotos(r).map((p) => p.by)])).size },
  ];

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 pb-32">
      <div className="px-4 pt-[env(safe-area-inset-top)] sm:px-6 lg:px-8">
        <nav className="flex h-16 items-center justify-between gap-3">
          <Link href="/" className="flex items-center gap-2 text-[17px] tracking-tight">
            <span>
              khlong <span className="font-semibold">om non</span>
            </span>
          </Link>
          <LangToggle />
        </nav>

        <div className="mt-4 flex items-end justify-between gap-3 sm:mt-6">
          <div className="min-w-0">
            <p className="text-xs font-semibold tracking-widest text-brand uppercase">Khlong Om Non · Field survey</p>
            <h1 className="mt-1 flex items-center gap-3 font-display text-4xl leading-none sm:text-5xl">
              {t("records")}
              <span className="flex items-center gap-1 rounded-full bg-ok/10 px-2 py-0.5 font-sans text-[11px] font-semibold tracking-normal text-ok">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-ok" />
                {t("live")}
              </span>
            </h1>
          </div>
          <Button variant="secondary" onClick={() => setExporting(true)} className="h-11 shrink-0 gap-2 rounded-full px-4 font-semibold" aria-label={t("export")} title={t("export")}>
            <IconDownload className="size-5" />
            <span className="hidden sm:inline">{t("export")}</span>
          </Button>
        </div>

        {/* Wide screens: the tiles stretch to the map's height so the two halves line up. */}
        <div className="mt-3 grid gap-3 sm:mt-4 lg:grid-cols-2 lg:gap-4">
          <div className="flex flex-col gap-3 lg:gap-4">
            <dl className="grid grid-cols-4 gap-2 lg:flex-1 lg:grid-cols-2 lg:grid-rows-2 lg:gap-4">
              {stats.map((s) => (
                // Label first for <dl> order; shown under the number.
                <div key={s.label} className="flex min-w-0 flex-col-reverse justify-between rounded-2xl border border-border bg-card px-3 py-2.5 lg:px-6 lg:py-5">
                  <dt className="truncate text-[11px] text-muted-foreground sm:text-xs lg:text-sm">{s.label}</dt>
                  <dd className="font-display text-3xl leading-none tabular-nums sm:text-4xl lg:text-6xl">{records ? s.n.toLocaleString() : "–"}</dd>
                </div>
              ))}
            </dl>

        {/* Who is signed in, with the way back to the sign-in screen in plain sight. */}
        <div className="flex items-center gap-3 rounded-2xl border border-border bg-card py-2 pr-2 pl-2.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold" style={{ background: me.bg, color: me.fg }}>
            {user.name.slice(0, 1).toUpperCase()}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] text-muted-foreground">{t("surveyingAs")}</p>
            <p className="flex items-center gap-1.5 text-sm font-semibold">
              <span className="truncate">{user.name}</span>
              <GroupBadge group={user.group} className="shrink-0" />
            </p>
          </div>
          <Button variant="secondary" onClick={() => setUser(null)} className="h-9 shrink-0 gap-1.5 rounded-full px-3">
            <IconUser className="size-4" />
            {t("switchUser")}
          </Button>
        </div>
          </div>

          <AreaHero records={all} onOpen={openMap} />
        </div>
      </div>

      <div ref={results} className="sticky top-0 z-20 scroll-mt-0 bg-background/85 px-4 pt-3 pb-3 backdrop-blur-xl sm:px-6 lg:px-8">
        <div className="md:flex md:items-center md:gap-3">
        <ToggleGroup
          aria-label={t("viewList")}
          value={[view]}
          onValueChange={(v) => v[0] && setView(v[0] as View)}
          spacing={1}
          className="grid w-full grid-cols-3 rounded-2xl bg-card p-1 md:w-[26rem] md:shrink-0"
        >
          {views.map((v) => (
            <ToggleGroupItem
              key={v.id}
              value={v.id}
              className="group/view h-auto min-h-11 rounded-xl px-1 py-2 font-semibold text-muted-foreground aria-pressed:bg-foreground aria-pressed:text-background hover:aria-pressed:bg-foreground"
            >
              {v.label}
              <span className="font-normal text-muted-foreground/70 group-aria-pressed/view:text-background/50">{records ? v.n : ""}</span>
            </ToggleGroupItem>
          ))}
        </ToggleGroup>

        {view !== "map" && (
          <div className="relative mt-3 md:mt-0 md:flex-1">
            <IconSearch className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted-foreground" />
            <Input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("search")} className="h-12 rounded-2xl bg-card pr-4 pl-11" />
          </div>
        )}
        </div>

        <ToggleGroup
          value={[filter]}
          onValueChange={(v) => v[0] && setFilter(v[0] as Filter)}
          className="no-scrollbar -mx-4 mt-3 flex w-auto gap-1.5 overflow-x-auto px-4"
        >
          {chips.map((c) => {
            const active = filter === c.id;
            const col = c.group ? groupColor(c.group) : null;
            return (
              <ToggleGroupItem
                key={c.id}
                value={c.id}
                aria-label={c.name}
                className={cn(
                  "h-auto gap-1.5 rounded-full px-3 py-2",
                  active && !col ? "bg-foreground text-background aria-pressed:bg-foreground hover:bg-foreground hover:text-background" : active ? "" : "bg-secondary text-foreground",
                )}
                style={active && col ? { background: col.bg, color: col.fg } : undefined}
              >
                {col && !active && <span className="h-2.5 w-2.5 rounded-full" style={{ background: col.bg }} />}
                {c.label}
                <span className="opacity-60">{records ? count(c.id) : ""}</span>
              </ToggleGroupItem>
            );
          })}
        </ToggleGroup>
      </div>

      <div className="px-4 sm:px-6 lg:px-8">
        {error && (
          <Alert variant="destructive" className="mt-2 rounded-2xl">
            <AlertDescription>{t("loadError")}</AlertDescription>
            <AlertAction>
              <Button variant="link" size="sm" onClick={reload} className="text-destructive">
                {t("retry")}
              </Button>
            </AlertAction>
          </Alert>
        )}
        {records === null && !error && <p className="py-16 text-center text-muted-foreground">{t("loading")}</p>}

        {records && view === "list" && (
          <>
            {visible.length === 0 && <p className="py-16 text-center text-muted-foreground">{records.length === 0 ? t("empty") : t("noMatch")}</p>}
            <ul className="mt-1 grid gap-2 md:grid-cols-2 md:gap-3 xl:grid-cols-3">
              {visible.map((r) => (
                <li key={r.id}>
                  <Card r={r} highlight={fresh.has(r.id)} />
                </li>
              ))}
            </ul>
          </>
        )}
        {records && view === "photos" && <PhotoFeed records={visible} />}
        {records && view === "map" && <StudyMap records={visible} zone={GROUPS.some((g) => g.id === filter) ? filter : undefined} />}
      </div>

      <Link
        href="/new"
        className={cn(
          buttonVariants({ size: "xl" }),
          "fixed right-5 bottom-[max(env(safe-area-inset-bottom),1.25rem)] z-30 h-16 pr-6 pl-5 text-base shadow-[0_8px_30px_rgba(0,0,0,0.15)] active:scale-95",
        )}
      >
        <IconPlus />
        {t("newRecord")}
      </Link>

      <ExportSheet open={exporting} onClose={() => setExporting(false)} defaultGroup={user.group} records={records ?? []} />
    </main>
  );
}

// Pops in (via sonner) when another surveyor adds a building.
function ArrivalToast({ r, justAdded }: { r: SurveyRecord; justAdded: string }) {
  const c = groupColor(r.group);
  const cover = r.images.front?.photos[0] ?? allPhotos(r)[0];
  return (
    <Link
      href={`/r/${r.id}`}
      className="flex w-full items-center gap-3 rounded-2xl border border-border bg-secondary/95 p-2 pr-4 shadow-[0_10px_30px_rgba(0,0,0,0.15)] backdrop-blur"
      style={{ borderLeft: `4px solid ${c.bg}` }}
    >
      <span className="h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-card">
        {cover && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photoUrl(cover.file, "thumb")} onError={retryImage} alt="" className="h-full w-full object-cover" />
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5 text-sm font-semibold">
          {r.plotNo} <GroupBadge group={r.group} />
        </span>
        <span className="block truncate text-xs text-muted-foreground">
          {r.createdBy.name} · {justAdded}
        </span>
      </span>
    </Link>
  );
}

function Card({ r, highlight = false }: { r: SurveyRecord; highlight?: boolean }) {
  const { t, lang } = useT();
  const cover = r.images.front?.photos[0] ?? allPhotos(r)[0];
  const type = typeLabel(r, lang);
  const fn = functionLabel(r, lang);
  const c = groupColor(r.group);
  return (
    <Link
      href={`/r/${r.id}`}
      className={`relative flex h-full gap-3 overflow-hidden rounded-2xl border border-transparent bg-card p-2.5 pl-3.5 transition duration-300 hover:border-border hover:bg-secondary/60 active:bg-secondary ${highlight ? "ring-2" : ""}`}
      style={highlight ? ({ "--tw-ring-color": groupColor(r.group).bg } as React.CSSProperties) : undefined}
    >
      <span className="absolute inset-y-0 left-0 w-1" style={{ background: c.bg }} />
      <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-secondary">
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photoUrl(cover.file, "thumb")} onError={retryImage} alt="" loading="lazy" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted-foreground">
            <IconImage className="size-6" />
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1 py-0.5">
        <div className="flex items-center gap-2">
          <span className="truncate text-lg font-bold">{r.plotNo}</span>
          <GroupBadge group={r.group} />
          {r.lat != null && <IconPin className="size-4 shrink-0 text-muted-foreground" />}
        </div>
        <p className="truncate text-sm text-foreground/80">{[type, fn].filter(Boolean).join(" · ") || t("notSet")}</p>
        <div className="mt-1.5 flex items-center gap-2 text-xs text-muted-foreground">
          <div className="flex gap-0.5" aria-hidden="true">
            {IMAGE_SLOTS.map((s) => (
              <span
                key={s.key}
                className="h-1.5 w-2.5 rounded-full"
                style={{ background: r.images[s.key]?.photos.length ? c.bg : "var(--border)" }}
              />
            ))}
          </div>
          <span className="shrink-0">
            {shotsDone(r)}/{IMAGE_SLOTS.length} {t("shots")}
          </span>
          <span className="flex shrink-0 items-center gap-1">
            <IconCamera className="size-3.5" />
            {allPhotos(r).length}
          </span>
          {r.colors.length > 0 && (
            <span className="ml-auto flex shrink-0 -space-x-1" aria-label={t("stepColors")}>
              {r.colors.slice(0, 5).map((col) => (
                <span key={col} className="size-3.5 rounded-full ring-2 ring-card" style={{ background: col }} />
              ))}
            </span>
          )}
        </div>
        <p className="mt-1 truncate text-xs text-muted-foreground">
          {t("by")} {r.updatedBy.name} · {timeAgo(r.updatedAt, lang)}
        </p>
      </div>
    </Link>
  );
}

function ExportSheet({ open, onClose, defaultGroup, records }: { open: boolean; onClose: () => void; defaultGroup: string; records: SurveyRecord[] }) {
  const { t, L } = useT();
  const [group, setGroup] = useState(defaultGroup);
  const q = group ? `group=${group}` : "";
  const parts = useMemo(() => zipParts(records.filter((r) => !group || r.group === group)), [records, group]);
  const items = [
    ...(parts.length > 1 ? [] : [{ href: `/api/export/photos?${q}`, title: t("exportZip"), sub: t("exportZipSub") }]),
    { href: `/api/export?format=xlsx&${q}`, title: t("exportXlsx"), sub: t("exportXlsxSub") },
    { href: `/api/export?format=csv&${q}`, title: t("exportCsv"), sub: t("exportCsvSub") },
    { href: `/api/export?format=json&${q}`, title: t("exportJson"), sub: "" },
  ];
  return (
    <Drawer open={open} onOpenChange={(o) => !o && onClose()} showSwipeHandle>
      <DrawerContent className="px-5 pb-safe sm:mx-auto sm:max-w-md">
      <DrawerHeader className="px-0 pt-2 text-left">
        <DrawerTitle className="text-xl font-bold">{t("exportTitle")}</DrawerTitle>
        <DrawerDescription className="mt-3">{t("exportScope")}</DrawerDescription>
      </DrawerHeader>
      {/* "all" stands in for the empty group, which means every group. */}
      <ToggleGroup
        aria-label={t("exportScope")}
        value={[group || "all"]}
        onValueChange={(v) => v[0] && setGroup(v[0] === "all" ? "" : v[0])}
        className="no-scrollbar mt-2 w-full gap-2 overflow-x-auto"
      >
        {[{ id: "", label: t("all") }, ...GROUPS.map((g) => ({ id: g.id, label: L(g.label) }))].map((g) => {
          const col = g.id ? groupColor(g.id) : null;
          const active = group === g.id;
          return (
            <ToggleGroupItem
              key={g.id}
              value={g.id || "all"}
              className={cn(
                "h-auto rounded-full px-4 py-2 font-semibold",
                active && !col ? "bg-foreground text-background aria-pressed:bg-foreground hover:bg-foreground hover:text-background" : active ? "" : "bg-secondary",
              )}
              style={active && col ? { background: col.bg, color: col.fg } : undefined}
            >
              {g.label}
            </ToggleGroupItem>
          );
        })}
      </ToggleGroup>
      <div className="mt-4 space-y-2 pb-2">
        {parts.length > 1 && (
          <div className="rounded-2xl bg-secondary p-4">
            <span className="block font-semibold">{t("exportZip")}</span>
            <span className="block text-sm text-muted-foreground">{t("exportZipSub")}</span>
            <span className="mt-2 block text-sm">{t("exportZipParts")}</span>
            <div className="mt-3 grid max-h-64 grid-cols-2 gap-2 overflow-y-auto">
              {parts.map((p, n) => {
                const plot = (r: SurveyRecord) => (group ? r.plotNo : `${L(groupOf(r.group)?.label ?? { en: r.group, th: r.group })} ${r.plotNo}`);
                return (
                  <a key={n} href={`/api/export/photos?${q}&part=${n + 1}`} download className="flex items-center gap-2 rounded-xl bg-background p-3 active:opacity-80">
                    <IconDownload className="size-4 shrink-0 text-brand" />
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold">{t("part")} {n + 1}/{parts.length}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {plot(p[0])}–{plot(p.at(-1)!)} · {p.reduce((c, r) => c + allPhotos(r).length, 0)} {t("photos")}
                      </span>
                    </span>
                  </a>
                );
              })}
            </div>
          </div>
        )}
        {items.map((i) => (
          <a key={i.title} href={i.href} download className="flex items-center gap-3 rounded-2xl bg-secondary p-4 active:opacity-80">
            <IconDownload className="size-5 shrink-0 text-brand" />
            <span>
              <span className="block font-semibold">{i.title}</span>
              {i.sub && <span className="block text-sm text-muted-foreground">{i.sub}</span>}
            </span>
          </a>
        ))}
      </div>
      </DrawerContent>
    </Drawer>
  );
}
