import data from "./study-area.json";
import type { SurveyRecord } from "./schema";

// The study area from the Short ID map (Omnon_Short_ID_new_Z04-Z06.pdf), pages 1–3 = Zones 1–3.
// Building IDs read "Z01L-16A": zone, bank, plot number, building letter(s).
// Banks follow what the surveyors use (checked against the live records, Nov 2026):
// Zones 1–2: L = north/east bank, R = south/west. Zone 3: R = east bank, L = west.
// Plot numbers start again on each bank, so "16A" exists on both sides.

export type Side = "L" | "R";

export type StudyZone = { id: string; zone: string; side: Side; ring: [number, number][] };

// One point per land plot (several buildings); `buildings` are [letter(s), lat, lng].
// `key` is unique; a plot number that shows up in two places gets "~1" on the second.
export type StudyPlot = {
  key: string;
  zone: string;
  side: Side;
  plot: string;
  lat: number;
  lng: number;
  buildings: [string, number, number][];
};

export const STUDY_ZONES = data.zones as StudyZone[];
export const STUDY_PLOTS = data.plots as StudyPlot[];

export const plotId = (p: Pick<StudyPlot, "zone" | "side" | "plot">) => `Z${p.zone.padStart(2, "0")}${p.side}-${p.plot}`;

export const buildingId = (p: Pick<StudyPlot, "zone" | "side" | "plot">, code: string) => `${plotId(p)}${code}`;

// Reads plot numbers the way surveyors type them, one record often covering
// several buildings: "Z01L-16A", "Z01L-15ABCDEF", "Z01L-23C/24ABC",
// "ZO2R-44C D E" (letter O for zero; letters alone belong to the plot before),
// "Z03R-15A.1 15A.2", "Z01R-2BCD (Atthayasai)", "Z03L- 24J", "16A".
export function parsePlotNo(text: string) {
  let s = text.toUpperCase().replace(/\(.*?\)/g, " ");
  const head = s.match(/^\s*Z\s*[O0]?\s*(\d)\s*([LR])?\s*-?/);
  if (head) s = s.slice(head[0].length);
  const items: { plot: string; letters: string }[] = [];
  let last = "";
  for (const tok of s.split(/[\s,/&+]+/).filter(Boolean)) {
    const m = tok.match(/^(\d{1,3})?([A-Z]*)(?:\.\d+)?$/);
    if (!m || (!m[1] && !last)) continue;
    last = m[1] ? String(Number(m[1])) : last;
    items.push({ plot: last, letters: m[2] });
  }
  return items.length ? { zone: head?.[1], side: head?.[2] as Side | undefined, items } : null;
}

// The plots and buildings a survey record covers. "15ABC" is 15A, 15B and 15C,
// unless the plot really has a two-letter building (30AB in the temple compound).
// The zone in the text wins over the record's zone; without a bank, it picks
// the bank whose plot has those letters.
export function plotOf(r: Pick<SurveyRecord, "group" | "plotNo">) {
  const id = parsePlotNo(r.plotNo);
  const out: { plot: StudyPlot; building: string }[] = [];
  for (const { plot: n, letters } of id?.items ?? []) {
    const zone = id!.zone ?? r.group;
    const candidates = STUDY_PLOTS.filter((p) => p.zone === zone && p.plot === n && (!id!.side || p.side === id!.side));
    const has = (p: StudyPlot, c: string) => p.buildings.some(([b]) => b === c);
    const plot = candidates.find((p) => letters && (has(p, letters) || has(p, letters[0]))) ?? candidates[0];
    if (!plot) continue;
    const codes = !letters ? [""] : letters.length === 2 && has(plot, letters) ? [letters] : [...letters];
    for (const building of codes) if (!out.some((o) => o.plot === plot && o.building === building)) out.push({ plot, building });
  }
  return out;
}
