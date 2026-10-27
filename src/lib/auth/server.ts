import "server-only";
import crypto from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { sheetsConfigured } from "@/lib/sheets/client";
import { appendRowByHeader } from "@/lib/sheets/responses";
import { readRowsByHeader } from "@/lib/sheets/read";

/**
 * Accounts live in a "Users" tab of the same spreadsheet as everything else
 * (this app has no database). Sign-up creates a row with Approved = NO; an
 * administrator flips it to YES in the sheet. Passwords are stored as salted
 * scrypt hashes, never in the clear. A signed, HttpOnly session cookie then
 * carries the identity — see readSession/requireUser.
 *
 * Sign-in is switched on by setting AUTH_SECRET (16+ characters) on the
 * server. Until then authEnabled() is false and the whole app behaves exactly
 * as it did before accounts existed, so deploying this code can't lock
 * anyone out before the secret is in place.
 */

const USERS_TAB = process.env.USERS_TAB || "Users";
const USERS_HEADER = ["User ID", "Created At", "Name", "Email", "Password Hash", "Approved"];

export const SESSION_COOKIE = "mqi_session";
const SESSION_SECONDS = 60 * 24 * 60 * 60; // 60 days, refreshed every time the app re-checks its session

export interface SessionUser {
  id: string;
  name: string;
  email: string;
}

export function authEnabled(): boolean {
  return (
    (process.env.AUTH_SECRET?.length ?? 0) >= 16 && sheetsConfigured() && Boolean(process.env.MQI_SPREADSHEET_ID)
  );
}

function secret(): string {
  return process.env.AUTH_SECRET as string;
}

// ---- passwords -------------------------------------------------------------

const SCRYPT = { N: 16384, r: 8, p: 1, keylen: 64 };

function scrypt(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) =>
    crypto.scrypt(password, salt, SCRYPT.keylen, { N: SCRYPT.N, r: SCRYPT.r, p: SCRYPT.p }, (err, key) =>
      err ? reject(err) : resolve(key)
    )
  );
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(16);
  const key = await scrypt(password, salt);
  return `scrypt$${SCRYPT.N}$${salt.toString("base64")}$${key.toString("base64")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, n, saltB64, keyB64] = stored.split("$");
  if (scheme !== "scrypt" || Number(n) !== SCRYPT.N || !saltB64 || !keyB64) return false;
  const expected = Buffer.from(keyB64, "base64");
  const actual = await scrypt(password, Buffer.from(saltB64, "base64"));
  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
}

/** Spent when the email isn't registered, so "no such account" takes as long as "wrong password" and doesn't reveal which. */
export async function burnPasswordCheck(password: string): Promise<void> {
  await scrypt(password, Buffer.alloc(16));
}

// ---- users tab -------------------------------------------------------------

export interface UserRecord extends SessionUser {
  passwordHash: string;
  approved: boolean;
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

let usersCache: { at: number; users: UserRecord[] } | null = null;

/** Reads the Users tab; a missing tab simply means nobody has signed up yet. */
export async function loadUsers(maxAgeMs = 0): Promise<UserRecord[]> {
  if (usersCache && maxAgeMs > 0 && Date.now() - usersCache.at < maxAgeMs) return usersCache.users;
  const spreadsheetId = process.env.MQI_SPREADSHEET_ID as string;
  let rows: Record<string, string>[] = [];
  try {
    rows = await readRowsByHeader(spreadsheetId, USERS_TAB);
  } catch (err) {
    // The tab not existing yet is normal on day one; anything else (quota,
    // network) must not be mistaken for "no users" — that would let sign-up
    // overwrite and sign-in fail for everyone — so surface it.
    const message = err instanceof Error ? err.message : "";
    if (!/Unable to parse range|not found|does not exist/i.test(message)) throw err;
  }
  const users = rows
    .filter((r) => r["Email"])
    .map((r) => ({
      id: r["User ID"],
      name: r["Name"],
      email: normalizeEmail(r["Email"]),
      passwordHash: r["Password Hash"],
      approved: r["Approved"].trim().toUpperCase() === "YES",
    }));
  usersCache = { at: Date.now(), users };
  return users;
}

export async function createUser(name: string, email: string, password: string): Promise<void> {
  const spreadsheetId = process.env.MQI_SPREADSHEET_ID as string;
  await appendRowByHeader(spreadsheetId, USERS_TAB, USERS_HEADER, {
    "User ID": crypto.randomUUID(),
    "Created At": new Date().toISOString(),
    Name: name,
    Email: email,
    "Password Hash": await hashPassword(password),
    Approved: "NO",
  });
  usersCache = null;
}

// ---- sessions --------------------------------------------------------------

interface SessionPayload extends SessionUser {
  exp: number; // epoch ms
}

function sign(data: string): string {
  return crypto.createHmac("sha256", secret()).update(data).digest("base64url");
}

export function createSessionToken(user: SessionUser): string {
  const payload: SessionPayload = { ...user, exp: Date.now() + SESSION_SECONDS * 1000 };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${body}.${sign(body)}`;
}

