import { MIME, photoRedirect, readPhoto } from "@/lib/photos";
import { safeSegment } from "@/lib/zip";

// GET /api/photos/<file>?size=thumb            → small preview
// GET /api/photos/<file>?download=<nice-name>  → full image as an attachment
// With R2 this redirects to a signed R2 URL; locally it serves the bytes.
export async function GET(request: Request, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  const url = new URL(request.url);
  const size = url.searchParams.get("size") === "thumb" ? "thumb" : "full";
  const ext = name.split(".").pop()!.toLowerCase();
  const download = url.searchParams.get("download");
  const filename = download !== null ? `${safeSegment(download.replace(/\.[a-z0-9]+$/i, "")) || name}.${ext}` : undefined;

  const redirect = await photoRedirect(name, size, filename);
  if (redirect) {
    return new Response(null, {
      status: 302,
      headers: { Location: redirect, "Cache-Control": filename ? "no-store" : "private, max-age=3000" },
    });
  }

  const data = await readPhoto(name, size);
  if (!data) return new Response("Not found", { status: 404 });
  const headers: Record<string, string> = {
    "Content-Type": MIME[ext] ?? "application/octet-stream",
    "Content-Length": String(data.length),
    "Cache-Control": "public, max-age=31536000, immutable",
  };
  if (filename) {
    const ascii = filename.replace(/[^\x20-\x7e]/g, "_");
    headers["Content-Disposition"] = `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(filename)}`;
  }
  return new Response(new Uint8Array(data), { headers });
}
