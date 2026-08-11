import "server-only";
import { google } from "googleapis";
import { getWorkloadIdentityAccessToken, workloadIdentityConfigured } from "./workload-identity";

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

/** True once any auth path is configured; callers fall back to mock data otherwise. */
export function sheetsConfigured(): boolean {
  return workloadIdentityConfigured() || hasOAuthCreds() || hasServiceAccountCreds();
}

let fallbackAuthClient: InstanceType<typeof google.auth.JWT> | InstanceType<typeof google.auth.OAuth2> | null = null;

/**
 * Prefers Workload Identity Federation — Vercel's per-request OIDC token,
 * exchanged for a short-lived credential that impersonates a service
 * account with no key file ever created (see workload-identity.ts) — over
 * OAuth (client id/secret + refresh token, which expires every 7 days while
 * the Cloud org's OAuth consent screen stays in "Testing" status, and took
 * the app down in production once already) over a service-account JSON key
 * (blocked outright by org policy iam.disableServiceAccountKeyCreation).
 * Whichever path has its env vars set gets used; Workload Identity wins if
 * more than one is present.
 */
async function getAuth() {
  if (workloadIdentityConfigured()) {
    try {
      const accessToken = await getWorkloadIdentityAccessToken();
      const oauth2Client = new google.auth.OAuth2();
      oauth2Client.setCredentials({ access_token: accessToken });
      return oauth2Client;
    } catch (err) {
      // Don't hard-fail the request while this path is newly in production —
      // fall through to whatever else is configured (OAuth/service-account),
      // matching this same function's usual "next path" behavior below.
      console.error("Workload Identity auth failed, falling back:", err);
    }
  }

  if (fallbackAuthClient) return fallbackAuthClient;

  if (hasOAuthCreds()) {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_OAUTH_CLIENT_ID,
      process.env.GOOGLE_OAUTH_CLIENT_SECRET
    );
    oauth2Client.setCredentials({ refresh_token: process.env.GOOGLE_OAUTH_REFRESH_TOKEN });
    fallbackAuthClient = oauth2Client;
    return fallbackAuthClient;
  }

  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = process.env.GOOGLE_PRIVATE_KEY;
  if (!email || !key) {
    throw new Error(
      "Google credentials are not configured (need Workload Identity, OAuth, or service-account env vars)"
    );
  }
  fallbackAuthClient = new google.auth.JWT({
    email,
    key: key.includes("\\n") ? key.replace(/\\n/g, "\n") : key,
    scopes: SCOPES,
  });
  return fallbackAuthClient;
}

export async function getSheetsClient() {
  return google.sheets({ version: "v4", auth: await getAuth() });
}

export async function getDriveClient() {
  return google.drive({ version: "v3", auth: await getAuth() });
}
