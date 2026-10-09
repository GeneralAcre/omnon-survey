export type Lang = "en" | "th";
export type Label = Record<Lang, string>;

export const GROUPS = [
  { id: "1", color: "#D62828", ink: "#ffffff", label: { en: "Group 1", th: "กลุ่ม 1" }, zone: { en: "Canal & Road Urbanization", th: "คลองกับการขยายตัวของถนน" } },
  { id: "2", color: "#F77F00", ink: "#000000", label: { en: "Group 2", th: "กลุ่ม 2" }, zone: { en: "Housing Estate & Orchard", th: "หมู่บ้านจัดสรรและสวนผลไม้" } },
  { id: "3", color: "#FCBF49", ink: "#000000", label: { en: "Group 3", th: "กลุ่ม 3" }, zone: { en: "Cultural Heritage Enrichment", th: "มรดกทางวัฒนธรรม" } },
] as const satisfies readonly { id: string; color: string; ink: string; label: Label; zone: Label }[];

// Group colour + readable text colour on top of it.
export function groupColor(id: string) {
  const g = GROUPS.find((x) => x.id === id);
  return { bg: g?.color ?? "#555555", fg: g?.ink ?? "#ffffff" };
}

export const BUILDING_TYPES: { id: string; label: Label }[] = [
  { id: "stilt", label: { en: "Timber house on stilts", th: "เรือนไม้ใต้ถุนสูง" } },
  { id: "panya", label: { en: "Hip-roofed (Panya) house", th: "เรือนหลังคาปั้นหยา" } },
  { id: "thai-gable", label: { en: "Thai traditional gabled house", th: "เรือนไทยหลังคาจั่ว" } },
  { id: "shophouse", label: { en: "Wood-strip shopfront", th: "ห้องแถวไม้ / บานเฟี้ยม" } },
  { id: "concrete", label: { en: "Contemporary concrete house", th: "บ้านคอนกรีตสมัยใหม่" } },
  { id: "mixed", label: { en: "Mixed timber & concrete", th: "บ้านครึ่งตึกครึ่งไม้" } },
  { id: "floating", label: { en: "Floating / raft house", th: "เรือนแพ" } },
  { id: "temple", label: { en: "Temple building", th: "อาคารในวัด" } },
  { id: "sala", label: { en: "Pavilion (sala) / pier", th: "ศาลา / ท่าน้ำ" } },
  { id: "other", label: { en: "Other", th: "อื่น ๆ" } },
];

export const FUNCTIONS: { id: string; label: Label }[] = [
  { id: "residential", label: { en: "Residential", th: "ที่อยู่อาศัย" } },
  { id: "commercial", label: { en: "Shop / commercial", th: "ร้านค้า / พาณิชย์" } },
  { id: "mixed", label: { en: "Home + shop", th: "บ้านและร้านค้า" } },
  { id: "religious", label: { en: "Religious", th: "ศาสนสถาน" } },
  { id: "community", label: { en: "Community / public", th: "ชุมชน / สาธารณะ" } },
  { id: "agricultural", label: { en: "Orchard / farming", th: "สวน / เกษตรกรรม" } },
  { id: "storage", label: { en: "Storage / workshop", th: "โกดัง / โรงงานเล็ก" } },
  { id: "vacant", label: { en: "Vacant / abandoned", th: "ว่าง / ร้าง" } },
  { id: "other", label: { en: "Other", th: "อื่น ๆ" } },
];

