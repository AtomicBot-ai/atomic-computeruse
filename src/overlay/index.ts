import type { OverlayAdapter } from "./overlay-adapter.js";
import type { OverlayConfig } from "../types.js";
import { createMacOsOverlayAdapter } from "./overlay-macos.js";
import { createNullOverlayAdapter } from "./overlay-null.js";
import { createWindowsOverlayAdapter } from "./overlay-windows.js";

export type { OverlayAdapter } from "./overlay-adapter.js";

const HIDE_DEBOUNCE_MS = 15_000;

let cachedAdapter: OverlayAdapter | undefined;
let hideTimer: ReturnType<typeof setTimeout> | undefined;
let overlayConfig: OverlayConfig | undefined;

export function configureOverlay(config: OverlayConfig): void {
  overlayConfig = config;
  cachedAdapter = undefined;
}

function createOverlayAdapter(platform: NodeJS.Platform = process.platform): OverlayAdapter {
  if (overlayConfig && !overlayConfig.enabled) {
    return createNullOverlayAdapter();
  }

  if (platform === "darwin") {
    return createMacOsOverlayAdapter(overlayConfig);
  }
  if (platform === "win32") {
    return createWindowsOverlayAdapter(overlayConfig);
  }
  return createNullOverlayAdapter();
}

function getAdapter(): OverlayAdapter {
  if (!cachedAdapter) cachedAdapter = createOverlayAdapter();
  return cachedAdapter;
}

export async function showOverlay(): Promise<void> {
  if (hideTimer) {
    clearTimeout(hideTimer);
    hideTimer = undefined;
  }
  try {
    await getAdapter().show();
  } catch {
    // non-critical visual indicator
  }
}

export function scheduleHideOverlay(): void {
  if (hideTimer) {
    clearTimeout(hideTimer);
  }
  hideTimer = setTimeout(async () => {
    hideTimer = undefined;
    try {
      await getAdapter().hide();
    } catch {
      // non-critical
    }
  }, HIDE_DEBOUNCE_MS);
}

export async function forceHideOverlay(): Promise<void> {
  if (hideTimer) {
    clearTimeout(hideTimer);
    hideTimer = undefined;
  }
  try {
    await getAdapter().hide();
  } catch {
    // best-effort cleanup
  }
}
