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
    return NextResponse.json({ error: "Upload to Drive failed" }, { status: 502 });
  }
}
