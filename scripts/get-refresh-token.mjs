// One-off helper: mints a fresh Google OAuth refresh token for this app.
// Run locally: node scripts/get-refresh-token.mjs
// Requires GOOGLE_OAUTH_CLIENT_ID / GOOGLE_OAUTH_CLIENT_SECRET already in .env.local.
//
// Opens a tiny local server on http://localhost:53682, prints a consent URL —
// open it in YOUR browser, sign in with the Google account that owns/edits
// the MQI spreadsheet, approve access. The new refresh token prints here.
// Delete this script (and don't commit real tokens) once done.

import http from "node:http";
import fs from "node:fs";
import { google } from "googleapis";

const envPath = new URL("../.env.local", import.meta.url);
const envText = fs.readFileSync(envPath, "utf8");
for (const line of envText.split("\n")) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m) {
    let val = m[2];
    if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
    process.env[m[1]] = val;
  }
}

const PORT = 53682;
const REDIRECT_URI = `http://localhost:${PORT}`;
const SCOPES = ["https://www.googleapis.com/auth/spreadsheets", "https://www.googleapis.com/auth/drive"];

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_OAUTH_CLIENT_ID,
  process.env.GOOGLE_OAUTH_CLIENT_SECRET,
  REDIRECT_URI
);

const authUrl = oauth2Client.generateAuthUrl({
  access_type: "offline",
  prompt: "consent", // force a new refresh token even if one was issued before
  scope: SCOPES,
});

console.log("\nOpen this URL in YOUR browser and sign in with the account that has edit access to the MQI spreadsheet:\n");
console.log(authUrl);
console.log("\nWaiting for you to approve...\n");

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, REDIRECT_URI);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");

  if (error) {
    res.end("Authorization failed: " + error + ". You can close this tab.");
    console.error("Authorization failed:", error);
    server.close();
    process.exit(1);
  }
  if (!code) {
    res.end("No code received.");
    return;
  }

  res.end("Authorized. You can close this tab and return to the terminal.");
  server.close();

  const { tokens } = await oauth2Client.getToken(code);
  console.log("\nNew refresh token:\n");
  console.log(tokens.refresh_token);
  console.log("\nNext steps:");
  console.log("1. Update GOOGLE_OAUTH_REFRESH_TOKEN in .env.local with this value.");
  console.log("2. Update it in Vercel: npx vercel env rm GOOGLE_OAUTH_REFRESH_TOKEN production");
  console.log("   then: npx vercel env add GOOGLE_OAUTH_REFRESH_TOKEN production");
  console.log("3. Redeploy: npx vercel deploy --prod");
  process.exit(0);
});

server.listen(PORT);
