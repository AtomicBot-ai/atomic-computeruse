import { createBridge } from "usecomputer";
import { execFileSync } from "node:child_process";
import { chmodSync } from "node:fs";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import { tmpdir } from "node:os";

const require = createRequire(import.meta.url);

type ScreenshotInput = {
  display?: number | null;
  path?: string | null;
  window?: number | null;
  region?: { x: number; y: number; width: number; height: number } | null;
  annotate?: unknown | null;
};
type ClickInput = {
  point: { x: number; y: number };
  button?: "left" | "right" | "middle";
  count?: number;
  modifiers?: string[];
};
type TypeTextInput = { text: string; delayMs?: number | null };
type PressInput = { key: string; count?: number; delayMs?: number | null };
type ScrollInput = {
  direction: "up" | "down" | "left" | "right";
  amount: number;
  at?: { x: number; y: number } | null;
};

const bridge = createBridge();

// Resolve path to the prebuilt usecomputer CLI binary inside the usecomputer package.
// The native .node addon crashes in some host process contexts (e.g. MCP inside Cline),
// so screenshots are routed through the standalone CLI binary instead.
// npm tarballs strip the +x bit, so we ensure the binary is executable before use.
function getUscomputerBinaryPath(): string {
  const pkgJsonPath = require.resolve("usecomputer/package.json") as string;
  const pkgRoot = path.dirname(pkgJsonPath);
  const platform = os.platform();
  const arch = os.arch();
  const binaryName = platform === "win32" ? "usecomputer.exe" : "usecomputer";
  const binaryPath = path.join(pkgRoot, "dist", `${platform}-${arch}`, binaryName);
  if (platform !== "win32") {
    try { chmodSync(binaryPath, 0o755); } catch { /* best-effort */ }
  }
  return binaryPath;
}

export async function screenshot(input: ScreenshotInput): Promise<{
  path: string;
  captureX: number;
  captureY: number;
  captureWidth: number;
  captureHeight: number;
  imageWidth: number;
  imageHeight: number;
  coordMap: string;
  hint: string;
  desktopIndex: number;
}> {
  const binaryPath = getUscomputerBinaryPath();
  const outPath =
    input.path ?? path.join(tmpdir(), `usecomputer-screenshot-${Date.now()}.png`);

  const args: string[] = ["screenshot", outPath];
  if (input.display != null) args.push("--display", String(input.display));
  if (input.window != null) args.push("--window", String(input.window));
  if (input.region != null) {
    const r = input.region;
    args.push("--region", `${r.x},${r.y},${r.width},${r.height}`);
  }
  if (input.annotate) args.push("--annotate");
  args.push("--json");

  const output = execFileSync(binaryPath, args, { encoding: "utf8" });
  const fixed = output.trim().replace(/\\(?!["\\\/bfnrt]|u[0-9a-fA-F]{4})/g, "\\\\");
  const data = JSON.parse(fixed) as {
    path: string;
    desktopIndex: number;
    captureX: number;
    captureY: number;
    captureWidth: number;
    captureHeight: number;
    imageWidth: number;
    imageHeight: number;
  };

  const coordMap = [
    data.captureX,
    data.captureY,
    data.captureWidth,
    data.captureHeight,
    data.imageWidth,
    data.imageHeight,
  ].join(",");

  const hint = [
    "ALWAYS pass this exact coord map to click, hover, drag, and mouse move when using coordinates from this screenshot:",
    `--coord-map "${coordMap}"`,
    "",
    "Example:",
    `usecomputer click -x 400 -y 220 --coord-map "${coordMap}"`,
  ].join("\n");

  return {
    path: data.path,
    desktopIndex: data.desktopIndex,
    captureX: data.captureX,
    captureY: data.captureY,
    captureWidth: data.captureWidth,
    captureHeight: data.captureHeight,
    imageWidth: data.imageWidth,
    imageHeight: data.imageHeight,
    coordMap,
    hint,
  };
}

export async function click(input: ClickInput) {
  return bridge.click({
    point: input.point,
    button: input.button ?? "left",
    count: input.count ?? 1,
    modifiers: input.modifiers ?? [],
  });
}

export async function typeText(input: TypeTextInput) {
  return bridge.typeText({
    text: input.text,
    delayMs: input.delayMs ?? undefined,
  });
}

export async function press(input: PressInput) {
  return bridge.press({
    key: input.key,
    count: input.count ?? 1,
    delayMs: input.delayMs ?? undefined,
  });
}

export async function scroll(input: ScrollInput) {
  return bridge.scroll({
    direction: input.direction,
    amount: input.amount,
    at: input.at ?? undefined,
  });
}

export async function mousePosition(): Promise<{ x: number; y: number }> {
  return bridge.mousePosition();
}

export async function drag(input: {
  from: { x: number; y: number };
  to: { x: number; y: number };
  cp?: { x: number; y: number } | null;
  button?: "left" | "right" | "middle";
}) {
  return bridge.drag({
    from: input.from,
    to: input.to,
    cp: input.cp ?? undefined,
    button: input.button ?? "left",
  });
}

export async function mouseMove(point: { x: number; y: number }) {
  return bridge.mouseMove(point);
}

export async function displayList(): Promise<
  Array<{
    index: number;
    name: string;
    width: number;
    height: number;
    scale: number;
    isPrimary: boolean;
  }>
> {
  return bridge.displayList();
}
