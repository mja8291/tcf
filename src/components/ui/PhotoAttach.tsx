"use client";

import { useCallback, useState } from "react";
import { Camera, Image as ImageIcon, RotateCw, X } from "lucide-react";
import { compressImage } from "@/lib/image/compress";
import type { PhotoAsset } from "@/lib/types";
import { IconButton } from "./IconButton";

/**
 * The photo-attach mechanism shared between the item-scoring page (ItemRow)
 * and the Method 1 Campus Visit page — one implementation, one underlying
 * state (whatever Record<string, PhotoAsset[]> the caller passes in via
 * onAddPhoto/onRemovePhoto), so a photo attached on either page shows up on
 * the other. Split into a hook + two small pieces rather than one combined
 * component because the two pages lay the button and the thumbnail list out
 * differently (ItemRow interleaves the button among other icons with the
 * list appearing after the condition pills; Campus Visit is a plain row).
 *
 * Compression happens here, synchronously with the pick; the actual Drive
 * upload (Round 3 Task 8) happens in the page-level onAddPhoto callback,
 * which is why this hook only ever sees a plain File in and out — it has
 * no notion of upload status.
 */
export function usePhotoAttachHandler(onAddPhoto: (file: File) => void) {
  const [compressing, setCompressing] = useState(false);
  const handlePick = useCallback(
    async (file: File | undefined) => {
      if (!file) return;
      setCompressing(true);
      try {
        onAddPhoto(await compressImage(file));
      } finally {
        setCompressing(false);
      }
    },
    [onAddPhoto]
  );
  return { compressing, handlePick };
}

interface PhotoAttachButtonsProps {
  /** Used to build unique <input id>s — pass the item name. */
  itemKey: string;
  photoCount: number;
  compressing: boolean;
  onPick: (file: File | undefined) => void;
}

/**
 * Two explicit controls — "Take photo" (forces the camera via the `capture`
 * attribute) and "Choose from gallery" (a plain picker, no `capture`) —
 * rather than one button relying on the phone's native combined chooser.
 * Round 3 Task 14: confirmed with the user that explicit separate buttons
 * are preferred over removing `capture` and relying on the OS picker.
 */
export function PhotoAttachButtons({ itemKey, photoCount, compressing, onPick }: PhotoAttachButtonsProps) {
  const cameraId = `photo_camera_${itemKey.replace(/[^a-zA-Z0-9]/g, "_")}`;
  const galleryId = `photo_gallery_${itemKey.replace(/[^a-zA-Z0-9]/g, "_")}`;
  return (
    <div className="relative flex items-center gap-1.5 shrink-0">
      <IconButton
        active={photoCount > 0}
        aria-label="Take photo"
        onClick={() => document.getElementById(cameraId)?.click()}
        disabled={compressing}
      >
        <Camera size={16} />
      </IconButton>
      <IconButton
        active={photoCount > 0}
        aria-label="Choose from gallery"
        onClick={() => document.getElementById(galleryId)?.click()}
        disabled={compressing}
      >
        <ImageIcon size={16} />
      </IconButton>
      {photoCount > 0 ? (
        <span
          className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-brand text-[9px] font-bold text-white"
          aria-label={`${photoCount} photo${photoCount === 1 ? "" : "s"} attached`}
        >
          {photoCount}
        </span>
      ) : null}
      <input
        id={cameraId}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          // Reset so picking the same file again still fires onChange — this
          // is an "add" control, not a replace-in-place one.
          e.target.value = "";
          onPick(file);
        }}
      />
      <input
        id={galleryId}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          onPick(file);
        }}
      />
    </div>
  );
}

interface PhotoThumbListProps {
  photos: PhotoAsset[];
  onRemovePhoto: (id: string) => void;
  /** Re-runs the upload for a photo stuck in "error" status. Omit to hide the retry control (not needed everywhere yet). */
  onRetryPhoto?: (id: string, file: File) => void;
}

/**
 * Shows each attached photo's filename/size plus its upload status (Round 3
 * Task 8 — photos upload individually, in the background, right after
 * they're attached): a quiet "Uploading…" while in flight, nothing extra
 * once uploaded, and a "Couldn't upload — Retry" row on failure so a bad
 * connection costs one photo, not the whole scoring session.
 */
export function PhotoThumbList({ photos, onRemovePhoto, onRetryPhoto }: PhotoThumbListProps) {
  if (photos.length === 0) return null;
  return (
    <div className="mt-1 space-y-1">
      {photos.map((p) => (
        <div key={p.id} className="flex items-center justify-between gap-2 text-[11px] text-ink-faint">
          <span className="truncate">
            {p.file.name} ({(p.file.size / 1024).toFixed(0)} KB)
            {p.status === "uploading" ? <span className="text-ink-faint"> · Uploading…</span> : null}
            {p.status === "error" ? <span className="text-band-poor"> · Couldn&apos;t upload</span> : null}
          </span>
          <span className="flex items-center gap-1.5 shrink-0">
            {p.status === "error" && onRetryPhoto ? (
              <button
                type="button"
                onClick={() => onRetryPhoto(p.id, p.file)}
                aria-label={`Retry uploading ${p.file.name}`}
                className="text-brand"
              >
                <RotateCw size={12} />
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => onRemovePhoto(p.id)}
              aria-label={`Remove ${p.file.name}`}
              className="text-band-poor"
            >
              <X size={12} />
            </button>
          </span>
        </div>
      ))}
    </div>
  );
}
