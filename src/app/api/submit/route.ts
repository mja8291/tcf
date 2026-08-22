import { NextResponse } from "next/server";
import { sheetsConfigured } from "@/lib/sheets/client";
import { appendAttachmentRow, appendMethod1Response, appendMethod2Response } from "@/lib/sheets/responses";
import type { SubmitPayload } from "@/lib/submit";

/**
 * Plain JSON now, not multipart — since Round 3 Task 8, every photo is
 * already uploaded to Drive individually on attach (see
 * /api/photos/upload), so this payload only ever carries scores, metadata,
 * and already-resolved photo urls. No photo bytes pass through this route
 * at all, which is what keeps it clear of Vercel's 4.5MB request-body
 * limit regardless of how many photos a survey ends up with.
 */
export async function POST(req: Request) {
  const payload = (await req.json()) as SubmitPayload;

  if (!sheetsConfigured() || !process.env.MQI_SPREADSHEET_ID) {
    // Not wired to a live spreadsheet yet — accept the submission so the app
    // stays fully clickable, but don't pretend anything was persisted.
    return NextResponse.json({ ok: true, surveyId: payload.surveyId, persisted: false });
  }

  if (payload.method === 1) {
    await appendMethod1Response(payload);
  } else {
    await appendMethod2Response(payload);
  }

  // One attachments row per item that has a photo and/or a note.
  const noteByKey = new Map(payload.notes.map((n) => [n.attachmentKey, n]));
  const photoByKey = new Map(payload.photoKeys.map((p) => [p.attachmentKey, p]));
  const attachmentKeys = new Set([...photoByKey.keys(), ...noteByKey.keys()]);
  for (const key of attachmentKeys) {
    const photoEntry = photoByKey.get(key);
    const noteEntry = noteByKey.get(key);
    await appendAttachmentRow({
      surveyId: payload.surveyId,
      itemName: photoEntry?.itemName ?? noteEntry?.itemName ?? "",
      locationName: photoEntry?.locationName ?? noteEntry?.locationName ?? "",
      photoUrl: photoEntry?.url,
      note: noteEntry?.note,
    });
  }

  return NextResponse.json({ ok: true, surveyId: payload.surveyId, persisted: true });
}
