// Photo storage: Cloudflare R2 when R2_* env vars are set, otherwise the local
// data/uploads folder (handy for development and offline LAN use).
import { randomUUID } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { FILE_RE } from "./schema";
import { deleteObject, fullKey, getObject, presignUpload, presignView, r2Enabled, thumbKey } from "./r2";

const UPLOAD_DIR = path.join(process.cwd(), "data", "uploads");
const THUMB_DIR = path.join(UPLOAD_DIR, "thumbs");

export const MIME: Record<string, string> = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp" };
export const MAX_BYTES = 15 * 1024 * 1024;

export type UploadTicket = { name: string; full: string; thumb: string };

// Where the phone should PUT the full image and the thumbnail.
export async function createUploadTicket(): Promise<UploadTicket> {
  const name = `${randomUUID()}.jpg`;
  if (r2Enabled()) {
    const [full, thumb] = await Promise.all([presignUpload(fullKey(name)), presignUpload(thumbKey(name))]);
    return { name, full, thumb };
  }
  return { name, full: `/api/upload/local/${name}?kind=full`, thumb: `/api/upload/local/${name}?kind=thumb` };
}

export async function writeLocal(name: string, kind: "full" | "thumb", data: Uint8Array) {
  if (!FILE_RE.test(name)) throw new Error("Bad name");
  await mkdir(THUMB_DIR, { recursive: true });
  await writeFile(path.join(kind === "thumb" ? THUMB_DIR : UPLOAD_DIR, name), data);
}

// For R2: a signed URL to redirect to. For local: null (serve the bytes instead).
export async function photoRedirect(name: string, size: "full" | "thumb", downloadName?: string) {
  if (!r2Enabled() || !FILE_RE.test(name)) return null;
  const disposition = downloadName
    ? `attachment; filename="${downloadName.replace(/[^\x20-\x7e]/g, "_")}"; filename*=UTF-8''${encodeURIComponent(downloadName)}`
    : undefined;
  return presignView(size === "thumb" ? thumbKey(name) : fullKey(name), disposition);
}

export async function readPhoto(name: string, size: "full" | "thumb" = "full"): Promise<Uint8Array | null> {
  if (!FILE_RE.test(name)) return null;
  if (r2Enabled()) {
    if (size === "thumb") return (await getObject(thumbKey(name))) ?? getObject(fullKey(name));
    return getObject(fullKey(name));
  }
  try {
    if (size === "thumb") {
      try {
        return await readFile(path.join(THUMB_DIR, name));
      } catch {
        // No thumbnail — fall back to the full image.
      }
    }
    return await readFile(path.join(UPLOAD_DIR, name));
  } catch {
    return null;
  }
}

export async function deletePhotos(names: string[]) {
  const valid = names.filter((n) => FILE_RE.test(n));
  if (r2Enabled()) {
    await Promise.all(valid.flatMap((n) => [fullKey(n), thumbKey(n)]).map((k) => deleteObject(k).catch(() => {})));
    return;
  }
  await Promise.all(
    valid.flatMap((n) => [path.join(UPLOAD_DIR, n), path.join(THUMB_DIR, n)]).map((p) => unlink(p).catch(() => {})),
  );
}
