"use client";

import Link from "next/link";
import { GROUPS, SHOTS } from "@/lib/schema";
import { useT } from "./app-state";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { IconBack, IconPlus } from "./Icons";
import { LangToggle } from "./Shell";
import Timeline from "./Timeline";

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

      <section className="px-5 pt-6 pb-10 sm:px-6 lg:px-8 lg:pt-10">
        <h1 className="font-display text-4xl leading-none sm:text-6xl">Fluid Heritage</h1>
        <p className="mt-1 text-xl text-foreground/80 sm:text-2xl">Adaptive Futures for Khlong Om Non</p>
        <p className="mt-4 text-sm text-muted-foreground">Adaptation · Continuity · Interdisciplinary</p>
        <p className="mt-4 text-sm text-muted-foreground">Xi&apos;an University of Architecture and Technology × Faculty of Architecture, Chulalongkorn University</p>
      </section>

      <Timeline className="lg:px-5" />

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
          {SHOTS.map((s) => (
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
              en: "Record a building: its photos and flood lines.",
              th: "บันทึกอาคาร ทั้งภาพถ่ายและระดับน้ำท่วม",
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
