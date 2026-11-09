"use client";

import Image from "next/image";
import { GROUPS, type SurveyRecord } from "@/lib/schema";
import { STUDY_PLOTS, plotOf } from "@/lib/study-area";
import { cn } from "@/lib/utils";
import { useT } from "./app-state";
import boats from "@/public/omnon-2.jpg";
import boatsFar from "@/public/omnon-3.jpg";

const wrap = "mx-auto w-full max-w-[96rem] px-5 sm:px-8";

// --- The schematic map: today's river runs straight down; the old bend loops west. ---

type Pt = [number, number];
// Three cubic segments of the old bend, from the northern mouth round to the southern one.
const BEND: [Pt, Pt, Pt, Pt][] = [
  [[330, 70], [250, 40], [90, 60], [70, 200]],
  [[70, 200], [55, 300], [120, 330], [90, 400]],
  [[90, 400], [70, 450], [200, 480], [330, 450]],
];
const CANAL = `M${BEND[0][0].join(" ")}${BEND.map(([, a, b, c]) => ` C${a.join(" ")} ${b.join(" ")} ${c.join(" ")}`).join("")}`;

const bez = (p: [Pt, Pt, Pt, Pt], t: number, k: 0 | 1) => {
  const u = 1 - t;
  return u * u * u * p[0][k] + 3 * u * u * t * p[1][k] + 3 * u * t * t * p[2][k] + t * t * t * p[3][k];
};
const bezD = (p: [Pt, Pt, Pt, Pt], t: number, k: 0 | 1) => {
  const u = 1 - t;
  return 3 * u * u * (p[1][k] - p[0][k]) + 6 * u * t * (p[2][k] - p[1][k]) + 3 * t * t * (p[3][k] - p[2][k]);
};

// 29 temples, spread evenly along the bend and set just off the water, alternating banks.
// Their placing is illustrative; the count is what's real.
const TEMPLES = Array.from({ length: 29 }, (_, i) => {
  const u = (3 * (i + 1)) / 30;
  const seg = BEND[Math.min(2, Math.floor(u))];
  const t = u - Math.min(2, Math.floor(u));
  const [dx, dy] = [bezD(seg, t, 0), bezD(seg, t, 1)];
  const len = Math.hypot(dx, dy) || 1;
  const side = i % 2 ? 9 : -9;
  return { x: Math.round(bez(seg, t, 0) - (dy / len) * side), y: Math.round(bez(seg, t, 1) + (dx / len) * side) };
});

function CanalMap() {
  const { L } = useT();
  return (
    <svg viewBox="0 0 400 520" role="img" aria-label={L({ en: "Schematic map of Khlong Om Non and the Chao Phraya", th: "แผนผังคลองอ้อมนนท์และแม่น้ำเจ้าพระยา" })} className="h-auto w-full">
      {/* Today's river, straight through the 1636 shortcut. */}
      <path d="M330 0V520" stroke="var(--water)" strokeOpacity={0.45} strokeWidth={22} strokeLinecap="round" fill="none" />
      {/* The old bend: Khlong Om Non. */}
      <path d={CANAL} stroke="var(--water)" strokeWidth={7} strokeLinecap="round" fill="none" />
      {TEMPLES.map((p, i) => (
        <path key={i} d={`M${p.x} ${p.y - 4}l4 4-4 4-4-4z`} fill="#D0935A" />
      ))}
      {/* The fort at the mouth, 1665. */}
      <rect x={344} y={58} width={14} height={14} fill="var(--foreground)" />
      <g fontSize={12} fill="currentColor" fontWeight={600}>
        <text x={364} y={56} textAnchor="end" className="fill-muted-foreground font-normal" fontSize={10}>
          {L({ en: "Fort · 1665", th: "ป้อม · 2208" })}
        </text>
        <text x={318} y={270} textAnchor="end">
          <tspan x={318}>{L({ en: "Chao Phraya", th: "แม่น้ำเจ้าพระยา" })}</tspan>
          <tspan x={318} dy={15} className="fill-muted-foreground font-normal" fontSize={10}>
            {L({ en: "shortcut dug 1636", th: "คลองลัด ขุด พ.ศ. 2179" })}
          </tspan>
        </text>
        <text x={110} y={210}>
          <tspan x={110}>{L({ en: "Khlong Om Non", th: "คลองอ้อมนนท์" })}</tspan>
          <tspan x={110} dy={15} className="fill-muted-foreground font-normal" fontSize={10}>
            {L({ en: "the old river · 17.5 km", th: "แม่น้ำสายเดิม · 17.5 กม." })}
          </tspan>
        </text>
      </g>
      <g className="fill-muted-foreground" fontSize={10}>
        <rect x={20} y={492} width={7} height={7} transform="rotate(45 23.5 495.5)" fill="#D0935A" />
        <text x={34} y={499}>{L({ en: "29 temples (placed for illustration)", th: "29 วัด (ตำแหน่งโดยประมาณ)" })}</text>
      </g>
      {/* A long-tail boat on the bend. */}
      <g transform="translate(90 400)">
        <path d="M-12 -3H11L7 4H-9Z" fill="var(--foreground)" />
        <path d="M-6 -3V-9H5V-3" fill="none" stroke="var(--foreground)" strokeWidth={2} />
      </g>
    </svg>
  );
}

