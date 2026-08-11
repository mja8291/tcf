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

// Find our latest test row
const spreadsheetId = process.env.MQI_SPREADSHEET_ID;
const res = await sheets.spreadsheets.values.get({ spreadsheetId, range: `'Method 2 Responses'!A1:L20` });
const rows = res.data.values || [];
const testRow = rows.find((r) => (r[11] || "").includes("Drive folder naming verification"));
console.log("Test row:", JSON.stringify(testRow));
const surveyId = testRow[0];

const attRes = await sheets.spreadsheets.values.get({ spreadsheetId, range: `'MQI Survey Attachments'!A1:E30` });
const attRows = attRes.data.values || [];
const attRow = attRows.find((r) => r[0] === surveyId);
console.log("Attachment row:", JSON.stringify(attRow));

// Walk Burki Campus folder to find the new dated submission folder
const rootFolderId = process.env.MQI_PHOTOS_DRIVE_FOLDER_ID;
const northList = await drive.files.list({ q: `'${rootFolderId}' in parents and trashed=false`, fields: "files(id,name)" });
const north = northList.data.files.find(f => f.name === "North");
const campusList = await drive.files.list({ q: `'${north.id}' in parents and trashed=false`, fields: "files(id,name)" });
const burki = campusList.data.files.find(f => f.name === "Burki Campus");
const subList = await drive.files.list({ q: `'${burki.id}' in parents and trashed=false`, fields: "files(id,name)" });
console.log("\nInside Burki Campus:", JSON.stringify(subList.data.files, null, 2));

const surveyIdShort = surveyId.split("-")[0];
const submissionFolder = subList.data.files.find(f => f.name.includes(surveyIdShort));
console.log("\nMatched submission folder:", JSON.stringify(submissionFolder));

const inSubmission = await drive.files.list({ q: `'${submissionFolder.id}' in parents and trashed=false`, fields: "files(id,name,mimeType)" });
console.log("\nInside submission folder:", JSON.stringify(inSubmission.data.files, null, 2));

const locFolder = inSubmission.data.files.find(f => f.mimeType === "application/vnd.google-apps.folder");
if (locFolder) {
  const inLoc = await drive.files.list({ q: `'${locFolder.id}' in parents and trashed=false`, fields: "files(id,name,size)" });
  console.log("\nInside location folder:", JSON.stringify(inLoc.data.files, null, 2));
}

fs.writeFileSync(new URL("./ids.json", import.meta.url), JSON.stringify({ surveyId, submissionFolderId: submissionFolder.id }));
