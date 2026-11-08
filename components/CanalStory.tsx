"use client";

import { House, Landmark, Sailboat, TreePalm } from "lucide-react";
import { animate, onScroll, stagger, svg, utils } from "animejs";
import { useRef } from "react";
import { GROUPS, allPhotos, type Label, type SurveyRecord } from "@/lib/schema";
import { STUDY_PLOTS, plotOf } from "@/lib/study-area";
import { cn } from "@/lib/utils";
import { useT } from "./app-state";
import { countUps, drawIn, onView, scrollReveals, useAnime } from "./motion";

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
    <svg data-canal-map viewBox="0 0 400 520" role="img" aria-label={L({ en: "Schematic map of Khlong Om Non and the Chao Phraya", th: "แผนผังคลองอ้อมนนท์และแม่น้ำเจ้าพระยา" })} className="h-auto w-full">
      {/* Today's river, straight through the 1636 shortcut. */}
      <path data-draw d="M330 0V520" stroke="#D4BC9A" strokeWidth={22} strokeLinecap="round" fill="none" />
      {/* The old bend: Khlong Om Non. */}
      <path data-draw d={CANAL} stroke="var(--brand)" strokeWidth={7} strokeLinecap="round" fill="none" />
      <path data-track d={CANAL} stroke="none" fill="none" />
      {TEMPLES.map((p, i) => (
        <path data-temple key={i} d={`M${p.x} ${p.y - 4}l4 4-4 4-4-4z`} fill="#D0935A" />
      ))}
      {/* The fort at the mouth, 1665. */}
      <rect data-temple x={344} y={58} width={14} height={14} fill="var(--foreground)" />
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
      {/* A long-tail boat that travels the bend as you scroll. */}
      {/* Starts on the bend; anime.js replaces this with the scroll-driven position. */}
      <g data-boat transform="translate(90 400)">
        <path d="M-12 -3H11L7 4H-9Z" fill="var(--foreground)" />
        <path d="M-6 -3V-9H5V-3" fill="none" stroke="var(--foreground)" strokeWidth={2} />
      </g>
    </svg>
  );
}

// --- Facts, each from a published source (listed under the section). ---

const FACTS: { value: number; decimals?: number; prefix?: string; unit: Label; label: Label }[] = [
  { value: 17.5, decimals: 1, unit: { en: "km", th: "กม." }, label: { en: "of the old Chao Phraya, now a canal", th: "ของแม่น้ำเจ้าพระยาสายเดิมที่กลายเป็นคลอง" } },
  { value: 29, unit: { en: "temples", th: "วัด" }, label: { en: "counted along its banks", th: "ที่นับได้ริมสองฝั่งคลอง" } },
  { value: new Date().getFullYear() - 1636, unit: { en: "years", th: "ปี" }, label: { en: "since the 1636 shortcut moved the river", th: "นับจากการขุดคลองลัดเมื่อ พ.ศ. 2179" } },
  { value: 600, prefix: "~", unit: { en: "years", th: "ปี" }, label: { en: "age of the prang at Wat Prang Luang", th: "อายุพระปรางค์วัดปรางค์หลวง" } },
  { value: 21, unit: { en: "m", th: "ม." }, label: { en: "height of that prang", th: "ความสูงของพระปรางค์องค์นั้น" } },
  { value: 3, unit: { en: "districts", th: "อำเภอ" }, label: { en: "Mueang Nonthaburi, Bang Yai, Bang Kruai", th: "เมืองนนทบุรี บางใหญ่ บางกรวย" } },
];

const EXPLORE: { icon: typeof Landmark; title: Label; body: Label }[] = [
  {
    icon: Landmark,
    title: { en: "Temples by the water", th: "วัดริมน้ำ" },
    body: {
      en: "Ayutthaya-era temples face the canal, among them Wat Prang Luang and its 21 m prang, one of the oldest around Bangkok.",
      th: "วัดสมัยอยุธยาหันหน้าสู่คลอง รวมถึงวัดปรางค์หลวงกับพระปรางค์สูง 21 เมตร หนึ่งในวัดที่เก่าแก่ที่สุดของกรุงเทพฯ และปริมณฑล",
    },
  },
  {
    icon: TreePalm,
    title: { en: "Orchard country", th: "ถิ่นสวนผลไม้" },
    body: {
      en: "Low, fertile land laced with ditches grows Nonthaburi's famous durian, with mangosteen, pomelo, sapodilla and rose apple.",
      th: "ที่ราบลุ่มอุดมสมบูรณ์ร่องสวนเรียงราย ปลูกทุเรียนนนท์อันลือชื่อ มังคุด ส้มโอ ละมุด และชมพู่",
    },
  },
  {
    icon: Sailboat,
    title: { en: "Best seen by boat", th: "ชมได้ดีที่สุดทางเรือ" },
    body: {
      en: "Boat trips leave from temple piers such as Wat Rat Prakhong Tham in Bang Yai, gliding past stilt houses and orchards.",
      th: "ล่องเรือได้จากท่าน้ำวัด เช่น วัดราษฎร์ประคองธรรม อำเภอบางใหญ่ ผ่านเรือนใต้ถุนสูงและสวนผลไม้",
    },
  },
  {
    icon: House,
    title: { en: "Houses that rise", th: "บ้านที่ยกตัวหนีน้ำ" },
    body: {
      en: "Riverside homes are jacked up on taller posts to stay above floods. This survey records each one and its flood lines.",
      th: "บ้านริมน้ำถูกดีดให้สูงขึ้นเพื่อพ้นน้ำท่วม การสำรวจนี้บันทึกทุกหลังพร้อมระดับน้ำท่วม",
    },
  },
];

