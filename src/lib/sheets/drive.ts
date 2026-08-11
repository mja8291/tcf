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

/**
 * Uploads one survey photo to Drive under
 * "MQI Survey Photos / {Region} / {Campus Name} / {Survey ID}/", creating the
 * folder chain as needed, and returns the file's view URL.
 */
export async function uploadSurveyPhoto(params: {
  region: string;
  campusName: string;
  surveyId: string;
  filename: string;
  mimeType: string;
  buffer: Buffer;
}): Promise<string> {
  const rootFolderId = process.env.MQI_PHOTOS_DRIVE_FOLDER_ID;
  if (!rootFolderId) throw new Error("MQI_PHOTOS_DRIVE_FOLDER_ID is not configured");

  const regionFolder = await findOrCreateFolder(params.region || "Unspecified Region", rootFolderId);
  const campusFolder = await findOrCreateFolder(params.campusName || "Unspecified Campus", regionFolder);
  const surveyFolder = await findOrCreateFolder(params.surveyId, campusFolder);

  const drive = await getDriveClient();
  const res = await drive.files.create({
    requestBody: { name: params.filename, parents: [surveyFolder] },
    media: { mimeType: params.mimeType, body: Readable.from(params.buffer) },
    fields: "id, webViewLink",
  });

  return res.data.webViewLink ?? `https://drive.google.com/file/d/${res.data.id}/view`;
}
