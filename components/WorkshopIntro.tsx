"use client";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useT } from "./app-state";

// Full-bleed landing hero: the Khlong Om Non photo, fading into the page below.
export default function WorkshopIntro() {
  const { L } = useT();

  return (
    <section className="relative isolate flex min-h-[78svh] w-full items-end overflow-hidden">
      <div aria-hidden="true" className="absolute inset-0 -z-20 bg-[url(/omnon.jpg)] bg-cover bg-[center_60%]" />
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-t from-background via-black/45 to-black/10" />

      <div className="mx-auto w-full max-w-2xl px-5 pt-[max(env(safe-area-inset-top),1.5rem)] pb-10 sm:pb-14">
        <p className="text-xs font-semibold tracking-[0.22em] text-white/80 uppercase drop-shadow">Khlong Om Non · Field survey</p>
        <h2 className="mt-2 text-4xl font-bold tracking-tight text-white drop-shadow-lg sm:text-5xl">Fluid Heritage</h2>
        <p className="mt-1 text-lg font-medium text-white/90 drop-shadow sm:text-xl">Adaptive futures for Khlong Om Non</p>
        <p className="mt-3 max-w-lg text-[15px] leading-relaxed text-white/80 drop-shadow">
          {L({
            en: "Explore a living canal landscape through the buildings, stories and places documented by the workshop team.",
            th: "สำรวจภูมิทัศน์คลองที่ยังมีชีวิต ผ่านอาคาร เรื่องราว และสถานที่ที่ทีมเวิร์กช็อปบันทึกไว้",
          })}
        </p>
        <a
          href="#survey-records"
          className={cn(buttonVariants({ variant: "outline", size: "xl" }), "mt-5 border-white/40 bg-white/10 text-white backdrop-blur-sm hover:bg-white/20 dark:bg-white/10 dark:hover:bg-white/20")}
        >
          {L({ en: "Explore the survey", th: "ดูข้อมูลสำรวจ" })}
          <span aria-hidden="true">↓</span>
        </a>
      </div>
    </section>
  );
}
