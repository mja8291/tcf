"use client";

export interface UploadPhotoParams {
  surveyId: string;
  region: string;
  campusName: string;
  itemName: string;
  /** Method 2 only — folds the location into the Drive folder path, same as before. */
  location?: { floorLevel: string; type: string; name: string };
  file: File;
}

/**
 * Uploads one already-compressed photo straight to Drive as soon as it's
 * attached (Round 3 Task 8) — never bundled into the final submit request,
 * which is what blew past Vercel's 4.5MB request-body limit once enough
 * photos piled up. Throws on any non-OK response; callers mark the photo
 * "error" and offer a retry rather than silently dropping it.
 */
export async function uploadPhoto({
  surveyId,
  region,
  campusName,
  itemName,
  location,
  file,
}: UploadPhotoParams): Promise<{ url: string | undefined }> {
  const formData = new FormData();
  formData.append("photo", file, file.name);
  formData.append("surveyId", surveyId);
  formData.append("region", region);
  formData.append("campusName", campusName);
  formData.append("itemName", itemName);
  if (location) {
    formData.append("floorLevel", location.floorLevel);
    formData.append("locationType", location.type);
    formData.append("locationName", location.name);
  }

  const res = await fetch("/api/photos/upload", { method: "POST", body: formData });
  if (!res.ok) throw new Error(`Photo upload failed: ${res.status}`);
  const data = await res.json();
  // url is absent when Google isn't configured yet (local dev without
  // credentials) — the route still responds ok so the app stays clickable,
  // same fallback philosophy as /api/submit's persisted:false path.
  return { url: typeof data.url === "string" ? data.url : undefined };
}
