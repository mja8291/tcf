import { NextResponse } from "next/server";
import { requireUser, setSessionCookie } from "@/lib/auth/server";

/**
 * "Am I still signed in, and still approved?" — called when the app opens or
 * regains a connection. A success also re-issues the cookie, so a phone that
 * keeps being used stays signed in instead of hitting the 60-day wall.
 */
export async function GET() {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  if (!auth.user) return NextResponse.json({ error: "Sign-in isn't switched on." }, { status: 404 });
  await setSessionCookie(auth.user);
  return NextResponse.json({ user: auth.user }, { headers: { "Cache-Control": "no-store" } });
}
