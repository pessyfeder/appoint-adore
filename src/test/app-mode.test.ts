import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

async function loadAt(path: string) {
  vi.resetModules();
  window.history.pushState({}, "", path);
  return import("../lib/app-mode");
}

describe("demo storage isolation", () => {
  beforeEach(() => window.localStorage.clear());
  afterEach(() => window.history.pushState({}, "", "/"));

  it("uses the real localStorage outside the demo", async () => {
    const mode = await loadAt("/book");
    expect(mode.DEMO_MODE).toBe(false);
    expect(mode.appStorage).toBe(window.localStorage);
    expect(mode.APP_BASEPATH).toBe("/");
  });

  it("keeps the demo's records apart from the real app's", async () => {
    window.localStorage.setItem("lumiere-scheduler-v2", "REAL");
    window.localStorage.setItem("lumiere-lock-v1", "REAL-LOCK");
    const mode = await loadAt("/demo/book");
    expect(mode.DEMO_MODE).toBe(true);
    expect(mode.APP_BASEPATH).toBe("/demo");
    expect(mode.appStorage.getItem("lumiere-scheduler-v2")).toBeNull();
    mode.appStorage.setItem("lumiere-scheduler-v2", "DEMO");
    expect(window.localStorage.getItem("demo:lumiere-scheduler-v2")).toBe("DEMO");
    expect(window.localStorage.getItem("lumiere-scheduler-v2")).toBe("REAL");
    expect(mode.appStorage.length).toBe(1);
  });

  it("wiping or restoring demo data never touches the real records and password", async () => {
    window.localStorage.setItem("lumiere-scheduler-v2", "REAL");
    window.localStorage.setItem("lumiere-lock-v1", "REAL-LOCK");
    await loadAt("/demo");
    const demo = await import("../lib/demo");
    const privacy = await import("../lib/privacy");
    await demo.ensureDemoData();
    expect(window.localStorage.getItem("demo:lumiere-scheduler-v2")).toContain("Rachel Cohen");
    privacy.wipeStudioData();
    expect(window.localStorage.getItem("demo:lumiere-scheduler-v2")).toBeNull();
    expect(window.localStorage.getItem("lumiere-scheduler-v2")).toBe("REAL");
    expect(window.localStorage.getItem("lumiere-lock-v1")).toBe("REAL-LOCK");
  });
});
