import { NextResponse } from "next/server";
import { sheetsConfigured } from "@/lib/sheets/client";
import { appendAttachmentRow, appendMethod1Response, appendMethod2Response } from "@/lib/sheets/responses";
import { uploadSurveyPhoto } from "@/lib/sheets/drive";
import type { SubmitPayload } from "@/lib/submit";

export async function POST(req: Request) {
  const formData = await req.formData();
  const payloadRaw = formData.get("payload");
  if (typeof payloadRaw !== "string") {
    return NextResponse.json({ error: "Missing payload" }, { status: 400 });
  }
  const payload = JSON.parse(payloadRaw) as SubmitPayload;

  if (!sheetsConfigured() || !process.env.MQI_SPREADSHEET_ID) {
    // Not wired to a live spreadsheet yet — accept the submission so the app
    // stays fully clickable, but don't pretend anything was persisted.
    return NextResponse.json({ ok: true, surveyId: payload.surveyId, persisted: false });
  }

  // Upload every attached photo to Drive, keyed by attachmentKey so we can
  // match it back to its item/location when writing the attachments tab.
  const submittedAt = new Date();
  const photoUrlByKey = new Map<string, string>();
  for (const { attachmentKey, itemName } of payload.photoKeys) {
    const file = formData.get(`photo:${attachmentKey}`);
    if (!(file instanceof File)) continue;
    const buffer = Buffer.from(await file.arrayBuffer());

    // Method 2 attachment keys are "{locationId}::{itemName}" (see submit.ts)
    // — look the location back up for its floor/type/name so the Drive
    // folder can name itself after where the photo was actually taken.
    const locationId = payload.method === 2 ? attachmentKey.split("::")[0] : undefined;
    const location = locationId ? payload.locations?.find((l) => l.id === locationId) : undefined;

    const url = await uploadSurveyPhoto({
      region: payload.school.region,
      campusName: payload.school.name,
      surveyId: payload.surveyId,
      submittedAt,
      itemName,
      location: location ? { floorLevel: location.floorLevel, type: location.type, name: location.name } : undefined,
      mimeType: file.type || "image/jpeg",
      buffer,
    });
    photoUrlByKey.set(attachmentKey, url);
  }

  if (payload.method === 1) {
    await appendMethod1Response(payload);
  } else {
    await appendMethod2Response(payload);
  }

  // One attachments row per item that has a photo and/or a note.
  const noteByKey = new Map(payload.notes.map((n) => [n.attachmentKey, n]));
  const attachmentKeys = new Set([...photoUrlByKey.keys(), ...noteByKey.keys()]);
  for (const key of attachmentKeys) {
    const photoEntry = payload.photoKeys.find((p) => p.attachmentKey === key);
    const noteEntry = noteByKey.get(key);
    await appendAttachmentRow({
      surveyId: payload.surveyId,
      itemName: photoEntry?.itemName ?? noteEntry?.itemName ?? "",
      locationName: photoEntry?.locationName ?? noteEntry?.locationName ?? "",
      photoUrl: photoUrlByKey.get(key),
      note: noteEntry?.note,
    });
  }

  return NextResponse.json({ ok: true, surveyId: payload.surveyId, persisted: true });
}
