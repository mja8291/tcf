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
 * OAuth (client id/secret + refresh token) or a service-account JSON key —
 * whichever real, human-or-key-backed identity is configured. This is the
 * fallback path for Sheets when Workload Identity errors, and the *only*
 * path for Drive (see getDriveClient below for why).
 */
function getFallbackAuth() {
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

  return getFallbackAuth();
}

export async function getSheetsClient() {
  return google.sheets({ version: "v4", auth: await getAuth() });
}

/**
 * Drive deliberately never uses Workload Identity: creating a file needs
 * the acting identity to have its own storage quota, and a service account
 * (impersonated or not) has none against a normal "My Drive" folder —
 * Google returns 403 "Service Accounts do not have storage quota" even
 * when the folder is shared as Editor (confirmed 2026-08-11 testing photo
 * uploads). OAuth-as-a-human does have real quota, so Drive always uses
 * that fallback path directly. This restriction goes away once
 * MQI_PHOTOS_DRIVE_FOLDER_ID points at a Shared Drive instead of a folder
 * in someone's My Drive — Shared Drives have org-pooled quota that isn't
 * tied to any one identity — at which point Drive could move to Workload
 * Identity too. See chat notes; this needs a decision from Junaid on
 * whether TCF's Workspace plan has Shared Drives available.
 */
export async function getDriveClient() {
  return google.drive({ version: "v3", auth: getFallbackAuth() });
}
