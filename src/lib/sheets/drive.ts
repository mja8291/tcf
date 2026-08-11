import "server-only";
import { Readable } from "node:stream";
import { getDriveClient } from "./client";

const folderCache = new Map<string, string>();

async function findOrCreateFolder(name: string, parentId: string): Promise<string> {
  const cacheKey = `${parentId}/${name}`;
  const cached = folderCache.get(cacheKey);
  if (cached) return cached;

  const drive = await getDriveClient();
  const escaped = name.replace(/'/g, "\\'");
  const list = await drive.files.list({
    q: `'${parentId}' in parents and name = '${escaped}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
    fields: "files(id, name)",
  });
  const existing = list.data.files?.[0]?.id;
  if (existing) {
    folderCache.set(cacheKey, existing);
    return existing;
  }

  const created = await drive.files.create({
    requestBody: { name, mimeType: "application/vnd.google-apps.folder", parents: [parentId] },
    fields: "id",
  });
  const id = created.data.id!;
  folderCache.set(cacheKey, id);
  return id;
}

/** Drive itself allows almost any character in a name, but Drive for Desktop
 * maps folders onto a real filesystem, and item names carry "*" (a rubric
 * marker, meaningless outside the app) and the occasional "/" (e.g. "Solar/UPS
 * Batteries", "Access to roof area /tanks") that would otherwise silently
 * split into a bogus extra folder level. */
function sanitizeName(name: string): string {
  return name
    .replace(/\*/g, "")
    .replace(/[/\\]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

function extensionFor(mimeType: string, filename: string): string {
  const byMime: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/heic": "heic",
    "image/gif": "gif",
  };
  if (byMime[mimeType]) return byMime[mimeType];
  const fromName = filename.split(".").pop();
  return fromName && fromName.length <= 5 ? fromName : "jpg";
}

/**
 * Uploads one survey photo to Drive under a folder chain that's readable and
 * sorts sensibly straight from the Drive UI, without needing to cross-reference
 * the "MQI Survey Attachments" sheet tab to know what a photo is of:
 *
 *   {root} / {Region} / {Campus Name} / {submission date} MQI Survey - {survey ID short} / [{Floor} - {Location Type} - {Location Name} /] {Item Name}.jpg
 *
 * The location segment only applies to Method 2 (Method 1 scores the whole
 * campus, so there's no per-location distinction to fold in). The submission
 * date is ISO-prefixed (YYYY-MM-DD) so folders sort chronologically wherever
 * Drive lists them alphabetically.
 */
export async function uploadSurveyPhoto(params: {
  region: string;
  campusName: string;
  surveyId: string;
  submittedAt: Date;
  itemName: string;
  location?: { floorLevel: string; type: string; name: string };
  mimeType: string;
  buffer: Buffer;
}): Promise<string> {
  const rootFolderId = process.env.MQI_PHOTOS_DRIVE_FOLDER_ID;
  if (!rootFolderId) throw new Error("MQI_PHOTOS_DRIVE_FOLDER_ID is not configured");

  const regionFolder = await findOrCreateFolder(sanitizeName(params.region || "Unspecified Region"), rootFolderId);
  const campusFolder = await findOrCreateFolder(sanitizeName(params.campusName || "Unspecified Campus"), regionFolder);

  const dateStamp = params.submittedAt.toISOString().slice(0, 10); // YYYY-MM-DD
  const surveyIdShort = params.surveyId.split("-")[0];
  const submissionFolder = await findOrCreateFolder(
    `${dateStamp} MQI Survey - ${surveyIdShort}`,
    campusFolder
  );

  const leafFolder = params.location
    ? await findOrCreateFolder(
        sanitizeName(`${params.location.floorLevel} - ${params.location.type} - ${params.location.name}`),
        submissionFolder
      )
    : submissionFolder;

  const filename = `${sanitizeName(params.itemName) || "Photo"}.${extensionFor(params.mimeType, params.itemName)}`;

  const drive = await getDriveClient();
  const res = await drive.files.create({
    requestBody: { name: filename, parents: [leafFolder] },
    media: { mimeType: params.mimeType, body: Readable.from(params.buffer) },
    fields: "id, webViewLink",
  });

  return res.data.webViewLink ?? `https://drive.google.com/file/d/${res.data.id}/view`;
}
