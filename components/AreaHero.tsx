"use client";

import dynamic from "next/dynamic";
import type { SurveyRecord } from "@/lib/schema";
import { useT } from "./app-state";

// Leaflet touches `window`, so the map only loads in the browser.
const StudyMap = dynamic(() => import("./StudyMap"), {
  ssr: false,
  loading: () => <div className="aspect-[2.15/1] w-full animate-pulse bg-card sm:aspect-[2/1] lg:aspect-[3/2]" />,
});

// A still view of the study area; tap it to open the full map.
export default function AreaHero({ records, onOpen }: { records: SurveyRecord[]; onOpen: () => void }) {
  const { t } = useT();
  return (
    <button onClick={onOpen} aria-label={t("openMap")} className="relative block w-full overflow-hidden rounded-3xl text-left transition hover:opacity-90">
      <StudyMap records={records} preview className="aspect-[2.15/1] sm:aspect-[2/1] lg:aspect-[3/2]" />
      <span className="absolute top-3 left-3 z-[500] rounded-full bg-background/95 px-3 py-1.5 text-xs font-semibold shadow-sm backdrop-blur">{t("openMap")}</span>
    </button>
  );
}
