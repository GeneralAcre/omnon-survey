import { connection } from "next/server";
import { listRecords } from "@/lib/store";
import { IMAGE_SLOTS, floodLinesLabel, functionLabel, groupOf, jackedLabel, typeLabel } from "@/lib/schema";
import { photoFileName } from "@/lib/naming";
import { readPhoto } from "@/lib/photos";
import { imageInfo, xlsxStream, type XlsxImage } from "@/lib/xlsx";

// Pulling every thumbnail into the spreadsheet can take a while.
export const maxDuration = 300;

// Photo grid inside each spreadsheet cell, in px.
const BOX = 100;
const GAP = 4;
const PER_ROW = 5;

function cell(v: string) {
  return /[",\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

export async function GET(request: Request) {
  await connection();
  const url = new URL(request.url);
  const format = url.searchParams.get("format") ?? "csv";
  const group = url.searchParams.get("group");
  const records = (await listRecords())
    .filter((r) => !group || r.group === group)
    .sort((a, b) => a.group.localeCompare(b.group) || a.plotNo.localeCompare(b.plotNo, undefined, { numeric: true }));
  const stamp = new Date().toISOString().slice(0, 10);

  if (format === "json") {
    return new Response(JSON.stringify(records, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="khlong-om-non-survey-${stamp}.json"`,
      },
    });
  }

  const header = [
    "Zone",
    "Zone name",
    "Plot No.",
    "Building Type",
    "ประเภทอาคาร",
    "Build Year",
    "Building Age (years)",
    "Floors",
    ...IMAGE_SLOTS.flatMap((s) => [`${s.label.en} (photos)`, `${s.label.en} (taken by)`, `${s.label.en} (note)`]),
    "Color Swatches",
    "Function",
    "การใช้งาน",
    "People living here",
    "Jacked up",
    "Flood lines",
    "Notes",
    "Google Maps link",
    "Latitude",
    "Longitude",
    "Filled in by",
    "Last edited by",
    "Created",
    "Updated",
  ];
  const rows = records.map((r) => [
    groupOf(r.group)?.label.en ?? r.group,
    groupOf(r.group)?.zone.en ?? "",
    r.plotNo,
    typeLabel(r, "en"),
    typeLabel(r, "th"),
    r.buildYear ?? "",
    r.buildAge ?? "",
    r.floors ?? "",
    ...IMAGE_SLOTS.flatMap((s) => {
      const photos = r.images[s.key]?.photos ?? [];
      return [
        photos.map((p, i) => `${url.origin}/api/photos/${p.file}?download=${encodeURIComponent(photoFileName(r, s.key, i, p))}`).join("\n"),
        [...new Set(photos.map((p) => `${p.by} (Zone ${p.group})`))].join(", "),
        // Slot note, then any per-photo captions ("#2 Roof: zinc").
        [r.images[s.key]?.note, ...photos.map((p, i) => p.note && `#${i + 1} ${p.note}`)].filter(Boolean).join("\n"),
      ];
    }),
    r.colors.join(" "),
    functionLabel(r, "en"),
    functionLabel(r, "th"),
    r.occupancy ?? "",
    jackedLabel(r, "en"),
    floodLinesLabel(r, "\n"),
    r.notes,
    r.mapLink ?? "",
    r.lat != null ? String(r.lat) : "",
    r.lng != null ? String(r.lng) : "",
    `${r.createdBy.name} (Zone ${r.createdBy.group})`,
    `${r.updatedBy.name} (Zone ${r.updatedBy.group})`,
    r.createdAt,
    r.updatedAt,
  ]);
  if (format === "xlsx") {
    const firstSlotCol = header.indexOf(`${IMAGE_SLOTS[0].label.en} (photos)`);
    const slotCols = IMAGE_SLOTS.map((_, i) => firstSlotCol + i * 3);

    // Thumbnails (480px), a few at a time; full photos would make the file huge.
    const jobs = records.flatMap((r, ri) =>
      IMAGE_SLOTS.flatMap((s, si) => (r.images[s.key]?.photos ?? []).map((p, pi) => ({ r, ri, si, pi, p }))),
    );
    const thumbs = new Array<Uint8Array | null>(jobs.length);
    let next = 0;
    await Promise.all(
      Array.from({ length: 8 }, async () => {
        while (next < jobs.length) {
          const k = next++;
          thumbs[k] = await readPhoto(jobs[k].p.file, "thumb").catch(() => null);
        }
      }),
    );

    // Photos are drawn over their cell, so it holds no text unless a photo can't be shown.
    const cells = rows.map((row) => row.map((v, c) => (slotCols.includes(c) ? "" : v)));
    const images: XlsxImage[] = [];
    jobs.forEach(({ r, ri, si, pi, p }, k) => {
      const data = thumbs[k];
      const info = data && imageInfo(data);
      const link = `${url.origin}/api/photos/${p.file}`;
      if (!data || !info) {
        const cell = cells[ri];
        cell[slotCols[si]] = [cell[slotCols[si]], link].filter(Boolean).join("\n");
        return;
      }
      const scale = Math.min(BOX / info.w, BOX / info.h);
      const w = info.w * scale;
      const h = info.h * scale;
      images.push({
        data,
        ext: info.ext,
        col: slotCols[si],
        row: ri + 1,
        x: GAP + (pi % PER_ROW) * (BOX + GAP) + (BOX - w) / 2,
        y: GAP + Math.floor(pi / PER_ROW) * (BOX + GAP) + (BOX - h) / 2,
        w,
        h,
        name: photoFileName(r, IMAGE_SLOTS[si].key, pi, p),
        link,
      });
    });

    const colWidths = header.map((h, c) => {
      const slot = slotCols.indexOf(c);
      if (slot >= 0) {
        const most = Math.max(0, ...records.map((r) => r.images[IMAGE_SLOTS[slot].key]?.photos.length ?? 0));
        return Math.max(120, GAP + Math.min(most, PER_ROW) * (BOX + GAP));
      }
      const longest = Math.max(...[h, ...cells.map((row) => row[c])].flatMap((v) => v.split("\n")).map((l) => l.length));
      return Math.min(280, Math.max(60, longest * 7 + 12));
    });
    const rowHeights = [
      undefined,
      ...records.map((r) => {
        const most = Math.max(0, ...IMAGE_SLOTS.map((s) => r.images[s.key]?.photos.length ?? 0));
        return most ? GAP + Math.ceil(most / PER_ROW) * (BOX + GAP) : undefined;
      }),
    ];

    return new Response(xlsxStream({ name: "Survey", rows: [header, ...cells], colWidths, rowHeights, images }), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="khlong-om-non-survey-${stamp}.xlsx"`,
      },
    });
  }

  // BOM so Excel opens Thai/Chinese text correctly.
  const csv = "﻿" + [header, ...rows].map((row) => row.map(cell).join(",")).join("\r\n");
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="khlong-om-non-survey-${stamp}.csv"`,
    },
  });
}
