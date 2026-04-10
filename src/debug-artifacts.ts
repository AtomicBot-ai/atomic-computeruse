import fs from "node:fs/promises";
import path from "node:path";
import type { OcrResult } from "./ocr/ocr-adapter.js";
import type { TextContent, ImageContent, ToolResult } from "./types.js";

let debugEnabled = false;
let debugRoot = path.join(process.cwd(), "computer-use-debug");
let activeDebugArtifactRunId: string | undefined;

export function configureDebugArtifacts(opts: {
  enabled: boolean;
  dir?: string;
}): void {
  debugEnabled = opts.enabled;
  if (opts.dir) {
    debugRoot = opts.dir;
  }
}

function sanitizeContent(
  content: Array<TextContent | ImageContent>,
): Array<Record<string, unknown>> {
  return content.map((item) => {
    if (item.type === "image") {
      return {
        type: item.type,
        mimeType: item.mimeType,
        dataLength: item.data.length,
      };
    }
    return item;
  });
}

async function ensureRunDirectory(runId: string): Promise<string> {
  const runDirectory = path.join(debugRoot, runId);
  await fs.mkdir(runDirectory, { recursive: true });
  return runDirectory;
}

export function setActiveDebugArtifactRunId(runId?: string): void {
  activeDebugArtifactRunId = runId;
}

export function getActiveDebugArtifactRunId(): string | undefined {
  return activeDebugArtifactRunId;
}

export async function saveDebugImageArtifact(params: {
  runId?: string;
  fileStem: string;
  imagePath: string;
}): Promise<void> {
  if (!debugEnabled || !params.runId) {
    return;
  }

  const runDirectory = await ensureRunDirectory(params.runId);
  const extension = path.extname(params.imagePath) || ".png";
  const targetPath = path.join(runDirectory, `${params.fileStem}${extension}`);
  await fs.copyFile(params.imagePath, targetPath);
}

export async function saveDebugOcrArtifact(params: {
  runId?: string;
  fileStem: string;
  ocrResult: OcrResult | null;
}): Promise<void> {
  if (!debugEnabled || !params.runId) {
    return;
  }

  const runDirectory = await ensureRunDirectory(params.runId);
  const targetPath = path.join(runDirectory, `${params.fileStem}.json`);
  await fs.writeFile(targetPath, JSON.stringify(params.ocrResult, null, 2));
}

export async function saveDebugToolResultArtifact(params: {
  runId?: string;
  action: string;
  args: Record<string, unknown>;
  result: ToolResult;
}): Promise<void> {
  if (!debugEnabled || !params.runId) {
    return;
  }

  const runDirectory = await ensureRunDirectory(params.runId);
  const payload = {
    action: params.action,
    args: params.args,
    result: {
      content: sanitizeContent(params.result.content),
      details: params.result.details,
    },
    savedAt: new Date().toISOString(),
  };
  const targetPath = path.join(runDirectory, "tool-result.json");
  await fs.writeFile(targetPath, JSON.stringify(payload, null, 2));
}