// The 8 shots every record asks for, in survey-sheet order.
export const IMAGE_SLOTS = [
  { key: "front", label: { en: "Front", th: "ด้านหน้า" }, hint: { en: "Whole building from the canal or street", th: "ถ่ายทั้งหลังจากฝั่งคลองหรือถนน" } },
  { key: "elevationA", label: { en: "Elevation A", th: "รูปด้าน A" }, hint: { en: "Left side, straight on", th: "ด้านซ้าย ถ่ายตรง" } },
  { key: "elevationB", label: { en: "Elevation B", th: "รูปด้าน B" }, hint: { en: "Right side, straight on", th: "ด้านขวา ถ่ายตรง" } },
  { key: "rear", label: { en: "Rear", th: "ด้านหลัง" }, hint: { en: "Back of the building", th: "ด้านหลังอาคาร" } },
  { key: "materials", label: { en: "Materials", th: "วัสดุ" }, hint: { en: "Close-up of wall, roof, floor", th: "ระยะใกล้ ผนัง หลังคา พื้น" } },
  { key: "pattern", label: { en: "Pattern", th: "ลวดลาย" }, hint: { en: "Fretwork, vents, railings", th: "ไม้ฉลุ ช่องลม ราวระเบียง" } },
  { key: "specialElements", label: { en: "Special elements", th: "องค์ประกอบพิเศษ" }, hint: { en: "Stairs to water, piers, shrines…", th: "บันไดลงน้ำ ท่าน้ำ ศาลพระภูมิ…" } },
  { key: "colorScheme", label: { en: "Color scheme", th: "โทนสี" }, hint: { en: "Main colours of the building", th: "สีหลักของอาคาร" } },
] as const satisfies readonly { key: string; label: Label; hint: Label }[];

export type ImageSlotKey = (typeof IMAGE_SLOTS)[number]["key"];

export type Person = { name: string; group: string };

export type Photo = {
  file: string;
  by: string;
  group: string;
  at: string;
};

export type ImageSlot = { photos: Photo[]; note: string };

export type HistoryEntry = { by: string; group: string; at: string; action: "created" | "edited" };

export type SurveyRecord = {
  id: string;
  group: string;
  plotNo: string;
  buildingType: string;
  buildingTypeOther: string;
  function: string;
  functionOther: string;
  images: Record<ImageSlotKey, ImageSlot>;
  colors: string[];
  notes: string;
  mapLink: string;
  lat: number | null;
  lng: number | null;
  createdBy: Person;
  updatedBy: Person;
  history: HistoryEntry[];
  createdAt: string;
  updatedAt: string;
};

export type SurveyInput = Pick<
  SurveyRecord,
  "group" | "plotNo" | "buildingType" | "buildingTypeOther" | "function" | "functionOther" | "images" | "colors" | "notes" | "mapLink" | "lat" | "lng"
>;

export function emptyImages(): Record<ImageSlotKey, ImageSlot> {
  return Object.fromEntries(IMAGE_SLOTS.map((s) => [s.key, { photos: [] as Photo[], note: "" }])) as unknown as Record<
    ImageSlotKey,
    ImageSlot
  >;
}

export function emptyInput(group = ""): SurveyInput {
  return {
    group,
    plotNo: "",
    buildingType: "",
    buildingTypeOther: "",
    function: "",
    functionOther: "",
    images: emptyImages(),
    colors: [],
    notes: "",
    mapLink: "",
    lat: null,
    lng: null,
  };
}

const str = (v: unknown, max = 2000) => (typeof v === "string" ? v.slice(0, max) : "");

export const FILE_RE = /^[a-z0-9-]+\.(jpg|jpeg|png|webp)$/i;
const HEX_RE = /^#[0-9a-f]{6}$/i;

export function sanitizePerson(raw: unknown): Person | null {
  const p = (raw ?? {}) as Record<string, unknown>;
  const name = str(p.name, 80).trim();
  const group = str(p.group, 10);
  if (!name || !GROUPS.some((g) => g.id === group)) return null;
  return { name, group };
}

