import { google } from "googleapis";
import fs from "node:fs";

const envPath = new URL("../../.env.local", import.meta.url);
const envText = fs.readFileSync(envPath, "utf8");
for (const line of envText.split("\n")) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m) {
    let val = m[2];
    if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
    process.env[m[1]] = val;
  }
}

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_OAUTH_CLIENT_ID,
  process.env.GOOGLE_OAUTH_CLIENT_SECRET
);
oauth2Client.setCredentials({ refresh_token: process.env.GOOGLE_OAUTH_REFRESH_TOKEN });
const sheets = google.sheets({ version: "v4", auth: oauth2Client });
const drive = google.drive({ version: "v3", auth: oauth2Client });

const spreadsheetId = process.env.MQI_SPREADSHEET_ID;
const testSurveyId = "064170c6-2b29-412a-ad92-712714304cfe";

// 1. Delete the test row from Method 2 Responses
const tab = "Method 2 Responses";
const res = await sheets.spreadsheets.values.get({ spreadsheetId, range: `'${tab}'!A1:B20` });
const rows = res.data.values || [];
const meta = await sheets.spreadsheets.get({ spreadsheetId });
const sheetProps = meta.data.sheets.find((s) => s.properties.title === tab).properties;
const rowIdx = rows.findIndex((r) => r[0] === testSurveyId);
if (rowIdx > 0) {
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: { requests: [{ deleteDimension: { range: { sheetId: sheetProps.sheetId, dimension: "ROWS", startIndex: rowIdx, endIndex: rowIdx + 1 } } }] },
  });
  console.log("Deleted Method 2 Responses row for", testSurveyId);
}

// 2. Delete the attachment row
const attTab = "MQI Survey Attachments";
const attRes = await sheets.spreadsheets.values.get({ spreadsheetId, range: `'${attTab}'!A1:E20` });
const attRows = attRes.data.values || [];
const attMeta = meta.data.sheets.find((s) => s.properties.title === attTab).properties;
const attRowIndexes = attRows.map((r, i) => (r[0] === testSurveyId ? i : -1)).filter((i) => i > 0);
if (attRowIndexes.length) {
  const requests = attRowIndexes.sort((a, b) => b - a)
    .map((i) => ({ deleteDimension: { range: { sheetId: attMeta.sheetId, dimension: "ROWS", startIndex: i, endIndex: i + 1 } } }));
  await sheets.spreadsheets.batchUpdate({ spreadsheetId, requestBody: { requests } });
  console.log("Deleted", attRowIndexes.length, "attachment row(s)");
}

// 3. Delete today's new submission folder (recursively removes the location subfolder + photo)
await drive.files.delete({ fileId: "1ddRkPRgCv1dqdZO75n6saGEd3pm8KuLu" });
console.log("Deleted today's test submission folder: 2026-08-11 MQI Survey - 064170c6");

// 4. Delete the old orphaned empty folder from the earlier failed test attempt
await drive.files.delete({ fileId: "1RrNMgmxpZU5c86vdvayQ5Gs8wPvN41_v" });
console.log("Deleted old orphaned empty folder: 0eaf2827-c947-46d0-b999-7ac884b9f646");
