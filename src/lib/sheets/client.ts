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
 * when the folder is shared as Editor (confirmed 2026-08-11). OAuth-as-a-human
 * has real quota, but that just traded one failure mode for another — it
 * ties every upload to one person's personal account, which independently
 * broke twice: the OAuth token auto-expiring every ~7 days (Testing-status
 * consent screen), and that person's own Drive quota filling up entirely
 * (confirmed 2026-09-04, a full production outage).
 *
 * The obvious fix — move MQI_PHOTOS_DRIVE_FOLDER_ID into a Shared Drive, so
 * the service account can write there directly (org-pooled quota, not tied
 * to any one identity) — turned out not to be available here: Shared
 * Drives are a Google Workspace-only feature, and both Google accounts this
 * app uses (mja8291@gmail.com, tcfengineeringdepartment@gmail.com) are
 * plain personal Gmail accounts with no Workspace domain behind them
 * (confirmed with the user 2026-09-05 — no such domain exists at TCF).
 * `supportsAllDrives`/`includeItemsFromAllDrives` were added to drive.ts's
 * API calls anyway since they're harmless no-ops against a plain My Drive
 * folder, in case a real Workspace domain ever shows up later. Until then,
 * Drive stays on the OAuth-as-a-human fallback path — see memory notes for
 * the current plan (switch the acting identity to
 * tcfengineeringdepartment@gmail.com, which owns the folder outright, and
 * finally publish the OAuth consent screen out of Testing to kill the
 * 7-day expiry for good).
 */
export async function getDriveClient() {
  return google.drive({ version: "v3", auth: getFallbackAuth() });
}
