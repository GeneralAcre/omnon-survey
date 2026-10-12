import { connection } from "next/server";
import { listRecords } from "@/lib/store";
import { readPhoto } from "@/lib/photos";
import { IMAGE_SLOTS, groupOf } from "@/lib/schema";
import { photoFileName, slotFolder, zipParts } from "@/lib/naming";
import { safeSegment, zipStream, type ZipEntry } from "@/lib/zip";

// Streams every photo as a ZIP laid out for dropping straight into Google Drive:
//   Group-2_Housing-Estate-&-Orchard/Plot-A01/01-Front/G2_Plot-A01_Front_1_Somchai.jpg
// ?part=N returns just the Nth part (see zipParts), for when all photos are too big for one file.
export const maxDuration = 300;

export async function GET(request: Request) {
  await connection();
  const url = new URL(request.url);
  const group = url.searchParams.get("group");
  const id = url.searchParams.get("id");
  const part = Number(url.searchParams.get("part")) || 0;
  let records = (await listRecords()).filter((r) => (!group || r.group === group) && (!id || r.id === id));
  const parts = part ? zipParts(records) : [];
  if (part) records = parts[part - 1] ?? [];

  const entries: ZipEntry[] = [];
  for (const r of records) {
    const g = groupOf(r.group);
    const groupDir = safeSegment(`Zone-${r.group}_${g?.zone.en ?? ""}`);
    const plotDir = `Plot-${safeSegment(r.plotNo)}`;
    for (const s of IMAGE_SLOTS) {
      r.images[s.key]?.photos.forEach((p, i) => {
        entries.push({
          name: `${groupDir}/${plotDir}/${slotFolder(s.key)}/${photoFileName(r, s.key, i, p)}`,
          date: new Date(p.at || r.updatedAt),
          read: async () => {
            const buf = await readPhoto(p.file);
            return buf ? new Uint8Array(buf) : null;
          },
        });
      });
    }
  }

  const stamp = new Date().toISOString().slice(0, 10);
  const scope = id && records[0] ? `plot-${safeSegment(records[0].plotNo)}` : group ? `zone-${group}` : "all";
  const label = part ? `${scope}-part-${part}-of-${parts.length}` : scope;
  return new Response(zipStream(entries), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="khlong-om-non-photos-${label.replace(/[^\x20-\x7e]/g, "_")}-${stamp}.zip"; filename*=UTF-8''${encodeURIComponent(`khlong-om-non-photos-${label}-${stamp}.zip`)}`,
    },
  });
}
