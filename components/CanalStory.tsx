"use client";

import { animate, onScroll, stagger, svg, utils } from "animejs";
import Image from "next/image";
import { useRef } from "react";
import { GROUPS, allPhotos, groupColor, type Label, type SurveyRecord } from "@/lib/schema";
import { STUDY_PLOTS, plotOf } from "@/lib/study-area";
import { cn } from "@/lib/utils";
import { useT } from "./app-state";
import { countUps, drawIn, onView, scrollReveals, useAnime } from "./motion";
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

const fmt = (n: number, decimals = 0) => n.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

// The opening story for visitors: how the river became a canal, beside a map that draws itself.
export function StoryIntro() {
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
    countUps(root.current);
    scrollReveals(root.current);
    return undraw;
  });

  return (
    <section ref={root} id="discover" data-scope className="scroll-mt-16 overflow-hidden py-20 sm:py-28">
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
                en: "What the river left is a quiet world on the edge of Bangkok: temple piers, orchards, wooden houses on stilts and a way of life that still follows the water. Today it is under pressure from new roads, housing estates and floods.",
                th: "สิ่งที่แม่น้ำทิ้งไว้คือโลกอันเงียบสงบริมขอบกรุงเทพฯ ท่าน้ำวัด สวนผลไม้ เรือนไม้ใต้ถุนสูง และวิถีชีวิตที่ยังผูกพันกับสายน้ำ ซึ่งวันนี้กำลังถูกกดดันจากถนนใหม่ หมู่บ้านจัดสรร และน้ำท่วม",
              })}
            </p>
          </div>
        </div>
        <div data-reveal className="mx-auto w-full max-w-md lg:max-w-lg">
          <CanalMap />
        </div>
      </div>
    </section>
  );
}

// One period is 300 units; the path spans two screens' worth so sliding it by half loops seamlessly.
const WAVE = `M0 20${Array.from({ length: 8 }, (_, i) => ` Q${i * 300 + 75} 4 ${i * 300 + 150} 20 T${i * 300 + 300} 20`).join("")} V40 H0Z`;

// The dark band: archive photos of the canal when boats were the road, with water running along its foot.
export function ThenPhotos() {
  const { L } = useT();
  const root = useRef<HTMLElement>(null);
  useAnime(root, () => {
    // The photos open like a curtain lifting, the picture settling as it does, then drift on scroll.
    for (const frame of utils.$("[data-photo]")) {
      const img = frame.querySelector("img")!;
      utils.set(frame, { clipPath: "inset(100% 0% 0% 0%)" });
      animate(frame, { clipPath: "inset(0% 0% 0% 0%)", duration: 1400, ease: "inOut(4)", autoplay: onView(frame) });
      animate(img, { scale: [1.3, 1.08], duration: 2200, ease: "out(3)", autoplay: onView(frame) });
      animate(img, { y: ["-4%", "4%"], ease: "linear", autoplay: onScroll({ target: frame, enter: "bottom top", leave: "top bottom", sync: true }) });
    }
    animate("[data-wave]", { x: ["0%", "-50%"], duration: 14000, ease: "linear", loop: true });
    animate("[data-wave-slow]", { x: ["-50%", "0%"], duration: 22000, ease: "linear", loop: true });
    scrollReveals(root.current);
  });
  return (
    <section ref={root} data-scope className="relative overflow-hidden bg-foreground pt-20 pb-28 text-background sm:pt-28 sm:pb-36">
      <div className={cn(wrap, "grid gap-3 md:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] md:items-end")}>
        <figure>
          <div data-photo className="relative aspect-[923/590] overflow-hidden rounded-3xl bg-background/10">
            <Image src={boats} alt={L({ en: "Passenger boats on Khlong Om Non, archival photograph", th: "เรือโดยสารในคลองอ้อมนนท์ ภาพถ่ายในอดีต" })} fill sizes="(min-width: 768px) 58vw, 100vw" placeholder="blur" className="object-cover" />
          </div>
        </figure>
        <figure>
          <div data-photo className="relative aspect-[419/279] overflow-hidden rounded-3xl bg-background/10">
            <Image src={boatsFar} alt={L({ en: "A line of boats travelling the canal past riverside houses, archival photograph", th: "ขบวนเรือล่องผ่านบ้านริมคลอง ภาพถ่ายในอดีต" })} fill sizes="(min-width: 768px) 42vw, 100vw" placeholder="blur" className="object-cover" />
          </div>
          <figcaption data-reveal className="mt-5 px-1">
            <p className="tag inline-block">{L({ en: "Then", th: "วันวาน" })}</p>
            <p className="mt-4 font-display text-4xl leading-[1.02] sm:text-5xl">{L({ en: "When the canal was the road", th: "เมื่อคลองคือถนน" })}</p>
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
        <svg data-wave-slow viewBox="0 0 2400 40" preserveAspectRatio="none" className="absolute bottom-0 left-0 h-full w-[200%] text-background opacity-30">
          <path d={WAVE} fill="currentColor" />
        </svg>
        <svg data-wave viewBox="0 0 2400 40" preserveAspectRatio="none" className="absolute bottom-0 left-0 h-3/4 w-[200%] text-background">
          <path d={WAVE} fill="currentColor" />
        </svg>
      </div>
    </section>
  );
}

