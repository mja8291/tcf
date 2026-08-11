// TEMPORARY, one-off: deletes a specific orphaned Drive folder that the
// service account owns (created before the Drive-auth fix), which the
// OAuth-as-human identity can't delete since it doesn't own it. Uses
// Workload Identity directly (bypassing getDriveClient's OAuth-only Drive
// path) since only the owning identity can delete it. Remove this route
// once used — see chat notes 2026-08-11.
import { NextResponse } from "next/server";
import { getWorkloadIdentityAccessToken } from "@/lib/sheets/workload-identity";

const TARGET_FOLDER_ID = "1RrNMgmxpZU5c86vdvayQ5Gs8wPvN41_v";

export async function GET() {
  const accessToken = await getWorkloadIdentityAccessToken();
  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${TARGET_FOLDER_ID}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const text = await res.text();
  return NextResponse.json({ status: res.status, body: text || "(empty — 204 means success)" });
}
