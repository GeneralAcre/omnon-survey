import { connection } from "next/server";
import { photoEntries } from "@/lib/naming";
import { listRecords } from "@/lib/store";

// GET /api/drive/manifest → every photo and where it goes in Google Drive.
// scripts/drive-sync.gs reads this to copy new photos across.
export async function GET() {
  await connection();
  const records = await listRecords();
  return Response.json(records.flatMap((r) => photoEntries(r).map(({ photo, dirs, name }) => ({ file: photo.file, dirs, name }))));
}
