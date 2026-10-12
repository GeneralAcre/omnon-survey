"use client";

import { useSyncExternalStore } from "react";
import type { Label, Lang, Person } from "@/lib/schema";

// Tiny localStorage-backed stores for the UI language and the current surveyor.
function createStore<T>(key: string, parse: (raw: string | null) => T, serverValue: T) {
  const listeners = new Set<() => void>();
  let cachedRaw: string | null | undefined;
  let cached: T = serverValue;

  const read = (): T => {
    let raw: string | null = null;
    try {
      raw = localStorage.getItem(key);
    } catch {}
    if (raw !== cachedRaw) {
      cachedRaw = raw;
      cached = parse(raw);
    }
    return cached;
  };

  return {
    use: () =>
      useSyncExternalStore(
        (cb) => {
          listeners.add(cb);
          const onStorage = (e: StorageEvent) => e.key === key && cb();
          window.addEventListener("storage", onStorage);
          return () => {
            listeners.delete(cb);
            window.removeEventListener("storage", onStorage);
          };
        },
        read,
        () => serverValue,
      ),
    set: (value: T | null) => {
      try {
        if (value === null) localStorage.removeItem(key);
        else localStorage.setItem(key, JSON.stringify(value));
      } catch {}
      listeners.forEach((l) => l());
    },
  };
}

const langStore = createStore<Lang>("omnon.lang", (raw) => (raw === '"th"' ? "th" : "en"), "en");

// `undefined` = not yet read on the client (avoids flashing the sign-in screen).
const userStore = createStore<Person | null | undefined>(
  "omnon.user",
  (raw) => {
    try {
      const p = JSON.parse(raw ?? "null");
      return p && typeof p.name === "string" && typeof p.group === "string" ? p : null;
    } catch {
      return null;
    }
  },
  undefined,
);

export const useLang = langStore.use;
export const setLang = (l: Lang) => langStore.set(l);
export const useUser = userStore.use;
export const setUser = (p: Person | null) => userStore.set(p);

