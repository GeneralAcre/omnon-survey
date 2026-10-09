// Finds the main colours of an image: the few colours that cover the most of it.

export type Swatch = { hex: string; share: number };

const toHex = (r: number, g: number, b: number) => "#" + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("");

// "Redmean" distance: cheap, and much closer to what the eye sees than plain RGB distance.
function distance(a: number[], b: number[]) {
  const rm = (a[0] + b[0]) / 2;
  const dr = a[0] - b[0];
  const dg = a[1] - b[1];
  const db = a[2] - b[2];
  return Math.sqrt((2 + rm / 256) * dr * dr + 4 * dg * dg + (2 + (255 - rm) / 256) * db * db);
}

export function mainColours(source: CanvasImageSource & { width: number; height: number }, count = 5): Swatch[] {
  // A small copy is plenty for counting colours and keeps this instant on phones.
  const scale = Math.min(1, 160 / Math.max(source.width, source.height));
  const w = Math.max(1, Math.round(source.width * scale));
  const h = Math.max(1, Math.round(source.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(source, 0, 0, w, h);
  const data = ctx.getImageData(0, 0, w, h).data;

  // 1. Bucket pixels into a 16×16×16 colour grid.
  const buckets = new Map<number, { r: number; g: number; b: number; n: number }>();
  let total = 0;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 128) continue;
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const key = ((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4);
    const s = buckets.get(key) ?? { r: 0, g: 0, b: 0, n: 0 };
    s.r += r; s.g += g; s.b += b; s.n++;
    buckets.set(key, s);
    total++;
  }
  if (!total) return [];

  // 2. Merge neighbouring shades, biggest first, so one wall isn't reported as five greys.
  const clusters: { c: number[]; r: number; g: number; b: number; n: number }[] = [];
  for (const s of [...buckets.values()].sort((a, b) => b.n - a.n)) {
    const c = [s.r / s.n, s.g / s.n, s.b / s.n];
    const near = clusters.find((k) => distance(k.c, c) < 90);
    if (near) {
      near.r += s.r; near.g += s.g; near.b += s.b; near.n += s.n;
      near.c = [near.r / near.n, near.g / near.n, near.b / near.n];
    } else {
      clusters.push({ c, r: s.r, g: s.g, b: s.b, n: s.n });
    }
  }

  return clusters
    .sort((a, b) => b.n - a.n)
    .slice(0, count)
    .map((k) => ({ hex: toHex(k.c[0], k.c[1], k.c[2]), share: k.n / total }));
}

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
