"use client";

import { useEffect, useSyncExternalStore, type ReactNode } from "react";
import {
  BANNER_DISMISSED_KEY,
  NEW_APP_URL,
  PLAY_STORE_URL,
  currentEnvironment,
  isForceUpdateEnabled,
  isInAndroidApp,
  rememberAndroidApp,
  updateModeFor,
} from "@/lib/force-update";

const FORCE_UPDATE = isForceUpdateEnabled(process.env.NEXT_PUBLIC_FORCE_APP_UPDATE);

// Whether the page is in the Android app can't change while it's open, so there's
// nothing to subscribe to; useSyncExternalStore is here for its hydration-safe
// split (server snapshot false, real value right after hydration), not for updates.
const noSubscribe = () => () => {};
const inAppSnapshot = () => isInAndroidApp(currentEnvironment());
const inAppServerSnapshot = () => false;

// "Dismissed for this session" lives in sessionStorage; the listeners make the
// banner disappear the moment it's dismissed.
let dismissedInMemory = false;
const dismissListeners = new Set<() => void>();
const subscribeDismissed = (cb: () => void) => {
  dismissListeners.add(cb);
  return () => {
    dismissListeners.delete(cb);
  };
};
const dismissedSnapshot = () => {
  if (dismissedInMemory) return true;
  try {
    return window.sessionStorage.getItem(BANNER_DISMISSED_KEY) === "1";
  } catch {
    return false;
  }
};
function dismissBanner() {
  dismissedInMemory = true;
  try {
    window.sessionStorage.setItem(BANNER_DISMISSED_KEY, "1");
  } catch {
    // Storage blocked — the in-memory flag still hides it until the next load.
  }
  dismissListeners.forEach((cb) => cb());
}

/**
 * Wraps the whole app (root layout, outside every provider and route, sign-in
 * included). With NEXT_PUBLIC_FORCE_APP_UPDATE unset it renders its children
 * and nothing else. With it on: inside the Android app a full-screen,
 * non-dismissable "Update required" screen covers the app (which keeps
 * running underneath, inert — queued surveys still sync, nothing is deleted);
 * in an ordinary browser a slim dismissible banner points to the new site.
 *
 * `enabled` exists for tests; the app always uses the build-time env value.
 */
export function ForceUpdateGate({ children, enabled = FORCE_UPDATE }: { children: ReactNode; enabled?: boolean }) {
  const inApp = useSyncExternalStore(noSubscribe, inAppSnapshot, inAppServerSnapshot);
  const dismissed = useSyncExternalStore(subscribeDismissed, dismissedSnapshot, () => false);
  const mode = updateModeFor(enabled, inApp);

  // The launch referrer is only there on the first load, so keep it for later pages.
  useEffect(() => {
    if (enabled) rememberAndroidApp(currentEnvironment());
  }, [enabled]);

  if (mode === "none") return <>{children}</>;

  return (
    <>
      {mode === "banner" && !dismissed ? (
        <div
          role="status"
          className="flex items-start gap-3 bg-brand-deep px-4 py-2 text-[12.5px] leading-snug text-white"
        >
          <p className="flex-1">
            MQI Survey has moved to a new version:{" "}
            <a href={NEW_APP_URL} className="font-semibold underline" target="_blank" rel="noopener noreferrer">
              {NEW_APP_URL}
            </a>
          </p>
          <button
            type="button"
            onClick={dismissBanner}
            aria-label="Dismiss"
            className="shrink-0 px-1 text-[16px] leading-none text-white/80"
          >
            ×
          </button>
        </div>
      ) : null}
      {/* display: contents keeps the app's layout exactly as it was; inert stops focus and taps reaching it behind the screen. */}
      <div className="contents" inert={mode === "blocking"}>
        {children}
      </div>
      {mode === "blocking" ? (
        <div
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="force-update-title"
          className="fixed inset-0 z-[2147483647] flex flex-col items-center justify-center bg-surface px-8 text-center text-ink"
        >
          <h1 id="force-update-title" className="font-display text-[26px] font-semibold">
            Update required
          </h1>
          <p className="mt-3 max-w-xs text-[15px] leading-relaxed text-ink-soft">
            A new version of the MQI Survey app is available. Update it from the Play Store to continue. After
            updating, open the app and create your account in the new version.
          </p>
          <a
            href={PLAY_STORE_URL}
            className="mt-8 inline-flex w-full max-w-xs items-center justify-center rounded-xl bg-brand-deep px-5 py-3.5 text-[15px] font-semibold text-white"
          >
            Update now
          </a>
          <p className="mt-5 text-[12px] text-ink-faint">Already updated? Close the app completely and open it again.</p>
        </div>
      ) : null}
    </>
  );
}
