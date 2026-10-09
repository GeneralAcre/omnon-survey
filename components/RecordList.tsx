"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { Alert, AlertAction, AlertDescription } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";
import { GROUPS, IMAGE_SLOTS, allPhotos, functionLabel, groupColor, groupOf, shotsDone, typeLabel, type SurveyRecord } from "@/lib/schema";
import { setLang, setUser, timeAgo, useT, useUser } from "./app-state";
import { useRecords } from "./data";
import { photoUrl } from "./images";
import { IconCamera, IconDownload, IconImage, IconPin, IconPlus, IconSearch, IconUser } from "./Icons";
import AreaHero from "./AreaHero";
import { GroupBadge } from "./GroupBadge";
import PhotoFeed from "./PhotoFeed";

// Leaflet touches `window`, so the map only loads in the browser.
const PlacesMap = dynamic(() => import("./PlacesMap"), {
  ssr: false,
  loading: () => <div className="h-[62dvh] animate-pulse rounded-3xl bg-card" />,
});

type Filter = "all" | "mine" | "1" | "2" | "3";
type View = "list" | "photos" | "map";

export default function RecordList() {
  const { t, L, lang } = useT();
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

  // Short "G1" labels so all five chips fit on a phone; the full name stays for screen readers.
  const chips: { id: Filter; label: string; name: string; group?: string }[] = [
    { id: "all", label: t("all"), name: t("all") },
    ...GROUPS.map((g) => ({ id: g.id as Filter, label: `G${g.id}`, name: L(g.label), group: g.id })),
    { id: "mine", label: t("mine"), name: t("mine") },
  ];

  const views: { id: View; label: string; n: number }[] = [
    { id: "list", label: t("viewList"), n: visible.length },
    { id: "photos", label: t("viewPhotos"), n: photoCount },
    { id: "map", label: t("viewMap"), n: placeCount },
  ];

  const me = groupColor(user.group);

  return (
    <main id="survey-records" className="mx-auto w-full max-w-2xl flex-1 scroll-mt-4 pb-32">
      <div className="px-4 pt-[max(env(safe-area-inset-top),0.75rem)] sm:pt-[max(env(safe-area-inset-top),1rem)]">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold tracking-widest text-brand uppercase">Khlong Om Non</p>
            <h1 className="flex items-center gap-2 text-2xl font-bold">
              {t("records")}
              <span className="flex items-center gap-1 rounded-full bg-ok/10 px-2 py-0.5 text-[11px] font-semibold text-ok">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-ok" />
                {t("live")}
              </span>
            </h1>
          </div>
          <Button
            variant="outline"
            onClick={() => setMenu(true)}
            className="h-auto gap-2 rounded-full bg-card py-1.5 pr-3 pl-1.5 font-normal"
            aria-label={t("switchUser")}
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold" style={{ background: me.bg, color: me.fg }}>
              {user.name.slice(0, 1).toUpperCase()}
            </span>
            <span className="max-w-[7rem] truncate text-sm">{user.name}</span>
            <GroupBadge group={user.group} />
          </Button>
        </div>

        <div className="mt-3 sm:mt-4">
          <AreaHero myGroup={user.group} />
        </div>
      </div>

      <div className="sticky top-0 z-20 bg-background/85 px-4 pt-3 pb-3 backdrop-blur-xl">
        <ToggleGroup
          aria-label={t("viewList")}
          value={[view]}
          onValueChange={(v) => v[0] && setView(v[0] as View)}
          spacing={1}
          className="grid w-full grid-cols-3 rounded-2xl bg-card p-1"
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

        {view !== "map" && (
          <div className="relative mt-3">
            <IconSearch className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted-foreground" />
            <Input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("search")} className="h-12 rounded-2xl bg-card pr-4 pl-11" />
          </div>
        )}
      </div>

      <div className="px-4">
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
            <ul className="mt-1 space-y-2">
              {visible.map((r) => (
                <li key={r.id}>
                  <Card r={r} highlight={fresh.has(r.id)} />
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
        className={cn(
          buttonVariants({ size: "xl" }),
          "fixed right-5 bottom-[max(env(safe-area-inset-bottom),1.25rem)] z-30 h-16 pr-6 pl-5 text-base shadow-[0_8px_30px_rgba(0,0,0,0.6)] active:scale-95",
        )}
      >
        <IconPlus />
        {t("newRecord")}
      </Link>

      <Drawer open={menu} onOpenChange={setMenu} showSwipeHandle>
        <DrawerContent className="px-5 pb-safe sm:mx-auto sm:max-w-md">
        <DrawerTitle className="sr-only">{t("switchUser")}</DrawerTitle>
        <div className="flex items-center gap-3 pt-2 pb-4">
          <span className="flex h-12 w-12 items-center justify-center rounded-full text-lg font-bold" style={{ background: me.bg, color: me.fg }}>
            {user.name.slice(0, 1).toUpperCase()}
          </span>
          <div>
            <p className="font-semibold">{user.name}</p>
            <p className="text-sm text-muted-foreground">
              {L(groupOf(user.group)!.label)} · {L(groupOf(user.group)!.zone)}
            </p>
          </div>
        </div>
        <Separator />
        <MenuItem onClick={() => { setMenu(false); setUser(null); }} icon={<IconUser />}>{t("switchUser")}</MenuItem>
        <Separator />
        <MenuItem onClick={() => setLang(lang === "en" ? "th" : "en")} icon={<span className="w-5 text-center text-sm">ก</span>}>
          {t("language")}
        </MenuItem>
        <Separator />
        <MenuItem onClick={() => { setMenu(false); setExporting(true); }} icon={<IconDownload />}>{t("export")}</MenuItem>
        <Separator />
        <Link href="/about" className="flex min-h-14 items-center gap-3 text-[15px]">
          <IconImage /> {t("about")}
        </Link>
        </DrawerContent>
      </Drawer>

      <ExportSheet open={exporting} onClose={() => setExporting(false)} defaultGroup={user.group} />
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
      className="flex w-full items-center gap-3 rounded-2xl border border-border bg-secondary/95 p-2 pr-4 shadow-[0_10px_30px_rgba(0,0,0,0.6)] backdrop-blur"
      style={{ borderLeft: `4px solid ${c.bg}` }}
    >
      <span className="h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-card">
        {cover && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photoUrl(cover.file, "thumb")} alt="" className="h-full w-full object-cover" />
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

function MenuItem({ onClick, icon, children }: { onClick: () => void; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <Button variant="ghost" onClick={onClick} className="h-auto min-h-14 w-full justify-start gap-3 rounded-none px-0 text-[15px] font-normal hover:bg-transparent">
      {icon}
      {children}
    </Button>
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
      className={`relative flex gap-3 overflow-hidden rounded-2xl bg-card p-2.5 pl-3.5 transition-shadow duration-700 active:bg-secondary ${highlight ? "ring-2" : ""}`}
      style={highlight ? ({ "--tw-ring-color": groupColor(r.group).bg } as React.CSSProperties) : undefined}
    >
      <span className="absolute inset-y-0 left-0 w-1" style={{ background: c.bg }} />
      <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-secondary">
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photoUrl(cover.file, "thumb")} alt="" loading="lazy" className="h-full w-full object-cover" />
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
        {[{ id: "", label: t("all") }, ...GROUPS.map((g) => ({ id: g.id, label: `G${g.id}` }))].map((g) => {
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