const fmt = (n: number, decimals = 0) => n.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

// The opening story for visitors: how the river became a canal, beside a map of the canal.
export function StoryIntro() {
  const { L } = useT();
  return (
    <section id="discover" className="scroll-mt-16 overflow-hidden py-20 sm:py-28">
      <div className={cn(wrap, "grid gap-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:items-center lg:gap-16")}>
        <div>
          <h2 className="font-display text-5xl leading-[1.02] sm:text-7xl">
            {L({ en: "Take the long way round", th: "ล่องตามทางอ้อม" })}
          </h2>
          <div className="mt-6 space-y-4 text-[15px] leading-relaxed text-foreground/85 sm:text-base">
            <p>
              {L({
                en: "For centuries, ships bound for Ayutthaya followed this slow loop of the Chao Phraya. In 1636 King Prasat Thong had a shortcut dug across its neck; the current took the new channel, and the bend was left behind as Khlong Om Non, the “roundabout canal of Nonthaburi.”",
                th: "หลายศตวรรษก่อน เรือที่มุ่งสู่กรุงศรีอยุธยาต้องล่องอ้อมคุ้งน้ำเจ้าพระยาอันคดเคี้ยวนี้ ใน พ.ศ. 2179 สมเด็จพระเจ้าปราสาททองโปรดให้ขุดคลองลัดตัดคอคุ้ง กระแสน้ำจึงเปลี่ยนไปใช้ทางใหม่ ทิ้งคุ้งเดิมไว้เป็นคลองอ้อมนนท์",
              })}
            </p>
            <p>
              {L({
                en: "What the river left is a quiet world on the edge of Bangkok: temple piers, orchards, wooden houses on stilts and a way of life that still follows the water. Today it is under pressure from new roads, housing estates and floods.",
                th: "สิ่งที่แม่น้ำทิ้งไว้คือโลกอันเงียบสงบริมขอบกรุงเทพฯ ท่าน้ำวัด สวนผลไม้ เรือนไม้ใต้ถุนสูง และวิถีชีวิตที่ยังผูกพันกับสายน้ำ ซึ่งวันนี้กำลังถูกกดดันจากถนนใหม่ หมู่บ้านจัดสรร และน้ำท่วม",
              })}
            </p>
          </div>
        </div>
        <div className="mx-auto w-full max-w-md lg:max-w-lg">
          <CanalMap />
        </div>
      </div>
    </section>
  );
}

// A gentle wave along the foot of the dark band; one period is 300 units.
const WAVE = `M0 20${Array.from({ length: 8 }, (_, i) => ` Q${i * 300 + 75} 4 ${i * 300 + 150} 20 T${i * 300 + 300} 20`).join("")} V40 H0Z`;

