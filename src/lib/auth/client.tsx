"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { flushPendingSubmissions } from "@/lib/offline/sync";
import { AUTH_REQUIRED_EVENT } from "./events";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
}

/**
 * "loading"   — first launch, still asking the server (blank for a moment)
 * "disabled"  — the server has sign-in switched off; the app runs as before
 * "signedOut" — sign-in is on and this device has no valid session
 * "signedIn"  — has a session (possibly only the remembered one, if offline)
 */
type AuthStatus = "loading" | "disabled" | "signedOut" | "signedIn";

interface AuthContextValue {
  status: AuthStatus;
  user: AuthUser | null;
  /** Called by the sign-in page once the server accepted the credentials. */
  completeSignIn: (user: AuthUser) => void;
  signOut: () => Promise<void>;
}

const USER_KEY = "mqi-auth-user";
const ENABLED_KEY = "mqi-auth-enabled"; // "1" | "0" — last answer from /api/auth/config

function readCachedUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
}
function writeCachedUser(user: AuthUser | null) {
  try {
    if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
    else localStorage.removeItem(USER_KEY);
  } catch {
    // Private mode / blocked storage: the session cookie still works, the app just can't remember it offline.
  }
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}

/**
 * Sign-in has to work for people with no signal: the server only checks the
 * session when there *is* a connection. So the signed-in user is remembered in
 * localStorage and trusted on launch, then quietly re-checked online. Only a
 * clear "no" from the server (401/403) signs the device out — a failed
 * request (offline, server hiccup) never does.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [user, setUser] = useState<AuthUser | null>(null);

  const verify = useCallback(async () => {
    const cached = readCachedUser();
    // A phone with one bar of signal can "connect" and then never answer —
    // without a ceiling the app would sit blank until the browser's own (very
    // long) timeout. Treat a slow answer like no answer.
    const get = (url: string) => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 6000);
      return fetch(url, { cache: "no-store", signal: controller.signal }).finally(() => clearTimeout(timer));
    };
    try {
      const cfgRes = await get("/api/auth/config");
      if (!cfgRes.ok) throw new Error("config unavailable");
      const cfg = (await cfgRes.json()) as { enabled: boolean };
      try {
        localStorage.setItem(ENABLED_KEY, cfg.enabled ? "1" : "0");
      } catch {}
      if (!cfg.enabled) {
        writeCachedUser(null);
        setUser(null);
        setStatus("disabled");
        return;
      }
      const meRes = await get("/api/auth/me");
      if (meRes.ok) {
        const { user: fresh } = (await meRes.json()) as { user: AuthUser };
        writeCachedUser(fresh);
        setUser(fresh);
        setStatus("signedIn");
      } else if (meRes.status === 401 || meRes.status === 403) {
        writeCachedUser(null);
        setUser(null);
        setStatus("signedOut");
      } else if (cached) {
        // 5xx — the server couldn't answer; keep trusting what we remembered.
        setUser(cached);
        setStatus("signedIn");
      } else {
        setStatus("signedOut");
      }
    } catch {
      // No connection (or the server is unreachable).
      if (cached) {
        setUser(cached);
        setStatus("signedIn");
        return;
      }
      let enabled: string | null = null;
      try {
        enabled = localStorage.getItem(ENABLED_KEY);
      } catch {}
      // Never signed in here and can't ask: if we know sign-in is on, hold at
      // the sign-in page; if we've never learned either way, let the app open
      // — the server still refuses every save/upload without a session, and
      // anything done meanwhile stays queued on the phone until sign-in.
      setStatus(enabled === "1" ? "signedOut" : "disabled");
    }
  }, []);

  useEffect(() => {
    // Initial check on mount, then again whenever a connection returns or the
    // server turns a request away. State is only set after an awaited fetch,
    // never synchronously in this effect body.
    queueMicrotask(() => {
      // A remembered user opens the app straight away; the server check
      // below happens in the background and only ever *removes* access on
      // a clear 401/403.
      const remembered = readCachedUser();
      if (remembered) {
        setUser(remembered);
        setStatus("signedIn");
      }
      void verify();
    });
    const onOnline = () => void verify();
    const onAuthRequired = () => {
      writeCachedUser(null);
      setUser(null);
      setStatus("signedOut");
    };
    window.addEventListener("online", onOnline);
    window.addEventListener(AUTH_REQUIRED_EVENT, onAuthRequired);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener(AUTH_REQUIRED_EVENT, onAuthRequired);
    };
  }, [verify]);

  const completeSignIn = useCallback((signedIn: AuthUser) => {
    writeCachedUser(signedIn);
    setUser(signedIn);
    setStatus("signedIn");
    // Anything queued while signed out can go now.
    void flushPendingSubmissions();
  }, []);

  const signOut = useCallback(async () => {
    try {
      await fetch("/api/auth/signout", { method: "POST" });
    } catch {
      // Offline: forgetting the user locally still sends this device to the sign-in page.
    }
    writeCachedUser(null);
    setUser(null);
    setStatus("signedOut");
    // Don't leave the last dashboard readable from the offline cache.
    try {
      for (const name of await caches.keys()) {
        if (name.startsWith("mqi-api-")) await (await caches.open(name)).delete("/api/dashboard");
      }
    } catch {}
  }, []);

  const value = useMemo(() => ({ status, user, completeSignIn, signOut }), [status, user, completeSignIn, signOut]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

const PUBLIC_PATHS = ["/signin", "/signup", "/privacy", "/terms"];

/** Keeps signed-out devices on the sign-in/sign-up pages, and signed-in ones off them. */
export function AuthGate({ children }: { children: React.ReactNode }) {
  const { status } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const isPublic = PUBLIC_PATHS.includes(pathname);
  const isAuthPage = pathname === "/signin" || pathname === "/signup";

  const mustSignIn = status === "signedOut" && !isPublic;
  const alreadySignedIn = (status === "signedIn" || status === "disabled") && isAuthPage;

  useEffect(() => {
    if (mustSignIn) {
      const next = pathname === "/" ? "" : `?next=${encodeURIComponent(pathname)}`;
      router.replace(`/signin${next}`);
    } else if (alreadySignedIn) {
      router.replace("/");
    }
  }, [mustSignIn, alreadySignedIn, pathname, router]);

  if (status === "loading" || mustSignIn || alreadySignedIn) return null;
  return <>{children}</>;
}
