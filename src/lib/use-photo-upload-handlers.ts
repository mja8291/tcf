"use client";

import { useCallback } from "react";
import { uploadPhoto } from "./photo-upload";
import type { PhotoAsset } from "./types";

function newPhotoId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `photo-${Date.now()}-${Math.random()}`;
}

interface UsePhotoUploadHandlersParams {
  surveyId: string | null;
  region: string;
  campusName: string;
  /** Method 2 only — omit for Method 1 (no per-photo location distinction there). */
  floorLevel?: string;
  locationType?: string;
  locationName?: string;
  addPhoto: (itemName: string, id: string, file: File) => void;
  setPhotoStatus: (itemName: string, id: string, status: PhotoAsset["status"], url?: string) => void;
  removePhoto: (itemName: string, id: string) => void;
}

/**
 * Shared add/retry/remove wiring for the photo-attach control (Round 3 Task
 * 8) — used by both Method 1 pages and the Method 2 score page, which
 * otherwise duplicate every other photo dispatcher already (m1* vs
 * m2Current*, matching the rest of this codebase's M1/M2 split). Attaching
 * a photo here pushes it into state immediately as "uploading" (so the UI
 * never waits on the network to show it was picked), fires the actual Drive
 * upload in the background, and updates that one photo's status once the
 * upload settles — a failed upload only costs that one photo, with a retry
 * control, instead of risking the whole scoring session the way bundling
 * every photo into the final submit request used to.
 */
export function usePhotoUploadHandlers({
  surveyId,
  region,
  campusName,
  floorLevel,
  locationType,
  locationName,
  addPhoto,
  setPhotoStatus,
  removePhoto,
}: UsePhotoUploadHandlersParams) {
  const runUpload = useCallback(
    (itemName: string, id: string, file: File) => {
      if (!surveyId) {
        // Shouldn't happen — every page that can attach a photo requires a
        // chosen method, which is what mints surveyId — but fail closed
        // with a retryable error rather than silently losing the photo.
        setPhotoStatus(itemName, id, "error");
        return;
      }
      const location = floorLevel && locationType && locationName ? { floorLevel, type: locationType, name: locationName } : undefined;
      uploadPhoto({ surveyId, region, campusName, itemName, location, file })
        .then(({ url }) => setPhotoStatus(itemName, id, "uploaded", url))
        .catch(() => setPhotoStatus(itemName, id, "error"));
    },
    [surveyId, region, campusName, floorLevel, locationType, locationName, setPhotoStatus]
  );

  const handleAddPhoto = useCallback(
    (itemName: string, file: File) => {
      const id = newPhotoId();
      addPhoto(itemName, id, file);
      runUpload(itemName, id, file);
    },
    [addPhoto, runUpload]
  );

  const handleRetryPhoto = useCallback(
    (itemName: string, id: string, file: File) => {
      setPhotoStatus(itemName, id, "uploading");
      runUpload(itemName, id, file);
    },
    [setPhotoStatus, runUpload]
  );

  const handleRemovePhoto = useCallback((itemName: string, id: string) => removePhoto(itemName, id), [removePhoto]);

  return { handleAddPhoto, handleRetryPhoto, handleRemovePhoto };
}
