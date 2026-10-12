import { IMAGE_SLOTS, allPhotos, type ImageSlotKey, type Photo, type SurveyRecord } from "./schema";
import { safeSegment } from "./zip";

// Human-readable download name, e.g. G2_Plot-A01_Front_1_Somchai.jpg
export function photoFileName(r: Pick<SurveyRecord, "group" | "plotNo">, slot: ImageSlotKey, index: number, p: Photo) {
  const slotName = IMAGE_SLOTS.find((s) => s.key === slot)!.label.en;
  const ext = p.file.split(".").pop();
  return `G${r.group}_Plot-${safeSegment(r.plotNo)}_${safeSegment(slotName)}_${index + 1}_${safeSegment(p.by || "unknown")}.${ext}`;
}

export function slotFolder(slot: ImageSlotKey) {
  const i = IMAGE_SLOTS.findIndex((s) => s.key === slot);
  return `${String(i + 1).padStart(2, "0")}-${safeSegment(IMAGE_SLOTS[i].label.en)}`;
}

// Photo ZIPs are split into parts of about this many photos (~400 MB), so each
// download finishes within the server's time limit and stays under ZIP's 4 GB cap.
export const ZIP_PART_PHOTOS = 300;

// Buildings with photos in export order, packed whole into parts. The menu and
// the server both call this, so a fixed locale keeps their sort identical.
export function zipParts<T extends Pick<SurveyRecord, "id" | "group" | "plotNo" | "images">>(records: T[]): T[][] {
  const sorted = [...records].sort(
    (a, b) => a.group.localeCompare(b.group, "en") || a.plotNo.localeCompare(b.plotNo, "en", { numeric: true }) || (a.id < b.id ? -1 : 1),
  );
  const parts: T[][] = [];
  let count = 0;
  for (const r of sorted) {
    const n = allPhotos(r).length;
    if (!n) continue;
    if (!parts.length || count + n > ZIP_PART_PHOTOS) {
      parts.push([]);
      count = 0;
    }
    parts.at(-1)!.push(r);
    count += n;
  }
  return parts;
}
