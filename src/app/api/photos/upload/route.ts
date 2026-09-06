import { NextResponse } from "next/server";
import { sheetsConfigured } from "@/lib/sheets/client";
import { uploadSurveyPhoto } from "@/lib/sheets/drive";

/**
 * Uploads one photo straight to Drive, independent of the final submit
 * request — see Round 3 Task 8. Called once per photo, right after it's
 * attached and client-side compressed, not bundled with the rest of the
 * form. Keeping this as its own small request (well under 300KB per Task
 * 14's compression target) is what keeps every request clear of Vercel's
 * 4.5MB serverless body limit, regardless of how many photos a survey ends
 * up with.
 */
export async function POST(req: Request) {
  const formData = await req.formData();
  const file = formData.get("photo");
  const surveyId = formData.get("surveyId");
  const region = formData.get("region");
  const campusName = formData.get("campusName");
  const itemName = formData.get("itemName");
  const floorLevel = formData.get("floorLevel");
  const locationType = formData.get("locationType");
  const locationName = formData.get("locationName");

  if (!(file instanceof File) || typeof surveyId !== "string" || typeof itemName !== "string") {
    return NextResponse.json({ error: "Missing photo, surveyId, or itemName" }, { status: 400 });
  }

  if (!sheetsConfigured() || !process.env.MQI_PHOTOS_DRIVE_FOLDER_ID) {
    // Not wired to Drive yet — accept so the app stays fully clickable in
    // dev, but don't pretend anything was actually persisted. The caller
    // treats a missing url as "attached locally, nothing to link yet."
    return NextResponse.json({ ok: true, url: null, persisted: false });
  }

  const location =
    typeof floorLevel === "string" && typeof locationType === "string" && typeof locationName === "string"
      ? { floorLevel, type: locationType, name: locationName }
      : undefined;

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const url = await uploadSurveyPhoto({
      region: typeof region === "string" ? region : "",
      campusName: typeof campusName === "string" ? campusName : "",
      surveyId,
      submittedAt: new Date(),
      itemName,
      location,
      mimeType: file.type || "image/jpeg",
      buffer,
    });
    return NextResponse.json({ ok: true, url, persisted: true });
  } catch (err) {
    console.error("Photo upload to Drive failed:", err);
    // A generic "Upload to Drive failed" hides two very different problems
    // behind the same message: a transient blip (worth retrying as-is) vs.
    // the uploading Google account's Drive storage being full (retrying
    // changes nothing until someone frees space or the app is repointed at
    // a different account — hit in production 2026-09, see memory). Surface
    // the quota case by name so it's diagnosable from the field without a
    // debugging session, instead of looking identical to a flaky network.
    const reason = driveErrorReason(err);
    const message =
      reason === "storageQuotaExceeded"
        ? "Photo storage is full — contact the app administrator. Retrying won't help until space is freed."
        : "Upload to Drive failed";
    return NextResponse.json({ error: message, reason }, { status: 502 });
  }
}

/** Pulls Google API's machine-readable error reason (e.g. "storageQuotaExceeded") out of a googleapis client error, if present. */
function driveErrorReason(err: unknown): string | undefined {
  if (typeof err !== "object" || err === null) return undefined;
  const response = (err as { response?: { data?: unknown } }).response;
  const data = response?.data as { error?: { errors?: { reason?: string }[] } } | undefined;
  return data?.error?.errors?.[0]?.reason;
}
