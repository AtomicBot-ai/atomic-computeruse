import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./overlay-macos.js", () => ({
  createMacOsOverlayAdapter: () => ({
    show: vi.fn().mockResolvedValue(undefined),
    hide: vi.fn().mockResolvedValue(undefined),
    setDescription: vi.fn().mockResolvedValue(undefined),
  }),
}));

vi.mock("./overlay-windows.js", () => ({
  createWindowsOverlayAdapter: () => ({
    show: vi.fn().mockResolvedValue(undefined),
    hide: vi.fn().mockResolvedValue(undefined),
    setDescription: vi.fn().mockResolvedValue(undefined),
  }),
}));

describe("overlay lifecycle", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("showOverlay does not throw on unsupported platforms", async () => {
    const { showOverlay } = await import("./index.js");
    await expect(showOverlay()).resolves.toBeUndefined();
  });

  it("forceHideOverlay does not throw", async () => {
    const { forceHideOverlay } = await import("./index.js");
    await expect(forceHideOverlay()).resolves.toBeUndefined();
  });

  it("scheduleHideOverlay does not throw", async () => {
    const { scheduleHideOverlay } = await import("./index.js");
    expect(() => scheduleHideOverlay()).not.toThrow();
    vi.advanceTimersByTime(5000);
  });

  it("setOverlayDescription does not throw for empty or non-empty text", async () => {
    const { setOverlayDescription } = await import("./index.js");
    await expect(setOverlayDescription("")).resolves.toBeUndefined();
    await expect(setOverlayDescription("clicking Send button...")).resolves.toBeUndefined();
  });

  it("show -> setDescription -> hide cycle does not throw", async () => {
    const { showOverlay, setOverlayDescription, forceHideOverlay } = await import("./index.js");
    await showOverlay();
    await setOverlayDescription("taking screenshot...");
    await setOverlayDescription("");
    await forceHideOverlay();
  });
});
