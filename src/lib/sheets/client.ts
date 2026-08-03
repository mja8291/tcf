import "server-only";
import { google } from "googleapis";

const SCOPES = ["https://www.googleapis.com/auth/spreadsheets", "https://www.googleapis.com/auth/drive"];

function hasOAuthCreds(): boolean {
  return Boolean(
    process.env.GOOGLE_OAUTH_CLIENT_ID &&
      process.env.GOOGLE_OAUTH_CLIENT_SECRET &&
      process.env.GOOGLE_OAUTH_REFRESH_TOKEN
  );
}

function hasServiceAccountCreds(): boolean {
  return Boolean(process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_PRIVATE_KEY);
}

/** True once either auth path is configured; callers fall back to mock data otherwise. */
export function sheetsConfigured(): boolean {
  return hasOAuthCreds() || hasServiceAccountCreds();
}

let authClient: InstanceType<typeof google.auth.JWT> | InstanceType<typeof google.auth.OAuth2> | null = null;

/**
 * Prefers OAuth (client id/secret + refresh token) over a service-account
 * JSON key, since TCF's Cloud org blocks service-account key creation by
 * policy — OAuth sidesteps that entirely. Both paths are supported so
 * whichever one someone gets working just needs its env vars set.
 */
function getAuth() {
  if (authClient) return authClient;

  if (hasOAuthCreds()) {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_OAUTH_CLIENT_ID,
      process.env.GOOGLE_OAUTH_CLIENT_SECRET
    );
    oauth2Client.setCredentials({ refresh_token: process.env.GOOGLE_OAUTH_REFRESH_TOKEN });
    authClient = oauth2Client;
    return authClient;
  }

  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = process.env.GOOGLE_PRIVATE_KEY;
  if (!email || !key) {
    throw new Error("Google credentials are not configured (need either OAuth or service-account env vars)");
  }
  authClient = new google.auth.JWT({
    email,
    key: key.includes("\\n") ? key.replace(/\\n/g, "\n") : key,
    scopes: SCOPES,
  });
  return authClient;
}

export function getSheetsClient() {
  return google.sheets({ version: "v4", auth: getAuth() });
}

export function getDriveClient() {
  return google.drive({ version: "v3", auth: getAuth() });
}
