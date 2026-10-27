import { NextResponse } from "next/server";
import { authEnabled, createUser, loadUsers, normalizeEmail } from "@/lib/auth/server";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: Request) {
  if (!authEnabled()) {
    return NextResponse.json({ error: "Sign-up isn't switched on yet." }, { status: 503 });
  }

  let body: { name?: unknown; email?: unknown; password?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const email = typeof body.email === "string" ? normalizeEmail(body.email) : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (name.length < 2 || name.length > 80) {
    return NextResponse.json({ error: "Enter your full name." }, { status: 400 });
  }
  if (!EMAIL.test(email) || email.length > 120) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }
  if (password.length < 8 || password.length > 200) {
    return NextResponse.json({ error: "Use a password of at least 8 characters." }, { status: 400 });
  }

  try {
    const users = await loadUsers();
    if (users.some((u) => u.email === email)) {
      return NextResponse.json({ error: "An account with this email already exists. Try signing in." }, { status: 409 });
    }
    await createUser(name, email, password);
  } catch (err) {
    console.error("Sign-up failed:", err);
    return NextResponse.json({ error: "Couldn't create the account right now. Try again in a moment." }, { status: 502 });
  }

  // No session yet: the account stays pending until an administrator approves it.
  return NextResponse.json({ ok: true, pending: true }, { status: 201 });
}
