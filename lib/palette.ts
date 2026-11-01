// Loads a photo as a same-origin blob. A canvas can always read a blob's pixels, even if the
// server ever redirects to R2; a plain <img> of a redirected URL would "taint" the canvas.
export async function loadImage(src: string): Promise<HTMLImageElement> {
  const res = await fetch(src);
  if (!res.ok) throw new Error(`Photo failed to load (${res.status})`);
  const url = URL.createObjectURL(await res.blob());
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}
