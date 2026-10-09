import { connection } from "next/server";
import { listRecords } from "@/lib/store";
import { IMAGE_SLOTS, functionLabel, groupOf, typeLabel } from "@/lib/schema";
import { photoFileName } from "@/lib/naming";

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
    "Group",
    "Zone",
    "Plot No.",
    "Building Type",
    "ประเภทอาคาร",
    ...IMAGE_SLOTS.flatMap((s) => [`${s.label.en} (photos)`, `${s.label.en} (taken by)`, `${s.label.en} (note)`]),
    "Color Swatches",
    "Function",
    "การใช้งาน",
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
    ...IMAGE_SLOTS.flatMap((s) => {
      const photos = r.images[s.key]?.photos ?? [];
      return [
        photos.map((p, i) => `${url.origin}/api/photos/${p.file}?download=${encodeURIComponent(photoFileName(r, s.key, i, p))}`).join("\n"),
        [...new Set(photos.map((p) => `${p.by} (G${p.group})`))].join(", "),
        r.images[s.key]?.note ?? "",
      ];
    }),
    r.colors.join(" "),
    functionLabel(r, "en"),
    functionLabel(r, "th"),
    r.notes,
    r.mapLink ?? "",
    r.lat != null ? String(r.lat) : "",
    r.lng != null ? String(r.lng) : "",
    `${r.createdBy.name} (G${r.createdBy.group})`,
    `${r.updatedBy.name} (G${r.updatedBy.group})`,
    r.createdAt,
    r.updatedAt,
  ]);
  // BOM so Excel opens Thai/Chinese text correctly.
  const csv = "﻿" + [header, ...rows].map((row) => row.map(cell).join(",")).join("\r\n");
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="khlong-om-non-survey-${stamp}.csv"`,
    },
  });
}
