"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { GROUPS, allPhotos, type SurveyRecord } from "@/lib/schema";
import { cn } from "@/lib/utils";
import { useT } from "./app-state";
import { BOX_PAGE, BuildingBox, SeeMore, box, boxGrid, boxPad } from "./BuildingBox";
import { StatLine, StoryIntro, ThenPhotos, surveyStats } from "./CanalStory";
import { useRecords } from "./data";
import { IconNext, IconPlus } from "./Icons";
import { LangToggle } from "./Shell";
import Timeline from "./Timeline";
import chula from "@/public/Chula.webp";
import omnon from "@/public/omnon.jpg";
import xian from "@/public/XIan.svg";

const wrap = "mx-auto w-full max-w-[96rem] px-5 sm:px-8";
const section = "py-20 sm:py-28";
// The two buttons used across the page: caramel (the one accent) and an outline for the second choice.
const cta =
  "inline-flex h-12 items-center justify-center gap-2 rounded-full bg-primary px-6 text-[15px] font-semibold text-primary-foreground transition hover:brightness-105 active:scale-95";
const ghost = "inline-flex h-12 items-center justify-center gap-1.5 rounded-full border px-6 text-[15px] font-semibold transition active:scale-95";

const THEMES = [
  { en: "Adaptation", th: "การปรับตัว" },
  { en: "Continuity", th: "ความต่อเนื่อง" },
  { en: "Interdisciplinary", th: "สหวิทยาการ" },
];

// Leaflet touches `window`, so the map only loads in the browser.
const StudyMap = dynamic(() => import("./StudyMap"), {
  ssr: false,
  loading: () => <div className="aspect-[4/3] w-full animate-pulse rounded-3xl bg-background lg:aspect-[3/2]" />,
});

