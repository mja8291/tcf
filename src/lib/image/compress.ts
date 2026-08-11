/**
 * Client-side photo compression for survey attachments.
 *
 * Phone cameras routinely produce 3-12MB photos at resolutions far beyond
 * what's useful for documenting a maintenance item — this resizes to a
 * sensible max dimension and re-encodes as JPEG at a quality that's
 * visually indistinguishable from the original for this kind of use, while
 * cutting file size by roughly 80-95%. That matters twice over here: less
 * data to upload on the field connections this app is used on, and less
 * space taken in the IndexedDB offline queue when a submission is stuck
 * waiting to sync.
 */

const MAX_DIMENSION = 1920; // long edge, px — plenty of detail for a maintenance photo, well past what a phone screen or a printed report needs
const JPEG_QUALITY = 0.82; // visually lossless for photographic content at this size

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

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY));
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
