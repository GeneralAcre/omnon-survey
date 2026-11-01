"use client";

import Link from "next/link";
import { GROUPS, IMAGE_SLOTS, type Label } from "@/lib/schema";
import { useT } from "./app-state";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { IconBack, IconPlus } from "./Icons";
import { LangToggle } from "./Shell";

const TIMELINE: { when: Label; title: Label; body: Label }[] = [
  {
    when: { en: "Before 1636", th: "ก่อน พ.ศ. 2179" },
    title: { en: "A river, not a canal", th: "แม่น้ำ ไม่ใช่คลอง" },
    body: {
      en: "Khlong Om Non was the main course of the Chao Phraya River. Its deep meander made the journey slow.",
      th: "คลองอ้อมนนท์เคยเป็นเส้นทางหลักของแม่น้ำเจ้าพระยา ด้วยความคดเคี้ยวทำให้การเดินทางใช้เวลานาน",
    },
  },
  {
    when: { en: "1636 · King Prasat Thong", th: "พ.ศ. 2179 · สมเด็จพระเจ้าปราสาททอง" },
    title: { en: "The shortcut", th: "คลองลัด" },
    body: {
      en: "A bypass canal was dug across the neck of the meander to speed up ships heading to Ayutthaya.",
      th: "โปรดให้ขุดคลองลัดตัดคอคุ้งน้ำ เพื่อย่นระยะทางของเรือที่มุ่งสู่กรุงศรีอยุธยา",
    },
  },
  {
    when: { en: "Over time", th: "เมื่อเวลาผ่านไป" },
    title: { en: "The morphological shift", th: "การเปลี่ยนแปลงทางสัณฐาน" },
    body: {
      en: "The current favoured the shortcut, which widened into the new river. The old meander silted up into today's Khlong Om.",
      th: "กระแสน้ำไหลผ่านคลองลัดจนกว้างกลายเป็นแม่น้ำสายใหม่ ส่วนลำน้ำเดิมตื้นเขินกลายเป็นคลองอ้อมในปัจจุบัน",
    },
  },
  {
    when: { en: "1665 · King Narai", th: "พ.ศ. 2208 · สมเด็จพระนารายณ์" },
    title: { en: "A strategic mouth", th: "ปากคลองเชิงยุทธศาสตร์" },
    body: {
      en: "A fortress was built at the canal mouth and Nonthaburi was moved there to monitor trade ships.",
      th: "โปรดให้สร้างป้อมที่ปากคลองและย้ายเมืองนนทบุรีมาตั้ง เพื่อตรวจตราเรือสินค้า",
    },
  },
  {
    when: { en: "Suan Nai era", th: "ยุคสวนใน" },
    title: { en: "Inner orchards", th: "สวนใน" },
    body: {
      en: "Floating markets and orchards supplied the capital with fine fruit — notably durian and santol.",
      th: "ตลาดน้ำและสวนผลไม้ส่งผลผลิตชั้นดีเข้าเมืองหลวง โดยเฉพาะทุเรียนและกระท้อน",
    },
  },
  {
    when: { en: "Today", th: "ปัจจุบัน" },
    title: { en: "A 17.5 km cultural landscape", th: "ภูมิทัศน์วัฒนธรรมยาว 17.5 กม." },
    body: {
      en: "Ayutthaya-era temples and riverside houses line the banks — now pressured by roads, ecological decline and urban growth.",
      th: "วัดสมัยอยุธยาและเรือนริมน้ำเรียงรายสองฝั่ง แต่กำลังเผชิญแรงกดดันจากถนน ระบบนิเวศที่เสื่อมลง และการขยายตัวของเมือง",
    },
  },
];

export default function About() {
  const { L, t } = useT();
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 pb-16">
      <header className="sticky top-0 z-20 flex items-center justify-between bg-background/85 px-2 pt-[max(env(safe-area-inset-top),0.5rem)] pb-2 backdrop-blur-xl sm:px-4 lg:px-6">
        <Link href="/" aria-label={t("back")} className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-secondary">
          <IconBack />
        </Link>
        <LangToggle className="mr-2" />
      </header>

      <div aria-hidden="true" className="mx-4 h-40 rounded-3xl bg-[url(/omnon.jpg)] bg-cover bg-[center_60%] sm:mx-6 sm:h-56 lg:mx-8 lg:h-72" />

      <div className="lg:grid lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-12 lg:px-8">
      <section className="px-5 pt-6 pb-10 sm:px-6 lg:sticky lg:top-20 lg:self-start lg:px-0 lg:pt-10">
        <p className="text-xs font-semibold tracking-widest text-brand uppercase">Workshop Prompt</p>
        <h1 className="mt-3 font-display text-5xl leading-none sm:text-6xl">Fluid Heritage</h1>
        <p className="mt-1 text-xl text-foreground/80 sm:text-2xl">Adaptive Futures for Khlong Om Non</p>
        <p className="mt-4 text-sm text-muted-foreground">Adaptation · Continuity · Interdisciplinary</p>
        <p className="mt-4 text-sm text-muted-foreground">Xi&apos;an University of Architecture and Technology × Faculty of Architecture, Chulalongkorn University</p>
      </section>

      <section className="px-5 sm:px-6 lg:px-0 lg:pt-10">
        <ol className="relative space-y-6 border-l border-border pl-5 sm:space-y-8">
          {TIMELINE.map((e) => (
            <li key={e.title.en} className="relative">
              <span className="absolute top-1.5 -left-[25px] h-2.5 w-2.5 rounded-full bg-brand" />
              <p className="text-xs font-semibold text-brand">{L(e.when)}</p>
              <h2 className="mt-0.5 font-bold">{L(e.title)}</h2>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{L(e.body)}</p>
            </li>
          ))}
        </ol>
      </section>
      </div>

      <section className="mt-10 grid grid-cols-1 gap-2 px-4 sm:px-6 md:grid-cols-3 md:gap-3 lg:mt-16 lg:px-8">
        {GROUPS.map((g) => (
          <div key={g.id} className="flex items-center gap-4 rounded-2xl bg-card p-4">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full font-bold" style={{ background: g.color, color: g.ink }}>
              {g.id}
            </span>
            <span>
              <span className="block font-semibold">{L(g.label)}</span>
              <span className="block text-sm text-muted-foreground">{L(g.zone)}</span>
            </span>
          </div>
        ))}
      </section>

      <section className="mt-8 px-5 sm:px-6 lg:px-8">
        <h2 className="font-bold">{t("stepPhotos")}</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {IMAGE_SLOTS.map((s) => (
            <span key={s.key} className="rounded-full bg-secondary px-3 py-1.5 text-sm">
              {L(s.label)}
            </span>
          ))}
        </div>
      </section>

      <section className="mx-4 mt-12 flex flex-col items-start gap-4 rounded-3xl border border-border bg-card p-6 sm:mx-6 sm:flex-row sm:items-center sm:justify-between lg:mx-8 lg:p-8">
        <div>
          <h2 className="text-xl font-bold sm:text-2xl">{L({ en: "Add to the survey", th: "ร่วมเพิ่มข้อมูลการสำรวจ" })}</h2>
          <p className="mt-1 text-sm text-muted-foreground sm:text-base">
            {L({
              en: "Record a building: its photos, colours, flood lines and location.",
              th: "บันทึกอาคาร ทั้งภาพถ่าย สี ระดับน้ำท่วม และตำแหน่ง",
            })}
          </p>
        </div>
        <Link href="/new" className={cn(buttonVariants({ size: "xl" }), "shrink-0")}>
          <IconPlus />
          {t("newRecord")}
        </Link>
      </section>
    </main>
  );
}
