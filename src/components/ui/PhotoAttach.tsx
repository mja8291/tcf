"use client";

import { useCallback, useState } from "react";
import { Camera, Image as ImageIcon, X } from "lucide-react";
import { compressImage } from "@/lib/image/compress";
import { IconButton } from "./IconButton";

/**
 * The photo-attach mechanism shared between the item-scoring page (ItemRow)
 * and the Method 1 Campus Visit page — one implementation, one underlying
 * state (whatever Record<string, File[]> the caller passes in via
 * onAddPhoto/onRemovePhoto), so a photo attached on either page shows up on
 * the other. Split into a hook + two small pieces rather than one combined
 * component because the two pages lay the button and the thumbnail list out
 * differently (ItemRow interleaves the button among other icons with the
 * list appearing after the condition pills; Campus Visit is a plain row).
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
  photos: File[];
  onRemovePhoto: (index: number) => void;
}

export function PhotoThumbList({ photos, onRemovePhoto }: PhotoThumbListProps) {
  if (photos.length === 0) return null;
  return (
    <div className="mt-1 space-y-1">
      {photos.map((p, i) => (
        <div key={i} className="flex items-center justify-between gap-2 text-[11px] text-ink-faint">
          <span className="truncate">
            {p.name} ({(p.size / 1024).toFixed(0)} KB)
          </span>
          <button
            type="button"
            onClick={() => onRemovePhoto(i)}
            aria-label={`Remove ${p.name}`}
            className="shrink-0 text-band-poor"
          >
            <X size={12} />
          </button>
        </div>
      ))}
    </div>
  );
}
