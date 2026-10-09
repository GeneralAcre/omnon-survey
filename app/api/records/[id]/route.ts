import { deleteRecord, getRecord, updateRecord } from "@/lib/store";
import { FILE_RE, sanitizeInput, sanitizePerson } from "@/lib/schema";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Ctx) {
  const { id } = await params;
  const record = await getRecord(id);
  return record ? Response.json(record) : Response.json({ error: "Not found" }, { status: 404 });
}

export async function PUT(request: Request, { params }: Ctx) {
  const { id } = await params;
  const body = await request.json();
  const by = sanitizePerson(body.by);
  const input = sanitizeInput(body.record);
  if (!by) return Response.json({ error: "Missing surveyor name or group" }, { status: 400 });
  if (!input.group || !input.plotNo) {
    return Response.json({ error: "Group and plot number are required" }, { status: 400 });
  }
  // Photos this phone started from, so concurrent edits can be merged.
  const baseFiles = Array.isArray(body.baseFiles)
    ? body.baseFiles.filter((f: unknown): f is string => typeof f === "string" && FILE_RE.test(f)).slice(0, 500)
    : undefined;
  const record = await updateRecord(id, input, by, baseFiles);
  if (!record) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json(record);
}

export async function DELETE(_request: Request, { params }: Ctx) {
  const { id } = await params;
  const ok = await deleteRecord(id);
  return ok ? new Response(null, { status: 204 }) : Response.json({ error: "Not found" }, { status: 404 });
}