// The dark band: archive photos of the canal when boats were the road, with water running along its foot.
export function ThenPhotos() {
  const { L } = useT();  return (
    <section className="relative overflow-hidden bg-foreground pt-20 pb-28 text-background sm:pt-28 sm:pb-36">
      <div className={cn(wrap, "grid gap-3 md:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] md:items-end")}>
        <figure>
          <div className="relative aspect-[923/590] overflow-hidden rounded-3xl bg-background/10">
            <Image src={boats} alt={L({ en: "Passenger boats on Khlong Om Non, archival photograph", th: "เรือโดยสารในคลองอ้อมนนท์ ภาพถ่ายในอดีต" })} fill sizes="(min-width: 768px) 58vw, 100vw" placeholder="blur" className="object-cover" />
          </div>
        </figure>
        <figure>
          <div className="relative aspect-[419/279] overflow-hidden rounded-3xl bg-background/10">
            <Image src={boatsFar} alt={L({ en: "A line of boats travelling the canal past riverside houses, archival photograph", th: "ขบวนเรือล่องผ่านบ้านริมคลอง ภาพถ่ายในอดีต" })} fill sizes="(min-width: 768px) 42vw, 100vw" placeholder="blur" className="object-cover" />
          </div>
          <figcaption className="mt-5 px-1">
            <p className="font-display text-4xl leading-[1.02] sm:text-5xl">{L({ en: "When the canal was the road", th: "เมื่อคลองคือถนน" })}</p>
            <p className="mt-3 text-[15px] leading-relaxed text-background/75">
              {L({
                en: "Before the roads arrived, boats carried people, fruit and goods along Khlong Om Non, between temple piers, orchards and the houses that faced the water.",
                th: "ก่อนจะมีถนน เรือคือพาหนะที่พาผู้คน ผลไม้ และสินค้า ล่องไปตามคลองอ้อมนนท์ ระหว่างท่าน้ำวัด สวนผลไม้ และบ้านเรือนที่หันหน้าสู่สายน้ำ",
              })}
            </p>
          </figcaption>
        </figure>
      </div>

      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-10 overflow-hidden sm:h-14">
        <svg viewBox="0 0 2400 40" preserveAspectRatio="none" className="absolute bottom-0 left-0 h-full w-[200%] text-background opacity-30">
          <path d={WAVE} fill="currentColor" />
        </svg>
        <svg viewBox="0 0 2400 40" preserveAspectRatio="none" className="absolute bottom-0 left-0 h-3/4 w-[200%] text-background">
          <path d={WAVE} fill="currentColor" />
        </svg>
      </div>
    </section>
  );
}

// --- Live numbers from the survey itself: buildings documented, overall and per zone. ---

const ALL = STUDY_PLOTS.flatMap((p) => p.buildings.map(([code]) => ({ key: `${p.key}|${code}`, zone: p.zone })));

export function surveyStats(records: SurveyRecord[]) {
  const lit = new Set<string>();
  for (const r of records) {
    for (const { plot, building } of plotOf(r)) {
      // A record for the whole plot covers every building on it.
      const codes = building ? [building] : plot.buildings.map(([c]) => c);
      for (const c of codes) lit.add(`${plot.key}|${c}`);
    }
  }
  let total = 0;
  const zone: Record<string, number> = Object.fromEntries(GROUPS.map((g) => [g.id, 0]));
  for (const b of ALL) {
    if (!lit.has(b.key)) continue;
    total++;
    zone[b.zone] = (zone[b.zone] ?? 0) + 1;
  }
  return { total, zone };
}

// "263 buildings".
export function StatLine({ buildings, className }: { buildings: number; className?: string }) {
  const { L } = useT();
  return (
    <span className={cn("block text-sm text-muted-foreground", className)}>
      <span className="font-semibold text-foreground tabular-nums">{fmt(buildings)}</span>{" "}
      {L({ en: buildings === 1 ? "building" : "buildings", th: "อาคาร" })}
    </span>
  );
}
