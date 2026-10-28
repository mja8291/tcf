import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { ForceUpdateGate } from "./ForceUpdateGate";
import { IN_ANDROID_APP_KEY, NEW_APP_URL, PLAY_STORE_URL } from "@/lib/force-update";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const ANDROID_UA = "Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 Chrome/126.0 Mobile Safari/537.36";

let container: HTMLDivElement;
let root: Root;

function setReferrer(value: string) {
  Object.defineProperty(document, "referrer", { value, configurable: true });
}

function setStandalone(on: boolean) {
  window.matchMedia = ((q: string) => ({
    matches: on && q.includes("standalone"),
    media: q,
    addEventListener() {},
    removeEventListener() {},
  })) as unknown as typeof window.matchMedia;
}

async function render(enabled: boolean) {
  await act(async () => {
    root.render(
      <ForceUpdateGate enabled={enabled}>
        <main data-testid="app">the app</main>
      </ForceUpdateGate>
    );
  });
}

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  setReferrer("");
  setStandalone(false);
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.restoreAllMocks();
});

describe("ForceUpdateGate with the switch off", () => {
  it("renders only the app, even inside the Android app", async () => {
    setReferrer("android-app://app.web.mqi_app_tcf.pk");
    await render(false);
    expect(container.innerHTML).toBe("<main data-testid=\"app\">the app</main>");
    expect(container.textContent).not.toContain("Update required");
    expect(container.textContent).not.toContain("moved to a new version");
    // and does not touch storage
    expect(localStorage.getItem(IN_ANDROID_APP_KEY)).toBeNull();
  });

  it("renders only the app in a normal browser", async () => {
    await render(false);
    expect(container.innerHTML).toBe("<main data-testid=\"app\">the app</main>");
  });
});

describe("ForceUpdateGate with the switch on", () => {
  it("blocks inside the Android app and remembers it for later pages", async () => {
    setReferrer("android-app://app.web.mqi_app_tcf.pk");
    await render(true);
    expect(container.textContent).toContain("Update required");
    expect(container.textContent).toContain(
      "A new version of the MQI Survey app is available. Update it from the Play Store to continue. After updating, open the app and create your account in the new version."
    );
    expect(container.textContent).toContain("Already updated? Close the app completely and open it again.");
    const link = container.querySelector("a")!;
    expect(link.textContent).toBe("Update now");
    expect(link.getAttribute("href")).toBe(PLAY_STORE_URL);
    expect(container.querySelector("button")).toBeNull(); // nothing to dismiss
    expect(container.querySelector(".contents")?.hasAttribute("inert")).toBe(true);
    expect(localStorage.getItem(IN_ANDROID_APP_KEY)).toBe("1");
  });

  it("still blocks on a later page that has no referrer", async () => {
    localStorage.setItem(IN_ANDROID_APP_KEY, "1");
    await render(true);
    expect(container.textContent).toContain("Update required");
  });

  it("blocks for an installed page on Android", async () => {
    setStandalone(true);
    vi.spyOn(navigator, "userAgent", "get").mockReturnValue(ANDROID_UA);
    await render(true);
    expect(container.textContent).toContain("Update required");
  });

  it("shows a dismissible banner, not the blocking screen, in a normal browser", async () => {
    await render(true);
    expect(container.textContent).not.toContain("Update required");
    expect(container.textContent).toContain("MQI Survey has moved to a new version:");
    const link = container.querySelector("a")!;
    expect(link.getAttribute("href")).toBe(NEW_APP_URL);
    expect(link.textContent).toBe(NEW_APP_URL);
    expect(container.querySelector(".contents")?.hasAttribute("inert")).toBe(false);
    expect(container.querySelector("[data-testid=app]")).not.toBeNull();

    const dismiss = container.querySelector("button")!;
    await act(async () => dismiss.click());
    expect(container.textContent).not.toContain("moved to a new version");
    expect(container.querySelector("[data-testid=app]")).not.toBeNull();
    expect(sessionStorage.getItem("mqi-update-banner-dismissed")).toBe("1");
  });
});
