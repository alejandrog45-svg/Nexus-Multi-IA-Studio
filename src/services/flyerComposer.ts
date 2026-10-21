// Deterministic flyer composer helpers (no AI): keep the original pixels untouched and only fill a free strip.
// Pure functions on raw RGBA data so they can be unit-tested without a browser.

const luminance = (r: number, g: number, b: number) => 0.2126 * r + 0.7152 * g + 0.0722 * b;

/**
 * First row (y) of the near-black, uniform strip at the bottom of the image, or `h` if there is none.
 * A row counts as free when every sampled pixel is darker than `lumThreshold`.
 */
export function detectFreeStrip(data: Uint8ClampedArray, w: number, h: number, lumThreshold = 16): number {
  for (let y = h - 1; y >= 0; y--) {
    for (let x = 0; x < w; x += 3) {
      const i = (y * w + x) * 4;
      if (luminance(data[i], data[i + 1], data[i + 2]) > lumThreshold) {
        return y === h - 1 ? h : Math.min(h, y + 3); // small safety margin below the last content row
      }
    }
  }
  return 0;
}

/** Number of pixels that differ between two RGBA buffers of the same width, looking only at the first `rows` rows. */
export function countDifferentPixels(a: Uint8ClampedArray, b: Uint8ClampedArray, w: number, rows: number): number {
  let diff = 0;
  const total = w * rows;
  for (let p = 0; p < total; p++) {
    const i = p * 4;
    if (a[i] !== b[i] || a[i + 1] !== b[i + 1] || a[i + 2] !== b[i + 2] || a[i + 3] !== b[i + 3]) diff++;
  }
  return diff;
}

/** Share (0-100) of the final canvas that is the untouched original image. */
export function originalSharePercent(w: number, originalH: number, totalH: number, freeStripStart: number): number {
  const kept = w * Math.min(freeStripStart, originalH);
  return Math.round((kept / (w * totalH)) * 1000) / 10;
}

export interface FooterContent {
  lines: string[];
  contact: { instagram: string; facebook: string; whatsapp: string };
}

/** Contact line made only from the fields the user actually typed (nothing is invented). */
export function contactLine(c: FooterContent['contact']): string {
  const parts: string[] = [];
  if (c.instagram.trim()) parts.push(`Instagram ${c.instagram.trim()}`);
  if (c.facebook.trim()) parts.push(`Facebook ${c.facebook.trim()}`);
  if (c.whatsapp.trim()) parts.push(`WhatsApp ${c.whatsapp.trim()}`);
  return parts.join('  ·  ');
}