// --- Live numbers from the survey itself: every building in the study area as a dot where it stands. ---

const MID_LAT = (13.81536 + 13.831909) / 2;
const ALL = STUDY_PLOTS.flatMap((p) => p.buildings.map(([code, lat, lng]) => ({ key: `${p.key}|${code}`, zone: p.zone, lat, lng })));
const LNGS = ALL.map((b) => b.lng);
const LATS = ALL.map((b) => b.lat);
const [MIN_LNG, MAX_LAT] = [Math.min(...LNGS), Math.max(...LATS)];
const KX = Math.cos((MID_LAT * Math.PI) / 180);
const SCALE = 1000 / ((Math.max(...LNGS) - MIN_LNG) * KX);
const PAD = 16;
const DOTS = ALL.map((b) => ({ ...b, x: PAD + (b.lng - MIN_LNG) * KX * SCALE, y: PAD + (MAX_LAT - b.lat) * SCALE }));
const VIEW_W = 1000 + PAD * 2;
const VIEW_H = Math.ceil(Math.max(...DOTS.map((d) => d.y)) + PAD);
const ZONE_TOTAL = Object.fromEntries(GROUPS.map((g) => [g.id, DOTS.filter((d) => d.zone === g.id).length]));
// Where each zone's number sits: the middle of its buildings.
const ZONE_MID = GROUPS.map((g) => {
  const ds = DOTS.filter((d) => d.zone === g.id);
  return { id: g.id, x: ds.reduce((n, d) => n + d.x, 0) / ds.length, y: ds.reduce((n, d) => n + d.y, 0) / ds.length };
});

function surveyStats(records: SurveyRecord[]) {
  const lit = new Set<string>();
  for (const r of records) {
    for (const { plot, building } of plotOf(r)) {
      // A record for the whole plot covers every building on it.
      const codes = building ? [building] : plot.buildings.map(([c]) => c);
      for (const c of codes) lit.add(`${plot.key}|${c}`);
    }
  }
  const zone: Record<string, number> = {};
  for (const d of DOTS) if (lit.has(d.key)) zone[d.zone] = (zone[d.zone] ?? 0) + 1;
  return {
    lit,
    buildings: DOTS.filter((d) => lit.has(d.key)).length,
    zone,
    photos: records.reduce((n, r) => n + allPhotos(r).length, 0),
    // Older records were saved before flood lines existed.
    floods: records.reduce((n, r) => n + (r.floodLines?.length ?? 0), 0),
    jacked: records.filter((r) => r.jacked === "yes").length,
  };
}

