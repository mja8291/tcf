"use client";

import { useCallback, useState } from "react";
import { Camera, X } from "lucide-react";
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

interface PhotoAttachButtonProps {
  /** Used to build a unique <input id> — pass the item name. */
  itemKey: string;
  photoCount: number;
  compressing: boolean;
  onPick: (file: File | undefined) => void;
}

export function PhotoAttachButton({ itemKey, photoCount, compressing, onPick }: PhotoAttachButtonProps) {
  const inputId = `photo_${itemKey.replace(/[^a-zA-Z0-9]/g, "_")}`;
  return (
    <>
      <IconButton
        active={photoCount > 0}
        aria-label={photoCount > 0 ? `Add another photo (${photoCount} attached)` : "Attach photo"}
        onClick={() => document.getElementById(inputId)?.click()}
        disabled={compressing}
        className="relative"
      >
        <Camera size={16} />
        {photoCount > 0 ? (
          <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-brand text-[9px] font-bold text-white">
            {photoCount}
          </span>
        ) : null}
      </IconButton>
      <input
        id={inputId}
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
    </>
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
