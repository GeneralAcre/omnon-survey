"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { buttonVariants } from "@/components/ui/button";
import { GROUPS, allPhotos } from "@/lib/schema";
import { plotOf } from "@/lib/study-area";
import { cn } from "@/lib/utils";
import { useT } from "./app-state";
import { useRecords } from "./data";
import { GroupBadge } from "./GroupBadge";
import { IconNext, IconPlus } from "./Icons";
import { photoUrl, retryImage } from "./images";
import { LangToggle } from "./Shell";
import omnon from "@/public/omnon.jpg";

// Compact pills, like the top bar of an editorial site; still a comfortable tap.
const pill = "h-11 rounded-full px-5 text-sm font-semibold";
const wrap = "mx-auto w-full max-w-6xl px-5 sm:px-8";
const eyebrow = "text-xs font-semibold tracking-[0.2em] text-brand uppercase";

// Leaflet touches `window`, so the map only loads in the browser.
const StudyMap = dynamic(() => import("./StudyMap"), {
  ssr: false,
  loading: () => <div className="aspect-[4/3] w-full animate-pulse rounded-3xl bg-background lg:aspect-[3/2]" />,
});

// The public showcase. The working list of buildings lives on /survey.
export default function Landing() {
  const { t, L } = useT();
  const { records } = useRecords();
  const all = records ?? [];
  const [zone, setZone] = useState<string>();

  const stats = [
    { label: t("records"), n: all.length },
    { label: t("viewPhotos"), n: all.reduce((n, r) => n + allPhotos(r).length, 0) },
    { label: t("statMapped"), n: all.filter((r) => r.lat != null || plotOf(r).length > 0).length },
    { label: t("statSurveyors"), n: new Set(all.flatMap((r) => [r.createdBy.name, ...allPhotos(r).map((p) => p.by)])).size },
  ];

  // One cover per building, newest first (records arrive sorted by last update).
  const recent = all
    .map((r) => ({ r, cover: r.images.front?.photos[0] ?? allPhotos(r)[0] }))
    .filter((x) => x.cover)
    .slice(0, 8);

  return (
    <main className="flex-1">
      <nav className="sticky top-0 z-30 border-b border-transparent bg-background/80 pt-[env(safe-area-inset-top)] backdrop-blur-xl">
        <div className={cn(wrap, "flex h-16 items-center justify-between gap-3")}>
          <Link href="/" className="text-[17px] tracking-tight">
            <span>
              khlong <span className="font-semibold">om non</span>
            </span>
          </Link>
          <div className="hidden items-center gap-7 text-sm text-foreground/75 md:flex">
            <Link href="/survey" className="hover:text-foreground">
              {t("records")}
            </Link>
            <a href="#zones" className="hover:text-foreground">
              {L({ en: "Zones", th: "โซน" })}
            </a>
            <Link href="/about" className="hover:text-foreground">
              {t("about")}
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <LangToggle />
            <Link href="/survey" className={cn(buttonVariants(), pill, "hidden sm:inline-flex")}>
              {t("openSurvey")}
            </Link>
          </div>
        </div>
      </nav>

      <section className="relative isolate min-h-[32rem] overflow-hidden bg-foreground text-white sm:min-h-[38rem] lg:min-h-[min(78svh,52rem)]">
        <Image src={omnon} alt="The canal landscape of Khlong Om Non" fill priority sizes="100vw" placeholder="blur" className="-z-20 object-cover object-[center_60%]" />
        <div aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-t from-black/80 via-black/15 to-black/10" />
        <div className={cn(wrap, "flex min-h-[32rem] flex-col justify-end pb-10 pt-16 sm:min-h-[38rem] sm:pb-14 lg:min-h-[min(78svh,52rem)] lg:pb-16")}>
          <p className="mb-4 text-xs font-semibold tracking-[0.22em] text-white/80 uppercase">Adaptive futures for Khlong Om Non</p>
          <h1 className="max-w-5xl font-display text-6xl leading-[0.92] text-white sm:text-7xl lg:text-9xl">Fluid Heritage</h1>
        </div>
      </section>

      <section className={cn(wrap, "grid gap-7 py-9 sm:py-12 md:grid-cols-[minmax(0,1fr)_minmax(0,24rem)] md:items-center md:gap-12 lg:py-16")}>
        <p className="max-w-3xl text-xl leading-snug tracking-tight sm:text-2xl">
          A field study along the water.
        </p>
        <div>
          <p className="text-[15px] leading-relaxed text-muted-foreground">
            {L({
              en: "An architectural field study of a 17.5 km cultural landscape shaped by water, settlement and everyday life.",
              th: "An architectural field study of a 17.5 km cultural landscape shaped by water, settlement and everyday life.",
            })}
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Link href="/survey" className={cn(buttonVariants(), pill, "gap-2")}>
              {t("openSurvey")}
              <IconNext className="size-4" />
            </Link>
            <Link href="/about" className={cn(buttonVariants({ variant: "secondary" }), pill)}>
              {t("about")}
            </Link>
          </div>
        </div>
      </section>

      {/* The partners, set like a logo strip. */}
      <div className="border-y border-border">
        <div className={cn(wrap, "flex flex-wrap items-center justify-center gap-x-10 gap-y-3 py-5 text-muted-foreground sm:justify-between")}>
          <span className="text-xs tracking-[0.2em] uppercase">{L({ en: "In collaboration", th: "ความร่วมมือ" })}</span>
          <span className="text-lg font-semibold tracking-tight">Xi&apos;an University of Architecture and Technology</span>
          <span className="text-lg font-semibold tracking-tight">Chulalongkorn University</span>
        </div>
      </div>

      {/* The survey so far, live from the database. */}
      <section className={cn(wrap, "py-16 sm:py-24")}>
        <p className={eyebrow}>{L({ en: "The survey so far", th: "ผลการสำรวจจนถึงตอนนี้" })}</p>
        <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-10 lg:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="flex flex-col-reverse gap-2 border-t border-border pt-5">
              <dt className="text-sm text-muted-foreground">{s.label}</dt>
              <dd className="font-display text-5xl leading-none tabular-nums sm:text-6xl">{records ? s.n.toLocaleString() : "–"}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* The three zones beside the study-area map. */}
      <section id="zones" className="scroll-mt-20 bg-card py-16 sm:py-24">
        <div className={cn(wrap, "grid gap-10 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:items-center lg:gap-14")}>
          <StudyMap records={all} zone={zone} className="aspect-[4/3] lg:aspect-[3/2]" />
          <div>
            <p className={eyebrow}>{t("studyArea")}</p>
            <h2 className="mt-3 font-display text-4xl leading-tight sm:text-5xl">{L({ en: "Three zones along the canal", th: "สามโซนริมคลอง" })}</h2>
            <ol className="mt-8 space-y-3">
              {GROUPS.map((g) => (
                <li key={g.id}>
                  <button
                    type="button"
                    onClick={() => setZone(zone === g.id ? undefined : g.id)}
                    aria-pressed={zone === g.id}
                    className="flex w-full items-center gap-4 rounded-2xl border-2 border-transparent bg-background p-4 text-left transition hover:border-border aria-pressed:border-foreground"
                  >
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-lg font-bold" style={{ background: g.color, color: g.ink }}>
                      {g.id}
                    </span>
                    <span>
                      <span className="block font-semibold">{L(g.label)}</span>
                      <span className="block text-sm text-muted-foreground">{L(g.zone)}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {recent.length > 0 && (
        <section className={cn(wrap, "py-16 sm:py-24")}>
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className={eyebrow}>{L({ en: "From the field", th: "จากภาคสนาม" })}</p>
              <h2 className="mt-3 font-display text-4xl leading-tight sm:text-5xl">{L({ en: "Recently documented", th: "บันทึกล่าสุด" })}</h2>
            </div>
            <Link href="/survey" className="hidden shrink-0 items-center gap-1 text-sm font-semibold hover:underline sm:flex">
              {t("openSurvey")} <IconNext className="size-4" />
            </Link>
          </div>
          <ul className="mt-8 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            {recent.map(({ r, cover }) => (
              <li key={r.id}>
                <Link href={`/r/${r.id}`} className="group block">
                  <div className="aspect-[4/5] overflow-hidden rounded-2xl bg-card">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={photoUrl(cover!.file, "thumb")}
                      onError={retryImage}
                      alt=""
                      loading="lazy"
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]"
                    />
                  </div>
                  <div className="mt-2.5 flex items-center gap-2">
                    <span className="font-semibold">{r.plotNo}</span>
                    <GroupBadge group={r.group} />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* A taste of the history, with the full timeline on /about. */}
      <section className="border-t border-border">
        <div className={cn(wrap, "grid gap-6 py-16 sm:py-24 md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] md:gap-14")}>
          <p className="font-display text-7xl leading-none text-brand sm:text-8xl">1636</p>
          <div>
            <h2 className="font-display text-3xl leading-tight sm:text-4xl">{L({ en: "A river that became a canal", th: "แม่น้ำที่กลายเป็นคลอง" })}</h2>
            <p className="mt-4 text-[15px] leading-relaxed text-muted-foreground sm:text-base">
              {L({
                en: "Khlong Om Non was once the main course of the Chao Phraya. When a shortcut was dug across its meander, the river moved on, and the old bend became a 17.5 km cultural landscape of temples, orchards and riverside houses.",
                th: "คลองอ้อมนนท์เคยเป็นเส้นทางหลักของแม่น้ำเจ้าพระยา เมื่อมีการขุดคลองลัดตัดคุ้งน้ำ แม่น้ำจึงเปลี่ยนเส้นทาง และคุ้งเดิมกลายเป็นภูมิทัศน์วัฒนธรรมยาว 17.5 กม. ที่เต็มไปด้วยวัด สวนผลไม้ และเรือนริมน้ำ",
              })}
            </p>
            <Link href="/about" className="mt-5 inline-flex items-center gap-1 text-sm font-semibold hover:underline">
              {L({ en: "Read the full timeline", th: "อ่านลำดับเหตุการณ์ทั้งหมด" })} <IconNext className="size-4" />
            </Link>
          </div>
        </div>
      </section>

      <section className={cn(wrap, "pb-16 sm:pb-24")}>
        <div className="flex flex-col items-start gap-6 rounded-3xl bg-foreground p-8 text-background sm:p-12 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="font-display text-3xl leading-tight sm:text-4xl">{L({ en: "Help document Khlong Om Non", th: "ร่วมบันทึกคลองอ้อมนนท์" })}</h2>
            <p className="mt-2 text-background/70">
              {L({
                en: "Add a building with its photos, colours, flood lines and location.",
                th: "เพิ่มอาคาร พร้อมภาพถ่าย สี ระดับน้ำท่วม และตำแหน่ง",
              })}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/new" className={cn(buttonVariants({ variant: "secondary" }), pill, "gap-2")}>
              <IconPlus className="size-4" />
              {t("newRecord")}
            </Link>
            <Link href="/survey" className={cn(pill, "inline-flex items-center border border-background/30 hover:bg-background/10")}>
              {t("openSurvey")}
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-border">
        <div className={cn(wrap, "flex flex-col gap-2 py-8 pb-safe text-sm text-muted-foreground sm:flex-row sm:justify-between")}>
          <span>Fluid Heritage · Khlong Om Non Workshop</span>
          <span>XAUAT × Chulalongkorn University</span>
        </div>
      </footer>
    </main>
  );
}