const FRUIT: Label[] = [
  { en: "Durian", th: "ทุเรียน" },
  { en: "Mangosteen", th: "มังคุด" },
  { en: "Pomelo", th: "ส้มโอ" },
  { en: "Santol", th: "กระท้อน" },
  { en: "Sapodilla", th: "ละมุด" },
  { en: "Rose apple", th: "ชมพู่" },
  { en: "Banana", th: "กล้วย" },
];

const SOURCES = [
  { label: "Wikipedia: Khlong Om Non", href: "https://en.wikipedia.org/wiki/Khlong_Om_Non" },
  { label: "Wikipedia: Nonthaburi province", href: "https://en.wikipedia.org/wiki/Nonthaburi_province" },
  { label: "Matichon", href: "https://www.matichon.co.th/local/news_3081471" },
  { label: "Bangkok Biz News", href: "https://www.bangkokbiznews.com/lifestyle/travel/1176442" },
  { label: "JS100", href: "https://www.js100.com/en/site/post_share/view/64637" },
];

const fmt = (n: number, decimals = 0) => n.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

// The story of the canal, told for visitors: a map, the numbers, and what to go and see.
export default function CanalStory({ records }: { records?: SurveyRecord[] | null }) {
  const { L } = useT();
  const root = useRef<HTMLElement>(null);
  useAnime(root, () => {
    const [map] = utils.$("[data-canal-map]");
    // The rivers draw themselves, then the temples appear along the banks.
    const undraw = drawIn("[data-draw]", { draw: ["0 0", "0 1"], duration: 2200, delay: stagger(500), ease: "inOut(3)", autoplay: onView(map) });
    utils.set("[data-temple]", { opacity: 0, scale: 0 });
    animate("[data-temple]", { opacity: 1, scale: 1, duration: 600, delay: stagger(45, { start: 1400 }), ease: "outBack(3)", autoplay: onView(map) });
    // The boat rides the bend while the map crosses the screen.
    animate("[data-boat]", {
      ...svg.createMotionPath("[data-track]"),
      ease: "linear",
      autoplay: onScroll({ target: map, enter: "bottom top", leave: "top bottom", sync: 0.25 }),
    });
    // The fruit list drifts sideways forever.
    animate("[data-marquee]", { x: ["0%", "-50%"], duration: 30000, ease: "linear", loop: true });
    countUps(root.current);
    scrollReveals(root.current);
    return undraw;
  });

  return (
    <section ref={root} id="discover" data-scope className="scroll-mt-16 overflow-hidden bg-card py-16 sm:py-24">
      <div className={cn(wrap, "grid gap-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:items-center lg:gap-16")}>
        <div>
          <p data-reveal className="tag self-start">{L({ en: "Discover", th: "ค้นพบ" })}</p>
          <h2 data-reveal className="mt-4 font-display text-5xl leading-[1.02] sm:text-7xl">
            {L({ en: "Take the long way round", th: "ล่องตามทางอ้อม" })}
          </h2>
          <div data-reveal className="mt-6 space-y-4 text-[15px] leading-relaxed text-foreground/85 sm:text-base">
            <p>
              {L({
                en: "For centuries, ships bound for Ayutthaya followed this slow loop of the Chao Phraya. In 1636 King Prasat Thong had a shortcut dug across its neck; the current took the new channel, and the bend was left behind as Khlong Om Non, the “roundabout canal of Nonthaburi.”",
                th: "หลายศตวรรษก่อน เรือที่มุ่งสู่กรุงศรีอยุธยาต้องล่องอ้อมคุ้งน้ำเจ้าพระยาอันคดเคี้ยวนี้ ใน พ.ศ. 2179 สมเด็จพระเจ้าปราสาททองโปรดให้ขุดคลองลัดตัดคอคุ้ง กระแสน้ำจึงเปลี่ยนไปใช้ทางใหม่ ทิ้งคุ้งเดิมไว้เป็นคลองอ้อมนนท์",
              })}
            </p>
            <p>
              {L({
                en: "What the river left is a quiet world on the edge of Bangkok: temple piers, orchards, wooden houses on stilts and a way of life still tied to the water — now pressed by new roads, housing estates and floods.",
                th: "สิ่งที่แม่น้ำทิ้งไว้คือโลกอันเงียบสงบริมขอบกรุงเทพฯ ท่าน้ำวัด สวนผลไม้ เรือนไม้ใต้ถุนสูง และวิถีชีวิตที่ยังผูกพันกับสายน้ำ ซึ่งวันนี้กำลังถูกกดดันจากถนนใหม่ หมู่บ้านจัดสรร และน้ำท่วม",
              })}
            </p>
          </div>
        </div>
        <div data-reveal className="mx-auto w-full max-w-md lg:max-w-lg">
          <CanalMap />
        </div>
      </div>

      {/* The numbers. */}
      <div className={cn(wrap, "mt-16 sm:mt-24")}>
        <ul data-stagger className="grid grid-cols-2 gap-3 md:grid-cols-3">
          {FACTS.map((f) => (
            <li key={f.label.en} className="rounded-3xl bg-background p-5 sm:p-8">
              <p className="flex items-baseline gap-2">
                <span className="font-display text-5xl leading-none text-brand tabular-nums sm:text-7xl">
                  {f.prefix}
                  <span data-count-to={f.value} data-decimals={f.decimals ?? 0}>
                    {fmt(f.value, f.decimals)}
                  </span>
                </span>
                <span className="text-sm font-semibold text-muted-foreground sm:text-base">{L(f.unit)}</span>
              </p>
              <p className="mt-3 text-sm leading-snug text-foreground/80">{L(f.label)}</p>
            </li>
          ))}
        </ul>
      </div>

      {/* What to go and see. */}
      <div className={cn(wrap, "mt-16 sm:mt-24")}>
        <h3 data-reveal className="font-display text-4xl leading-tight sm:text-5xl">{L({ en: "What to see", th: "สิ่งที่ควรไปชม" })}</h3>
        <ul data-stagger className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {EXPLORE.map(({ icon: Icon, title, body }) => (
            <li key={title.en} className="group rounded-3xl bg-background p-6 transition duration-300 hover:-translate-y-1 hover:shadow-[0_18px_40px_-20px_rgba(60,30,20,0.35)]">
              <span className="flex size-12 items-center justify-center rounded-full bg-brand text-primary-foreground transition-transform duration-500 group-hover:rotate-[-8deg] group-hover:scale-110">
                <Icon className="size-6" />
              </span>
              <p className="mt-5 text-lg font-semibold">{L(title)}</p>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{L(body)}</p>
            </li>
          ))}
        </ul>
      </div>

      {/* Fruit of the orchards, drifting past. */}
      <div aria-hidden="true" className="mt-16 overflow-hidden border-y border-border py-5 sm:mt-24">
        <div data-marquee className="flex w-max gap-10 font-display text-4xl whitespace-nowrap text-foreground/80 sm:text-6xl">
          {[0, 1].map((copy) =>
            FRUIT.map((f, i) => (
              <span key={`${copy}-${f.en}`} className="flex items-center gap-10">
                {L(f)}
                <span className="inline-block size-3 rotate-45" style={{ background: GROUPS[i % 3].color }} />
              </span>
            )),
          )}
        </div>
      </div>

      {records && <SurveySoFar records={records} />}

      <p className={cn(wrap, "mt-12 text-xs text-muted-foreground")}>
        {L({ en: "Sources: ", th: "แหล่งข้อมูล: " })}
        {SOURCES.map((s, i) => (
          <span key={s.href}>
            {i > 0 && " · "}
            <a href={s.href} target="_blank" rel="noreferrer" className="underline underline-offset-2 hover:text-foreground">
              {s.label}
            </a>
          </span>
        ))}
      </p>
    </section>
  );
}

