import { ForbiddenError, deleteRecord, getRecord, updateRecord } from "@/lib/store";
import { FILE_RE, sanitizeInput, sanitizePerson } from "@/lib/schema";

type Ctx = { params: Promise<{ id: string }> };

const forbidden = (e: ForbiddenError) => Response.json({ error: e.message, group: e.group }, { status: 403 });

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
  if (!input.plotNo) return Response.json({ error: "Plot number is required" }, { status: 400 });
  // Photos this phone started from, so concurrent edits can be merged.
  const baseFiles = Array.isArray(body.baseFiles)
    ? body.baseFiles.filter((f: unknown): f is string => typeof f === "string" && FILE_RE.test(f)).slice(0, 500)
    : undefined;
  try {
    const record = await updateRecord(id, input, by, baseFiles);
    if (!record) return Response.json({ error: "Not found" }, { status: 404 });
    return Response.json(record);
  } catch (e) {
    if (e instanceof ForbiddenError) return forbidden(e);
    throw e;
  }
}

export async function DELETE(request: Request, { params }: Ctx) {
  const { id } = await params;
  const by = sanitizePerson((await request.json().catch(() => ({}))).by);
  if (!by) return Response.json({ error: "Missing surveyor name or group" }, { status: 400 });
  try {
    const ok = await deleteRecord(id, by);
    return ok ? new Response(null, { status: 204 }) : Response.json({ error: "Not found" }, { status: 404 });
  } catch (e) {
    if (e instanceof ForbiddenError) return forbidden(e);
    throw e;
  }
}
