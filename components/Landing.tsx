"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { buttonVariants } from "@/components/ui/button";
import { GROUPS, allPhotos } from "@/lib/schema";
import { cn } from "@/lib/utils";
import { useT } from "./app-state";
import { BOX_PAGE, BuildingBox, SeeMore, box, boxGrid, boxPad } from "./BuildingBox";
import { useRecords } from "./data";
import { IconNext, IconPlus } from "./Icons";
import { LangToggle } from "./Shell";
import Timeline from "./Timeline";
import chula from "@/public/Chula.webp";
import omnon from "@/public/omnon.jpg";
import xian from "@/public/XIan.svg";

// Compact pills, like the top bar of an editorial site; still a comfortable tap.
const pill = "h-11 rounded-full px-5 text-sm font-semibold";
const wrap = "mx-auto w-full max-w-[96rem] px-5 sm:px-8";
const eyebrow = "tag";

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

// The public showcase. The working list of buildings lives on /survey.
export default function Landing() {
  const { t, L } = useT();
  const { records } = useRecords();
  const all = records ?? [];
  const [zone, setZone] = useState<string>();
  const [limit, setLimit] = useState(BOX_PAGE);

  // Newest first (records arrive sorted by last update). The "add" box takes the last spot of the limit.
  const recent = all.filter((r) => allPhotos(r).length > 0);

  return (
    <main className="flex-1">
      <nav className="sticky top-0 z-30 border-b border-transparent bg-background/80 pt-[env(safe-area-inset-top)] backdrop-blur-xl">
        <div className={cn(wrap, "flex h-16 items-center justify-between gap-3")}>
          <Link href="/" className="font-display text-3xl leading-none">
            omnon
          </Link>
          <LangToggle />
        </div>
      </nav>

      <section className="relative isolate min-h-[32rem] overflow-hidden bg-black text-white sm:min-h-[38rem] lg:min-h-[min(78svh,52rem)]">
        <Image src={omnon} alt="The canal landscape of Khlong Om Non" fill priority sizes="100vw" placeholder="blur" className="-z-20 object-cover object-[center_60%] grayscale" />
        <div aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-t from-black/80 via-black/15 to-black/10" />
        <div className={cn(wrap, "flex min-h-[32rem] flex-col justify-end pb-10 pt-16 sm:min-h-[38rem] sm:pb-14 lg:min-h-[min(78svh,52rem)] lg:pb-10")}>
          <p className="tag mb-4 self-start">Adaptive futures for Khlong Om Non</p>
          {/* Wide screens: the title along the bottom left, the main action across from it. */}
          <div className="lg:flex lg:items-end lg:justify-between lg:gap-8">
            <h1 className="font-display text-7xl leading-[0.95] text-white sm:text-8xl lg:text-[11rem]">Fluid Heritage</h1>
            <Link
              href="/new"
              className="mt-8 inline-flex h-14 w-full shrink-0 items-center justify-center gap-2 rounded-full bg-primary px-7 text-base font-semibold text-primary-foreground shadow-[0_8px_30px_rgba(0,0,0,0.25)] transition hover:bg-primary/90 active:scale-95 sm:w-auto lg:mt-0 lg:mb-4"
            >
              <IconPlus className="size-5" />
              {t("addBuilding")}
            </Link>
          </div>
        </div>
      </section>

      {/* The history, with the full timeline just below. */}
      <section className="bg-brand text-primary-foreground">
        <div className={cn(wrap, "grid gap-6 py-16 sm:py-24 md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] md:gap-14")}>
          <p className="font-display text-8xl leading-none sm:text-9xl">1636</p>
          <div>
            <h2 className="font-display text-3xl leading-tight sm:text-4xl">{L({ en: "A river that became a canal", th: "แม่น้ำที่กลายเป็นคลอง" })}</h2>
            <p className="mt-4 text-[15px] leading-relaxed sm:text-base">
              {L({
                en: "Khlong Om Non was once the main course of the Chao Phraya. When a shortcut was dug across its meander, the river moved on, and the old bend became a 17.5 km cultural landscape of temples, orchards and riverside houses.",
                th: "คลองอ้อมนนท์เคยเป็นเส้นทางหลักของแม่น้ำเจ้าพระยา เมื่อมีการขุดคลองลัดตัดคุ้งน้ำ แม่น้ำจึงเปลี่ยนเส้นทาง และคุ้งเดิมกลายเป็นภูมิทัศน์วัฒนธรรมยาว 17.5 กม. ที่เต็มไปด้วยวัด สวนผลไม้ และเรือนริมน้ำ",
              })}
            </p>
          </div>
        </div>
      </section>

      <section className={cn(wrap, "pt-16 sm:pt-24")}>
        <p className={eyebrow}>{L({ en: "Timeline", th: "ลำดับเหตุการณ์" })}</p>
        <div className="mt-6">
          <Timeline className="-mx-5 px-2 sm:-mx-8 sm:px-5" />
        </div>
      </section>

      {/* What the workshop is. */}
      <section className={cn(wrap, "grid gap-8 py-16 sm:py-24 md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] md:gap-14")}>
        <div>
          <p className={eyebrow}>{t("about")}</p>
          <h2 className="mt-4 font-display text-5xl leading-[1.05] sm:text-6xl">
            {THEMES.map((theme) => (
              <span key={theme.en} className="block">
                {L(theme)}
              </span>
            ))}
          </h2>
        </div>
        <div className="md:self-end">
          <p className="text-[15px] leading-relaxed text-muted-foreground sm:text-base">
            {L({
              en: "Fluid Heritage is a joint workshop between Xi'an University of Architecture and Technology and the Faculty of Architecture, Chulalongkorn University. It is an architectural field study of a 17.5 km cultural landscape shaped by water, settlement and everyday life.",
              th: "Fluid Heritage เป็นเวิร์กช็อปร่วมระหว่าง Xi'an University of Architecture and Technology และคณะสถาปัตยกรรมศาสตร์ จุฬาลงกรณ์มหาวิทยาลัย เป็นการศึกษาภาคสนามทางสถาปัตยกรรมของภูมิทัศน์วัฒนธรรมยาว 17.5 กม. ที่หล่อหลอมจากสายน้ำ การตั้งถิ่นฐาน และวิถีชีวิตประจำวัน",
            })}
          </p>
        </div>
      </section>

      {/* The partners, set like a logo strip. */}
      <div className="border-y border-border">
        <div className={cn(wrap, "flex flex-col items-center gap-8 py-12 text-muted-foreground sm:gap-10 sm:py-16 lg:py-20")}>
          <span className="text-sm tracking-[0.2em] uppercase">{L({ en: "In collaboration", th: "ความร่วมมือ" })}</span>
          <div className="flex items-center justify-center gap-16 sm:gap-32 lg:gap-56">
            <Image src={xian} alt="Xi'an University of Architecture and Technology" className="h-32 w-auto sm:h-48 lg:h-64" />
            <Image src={chula} alt="Chulalongkorn University" className="h-32 w-auto sm:h-48 lg:h-64" />
          </div>
        </div>
      </div>

      {/* The three zones beside the study-area map. */}
      <section id="zones" className="scroll-mt-20 bg-card py-16 sm:py-24">
        <div className={cn(wrap, "grid gap-10 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:items-center lg:gap-14")}>
          <StudyMap records={all} zone={zone} preview className="aspect-[4/3] lg:aspect-[3/2]" />
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
                    className="flex w-full items-center gap-4 rounded-2xl border-2 border-transparent bg-background p-4 text-left transition hover:border-border aria-pressed:border-primary"
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
            <Link href="/survey" className={cn(buttonVariants(), pill, "mt-6 gap-1.5")}>
              {L({ en: "See all buildings", th: "ดูอาคารทั้งหมด" })} <IconNext className="size-4" />
            </Link>
          </div>
        </div>
      </section>

      {recent.length > 0 && (
        <section className={cn(wrap, "py-16 sm:py-24")}>
          <p className={eyebrow}>{L({ en: "From the field", th: "จากภาคสนาม" })}</p>
          <h2 className="mt-3 font-display text-4xl leading-tight sm:text-5xl">{L({ en: "Recently documented", th: "บันทึกล่าสุด" })}</h2>
          <ul className={cn(boxGrid, "mt-8 grid-cols-2 lg:grid-cols-4")}>
            {recent.slice(0, limit - 1).map((r) => (
              <li key={r.id}>
                <BuildingBox r={r} />
              </li>
            ))}
            {/* The one coloured box in the grid. */}
            <li>
              <Link href="/new" className={cn(box, boxPad, "h-full justify-between bg-brand text-primary-foreground transition-opacity hover:opacity-90")}>
                <span className="font-display text-3xl leading-none sm:text-5xl">{t("addBuilding")}</span>
                <IconPlus className="size-7 sm:size-9" />
              </Link>
            </li>
          </ul>
          {recent.length + 1 > limit && <SeeMore onClick={() => setLimit((n) => n + BOX_PAGE)} />}
        </section>
      )}

    </main>
  );
}