// The public showcase, in reading order: the hook, the story, its past, how it happened,
// the place today, the survey's progress, who is behind it, and an invitation to take part.
// The working list of buildings lives on /survey.
export default function Landing() {
  const { t, L } = useT();
  const { records } = useRecords();
  const all = records ?? [];
  const [zone, setZone] = useState<string>();
  // Newest first (records arrive sorted by last update).
  const recent = all.filter((r) => allPhotos(r).length > 0);
  const stats = useMemo(() => surveyStats(records ?? []), [records]);

  return (
    <main className="flex-1">
      <nav className="sticky top-0 z-30 bg-background/85 pt-[env(safe-area-inset-top)] backdrop-blur-xl">
        <div className={cn(wrap, "flex h-16 items-center justify-between gap-3")}>
          <Link href="/" className="font-display text-3xl leading-none">
            omnon
          </Link>
          <div className="flex items-center gap-2">
            <Link href="/survey" className="inline-flex h-11 items-center rounded-full px-4 text-[15px] font-semibold transition hover:bg-card">
              {L({ en: "Buildings", th: "อาคาร" })}
            </Link>
            <LangToggle />
          </div>
        </div>
      </nav>

      {/* 1. The hook. */}
      <section className="relative isolate min-h-[calc(100svh-4rem)] overflow-hidden bg-foreground text-background">
        <Image src={omnon} alt="" fill priority sizes="100vw" placeholder="blur" className="-z-20 object-cover object-[center_60%] grayscale" />
        <div aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-t from-foreground via-foreground/20 to-foreground/10" />
        <div className={cn(wrap, "flex min-h-[calc(100svh-4rem)] flex-col justify-end pt-16 pb-10 sm:pb-14 lg:pb-12")}>
          {/* Wide screens: the title along the bottom left, the main action across from it. */}
          <div className="lg:flex lg:items-end lg:justify-between lg:gap-8">
            <div>
              <h1 className="font-display text-6xl leading-[0.95] sm:text-8xl lg:text-[9rem]">
                Fluid Heritage
              </h1>
              <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-background/85 sm:text-lg">
                {L({
                  en: "A field survey of the houses along Khlong Om Non, and how they live with the water.",
                  th: "การสำรวจภาคสนามบ้านเรือนริมคลองอ้อมนนท์ และวิถีการอยู่ร่วมกับสายน้ำ",
                })}
              </p>
            </div>
            <Link href="/new" className={cn(cta, "mt-8 h-14 w-full px-7 text-base shadow-[0_10px_30px_rgba(0,0,0,0.3)] sm:w-auto lg:mt-0 lg:mb-5")}>
              <IconPlus className="size-5" />
              {t("addBuilding")}
            </Link>
          </div>
        </div>
      </section>

      {/* 2. The story, beside a map of the canal. */}
      <StoryIntro />

      {/* 3. Its past, in the dark band of photographs. */}
      <ThenPhotos />

      {/* 4. How it happened, step by step. */}
      <section className={section}>
        <div className={cn(wrap, "grid gap-6 md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] md:items-end md:gap-14")}>
          <p className="font-display text-7xl leading-[0.85] text-brand tabular-nums sm:text-[9rem]">
            1636
          </p>
          <div>
            <h2 className="font-display text-4xl leading-[1.05] sm:text-5xl">{L({ en: "A river that became a canal", th: "แม่น้ำที่กลายเป็นคลอง" })}</h2>
            <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-muted-foreground sm:text-lg">
              {L({
                en: "In 1636 a shortcut was dug across the river's bend. The current took the new channel, and the old loop was left behind as Khlong Om Non.",
                th: "ในปี พ.ศ. 2179 มีการขุดคลองลัดตัดคุ้งแม่น้ำ กระแสน้ำเปลี่ยนไปไหลทางใหม่ ทางน้ำเดิมจึงกลายเป็นคลองอ้อมนนท์",
              })}
            </p>
          </div>
        </div>
        <div className={cn(wrap, "mt-12 sm:mt-16")}>
          <Timeline className="-mx-5 px-2 sm:-mx-8 sm:px-5" />
        </div>
      </section>

      {/* 5. The place today: three zones on the map. */}
      <section id="zones" className={cn(section, "scroll-mt-20 bg-card")}>
        <div className={cn(wrap, "grid gap-10 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:items-center lg:gap-14")}>
          <div className="lg:order-2">
            <h2 className="font-display text-4xl leading-[1.05] sm:text-5xl">{L({ en: "Three zones along the canal", th: "สามโซนริมคลอง" })}</h2>
            {records && (
              <div className="mt-5">
                <StatLine buildings={stats.total} className="text-base" />
              </div>
            )}
            <p className="mt-6 text-sm text-muted-foreground">
              {L({ en: "Pick a zone to show it on the map.", th: "เลือกโซนเพื่อดูบนแผนที่" })}
            </p>
            <ol className="mt-3 space-y-2">
              {GROUPS.map((g) => (
                <li key={g.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setZone(zone === g.id ? undefined : g.id);
                      // On narrow screens the map sits below the list, so bring it into view.
                      if (!window.matchMedia("(min-width: 1024px)").matches) {
                        document.getElementById("zones-map")?.scrollIntoView({ behavior: "smooth", block: "center" });
                      }
                    }}
                    aria-pressed={zone === g.id}
                    className="flex w-full items-center gap-4 rounded-2xl border-2 border-transparent bg-background px-4 py-3 text-left transition hover:border-border aria-pressed:border-primary"
                  >
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-full text-lg font-bold" style={{ background: g.color, color: g.ink }}>
                      {g.id}
                    </span>
                    <span className="min-w-0">
                      <span className="block font-semibold">{L(g.label)}</span>
                      {records && <StatLine buildings={stats.zone[g.id]} />}
                    </span>
                  </button>
                </li>
              ))}
            </ol>
          </div>
          <div id="zones-map" className="lg:order-1">
            <StudyMap records={all} zone={zone} preview className="aspect-[4/3] lg:aspect-[3/2]" />
          </div>
        </div>
      </section>

      {/* 6. The survey's latest finds. */}
      {recent.length > 0 && (
        <section className={section}>
          <Recent recent={recent} />
        </section>
      )}

      {/* 7. Who is behind it. */}
      <section className={cn(section, "border-t border-border")}>
        <div className={cn(wrap, "grid gap-10 md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] md:gap-14")}>
          <div>
            <h2 className="font-display text-4xl leading-[1.05] sm:text-5xl">
              {THEMES.map((theme) => (
                <span key={theme.en} className="block">
                  {L(theme)}
                </span>
              ))}
            </h2>
          </div>
          <div className="md:self-end">
            <p className="text-[15px] leading-relaxed text-muted-foreground sm:text-lg">
              {L({
                en: "Fluid Heritage is a joint workshop between Xi'an University of Architecture and Technology and the Faculty of Architecture, Chulalongkorn University. It is an architectural field study of a 17.5 km cultural landscape shaped by water, settlement and everyday life.",
                th: "Fluid Heritage เป็นเวิร์กช็อปร่วมระหว่าง Xi'an University of Architecture and Technology และคณะสถาปัตยกรรมศาสตร์ จุฬาลงกรณ์มหาวิทยาลัย เป็นการศึกษาภาคสนามทางสถาปัตยกรรมของภูมิทัศน์วัฒนธรรมยาว 17.5 กม. ที่หล่อหลอมจากสายน้ำ การตั้งถิ่นฐาน และวิถีชีวิตประจำวัน",
              })}
            </p>
          </div>
        </div>
        <div className={cn(wrap, "mt-16 flex flex-col items-center gap-8 sm:mt-20")}>
          <div className="flex items-center justify-center gap-16 sm:gap-32 lg:gap-48">
            <Image src={xian} alt="Xi'an University of Architecture and Technology" className="h-24 w-auto sm:h-28 lg:h-32" />
            <Image src={chula} alt="Chulalongkorn University" className="h-24 w-auto sm:h-28 lg:h-32" />
          </div>
        </div>
      </section>

      {/* 8. An invitation to take part, closing the page in the dark band. */}
      <footer className="bg-foreground text-background">
        <div className={cn(wrap, "py-20 sm:py-28")}>
          <div>
            <h2 className="font-display text-4xl leading-[1.05] sm:text-5xl lg:whitespace-nowrap">{L({ en: "Know a house on the canal?", th: "รู้จักบ้านริมคลองหลังไหนไหม" })}</h2>
            <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-background/75 sm:text-lg">
              {L({
                en: "Add its photos and flood lines. Every record helps show how people along Khlong Om Non live with the water.",
                th: "เพิ่มภาพถ่ายและระดับน้ำท่วมของบ้านหลังนั้น ทุกการบันทึกช่วยบอกเล่าว่าผู้คนริมคลองอ้อมนนท์อยู่ร่วมกับสายน้ำอย่างไร",
              })}
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/new" className={cta}>
                <IconPlus className="size-5" />
                {t("addBuilding")}
              </Link>
              <Link href="/survey" className={cn(ghost, "border-background/30 hover:bg-background/10")}>
                {L({ en: "See all buildings", th: "ดูอาคารทั้งหมด" })} <IconNext className="size-4" />
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}

