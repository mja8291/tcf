// "This is the legacy v1 app — move to v2" support. Everything here is behind
// NEXT_PUBLIC_FORCE_APP_UPDATE (see ForceUpdateGate); with that unset the app is
// exactly what it was before.

export const ANDROID_APP_PACKAGE = "app.web.mqi_app_tcf.pk";
export const PLAY_STORE_URL = `https://play.google.com/store/apps/details?id=${ANDROID_APP_PACKAGE}`;
export const NEW_APP_URL = "https://tcfmqi.web.app";

export const IN_ANDROID_APP_KEY = "mqi-in-android-app";
export const BANNER_DISMISSED_KEY = "mqi-update-banner-dismissed";

const REFERRER_PREFIX = `android-app://${ANDROID_APP_PACKAGE}`;

/** Only the literal "1" turns the feature on. */
export function isForceUpdateEnabled(value: string | undefined): boolean {
  return value === "1";
}

/** The slice of the browser the detection reads — injectable so it can be tested without one. */
export interface AppEnvironment {
  referrer: string;
  userAgent: string;
  isStandalone: boolean;
  /** localStorage, or null when it's unavailable (private mode, blocked site data). */
  local: Pick<Storage, "getItem" | "setItem"> | null;
}

function safeGet(storage: AppEnvironment["local"], key: string): string | null {
  try {
    return storage ? storage.getItem(key) : null;
  } catch {
    return null;
  }
}

/** True when this page load was launched from the Android app (a Trusted Web Activity reports android-app://<package> as the referrer). */
export function launchedFromAndroidApp(referrer: string): boolean {
  return referrer.startsWith(REFERRER_PREFIX);
}

/**
 * Is the page running inside our Android app? The referrer only exists on the
 * launch navigation (later pages in the same session have a site referrer or
 * none), so a positive is remembered in localStorage — see
 * rememberAndroidApp. Failing that, an installed (standalone) page on Android
 * is treated as the app too.
 */
export function isInAndroidApp(env: AppEnvironment): boolean {
  if (launchedFromAndroidApp(env.referrer)) return true;
  if (safeGet(env.local, IN_ANDROID_APP_KEY) === "1") return true;
  return env.isStandalone && /android/i.test(env.userAgent);
}

/** Persist the launch-referrer detection; every storage access is guarded. */
export function rememberAndroidApp(env: AppEnvironment): void {
  if (!launchedFromAndroidApp(env.referrer)) return;
  try {
    env.local?.setItem(IN_ANDROID_APP_KEY, "1");
  } catch {
    // Storage unavailable — the referrer check still works for this page load.
  }
}

export type UpdateMode = "none" | "blocking" | "banner";

/** What to show: nothing when the switch is off, the blocking screen inside the Android app, otherwise the banner. */
export function updateModeFor(enabled: boolean, inAndroidApp: boolean): UpdateMode {
  if (!enabled) return "none";
  return inAndroidApp ? "blocking" : "banner";
}

/** Read the live browser. Server-side (no window) this reports "not in the app". */
export function currentEnvironment(): AppEnvironment {
  if (typeof window === "undefined") {
    return { referrer: "", userAgent: "", isStandalone: false, local: null };
  }
  let local: AppEnvironment["local"] = null;
  try {
    local = window.localStorage;
  } catch {
    // Accessing localStorage itself can throw when site data is blocked.
  }
  let isStandalone = false;
  try {
    isStandalone = window.matchMedia("(display-mode: standalone)").matches;
  } catch {
    // matchMedia unavailable — treat as not standalone.
  }
  return { referrer: document.referrer ?? "", userAgent: navigator.userAgent ?? "", isStandalone, local };
}
