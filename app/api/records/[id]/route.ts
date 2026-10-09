import { deleteRecord, getRecord, updateRecord } from "@/lib/store";
import { sanitizeInput, sanitizePerson } from "@/lib/schema";

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
  const record = await updateRecord(id, input, by);
  if (!record) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json(record);
}

export async function DELETE(_request: Request, { params }: Ctx) {
  const { id } = await params;
  const ok = await deleteRecord(id);
  return ok ? new Response(null, { status: 204 }) : Response.json({ error: "Not found" }, { status: 404 });
}
