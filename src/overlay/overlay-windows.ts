import type { ChildProcess } from "node:child_process";
import { spawn } from "node:child_process";
import { resolveNativeScript } from "../native-paths.js";
import type { OverlayAdapter } from "./overlay-adapter.js";
import type { OverlayConfig } from "../types.js";

const FADE_OUT_WAIT_MS = 400;

export function createWindowsOverlayAdapter(config?: OverlayConfig): OverlayAdapter {
  let proc: ChildProcess | null = null;
  const overlayScriptPath = resolveNativeScript("windows/agent-overlay.ps1");

  return {
    async show() {
      if (proc && proc.exitCode === null) return;

      const args = [
        "-ExecutionPolicy", "Bypass",
        "-NoProfile",
        "-WindowStyle", "Hidden",
        "-File", overlayScriptPath,
      ];
      if (config?.color) {
        args.push("-Color", config.color);
      }
      if (config?.label) {
        args.push("-Label", config.label);
      }

      proc = spawn("powershell.exe", args, {
        stdio: ["pipe", "ignore", "pipe"],
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
      try {
        proc.stdin?.write("quit\n");
        proc.stdin?.end();
      } catch {
        // stdin may already be closed
      }
      await new Promise((r) => setTimeout(r, FADE_OUT_WAIT_MS));
      if (proc && proc.exitCode === null) {
        try {
          proc.kill();
        } catch {
          // already dead
        }
      }
      proc = null;
    },
  };
}
