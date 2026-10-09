import { connection } from "next/server";
import { listRecords } from "@/lib/store";
import { readPhoto } from "@/lib/photos";
import { IMAGE_SLOTS, groupOf } from "@/lib/schema";
import { photoFileName, slotFolder } from "@/lib/naming";
import { safeSegment, zipStream, type ZipEntry } from "@/lib/zip";

// Streams every photo as a ZIP laid out for dropping straight into Google Drive:
//   Group-2_Housing-Estate-&-Orchard/Plot-A01/01-Front/G2_Plot-A01_Front_1_Somchai.jpg
export async function GET(request: Request) {
  await connection();
  const url = new URL(request.url);
  const group = url.searchParams.get("group");
  const id = url.searchParams.get("id");
  const records = (await listRecords()).filter((r) => (!group || r.group === group) && (!id || r.id === id));

  const entries: ZipEntry[] = [];
  for (const r of records) {
    const g = groupOf(r.group);
    const groupDir = safeSegment(`Group-${r.group}_${g?.zone.en ?? ""}`);
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
  const label = id && records[0] ? `plot-${safeSegment(records[0].plotNo)}` : group ? `group-${group}` : "all";
  return new Response(zipStream(entries), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="khlong-om-non-photos-${label.replace(/[^\x20-\x7e]/g, "_")}-${stamp}.zip"; filename*=UTF-8''${encodeURIComponent(`khlong-om-non-photos-${label}-${stamp}.zip`)}`,
    },
  });
}
