import type { ChildProcess } from "node:child_process";
import { spawn } from "node:child_process";
import { resolveNativeScript } from "../native-paths.js";
import type { OverlayAdapter } from "./overlay-adapter.js";
import type { OverlayConfig } from "../types.js";

const FADE_OUT_WAIT_MS = 400;

function encodeDescriptionLine(text: string): string {
  // Protocol: `desc <utf8-text>\n`. Any newlines inside text are stripped so
  // the line-based reader on the native side cannot be confused.
  const oneLine = text.replace(/[\r\n]+/g, " ");
  return `desc ${oneLine}\n`;
}

export function createWindowsOverlayAdapter(config?: OverlayConfig): OverlayAdapter {
  let proc: ChildProcess | null = null;
  let lastDescription = "";
  const overlayScriptPath = resolveNativeScript("windows/agent-overlay.ps1");

  function writeDescriptionIfAlive(text: string): void {
    if (!proc || proc.exitCode !== null) return;
    try {
      proc.stdin?.write(encodeDescriptionLine(text));
    } catch {
      // stdin may already be closed
    }
  }

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

      // Restore last description after a fresh spawn so it does not reset
      // when the overlay is re-shown between commands.
      if (lastDescription) {
        writeDescriptionIfAlive(lastDescription);
      }
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

    async setDescription(text: string) {
      lastDescription = text;
      writeDescriptionIfAlive(text);
    },
  };
}