// Normalises untrusted JSON from the client into a SurveyInput.
export function sanitizeInput(raw: unknown): SurveyInput {
  const r = (raw ?? {}) as Record<string, unknown>;
  const rawImages = (r.images ?? {}) as Record<string, unknown>;
  const images = emptyImages();
  for (const { key } of IMAGE_SLOTS) {
    const slot = (rawImages[key] ?? {}) as Record<string, unknown>;
    const photos = Array.isArray(slot.photos) ? slot.photos : [];
    images[key] = {
      photos: photos
        .map((p) => (p ?? {}) as Record<string, unknown>)
        .filter((p) => typeof p.file === "string" && FILE_RE.test(p.file))
        .slice(0, 20)
        .map((p) => ({
          file: p.file as string,
          by: str(p.by, 80),
          group: str(p.group, 10),
          at: str(p.at, 40),
        })),
      note: str(slot.note, 1000),
    };
  }
  return {
    group: str(r.group, 10),
    plotNo: str(r.plotNo, 50).trim(),
    buildingType: str(r.buildingType, 40),
    buildingTypeOther: str(r.buildingTypeOther, 200),
    function: str(r.function, 40),
    functionOther: str(r.functionOther, 200),
    images,
    colors: Array.isArray(r.colors)
      ? r.colors.filter((c): c is string => typeof c === "string" && HEX_RE.test(c)).slice(0, 12)
      : [],
    notes: str(r.notes, 4000),
    ...sanitizeLocation(r),
  };
}

export function groupOf(id: string) {
  return GROUPS.find((g) => g.id === id);
}

export function typeLabel(r: Pick<SurveyRecord, "buildingType" | "buildingTypeOther">, lang: Lang) {
  if (r.buildingType === "other") return r.buildingTypeOther || BUILDING_TYPES.at(-1)!.label[lang];
  return BUILDING_TYPES.find((t) => t.id === r.buildingType)?.label[lang] ?? "";
}

export function functionLabel(r: Pick<SurveyRecord, "function" | "functionOther">, lang: Lang) {
  if (r.function === "other") return r.functionOther || FUNCTIONS.at(-1)!.label[lang];
  return FUNCTIONS.find((t) => t.id === r.function)?.label[lang] ?? "";
}

export function allPhotos(r: Pick<SurveyRecord, "images">) {
  return IMAGE_SLOTS.flatMap((s) => (r.images[s.key]?.photos ?? []).map((p) => ({ ...p, slot: s.key })));
}

export function shotsDone(r: Pick<SurveyRecord, "images">) {
  return IMAGE_SLOTS.filter((s) => (r.images[s.key]?.photos.length ?? 0) > 0).length;
}

const num = (v: unknown, min: number, max: number) =>
  typeof v === "number" && Number.isFinite(v) && v >= min && v <= max ? Math.round(v * 1e6) / 1e6 : null;

// Pull "lat,lng" out of the common Google Maps URL shapes.
export function coordsFromLink(link: string): { lat: number; lng: number } | null {
  const m =
    link.match(/@(-?\d{1,2}\.\d+),(-?\d{1,3}\.\d+)/) ??
    link.match(/[?&](?:q|query|ll|destination)=(-?\d{1,2}\.\d+)(?:,|%2C)\s*(-?\d{1,3}\.\d+)/i) ??
    link.match(/!3d(-?\d{1,2}\.\d+)!4d(-?\d{1,3}\.\d+)/) ??
    link.match(/^\s*(-?\d{1,2}\.\d+)\s*,\s*(-?\d{1,3}\.\d+)\s*$/);
  if (!m) return null;
  const lat = num(Number(m[1]), -90, 90);
  const lng = num(Number(m[2]), -180, 180);
  return lat !== null && lng !== null ? { lat, lng } : null;
}

export function mapsLink(lat: number, lng: number) {
  return `https://www.google.com/maps?q=${lat},${lng}`;
}

function sanitizeLocation(r: Record<string, unknown>) {
  let mapLink = str(r.mapLink, 500).trim();
  let lat = num(r.lat, -90, 90);
  let lng = num(r.lng, -180, 180);
  // Bare "13.85, 100.47" pasted into the link box becomes a real link.
  const fromLink = mapLink ? coordsFromLink(mapLink) : null;
  if (fromLink && !/^https?:\/\//i.test(mapLink)) mapLink = mapsLink(fromLink.lat, fromLink.lng);
  if (mapLink && !/^https?:\/\//i.test(mapLink)) mapLink = "";
  if (fromLink) ({ lat, lng } = fromLink);
  if (lat === null || lng === null) lat = lng = null;
  if (!mapLink && lat !== null && lng !== null) mapLink = mapsLink(lat, lng);
  return { mapLink, lat, lng };
}
