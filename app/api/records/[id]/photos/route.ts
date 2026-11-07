import { addPhoto } from "@/lib/store";
import { FILE_RE, IMAGE_SLOTS, sanitizePerson, type ImageSlotKey } from "@/lib/schema";

// POST /api/records/<id>/photos  { slot, file, at, by }
// Adds one photo that finished uploading after its building was saved.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const by = sanitizePerson(body.by);
  const slot = IMAGE_SLOTS.find((s) => s.key === body.slot)?.key as ImageSlotKey | undefined;
  if (!by || !slot || typeof body.file !== "string" || !FILE_RE.test(body.file)) {
    return Response.json({ error: "Bad photo" }, { status: 400 });
  }
  const at = typeof body.at === "string" && !Number.isNaN(Date.parse(body.at)) ? new Date(body.at).toISOString() : new Date().toISOString();
  const record = await addPhoto(id, slot, { file: body.file, by: by.name, at });
  return record ? Response.json(record) : Response.json({ error: "Not found" }, { status: 404 });
}
