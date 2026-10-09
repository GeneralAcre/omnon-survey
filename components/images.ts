export const photoUrl = (file: string, size: "full" | "thumb" = "full") =>
  `/api/photos/${file}${size === "thumb" ? "?size=thumb" : ""}`;

export const downloadUrl = (file: string, niceName: string) =>
  `/api/photos/${file}?download=${encodeURIComponent(niceName)}`;

async function resize(bitmap: ImageBitmap, maxSide: number, quality: number): Promise<Blob> {
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", quality));
  if (!blob) throw new Error("Couldn't process photo");
  return blob;
}

// Full image: 2560px long side at high quality (sharp enough for drawings and
// print, ~1–1.5 MB). Thumb: 480px for fast lists on 4G.
export async function prepare(file: Blob): Promise<{ full: Blob; thumb: Blob }> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    if (["image/jpeg", "image/png", "image/webp"].includes(file.type)) return { full: file, thumb: file };
    throw Object.assign(new Error("Can't read this photo"), { permanent: true });
  }
  try {
    const [full, thumb] = [await resize(bitmap, 2560, 0.9), await resize(bitmap, 480, 0.75)];
    return { full, thumb };
  } finally {
    bitmap.close();
  }
}

export async function uploadPrepared(p: { full: Blob; thumb: Blob }, attempts = 3): Promise<string> {
  let lastError: Error = new Error("Upload failed");
  for (let i = 0; i < attempts; i++) {
    try {
      // 1. Ask the server for a photo name and where to put it (R2 or local disk).
      const ticketRes = await fetch("/api/upload/sign", { method: "POST" });
      if (!ticketRes.ok) throw new Error(`Upload failed (${ticketRes.status})`);
      const ticket = (await ticketRes.json()) as { name: string; full: string; thumb: string };
      // 2. Send both files straight there.
      const put = (url: string, blob: Blob) =>
        fetch(url, { method: "PUT", body: blob, headers: { "Content-Type": blob.type || "image/jpeg" } });
      const [full, thumb] = await Promise.all([put(ticket.full, p.full), put(ticket.thumb, p.thumb)]);
      if (full.ok && thumb.ok) return ticket.name;
      const status = full.ok ? thumb.status : full.status;
      lastError = new Error(`Upload failed (${status})`);
      if (status === 400 || status === 413) throw Object.assign(lastError, { permanent: true }); // bad file, retrying won't help
    } catch (e) {
      if ((e as { permanent?: boolean }).permanent) throw e;
      lastError = e as Error; // network drop — retry
    }
    await new Promise((r) => setTimeout(r, 1000 * 2 ** i));
  }
  throw lastError;
}