// --- Live numbers from the survey itself. ---

const TOTAL = STUDY_PLOTS.reduce((n, p) => n + p.buildings.length, 0);
const ZONE_TOTAL = Object.fromEntries(GROUPS.map((g) => [g.id, STUDY_PLOTS.filter((p) => p.zone === g.id).reduce((n, p) => n + p.buildings.length, 0)]));

function surveyStats(records: SurveyRecord[]) {
  const seen = new Set<string>();
  const zone: Record<string, number> = {};
  for (const r of records) {
    for (const { plot, building } of plotOf(r)) {
      const key = `${plot.key}${building}`;
      if (seen.has(key)) continue;
      seen.add(key);
      zone[plot.zone] = (zone[plot.zone] ?? 0) + 1;
    }
  }
  return {
    buildings: seen.size,
    zone,
    photos: records.reduce((n, r) => n + allPhotos(r).length, 0),
    // Older records were saved before flood lines existed.
    floods: records.reduce((n, r) => n + (r.floodLines?.length ?? 0), 0),
    jacked: records.filter((r) => r.jacked === "yes").length,
  };
}

// Mounted once records arrive, so its counters start from real numbers.
function SurveySoFar({ records }: { records: SurveyRecord[] }) {
  const { L } = useT();
  const s = surveyStats(records);
  const pct = TOTAL ? Math.min(1, s.buildings / TOTAL) : 0;
  const root = useRef<HTMLDivElement>(null);
  useAnime(root, () => {
    const [ring] = utils.$("[data-ring]");
    const undraw = drawIn("[data-ring]", { draw: ["0 0", `0 ${pct}`], duration: 2000, ease: "out(3)", autoplay: onView(ring) });
    utils.set("[data-bar]", { scaleX: 0 });
    animate("[data-bar]", { scaleX: 1, duration: 1400, delay: stagger(150, { start: 300 }), ease: "out(4)", autoplay: onView(ring) });
    countUps(root.current);
    scrollReveals(root.current);
    return undraw;
  });

  const small: { value: number; label: Label }[] = [
    { value: s.photos, label: { en: "photos taken", th: "ภาพถ่าย" } },
    { value: s.floods, label: { en: "flood lines marked", th: "ระดับน้ำท่วมที่บันทึก" } },
    { value: s.jacked, label: { en: "houses jacked up", th: "บ้านที่ดีดสูง" } },
  ];

  return (
    <div ref={root} data-scope className={cn(wrap, "mt-16 sm:mt-24")}>
      <div data-reveal className="grid gap-10 rounded-3xl bg-foreground p-6 text-background sm:p-10 lg:grid-cols-[auto_minmax(0,1fr)] lg:items-center lg:gap-16">
        <div className="relative mx-auto size-56 sm:size-64">
          <svg viewBox="0 0 100 100" className="size-full -rotate-90">
            <circle cx={50} cy={50} r={44} fill="none" stroke="currentColor" strokeOpacity={0.15} strokeWidth={8} />
            <circle data-ring cx={50} cy={50} r={44} fill="none" stroke="#D0935A" strokeWidth={8} strokeLinecap="round" strokeDasharray={`${pct * 276.5} 276.5`} />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="font-display text-6xl leading-none tabular-nums sm:text-7xl" data-count-to={s.buildings}>
              {fmt(s.buildings)}
            </span>
            <span className="mt-1 text-sm text-background/70">
              {L({ en: "of", th: "จาก" })} {fmt(TOTAL)} {L({ en: "buildings", th: "อาคาร" })}
            </span>
          </div>
        </div>
        <div>
          <p className="tag self-start">{L({ en: "Live from the field", th: "สดจากภาคสนาม" })}</p>
          <h3 className="mt-4 font-display text-4xl leading-tight sm:text-5xl">{L({ en: "The survey so far", th: "ความคืบหน้าการสำรวจ" })}</h3>
          <ul className="mt-6 space-y-4">
            {GROUPS.map((g) => {
              const done = s.zone[g.id] ?? 0;
              const total = ZONE_TOTAL[g.id] || 1;
              return (
                <li key={g.id}>
                  <div className="flex items-baseline justify-between text-sm">
                    <span className="font-semibold">
                      {L(g.label)} · <span className="font-normal text-background/70">{L(g.zone)}</span>
                    </span>
                    <span className="tabular-nums text-background/70">
                      {fmt(done)} / {fmt(ZONE_TOTAL[g.id])}
                    </span>
                  </div>
                  <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-background/15">
                    <div data-bar className="h-full origin-left rounded-full" style={{ width: `${Math.max(2, (done / total) * 100)}%`, background: g.color }} />
                  </div>
                </li>
              );
            })}
          </ul>
          <ul className="mt-8 grid grid-cols-3 gap-4 border-t border-background/15 pt-6">
            {small.map((x) => (
              <li key={x.label.en}>
                <span className="block font-display text-3xl leading-none tabular-nums sm:text-4xl" data-count-to={x.value}>
                  {fmt(x.value)}
                </span>
                <span className="mt-1 block text-xs text-background/70 sm:text-sm">{L(x.label)}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