const DICT = {
  appName: { en: "Om Non Survey", th: "สำรวจคลองอ้อมนนท์" },
  records: { en: "Buildings", th: "อาคาร" },
  newRecord: { en: "New building", th: "เพิ่มอาคาร" },
  all: { en: "All", th: "ทั้งหมด" },
  mine: { en: "Mine", th: "ของฉัน" },
  search: { en: "Search plot, type, name…", th: "ค้นหาเลขแปลง ประเภท ชื่อ…" },
  empty: { en: "No buildings yet. Tap + to add the first one.", th: "ยังไม่มีข้อมูล แตะ + เพื่อเพิ่มอาคารแรก" },
  noMatch: { en: "Nothing matches.", th: "ไม่พบข้อมูล" },
  loading: { en: "Loading…", th: "กำลังโหลด…" },
  loadError: { en: "Couldn't load. Check signal and pull to refresh.", th: "โหลดไม่สำเร็จ ตรวจสอบสัญญาณแล้วลองใหม่" },
  retry: { en: "Retry", th: "ลองใหม่" },
  shots: { en: "shots", th: "ภาพ" },
  by: { en: "by", th: "โดย" },
  filledBy: { en: "Filled in by", th: "บันทึกโดย" },
  editedBy: { en: "Last edited by", th: "แก้ไขล่าสุดโดย" },
  takenBy: { en: "Taken by", th: "ถ่ายโดย" },
  history: { en: "History", th: "ประวัติ" },
  created: { en: "created", th: "สร้าง" },
  edited: { en: "edited", th: "แก้ไข" },
  // sign-in
  yourName: { en: "Your name", th: "ชื่อของคุณ" },
  yourGroup: { en: "Which zone you're exploring", th: "โซนที่คุณสำรวจ" },
  start: { en: "Start surveying", th: "เริ่มสำรวจ" },
  welcome: { en: "Who's surveying?", th: "ใครกำลังสำรวจ?" },
  welcomeSub: {
    en: "Your name is attached to every photo and record you add, so the team knows who did what.",
    th: "ชื่อของคุณจะถูกบันทึกกับทุกภาพและข้อมูลที่เพิ่ม เพื่อให้ทีมรู้ว่าใครทำอะไร",
  },
  about: { en: "About the workshop", th: "เกี่ยวกับเวิร์กช็อป" },
  multiHint: { en: "Every shot is optional — take as many or as few photos as you need.", th: "ทุกหัวข้อไม่บังคับ ถ่ายกี่ภาพก็ได้ตามต้องการ" },
  nextBuilding: { en: "ready for the next building", th: "พร้อมสำหรับอาคารถัดไป" },
  viewIt: { en: "View", th: "ดู" },
  location: { en: "Location", th: "ตำแหน่ง" },
  useMyLocation: { en: "Use my current location", th: "ใช้ตำแหน่งปัจจุบัน" },
  locating: { en: "Finding location…", th: "กำลังหาตำแหน่ง…" },
  locationFailed: { en: "Couldn't get location. Allow location access, or paste a Google Maps link.", th: "หาตำแหน่งไม่ได้ อนุญาตการเข้าถึงตำแหน่ง หรือวางลิงก์ Google Maps" },
  locationNeedsHttps: { en: "GPS needs the secure (https) site. Paste a Google Maps link instead.", th: "GPS ใช้ได้เฉพาะเว็บ https โปรดวางลิงก์ Google Maps แทน" },
  pasteMapLink: { en: "…or paste a Google Maps link", th: "…หรือวางลิงก์ Google Maps" },
  linkSaved: { en: "Link saved", th: "บันทึกลิงก์แล้ว" },
  openMaps: { en: "Open in Google Maps", th: "เปิดใน Google Maps" },
  findOnMaps: { en: "Open Google Maps to copy a link", th: "เปิด Google Maps เพื่อคัดลอกลิงก์" },
  photosWaiting: { en: "photo(s) saved on this phone — they'll upload when signal returns.", th: "ภาพบันทึกไว้ในเครื่องแล้ว จะอัปโหลดเมื่อมีสัญญาณ" },
  onPhone: { en: "Saved on phone", th: "อยู่ในเครื่อง" },
  confirmDiscardPhoto: { en: "Delete this photo from the phone? It hasn't been uploaded yet.", th: "ลบภาพนี้? ภาพยังไม่ได้อัปโหลด" },
  noSignal: { en: "No signal — everything is kept on this phone. Try again in a moment.", th: "ไม่มีสัญญาณ ข้อมูลยังอยู่ในเครื่อง ลองใหม่อีกครั้ง" },
  badPhoto: { en: "Can't use this photo", th: "ใช้ภาพนี้ไม่ได้" },
  badPhotoFooter: { en: "Some photos can't be read — delete them (red) to save. Set the camera to JPEG / Most Compatible.", th: "บางภาพอ่านไม่ได้ ลบภาพที่เป็นสีแดงก่อนบันทึก ตั้งกล้องเป็น JPEG / Most Compatible" },
  openBuilding: { en: "Open building", th: "เปิดอาคาร" },
  viewList: { en: "Buildings", th: "อาคาร" },
  viewPhotos: { en: "Photos", th: "ภาพถ่าย" },
  viewMap: { en: "Map", th: "แผนที่" },
  noPlace: { en: "not on the map yet: add a location when editing", th: "ยังไม่อยู่บนแผนที่: เพิ่มตำแหน่งได้ตอนแก้ไข" },
  noPhotos: { en: "No photos yet.", th: "ยังไม่มีภาพถ่าย" },
  showMore: { en: "Show more", th: "แสดงเพิ่ม" },
  studyArea: { en: "Study area", th: "พื้นที่ศึกษา" },
  zone: { en: "Zone", th: "โซน" },
  live: { en: "Live", th: "สด" },
  justAdded: { en: "just added a building", th: "เพิ่งเพิ่มอาคาร" },
  viewOnly: { en: "View only — only Zone {n} can edit this building.", th: "ดูได้อย่างเดียว — เฉพาะโซน {n} แก้ไขอาคารนี้ได้" },
  groupOwns: { en: "Saved under your zone. Other zones can see it but not change it.", th: "บันทึกในโซนของคุณ โซนอื่นดูได้แต่แก้ไขไม่ได้" },
  notTaken: { en: "not taken", th: "ไม่ได้ถ่าย" },
  photos: { en: "photos", th: "ภาพ" },
  takeAnother: { en: "Take another", th: "ถ่ายเพิ่ม" },
  switchUser: { en: "Switch surveyor", th: "เปลี่ยนผู้สำรวจ" },
  surveyingAs: { en: "Surveying as", th: "กำลังสำรวจในชื่อ" },
  // wizard
  stepPlot: { en: "Plot", th: "แปลง" },
  stepType: { en: "Building type", th: "ประเภทอาคาร" },
  stepFunction: { en: "Function", th: "การใช้งาน" },
  stepPhotos: { en: "Photos", th: "ภาพถ่าย" },
  stepColors: { en: "Colours & notes", th: "สีและบันทึก" },
  stepReview: { en: "Check & save", th: "ตรวจสอบและบันทึก" },
  plotNo: { en: "Plot number", th: "เลขแปลง" },
  plotHint: { en: "From the land plot map, e.g. A-12", th: "ตามแผนที่แปลงที่ดิน เช่น A-12" },
  group: { en: "Zone", th: "โซน" },
  buildingDetails: { en: "Building details", th: "ข้อมูลอาคาร" },
  buildYear: { en: "Year built", th: "ปีที่สร้าง" },
  buildYearHint: { en: "2510", th: "2510" },
  buildAge: { en: "Age (years)", th: "อายุ (ปี)" },
  buildAgeHint: { en: "50", th: "50" },
  floors: { en: "Floors", th: "จำนวนชั้น" },
  floorsHint: { en: "2", th: "2" },
  floorsUnit: { en: "floors", th: "ชั้น" },
  yearsOld: { en: "yrs", th: "ปี" },
  optional: { en: "optional", th: "ไม่บังคับ" },
  shotFull: { en: "This shot is full ({n} photos max). Remove one to add another.", th: "หัวข้อนี้ครบแล้ว (สูงสุด {n} ภาพ) ลบภาพออกก่อนจึงเพิ่มได้" },
  shotTooMany: { en: "Only the first {n} photos were added — this shot is now full.", th: "เพิ่มได้เพียง {n} ภาพแรก หัวข้อนี้ครบแล้ว" },
  materialHint: { en: "What material? e.g. Wall: teak", th: "วัสดุอะไร เช่น ผนัง: ไม้สัก" },
  pickAll: { en: "Pick all that apply", th: "เลือกได้มากกว่า 1 ข้อ" },
  occupancy: { en: "People living here", th: "จำนวนผู้อยู่อาศัย" },
  occupancyHint: { en: "e.g. 4 (0 if empty)", th: "เช่น 4 (ไม่มีคนอยู่ใส่ 0)" },
  people: { en: "people", th: "คน" },
  jacked: { en: "Has the house ever been jacked up?", th: "เคยดีดบ้าน / ยกบ้านหรือไม่" },
  jackedWhat: { en: "What's this?", th: "ดีดบ้านคืออะไร?" },
  jackedBefore: { en: "Before", th: "ก่อน" },
  jackedAfter: { en: "After jacking up", th: "หลังดีดบ้าน" },
  jackedExplain: {
    en: "The whole house is lifted on jacks and set on taller posts or a new base, so floodwater stays below the floor.",
    th: "ยกตัวบ้านทั้งหลังขึ้นด้วยแม่แรง แล้วต่อเสาหรือทำฐานใหม่ให้สูงขึ้น เพื่อให้พื้นบ้านอยู่เหนือระดับน้ำท่วม",
  },
  floodLine: { en: "Flood lines on the house", th: "ระดับคราบน้ำท่วมบนตัวบ้าน" },
  floodYear: { en: "Year", th: "ปี" },
  floodYearHint: { en: "Year", th: "ปี เช่น 2554" },
  floodLevel: { en: "Flood level", th: "ระดับน้ำ" },
  floodLevelHint: { en: "Height, e.g. 1.2 m above ground", th: "ความสูง เช่น 1.2 ม. จากพื้น" },
  addFlood: { en: "Add another flood", th: "เพิ่มน้ำท่วมอีกครั้ง" },
  duplicate: { en: "Your zone already has this plot — check before saving.", th: "โซนของคุณมีแปลงนี้แล้ว โปรดตรวจสอบ" },
  openExisting: { en: "Open it", th: "เปิดดู" },
  describe: { en: "Describe…", th: "ระบุ…" },
  takePhoto: { en: "Take photo", th: "ถ่ายภาพ" },
  gallery: { en: "Gallery", th: "คลังภาพ" },
  addMore: { en: "Add", th: "เพิ่ม" },
  noteOptional: { en: "Note (optional)", th: "บันทึก (ไม่บังคับ)" },
  uploading: { en: "Uploading", th: "กำลังอัปโหลด" },
  uploadFailed: { en: "Upload failed — tap to retry", th: "อัปโหลดไม่สำเร็จ แตะเพื่อลองใหม่" },
  pickFromPhoto: { en: "Tap a photo to get its main colours", th: "แตะภาพเพื่อดึงสีหลัก" },
  addSwatch: { en: "Add colour", th: "เพิ่มสี" },
  tapToSample: { en: "Tap anywhere on the photo to grab a colour", th: "แตะบนภาพเพื่อดูดสี" },
  mainColours: { en: "Main colours in this photo", th: "สีหลักในภาพนี้" },
  findingColours: { en: "Finding colours…", th: "กำลังหาสี…" },
  addAll: { en: "Add all", th: "เพิ่มทั้งหมด" },
  yourScheme: { en: "Colour scheme", th: "ชุดสี" },
  schemeEmpty: { en: "No colours yet", th: "ยังไม่มีสี" },
  pickByHand: { en: "Pick a colour by hand", th: "เลือกสีเองจากภาพ" },
  done: { en: "Done", th: "เสร็จ" },
  notes: { en: "Notes", th: "บันทึกเพิ่มเติม" },
  notesHint: {
    en: "Condition, age, relation to the water, floodwall, what the owner said…",
    th: "สภาพอาคาร อายุ ความสัมพันธ์กับน้ำ เขื่อน ข้อมูลจากเจ้าของ…",
  },
  colorsNoPhoto: { en: "Add a photo first to pick colours from it, or add colours manually.", th: "เพิ่มภาพก่อนเพื่อดูดสี หรือเพิ่มสีเอง" },
  back: { en: "Back", th: "ย้อนกลับ" },
  next: { en: "Continue", th: "ดำเนินการต่อ" },
  skip: { en: "Skip", th: "ข้าม" },
  save: { en: "Save building", th: "บันทึกอาคาร" },
  saving: { en: "Saving…", th: "กำลังบันทึก…" },
  uploadsAfterSave: {
    en: "{n} photo(s) still uploading. You can save now; they'll be added automatically.",
    th: "ยังอัปโหลดอยู่ {n} ภาพ กดบันทึกได้เลย ภาพจะถูกเพิ่มให้อัตโนมัติ",
  },
  uploadingBg: { en: "Uploading {n} photo(s)… keep the app open", th: "กำลังอัปโหลด {n} ภาพ… อย่าเพิ่งปิดแอป" },
  waitingBg: { en: "{n} photo(s) waiting for signal", th: "{n} ภาพรอสัญญาณ" },
  edit: { en: "Edit", th: "แก้ไข" },
  delete: { en: "Delete", th: "ลบ" },
  confirmDelete: { en: "Delete this building and all its photos?", th: "ลบอาคารนี้และภาพทั้งหมด?" },
  discard: { en: "Leave without saving?", th: "ออกโดยไม่บันทึก?" },
  draftRestored: { en: "Unsaved draft restored.", th: "กู้คืนแบบร่างที่ยังไม่บันทึก" },
  discardDraft: { en: "Start over", th: "เริ่มใหม่" },
  notSet: { en: "Not set", th: "ยังไม่ระบุ" },
  missing: { en: "missing", th: "ยังไม่มี" },
  download: { en: "Download", th: "ดาวน์โหลด" },
  downloadAll: { en: "Download all photos", th: "ดาวน์โหลดภาพทั้งหมด" },
  export: { en: "Export", th: "ส่งออก" },
  exportTitle: { en: "Export data", th: "ส่งออกข้อมูล" },
  exportZip: { en: "Photos (ZIP, sorted in folders)", th: "ภาพถ่าย (ZIP แยกโฟลเดอร์)" },
  exportZipSub: {
    en: "Zone / Plot / Shot folders with readable file names. Unzip and drag into Google Drive.",
    th: "แยกโฟลเดอร์ โซน / แปลง / มุมภาพ พร้อมชื่อไฟล์อ่านง่าย แตกไฟล์แล้วลากใส่ Google Drive ได้เลย",
  },
  exportZipParts: {
    en: "Too many photos for one file, so they come in parts. Download each one:",
    th: "ภาพเยอะเกินกว่าจะรวมเป็นไฟล์เดียว จึงแบ่งเป็นหลายส่วน ดาวน์โหลดทีละส่วน:",
  },
  part: { en: "Part", th: "ส่วนที่" },
  exportCsv: { en: "Spreadsheet (CSV)", th: "ตาราง (CSV)" },
  exportCsvSub: { en: "Opens in Excel / Google Sheets.", th: "เปิดด้วย Excel / Google Sheets ได้" },
  exportJson: { en: "Raw data (JSON)", th: "ข้อมูลดิบ (JSON)" },
  exportScope: { en: "Which zone?", th: "โซนไหน?" },
  language: { en: "ภาษาไทย", th: "English" },
  close: { en: "Close", th: "ปิด" },
  cancel: { en: "Cancel", th: "ยกเลิก" },
  leave: { en: "Leave", th: "ออก" },
  saved: { en: "Saved", th: "บันทึกแล้ว" },
  notFound: { en: "This building was deleted or doesn't exist.", th: "ไม่พบอาคารนี้" },
  backToList: { en: "Back to list", th: "กลับไปหน้ารายการ" },
} satisfies Record<string, Label>;

export type DictKey = keyof typeof DICT;

export function useT() {
  const lang = useLang();
  const t = (k: DictKey) => DICT[k][lang];
  const L = (l: Label) => l[lang];
  return { t, L, lang };
}

export function timeAgo(iso: string, lang: Lang) {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  const rtf = new Intl.RelativeTimeFormat(lang, { numeric: "auto" });
  if (s < 60) return rtf.format(0, "second");
  if (s < 3600) return rtf.format(-Math.floor(s / 60), "minute");
  if (s < 86400) return rtf.format(-Math.floor(s / 3600), "hour");
  if (s < 86400 * 7) return rtf.format(-Math.floor(s / 86400), "day");
  return new Date(iso).toLocaleDateString(lang === "th" ? "th-TH" : "en-GB", { day: "numeric", month: "short" });
}
