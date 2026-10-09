import { MAX_BYTES, writeLocal } from "@/lib/photos";
import { FILE_RE } from "@/lib/schema";

// Local-disk stand-in for an R2 signed PUT (used when R2 isn't configured).
export async function PUT(request: Request, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  const kind = new URL(request.url).searchParams.get("kind") === "thumb" ? "thumb" : "full";
  if (!FILE_RE.test(name)) return new Response("Bad name", { status: 400 });
  const data = new Uint8Array(await request.arrayBuffer());
  if (data.length === 0) return new Response("Empty", { status: 400 });
  if (data.length > MAX_BYTES) return new Response("Too large", { status: 413 });
  await writeLocal(name, kind, data);
  return new Response(null, { status: 200 });
}
