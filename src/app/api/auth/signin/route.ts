import { NextResponse } from "next/server";
import {
  authEnabled,
  burnPasswordCheck,
  clearFailures,
  loadUsers,
  normalizeEmail,
  recordFailure,
  setSessionCookie,
  tooManyFailures,
  verifyPassword,
} from "@/lib/auth/server";

export async function POST(req: Request) {
  if (!authEnabled()) {
    return NextResponse.json({ error: "Sign-in isn't switched on yet." }, { status: 503 });
  }

  let body: { email?: unknown; password?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const email = typeof body.email === "string" ? normalizeEmail(body.email) : "";
  const password = typeof body.password === "string" ? body.password : "";
  if (!email || !password) {
    return NextResponse.json({ error: "Enter your email and password." }, { status: 400 });
  }

  if (tooManyFailures(email)) {
    return NextResponse.json({ error: "Too many failed attempts. Wait a few minutes and try again." }, { status: 429 });
  }

  let user;
  try {
    user = (await loadUsers()).find((u) => u.email === email);
  } catch (err) {
    console.error("Sign-in lookup failed:", err);
    return NextResponse.json({ error: "Couldn't check your account right now. Try again in a moment." }, { status: 502 });
  }

  const valid = user ? await verifyPassword(password, user.passwordHash) : (await burnPasswordCheck(password), false);
  if (!user || !valid) {
    recordFailure(email);
    return NextResponse.json({ error: "Incorrect email or password." }, { status: 401 });
  }
  clearFailures(email);

  // Only said once the password is right, so it can't be used to discover who has an account.
  if (!user.approved) {
    return NextResponse.json(
      { error: "Your account is waiting for approval. You'll be able to sign in once an administrator approves it.", pending: true },
      { status: 403 }
    );
  }

  const sessionUser = { id: user.id, name: user.name, email: user.email };
  await setSessionCookie(sessionUser);
  return NextResponse.json({ user: sessionUser });
}
