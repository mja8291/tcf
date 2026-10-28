import { describe, expect, it } from "vitest";
import {
  IN_ANDROID_APP_KEY,
  isForceUpdateEnabled,
  isInAndroidApp,
  rememberAndroidApp,
  updateModeFor,
  type AppEnvironment,
} from "./force-update";

const APP_REFERRER = "android-app://app.web.mqi_app_tcf.pk";
const ANDROID_UA = "Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 Chrome/126.0 Mobile Safari/537.36";
const DESKTOP_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126.0 Safari/537.36";

function memoryStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    data,
  };
}

function env(over: Partial<AppEnvironment> = {}): AppEnvironment {
  return { referrer: "", userAgent: DESKTOP_UA, isStandalone: false, local: memoryStorage(), ...over };
}

describe("isForceUpdateEnabled", () => {
  it("is on only for the literal 1", () => {
    expect(isForceUpdateEnabled("1")).toBe(true);
    for (const v of [undefined, "", "0", "true", "yes", " 1"]) expect(isForceUpdateEnabled(v)).toBe(false);
  });
});

describe("isInAndroidApp", () => {
  it("is true when the referrer is the app's android-app:// URL", () => {
    expect(isInAndroidApp(env({ referrer: APP_REFERRER }))).toBe(true);
    expect(isInAndroidApp(env({ referrer: `${APP_REFERRER}/` }))).toBe(true);
  });

  it("ignores another app's referrer", () => {
    expect(isInAndroidApp(env({ referrer: "android-app://com.other.app" }))).toBe(false);
  });

  it("is true when the flag was persisted on an earlier page, with no referrer", () => {
    expect(isInAndroidApp(env({ local: memoryStorage({ [IN_ANDROID_APP_KEY]: "1" }) }))).toBe(true);
  });

  it("is true for an installed (standalone) page on Android", () => {
    expect(isInAndroidApp(env({ isStandalone: true, userAgent: ANDROID_UA }))).toBe(true);
  });

  it("is false for standalone on a non-Android device (an installed desktop PWA)", () => {
    expect(isInAndroidApp(env({ isStandalone: true, userAgent: DESKTOP_UA }))).toBe(false);
  });

  it("is false for Android in a normal browser tab", () => {
    expect(isInAndroidApp(env({ isStandalone: false, userAgent: ANDROID_UA }))).toBe(false);
  });

  it("is false for a desktop browser", () => {
    expect(isInAndroidApp(env())).toBe(false);
  });

  it("survives localStorage throwing", () => {
    const throwing = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
    };
    expect(isInAndroidApp(env({ local: throwing }))).toBe(false);
    expect(isInAndroidApp(env({ local: throwing, referrer: APP_REFERRER }))).toBe(true);
    expect(() => rememberAndroidApp(env({ local: throwing, referrer: APP_REFERRER }))).not.toThrow();
  });

  it("survives localStorage being unavailable", () => {
    expect(isInAndroidApp(env({ local: null }))).toBe(false);
  });
});

describe("rememberAndroidApp", () => {
  it("persists the flag when launched from the app", () => {
    const local = memoryStorage();
    rememberAndroidApp(env({ referrer: APP_REFERRER, local }));
    expect(local.data.get(IN_ANDROID_APP_KEY)).toBe("1");
    // ...and the next page, which has no referrer, still counts as the app.
    expect(isInAndroidApp(env({ local }))).toBe(true);
  });

  it("does not persist anything for a normal browser", () => {
    const local = memoryStorage();
    rememberAndroidApp(env({ referrer: "https://www.google.com/", local }));
    rememberAndroidApp(env({ local, isStandalone: true, userAgent: ANDROID_UA }));
    expect(local.data.size).toBe(0);
  });
});

describe("updateModeFor", () => {
  it("shows nothing when the switch is off, wherever the page runs", () => {
    expect(updateModeFor(false, true)).toBe("none");
    expect(updateModeFor(false, false)).toBe("none");
  });

  it("blocks inside the app and shows the banner elsewhere when on", () => {
    expect(updateModeFor(true, true)).toBe("blocking");
    expect(updateModeFor(true, false)).toBe("banner");
  });
});
