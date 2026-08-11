import "server-only";
import { headers } from "next/headers";

const STS_URL = "https://sts.googleapis.com/v1/token";
const CLOUD_PLATFORM_SCOPE = "https://www.googleapis.com/auth/cloud-platform";
const SHEETS_DRIVE_SCOPES = ["https://www.googleapis.com/auth/spreadsheets", "https://www.googleapis.com/auth/drive"];

export function workloadIdentityConfigured(): boolean {
  return Boolean(process.env.GOOGLE_WORKLOAD_IDENTITY_AUDIENCE && process.env.GOOGLE_IMPERSONATE_SERVICE_ACCOUNT);
}

/**
 * The Vercel-issued OIDC token proving this request came from our deployment.
 * In deployed Vercel Functions it arrives fresh per-request as a header (per
 * Vercel's OIDC docs — reading VERCEL_OIDC_TOKEN at module scope would be
 * stale). In local dev there's no such header, so fall back to the env var
 * written by `vercel env pull`.
 */
async function getVercelOidcToken(): Promise<string> {
  try {
    const h = await headers();
    const headerToken = h.get("x-vercel-oidc-token");
    if (headerToken) return headerToken;
  } catch {
    // headers() throws when called outside a request scope — fall through to the env var.
  }
  const envToken = process.env.VERCEL_OIDC_TOKEN;
  if (!envToken) {
    throw new Error("No Vercel OIDC token available (no x-vercel-oidc-token header and VERCEL_OIDC_TOKEN is unset)");
  }
  return envToken;
}

let cached: { accessToken: string; expiresAt: number } | null = null;

/**
 * Exchanges Vercel's OIDC token for a short-lived GCP access token
 * impersonating GOOGLE_IMPERSONATE_SERVICE_ACCOUNT, via the Workload
 * Identity Pool configured in GOOGLE_WORKLOAD_IDENTITY_AUDIENCE. No
 * long-lived credential (OAuth refresh token or service-account key) is
 * ever stored — see AGENTS.md-adjacent notes in client.ts for why this
 * replaced the OAuth path.
 */
export async function getWorkloadIdentityAccessToken(): Promise<string> {
  if (cached && Date.now() < cached.expiresAt - 60_000) return cached.accessToken;

  const oidcToken = await getVercelOidcToken();
  const audience = process.env.GOOGLE_WORKLOAD_IDENTITY_AUDIENCE!;
  const serviceAccount = process.env.GOOGLE_IMPERSONATE_SERVICE_ACCOUNT!;

  // Step 1: trade the OIDC token for a federated (but not-yet-impersonated) GCP token.
  const stsRes = await fetch(STS_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      audience,
      grantType: "urn:ietf:params:oauth:grant-type:token-exchange",
      requestedTokenType: "urn:ietf:params:oauth:token-type:access_token",
      subjectToken: oidcToken,
      subjectTokenType: "urn:ietf:params:oauth:token-type:jwt",
      scope: CLOUD_PLATFORM_SCOPE,
    }),
  });
  if (!stsRes.ok) {
    throw new Error(`Workload Identity STS exchange failed: ${stsRes.status} ${await stsRes.text()}`);
  }
  const stsData = (await stsRes.json()) as { access_token: string };

  // Step 2: use the federated token to impersonate the service account that
  // actually has Sheets/Drive access (granted via roles/iam.workloadIdentityUser).
  const impersonateRes = await fetch(
    `https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/${serviceAccount}:generateAccessToken`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${stsData.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ scope: SHEETS_DRIVE_SCOPES }),
    }
  );
  if (!impersonateRes.ok) {
    throw new Error(`Service account impersonation failed: ${impersonateRes.status} ${await impersonateRes.text()}`);
  }
  const impersonateData = (await impersonateRes.json()) as { accessToken: string; expireTime: string };

  cached = { accessToken: impersonateData.accessToken, expiresAt: new Date(impersonateData.expireTime).getTime() };
  return cached.accessToken;
}