function Recent({ recent }: { recent: SurveyRecord[] }) {
  const { t, L } = useT();
  const [limit, setLimit] = useState(BOX_PAGE);
  return (
    <div className={wrap}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-4xl leading-[1.05] sm:text-5xl">{L({ en: "Recently documented", th: "บันทึกล่าสุด" })}</h2>
        </div>
        <Link href="/survey" className={cn(ghost, "border-border hover:bg-card")}>
          {L({ en: "See all buildings", th: "ดูอาคารทั้งหมด" })} <IconNext className="size-4" />
        </Link>
      </div>
      <ul className={cn(boxGrid, "mt-10 grid-cols-2 lg:grid-cols-4")}>
        {recent.slice(0, limit - 1).map((r) => (
          <li key={r.id}>
            <BuildingBox r={r} />
          </li>
        ))}
        {/* The one coloured box in the grid. */}
        <li>
          <Link href="/new" className={cn(box, boxPad, "h-full justify-between bg-primary text-primary-foreground transition hover:brightness-105")}>
            <span className="font-display text-2xl leading-none sm:text-4xl">{t("addBuilding")}</span>
            <IconPlus className="size-7 sm:size-9" />
          </Link>
        </li>
      </ul>
      {recent.length + 1 > limit && <SeeMore onClick={() => setLimit((n) => n + BOX_PAGE)} />}
    </div>
  );
}
