/**
 * Client-side photo compression for survey attachments.
 *
 * Phone cameras routinely produce 3-12MB photos at resolutions far beyond
 * what's useful for documenting a maintenance item. Round 3 Task 8/14 set a
 * concrete target — under 300KB per photo — which a single fixed quality
 * setting can't hit reliably across all photos (a plain wall and a
 * cluttered, detailed shot of the same pixel dimensions compress very
 * differently at the same quality level). So: resize first (the biggest
 * lever, cheapest on visible quality), then step quality down from a
 * reasonable starting point until under the target or a quality floor is
 * hit — a rare, unusually complex photo lands slightly over 300KB rather
 * than getting visibly destroyed to force it under.
 *
 * This matters twice over: less data to upload on the field connections
 * this app is used on (and to stay clear of Vercel's 4.5MB request-body
 * ceiling — see Round 3 Task 8), and less space taken in the IndexedDB
 * offline queue when a submission is stuck waiting to sync.
 */

const MAX_DIMENSION = 1600; // long edge, px — the biggest single lever on file size, costs the least visible quality
const TARGET_BYTES = 300 * 1024;
const QUALITY_STEPS = [0.8, 0.7, 0.6, 0.5]; // stop at the first that clears the target; 0.5 is the floor — never go below it

function toJpegBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
}

export async function compressImage(file: File): Promise<File> {
  // Non-image files (shouldn't happen given the <input accept="image/*">, but
  // don't choke on it) pass through untouched.
  if (!file.type.startsWith("image/")) return file;

  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });

    const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    let blob: Blob | null = null;
    for (const quality of QUALITY_STEPS) {
      blob = await toJpegBlob(canvas, quality);
      if (blob && blob.size <= TARGET_BYTES) break;
    }
    if (!blob || blob.size >= file.size) return file; // already smaller/optimized — keep the original

    const name = file.name.replace(/\.[^.]+$/, "") + ".jpg";
    return new File([blob], name, { type: "image/jpeg", lastModified: file.lastModified });
  } catch {
    // Decoding can fail for a format the browser doesn't support, or an
    // unusual/corrupt file — better to submit the original than to drop
    // the photo entirely.
    return file;
  }
}
