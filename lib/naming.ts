import { IMAGE_SLOTS, type ImageSlotKey, type Photo, type SurveyRecord } from "./schema";
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
