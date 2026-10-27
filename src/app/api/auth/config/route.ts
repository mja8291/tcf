import { NextResponse } from "next/server";
import { authEnabled } from "@/lib/auth/server";

/** Lets the app know whether to ask for sign-in at all — see authEnabled(). Never cached: the answer flips the moment AUTH_SECRET is set. */
export async function GET() {
  return NextResponse.json({ enabled: authEnabled() }, { headers: { "Cache-Control": "no-store" } });
}