// Mounted once records arrive, so the lit buildings and counters start from real numbers.
export function SurveySoFar({ records }: { records: SurveyRecord[] }) {
  const { L } = useT();
  const s = surveyStats(records);
  const root = useRef<HTMLDivElement>(null);
  useAnime(root, () => {
    const [map] = utils.$("[data-field]");
    // The buildings appear along the canal in survey order, like a lamp being carried down the bank...
    utils.set("[data-b]", { opacity: 0 });
    animate("[data-b]", { opacity: 1, duration: 500, delay: stagger(1.6), ease: "out(2)", autoplay: onView(map) });
    // ...then the documented ones light up and keep breathing.
    utils.set("[data-lit]", { r: 0 });
    animate("[data-lit]", { r: [0, 10, 7], duration: 1200, delay: stagger(60, { start: 2000 }), ease: "out(3)", autoplay: onView(map) });
    utils.set("[data-halo]", { r: 7, opacity: 0 });
    animate("[data-halo]", { r: [7, 24], opacity: [0.5, 0], duration: 2200, delay: stagger(200, { start: 3000 }), loop: true, ease: "out(2)", autoplay: onView(map) });
    countUps(root.current);
    scrollReveals(root.current);
  });

  const pct = DOTS.length ? (s.buildings / DOTS.length) * 100 : 0;
  const extras: { value: number; label: Label }[] = [
    { value: s.photos, label: { en: s.photos === 1 ? "photo" : "photos", th: "ภาพถ่าย" } },
    { value: s.floods, label: { en: s.floods === 1 ? "flood line" : "flood lines", th: "ระดับน้ำท่วม" } },
    { value: s.jacked, label: { en: s.jacked === 1 ? "house jacked up" : "houses jacked up", th: "บ้านที่ดีดสูง" } },
  ];
  const lit = DOTS.filter((d) => s.lit.has(d.key));

  return (
    <div ref={root} data-scope className={cn(wrap, "relative")}>
      {/* Wide screens: the words sit in the open ground below the canal's bend. */}
      <div className="grid gap-8 lg:absolute lg:bottom-0 lg:left-8 lg:w-[44%] lg:gap-6">
        <div data-reveal>
          <p className="tag self-start">{L({ en: "Live from the field", th: "สดจากภาคสนาม" })}</p>
          <p className="mt-5 font-display text-4xl leading-[1.05] sm:text-5xl xl:text-6xl">
            <span className="text-brand" data-count-to={s.buildings}>
              {fmt(s.buildings)}
            </span>{" "}
            {L({ en: `of ${fmt(DOTS.length)} buildings along the canal documented so far.`, th: `จาก ${fmt(DOTS.length)} อาคารริมคลอง ได้รับการบันทึกแล้ว` })}
          </p>
          <p className="mt-4 text-sm text-muted-foreground">
            {L({ en: "Every dot is a building in the study area, where it stands.", th: "ทุกจุดคืออาคารหนึ่งหลังในพื้นที่ศึกษา ตามตำแหน่งจริง" })} {pct > 0 && pct < 1 ? "<1" : Math.round(pct)}
            {L({ en: "% done.", th: "% เสร็จแล้ว" })}
          </p>
        </div>
        <dl data-stagger className="grid gap-3 text-sm">
          {GROUPS.map((g) => (
            <div key={g.id} className="flex items-baseline gap-3 border-b border-foreground/10 pb-3">
              <span className="size-2.5 shrink-0 translate-y-[-1px] rounded-full" style={{ background: g.color }} />
              <dt className="flex-1">
                <span className="font-semibold">{L(g.label)}</span>
              </dt>
              <dd className="tabular-nums">
                <span className="font-semibold">{fmt(s.zone[g.id] ?? 0)}</span>
                <span className="text-muted-foreground"> / {fmt(ZONE_TOTAL[g.id])}</span>
              </dd>
            </div>
          ))}
          <div className="flex gap-6 pt-1 text-muted-foreground">
            {extras.map((x) => (
              <span key={x.label.en}>
                <span className="font-semibold text-foreground tabular-nums" data-count-to={x.value}>
                  {fmt(x.value)}
                </span>{" "}
                {L(x.label)}
              </span>
            ))}
          </div>
        </dl>
      </div>

      <svg
        data-field
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        role="img"
        aria-label={L({ en: `Map of ${DOTS.length} buildings; ${s.buildings} documented`, th: `แผนที่อาคาร ${DOTS.length} หลัง บันทึกแล้ว ${s.buildings} หลัง` })}
        className="mt-8 h-auto w-full lg:mt-0"
      >
        {/* Not yet documented: a faint dot in its zone's colour. */}
        {/* On phones the map is a third the size, so the dots grow by stroke (see globals.css). */}
        <g opacity={0.55}>
          {DOTS.map((d) => {
            const c = groupColor(d.zone).bg;
            return <circle data-b key={d.key} cx={d.x} cy={d.y} r={2.6} fill={c} stroke={c} strokeWidth={0} />;
          })}
        </g>
        {lit.map((d) => {
          const c = groupColor(d.zone).bg;
          return (
            <g key={d.key} data-grow style={{ transformOrigin: `${d.x}px ${d.y}px` }}>
              <circle data-halo cx={d.x} cy={d.y} r={6} fill="none" stroke="var(--foreground)" strokeWidth={1.5} opacity={0} />
              <circle data-lit cx={d.x} cy={d.y} r={7} fill={c} stroke="var(--foreground)" strokeWidth={2} />
            </g>
          );
        })}
        {ZONE_MID.map((z) => {
          const g = groupColor(z.id);
          return (
            <g key={z.id} data-grow style={{ transformOrigin: `${z.x}px ${z.y}px` }}>
              <circle cx={z.x} cy={z.y} r={13} fill={g.bg} stroke="var(--card)" strokeWidth={3} />
              <text x={z.x} y={z.y} textAnchor="middle" dy="0.35em" fontSize={13} fontWeight={700} fill={g.fg}>
                {z.id}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
