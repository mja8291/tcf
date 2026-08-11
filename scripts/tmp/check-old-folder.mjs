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
const drive = google.drive({ version: "v3", auth: oauth2Client });
const sheets = google.sheets({ version: "v4", auth: oauth2Client });

const oldFolderId = "1RrNMgmxpZU5c86vdvayQ5Gs8wPvN41_v";
const oldFolderName = "0eaf2827-c947-46d0-b999-7ac884b9f646";
const contents = await drive.files.list({ q: `'${oldFolderId}' in parents and trashed=false`, fields: "files(id,name)" });
console.log("Old folder contents:", JSON.stringify(contents.data.files, null, 2));

// Confirm this survey ID isn't a real submission row anywhere
const spreadsheetId = process.env.MQI_SPREADSHEET_ID;
const res = await sheets.spreadsheets.values.get({ spreadsheetId, range: `'Method 2 Responses'!A1:A50` });
const ids = (res.data.values || []).map(r => r[0]);
console.log("Matches a live Method 2 Responses row?", ids.includes(oldFolderName));
