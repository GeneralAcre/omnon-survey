import { connection } from "next/server";
import { ForbiddenError, createRecord, listRecords, recordChanges } from "@/lib/store";
import { sanitizeInput, sanitizePerson, type SurveyRecord } from "@/lib/schema";

// GET /api/records               → every record
// GET /api/records?since=<ISO>   → { records changed since, count, now } for live polling
// Edit history is left out of lists (only a building page shows it), which makes them ~30% smaller.
const withoutHistory = (records: SurveyRecord[]) => records.map((r) => ({ ...r, history: undefined }));

export async function GET(request: Request) {
  await connection();
  const since = new URL(request.url).searchParams.get("since");
  if (since && !Number.isNaN(Date.parse(since))) {
    const now = new Date().toISOString();
    const { records, count } = await recordChanges(new Date(since).toISOString());
    return Response.json({ records: withoutHistory(records), count, now });
  }
  return Response.json(withoutHistory(await listRecords()));
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
  const body = await request.json();
  const by = sanitizePerson(body.by);
  const input = sanitizeInput(body.record);
  if (!by) return Response.json({ error: "Missing surveyor name or group" }, { status: 400 });
  if (!input.plotNo) return Response.json({ error: "Plot number is required" }, { status: 400 });
  // The phone may choose the id (so photos still uploading know where they go).
  const id = typeof body.id === "string" && UUID_RE.test(body.id) ? body.id.toLowerCase() : undefined;
  // New buildings always belong to the surveyor's own group (set in createRecord).
  try {
    return Response.json(await createRecord(input, by, id), { status: 201 });
  } catch (e) {
    if (e instanceof ForbiddenError) return Response.json({ error: "This id is already taken" }, { status: 409 });
    throw e;
  }
}
