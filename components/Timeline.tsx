"use client";

import type { Label } from "@/lib/schema";
import { cn } from "@/lib/utils";
import { useT } from "./app-state";

const TIMELINE: { when: Label; who?: Label; title: Label; body: Label }[] = [
  {
    when: { en: "Before 1636", th: "ก่อน พ.ศ. 2179" },
    title: { en: "A river, not a canal", th: "แม่น้ำ ไม่ใช่คลอง" },
    body: {
      en: "Khlong Om Non was the main course of the Chao Phraya River. Its deep meander made the journey slow.",
      th: "คลองอ้อมนนท์เคยเป็นเส้นทางหลักของแม่น้ำเจ้าพระยา ด้วยความคดเคี้ยวทำให้การเดินทางใช้เวลานาน",
    },
  },
  {
    when: { en: "1636", th: "พ.ศ. 2179" },
    who: { en: "King Prasat Thong", th: "สมเด็จพระเจ้าปราสาททอง" },
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
    when: { en: "1665", th: "พ.ศ. 2208" },
    who: { en: "King Narai", th: "สมเด็จพระนารายณ์" },
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

const OLD_COURSE = "M62 0C62 30 8 8 8 52C8 92 62 72 62 100";
const NEW_COURSE = "M62 0V100";
const ORCHARDS = [38, 48, 58].flatMap((y) => [20, 30, 40, 50].map((x) => ({ x, y })));

// A schematic of the canal at one TIMELINE stage (by index), not a survey drawing.
function StageMap({ stage }: { stage: number }) {
  return (
    <svg viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeLinecap="round" aria-hidden="true" className="aspect-square w-full bg-card">
      {stage < 2 ? (
        <path d={OLD_COURSE} strokeWidth={5} />
      ) : (
        <>
          <path d={NEW_COURSE} strokeWidth={5} />
          <path d={OLD_COURSE} strokeWidth={1.5} />
        </>
      )}
      {stage === 1 && <path d="M62 18V82" strokeWidth={1.5} strokeDasharray="3 3" />}
      {stage >= 3 && <rect x={68} y={9} width={7} height={7} fill="currentColor" stroke="none" />}
      {stage >= 4 && ORCHARDS.map((p) => <circle key={`${p.x}-${p.y}`} cx={p.x} cy={p.y} r={1.5} fill="currentColor" stroke="none" />)}
      {stage === 5 && <path d="M0 86L100 80M84 0L88 100" strokeWidth={1} />}
    </svg>
  );
}

// Swipes sideways on phones; all six stages fit across a desktop.
export default function Timeline({ className }: { className?: string }) {
  const { L } = useT();
  return (
    <div className="text-brand">
      <ol
        tabIndex={0}
        aria-label={L({ en: "Timeline of Khlong Om Non", th: "ลำดับเหตุการณ์ของคลองอ้อมนนท์" })}
        className={cn("no-scrollbar grid snap-x snap-mandatory auto-cols-[72%] grid-flow-col overflow-x-auto sm:auto-cols-[15rem] lg:auto-cols-fr", className)}
      >
        {TIMELINE.map((e, i) => (
          <li key={e.title.en} className="flex snap-center flex-col items-center px-3 text-center">
            <StageMap stage={i} />
            <div className="relative -mx-3 mt-6 flex w-[calc(100%+1.5rem)] justify-center">
              <span aria-hidden="true" className="absolute inset-x-0 top-1/2 border-t-2 border-dashed border-[#CE3E1B]" />
              <span className="relative rounded-full bg-[#CE3E1B] px-3 py-1.5 text-[11px] leading-none font-semibold whitespace-nowrap text-primary-foreground">{L(e.when)}</span>
            </div>
            <h2 className="mt-5 text-sm font-semibold">{L(e.title)}</h2>
            {e.who && <p className="mt-0.5 text-xs text-muted-foreground">{L(e.who)}</p>}
            <p className="mt-2 text-[13px] leading-relaxed text-foreground/85">{L(e.body)}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}
