import type { ChildProcess } from "node:child_process";
import { spawn } from "node:child_process";
import { resolveNativeScript } from "../native-paths.js";
import type { OverlayAdapter } from "./overlay-adapter.js";
import type { OverlayConfig } from "../types.js";

const FADE_OUT_WAIT_MS = 400;

export function createMacOsOverlayAdapter(config?: OverlayConfig): OverlayAdapter {
  let proc: ChildProcess | null = null;
  const overlayScriptPath = resolveNativeScript("macos/agent-overlay.swift");

  return {
    async show() {
      if (proc && proc.exitCode === null) return;

      const args = ["swift", overlayScriptPath];
      if (config?.color) {
        args.push("--color", config.color);
      }
      if (config?.label) {
        args.push("--label", config.label);
      }

      proc = spawn("xcrun", args, {
        stdio: "ignore",
        detached: true,
      });
      proc.unref();

      proc.on("error", () => {
        proc = null;
      });
      proc.on("exit", () => {
        proc = null;
      });
    },

    async hide() {
      if (!proc || proc.exitCode !== null) {
        proc = null;
        return;
      }
      proc.kill("SIGTERM");
      await new Promise((r) => setTimeout(r, FADE_OUT_WAIT_MS));
      proc = null;
    },
  };
}
