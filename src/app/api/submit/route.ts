import { NextResponse } from "next/server";
import { sheetsConfigured } from "@/lib/sheets/client";
import { appendAttachmentRows, appendMethod1Response, appendMethod2Response } from "@/lib/sheets/responses";
import type { SubmitPayload } from "@/lib/submit";

// Batching (see appendRowsByHeader) cut this down to ~2 Sheets API calls per
// submission regardless of location/photo count, but a cold Google-auth
// client plus a large Method 2 survey can still take a few seconds — this
// gives it real headroom instead of racing Vercel's much shorter default.
// Vercel silently caps this at whatever the project's plan actually allows,
// so it's harmless to ask for more than a given plan grants.
export const maxDuration = 60;

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

  // One attachments row per item that has a photo and/or a note, all in a
  // single batched call — see appendRowsByHeader for why not one call per
  // key (this loop used to await appendAttachmentRow individually, adding
  // one more sequential network round-trip per photo/note on top of the
  // per-location ones above).
  const noteByKey = new Map(payload.notes.map((n) => [n.attachmentKey, n]));
  const photoByKey = new Map(payload.photoKeys.map((p) => [p.attachmentKey, p]));
  const attachmentKeys = new Set([...photoByKey.keys(), ...noteByKey.keys()]);
  await appendAttachmentRows(
    [...attachmentKeys].map((key) => {
      const photoEntry = photoByKey.get(key);
      const noteEntry = noteByKey.get(key);
      return {
        surveyId: payload.surveyId,
        itemName: photoEntry?.itemName ?? noteEntry?.itemName ?? "",
        locationName: photoEntry?.locationName ?? noteEntry?.locationName ?? "",
        photoUrl: photoEntry?.url,
        note: noteEntry?.note,
      };
    })
  );

  return NextResponse.json({ ok: true, surveyId: payload.surveyId, persisted: true });
}
