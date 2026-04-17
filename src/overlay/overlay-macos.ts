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

export function createMacOsOverlayAdapter(config?: OverlayConfig): OverlayAdapter {
  let proc: ChildProcess | null = null;
  let lastDescription = "";
  const overlayScriptPath = resolveNativeScript("macos/agent-overlay.swift");

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

      const args = ["swift", overlayScriptPath];
      if (config?.color) {
        args.push("--color", config.color);
      }
      if (config?.label) {
        args.push("--label", config.label);
      }

      proc = spawn("xcrun", args, {
        stdio: ["pipe", "ignore", "ignore"],
        detached: true,
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
      proc.kill("SIGTERM");
      await new Promise((r) => setTimeout(r, FADE_OUT_WAIT_MS));
      proc = null;
    },

    async setDescription(text: string) {
      lastDescription = text;
      writeDescriptionIfAlive(text);
    },
  };
}