function parseSessionToken(token: string): SessionUser | null {
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expected = sign(body);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString()) as SessionPayload;
    if (!payload.id || typeof payload.exp !== "number" || payload.exp < Date.now()) return null;
    return { id: payload.id, name: payload.name, email: payload.email };
  } catch {
    return null;
  }
}

export async function readSession(): Promise<SessionUser | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return token ? parseSessionToken(token) : null;
}

export async function setSessionCookie(user: SessionUser): Promise<void> {
  (await cookies()).set(SESSION_COOKIE, createSessionToken(user), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_SECONDS,
  });
}

export async function clearSessionCookie(): Promise<void> {
  (await cookies()).set(SESSION_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
}

// ---- route guard -----------------------------------------------------------

export type AuthResult = { ok: true; user: SessionUser | null } | { ok: false; response: NextResponse };

/**
 * Put at the top of every route that reads or writes survey data:
 *
 *   const auth = await requireUser();
 *   if (!auth.ok) return auth.response;
 *
 * `auth.user` is null only when sign-in isn't switched on. Beyond a valid
 * cookie it re-checks the account is still approved (against a 60-second
 * cache of the Users tab), so un-approving someone in the sheet cuts them off
 * within about a minute instead of whenever their cookie happens to expire.
 */
export async function requireUser(): Promise<AuthResult> {
  if (!authEnabled()) return { ok: true, user: null };
  const session = await readSession();
  if (!session) {
    return { ok: false, response: NextResponse.json({ error: "Sign in required" }, { status: 401 }) };
  }
  try {
    const users = await loadUsers(60_000);
    const current = users.find((u) => u.id === session.id);
    if (!current || !current.approved) {
      return { ok: false, response: NextResponse.json({ error: "Account not approved" }, { status: 401 }) };
    }
    // The cookie can be older than a later name change in the sheet.
    return { ok: true, user: { id: current.id, name: current.name, email: current.email } };
  } catch {
    // Couldn't check (Sheets unreachable). 503 rather than 401 so a phone
    // keeps its queued survey and just retries, instead of asking to sign in.
    return { ok: false, response: NextResponse.json({ error: "Couldn't verify your account right now" }, { status: 503 }) };
  }
}

// ---- brute-force damping ---------------------------------------------------

const failures = new Map<string, { count: number; first: number }>();
const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILURES = 8;

/** Per-server-instance only (no shared store), so it slows guessing rather than guaranteeing a lockout — the scrypt cost does most of that work. */
export function tooManyFailures(key: string): boolean {
  const entry = failures.get(key);
  if (!entry) return false;
  if (Date.now() - entry.first > WINDOW_MS) {
    failures.delete(key);
    return false;
  }
  return entry.count >= MAX_FAILURES;
}
export function recordFailure(key: string): void {
  const entry = failures.get(key);
  if (!entry || Date.now() - entry.first > WINDOW_MS) failures.set(key, { count: 1, first: Date.now() });
  else entry.count++;
}
export function clearFailures(key: string): void {
  failures.delete(key);
}
