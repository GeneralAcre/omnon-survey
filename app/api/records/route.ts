import { connection } from "next/server";
import { createRecord, listRecords } from "@/lib/store";
import { sanitizeInput, sanitizePerson } from "@/lib/schema";

export async function GET() {
  await connection();
  return Response.json(await listRecords());
}

export async function POST(request: Request) {
  const body = await request.json();
  const by = sanitizePerson(body.by);
  const input = sanitizeInput(body.record);
  if (!by) return Response.json({ error: "Missing surveyor name or group" }, { status: 400 });
  if (!input.group || !input.plotNo) {
    return Response.json({ error: "Group and plot number are required" }, { status: 400 });
  }
  return Response.json(await createRecord(input, by), { status: 201 });
}
